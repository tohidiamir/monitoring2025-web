import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/database';

export async function GET() {
  try {
    console.log('🔍 Testing database connection...');
    const pool = await getDbConnection();
    console.log('✅ Database connection successful');

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
    });
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return NextResponse.json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
    }, { status: 500 });
  }
}
