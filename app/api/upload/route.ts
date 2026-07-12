import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const ROOT = process.cwd();
const TMP_DIR = path.join(ROOT, '.tmp-uploads');
const CATALOG_PATH = path.join(ROOT, 'data', 'garments-catalog.json');
const PYTHON = path.join(ROOT, 'venv', 'Scripts', 'python.exe');
const SCRIPT = path.join(ROOT, 'scripts', 'import_photos.py');

function slugify(name: string): string {
  const s = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return s || 'prenda';
}

export async function POST(request: NextRequest) {
  let tempPath: string | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Falta la foto' }, { status: 400 });
    }

    // Vacio o "auto" = dejar que scripts/import_photos.py lo adivine por heuristica local.
    const name = ((formData.get('name') as string) || '').trim();
    const category = (formData.get('category') as string) || '';
    const color = (formData.get('color') as string) || '';
    const style = (formData.get('style') as string) || '';
    const season = (formData.get('season') as string) || '';
    const focusX = (formData.get('focusX') as string) || '';
    const focusY = (formData.get('focusY') as string) || '';

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    await fs.mkdir(TMP_DIR, { recursive: true });
    tempPath = path.join(TMP_DIR, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`);
    await fs.writeFile(tempPath, buffer);

    const raw = await fs.readFile(CATALOG_PATH, 'utf8');
    const existingIds = new Set(JSON.parse(raw).map((g: any) => g.id));
    const base = slugify(name || file.name.split('.')[0]);
    let slug = base;
    let n = 2;
    while (existingIds.has(`dl-${slug}`)) {
      slug = `${base}_${n}`;
      n += 1;
    }

    const scriptArgs = [SCRIPT, tempPath, '--slug', slug];
    if (name) scriptArgs.push('--name', name);
    if (category) scriptArgs.push('--category', category);
    if (color) scriptArgs.push('--color', color);
    if (style) scriptArgs.push('--style', style);
    if (season) scriptArgs.push('--season', season);
    if (focusX && focusY) scriptArgs.push('--focus', `${focusX},${focusY}`);

    const { stdout } = await execFileAsync(
      PYTHON,
      scriptArgs,
      { cwd: ROOT, timeout: 120000 }
    );

    const garment = JSON.parse(stdout.trim());
    return NextResponse.json({ success: true, garment });
  } catch (error: any) {
    const message = error.stderr?.toString().trim() || error.message || 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (tempPath) {
      fs.unlink(tempPath).catch(() => {});
    }
  }
}
