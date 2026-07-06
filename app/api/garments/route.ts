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

async function getGarmentsFromFile() {
  try {
    const garmentsPath = path.join(process.cwd(), 'data', 'garments.json');
    const data = await fs.readFile(garmentsPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function filterGarments(garments: any[], type?: string | null, color?: string | null, style?: string | null, season?: string | null) {
  return garments.filter((g: any) => {
    if (type && !g.category?.toLowerCase().includes(type)) return false;
    if (color && !g.primary_color?.toLowerCase().includes(color)) return false;
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

    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase not configured', garments: [] },
        { status: 500 }
      );
    }

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

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: error.message, garments: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({ garments: data || [], total: data?.length || 0 });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message, garments: [] },
      { status: 500 }
    );
  }
}
