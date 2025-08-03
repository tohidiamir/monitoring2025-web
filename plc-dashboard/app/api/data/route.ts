import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection, PLC_CONFIG } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Data API called - connecting to database');
    
    const { searchParams } = new URL(request.url);
    const plcName = searchParams.get('plc');
    const date = searchParams.get('date');
    const registers = searchParams.get('registers')?.split(',') || [];

    console.log('📊 Params:', { plcName, date, registers });

    if (!plcName || !date) {
      return NextResponse.json(
        { success: false, error: 'PLC name and date are required' },
        { status: 400 }
      );
    }

    // Find PLC config
    const plcConfig = PLC_CONFIG.find(p => p.name === plcName);
    if (!plcConfig) {
      return NextResponse.json(
        { success: false, error: 'PLC not found' },
        { status: 404 }
      );
    }

    // Connect to database
    const pool = await getDbConnection();
    const tableName = `PLC_Data_${plcName}_${date}`;

    console.log(`🔍 Checking if table exists: ${tableName}`);

    // Check if table exists
    const tableExistsQuery = `
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = '${tableName}'
    `;
    const tableCheck = await pool.request().query(tableExistsQuery);
    
    if (tableCheck.recordset[0].count === 0) {
      console.log(`❌ Table ${tableName} does not exist`);
      return NextResponse.json(
        { success: false, error: 'No data found for this date' },
        { status: 404 }
      );
    }

    console.log(`Table ${tableName} exists, fetching data`);

    // Build SELECT query for requested registers
    let selectColumns = ['Timestamp'];
    const availableRegisters = plcConfig.database_registers;

    if (registers.length > 0) {
      // Filter requested registers that exist in config
      const validRegisters = availableRegisters.filter(reg => 
        registers.indexOf(reg.label) !== -1  // Use indexOf instead of includes for compatibility
      );
      selectColumns = [...selectColumns, ...validRegisters.map(reg => `[${reg.label}]`)];
    } else {
      // If no specific registers requested, get all
      selectColumns = [...selectColumns, ...availableRegisters.map(reg => `[${reg.label}]`)];
    }

    const query = `
      SELECT ${selectColumns.join(', ')} 
      FROM [${tableName}] 
      ORDER BY Timestamp ASC
    `;

    console.log('Executing query:', query);
    const result = await pool.request().query(query);
    
    console.log(`Retrieved ${result.recordset.length} records from ${tableName}`);
    
    return NextResponse.json({
      success: true,
      data: result.recordset,
      plc: plcConfig,
      tableName,
      totalRecords: result.recordset.length,
    });

  } catch (error) {
    console.error('Error in Data API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data', details: error?.toString() },
      { status: 500 }
    );
  }
}
