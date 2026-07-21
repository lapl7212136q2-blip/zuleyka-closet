'use client';

import { useState, useEffect } from 'react';
import GarmentCard from '@/components/GarmentCard';
import GarmentModal from '@/components/GarmentModal';
import { Garment, fetchGarments, getFavs, toggleFav } from '@/lib/closet';

export default function FavoritesPage() {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Garment | null>(null);

  useEffect(() => {
    setFavs(getFavs());
    fetchGarments()
      .then(setGarments)
      .finally(() => setLoading(false));
  }, []);

  const favorites = garments.filter((g) => favs.has(g.id));
  const handleFav = (id: string) => setFavs(new Set(toggleFav(id)));

  return (
    <>
      <div className="page-head">
        <h1>
          Tus <em>favoritas</em>
        </h1>
        <p>Las prendas que más amas, en un solo lugar.</p>
      </div>

      {loading ? (
        <div className="garment-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="skeleton" key={i} />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <div className="empty-note">
          <h2>Aún no tienes favoritas</h2>
          <p>Toca el corazón de una prenda en tu clóset para guardarla aquí.</p>
        </div>
      ) : (
        <div className="garment-grid">
          {favorites.map((g, i) => (
            <GarmentCard
              key={g.id}
              garment={g}
              index={i}
              favorited={favs.has(g.id)}
              onToggleFav={handleFav}
              onOpen={setSelected}
            />
          ))}
        </div>
      )}

      {selected && (
        <GarmentModal
          key={selected.id}
          garment={selected}
          siblings={favorites}
          onNavigate={setSelected}
          favorited={favs.has(selected.id)}
          onToggleFav={handleFav}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
