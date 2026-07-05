import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const dbPath = path.join(process.cwd(), 'data', 'closet.db');
    const db = new Database(dbPath);

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type')?.toLowerCase();
    const color = searchParams.get('color')?.toLowerCase();
    const style = searchParams.get('style')?.toLowerCase();
    const season = searchParams.get('season')?.toLowerCase();

    let query = 'SELECT * FROM garments WHERE 1=1';
    const params: string[] = [];

    if (type) {
      query += ' AND LOWER(garment_type) LIKE ?';
      params.push(`%${type}%`);
    }
    if (color) {
      query += ' AND LOWER(color) LIKE ?';
      params.push(`%${color}%`);
    }
    if (style) {
      query += ' AND LOWER(style) LIKE ?';
      params.push(`%${style}%`);
    }
    if (season) {
      query += ' AND LOWER(season) LIKE ?';
      params.push(`%${season}%`);
    }

    const stmt = db.prepare(query);
    const garments = stmt.all(...params) as any[];

    db.close();

    return NextResponse.json({ garments, total: garments.length });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Error fetching garments', garments: [] },
      { status: 500 }
    );
  }
}
