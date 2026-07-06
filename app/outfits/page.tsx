'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/lib/auth-context';

interface Outfit {
  id: string;
  name: string;
  description: string;
  occasion: string;
  season: string;
  garment_ids: string[];
  rating: number;
  wear_count: number;
  created_at: string;
}

interface Garment {
  id: string;
  category: string;
  color: string;
  image_path?: string;
  photo_url?: string;
}

export default function OutfitsPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [garments, setGarments] = useState<Map<string, Garment>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const userId = user?.id || 'user-123';
  const [newOutfit, setNewOutfit] = useState({
    name: '',
    description: '',
    occasion: 'casual',
    season: 'all-season',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all garments first
      const garmentsRes = await fetch(`/api/garments`);
      const garmentsData = await garmentsRes.json();
      const garmentMap = new Map<string, Garment>();
      garmentsData.garments?.forEach((g: Garment) => {
        garmentMap.set(g.id, g);
      });
      setGarments(garmentMap);

      // Fetch outfits
      const outfitsRes = await fetch(`/api/outfits?user_id=${userId}`);
      const outfitsData = await outfitsRes.json();
      setOutfits(outfitsData.outfits || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error loading data');
      setOutfits([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOutfit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/outfits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          ...newOutfit,
          garment_ids: [], // Empty for now, can be edited later
        }),
      });

      if (!res.ok) throw new Error('Error creating outfit');

      setNewOutfit({ name: '', description: '', occasion: 'casual', season: 'all-season' });
      setShowCreateForm(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error creating outfit');
    }
  };

  if (authLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</div>;
  }

  return (
    <main>
      <header className="header">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>👗 Galería de Outfits</h1>
              <p>Tus combinaciones de moda</p>
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
              {user ? (
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
              )}
            </nav>
          </div>
        </div>
      </header>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      <div className="container">
        {error && <div className="error">{error}</div>}

        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#0066cc',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            {showCreateForm ? '✕ Cerrar' : '+ Nuevo Outfit'}
          </button>

          {showCreateForm && (
            <form onSubmit={handleCreateOutfit} style={{ marginTop: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '6px' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label>Nombre:</label>
                <input
                  type="text"
                  value={newOutfit.name}
                  onChange={(e) => setNewOutfit({ ...newOutfit, name: e.target.value })}
                  required
                  placeholder="Ej: Casual Sunday"
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>Descripción:</label>
                <textarea
                  value={newOutfit.description}
                  onChange={(e) => setNewOutfit({ ...newOutfit, description: e.target.value })}
                  placeholder="Describe este outfit..."
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label>Ocasión:</label>
                  <select value={newOutfit.occasion} onChange={(e) => setNewOutfit({ ...newOutfit, occasion: e.target.value })} style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}>
                    <option value="casual">Casual</option>
                    <option value="formal">Formal</option>
                    <option value="party">Party</option>
                    <option value="work">Work</option>
                    <option value="gym">Gym</option>
                  </select>
                </div>
                <div>
                  <label>Estación:</label>
                  <select value={newOutfit.season} onChange={(e) => setNewOutfit({ ...newOutfit, season: e.target.value })} style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}>
                    <option value="all-season">Todo año</option>
                    <option value="spring">Primavera</option>
                    <option value="summer">Verano</option>
                    <option value="fall">Otoño</option>
                    <option value="winter">Invierno</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                style={{
                  padding: '0.5rem 1rem',
                  background: '#0066cc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Crear Outfit
              </button>
            </form>
          )}
        </div>

        {loading && <div className="loading">Cargando outfits...</div>}

        {!loading && outfits.length === 0 && (
          <div className="empty-state">
            <h2>Sin outfits aún</h2>
            <p>Crea tu primer outfit para guardar combinaciones</p>
          </div>
        )}

        {!loading && outfits.length > 0 && (
          <>
            <p style={{ marginBottom: '1rem', color: '#666' }}>
              {outfits.length} outfit(s) guardado(s)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {outfits.map((outfit) => (
                <div key={outfit.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem', background: '#fff' }}>
                  <h3>{outfit.name}</h3>
                  {outfit.description && <p style={{ color: '#666', marginBottom: '1rem' }}>{outfit.description}</p>}
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ padding: '0.3rem 0.8rem', background: '#e0f0ff', borderRadius: '4px', fontSize: '0.9rem' }}>
                      {outfit.occasion || 'Casual'}
                    </span>
                    <span style={{ padding: '0.3rem 0.8rem', background: '#ffe0f0', borderRadius: '4px', fontSize: '0.9rem' }}>
                      {outfit.season || 'Todo año'}
                    </span>
                  </div>
                  {outfit.garment_ids && outfit.garment_ids.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      {outfit.garment_ids.slice(0, 3).map((id) => {
                        const garment = garments.get(id);
                        return garment ? (
                          <div
                            key={id}
                            style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              background: '#f0f0f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '2rem',
                            }}
                          >
                            {garment.image_path || garment.photo_url ? (
                              <img src={garment.image_path || garment.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              '👕'
                            )}
                          </div>
                        ) : null;
                      })}
                      {outfit.garment_ids.length > 3 && (
                        <div style={{ width: '60px', height: '60px', borderRadius: '4px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          +{outfit.garment_ids.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: '0.9rem', color: '#999', borderTop: '1px solid #eee', paddingTop: '0.5rem' }}>
                    👕 {outfit.garment_ids?.length || 0} prenda(s) • 👣 {outfit.wear_count || 0} veces
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
