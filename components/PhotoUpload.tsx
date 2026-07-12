'use client';

import { useState, useRef } from 'react';
import { Garment, CATEGORY_LABELS, COLOR_LABELS, STYLE_LABELS, SEASON_LABELS } from '@/lib/closet';

interface PhotoUploadProps {
  onUploadComplete?: (garment: Garment) => void;
}

export default function PhotoUpload({ onUploadComplete }: PhotoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState('');
  const [style, setStyle] = useState('');
  const [season, setSeason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ fx: number; fy: number } | null>(null);
  const [markerPct, setMarkerPct] = useState<{ left: number; top: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setFocus(null);
    setMarkerPct(null);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const img = e.currentTarget;
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    if (!naturalW || !naturalH) return;
    const rect = img.getBoundingClientRect();
    const scale = Math.min(rect.width / naturalW, rect.height / naturalH);
    const dispW = naturalW * scale;
    const dispH = naturalH * scale;
    const padX = (rect.width - dispW) / 2;
    const padY = (rect.height - dispH) / 2;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const fx = (clickX - padX) / dispW;
    const fy = (clickY - padY) / dispH;
    if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return;
    setFocus({ fx, fy });
    setMarkerPct({ left: (clickX / rect.width) * 100, top: (clickY / rect.height) * 100 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('category', category);
      formData.append('color', color);
      formData.append('style', style);
      formData.append('season', season);
      if (focus) {
        formData.append('focusX', focus.fx.toFixed(4));
        formData.append('focusY', focus.fy.toFixed(4));
      }

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo subir la foto');

      onUploadComplete?.(data.garment);
      setFile(null);
      setPreview(null);
      setName('');
      setFocus(null);
      setMarkerPct(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err: any) {
      setError(err.message || 'Error al subir la foto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        style={{ display: 'none' }}
        id="upload-input"
      />
      <label htmlFor="upload-input" className="upload-drop">
        {preview ? (
          <>
            <img src={preview} alt="Vista previa" onClick={handleImageClick} />
            {markerPct && (
              <span
                className="upload-focus-marker"
                style={{ left: `${markerPct.left}%`, top: `${markerPct.top}%` }}
              />
            )}
          </>
        ) : (
          <>
            <span className="upload-drop__icon">📸</span>
            <span>Elige una foto</span>
          </>
        )}
      </label>

      {file && (
        <>
          {preview && (
            <p className="upload-focus-hint">
              Si en la foto salen más personas, toca sobre Zuleyka para recortar solo su figura.
            </p>
          )}
          {focus && (
            <div className="upload-focus-actions">
              <span>Marca puesta ✓</span>
              <button type="button" onClick={() => { setFocus(null); setMarkerPct(null); }}>
                Quitar marca
              </button>
            </div>
          )}
          <div className="upload-field">
            <label>Nombre (opcional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Se genera automáticamente si lo dejas vacío"
            />
          </div>
          <div className="upload-grid">
            <div className="upload-field">
              <label>Categoría</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Detectar automáticamente (IA)</option>
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="upload-field">
              <label>Color</label>
              <select value={color} onChange={(e) => setColor(e.target.value)}>
                <option value="">Detectar automáticamente (IA)</option>
                {Object.entries(COLOR_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="upload-field">
              <label>Estilo</label>
              <select value={style} onChange={(e) => setStyle(e.target.value)}>
                <option value="">Detectar automáticamente (IA)</option>
                {Object.entries(STYLE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="upload-field">
              <label>Temporada</label>
              <select value={season} onChange={(e) => setSeason(e.target.value)}>
                <option value="">Detectar automáticamente (IA)</option>
                {Object.entries(SEASON_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      {error && <div className="error-note">{error}</div>}

      <button type="submit" className="btn btn--primary" disabled={!file || loading}>
        {loading ? 'Subiendo…' : 'Agregar al clóset'}
      </button>
    </form>
  );
}
