import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';

// `next start` congela la lista de public/ en el build, asi que las fotos que
// entran por /api/upload dan 404 hasta reiniciar el servicio. Este handler las
// sirve desde disco: para las que ya existian en el build ni se ejecuta (el
// estatico gana), y para las nuevas evita tener que reiniciar nada.
const PHOTOS = path.join(process.cwd(), 'public', 'photos');

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif',
};

export async function GET(_request: NextRequest, { params }: { params: { path: string[] } }) {
  const file = path.join(PHOTOS, ...params.path);
  if (!file.startsWith(PHOTOS + path.sep)) {
    return new NextResponse('No encontrado', { status: 404 });
  }

  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type) return new NextResponse('No encontrado', { status: 404 });

  try {
    const { size } = await fs.stat(file);
    return new NextResponse(createReadStream(file) as any, {
      headers: {
        'content-type': type,
        'content-length': String(size),
        'cache-control': 'public, max-age=3600',
      },
    });
  } catch {
    return new NextResponse('No encontrado', { status: 404 });
  }
}
