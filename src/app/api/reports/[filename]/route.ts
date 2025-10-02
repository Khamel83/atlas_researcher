import { NextRequest, NextResponse } from 'next/server';
import { ReportStorage } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;

    // Ensure the filename ends with .md
    const fullFilename = filename.endsWith('.md') ? filename : `${filename}.md`;

    // Validate filename to prevent directory traversal
    if (!/^[\d\w\-_]+\.md$/.test(fullFilename)) {
      return NextResponse.json(
        { error: 'Invalid filename format' },
        { status: 400 }
      );
    }

    const report = await ReportStorage.getReport(fullFilename);

    return NextResponse.json({
      content: report.content,
      metadata: report.metadata,
      filename: fullFilename
    });

  } catch (error) {
    console.error('Report API error:', error);

    if (error instanceof Error && error.message.includes('Report not found')) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;
    const fullFilename = filename.endsWith('.md') ? filename : `${filename}.md`;

    if (!/^[\d\w\-_]+\.md$/.test(fullFilename)) {
      return NextResponse.json(
        { error: 'Invalid filename format' },
        { status: 400 }
      );
    }

    await ReportStorage.deleteReport(fullFilename);

    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('Report delete error:', error);

    if (error instanceof Error && error.message.includes('Report not found')) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete report' },
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