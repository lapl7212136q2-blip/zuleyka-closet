// Tipos y utilidades compartidas del clóset (cliente)

import type { CSSProperties } from 'react';

export interface Garment {
  id: string;
  name?: string;
  category: string;
  primary_color?: string;
  color?: string;
  pattern?: string;
  style?: string;
  season?: string;
  material?: string;
  image_path?: string;
  cutout_path?: string;
  photo_url?: string;
  /** Fotos de la prenda en distintos ángulos (fondo blanco), en orden de giro. Aún no hay ninguna cargada. */
  angles?: string[];
}

export const CATEGORY_LABELS: Record<string, string> = {
  top: 'Top',
  bottom: 'Bajo',
  dress: 'Vestido',
  outerwear: 'Abrigo',
  outfit: 'Conjunto',
};

export const CATEGORY_PLURAL: Record<string, string> = {
  top: 'Tops',
  bottom: 'Bajos',
  dress: 'Vestidos',
  outerwear: 'Abrigos',
  outfit: 'Conjuntos',
};

export const SEASON_LABELS: Record<string, string> = {
  spring: 'Primavera',
  summer: 'Verano',
  fall: 'Otoño',
  winter: 'Invierno',
  all: 'Todo el año',
  'all-season': 'Todo el año',
};

export const STYLE_LABELS: Record<string, string> = {
  casual: 'Casual',
  elegant: 'Elegante',
  formal: 'Formal',
  sporty: 'Deportivo',
};

export const COLOR_LABELS: Record<string, string> = {
  black: 'Negro',
  white: 'Blanco',
  brown: 'Café',
  burgundy: 'Guinda',
  gold: 'Dorado',
  green: 'Verde',
  mint: 'Menta',
  multicolor: 'Multicolor',
  olive: 'Oliva',
  orange: 'Naranja',
  red: 'Rojo',
  yellow: 'Amarillo',
  blue: 'Azul',
  pink: 'Rosa',
  gray: 'Gris',
};

export const COLOR_HEX: Record<string, string> = {
  black: '#1f1b16',
  white: '#f5f1ea',
  brown: '#8b5a3c',
  burgundy: '#7a2f3d',
  gold: '#c9a24b',
  green: '#2e7d5b',
  mint: '#a8d8c8',
  olive: '#7a7a45',
  orange: '#d97434',
  red: '#c03028',
  yellow: '#e5b93c',
  blue: '#3a5da8',
  pink: '#d98aa8',
  gray: '#9a938a',
};

export function garmentImage(g: Garment): string | undefined {
  return g.cutout_path || g.image_path || g.photo_url;
}

export function garmentName(g: Garment): string {
  return g.name || CATEGORY_LABELS[g.category] || g.category;
}

export function colorLabel(g: Garment): string {
  const c = (g.primary_color || g.color || '').toLowerCase();
  return COLOR_LABELS[c] || c;
}

export function swatchStyle(g: Garment): CSSProperties {
  const c = (g.primary_color || g.color || '').toLowerCase();
  if (c === 'multicolor')
    return { background: 'conic-gradient(from 0deg, #c03028, #e5b93c, #2e7d5b, #3a5da8, #c03028)' };
  return { background: COLOR_HEX[c] || '#ccc' };
}

export async function fetchGarments(includeHidden = false): Promise<Garment[]> {
  const res = await fetch('/api/garments');
  if (!res.ok) throw new Error('No se pudieron cargar las prendas');
  const data = await res.json();
  const garments: Garment[] = data.garments || [];
  if (includeHidden) return garments;
  const hidden = getHidden();
  return garments.filter((g) => !hidden.has(g.id));
}

// ---------- prendas eliminadas/ocultas (localStorage) ----------

const HIDDEN_KEY = 'zk-hidden';

export function getHidden(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

export function hideGarment(id: string): Set<string> {
  const hidden = getHidden();
  hidden.add(id);
  localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden]));
  return hidden;
}

export function unhideGarment(id: string): Set<string> {
  const hidden = getHidden();
  hidden.delete(id);
  localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden]));
  return hidden;
}

// ---------- favoritas (localStorage) ----------

const FAV_KEY = 'zk-favs';

export function getFavs(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

export function toggleFav(id: string): Set<string> {
  const favs = getFavs();
  if (favs.has(id)) favs.delete(id);
  else favs.add(id);
  localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
  return favs;
}

// ---------- looks guardados (localStorage) ----------

export interface SavedLook {
  id: string;
  name: string;
  garment_ids: string[];
  occasion?: string;
  created_at: string;
}

const LOOKS_KEY = 'zk-looks';

export function getLooks(): SavedLook[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LOOKS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveLook(look: Omit<SavedLook, 'id' | 'created_at'>): SavedLook[] {
  const looks = getLooks();
  looks.unshift({
    ...look,
    id: `look-${Date.now()}`,
    created_at: new Date().toISOString(),
  });
  localStorage.setItem(LOOKS_KEY, JSON.stringify(looks));
  return looks;
}

export function deleteLook(id: string): SavedLook[] {
  const looks = getLooks().filter((l) => l.id !== id);
  localStorage.setItem(LOOKS_KEY, JSON.stringify(looks));
  return looks;
}

// ---------- calendario (localStorage) ----------

export type CalendarPlan = Record<string, string[]>; // 'YYYY-MM-DD' -> garment ids

const CAL_KEY = 'zk-calendar';

export function getPlan(): CalendarPlan {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(CAL_KEY) || '{}');
  } catch {
    return {};
  }
}

export function setDayPlan(date: string, ids: string[]): CalendarPlan {
  const plan = getPlan();
  if (ids.length === 0) delete plan[date];
  else plan[date] = ids;
  localStorage.setItem(CAL_KEY, JSON.stringify(plan));
  return plan;
}
