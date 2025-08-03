import { NextResponse } from 'next/server';
import { getDbConnection, PLC_CONFIG } from '@/lib/database';

export async function GET() {
  try {
    console.log('🔍 PLCs API called - connecting to database');
    
    // Connect to database
    const pool = await getDbConnection();
    
    // Get list of available tables for each PLC from database
    const plcsWithTables = await Promise.all(
      PLC_CONFIG.map(async (plc) => {
        try {
          const query = `
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE' 
            AND TABLE_NAME LIKE 'PLC_Data_${plc.name}_%'
            ORDER BY TABLE_NAME DESC
          `;
          
          console.log(`📊 Querying tables for ${plc.name}`);
          const result = await pool.request().query(query);
          const tables = result.recordset.map((row: any) => row.TABLE_NAME);
          
          console.log(`📋 Found ${tables.length} tables for ${plc.name}`);
          
          // Extract dates from table names
          const dates = tables.map((tableName: string) => {
            const match = tableName.match(/(\d{8})$/);
            return match ? match[1] : null;
          }).filter(Boolean);
          
          return {
            ...plc,
            availableDates: dates,
            latestTable: tables[0] || null,
          };
        } catch (error) {
          console.error(`❌ Error getting tables for ${plc.name}:`, error);
          return {
            ...plc,
            availableDates: [],
            latestTable: null,
          };
        }
      })
    );

    console.log('✅ Returning PLCs with database data');

    return NextResponse.json({
      success: true,
      plcs: plcsWithTables,
    });
  } catch (error) {
    console.error('❌ Error in PLCs API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch PLCs', 
        details: error?.toString(),
        message: 'Check server logs for more details'
      },
      { status: 500 }
    );
  }
}
