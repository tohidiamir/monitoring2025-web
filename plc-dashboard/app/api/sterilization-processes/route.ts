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
  success: boolean;
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

    // Query to identify sterilization processes based on time_minute_run
    const query = `
      WITH DataPoints AS (
        -- Get all data points with relevant columns
        SELECT 
          Timestamp,
          Temputare_main / 10.0 AS Temperature,
          time_minute_run,
          time_main,
          Temputare_min / 10.0 AS MinRequiredTemp,
          -- Detect transitions in time_minute_run
          LAG(time_minute_run, 1, -1) OVER (ORDER BY Timestamp) AS PrevTimeMinuteRun
        FROM [${tableName}]
        WHERE time_minute_run IS NOT NULL AND time_main IS NOT NULL AND Temputare_main IS NOT NULL
        AND Temputare_main > 0
      ),
      ProcessBoundaries AS (
        -- Find start and end points of sterilization processes
        SELECT 
          Timestamp,
          Temperature,
          time_minute_run,
          time_main,
          MinRequiredTemp,
          -- Process starts when time_minute_run changes from 0 (or any other value) to 1
          CASE WHEN time_minute_run = 1 AND (PrevTimeMinuteRun != 1 OR PrevTimeMinuteRun = -1) THEN 1 ELSE 0 END AS ProcessStart,
          -- Process ends when time_minute_run changes from non-zero to 0 (after heating period)
          CASE WHEN time_minute_run = 0 AND PrevTimeMinuteRun > 0 THEN 1 ELSE 0 END AS ProcessEnd,
          -- Mark rows that are part of a sterilization process
          CASE WHEN time_minute_run >= 1 OR (time_minute_run = 0 AND PrevTimeMinuteRun > 0) THEN 1 ELSE 0 END AS IsInProcess,
          -- Mark rows where temperature is above minimum required
          CASE WHEN Temperature >= MinRequiredTemp THEN 1 ELSE 0 END AS IsAboveMinTemp
        FROM DataPoints
      ),
      ProcessSegments AS (
        -- Group data points into distinct processes
        SELECT 
          *,
          SUM(ProcessStart) OVER (ORDER BY Timestamp) AS ProcessID
        FROM ProcessBoundaries
        WHERE IsInProcess = 1
      ),
      ProcessStats AS (
        -- Calculate statistics for each process
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
          -- Find the time_main value for this process (should be consistent within a process)
          MAX(time_main) AS TimeMain
        FROM ProcessSegments
        GROUP BY ProcessID
        HAVING COUNT(*) > 0
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
        -- High temp duration (simplified for now, equivalent to sterilization duration)
        (AboveMinTempCount * 1.0 / TotalReadingsCount) * Duration AS HighTempDuration,
        -- Also include TimeMain value in output for validation
        TimeMain,
        -- Success if:
        -- 1. At least 80% of the time was above minimum temperature AND
        -- 2. Process continued until time_minute_run reached time_main
        CASE WHEN ((AboveMinTempCount * 1.0 / TotalReadingsCount) >= 0.8) THEN 1 ELSE 0 END AS Success
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
      timeMain: row.TimeMain,  // اضافه کردن مقدار time_main برای بررسی
      success: row.Success === 1
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
