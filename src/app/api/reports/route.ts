import { NextRequest, NextResponse } from 'next/server';
import { ReportStorage } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    if (limit > 100) {
      return NextResponse.json(
        { error: 'Limit cannot exceed 100' },
        { status: 400 }
      );
    }

    const reportsIndex = await ReportStorage.getReportsIndex();
    const limitedReports = reportsIndex.reports.slice(0, limit);

    return NextResponse.json({
      reports: limitedReports,
      total: reportsIndex.reports.length
    });

  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}