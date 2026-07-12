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
import Rotation360 from './Rotation360';

interface Props {
  garment: Garment;
  favorited: boolean;
  onToggleFav: (id: string) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

type ViewMode = 'cutout' | 'photo' | '360';

export default function GarmentModal({ garment, favorited, onToggleFav, onClose, onDelete }: Props) {
  const cutout = garment.cutout_path;
  const photo = garment.image_path || garment.photo_url;
  const [mode, setMode] = useState<ViewMode>(cutout ? 'cutout' : 'photo');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const img = mode === 'photo' ? photo : cutout || photo;

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
          {mode === '360' ? (
            <Rotation360 angles={garment.angles} fallbackImage={cutout || photo} alt={garmentName(garment)} />
          ) : (
            img && <img src={img} alt={garmentName(garment)} />
          )}
          <button className="x-btn" onClick={onClose} aria-label="Cerrar">✕</button>
          <div className="view-toggle">
            {cutout && photo && (
              <button className={mode === 'cutout' ? 'active' : ''} onClick={() => setMode('cutout')}>
                Recorte
              </button>
            )}
            {cutout && photo && (
              <button className={mode === 'photo' ? 'active' : ''} onClick={() => setMode('photo')}>
                Foto
              </button>
            )}
            <button className={mode === '360' ? 'active' : ''} onClick={() => setMode('360')}>
              360°
            </button>
          </div>
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
          {onDelete && (
            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {confirmDelete ? (
                <>
                  <span style={{ fontSize: '0.9rem' }}>¿Quitar esta prenda de tu clóset?</span>
                  <button className="btn btn--danger" onClick={() => onDelete(garment.id)}>
                    Sí, quitar
                  </button>
                  <button className="btn btn--ghost" onClick={() => setConfirmDelete(false)}>
                    Cancelar
                  </button>
                </>
              ) : (
                <button className="btn btn--ghost btn--danger-ghost" onClick={() => setConfirmDelete(true)}>
                  🗑 Eliminar prenda
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
