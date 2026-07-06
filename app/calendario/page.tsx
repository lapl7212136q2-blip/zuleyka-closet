'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Garment,
  fetchGarments,
  garmentImage,
  garmentName,
  getPlan,
  setDayPlan,
  CalendarPlan,
} from '@/lib/closet';

const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function CalendarioPage() {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [plan, setPlan] = useState<CalendarPlan>({});
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [editing, setEditing] = useState<string | null>(null); // fecha en edición
  const [draft, setDraft] = useState<string[]>([]);

  useEffect(() => {
    setPlan(getPlan());
    fetchGarments().then(setGarments).catch(() => {});
  }, []);

  const byId = useMemo(() => new Map(garments.map((g) => [g.id, g])), [garments]);

  const { y, m } = cursor;
  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date();
  const todayKey = ymd(today.getFullYear(), today.getMonth(), today.getDate());

  const monthName = new Date(y, m, 1).toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });

  const openDay = (date: string) => {
    setDraft(plan[date] || []);
    setEditing(date);
  };

  const commit = () => {
    if (!editing) return;
    setPlan({ ...setDayPlan(editing, draft) });
    setEditing(null);
  };

  const toggleDraft = (id: string) =>
    setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  return (
    <>
      <div className="page-head">
        <h1>
          Planifica tus <em>looks</em>
        </h1>
        <p>Toca un día y elige qué vas a ponerte.</p>
      </div>

      <div className="cal-head">
        <button className="btn btn--ghost" onClick={() => setCursor(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }))}>
          ←
        </button>
        <h2>{monthName}</h2>
        <button className="btn btn--ghost" onClick={() => setCursor(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }))}>
          →
        </button>
      </div>

      <div className="cal-grid">
        {DOW.map((d, i) => (
          <div className="cal-dow" key={i}>
            {d}
          </div>
        ))}
        {Array.from({ length: firstDow }).map((_, i) => (
          <div className="cal-day blank" key={`b${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const date = ymd(y, m, i + 1);
          const ids = plan[date] || [];
          const first = ids.map((id) => byId.get(id)).find(Boolean);
          const img = first ? garmentImage(first) : undefined;
          return (
            <button
              className={`cal-day ${date === todayKey ? 'today' : ''}`}
              key={date}
              onClick={() => openDay(date)}
            >
              <span className="cal-day__n">{i + 1}</span>
              {img && <img src={img} alt="" />}
            </button>
          );
        })}
      </div>

      {editing && (
        <div className="modal-veil" onClick={() => setEditing(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__body">
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 520, fontSize: '1.4rem' }}>
                {new Date(editing + 'T12:00:00').toLocaleDateString('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </h2>
              <p style={{ color: 'var(--ink-soft)', margin: '0.3rem 0 1rem' }}>
                {draft.length === 0 ? 'Elige las prendas de ese día' : `${draft.length} prenda(s) elegidas`}
              </p>
              <div
                className="garment-grid"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.6rem', maxHeight: '45vh', overflowY: 'auto' }}
              >
                {garments.map((g) => {
                  const img = garmentImage(g);
                  const on = draft.includes(g.id);
                  return (
                    <div
                      key={g.id}
                      onClick={() => toggleDraft(g.id)}
                      style={{
                        border: on ? '2px solid var(--accent)' : '1px solid var(--line)',
                        borderRadius: 12,
                        background: on ? 'var(--accent-soft)' : 'var(--card)',
                        padding: '0.5rem 0.3rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {img && (
                        <img src={img} alt={garmentName(g)} style={{ height: 90, maxWidth: '100%', objectFit: 'contain' }} />
                      )}
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--ink-soft)', marginTop: 4 }}>
                        {garmentName(g)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.2rem' }}>
                <button className="btn btn--primary" onClick={commit}>
                  Guardar día
                </button>
                {(plan[editing]?.length ?? 0) > 0 && (
                  <button
                    className="btn btn--ghost"
                    onClick={() => {
                      setDraft([]);
                      setPlan({ ...setDayPlan(editing, []) });
                      setEditing(null);
                    }}
                  >
                    Vaciar día
                  </button>
                )}
                <button className="btn btn--ghost" onClick={() => setEditing(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
