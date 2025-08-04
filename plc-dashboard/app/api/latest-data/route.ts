import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection, PLC_CONFIG } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Latest Data API called - fetching latest data for all autoclaves');
    
    const pool = await getDbConnection();
    
    // Get latest data for all PLCs
    const latestData = await Promise.all(
      PLC_CONFIG.map(async (plc) => {
        try {
          // Find the latest table for this PLC
          const tablesQuery = `
            SELECT TOP 1 TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE' 
            AND TABLE_NAME LIKE 'PLC_Data_${plc.name}_%'
            ORDER BY TABLE_NAME DESC
          `;
          
          const tablesResult = await pool.request().query(tablesQuery);
          
          if (tablesResult.recordset.length === 0) {
            console.log(`⚠️ No tables found for ${plc.displayName}`);
            return {
              plc: plc,
              status: 'no_data',
              message: 'هیچ داده‌ای یافت نشد',
              data: null,
              lastUpdate: null
            };
          }
          
          const latestTable = tablesResult.recordset[0].TABLE_NAME;
          console.log(`📊 Latest table for ${plc.displayName}: ${latestTable}`);
          
          // Get the latest record from this table
          const dataQuery = `
            SELECT TOP 1 *, 
                   DATEDIFF(second, timestamp, GETDATE()) as seconds_ago
            FROM [${latestTable}]
            ORDER BY timestamp DESC
          `;
          
          const dataResult = await pool.request().query(dataQuery);
          
          if (dataResult.recordset.length === 0) {
            return {
              plc: plc,
              status: 'empty_table',
              message: 'جدول خالی است',
              data: null,
              lastUpdate: null
            };
          }
          
          const latestRecord = dataResult.recordset[0];
          const secondsAgo = latestRecord.seconds_ago;
          
          // Determine connection status based on how recent the data is
          let connectionStatus = 'success';
          let statusMessage = 'متصل - داده‌های تازه';
          
          if (secondsAgo > 300) { // More than 5 minutes
            connectionStatus = 'offline';
            statusMessage = 'قطع شده - آخرین داده قدیمی است';
          } else if (secondsAgo > 60) { // More than 1 minute
            connectionStatus = 'warning';
            statusMessage = 'اتصال ضعیف - داده‌های تأخیری';
          }
          
          // Format the data with Persian labels
          const formattedData = plc.database_registers.map(register => {
            const value = latestRecord[register.register];
            return {
              register: register.register,
              label: register.labelFa,
              description: register.descriptionFa,
              value: value !== null && value !== undefined ? value : 'N/A',
              unit: getUnitForRegister(register.register)
            };
          });
          
          return {
            plc: plc,
            status: connectionStatus,
            message: statusMessage,
            data: formattedData,
            lastUpdate: latestRecord.timestamp,
            tableName: latestTable,
            secondsAgo: secondsAgo,
            isOnline: secondsAgo <= 60,
            connectionQuality: secondsAgo <= 30 ? 'excellent' : secondsAgo <= 60 ? 'good' : secondsAgo <= 300 ? 'poor' : 'offline'
          };
          
        } catch (error) {
          console.error(`❌ Error getting latest data for ${plc.displayName}:`, error);
          return {
            plc: plc,
            status: 'error',
            message: 'خطا در دریافت داده‌ها',
            data: null,
            lastUpdate: null,
            error: error.message
          };
        }
      })
    );
    
    console.log('✅ Latest data retrieved for all autoclaves');
    
    return NextResponse.json({
      success: true,
      data: latestData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in Latest Data API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch latest data', 
        details: error?.toString(),
        message: 'خطا در دریافت آخرین اطلاعات'
      },
      { status: 500 }
    );
  }
}

// Helper function to get unit for each register
function getUnitForRegister(register: string): string {
  if (register.includes('Pressure')) return 'بار';
  if (register.includes('Temputare')) return '°C';
  return '';
}
