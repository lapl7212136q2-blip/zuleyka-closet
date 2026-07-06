import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
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

// Color compatibility matrix (simple heuristic)
const COLOR_PAIRS: Record<string, string[]> = {
  black: ['white', 'gray', 'navy', 'red', 'gold'],
  white: ['black', 'navy', 'gray', 'pink', 'gold'],
  navy: ['white', 'gray', 'gold', 'red', 'beige'],
  gray: ['black', 'white', 'navy', 'pink', 'purple'],
  red: ['black', 'white', 'gold', 'gray'],
  blue: ['white', 'gray', 'gold', 'navy'],
  green: ['white', 'gray', 'gold', 'beige'],
  pink: ['white', 'gray', 'navy', 'black'],
  gold: ['black', 'white', 'navy', 'burgundy'],
  brown: ['white', 'gold', 'cream', 'navy'],
};

interface Garment {
  id: string;
  category: string;
  primary_color?: string;
  color?: string;
  style?: string;
  season?: string;
}

function getCompatibleColors(color: string): string[] {
  return COLOR_PAIRS[color.toLowerCase()] || [];
}

function getOutfitScore(garments: Garment[]): number {
  let score = 0;

  // Check color compatibility
  const colors = garments
    .map(g => (g.primary_color || g.color || 'unknown').toLowerCase())
    .filter(c => c !== 'unknown');

  if (colors.length >= 2) {
    const compatible = getCompatibleColors(colors[0]);
    const matchCount = colors.slice(1).filter(c => compatible.includes(c)).length;
    score += matchCount * 20;
  }

  // Variety bonus (different categories)
  const categories = new Set(garments.map(g => g.category.toLowerCase()));
  score += Math.min(categories.size - 1, 2) * 15;

  // Style consistency bonus
  const styles = garments.map(g => (g.style || '').toLowerCase()).filter(s => s);
  if (styles.length > 0) {
    const firstStyle = styles[0];
    const sameStyleCount = styles.filter(s => s === firstStyle).length;
    if (sameStyleCount === styles.length) score += 10;
  }

  return score;
}

function generateOutfitSuggestions(garments: Garment[], count: number = 3): Array<{ id: string; name: string; garment_ids: string[]; score: number }> {
  const suggestions: Array<{ id: string; name: string; garment_ids: string[]; score: number }> = [];

  // Generate combinations
  for (let i = 0; i < garments.length && suggestions.length < count; i++) {
    const base = garments[i];
    const compatible: Garment[] = [base];

    // Find compatible pieces
    for (let j = 0; j < garments.length && compatible.length < 3; j++) {
      if (i === j) continue;
      const piece = garments[j];

      // Must be different category
      if (piece.category === base.category) continue;

      // Color check
      const baseColor = (base.primary_color || base.color || 'unknown').toLowerCase();
      const pieceColor = (piece.primary_color || piece.color || 'unknown').toLowerCase();

      if (pieceColor === 'unknown' || getCompatibleColors(baseColor).includes(pieceColor)) {
        compatible.push(piece);
      }
    }

    if (compatible.length >= 2) {
      const score = getOutfitScore(compatible);
      const garmentsStr = compatible.map(g => g.category).join(' + ');

      suggestions.push({
        id: `outfit-${i}-${Date.now()}`,
        name: `${garmentsStr}`,
        garment_ids: compatible.map(g => g.id),
        score,
      });
    }
  }

  // Sort by score and return top suggestions
  return suggestions.sort((a, b) => b.score - a.score).slice(0, count);
}

export async function GET(request: NextRequest) {
  try {
    const count = parseInt(request.nextUrl.searchParams.get('count') || '3');
    const categoryFilter = request.nextUrl.searchParams.get('category');

    let garments: any[] = [];

    // Try Supabase first
    if (supabase) {
      try {
        let query = supabase
          .from('garments')
          .select('id, category, primary_color, color, style, season')
          .eq('analysis_status', 'completed');

        if (categoryFilter) {
          query = query.ilike('category', `%${categoryFilter}%`);
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
      const allGarments = await getGarmentsFromFile('garments-catalog.json');
      garments = allGarments.map((g: any) => ({
        id: g.id,
        category: g.category,
        primary_color: g.primary_color,
        color: g.color,
        style: g.style,
        season: g.season,
      }));

      if (categoryFilter) {
        garments = garments.filter((g: any) =>
          g.category?.toLowerCase().includes(categoryFilter.toLowerCase())
        );
      }
    }

    if (!garments || garments.length < 2) {
      return NextResponse.json({
        suggestions: [],
        message: 'Not enough garments to generate suggestions'
      });
    }

    const suggestions = generateOutfitSuggestions(garments, Math.min(count, 5));

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error('Suggestion error:', error);
    return NextResponse.json({ error: error.message, suggestions: [] }, { status: 500 });
  }
}
