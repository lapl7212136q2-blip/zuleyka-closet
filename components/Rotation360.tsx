'use client';

import { useRef, useState } from 'react';

interface Props {
  /** Fotos reales por ángulo, en orden de giro. Si hay 2+ se usa giro real. */
  angles?: string[];
  /** Foto única de respaldo: se simula el giro rotándola en 3D (no es una foto real del reverso). */
  fallbackImage?: string;
  alt: string;
}

const SENSITIVITY = 0.6; // grados por pixel arrastrado

export default function Rotation360({ angles, fallbackImage, alt }: Props) {
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const dragStart = useRef(0);
  const rotationStart = useRef(0);

  const hasRealFrames = !!angles && angles.length > 1;
  const img = fallbackImage;
  if (!hasRealFrames && !img) return null;

  const norm = ((rotation % 360) + 360) % 360;
  const frame = hasRealFrames
    ? angles![Math.round((norm / 360) * angles!.length) % angles!.length]
    : img;

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    setInteracted(true);
    dragStart.current = e.clientX;
    rotationStart.current = rotation;
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const delta = e.clientX - dragStart.current;
    setRotation(rotationStart.current + delta * SENSITIVITY);
  };

  const onPointerUp = () => setDragging(false);

  // Simulación: al no tener fotos reales del reverso, se rota la misma imagen en 3D
  // y se le oscurece el borde para sugerir volumen (no es una vista real de espaldas).
  const simulatedStyle: React.CSSProperties = hasRealFrames
    ? {}
    : {
        transform: `perspective(1000px) rotateY(${norm > 180 ? norm - 360 : norm}deg)`,
        filter: `drop-shadow(0 12px 16px rgba(63, 46, 30, 0.15)) brightness(${1 - Math.abs(Math.sin((norm * Math.PI) / 180)) * 0.35})`,
      };

  return (
    <div
      className="r360"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <span className="r360__badge">{hasRealFrames ? '360°' : '360° simulado'}</span>
      {frame && (
        <img
          className="r360__img"
          src={frame}
          alt={alt}
          draggable={false}
          style={hasRealFrames ? undefined : simulatedStyle}
        />
      )}
      {!interacted && (
        <span className="r360__hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5 4 12l5 7M15 5l5 7-5 7" />
          </svg>
          Arrastra para girar
        </span>
      )}
      {!hasRealFrames && (
        <span className="r360__note">Vista simulada — aún no hay fotos por ángulo de esta prenda</span>
      )}
    </div>
  );
}
