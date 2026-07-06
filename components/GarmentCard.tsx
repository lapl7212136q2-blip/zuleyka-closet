import { useState } from 'react';
import Image from 'next/image';

interface Garment {
  id: string;
  category?: string;
  garment_type?: string;
  color: string;
  primary_color?: string;
  pattern: string;
  style: string;
  season: string;
  confidence?: number;
  photo_url?: string;
  image_path?: string;
  photo_drive_id?: string;
}

interface GarmentCardProps {
  garment: Garment;
  userId?: string;
  isFavorited?: boolean;
  onFavoriteChange?: (isFavorited: boolean) => void;
}

const GARMENT_EMOJIS: Record<string, string> = {
  dress: '👗',
  vestido: '👗',
  pants: '👖',
  pantalon: '👖',
  top: '👕',
  blouse: '👕',
  blusa: '👕',
  skirt: '👗',
  falda: '👗',
  jacket: '🧥',
  chaqueta: '🧥',
  sweater: '🧶',
  suéter: '🧶',
  coat: '🧥',
  abrigo: '🧥',
  shoes: '👠',
  zapatos: '👠',
  bag: '👜',
  bolso: '👜',
  accessories: '✨',
  accesorios: '✨',
};

const SEASON_COLORS: Record<string, string> = {
  spring: '#FFB6C1',
  primavera: '#FFB6C1',
  summer: '#FFD700',
  verano: '#FFD700',
  fall: '#FF8C00',
  autumn: '#FF8C00',
  otono: '#FF8C00',
  winter: '#87CEEB',
  invierno: '#87CEEB',
};

export default function GarmentCard({
  garment,
  userId = 'user-123',
  isFavorited = false,
  onFavoriteChange
}: GarmentCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [favorited, setFavorited] = useState(isFavorited);

  const category = garment.category || garment.garment_type || 'top';
  const emoji = GARMENT_EMOJIS[category.toLowerCase()] || '👕';
  const seasonColor = SEASON_COLORS[garment.season?.toLowerCase() || 'summer'] || '#ccc';
  const photoUrl = garment.photo_url || garment.image_path;
  const colorDisplay = garment.primary_color || garment.color || 'unknown';

  const toggleFavorite = async () => {
    setIsLoading(true);
    try {
      if (favorited) {
        // Remove favorite
        const res = await fetch(`/api/favorites/${garment.id}`, { method: 'DELETE' });
        if (res.ok) {
          setFavorited(false);
          onFavoriteChange?.(false);
        }
      } else {
        // Add favorite
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ garment_id: garment.id, user_id: userId })
        });
        if (res.ok) {
          setFavorited(true);
          onFavoriteChange?.(true);
        }
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="garment-card">
      <div className="garment-image" style={{ background: photoUrl ? '#fff' : seasonColor }}>
        {photoUrl ? (
          <img src={photoUrl} alt={category} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: '3rem' }}>{emoji}</span>
        )}
      </div>
      <div className="garment-info">
        <div className="garment-type">{category.charAt(0).toUpperCase() + category.slice(1)}</div>
        <div className="garment-details">
          <div className="garment-detail">
            <strong>Color:</strong>
            <span className="color-swatch" style={{ backgroundColor: colorDisplay || '#ccc' }} />
            {colorDisplay}
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
          {garment.confidence && (
            <div className="garment-detail">
              <strong>Confianza:</strong>
              <span>{(garment.confidence * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>
        <button
          className={`favorite-btn ${favorited ? 'favorited' : ''}`}
          onClick={toggleFavorite}
          disabled={isLoading}
        >
          {favorited ? '❤️ Favorita' : '🤍 Agregar a favoritas'}
        </button>
      </div>
    </div>
  );
}
