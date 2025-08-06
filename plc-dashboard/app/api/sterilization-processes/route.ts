import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection, PLC_CONFIG } from '@/lib/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface TemperatureReading {
  timestamp: string;
  temperature: number;
}

interface SterilizationProcess {
  id: number;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  maxTemperature: number;
  minTemperature: number;
  sterilizationDuration: number; // time spent above 120°C
  highTempDuration: number; // time spent above 121°C
  success: boolean;
}

function detectSterilizationProcesses(data: TemperatureReading[]): SterilizationProcess[] {
  const processes: SterilizationProcess[] = [];
  let currentProcess: {
    startTime: string;
    startTemp: number;
    maxTemp: number;
    minTemp: number;
    aboveThresholdStart?: string;
    aboveThresholdEnd?: string;
    temperatureHistory: TemperatureReading[];
  } | null = null;
  
  const TEMP_THRESHOLD = 60; // درجه سیلسیوس - آستانه شروع/پایان فرآیند
  const STERILIZATION_TEMP = 120; // درجه سیلسیوس برای شروع استریل
  const HIGH_STERILIZATION_TEMP = 121; // درجه برای استریل کامل
  let processId = 1;

  for (let i = 0; i < data.length; i++) {
    const current = data[i];
    const next = data[i + 1];
    
    // شروع فرآیند: دما از زیر 60 به بالای 60 می‌رود
    if (!currentProcess && current.temperature < TEMP_THRESHOLD && 
        next && next.temperature >= TEMP_THRESHOLD) {
      currentProcess = {
        startTime: current.timestamp,
        startTemp: current.temperature,
        maxTemp: current.temperature,
        minTemp: current.temperature,
        temperatureHistory: [current]
      };
    }
    
    // در حال پردازش فرآیند
    if (currentProcess) {
      currentProcess.maxTemp = Math.max(currentProcess.maxTemp, current.temperature);
      currentProcess.minTemp = Math.min(currentProcess.minTemp, current.temperature);
      currentProcess.temperatureHistory.push(current);
      
      // تشخیص شروع دوره استریل (بالای 120 درجه)
      if (!currentProcess.aboveThresholdStart && current.temperature >= STERILIZATION_TEMP) {
        currentProcess.aboveThresholdStart = current.timestamp;
      }
      
      // به‌روزرسانی پایان دوره استریل (تا زمانی که زیر 120 برود)
      if (currentProcess.aboveThresholdStart && current.temperature >= STERILIZATION_TEMP) {
        currentProcess.aboveThresholdEnd = current.timestamp;
      }
    }
    
    // پایان فرآیند: دما از بالای 60 به زیر 60 می‌رود
    if (currentProcess && current.temperature >= TEMP_THRESHOLD && 
        next && next.temperature < TEMP_THRESHOLD) {
      
      const startTime = new Date(currentProcess.startTime);
      const endTime = new Date(current.timestamp);
      const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // دقیقه
      
      let sterilizationDuration = 0;
      if (currentProcess.aboveThresholdStart && currentProcess.aboveThresholdEnd) {
        const sterilStart = new Date(currentProcess.aboveThresholdStart);
        const sterilEnd = new Date(currentProcess.aboveThresholdEnd);
        sterilizationDuration = (sterilEnd.getTime() - sterilStart.getTime()) / (1000 * 60);
      }

      // محاسبه مدت زمان بالای 121 درجه
      let highTempDuration = 0;
      for (let j = 0; j < currentProcess.temperatureHistory.length - 1; j++) {
        const curr = currentProcess.temperatureHistory[j];
        const nextTemp = currentProcess.temperatureHistory[j + 1];
        if (curr.temperature >= HIGH_STERILIZATION_TEMP) {
          const currTime = new Date(curr.timestamp);
          const nextTime = new Date(nextTemp.timestamp);
          highTempDuration += (nextTime.getTime() - currTime.getTime()) / (1000 * 60);
        }
      }
      
      // موفقیت فرآیند: حداقل 20 دقیقه بالای 121 درجه یا حداقل 30 دقیقه بالای 120 درجه
      const success = (currentProcess.maxTemp >= HIGH_STERILIZATION_TEMP && highTempDuration >= 20) ||
                      (currentProcess.maxTemp >= STERILIZATION_TEMP && sterilizationDuration >= 30);
      
      processes.push({
        id: processId++,
        startTime: currentProcess.startTime,
        endTime: current.timestamp,
        duration,
        maxTemperature: currentProcess.maxTemp,
        minTemperature: currentProcess.minTemp,
        sterilizationDuration,
        highTempDuration,
        success
      });
      
      currentProcess = null;
    }
  }
  
  return processes;
}

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

    // Query temperature data directly from database
    const temperatureColumns = ['Temputare_main', 'Temputare_1', 'Temputare_2', 'Temputare_3', 'Temputare_4'];
    const availableColumns = [];
    
    // Check which temperature columns exist
    for (const col of temperatureColumns) {
      try {
        const checkQuery = `
          SELECT COUNT(*) as count 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = '${tableName}' AND COLUMN_NAME = '${col}'
        `;
        const result = await pool.request().query(checkQuery);
        if (result.recordset[0].count > 0) {
          availableColumns.push(col);
        }
      } catch (error) {
        console.log(`Column ${col} not found`);
      }
    }

    if (availableColumns.length === 0) {
      return NextResponse.json({ 
        success: true, 
        processes: [],
        message: 'No temperature columns found' 
      });
    }

    // Query data from database
    const query = `
      SELECT Timestamp, ${availableColumns.join(', ')}
      FROM [${tableName}]
      WHERE ${availableColumns.map(col => `${col} IS NOT NULL AND ${col} > 0`).join(' OR ')}
      ORDER BY Timestamp ASC
    `;

    const result = await pool.request().query(query);

    // Convert data to temperature readings
    const temperatureData: TemperatureReading[] = result.recordset.map((row: any) => {
      // انتخاب اولین ستون دما موجود
      const tempValue = availableColumns.reduce((acc, col) => acc || row[col], 0);
      
      // تبدیل دما از فرمت PLC (مثلاً 290) به درجه سیلسیوس (29.0)
      const actualTemp = (parseFloat(tempValue) || 0) / 10;
      
      return {
        timestamp: row.Timestamp,
        temperature: actualTemp
      };
    }).filter((item: TemperatureReading) => item.temperature > 0);

    if (temperatureData.length === 0) {
      return NextResponse.json({ 
        success: true, 
        processes: [],
        message: 'No valid temperature data found for the specified date' 
      });
    }

    // تشخیص فرآیند های استریل
    const processes = detectSterilizationProcesses(temperatureData);

    return NextResponse.json({ 
      success: true, 
      processes,
      totalDataPoints: temperatureData.length,
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
