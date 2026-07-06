'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Garment,
  fetchGarments,
  garmentImage,
  garmentName,
  saveLook,
  setDayPlan,
} from '@/lib/closet';

interface Weather {
  temp: number;
  feels: number;
  code: number;
  tmax: number;
  tmin: number;
  rain: number; // prob. máxima del día (%)
  fallback: boolean;
}

const WMO: Record<number, string> = {
  0: 'Despejado',
  1: 'Mayormente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Niebla',
  48: 'Niebla',
  51: 'Llovizna ligera',
  53: 'Llovizna',
  55: 'Llovizna intensa',
  61: 'Lluvia ligera',
  63: 'Lluvia',
  65: 'Lluvia intensa',
  71: 'Nieve ligera',
  73: 'Nieve',
  75: 'Nieve intensa',
  80: 'Chubascos ligeros',
  81: 'Chubascos',
  82: 'Chubascos fuertes',
  95: 'Tormenta',
  96: 'Tormenta con granizo',
  99: 'Tormenta con granizo',
};

function weatherIcon(code: number, temp: number) {
  if (code >= 51)
    return (
      // lluvia
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M17.5 17a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5 1.5A4 4 0 0 0 6.5 17h11Z" />
        <path d="M8 19.5v1.5M12 19.5v2M16 19.5v1.5" />
      </svg>
    );
  if (code >= 2)
    return (
      // nube
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M17.5 18a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5 1.5A4 4 0 0 0 6.5 18h11Z" />
      </svg>
    );
  return (
    // sol
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2M12 19.5v2M4.3 4.3l1.4 1.4M18.3 18.3l1.4 1.4M2.5 12h2M19.5 12h2M4.3 19.7l1.4-1.4M18.3 5.7l1.4-1.4" />
    </svg>
  );
}

function pick<T>(arr: T[], seed: number): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.abs(seed) % arr.length];
}

function buildLook(garments: Garment[], w: Weather | null, seed: number): Garment[] {
  const cold = w ? w.temp < 17 : false;
  const hot = w ? w.temp >= 27 : false;
  const rainy = w ? w.rain >= 50 : false;

  const bySeason = (g: Garment) => {
    const s = g.season || 'all';
    if (s === 'all') return true;
    if (hot) return s === 'summer' || s === 'spring';
    if (cold) return s === 'fall' || s === 'winter';
    return true;
  };

  const pool = garments.filter(bySeason);
  const from = (cat: string, s: number) =>
    pick(pool.filter((g) => g.category === cat), s) ||
    pick(garments.filter((g) => g.category === cat), s);

  const look: Garment[] = [];
  const dress = from('dress', seed);
  const top = from('top', seed);
  const bottom = from('bottom', seed + 3);
  const outfit = from('outfit', seed);

  // alterna entre vestido y top+bajo según la semilla
  if (dress && (seed % 2 === 0 || !top || !bottom)) {
    look.push(dress);
  } else if (top && bottom) {
    look.push(top, bottom);
  } else if (outfit) {
    look.push(outfit);
  } else if (dress) {
    look.push(dress);
  }

  if ((cold || rainy) && look.length > 0) {
    const outer = from('outerwear', seed + 1);
    if (outer) look.push(outer);
  }

  return look;
}

function dateSeed(): number {
  const d = new Date();
  return d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate();
}

export default function HoyPage() {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherErr, setWeatherErr] = useState(false);
  const [shuffle, setShuffle] = useState(0);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    fetchGarments().then(setGarments).catch(() => {});

    const load = (lat: number, lon: number, fallback: boolean) => {
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,apparent_temperature,weather_code` +
          `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=1`
      )
        .then((r) => r.json())
        .then((d) =>
          setWeather({
            temp: Math.round(d.current.temperature_2m),
            feels: Math.round(d.current.apparent_temperature),
            code: d.current.weather_code,
            tmax: Math.round(d.daily.temperature_2m_max[0]),
            tmin: Math.round(d.daily.temperature_2m_min[0]),
            rain: d.daily.precipitation_probability_max?.[0] ?? 0,
            fallback,
          })
        )
        .catch(() => setWeatherErr(true));
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => load(pos.coords.latitude, pos.coords.longitude, false),
        () => load(19.43, -99.13, true),
        { timeout: 6000 }
      );
    } else {
      load(19.43, -99.13, true);
    }
  }, []);

  const look = buildLook(garments, weather, dateSeed() + shuffle * 7);

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const fecha = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const handleSaveLook = useCallback(() => {
    if (look.length === 0) return;
    saveLook({
      name: `Look ${fecha}`,
      garment_ids: look.map((g) => g.id),
      occasion: 'sugerido',
    });
    setSaved('look');
    setTimeout(() => setSaved(null), 2500);
  }, [look, fecha]);

  const handlePlanToday = useCallback(() => {
    if (look.length === 0) return;
    setDayPlan(todayKey, look.map((g) => g.id));
    setSaved('plan');
    setTimeout(() => setSaved(null), 2500);
  }, [look, todayKey]);

  return (
    <>
      <div className="page-head">
        <h1>
          Hoy, <em>{fecha}</em>
        </h1>
        <p>Una propuesta de tu propio clóset, según el clima.</p>
      </div>

      {weather ? (
        <div className="weather-hero fade-in">
          {weatherIcon(weather.code, weather.temp)}
          <div className="weather-hero__temp">
            {weather.temp}
            <sup>°C</sup>
          </div>
          <div className="weather-hero__desc">
            <strong>{WMO[weather.code] || 'Clima'}</strong>
            Máx {weather.tmax}° · Mín {weather.tmin}°
            {weather.rain >= 40 && <> · {weather.rain}% lluvia</>}
            {weather.fallback && <> · CDMX</>}
          </div>
        </div>
      ) : weatherErr ? (
        <div className="error-note">No se pudo obtener el clima — la sugerencia es general.</div>
      ) : (
        <div className="skeleton" style={{ aspectRatio: 'auto', height: 110 }} />
      )}

      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 520,
          fontSize: '1.45rem',
          margin: '2rem 0 0.9rem',
        }}
      >
        El look de hoy
      </h2>

      {look.length > 0 ? (
        <>
          <div className="look-stage fade-in" key={shuffle}>
            {look.map((g) => {
              const img = garmentImage(g);
              return img ? <img key={g.id} src={img} alt={garmentName(g)} /> : null;
            })}
          </div>
          <p style={{ color: 'var(--ink-soft)', margin: '0.9rem 0 1.2rem', fontWeight: 600 }}>
            {look.map(garmentName).join(' + ')}
          </p>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button className="btn btn--primary" onClick={() => setShuffle((s) => s + 1)}>
              Otra propuesta
            </button>
            <button className="btn btn--ghost" onClick={handleSaveLook}>
              {saved === 'look' ? '✓ Guardado' : 'Guardar look'}
            </button>
            <button className="btn btn--ghost" onClick={handlePlanToday}>
              {saved === 'plan' ? '✓ En el plan' : 'Usar hoy'}
            </button>
          </div>
        </>
      ) : (
        <div className="empty-note">
          <h2>Cargando tu clóset…</h2>
        </div>
      )}
    </>
  );
}
