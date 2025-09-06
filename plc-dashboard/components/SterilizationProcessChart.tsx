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
  plcName?: string; // اضافه کردن prop جدید برای نام PLC
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

const SterilizationProcessChart: React.FC<ProcessChartProps> = ({ process, plcName }) => {
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
            table.data-table {
              page-break-inside: avoid;
            }
            .process-info {
              page-break-inside: avoid;
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
          <!-- درصد بالای دمای حداقل حذف شد -->
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
          <div style="font-weight: bold; margin-bottom: 10px;">داده‌های فرآیند استریل:</div>
          <div id="chart-container">
            <!-- محتوای این بخش با جاوااسکریپت پر خواهد شد -->
            <div style="width: 100%; height: 200px; background-color: #f5f5f5; display: flex; align-items: center; justify-content: center; border: 1px dashed #ccc;">
              در حال آماده‌سازی داده‌های فرآیند...
            </div>
          </div>
        </div>
        
        <div style="margin-top: 30px; border-top: 1px solid #ccc; padding-top: 20px;">
          <div style="font-weight: bold;">توضیحات فرآیند:</div>
          <p>
            این فرآیند در تاریخ ${toJalaliDate(process.startTime)} از ساعت ${formatTime(process.startTime)} شروع شده
            و در ساعت ${formatTime(process.endTime)} به پایان رسیده است.
          </p>
          <p>
            دمای فرآیند از ${process.minTemperature.toFixed(1)}°C شروع شده، به حداکثر ${process.maxTemperature.toFixed(1)}°C رسیده است.
            زمان هدف ${process.timeMain} دقیقه بوده که ${process.maxTimeRun} دقیقه از آن طی شده است.
          </p>
          <p>
            درصد موفقیت فرآیند بر اساس زمان: ${process.percentTargetReached}%<br>
            نتیجه نهایی: ${process.success ? '✅ فرآیند با موفقیت انجام شده است' : '⚠️ فرآیند به طور کامل انجام نشده است'}
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
    
    // بجای تلاش برای تبدیل نمودار به تصویر، از جدول داده‌ها استفاده می‌کنیم
    setTimeout(() => {
      try {
        // ایجاد جدول داده‌ها برای صفحه پرینت
        let tableRows = '';
        
        // ساخت ردیف‌های جدول از داده‌های نمودار
        // فقط تعدادی از داده‌ها را در جدول نشان می‌دهیم تا صفحه خیلی بزرگ نشود
        const currentChartData = chartData; // استفاده از متغیر state
        const sampleSize = Math.min(15, currentChartData.length);
        const step = currentChartData.length > sampleSize ? Math.floor(currentChartData.length / sampleSize) : 1;
        
        // اطمینان از اینکه داده‌های مهم را داریم
        const keySamples = new Set<number>(); // برای اطمینان از عدم تکرار
        
        // مطمئن شویم که شروع فرآیند را داریم
        if (currentChartData.length > 0) {
          keySamples.add(0);
        }
        
        // مطمئن شویم که پایان فرآیند را داریم
        if (currentChartData.length > 0) {
          keySamples.add(currentChartData.length - 1);
        }
        
        // نقاط دیگر را با فواصل منظم اضافه می‌کنیم
        for (let i = 0; i < currentChartData.length; i += step) {
          keySamples.add(i);
        }
        
        // تبدیل به آرایه و مرتب‌سازی
        const sampledIndices = Array.from(keySamples).sort((a: number, b: number) => a - b);
        
        for (const i of sampledIndices) {
          if (i < currentChartData.length) {
            const data: any = currentChartData[i];
            const isAboveMinTemp = data.temperature >= process.minTemperature;
            const statusCell = isAboveMinTemp ? 
              `<td style="color: #059669;">✓ استاندارد</td>` : 
              `<td style="color: #b91c1c;">✗ پایین‌تر از حد</td>`;
            
            tableRows += `
              <tr>
                <td>${formatTime(data.timestamp) || ''}</td>
                <td>${data.temperature?.toFixed(1) || '-'}°C</td>
                <td>${data.minimumTemp?.toFixed(1) || '-'}°C</td>
                <td>${data.timeMinuteRun?.toFixed(1) || '-'}</td>
                ${statusCell}
              </tr>
            `;
          }
        }
        
        // قرار دادن جدول در صفحه پرینت
        const chartContainer = printWindow.document.getElementById('chart-container');
        if (chartContainer) {
          chartContainer.innerHTML = `
            <div style="margin-bottom: 20px;">
              <div style="font-weight: bold; margin-bottom: 5px;">نمودار دمای فرآیند استریل</div>
              <div style="font-style: italic; margin-bottom: 10px; font-size: 0.9em;">
                دمای حداکثر: ${process.maxTemperature}°C | 
                دمای حداقل: ${process.minTemperature}°C | 
                زمان هدف: ${process.timeMain} دقیقه
              </div>
              
              <div style="height: 60px; position: relative; margin-bottom: 20px; border-left: 1px solid #ccc; border-bottom: 1px solid #ccc;">
                <!-- نمایش نموداری ساده -->
                <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; background-color: #e0e0e0;"></div>
                
                <!-- خط حداقل دمای استاندارد -->
                <div style="position: absolute; bottom: 50%; left: 0; width: 100%; height: 1px; border-top: 2px dashed #ff0000;"></div>
                <div style="position: absolute; bottom: 50%; left: 1%; font-size: 8px; color: #b91c1c;">حداقل دمای استاندارد: ${process.minTemperature.toFixed(1)}°C</div>
                
                <!-- پیش‌گرم -->
                <div style="position: absolute; bottom: 0; left: 0%; width: 30%; height: 100%; background-color: #ffe8cc; opacity: 0.3;"></div>
                <div style="position: absolute; bottom: -20px; left: 12%; font-size: 0.8em; color: #7c2d12;">پیش‌گرم</div>
                
                <!-- استریلیزاسیون -->
                <div style="position: absolute; bottom: 0; left: 30%; width: 40%; height: 100%; background-color: #d1fae5; opacity: 0.3;"></div>
                <div style="position: absolute; bottom: -20px; left: 45%; font-size: 0.8em; color: #065f46;">استریلیزاسیون</div>
                
                <!-- خنک‌سازی -->
                <div style="position: absolute; bottom: 0; left: 70%; width: 30%; height: 100%; background-color: #dbeafe; opacity: 0.3;"></div>
                <div style="position: absolute; bottom: -20px; left: 80%; font-size: 0.8em; color: #1e40af;">خنک‌سازی</div>
                
                <!-- نشانگر درصد تکمیل زمان هدف -->
                <div style="position: absolute; bottom: 0; left: 30%; width: ${(process.percentTargetReached * 40 / 100)}%; height: 8px; background-color: #059669;"></div>
                
                <!-- نقاط شروع و پایان -->
                <div style="position: absolute; bottom: 0; left: 0; height: 10px; width: 2px; background-color: #000;"></div>
                <div style="position: absolute; bottom: 0; right: 0; height: 10px; width: 2px; background-color: #000;"></div>
                <div style="position: absolute; bottom: -35px; left: 0; font-size: 0.8em;">شروع: ${formatTime(process.startTime)}</div>
                <div style="position: absolute; bottom: -35px; right: 0; font-size: 0.8em;">پایان: ${formatTime(process.endTime)}</div>
              </div>
              
              <!-- راهنمای نمودار -->
              <div style="font-size: 10px; margin-bottom: 15px;">
                <div style="margin-bottom: 5px;"><span style="display: inline-block; width: 10px; height: 10px; background-color: #059669; margin-left: 5px;"></span>درصد تکمیل زمان هدف: ${process.percentTargetReached}%</div>
                <div><span style="display: inline-block; width: 10px; height: 10px; border-top: 2px dashed #ff0000; margin-left: 5px;"></span>حداقل دمای استاندارد: ${process.minTemperature.toFixed(1)}°C</div>
              </div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.85em;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="border: 1px solid #ccc; padding: 5px; text-align: right;">زمان</th>
                  <th style="border: 1px solid #ccc; padding: 5px; text-align: right;">دما (°C)</th>
                  <th style="border: 1px solid #ccc; padding: 5px; text-align: right;">دمای حداقل (°C)</th>
                  <th style="border: 1px solid #ccc; padding: 5px; text-align: right;">زمان فرآیند (دقیقه)</th>
                  <th style="border: 1px solid #ccc; padding: 5px; text-align: right;">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          `;
        }
        
        // نمایش دیالوگ پرینت
        setTimeout(() => {
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
        }, 500);
        
      } catch (err) {
        console.error('خطا در ساخت جدول داده‌ها:', err);
        
        // در صورت خطا، یک پیام ساده نمایش می‌دهیم
        const chartContainer = printWindow.document.getElementById('chart-container');
        if (chartContainer) {
          chartContainer.innerHTML = `
            <div style="padding: 20px; border: 1px solid #ccc; text-align: center;">
              <p>متأسفانه امکان نمایش نمودار وجود ندارد.</p>
              <p>اطلاعات فرآیند:</p>
              <p>دمای حداکثر: ${process.maxTemperature}°C | دمای حداقل: ${process.minTemperature}°C</p>
              <p>زمان هدف: ${process.timeMain} دقیقه | زمان اجرا شده: ${process.maxTimeRun} دقیقه</p>
            </div>
          `;
        }
        
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
        let plc = plcName || 'PLC_01'; // اگر plcName از prop ها وجود داشت از آن استفاده کن، در غیر اینصورت از مقدار پیش‌فرض استفاده کن

        // لاگ برای تشخیص مقدار PLC
        console.log(`استفاده از PLC در نمودار استریلیزاسیون: ${plc}`, { 
          propPLC: plcName, 
          defaultPLC: 'PLC_01'
        });

        // استخراج از URL (فقط اگر plcName وجود نداشته باشد)
        if (!plcName && typeof window !== 'undefined') {
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
            {/* درصد زمان بالای دمای حداقل نمایش داده نمی‌شود */}
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
