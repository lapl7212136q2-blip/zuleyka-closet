'use client';

import { useState, useRef, useEffect } from 'react';
import { Garment, CATEGORY_LABELS, COLOR_LABELS, STYLE_LABELS, SEASON_LABELS } from '@/lib/closet';

interface PhotoUploadProps {
  onUploadComplete?: (garment: Garment) => void;
}

type Focus = { fx: number; fy: number };
type Marker = { left: number; top: number };

const FRAME_CHOICES = [12, 16, 24];
const MAX_FRAME_EDGE = 1400; // px del lado largo: suficiente para el recorte, ligero para la VPN
const SEEK_TIMEOUT_MS = 10000;
const METADATA_TIMEOUT_MS = 15000;

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      video.removeEventListener('seeked', onSeeked);
      reject(new Error('El video tardó demasiado en avanzar'));
    }, SEEK_TIMEOUT_MS);
    const onSeeked = () => {
      clearTimeout(timer);
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = time;
  });
}

/** Reparte `count` cuadros a lo largo del video y los devuelve como JPEG. */
async function extractFrames(
  file: File,
  count: number,
  onProgress: (done: number) => void
): Promise<File[]> {
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  // Chrome no dispara 'loadedmetadata' de forma fiable si el <video> no está en el
  // documento, así que se cuelga fuera de pantalla mientras dura la extracción.
  video.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;opacity:0';
  document.body.appendChild(video);
  video.src = URL.createObjectURL(file);
  try {
    video.load();
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('El video tardó demasiado en abrirse')),
        METADATA_TIMEOUT_MS
      );
      video.onloadedmetadata = () => {
        clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(timer);
        reject(new Error('No se pudo leer el video en este teléfono'));
      };
    });
    // Safari en iOS no pinta cuadros hasta que el video arranca al menos una vez.
    await video.play().catch(() => {});
    video.pause();

    const { duration, videoWidth, videoHeight } = video;
    if (!isFinite(duration) || duration <= 0) throw new Error('El video no tiene duración válida');

    const scale = Math.min(1, MAX_FRAME_EDGE / Math.max(videoWidth, videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(videoWidth * scale);
    canvas.height = Math.round(videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Este navegador no permite extraer cuadros');

    const frames: File[] = [];
    for (let i = 0; i < count; i++) {
      // (i + 0.5) evita el primer y el último cuadro, que suelen salir movidos.
      await seek(video, ((i + 0.5) / count) * duration);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
      if (!blob) throw new Error(`No se pudo extraer el cuadro ${i + 1}`);
      const n = String(i + 1).padStart(2, '0');
      frames.push(new File([blob], `giro_${n}.jpg`, { type: 'image/jpeg' }));
      onProgress(i + 1);
    }
    return frames;
  } finally {
    URL.revokeObjectURL(video.src);
    video.remove();
  }
}

/**
 * Varias fotos = una sola prenda giratoria; el orden de la tira es el del giro.
 * Un video se convierte aquí mismo en esa tira de cuadros: el servidor solo ve fotos.
 */
export default function PhotoUpload({ onUploadComplete }: PhotoUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [focuses, setFocuses] = useState<(Focus | null)[]>([]);
  const [markers, setMarkers] = useState<(Marker | null)[]>([]);
  const [active, setActive] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [frameCount, setFrameCount] = useState(16);
  const [extracted, setExtracted] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState('');
  const [style, setStyle] = useState('');
  const [season, setSeason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewsRef = useRef<string[]>([]);

  // El token llega una vez por URL (?t=...) y queda guardado en el telefono.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('t');
    if (t) localStorage.setItem('uploadToken', t);
  }, []);

  const applyFiles = (picked: File[]) => {
    previewsRef.current.forEach(URL.revokeObjectURL);
    previewsRef.current = picked.map((f) => URL.createObjectURL(f));
    setFiles(picked);
    setPreviews(previewsRef.current);
    setFocuses(picked.map(() => null));
    setMarkers(picked.map(() => null));
    setActive(0);
  };

  // Cambiar el numero de cuadros vuelve a recortar el mismo video.
  useEffect(() => {
    if (!videoFile) return;
    let cancelled = false;
    setError(null);
    setExtracted(0);
    extractFrames(videoFile, frameCount, (done) => !cancelled && setExtracted(done))
      .then((frames) => {
        if (cancelled) return;
        applyFiles(frames);
        setExtracted(null);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err.message || 'No se pudieron sacar los cuadros del video');
        setExtracted(null);
        setVideoFile(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoFile, frameCount]);

  const handleFiles = (list: FileList) => {
    const picked = Array.from(list);
    const video = picked.find((f) => f.type.startsWith('video/'));
    if (video) {
      setVideoFile(video); // el efecto de arriba lo convierte en la tira de cuadros
      return;
    }
    setVideoFile(null);
    applyFiles(picked);
  };

  const reset = () => {
    applyFiles([]);
    setVideoFile(null);
    setExtracted(null);
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

  const removeAt = (i: number) => {
    const drop = <T,>(arr: T[]) => arr.filter((_, k) => k !== i);
    URL.revokeObjectURL(previews[i]);
    previewsRef.current = drop(previewsRef.current);
    setFiles(drop(files));
    setPreviews(drop(previews));
    setFocuses(drop(focuses));
    setMarkers(drop(markers));
    setActive(Math.max(0, Math.min(active, files.length - 2)));
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
        accept="image/*,video/*"
        multiple
        onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
        style={{ display: 'none' }}
        id="upload-input"
      />
      <label htmlFor="upload-input" className="upload-drop">
        {extracted !== null ? (
          <>
            <span className="upload-drop__icon">🎬</span>
            <span>Sacando cuadros del video… {extracted}/{frameCount}</span>
            <span className="upload-drop__hint">No cierres esta pantalla</span>
          </>
        ) : previews[active] ? (
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
            <span>Elige una foto o un video</span>
            <span className="upload-drop__hint">
              Varias fotos = prenda giratoria 360°. Un video del giro se convierte solo.
            </span>
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
                    <button type="button" onClick={() => removeAt(i)} title="Quitar este cuadro">✕</button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === files.length - 1}>▶</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {videoFile && (
            <div className="upload-field">
              <label>Cuadros del giro</label>
              <select
                value={frameCount}
                onChange={(e) => setFrameCount(Number(e.target.value))}
                disabled={extracted !== null}
              >
                {FRAME_CHOICES.map((n) => (
                  <option key={n} value={n}>
                    {n} cuadros{n === 12 ? ' (rápido)' : n === 24 ? ' (más fluido)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          <p className="upload-focus-hint">
            {videoFile
              ? 'Cuadros sacados del video, en el orden del giro. Revísalos y quita el que salga movido.'
              : files.length > 1
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

      <button
        type="submit"
        className="btn btn--primary"
        disabled={files.length === 0 || loading || extracted !== null}
      >
        {loading
          ? `Subiendo${files.length > 1 ? ` ${files.length} fotos` : ''}…`
          : 'Agregar al clóset'}
      </button>
    </form>
  );
}
