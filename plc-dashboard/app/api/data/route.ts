import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection, PLC_CONFIG } from '@/lib/database';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Data API called - connecting to database');
    
    const { searchParams } = new URL(request.url);
    const plcName = searchParams.get('plc');
    const date = searchParams.get('date');
    const startHour = parseInt(searchParams.get('startHour') || '0');
    const endHour = parseInt(searchParams.get('endHour') || '24');
    const registers = searchParams.get('registers')?.split(',') || [];

    console.log('📊 Params:', { plcName, date, startHour, endHour, registers });

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
    
    // Convert date format from YYYY-MM-DD to YYYYMMDD for table name
    const dateForTable = date.replace(/-/g, '');
    const tableName = `PLC_Data_${plcName}_${dateForTable}`;

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

    // Create WHERE clause for hour filtering
    let whereClause = '';
    if (startHour > 0 || endHour < 24) {
      // Data is already in Tehran time, no timezone conversion needed
      const startTime = `'${date} ${startHour.toString().padStart(2, '0')}:00:00'`;
      const endTime = endHour === 24 
        ? `'${date} 23:59:59'` 
        : `'${date} ${endHour.toString().padStart(2, '0')}:00:00'`;
      
      // Direct comparison without timezone conversion
      whereClause = `WHERE Timestamp >= ${startTime} AND Timestamp <= ${endTime}`;
    }

    const query = `
      SELECT ${selectColumns.join(', ')} 
      FROM [${tableName}] 
      ${whereClause}
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
