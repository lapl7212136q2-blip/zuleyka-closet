'use client';

import { useState, useRef, useEffect } from 'react';
import { Garment, CATEGORY_LABELS, COLOR_LABELS, STYLE_LABELS, SEASON_LABELS } from '@/lib/closet';

interface PhotoUploadProps {
  onUploadComplete?: (garment: Garment) => void;
}

type Focus = { fx: number; fy: number };
type Marker = { left: number; top: number };

/** Varias fotos = una sola prenda giratoria; el orden de la tira es el del giro. */
export default function PhotoUpload({ onUploadComplete }: PhotoUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [focuses, setFocuses] = useState<(Focus | null)[]>([]);
  const [markers, setMarkers] = useState<(Marker | null)[]>([]);
  const [active, setActive] = useState(0);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState('');
  const [style, setStyle] = useState('');
  const [season, setSeason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // El token llega una vez por URL (?t=...) y queda guardado en el telefono.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('t');
    if (t) localStorage.setItem('uploadToken', t);
  }, []);

  const handleFiles = (list: FileList) => {
    const picked = Array.from(list);
    setFiles(picked);
    setPreviews(picked.map((f) => URL.createObjectURL(f)));
    setFocuses(picked.map(() => null));
    setMarkers(picked.map(() => null));
    setActive(0);
  };

  const reset = () => {
    setFiles([]);
    setPreviews([]);
    setFocuses([]);
    setMarkers([]);
    setActive(0);
    setName('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= files.length) return;
    const swap = <T,>(arr: T[]) => {
      const next = [...arr];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    };
    setFiles(swap(files));
    setPreviews(swap(previews));
    setFocuses(swap(focuses));
    setMarkers(swap(markers));
    setActive(j);
  };

  const setAt = <T,>(arr: T[], i: number, value: T) =>
    arr.map((v, k) => (k === i ? value : v));

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
    setFocuses(setAt(focuses, active, { fx, fy }));
    setMarkers(setAt(markers, active, {
      left: (clickX / rect.width) * 100,
      top: (clickY / rect.height) * 100,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      files.forEach((f, i) => {
        formData.append('file', f);
        const focus = focuses[i];
        formData.append('focusX', focus ? focus.fx.toFixed(4) : '-');
        formData.append('focusY', focus ? focus.fy.toFixed(4) : '-');
      });
      formData.append('name', name);
      formData.append('category', category);
      formData.append('color', color);
      formData.append('style', style);
      formData.append('season', season);

      const token = localStorage.getItem('uploadToken');
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: token ? { 'x-upload-token': token } : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo subir la foto');

      onUploadComplete?.(data.garment);
      reset();
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
        multiple
        onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
        style={{ display: 'none' }}
        id="upload-input"
      />
      <label htmlFor="upload-input" className="upload-drop">
        {previews[active] ? (
          <>
            <img src={previews[active]} alt="Vista previa" onClick={handleImageClick} />
            {markers[active] && (
              <span
                className="upload-focus-marker"
                style={{ left: `${markers[active]!.left}%`, top: `${markers[active]!.top}%` }}
              />
            )}
          </>
        ) : (
          <>
            <span className="upload-drop__icon">📸</span>
            <span>Elige una foto</span>
            <span className="upload-drop__hint">Varias fotos = prenda giratoria 360°</span>
          </>
        )}
      </label>

      {files.length > 0 && (
        <>
          {files.length > 1 && (
            <div className="upload-thumbs">
              {previews.map((src, i) => (
                <div key={src} className={`upload-thumb${i === active ? ' is-active' : ''}`}>
                  <img src={src} alt={`Ángulo ${i + 1}`} onClick={() => setActive(i)} />
                  <span className="upload-thumb__n">{i + 1}</span>
                  <div className="upload-thumb__move">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0}>◀</button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === files.length - 1}>▶</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="upload-focus-hint">
            {files.length > 1
              ? 'Ordena las fotos como gira la prenda (frente → lado → espalda). Toca una para verla grande.'
              : 'Si en la foto salen más personas, toca sobre Zuleyka para recortar solo su figura.'}
          </p>
          {focuses[active] && (
            <div className="upload-focus-actions">
              <span>Marca puesta ✓</span>
              <button
                type="button"
                onClick={() => {
                  setFocuses(setAt(focuses, active, null));
                  setMarkers(setAt(markers, active, null));
                }}
              >
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

      <button type="submit" className="btn btn--primary" disabled={files.length === 0 || loading}>
        {loading
          ? `Subiendo${files.length > 1 ? ` ${files.length} fotos` : ''}…`
          : 'Agregar al clóset'}
      </button>
    </form>
  );
}
