'use client';

import { useState, useEffect } from 'react';
import GarmentCard from '@/components/GarmentCard';
import FilterPanel from '@/components/FilterPanel';

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

export default function Home() {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    color: '',
    style: '',
    season: '',
  });

  useEffect(() => {
    fetchGarments();
  }, [filters]);

  const fetchGarments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.color) params.append('color', filters.color);
      if (filters.style) params.append('style', filters.style);
      if (filters.season) params.append('season', filters.season);

      const res = await fetch(`/api/garments?${params.toString()}`);
      if (!res.ok) throw new Error('Error fetching garments');

      const data = await res.json();
      setGarments(data.garments || []);
      setError(null);
    } catch (err) {
      setError('No se pudieron cargar las prendas. ¿Ejecutaste el análisis?');
      setGarments([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <header className="header">
        <div className="container">
          <h1>✨ Clóset de Zuleyka</h1>
          <p>Tu asistente personal de moda con IA</p>
        </div>
      </header>

      <div className="container">
        <FilterPanel filters={filters} setFilters={setFilters} />

        {error && <div className="error">{error}</div>}

        {loading && <div className="loading">Cargando prendas...</div>}

        {!loading && garments.length === 0 && (
          <div className="empty-state">
            <h2>Sin prendas aún</h2>
            <p>Ejecuta el análisis para escanear tus fotos:</p>
            <pre style={{ marginTop: '1rem', background: '#f5f5f5', padding: '1rem', borderRadius: '6px' }}>
              python3 scripts/analyze.py --batch data/catalog.json
            </pre>
          </div>
        )}

        {!loading && garments.length > 0 && (
          <>
            <p style={{ marginBottom: '1rem', color: '#666' }}>
              {garments.length} prendas encontradas
            </p>
            <div className="garments-grid">
              {garments.map((garment) => (
                <GarmentCard key={garment.id} garment={garment} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
