import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

async function getGarmentsFromFile(filename: string = 'garments-catalog.json') {
  try {
    const catalogPath = path.join(process.cwd(), 'data', filename);
    const data = await fs.readFile(catalogPath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.warn(`Could not load ${filename}:`, err);
    return [];
  }
}

function filterGarments(garments: any[], type?: string | null, color?: string | null, style?: string | null, season?: string | null) {
  return garments.filter((g: any) => {
    if (type && !g.category?.toLowerCase().includes(type) && !g.name?.toLowerCase().includes(type)) return false;
    if (color && !g.primary_color?.toLowerCase().includes(color) && !g.color?.toLowerCase().includes(color)) return false;
    if (style && !g.style?.toLowerCase().includes(style)) return false;
    if (season && !g.season?.toLowerCase().includes(season)) return false;
    return true;
  });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type')?.toLowerCase();
    const color = searchParams.get('color')?.toLowerCase();
    const style = searchParams.get('style')?.toLowerCase();
    const season = searchParams.get('season')?.toLowerCase();

    let garments: any[] = [];

    // Try Supabase first
    if (supabase) {
      try {
        let query = supabase
          .from('garments')
          .select('*')
          .eq('analysis_status', 'completed');

        if (type) {
          query = query.ilike('category', `%${type}%`);
        }
        if (color) {
          query = query.ilike('primary_color', `%${color}%`);
        }
        if (style) {
          query = query.ilike('style', `%${style}%`);
        }
        if (season) {
          query = query.ilike('season', `%${season}%`);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          garments = data;
        }
      } catch (err) {
        console.warn('Supabase unavailable, falling back to local catalog:', err);
      }
    }

    // Fallback: load from local catalog
    if (garments.length === 0) {
      garments = await getGarmentsFromFile('garments-catalog.json');
    }

    // Apply filters
    let filteredGarments = garments;
    if (type || color || style || season) {
      filteredGarments = filterGarments(garments, type, color, style, season);
    }

    return NextResponse.json({ garments: filteredGarments, total: filteredGarments.length });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message, garments: [] },
      { status: 500 }
    );
  }
}
