'use client';

import { useState, useEffect, useMemo } from 'react';
import GarmentCard from '@/components/GarmentCard';
import GarmentModal from '@/components/GarmentModal';
import PhotoUpload from '@/components/PhotoUpload';
import {
  Garment,
  fetchGarments,
  getFavs,
  toggleFav,
  getHidden,
  hideGarment,
  unhideGarment,
  garmentImage,
  garmentName,
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
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [season, setSeason] = useState<string | null>(null);
  const [selected, setSelected] = useState<Garment | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    setFavs(getFavs());
    setHidden(getHidden());
    fetchGarments(true)
      .then(setGarments)
      .catch(() => setError('No se pudieron cargar las prendas.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      garments.filter((g) => {
        if (hidden.has(g.id)) return false;
        if (category && g.category !== category) return false;
        if (season && g.season !== season && g.season !== 'all') return false;
        return true;
      }),
    [garments, hidden, category, season]
  );

  const hiddenGarments = useMemo(
    () => garments.filter((g) => hidden.has(g.id)),
    [garments, hidden]
  );

  const handleDelete = (id: string) => {
    setHidden(new Set(hideGarment(id)));
    setSelected(null);
  };

  const handleRestore = (id: string) => {
    const next = new Set(unhideGarment(id));
    setHidden(next);
    if (next.size === 0) setShowHidden(false);
  };

  const categories = useMemo(() => {
    const present = new Set(garments.map((g) => g.category));
    return CATEGORY_ORDER.filter((c) => present.has(c));
  }, [garments]);

  const handleFav = (id: string) => setFavs(new Set(toggleFav(id)));

  return (
    <>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1>Tu clóset.</h1>
          <p>Cada prenda de tu armario, lista para combinarse.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowUpload(true)}>
          + Agregar prenda
        </button>
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
        {hiddenGarments.length > 0 && (
          <button
            className={`chip ${showHidden ? 'active' : ''}`}
            onClick={() => setShowHidden(!showHidden)}
          >
            🗑 Eliminadas ({hiddenGarments.length})
          </button>
        )}
      </div>

      {showHidden && hiddenGarments.length > 0 && (
        <div style={{ margin: '1.25rem 0' }}>
          <p className="count-note">Prendas eliminadas — puedes recuperarlas:</p>
          <div className="garment-grid">
            {hiddenGarments.map((g) => (
              <article className="g-card" key={g.id} style={{ opacity: 0.75 }}>
                <div className="g-card__stage">
                  {garmentImage(g) && <img src={garmentImage(g)} alt={garmentName(g)} loading="lazy" />}
                </div>
                <div className="g-card__body">
                  <h3 className="g-card__name">{garmentName(g)}</h3>
                  <button className="btn btn--ghost" style={{ marginTop: '0.5rem' }} onClick={() => handleRestore(g.id)}>
                    ↩ Recuperar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

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
          onDelete={handleDelete}
        />
      )}

      {showUpload && (
        <div className="modal-veil" onClick={() => setShowUpload(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Agregar prenda</h2>
                <button className="x-btn" style={{ position: 'static' }} onClick={() => setShowUpload(false)} aria-label="Cerrar">✕</button>
              </div>
              <PhotoUpload
                onUploadComplete={(g) => {
                  setGarments((prev) => [g, ...prev]);
                  setShowUpload(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
