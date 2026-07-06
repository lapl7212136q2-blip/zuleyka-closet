'use client';

import { useState } from 'react';
import {
  Garment,
  garmentName,
  colorLabel,
  swatchStyle,
  CATEGORY_LABELS,
  SEASON_LABELS,
  STYLE_LABELS,
} from '@/lib/closet';

interface Props {
  garment: Garment;
  favorited: boolean;
  onToggleFav: (id: string) => void;
  onClose: () => void;
}

export default function GarmentModal({ garment, favorited, onToggleFav, onClose }: Props) {
  const [showPhoto, setShowPhoto] = useState(false);
  const cutout = garment.cutout_path;
  const photo = garment.image_path || garment.photo_url;
  const img = showPhoto ? photo : cutout || photo;

  const specs: Array<[string, React.ReactNode]> = [
    ['Categoría', CATEGORY_LABELS[garment.category] || garment.category],
    [
      'Color',
      <span key="c" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className="dot" style={swatchStyle(garment)} /> {colorLabel(garment)}
      </span>,
    ],
    ['Estilo', STYLE_LABELS[garment.style || ''] || garment.style || '—'],
    ['Temporada', SEASON_LABELS[garment.season || ''] || garment.season || '—'],
  ];
  if (garment.material) specs.push(['Material', garment.material]);
  if (garment.pattern && garment.pattern !== 'solid') specs.push(['Patrón', garment.pattern]);

  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__stage">
          {img && <img src={img} alt={garmentName(garment)} />}
          <button className="x-btn" onClick={onClose} aria-label="Cerrar">✕</button>
          {cutout && photo && (
            <button className="photo-toggle" onClick={() => setShowPhoto(!showPhoto)}>
              {showPhoto ? 'Ver recorte' : 'Ver foto original'}
            </button>
          )}
        </div>
        <div className="modal-card__body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <h2>{garmentName(garment)}</h2>
            <button
              className={`heart-btn ${favorited ? 'on' : ''}`}
              style={{ position: 'static', flexShrink: 0 }}
              onClick={() => onToggleFav(garment.id)}
              aria-label="Favorita"
            >
              <svg viewBox="0 0 24 24" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                <path d="M12 20s-7.5-4.6-9.3-9.2C1.5 7.6 3.6 4.5 6.8 4.5c2 0 3.6 1.1 5.2 3 1.6-1.9 3.2-3 5.2-3 3.2 0 5.3 3.1 4.1 6.3C19.5 15.4 12 20 12 20Z" />
              </svg>
            </button>
          </div>
          <dl style={{ marginTop: '1rem' }}>
            {specs.map(([label, value]) => (
              <div className="spec-row" key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
