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
          
          // First, let's see what columns exist in the table
          const columnsQuery = `
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = '${latestTable}'
          `;
          
          const columnsResult = await pool.request().query(columnsQuery);
          const availableColumns = columnsResult.recordset.map(row => row.COLUMN_NAME);
          console.log(`📋 Available columns in ${latestTable}:`, availableColumns);
          
          // Get the latest record from this table
          const dataQuery = `
            SELECT TOP 1 *, 
                   DATEDIFF(second, Timestamp, GETDATE()) as seconds_ago
            FROM [${latestTable}]
            ORDER BY Timestamp DESC
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
          
          // Log the actual data we received
          console.log(`📊 Latest record for ${plc.displayName}:`, {
            timestamp: latestRecord.Timestamp,
            secondsAgo: secondsAgo,
            pressure: latestRecord.Pressure,
            temp_main: latestRecord.Temputare_main
          });
          
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
          
          // Format the data with Persian labels - map register names to database column names
          const registerMapping = {
            'D500': 'Pressure',
            'D501': 'Pressure_min', 
            'D502': 'Temputare_main',
            'D503': 'Temputare_1',
            'D504': 'Temputare_2', 
            'D505': 'Temputare_3',
            'D506': 'Temputare_4',
            'D507': 'Temputare_min',
            'D508': 'Temputare_max',
            'D513': 'Temputare_Calibre_1',
            'D514': 'Temputare_Calibre_2', 
            'D515': 'Temputare_Calibre_3',
            'D516': 'Temputare_Calibre_4',
            'D520': 'Time_Main',
            'D521': 'Time_Minute_Run',
            'D522': 'Time_Second_Run',
            'D525': 'GREEN',
            'D526': 'RED',
            'D527': 'YELLOW'
          };
          
          const formattedData = plc.database_registers.map(register => {
            const dbColumnName = registerMapping[register.register] || register.register;
            const value = latestRecord[dbColumnName];
            console.log(`🔍 Register ${register.register} -> DB Column ${dbColumnName} for ${plc.displayName}: ${value} (type: ${typeof value})`);
            
            // Special handling for light indicators
            let displayValue = value;
            if (register.register === 'D525' || register.register === 'D526' || register.register === 'D527') {
              // For lights: convert 0/1 to active/inactive status
              displayValue = (value === 1 || value === '1') ? 'فعال' : 'غیرفعال';
            } else if (value !== null && value !== undefined) {
              displayValue = value;
            } else {
              displayValue = 'N/A';
            }
            
            return {
              register: register.register,
              label: register.label,
              description: register.description,
              value: displayValue,
              unit: getUnitForRegister(register.register),
              isLight: register.register === 'D525' || register.register === 'D526' || register.register === 'D527'
            };
          });
          
          return {
            plc: plc,
            status: connectionStatus,
            message: statusMessage,
            data: formattedData,
            lastUpdate: latestRecord.Timestamp, // Use correct column name
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

// Helper function to get unit for each register based on Persian label
function getUnitForRegister(register: string): string {
  // Get the register config to check the Persian label
  const allRegisters = PLC_CONFIG.flatMap(plc => plc.database_registers);
  const registerConfig = allRegisters.find(r => r.register === register);
  
  if (!registerConfig) return '';
  
  const label = registerConfig.labelFa.toLowerCase();
  
  // Check Persian labels for unit determination
  if (label.includes('فشار')) return 'بار';
  if (label.includes('دما')) return '°C';
  if (label.includes('زمان') || label.includes('دقیقه') || label.includes('ثانیه')) return 'دقیقه';
  if (label.includes('سبز') || label.includes('قرمز') || label.includes('زرد')) return '';
  
  return '';
}
