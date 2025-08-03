import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Test API called');
    return NextResponse.json({
      success: true,
      message: 'API is working!',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in test API:', error);
    return NextResponse.json(
      { success: false, error: 'Test API failed' },
      { status: 500 }
    );
  }
}
