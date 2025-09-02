'use client';

import { Card } from './ui/card';
import { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

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
  // فقط ساعت، دقیقه و ثانیه از رشته زمان دریافتی را استخراج می‌کنیم
  const timeMatch = dateString.match(/(\d{2}):(\d{2}):(\d{2})/);
  if (timeMatch) {
    return `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`;
  }
  return dateString;
};

// تبدیل تاریخ میلادی به شمسی
const toJalaliDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    console.error('خطا در تبدیل تاریخ به شمسی:', error);
    return dateString;
  }
};

// تبدیل تاریخ و زمان به فرمت شمسی با زمان
const toJalaliDateTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const datePart = date.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timePart = formatTime(dateString);
    return `${datePart} - ${timePart}`;
  } catch (error) {
    console.error('خطا در تبدیل تاریخ و زمان به شمسی:', error);
    return dateString;
  }
};

const SterilizationProcessChart: React.FC<ProcessChartProps> = ({ process }) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // فانکشن برای پرینت نمودار و اطلاعات فرآیند
  const handlePrintProcess = () => {
    // ایجاد پنجره جدید برای پرینت
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      alert('لطفاً اجازه باز کردن پنجره‌های پاپ‌آپ را بدهید');
      return;
    }
    
    // محتوای HTML برای صفحه پرینت
    const printContent = `
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>گزارش فرآیند استریل ${process.id}</title>
        <style>
          body {
            font-family: Tahoma, Arial, sans-serif;
            margin: 20px;
            padding: 0;
            direction: rtl;
          }
          .report-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 10px;
          }
          .report-title {
            font-size: 24px;
            font-weight: bold;
          }
          .process-info {
            margin-bottom: 20px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .info-item {
            border: 1px solid #eee;
            padding: 8px;
            border-radius: 4px;
          }
          .info-label {
            font-weight: bold;
            margin-bottom: 5px;
          }
          .chart-container {
            width: 100%;
            height: 400px;
            margin-bottom: 20px;
          }
          .chart-placeholder {
            width: 100%;
            height: 100%;
            background-color: #f5f5f5;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px dashed #ccc;
          }
          .success-badge {
            background-color: #d1fae5;
            color: #047857;
            padding: 5px 10px;
            border-radius: 15px;
            display: inline-block;
          }
          .failure-badge {
            background-color: #fee2e2;
            color: #b91c1c;
            padding: 5px 10px;
            border-radius: 15px;
            display: inline-block;
          }
          @media print {
            @page {
              size: A4 portrait;
              margin: 1cm;
            }
            body {
              font-size: 12pt;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div class="report-title">گزارش فرآیند استریل شماره ${process.id}</div>
          <div>${new Date().toLocaleDateString('fa-IR')}</div>
        </div>
        
        <div class="process-info">
          <div class="info-item">
            <div class="info-label">زمان شروع:</div>
            <div>${toJalaliDateTime(process.startTime)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">زمان پایان:</div>
            <div>${toJalaliDateTime(process.endTime)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">مدت کل:</div>
            <div>${process.duration} دقیقه</div>
          </div>
          <div class="info-item">
            <div class="info-label">مدت استریل:</div>
            <div>${Math.round(process.sterilizationDuration)} دقیقه</div>
          </div>
          <div class="info-item">
            <div class="info-label">حداکثر دما:</div>
            <div>${process.maxTemperature.toFixed(1)}°C</div>
          </div>
          <div class="info-item">
            <div class="info-label">حداقل دما:</div>
            <div>${process.minTemperature.toFixed(1)}°C</div>
          </div>
          <div class="info-item">
            <div class="info-label">درصد بالای دمای حداقل:</div>
            <div>${process.percentAboveMinTemp}%</div>
          </div>
          <div class="info-item">
            <div class="info-label">درصد تکمیل زمان:</div>
            <div>${process.percentTargetReached}%</div>
          </div>
          <div class="info-item">
            <div class="info-label">نتیجه فرآیند:</div>
            <div class="${process.success ? 'success-badge' : 'failure-badge'}">
              ${process.success ? '✅ موفق' : '⚠️ ناقص'}
            </div>
          </div>
        </div>
        
        <div>
          <div style="font-weight: bold; margin-bottom: 10px;">نمودار دمای فرآیند:</div>
          <div id="chart-container">
            <img id="chart-image" style="width: 100%; max-height: 400px;" />
          </div>
        </div>
        
        <div style="margin-top: 30px; border-top: 1px solid #ccc; padding-top: 20px;">
          <div style="font-weight: bold;">توضیحات فرآیند:</div>
          <p>
            این فرآیند از دمای ${process.minTemperature.toFixed(1)}°C شروع شده، به حداکثر ${process.maxTemperature.toFixed(1)}°C رسیده است.
            زمان هدف ${process.timeMain} دقیقه بوده که ${process.maxTimeRun} دقیقه از آن طی شده است.
          </p>
          <p>
            درصد موفقیت فرآیند بر اساس زمان: ${process.percentTargetReached}%<br>
            درصد موفقیت فرآیند بر اساس دما: ${process.percentAboveMinTemp}%
          </p>
        </div>

        <div style="margin-top: 50px; text-align: center; font-size: 10pt; color: #666;">
          گزارش ایجاد شده توسط سیستم مانیتورینگ اتوکلاوها - سال 2025
        </div>
        
        <button class="no-print" style="position: fixed; top: 20px; left: 20px; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="window.print(); return false;">
          چاپ گزارش
        </button>
      </body>
      </html>
    `;
    
    // نوشتن محتوا در پنجره جدید
    printWindow.document.write(printContent);
    
    // حل مشکل تصویر نمودار - با استفاده از toDataURL
    setTimeout(() => {
      try {
        // استخراج تصویر نمودار از صفحه اصلی
        const chartElement = document.querySelector('.recharts-wrapper');
        if (chartElement) {
          const svgElement = chartElement.querySelector('svg');
          if (svgElement) {
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // تنظیم ابعاد مناسب
            canvas.width = chartElement.clientWidth;
            canvas.height = chartElement.clientHeight;
            
            // ایجاد تصویر از SVG
            const image = new Image();
            image.onload = function() {
              ctx?.drawImage(image, 0, 0);
              const pngData = canvas.toDataURL('image/png');
              
              // قرار دادن تصویر در صفحه پرینت
              const imgElement = printWindow.document.getElementById('chart-image');
              if (imgElement && imgElement instanceof HTMLImageElement) {
                imgElement.src = pngData;
                
                // نمایش دیالوگ پرینت پس از بارگذاری تصویر
                setTimeout(() => {
                  printWindow.document.close();
                  printWindow.focus();
                  printWindow.print();
                }, 500);
              }
            };
            
            // تبدیل SVG به تصویر
            image.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
          } else {
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
          }
        } else {
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
        }
      } catch (err) {
        console.error('خطا در استخراج تصویر نمودار:', err);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    }, 1000);
  };

  useEffect(() => {
    const fetchProcessData = async () => {
      try {
        setLoading(true);
        
        // استخراج تاریخ از startTime
        const startTime = new Date(process.startTime);
        const date = startTime.toISOString().split('T')[0]; // فرمت YYYY-MM-DD
        
        // استخراج شناسه PLC
        // فرض می‌کنیم که پارامتر PLC در URL یا از طریق parent component دریافت شده
        let plc = 'PLC_01'; // مقدار پیش‌فرض

        // استخراج از URL
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const urlPlc = urlParams.get('plc');
          if (urlPlc) {
            plc = urlPlc;
            console.log(`شناسه PLC از URL استخراج شد: ${plc}`);
          }
        }
        
        // تاریخ شروع فرآیند را ۱۰ دقیقه قبل‌تر می‌گیریم
        const startDate = new Date(process.startTime);
        startDate.setMinutes(startDate.getMinutes() - 10);
        const processStartTime = startDate.toISOString();
        const processEndTime = process.endTime;
        
        console.log(`استخراج داده‌ها: ${plc}, تاریخ ${date} از ${processStartTime} تا ${processEndTime}`);

        // دریافت داده‌های دمایی - با شروع از ۱۰ دقیقه قبل از فرآیند
        const url = `/api/data?plc=${plc}&date=${date.replace(/-/g, '')}&start=${encodeURIComponent(processStartTime)}&end=${encodeURIComponent(processEndTime)}`;
        console.log('درخواست به آدرس:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error('خطا در پاسخ API:', response.status, response.statusText);
          throw new Error(`خطا در دریافت داده‌ها: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          console.error('خطا در پاسخ API:', data.error);
          throw new Error(data.error || 'خطا در دریافت داده‌ها');
        }
        
        // بررسی داده‌های دریافتی
        console.log('تعداد داده‌های دریافتی:', data.data?.length || 0);
        
        // اگر هیچ داده‌ای دریافت نشد
        if (!data.data || data.data.length === 0) {
          console.warn('هیچ داده‌ای برای نمودار دریافت نشد!');
          setChartData([]);
          setLoading(false);
          return;
        }
        
        console.log('نمونه داده‌های دریافتی:', data.data?.slice(0, 2));
        console.log('نام فیلدها:', data.data?.length > 0 ? Object.keys(data.data[0]) : []);

        // تبدیل داده‌ها به فرمت مناسب برای نمودار - استفاده از زمان دقیق دیتابیس
        const chartData: ChartDataPoint[] = data.data.map((point: any) => ({
          time: formatTime(point.Timestamp),
          timestamp: point.Timestamp, // ذخیره زمان اصلی برای استفاده در tooltip
          temperature: parseFloat((point.Temputare_main / 10).toFixed(1)),
          minimumTemp: parseFloat((point.Temputare_min / 10).toFixed(1)),
          timeMinuteRun: point.Time_Minute_Run || 0  // اضافه کردن زمان فرآیند با نام صحیح فیلد
        }));
      
        console.log('داده‌های نمودار آماده شد:', chartData.length);
        setChartData(chartData);
        setLoading(false);
      } catch (err) {
        console.error('خطا در دریافت داده‌ها:', err);
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
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-wrap gap-2">
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
          
          {/* دکمه پرینت فرآیند */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintProcess}
            className="flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            پرینت گزارش
          </Button>
        </div>
        
        <div className="text-xs text-gray-500 mb-2">
          <span>شروع: {toJalaliDateTime(process.startTime)}</span>
          <span className="mx-2">|</span>
          <span>پایان: {toJalaliDateTime(process.endTime)}</span>
          <span className="mx-2">|</span>
          <span>مدت: {process.duration} دقیقه</span>
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
              tickFormatter={(value) => {
                // نمایش فقط ساعت:دقیقه
                const timeParts = value.split(':');
                if (timeParts.length >= 2) {
                  return `${timeParts[0]}:${timeParts[1]}`;
                }
                return value;
              }}
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
                // نمایش فقط ساعت:دقیقه:ثانیه از timestamp
                if (payload && payload.length > 0) {
                  const data = payload[0].payload;
                  const timeRunValue = data.timeMinuteRun || 0;
                  const tempValue = data.temperature || 0;
                  const minTempValue = data.minimumTemp || 0;
                  
                  // استخراج فقط بخش زمان (ساعت:دقیقه:ثانیه) از timestamp کامل
                  let timeDisplay = label;
                  if (data.timestamp) {
                    const timeMatch = data.timestamp.match(/(\d{2}):(\d{2}):(\d{2})/);
                    if (timeMatch) {
                      timeDisplay = `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`;
                    }
                  }
                  
                  return (
                    `زمان: ${timeDisplay}\n` +
                    `دما: ${tempValue}°C (حداقل: ${minTempValue}°C)\n` +
                    `زمان فرآیند: ${timeRunValue} دقیقه`
                  );
                }
                return `زمان: ${label}`;
              }}
              contentStyle={{ 
                direction: 'rtl', 
                textAlign: 'right',
                padding: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid #ccc',
                borderRadius: '4px',
                whiteSpace: 'pre-line'
              }}
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
