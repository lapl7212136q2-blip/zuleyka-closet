import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';

const CATALOG_PATH = path.join(process.cwd(), 'data', 'garments-catalog.json');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
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

    // Local catalog is the source of truth; Supabase adds user uploads
    const raw = await fs.readFile(CATALOG_PATH, 'utf8');
    let garments: any[] = JSON.parse(raw);

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('garments')
          .select('*')
          .eq('analysis_status', 'completed');

        if (!error && data) {
          const known = new Set(
            garments.flatMap((g: any) => [g.image_path, g.id].filter(Boolean))
          );
          for (const g of data) {
            if (!known.has(g.image_path) && !known.has(g.id)) garments.push(g);
          }
        }
      } catch (err) {
        console.warn('Supabase unavailable, using local catalog only:', err);
      }
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
