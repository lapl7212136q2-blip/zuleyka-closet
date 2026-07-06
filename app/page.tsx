'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import GarmentCard from '@/components/GarmentCard';
import FilterPanel from '@/components/FilterPanel';
import PhotoUpload from '@/components/PhotoUpload';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/lib/auth-context';

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
  const { user, loading: authLoading, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    color: '',
    style: '',
    season: '',
  });

  const userId = user?.id || 'user-123'; // Demo user if not logged in

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h1>✨ Clóset de Zuleyka</h1>
              <p>Tu asistente personal de moda con IA</p>
            </div>
            <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Link href="/" style={{ padding: '0.5rem 1rem', background: '#fff', borderRadius: '6px', textDecoration: 'none', color: '#333' }}>
                🏠 Inicio
              </Link>
              <Link href="/favorites" style={{ padding: '0.5rem 1rem', background: '#ffe0e0', borderRadius: '6px', textDecoration: 'none', color: '#d63031' }}>
                ❤️ Favoritos
              </Link>
              <Link href="/outfits" style={{ padding: '0.5rem 1rem', background: '#e0f0ff', borderRadius: '6px', textDecoration: 'none', color: '#0066cc' }}>
                👗 Outfits
              </Link>
              {!authLoading && (
                user ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ padding: '0.5rem 1rem', background: '#f0f0f0', borderRadius: '6px', fontSize: '0.9rem' }}>
                      👤 {user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
                    </span>
                    <button
                      onClick={() => signOut()}
                      style={{ padding: '0.5rem 1rem', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Salir
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    style={{ padding: '0.5rem 1rem', background: '#0066cc', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Inicia Sesión
                  </button>
                )
              )}
            </nav>
          </div>
        </div>
      </header>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      <div className="container">
        <div style={{ marginBottom: '2rem' }}>
          <h2>📸 Agregar nueva prenda</h2>
          <PhotoUpload onUploadComplete={() => fetchGarments()} />
        </div>

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
                <GarmentCard key={garment.id} garment={garment} userId={userId} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
