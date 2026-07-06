'use client';

import { useState } from 'react';

interface OutfitSuggestion {
  id: string;
  name: string;
  garment_ids: string[];
  score: number;
}

interface OutfitSuggesterProps {
  onSaveOutfit?: (outfit: { name: string; garment_ids: string[] }) => void;
}

export default function OutfitSuggester({ onSaveOutfit }: OutfitSuggesterProps) {
  const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateSuggestions = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/suggest-outfits?count=3');
      if (!res.ok) throw new Error('Error generating suggestions');

      const data = await res.json();
      setSuggestions(data.suggestions || []);

      if (data.suggestions.length === 0) {
        setError('Need at least 2 garments to generate outfit suggestions');
      }
    } catch (err: any) {
      setError(err.message || 'Error generating suggestions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f9f9f9', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>✨ AI Outfit Suggester</h3>
        <button
          onClick={handleGenerateSuggestions}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            background: '#0066cc',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Generating...' : '🎨 Generate Suggestions'}
        </button>
      </div>

      {error && (
        <div style={{
          color: '#d63031',
          padding: '0.75rem',
          background: '#ffe0e0',
          borderRadius: '4px',
          marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      {suggestions.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
          {suggestions.map((outfit) => (
            <div
              key={outfit.id}
              style={{
                padding: '1rem',
                background: '#fff',
                borderRadius: '6px',
                border: '1px solid #ddd',
              }}
            >
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{outfit.name}</div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  ⭐ Score: {outfit.score}
                </div>
              </div>

              <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                {outfit.garment_ids.length} prendas
              </div>

              <button
                onClick={() => {
                  onSaveOutfit?.({
                    name: outfit.name,
                    garment_ids: outfit.garment_ids,
                  });
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: '#0066cc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                💾 Save Outfit
              </button>
            </div>
          ))}
        </div>
      )}

      {suggestions.length === 0 && !loading && !error && (
        <p style={{ color: '#999', textAlign: 'center', paddingTop: '1rem' }}>
          Click to generate outfit suggestions based on your wardrobe
        </p>
      )}
    </div>
  );
}
