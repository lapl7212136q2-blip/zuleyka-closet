'use client';

import { useEffect, useRef, useState } from 'react';
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
  /** Lista en la que vive la prenda abierta; habilita pasar a la siguiente. */
  siblings?: Garment[];
  onNavigate?: (garment: Garment) => void;
}

type ViewMode = 'cutout' | 'photo' | '360';

// Deslizar/scroll horizontal mas corto que esto es ruido, no un gesto.
const SWIPE_PX = 60;
const WHEEL_PX = 30;
const WHEEL_COOLDOWN_MS = 400;

export default function GarmentModal({
  garment, favorited, onToggleFav, onClose, onDelete, siblings, onNavigate,
}: Props) {
  const cutout = garment.cutout_path;
  const photo = garment.image_path || garment.photo_url;
  const [mode, setMode] = useState<ViewMode>(cutout ? 'cutout' : 'photo');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const img = mode === 'photo' ? photo : cutout || photo;

  // En 360 el arrastre horizontal gira la prenda, asi que ahi no navega.
  const index = siblings && onNavigate ? siblings.findIndex((g) => g.id === garment.id) : -1;
  const canGo = (dir: -1 | 1) =>
    mode !== '360' && index >= 0 && index + dir >= 0 && index + dir < (siblings?.length ?? 0);
  const go = (dir: -1 | 1) => {
    if (canGo(dir)) onNavigate!(siblings![index + dir]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const touchX = useRef<number | null>(null);
  const lastWheel = useRef(0);
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) < WHEEL_PX || Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
    if (Date.now() - lastWheel.current < WHEEL_COOLDOWN_MS) return;
    lastWheel.current = Date.now();
    go(e.deltaX > 0 ? 1 : -1);
  };

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
        <div
          className="modal-card__stage"
          onWheel={onWheel}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            const dx = touchX.current === null ? 0 : e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) >= SWIPE_PX) go(dx < 0 ? 1 : -1);
          }}
        >
          {mode === '360' ? (
            <Rotation360 angles={garment.angles} fallbackImage={cutout || photo} alt={garmentName(garment)} />
          ) : (
            img && <img src={img} alt={garmentName(garment)} />
          )}
          <button className="x-btn" onClick={onClose} aria-label="Cerrar">✕</button>
          {canGo(-1) && (
            <button className="stage-nav stage-nav--prev" onClick={() => go(-1)} aria-label="Prenda anterior">‹</button>
          )}
          {canGo(1) && (
            <button className="stage-nav stage-nav--next" onClick={() => go(1)} aria-label="Prenda siguiente">›</button>
          )}
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
