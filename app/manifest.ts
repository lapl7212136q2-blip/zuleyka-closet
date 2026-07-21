import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zuleyka's Closet",
    short_name: "Zuleyka's",
    description: 'Tu armario digital: prendas, looks y sugerencias según el clima',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f6f1e8',
    theme_color: '#f6f1e8',
    lang: 'es',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
