'use client';

import {
  Garment,
  garmentImage,
  garmentName,
  colorLabel,
  swatchStyle,
  CATEGORY_LABELS,
} from '@/lib/closet';

interface Props {
  garment: Garment;
  index?: number;
  favorited: boolean;
  onToggleFav: (id: string) => void;
  onOpen: (g: Garment) => void;
}

export default function GarmentCard({ garment, index = 0, favorited, onToggleFav, onOpen }: Props) {
  const img = garmentImage(garment);

  return (
    <article
      className="g-card"
      style={{ animationDelay: `${Math.min(index * 45, 400)}ms` }}
      onClick={() => onOpen(garment)}
    >
      <button
        className={`heart-btn ${favorited ? 'on' : ''}`}
        aria-label={favorited ? 'Quitar de favoritas' : 'Agregar a favoritas'}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFav(garment.id);
        }}
      >
        <svg viewBox="0 0 24 24" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
          <path d="M12 20s-7.5-4.6-9.3-9.2C1.5 7.6 3.6 4.5 6.8 4.5c2 0 3.6 1.1 5.2 3 1.6-1.9 3.2-3 5.2-3 3.2 0 5.3 3.1 4.1 6.3C19.5 15.4 12 20 12 20Z" />
        </svg>
      </button>

      <div className="g-card__stage">
        {img && <img src={img} alt={garmentName(garment)} loading="lazy" />}
      </div>

      <div className="g-card__body">
        <h3 className="g-card__name">{garmentName(garment)}</h3>
        <div className="g-card__meta">
          <span className="dot" style={swatchStyle(garment)} />
          {colorLabel(garment)} · {CATEGORY_LABELS[garment.category] || garment.category}
        </div>
      </div>
    </article>
  );
}
