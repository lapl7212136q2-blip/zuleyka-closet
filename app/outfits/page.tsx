'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Garment,
  fetchGarments,
  garmentImage,
  garmentName,
  getLooks,
  saveLook,
  deleteLook,
  SavedLook,
} from '@/lib/closet';

interface Suggestion {
  id: string;
  name: string;
  garment_ids: string[];
  score: number;
}

export default function LooksPage() {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [looks, setLooks] = useState<SavedLook[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLooks(getLooks());
    fetchGarments().then(setGarments).catch(() => {});
  }, []);

  const byId = useMemo(() => new Map(garments.map((g) => [g.id, g])), [garments]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/suggest-outfits?count=4');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch {
      setError('No se pudieron generar sugerencias.');
    } finally {
      setGenerating(false);
    }
  };

  const looksRow = (ids: string[]) =>
    ids
      .map((id) => byId.get(id))
      .filter((g): g is Garment => Boolean(g))
      .map((g) => {
        const img = garmentImage(g);
        return img ? <img key={g.id} src={img} alt={garmentName(g)} /> : null;
      });

  const nameOf = (ids: string[]) =>
    ids
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((g) => garmentName(g as Garment))
      .join(' + ');

  return (
    <>
      <div className="page-head">
        <h1>
          Combina tu <em>armario</em>
        </h1>
        <p>Sugerencias generadas con lo que ya tienes — y tus looks guardados.</p>
      </div>

      <button className="btn btn--primary" onClick={generate} disabled={generating}>
        {generating ? 'Combinando…' : '✦ Sugerir looks'}
      </button>

      {error && <div className="error-note">{error}</div>}

      {suggestions.length > 0 && (
        <>
          <p className="count-note">Propuestas</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '1.1rem',
            }}
          >
            {suggestions.map((s, i) => (
              <div className="look-card" key={s.id} style={{ animationDelay: `${i * 70}ms` }}>
                <div className="look-card__row">{looksRow(s.garment_ids)}</div>
                <div className="look-card__body">
                  <h3>{nameOf(s.garment_ids) || s.name}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.7rem' }}>
                    <span className="tag">match {s.score}</span>
                    <button
                      className="btn btn--ghost"
                      style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                      onClick={() => {
                        setLooks(saveLook({ name: nameOf(s.garment_ids) || s.name, garment_ids: s.garment_ids }));
                      }}
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="count-note">Tus looks guardados</p>
      {looks.length === 0 ? (
        <div className="empty-note">
          <h2>Aún no guardas looks</h2>
          <p>Genera sugerencias o guarda el look del día desde «Hoy».</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '1.1rem',
          }}
        >
          {looks.map((l) => (
            <div className="look-card" key={l.id}>
              <div className="look-card__row">{looksRow(l.garment_ids)}</div>
              <div className="look-card__body">
                <h3>{l.name}</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.7rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--ink-faint)', fontWeight: 700 }}>
                    {new Date(l.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </span>
                  <button
                    className="btn btn--ghost"
                    style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                    onClick={() => setLooks(deleteLook(l.id))}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
