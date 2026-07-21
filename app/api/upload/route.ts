import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const ROOT = process.cwd();
const TMP_DIR = path.join(ROOT, '.tmp-uploads');
const CATALOG_PATH = path.join(ROOT, 'data', 'garments-catalog.json');
const PYTHON = process.platform === 'win32'
  ? path.join(ROOT, 'venv', 'Scripts', 'python.exe')
  : path.join(ROOT, 'venv', 'bin', 'python');
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
  // Sin UPLOAD_TOKEN en el .env el endpoint queda abierto (uso local / LAN).
  const expected = process.env.UPLOAD_TOKEN;
  if (expected && request.headers.get('x-upload-token') !== expected) {
    return NextResponse.json({ error: 'Token de subida inválido' }, { status: 401 });
  }

  const tempPaths: string[] = [];
  try {
    const formData = await request.formData();
    const files = formData.getAll('file').filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: 'Falta la foto' }, { status: 400 });
    }

    // Vacio o "auto" = dejar que scripts/import_photos.py lo adivine por heuristica local.
    const name = ((formData.get('name') as string) || '').trim();
    const category = (formData.get('category') as string) || '';
    const color = (formData.get('color') as string) || '';
    const style = (formData.get('style') as string) || '';
    const season = (formData.get('season') as string) || '';
    // Una marca de foco por foto, en el mismo orden ('-' = sin marca).
    const focusX = formData.getAll('focusX').map(String);
    const focusY = formData.getAll('focusY').map(String);

    await fs.mkdir(TMP_DIR, { recursive: true });
    for (const file of files) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const dest = path.join(TMP_DIR, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`);
      await fs.writeFile(dest, Buffer.from(await file.arrayBuffer()));
      tempPaths.push(dest);
    }

    const raw = await fs.readFile(CATALOG_PATH, 'utf8');
    const existingIds = new Set(JSON.parse(raw).map((g: any) => g.id));
    const base = slugify(name || files[0].name.split('.')[0]);
    let slug = base;
    let n = 2;
    while (existingIds.has(`dl-${slug}`)) {
      slug = `${base}_${n}`;
      n += 1;
    }

    const scriptArgs = [SCRIPT, ...tempPaths, '--slug', slug];
    if (name) scriptArgs.push('--name', name);
    if (category) scriptArgs.push('--category', category);
    if (color) scriptArgs.push('--color', color);
    if (style) scriptArgs.push('--style', style);
    if (season) scriptArgs.push('--season', season);
    files.forEach((_, i) => {
      const hasFocus = focusX[i] && focusY[i] && focusX[i] !== '-';
      scriptArgs.push('--focus', hasFocus ? `${focusX[i]},${focusY[i]}` : '-');
    });

    const { stdout } = await execFileAsync(
      PYTHON,
      scriptArgs,
      { cwd: ROOT, timeout: 120000 * files.length }
    );

    const garment = JSON.parse(stdout.trim());
    return NextResponse.json({ success: true, garment });
  } catch (error: any) {
    const message = error.stderr?.toString().trim() || error.message || 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    tempPaths.forEach((p) => fs.unlink(p).catch(() => {}));
  }
}
