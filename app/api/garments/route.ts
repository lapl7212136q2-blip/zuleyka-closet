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

    // Demo data (hardcoded for testing)
    let garments: any[] = [
      {
        id: '1',
        garment_type: 'dress',
        color: 'blue',
        pattern: 'solid',
        style: 'casual',
        season: 'spring',
        confidence: 0.95,
        photo_url: '/photos/photo_a8a10987-2b48-4d12-beac-643683510d94.jpg'
      },
      {
        id: '2',
        garment_type: 'blouse',
        color: 'white',
        pattern: 'solid',
        style: 'formal',
        season: 'summer',
        confidence: 0.92,
        photo_url: '/photos/photo_395f670e-2079-4252-bb84-43bcc396f76b.jpg'
      }
    ];

    // Try Supabase first with timeout
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

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase query timeout')), 2000)
        );

        const { data, error } = await Promise.race([query, timeoutPromise]);
        if (!error && data && data.length > 0) {
          garments = data;
        }
      } catch (err) {
        console.warn('Supabase unavailable, using demo data', err);
      }
    }

    // Apply filters to demo data
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
