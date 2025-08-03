import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/database';

// تابع تبدیل تاریخ میلادی به شمسی
function convertToPersianDate(gregorianDate: Date): string {
  let gYear = gregorianDate.getFullYear();
  const gMonth = gregorianDate.getMonth() + 1;
  const gDay = gregorianDate.getDate();
  
  // الگوریتم تبدیل میلادی به شمسی
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  
  let jy = (gYear <= 1600) ? 0 : 979;
  gYear -= (gYear <= 1600) ? 621 : 1600;
  
  let gy2 = (gMonth > 2) ? (gYear + 1) : gYear;
  let days = (365 * gYear) + (Math.floor((gy2 + 3) / 4)) + (Math.floor((gy2 + 99) / 100)) - 
             (Math.floor((gy2 + 399) / 400)) - 80 + gDay + g_d_m[gMonth - 1];
  
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  
  jy += Math.floor((days - 1) / 365);
  if (days > 365) days = (days - 1) % 365;
  
  let jm, jd;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  
  // نام ماه‌های شمسی
  const persianMonths = [
    '', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];
  
  return `${jd} ${persianMonths[jm]} ${jy}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const plcId = searchParams.get('plcId');
    
    if (!plcId) {
      return NextResponse.json({
        success: false,
        message: 'PLC ID is required',
      }, { status: 400 });
    }

    console.log(`🔍 Getting available dates for PLC_${plcId.padStart(2, '0')}`);
    const pool = await getDbConnection();
    
    // تست کانکشن - چک کردن دیتابیس فعلی
    const testQuery = 'SELECT DB_NAME() as CurrentDatabase';
    const testResult = await pool.request().query(testQuery);
    console.log('✅ Connected to database:', testResult.recordset[0].CurrentDatabase);
    
    // تست لیست جدول‌ها
    const allTablesQuery = `SELECT name as TABLE_NAME FROM sys.tables`;
    const allTablesResult = await pool.request().query(allTablesQuery);
    console.log(`📊 Total tables in database: ${allTablesResult.recordset.length}`);
    console.log('📋 First 5 tables:', allTablesResult.recordset.slice(0, 5).map(t => t.TABLE_NAME));
    
    // تست مستقیم با نام جدول
    const directTestQuery = `SELECT COUNT(*) as count FROM sys.tables WHERE name LIKE 'PLC_Data%'`;
    const directTestResult = await pool.request().query(directTestQuery);
    console.log(`🔍 PLC tables found (direct): ${directTestResult.recordset[0].count}`);
    
    // جستجوی جدول‌های موجود برای این PLC با استفاده از sys.tables
    const query = `
      SELECT 
        name as TABLE_NAME,
        SUBSTRING(name, LEN(name) - 7, 8) as DateString
      FROM sys.tables
      WHERE name LIKE 'PLC_Data_PLC_${plcId.padStart(2, '0')}_%'
        AND LEN(name) = LEN('PLC_Data_PLC_01_') + 8
      ORDER BY name DESC
    `;


    const result = await pool.request().query(query);
        console.log(result)
    // تبدیل نام جدول‌ها به تاریخ‌های قابل خواندن
    const availableDates = result.recordset.map((row: any) => {
      const dateString = row.DateString; // مثال: 20250802
      const year = parseInt(dateString.substring(0, 4));
      const month = parseInt(dateString.substring(4, 6));
      const day = parseInt(dateString.substring(6, 8));
      
      // تبدیل تاریخ میلادی به شمسی
      const gregorianDate = new Date(year, month - 1, day);
      const persianDate = convertToPersianDate(gregorianDate);
      
      return {
        tableName: row.TABLE_NAME,
        dateString: dateString,
        formattedDate: `${year}/${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`, // میلادی
        persianDate: persianDate, // شمسی
        jsDate: gregorianDate
      };
    });

    console.log(`✅ Found ${availableDates.length} available dates for PLC_${plcId.padStart(2, '0')}`);

    return NextResponse.json({
      success: true,
      plcId: plcId,
      availableDates: availableDates,
    });

  } catch (error) {
    console.error('❌ Error getting available dates:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to get available dates',
      error: error.message,
    }, { status: 500 });
  }
}
