'use client';

import { Card } from './ui/card';
import { useState, useEffect } from 'react';
import { Badge } from './ui/badge';

// برای استفاده از کتابخانه recharts، باید آن را با دستور زیر نصب کنید:
// npm install recharts

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface ProcessChartProps {
  process: {
    id: number;
    startTime: string;
    endTime: string;
    duration: number;
    maxTemperature: number;
    minTemperature: number;
    sterilizationDuration: number;
    highTempDuration: number;
    timeMain: number;
    maxTimeRun: number;
    percentTargetReached: number;
    percentAboveMinTemp: number;
    success: boolean;
  };
}

interface ChartDataPoint {
  time: string;
  timestamp?: string; // زمان اصلی از دیتابیس
  temperature: number;
  minimumTemp?: number;
  timeMinuteRun?: number;
}

// تابع فرمت‌کننده زمان بدون تغییر timezone
const formatTime = (dateString: string): string => {
  // فقط ساعت و دقیقه از رشته زمان دریافتی را استخراج می‌کنیم
  const timeMatch = dateString.match(/(\d{2}):(\d{2}):(\d{2})/);
  if (timeMatch) {
    return `${timeMatch[1]}:${timeMatch[2]}`;
  }
  return dateString;
};

const SterilizationProcessChart: React.FC<ProcessChartProps> = ({ process }) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProcessData = async () => {
      try {
        setLoading(true);
        
        // استخراج تاریخ از startTime
        const startTime = new Date(process.startTime);
        const date = startTime.toISOString().split('T')[0]; // فرمت YYYY-MM-DD
        
        // استخراج شناسه PLC
        const plcMatch = process.id.toString().match(/PLC_\w+/);
        const plc = plcMatch ? plcMatch[0] : 'PLC_01'; // پیش‌فرض PLC_01
        
        // تاریخ شروع فرآیند را ۱۰ دقیقه قبل‌تر می‌گیریم
        const startDate = new Date(process.startTime);
        startDate.setMinutes(startDate.getMinutes() - 10);
        const processStartTime = startDate.toISOString();
        const processEndTime = process.endTime;
        
        console.log(`Fetching process data from ${processStartTime} (10 min before process start) to ${processEndTime}`);
        
        // دریافت داده‌های دمایی - با شروع از ۱۰ دقیقه قبل از فرآیند
        const response = await fetch(`/api/data?plc=${plc}&date=${date.replace(/-/g, '')}&start=${encodeURIComponent(processStartTime)}&end=${encodeURIComponent(processEndTime)}`);
        
        if (!response.ok) {
          throw new Error('خطا در دریافت داده‌ها');
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'خطا در دریافت داده‌ها');
        }
        
        // برای اطمینان از دریافت داده‌های صحیح، چند نمونه اول را در کنسول چاپ می‌کنیم
        console.log('نمونه داده‌های دریافتی برای فرآیند استریل:', data.data.slice(0, 3));
        console.log('نام فیلدها:', data.data.length > 0 ? Object.keys(data.data[0]) : 'داده‌ای یافت نشد');
        
        // تبدیل داده‌ها به فرمت مناسب برای نمودار - استفاده از زمان دقیق دیتابیس
        const chartData: ChartDataPoint[] = data.data.map((point: any) => ({
          time: formatTime(point.Timestamp),
          timestamp: point.Timestamp, // ذخیره زمان اصلی برای استفاده در tooltip
          temperature: parseFloat((point.Temputare_main / 10).toFixed(1)),
          minimumTemp: parseFloat((point.Temputare_min / 10).toFixed(1)),
          timeMinuteRun: point.Time_Minute_Run || 0  // اضافه کردن زمان فرآیند با نام صحیح فیلد
        }));
        
        setChartData(chartData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching process data:', err);
        setError(err instanceof Error ? err.message : 'خطا در دریافت داده‌ها');
        setLoading(false);
      }
    };
    
    if (process && process.id) {
      fetchProcessData();
    }
  }, [process]);

  if (loading) {
    return (
      <Card className="p-4 mb-6">
        <div className="text-center">در حال بارگذاری نمودار...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 mb-6">
        <div className="text-center text-red-500">خطا: {error}</div>
      </Card>
    );
  }

  // اگر داده‌ای وجود نداشت
  if (!chartData || chartData.length === 0) {
    return (
      <Card className="p-4 mb-6">
        <div className="text-center">داده‌ای برای نمایش نمودار وجود ندارد</div>
      </Card>
    );
  }

  // پیدا کردن مقدار حداقل دما برای خط مرجع
  const minRequiredTemp = chartData[0]?.minimumTemp || 0;
  
  // محاسبه دامنه دمایی برای نمودار (حداقل و حداکثر دما)
  const minTemp = Math.min(...chartData.map(d => d.temperature));
  const maxTemp = Math.max(...chartData.map(d => d.temperature));
  const tempDomain = [
    Math.max(0, Math.floor(minTemp - 5)), // کمینه دما با حاشیه
    Math.ceil(maxTemp + 5) // بیشینه دما با حاشیه
  ];
  
  return (
    <Card className="p-4 mb-6">
      <div className="flex flex-col mb-4">
        <h3 className="text-lg font-bold mb-2">نمودار فرآیند استریل {process.id}</h3>
        
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant={process.success ? "default" : "destructive"} 
                 className={process.success ? "bg-green-100 text-green-800" : ""}>
            {process.success ? 'موفق' : 'ناموفق'}
          </Badge>
          <Badge variant="outline">
            مدت: {process.duration} دقیقه
          </Badge>
          <Badge variant="outline">
            دمای حداکثر: {process.maxTemperature}°C
          </Badge>
          <Badge variant="outline">
            زمان استریل: {Math.round(process.sterilizationDuration)} دقیقه
          </Badge>
          <Badge variant="outline">
            درصد تکمیل: {process.percentTargetReached}%
          </Badge>
          <Badge variant="outline">
            درصد زمان بالای دمای حداقل: {process.percentAboveMinTemp}%
          </Badge>
        </div>
        
        <div className="text-xs text-gray-500 mb-2">
          <span>شروع: {formatTime(process.startTime)}</span>
          <span className="mx-2">|</span>
          <span>پایان: {formatTime(process.endTime)}</span>
        </div>
      </div>

      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 10 }} 
              interval={chartData.length > 20 ? Math.ceil(chartData.length/10) : 0}
            />
            <YAxis 
              yAxisId="left"
              domain={tempDomain}
              label={{ value: 'دما (°C)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} 
            />
            <Tooltip 
              formatter={(value, name, props) => {
                if (name === 'دما') return [`${value}°C`, name];
                if (name === 'زمان فرآیند') return [`${value} دقیقه`, name];
                return [value, name];
              }}
              labelFormatter={(label, payload) => {
                // نمایش دقیق زمان بدون تغییر timezone
                if (payload && payload.length > 0) {
                  const data = payload[0].payload;
                  const timeRunValue = data.timeMinuteRun || 0;
                  return `زمان: ${data.timestamp || label} | زمان اجرا: ${timeRunValue} دقیقه`;
                }
                return `زمان: ${label}`;
              }}
              contentStyle={{ direction: 'rtl', textAlign: 'right' }}
            />
            <Legend />
            
            {/* خط حداقل دمای استریل */}
            <ReferenceLine 
              y={minRequiredTemp} 
              yAxisId="left" 
              label={{ value: `حداقل دمای استریل: ${minRequiredTemp}°C`, position: 'top', fill: 'red' }} 
              stroke="red" 
              strokeDasharray="3 3" 
            />
            
            {/* خط زمان هدف استریل */}
            <ReferenceLine 
              y={process.timeMain} 
              yAxisId="right" 
              label={{ value: `زمان هدف: ${process.timeMain} دقیقه`, position: 'top', fill: 'blue' }} 
              stroke="blue" 
              strokeDasharray="3 3" 
            />
            
            {/* نمودار دما */}
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="temperature" 
              name="دما" 
              stroke="#8884d8" 
              activeDot={{ r: 8 }} 
              dot={false}
              strokeWidth={2}
            />
            
            {/* نمودار زمان فرآیند (اختیاری) */}
            {chartData[0]?.timeMinuteRun !== undefined && (
              <>
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  domain={[0, process.timeMain * 1.2]} // دامنه از صفر تا 20% بیشتر از زمان هدف
                  label={{ value: 'زمان فرآیند (دقیقه)', angle: -90, position: 'insideRight', style: { textAnchor: 'middle' } }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="timeMinuteRun" 
                  name="زمان فرآیند" 
                  stroke="#82ca9d" 
                  activeDot={{ r: 5 }} 
                  dot={false}
                  strokeWidth={2}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default SterilizationProcessChart;
