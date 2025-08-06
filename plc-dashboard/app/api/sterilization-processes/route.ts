import { NextRequest, NextResponse } from 'next/server';

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
    const { searchParams } = new URL(request.url);
    const plcName = searchParams.get('plc');
    const date = searchParams.get('date');

    if (!plcName || !date) {
      return NextResponse.json({ 
        success: false, 
        error: 'PLC name and date are required' 
      });
    }

    // استفاده از API موجود برای دریافت داده‌ها
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : request.nextUrl.origin;
      
    const dataResponse = await fetch(
      `${baseUrl}/api/data?plc=${plcName}&date=${date}&registers=Temputare_main,Temputare_1,Temputare_2,Temputare_3,Temputare_4`,
      { method: 'GET' }
    );

    if (!dataResponse.ok) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch temperature data' 
      });
    }

    const dataResult = await dataResponse.json();

    if (!dataResult.success || !dataResult.data || dataResult.data.length === 0) {
      return NextResponse.json({ 
        success: true, 
        processes: [],
        message: dataResult.error || 'No data found for the specified date' 
      });
    }

    // تبدیل داده‌ها به فرمت مورد نیاز
    const temperatureData: TemperatureReading[] = dataResult.data.map((row: any) => {
      // انتخاب اولین ستون دما موجود
      const tempValue = row.Temputare_main || row.Temputare_1 || row.Temputare_2 || 
                       row.Temputare_3 || row.Temputare_4 || 0;
      
      // تبدیل دما از فرمت PLC (مثلاً 290) به درجه سیلسیوس (29.0)
      const actualTemp = (parseFloat(tempValue) || 0) / 10;
      
      return {
        timestamp: row.Timestamp || row.timestamp, // هر دو فرمت timestamp را پشتیبانی می‌کند
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
