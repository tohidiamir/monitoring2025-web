import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection, PLC_CONFIG } from '@/lib/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface SterilizationProcess {
  id: number;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  maxTemperature: number;
  minTemperature: number;
  sterilizationDuration: number; // time spent above minimum required temperature
  highTempDuration: number; // also time spent above minimum temperature (for backward compatibility)
  timeMain: number; // مقدار time_main برای بررسی
  maxTimeRun: number; // حداکثر مقدار time_minute_run
  percentTargetReached: number; // درصد رسیدن به time_main
  percentAboveMinTemp: number; // درصد زمان بالای دمای حداقل
  success: boolean;
  // اضافه کردن فیلد دیباگ
  debugInfo?: {
    reachedTimeMain: number;
    percentTargetReached: number;
    percentAboveMinTemp: number;
    successCondition1: boolean;
    successCondition2: boolean;
  };
}

// روش پیاده سازی قبلی:
// این روش قبلی استخراج اطلاعات استریل بود که بر اساس دمای بالای یک آستانه کار می‌کرد.
// در روش جدید به جای این الگوریتم، از فیلدهای time_minute_run و time_main در دیتابیس استفاده می‌کنیم
// تا فرآیندهای استریل را دقیق‌تر تشخیص دهیم.

export async function GET(request: NextRequest) {
  try {
    // Extract search params without using request.url directly
    const { searchParams } = request.nextUrl;
    const plcName = searchParams.get('plc');
    const date = searchParams.get('date');

    if (!plcName || !date) {
      return NextResponse.json({ 
        success: false, 
        error: 'PLC name and date are required' 
      });
    }

    // Find PLC config
    const plcConfig = PLC_CONFIG.find(p => p.name === plcName);
    if (!plcConfig) {
      return NextResponse.json({ 
        success: false, 
        error: 'PLC not found' 
      });
    }

    // Connect to database directly
    const pool = await getDbConnection();
    
    // Convert date format from YYYY-MM-DD to YYYYMMDD for table name
    const dateForTable = date.replace(/-/g, '');
    const tableName = `PLC_Data_${plcName}_${dateForTable}`;

    // Check if table exists
    const tableExistsQuery = `
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = '${tableName}'
    `;

  
    const tableExistsResult = await pool.request().query(tableExistsQuery);
    
    if (tableExistsResult.recordset[0].count === 0) {
      return NextResponse.json({ 
        success: true, 
        processes: [],
        message: 'No data found for the specified date' 
      });
    }

    // Check for necessary columns
    const requiredColumns = ['Timestamp', 'Temputare_main', 'time_minute_run', 'time_main', 'Temputare_min'];
    for (const col of requiredColumns) {
      try {
        const checkQuery = `
          SELECT COUNT(*) as count 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = '${tableName}' AND COLUMN_NAME = '${col}'
        `;
        const result = await pool.request().query(checkQuery);
        if (result.recordset[0].count === 0) {
          console.log(`Required column ${col} not found in table`);
          return NextResponse.json({ 
            success: false, 
            error: `Required column ${col} not found in table` 
          });
        }
      } catch (error) {
        console.log(`Error checking column ${col}: ${error}`);
      }
    }

    // Query to identify sterilization processes based on time_minute_run transitions
    const query = `
      -- 1. Get all data points and detect transitions in time_minute_run
      WITH TimeRunData AS (
        SELECT
          Timestamp,
          Temputare_main / 10.0 AS Temperature,
          time_minute_run,
          time_main,
          Temputare_min / 10.0 AS MinRequiredTemp,
          -- Get previous values to detect transitions
          LAG(time_minute_run, 1, -1) OVER (ORDER BY Timestamp) AS PrevTimeRun,
          -- Mark start of process: when time_minute_run changes from 0 or NULL to a value > 0
          CASE WHEN time_minute_run > 0 AND (
                LAG(time_minute_run, 1, 0) OVER (ORDER BY Timestamp) = 0 OR 
                LAG(time_minute_run, 1, -1) OVER (ORDER BY Timestamp) = -1
              ) 
          THEN 1 ELSE 0 END AS ProcessStart,
          -- Mark end of process: when time_minute_run changes from a value > 0 to 0
          CASE WHEN time_minute_run = 0 AND LAG(time_minute_run, 1, 0) OVER (ORDER BY Timestamp) > 0 
          THEN 1 ELSE 0 END AS ProcessEnd,
          -- Mark if this row is part of a sterilization process
          CASE WHEN time_minute_run > 0 THEN 1 ELSE 0 END AS IsInProcess,
          -- Mark when temperature is above minimum required
          -- For temperatures above 65°C, still count them as valid (they're hot enough)
          CASE WHEN Temputare_main / 10.0 >= Temputare_min / 10.0 THEN 1 ELSE 0 END AS IsAboveMinTemp
        FROM [${tableName}]
        WHERE Temputare_main > 0 AND time_minute_run IS NOT NULL
      ),
      -- 2. Assign process IDs to each sterilization process
      ProcessGroups AS (
        SELECT
          *,
          -- Each time ProcessStart is 1, increment the process ID
          SUM(ProcessStart) OVER (ORDER BY Timestamp) AS ProcessID
        FROM TimeRunData
        WHERE IsInProcess = 1  -- Only include rows that are part of a process
      ),
      -- 3. Get all data for each process
      ProcessData AS (
        SELECT
          ProcessID,
          Timestamp,
          Temperature,
          time_minute_run,
          time_main,
          MinRequiredTemp,
          IsAboveMinTemp,
          -- Check if time_minute_run reached time_main
          CASE WHEN time_minute_run >= time_main THEN 1 ELSE 0 END AS ReachedTarget
        FROM ProcessGroups
        WHERE ProcessID > 0  -- Only include rows with valid process IDs
      ),
      -- 4. Calculate statistics for each process
      ProcessStats AS (
        SELECT
          ProcessID,
          MIN(Timestamp) AS StartTime,
          MAX(Timestamp) AS EndTime,
          DATEDIFF(MINUTE, MIN(Timestamp), MAX(Timestamp)) AS Duration,
          MIN(Temperature) AS MinTemperature,
          MAX(Temperature) AS MaxTemperature,
          SUM(IsAboveMinTemp) AS AboveMinTempCount,
          COUNT(*) AS TotalReadingsCount,
          MIN(MinRequiredTemp) AS MinRequiredTemp,
          -- The target time for the sterilization process
          MAX(time_main) AS TimeMain,
          -- Check if time_minute_run reached time_main during the process
          MAX(ReachedTarget) AS ReachedTimeMain,
          -- Max value of time_minute_run during the process
          MAX(time_minute_run) AS MaxTimeRun,
          -- Calculate the percentage of time at or above minimum required temperature
          (SUM(IsAboveMinTemp) * 100.0 / COUNT(*)) AS PercentAboveMinTemp
        FROM ProcessData
        GROUP BY ProcessID
        HAVING 
          COUNT(*) > 0 AND 
          DATEDIFF(MINUTE, MIN(Timestamp), MAX(Timestamp)) >= 5 -- Only processes at least 5 minutes long
      )
      -- Final output
      SELECT
        ROW_NUMBER() OVER (ORDER BY StartTime) AS id,
        StartTime,
        EndTime,
        Duration,
        MinTemperature,
        MaxTemperature,
        -- Calculate sterilization duration (time above minimum temperature)
        (AboveMinTempCount * 1.0 / TotalReadingsCount) * Duration AS SterilizationDuration,
        -- High temp duration (same as sterilization duration for compatibility)
        (AboveMinTempCount * 1.0 / TotalReadingsCount) * Duration AS HighTempDuration,
        -- Include TimeMain and MaxTimeRun for validation
        TimeMain,
        MaxTimeRun,
        -- Calculate percentage of target time reached
        (MaxTimeRun * 100.0 / TimeMain) AS PercentTargetReached,
        PercentAboveMinTemp,
        -- Simple success criteria: Process should reach at least 70% of time_main
        -- OR have at least 60% of readings above minimum temperature
        CASE WHEN 
          (MaxTimeRun * 100.0 / TimeMain) >= 70 OR
          PercentAboveMinTemp >= 60
        THEN 1 ELSE 0 END AS Success
      FROM ProcessStats
      ORDER BY StartTime
    `;


    const result = await pool.request().query(query);
    
    // Map database results to our process objects
    const processes: SterilizationProcess[] = result.recordset.map((row: any) => ({
      id: row.id,
      startTime: row.StartTime,
      endTime: row.EndTime,
      duration: row.Duration,
      maxTemperature: row.MaxTemperature,
      minTemperature: row.MinTemperature,
      sterilizationDuration: row.SterilizationDuration,
      highTempDuration: row.HighTempDuration,
      timeMain: row.TimeMain,
      maxTimeRun: row.MaxTimeRun,
      percentTargetReached: Math.round(row.PercentTargetReached || 0),
      percentAboveMinTemp: Math.round(row.PercentAboveMinTemp || 0),
      success: row.Success === 1,
      // اضافه کردن فیلدهای توضیحی برای دیباگ
      debugInfo: {
        reachedTimeMain: row.ReachedTimeMain,
        percentTargetReached: row.PercentTargetReached,
        percentAboveMinTemp: row.PercentAboveMinTemp,
        successCondition1: (row.MaxTimeRun * 100.0 / row.TimeMain) >= 70,
        successCondition2: row.PercentAboveMinTemp >= 60
      }
    }));

    return NextResponse.json({ 
      success: true, 
      processes,
      totalProcesses: processes.length,
      date,
      plc: plcName
    });

  } catch (error) {
    console.error('Error detecting sterilization processes:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
}
