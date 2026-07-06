import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import catalog from '@/data/garments-catalog.json';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
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

// Composición real de outfits: vestido/conjunto (+abrigo) o top+bajo (+abrigo)
function generateOutfitSuggestions(garments: Garment[], count: number = 3): Array<{ id: string; name: string; garment_ids: string[]; score: number }> {
  const byCat = (c: string) => garments.filter(g => g.category === c);
  const colorOf = (g: Garment) => (g.primary_color || g.color || 'unknown').toLowerCase();
  const compatible = (a: Garment, b: Garment) => {
    const ca = colorOf(a), cb = colorOf(b);
    if (ca === 'unknown' || cb === 'unknown') return true;
    if (ca === 'multicolor' || cb === 'multicolor') return true;
    if (ca === cb) return true;
    return getCompatibleColors(ca).includes(cb) || getCompatibleColors(cb).includes(ca);
  };

  const candidates: Garment[][] = [];
  for (const base of [...byCat('dress'), ...byCat('outfit')]) {
    candidates.push([base]);
    for (const outer of byCat('outerwear')) {
      if (compatible(base, outer)) candidates.push([base, outer]);
    }
  }
  for (const top of byCat('top')) {
    for (const bottom of byCat('bottom')) {
      if (!compatible(top, bottom)) continue;
      candidates.push([top, bottom]);
      for (const outer of byCat('outerwear')) {
        if (compatible(top, outer)) candidates.push([top, bottom, outer]);
      }
    }
  }

  const scored = candidates.map((pieces, i) => ({
    id: `outfit-${i}-${Date.now()}`,
    name: pieces.map(g => g.category).join(' + '),
    garment_ids: pieces.map(g => g.id),
    score: getOutfitScore(pieces) + pieces.length * 5,
  }));

  // baraja y evita repetir la misma prenda base entre propuestas
  scored.sort(() => Math.random() - 0.5);
  scored.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const out: typeof scored = [];
  for (const s of scored) {
    if (seen.has(s.garment_ids[0]) && out.length < candidates.length) continue;
    seen.add(s.garment_ids[0]);
    out.push(s);
    if (out.length >= count) break;
  }
  return out;
}

export async function GET(request: NextRequest) {
  try {
    const count = parseInt(request.nextUrl.searchParams.get('count') || '3');
    const categoryFilter = request.nextUrl.searchParams.get('category');

    // El catálogo local es la fuente de verdad
    let garments: any[] = (catalog as any[]).map((g: any) => ({
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
