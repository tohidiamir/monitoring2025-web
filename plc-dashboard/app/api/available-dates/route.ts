import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/database';

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
      const year = dateString.substring(0, 4);
      const month = dateString.substring(4, 6);
      const day = dateString.substring(6, 8);
      
      return {
        tableName: row.TABLE_NAME,
        dateString: dateString,
        formattedDate: `${year}/${month}/${day}`,
        jsDate: new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
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
