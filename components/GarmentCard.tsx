import { useState } from 'react';
import Image from 'next/image';

interface Garment {
  id: string;
  garment_type: string;
  color: string;
  pattern: string;
  style: string;
  season: string;
  confidence: number;
  photo_url?: string;
  photo_drive_id?: string;
}

const GARMENT_EMOJIS: Record<string, string> = {
  vestido: '👗',
  pantalon: '👖',
  blusa: '👕',
  falda: '🧥',
  chaqueta: '🧥',
  suéter: '🧶',
  abrigo: '🧥',
  zapatos: '👠',
  bolso: '👜',
  accesorios: '✨',
};

const SEASON_COLORS: Record<string, string> = {
  primavera: '#FFB6C1',
  verano: '#FFD700',
  otono: '#FF8C00',
  invierno: '#87CEEB',
};

export default function GarmentCard({ garment }: { garment: Garment }) {
  const [isFavorited, setIsFavorited] = useState(false);

  const emoji = GARMENT_EMOJIS[garment.garment_type.toLowerCase()] || '👕';
  const seasonColor = SEASON_COLORS[garment.season.toLowerCase()] || '#ccc';

  return (
    <div className="garment-card">
      <div className="garment-image" style={{ background: garment.photo_url ? '#fff' : seasonColor }}>
        {garment.photo_url ? (
          <img src={garment.photo_url} alt={garment.garment_type} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span>{emoji}</span>
        )}
      </div>
      <div className="garment-info">
        <div className="garment-type">{garment.garment_type}</div>
        <div className="garment-details">
          <div className="garment-detail">
            <strong>Color:</strong>
            <span className="color-swatch" style={{ backgroundColor: garment.color || '#ccc' }} />
            {garment.color}
          </div>
          <div className="garment-detail">
            <strong>Patrón:</strong>
            <span>{garment.pattern}</span>
          </div>
          <div className="garment-detail">
            <strong>Estilo:</strong>
            <span>{garment.style}</span>
          </div>
          <div className="garment-detail">
            <strong>Estación:</strong>
            <span>{garment.season}</span>
          </div>
          <div className="garment-detail">
            <strong>Confianza:</strong>
            <span>{(garment.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>
        <button
          className={`favorite-btn ${isFavorited ? 'favorited' : ''}`}
          onClick={() => setIsFavorited(!isFavorited)}
        >
          {isFavorited ? '❤️ Favorita' : '🤍 Agregar a favoritas'}
        </button>
      </div>
    </div>
  );
}
