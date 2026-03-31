'use client';

import { useEffect, useState, useCallback } from 'react';

interface Sprint {
  id: string;
  title: string;
  north_star?: string;
  start_date?: string;
  end_date?: string;
  status: 'active' | 'completed' | 'planned';
}

interface SprintItem {
  id: string;
  sprint_id?: string;
  titulo: string;
  status: 'todo' | 'in_progress' | 'done';
  rice_score?: number;
  agente?: string;
  descripcion?: string;
}

const COLUMN_CONFIG = {
  todo:        { label: 'Todo',        color: '#60a5fa', emoji: '🔵', bg: 'rgba(96,165,250,0.06)'  },
  in_progress: { label: 'En Progreso', color: '#f59e0b', emoji: '🟡', bg: 'rgba(245,158,11,0.06)'  },
  done:        { label: 'Done',        color: '#22c55e', emoji: '🟢', bg: 'rgba(34,197,94,0.06)'   },
};

const AGENT_COLORS: Record<string, string> = {
  PM: '#a78bfa', Panchita: '#f9a8d4', Arielito: '#60a5fa',
  ABAP: '#f59e0b', Fiori: '#4ade80', Hoku: '#c084fc',
  Camilita: '#f87171', Pipeline: '#94a3b8', Integrador: '#38bdf8',
};

const SEED_SPRINT = {
  title: 'Sprint 1 — Governance System',
  north_star: 'Gobierno técnico operativo para todo el equipo',
  start_date: '2026-03-30',
  end_date: '2026-04-13',
  status: 'active',
};

const SEED_ITEMS: Omit<SprintItem, 'id'>[] = [
  { titulo: 'Dashboards governance restantes', status: 'in_progress', rice_score: 85, agente: 'Fiori',    descripcion: '7 dashboards dinámicos conectados a Supabase' },
  { titulo: 'Health check todos los endpoints',  status: 'todo',        rice_score: 60, agente: 'ABAP',     descripcion: 'Smoke test post-deploy automático para APIs' },
  { titulo: 'Design tokens en Supabase',          status: 'done',        rice_score: 45, agente: 'Panchita', descripcion: 'Tokens de Panchita migrados al dashboard' },
];

export default function SprintDashboard() {
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [items, setItems] = useState<SprintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/governance/sprints');
      if (!res.ok) throw new Error('Error');
      const data = await res.json();
      const sprints: Sprint[] = data.sprints || [];
      const active = sprints.find(s => s.status === 'active') || sprints[0] || null;
      setSprint(active);
      const allItems: SprintItem[] = data.items || [];
      setItems(active ? allItems.filter((i: SprintItem) => !i.sprint_id || i.sprint_id === active.id) : allItems);
    } catch {
      setSprint(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const sprintRes = await fetch('/api/governance/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(SEED_SPRINT),
      });
      const sprintData = await sprintRes.json();
      const sprintId = sprintData?.id;
      await fetch('/api/governance/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(SEED_ITEMS.map(item => ({ ...item, sprint_id: sprintId }))),
      });
      await load();
    } catch {
      // silent
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center', color: '#475569' }}>
        <div style={{ width: 32, height: 32, border: '2px solid rgba(245,158,11,0.3)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: '0.8rem' }}>Cargando sprint...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isEmpty = !sprint && items.length === 0;

  const columns: Record<string, SprintItem[]> = { todo: [], in_progress: [], done: [] };
  items.forEach(item => {
    if (columns[item.status]) columns[item.status].push(item);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Sprint Dashboard</h2>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
            {isEmpty ? 'Sin sprint activo — carga datos de ejemplo' : sprint?.title || 'Sprint activo'}
          </p>
        </div>
        {isEmpty && (
          <button
            onClick={handleSeed}
            disabled={seeding}
            style={{ padding: '8px 18px', borderRadius: 8, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', color: '#fcd34d', fontSize: '0.75rem', fontWeight: 600, cursor: seeding ? 'wait' : 'pointer', opacity: seeding ? 0.7 : 1 }}
          >
            {seeding ? 'Cargando...' : '+ Cargar sprint ejemplo'}
          </button>
        )}
      </div>

      {/* Estado vacío */}
      {isEmpty && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 16, padding: '64px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '2.5rem' }}>🎯</span>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Sin sprint activo</h3>
          <p style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: 380, lineHeight: 1.6, margin: 0 }}>
            No hay sprint registrado. Carga el sprint de ejemplo para ver el tablero kanban con items y RICE scores.
          </p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            style={{ marginTop: 8, padding: '10px 24px', borderRadius: 10, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: '#fcd34d', fontSize: '0.8rem', fontWeight: 600, cursor: seeding ? 'wait' : 'pointer' }}
          >
            {seeding ? 'Cargando datos...' : 'Cargar sprint de ejemplo'}
          </button>
        </div>
      )}

      {!isEmpty && sprint && (
        <>
          {/* Sprint info card */}
          <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, padding: '18px 24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Sprint activo</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>{sprint.title}</div>
                {sprint.north_star && (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    <span style={{ color: '#f59e0b', marginRight: 6 }}>🎯</span>
                    {sprint.north_star}
                  </div>
                )}
              </div>
              {(sprint.start_date || sprint.end_date) && (
                <div style={{ flexShrink: 0 }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Período</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    {sprint.start_date} → {sprint.end_date}
                  </div>
                </div>
              )}
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Items</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {(Object.entries(COLUMN_CONFIG) as [string, typeof COLUMN_CONFIG[keyof typeof COLUMN_CONFIG]][]).map(([key, cfg]) => (
                    <div key={key} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: cfg.color }}>{columns[key]?.length ?? 0}</div>
                      <div style={{ fontSize: '0.6rem', color: '#475569' }}>{cfg.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Kanban */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {(Object.entries(COLUMN_CONFIG) as [string, typeof COLUMN_CONFIG[keyof typeof COLUMN_CONFIG]][]).map(([key, cfg]) => (
              <div key={key} style={{ background: cfg.bg, border: `1px solid ${cfg.color}22`, borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 200 }}>
                {/* Column header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: '0.75rem' }}>{cfg.emoji}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cfg.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 700, color: cfg.color, background: `${cfg.color}18`, borderRadius: 10, padding: '1px 7px' }}>{columns[key]?.length ?? 0}</span>
                </div>

                {/* Items */}
                {(columns[key] || []).map(item => {
                  const agentColor = item.agente ? (AGENT_COLORS[item.agente] || '#94a3b8') : '#94a3b8';
                  return (
                    <div
                      key={item.id}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 10,
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        transition: 'transform 0.12s ease',
                        cursor: 'default',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0', lineHeight: 1.3 }}>{item.titulo}</span>
                        {item.rice_score != null && (
                          <span style={{ flexShrink: 0, padding: '1px 7px', borderRadius: 6, fontSize: '0.62rem', fontWeight: 700, background: 'rgba(167,139,250,0.15)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.25)', whiteSpace: 'nowrap' }}>
                            RICE {item.rice_score}
                          </span>
                        )}
                      </div>
                      {item.descripcion && (
                        <p style={{ fontSize: '0.68rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>{item.descripcion}</p>
                      )}
                      {item.agente && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: agentColor }} />
                          <span style={{ fontSize: '0.62rem', color: agentColor, fontWeight: 600 }}>{item.agente}</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {(columns[key] || []).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#334155', fontSize: '0.7rem' }}>Sin items</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <style>{`@media (max-width: 768px) { div[style*="grid-template-columns: repeat(3"] { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
