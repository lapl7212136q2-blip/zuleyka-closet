'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import GarmentCard from '@/components/GarmentCard';

interface Favorite {
  id: string;
  garment_id: string;
  created_at: string;
}

interface Garment {
  id: string;
  category: string;
  color: string;
  primary_color: string;
  pattern: string;
  style: string;
  season: string;
  image_path?: string;
  photo_url?: string;
}

const DEMO_USER_ID = 'user-123';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/favorites?user_id=${DEMO_USER_ID}`);
      if (!res.ok) throw new Error('Error fetching favorites');

      const data = await res.json();
      const favIds = data.favorites?.map((f: Favorite) => f.garment_id) || [];

      if (favIds.length === 0) {
        setFavorites([]);
        return;
      }

      // Fetch full garment details for each favorite
      const garmentsRes = await fetch(`/api/garments`);
      const garmentsData = await garmentsRes.json();
      const garmentMap = new Map(garmentsData.garments.map((g: Garment) => [g.id, g]));

      const favGarments = favIds
        .map((id: string) => garmentMap.get(id))
        .filter((g: Garment | undefined): g is Garment => g !== undefined);

      setFavorites(favGarments);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error loading favorites');
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <header className="header">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>❤️ Mis Favoritas</h1>
              <p>Tus prendas favoritas</p>
            </div>
            <nav style={{ display: 'flex', gap: '1rem' }}>
              <Link href="/" style={{ padding: '0.5rem 1rem', background: '#fff', borderRadius: '6px', textDecoration: 'none', color: '#333' }}>
                🏠 Inicio
              </Link>
              <Link href="/favorites" style={{ padding: '0.5rem 1rem', background: '#ffe0e0', borderRadius: '6px', textDecoration: 'none', color: '#d63031' }}>
                ❤️ Favoritos
              </Link>
              <Link href="/outfits" style={{ padding: '0.5rem 1rem', background: '#e0f0ff', borderRadius: '6px', textDecoration: 'none', color: '#0066cc' }}>
                👗 Outfits
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="container">
        {error && <div className="error">{error}</div>}

        {loading && <div className="loading">Cargando favoritas...</div>}

        {!loading && favorites.length === 0 && (
          <div className="empty-state">
            <h2>Sin favoritas aún</h2>
            <p>Agrega prendas a favoritas desde el clóset</p>
            <Link href="/" style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#333', color: '#fff', textDecoration: 'none', borderRadius: '6px', display: 'inline-block' }}>
              ← Volver al clóset
            </Link>
          </div>
        )}

        {!loading && favorites.length > 0 && (
          <>
            <p style={{ marginBottom: '1rem', color: '#666' }}>
              {favorites.length} prenda(s) en favoritas
            </p>
            <div className="garments-grid">
              {favorites.map((garment) => (
                <GarmentCard
                  key={garment.id}
                  garment={garment}
                  userId={DEMO_USER_ID}
                  isFavorited={true}
                  onFavoriteChange={(fav) => {
                    if (!fav) {
                      setFavorites(favorites.filter(g => g.id !== garment.id));
                    }
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
