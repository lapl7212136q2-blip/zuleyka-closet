'use client';

import { useState, useEffect, useMemo } from 'react';
import GarmentCard from '@/components/GarmentCard';
import GarmentModal from '@/components/GarmentModal';
import {
  Garment,
  fetchGarments,
  getFavs,
  toggleFav,
  CATEGORY_PLURAL,
  SEASON_LABELS,
} from '@/lib/closet';

const CATEGORY_ORDER = ['dress', 'top', 'bottom', 'outerwear', 'outfit'];
const SEASON_ORDER = ['spring', 'summer', 'fall', 'winter'];

export default function ClosetPage() {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState<string | null>(null);
  const [season, setSeason] = useState<string | null>(null);
  const [selected, setSelected] = useState<Garment | null>(null);

  useEffect(() => {
    setFavs(getFavs());
    fetchGarments()
      .then(setGarments)
      .catch(() => setError('No se pudieron cargar las prendas.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      garments.filter((g) => {
        if (category && g.category !== category) return false;
        if (season && g.season !== season && g.season !== 'all') return false;
        return true;
      }),
    [garments, category, season]
  );

  const categories = useMemo(() => {
    const present = new Set(garments.map((g) => g.category));
    return CATEGORY_ORDER.filter((c) => present.has(c));
  }, [garments]);

  const handleFav = (id: string) => setFavs(new Set(toggleFav(id)));

  return (
    <>
      <div className="page-head">
        <h1>
          Tu clóset, <em>curado</em>.
        </h1>
        <p>Cada prenda de tu armario, lista para combinarse.</p>
      </div>

      <div className="chip-row">
        <button className={`chip ${!category ? 'active' : ''}`} onClick={() => setCategory(null)}>
          Todo
        </button>
        {categories.map((c) => (
          <button
            key={c}
            className={`chip ${category === c ? 'active' : ''}`}
            onClick={() => setCategory(category === c ? null : c)}
          >
            {CATEGORY_PLURAL[c] || c}
          </button>
        ))}
      </div>
      <div className="chip-row">
        {SEASON_ORDER.map((s) => (
          <button
            key={s}
            className={`chip chip--accent ${season === s ? 'active' : ''}`}
            onClick={() => setSeason(season === s ? null : s)}
          >
            {SEASON_LABELS[s]}
          </button>
        ))}
      </div>

      {error && <div className="error-note">{error}</div>}

      {loading ? (
        <div className="garment-grid" style={{ marginTop: '1.5rem' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div className="skeleton" key={i} />
          ))}
        </div>
      ) : (
        <>
          <p className="count-note">
            {filtered.length} {filtered.length === 1 ? 'prenda' : 'prendas'}
          </p>
          {filtered.length === 0 ? (
            <div className="empty-note">
              <h2>Nada por aquí</h2>
              <p>Prueba con otros filtros.</p>
            </div>
          ) : (
            <div className="garment-grid">
              {filtered.map((g, i) => (
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
        </>
      )}

      {selected && (
        <GarmentModal
          garment={selected}
          favorited={favs.has(selected.id)}
          onToggleFav={handleFav}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
