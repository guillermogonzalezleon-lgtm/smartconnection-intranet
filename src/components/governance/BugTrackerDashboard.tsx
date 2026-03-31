'use client';

import { useEffect, useState, useCallback } from 'react';

interface Bug {
  id: string;
  titulo: string;
  proyecto?: string;
  severidad: 'critica' | 'alta' | 'media' | 'baja';
  persona?: string;
  status: 'abierto' | 'en_progreso' | 'resuelto' | 'cerrado';
  asignado?: string;
  descripcion?: string;
  created_at?: string;
}

const SEVERIDAD_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  critica: { label: 'Crítica', color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  alta:    { label: 'Alta',    color: '#f97316', bg: 'rgba(249,115,22,0.12)'  },
  media:   { label: 'Media',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  baja:    { label: 'Baja',    color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  abierto:     { label: 'Abierto',      color: '#ef4444' },
  en_progreso: { label: 'En progreso',  color: '#f59e0b' },
  resuelto:    { label: 'Resuelto',     color: '#22c55e' },
  cerrado:     { label: 'Cerrado',      color: '#475569' },
};

const SEED_BUGS = [
  { titulo: 'Error 500 en endpoint /api/governance/audit al filtrar por proyecto', proyecto: 'Intranet', severidad: 'critica',  persona: 'El Novato',     status: 'abierto',     asignado: 'ABAP' },
  { titulo: 'Tabla de deals no carga en mobile (viewport < 375px)',                proyecto: 'Intranet', severidad: 'alta',     persona: 'El Impaciente', status: 'en_progreso', asignado: 'Fiori' },
  { titulo: 'Tech Radar SVG tooltip se corta en resoluciones pequeñas',            proyecto: 'Intranet', severidad: 'media',    persona: 'El Novato',     status: 'resuelto',    asignado: 'Fiori' },
  { titulo: 'Sprint items no filtran por sprint_id correctamente',                 proyecto: 'Intranet', severidad: 'alta',     persona: 'El Frecuente',  status: 'abierto',     asignado: 'ABAP' },
  { titulo: 'Design tokens vacíos muestran sección en blanco sin mensaje',         proyecto: 'Intranet', severidad: 'baja',     persona: 'El Novato',     status: 'cerrado',     asignado: 'Fiori' },
];

function SeveridadBadge({ severidad }: { severidad: string }) {
  const cfg = SEVERIDAD_CONFIG[severidad] || { label: severidad, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: '0.62rem', fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33` }}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#94a3b8' };
  return (
    <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 6, fontSize: '0.62rem', fontWeight: 600, background: `${cfg.color}12`, color: cfg.color, border: `1px solid ${cfg.color}22` }}>
      {cfg.label}
    </span>
  );
}

export default function BugTrackerDashboard() {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filterProyecto, setFilterProyecto] = useState<string>('');
  const [filterSeveridad, setFilterSeveridad] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterSeveridad) params.set('severidad', filterSeveridad);
      else if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/governance/bugs${params.toString() ? '?' + params : ''}`);
      if (!res.ok) throw new Error('Error');
      const data = await res.json();
      setBugs(data.bugs || []);
    } catch {
      setBugs([]);
    } finally {
      setLoading(false);
    }
  }, [filterSeveridad, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await fetch('/api/governance/bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(SEED_BUGS),
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
        <div style={{ width: 32, height: 32, border: '2px solid rgba(239,68,68,0.3)', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: '0.8rem' }}>Cargando bug tracker...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isEmpty = bugs.length === 0 && !filterSeveridad && !filterStatus && !filterProyecto;

  const counts = {
    critica: bugs.filter(b => b.severidad === 'critica').length,
    alta:    bugs.filter(b => b.severidad === 'alta').length,
    media:   bugs.filter(b => b.severidad === 'media').length,
    baja:    bugs.filter(b => b.severidad === 'baja').length,
  };

  const proyectos = [...new Set(bugs.map(b => b.proyecto).filter(Boolean))] as string[];

  const filtered = bugs.filter(b => {
    if (filterProyecto && b.proyecto !== filterProyecto) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Bug Tracker</h2>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
            {isEmpty ? 'Sin bugs registrados — carga datos de ejemplo' : `${bugs.length} bug${bugs.length !== 1 ? 's' : ''} en seguimiento`}
          </p>
        </div>
        {isEmpty && (
          <button
            onClick={handleSeed}
            disabled={seeding}
            style={{ padding: '8px 18px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5', fontSize: '0.75rem', fontWeight: 600, cursor: seeding ? 'wait' : 'pointer', opacity: seeding ? 0.7 : 1 }}
          >
            {seeding ? 'Cargando...' : '+ Cargar bugs ejemplo'}
          </button>
        )}
      </div>

      {/* Estado vacío */}
      {isEmpty && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 16, padding: '64px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '2.5rem' }}>🐛</span>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Sin bugs registrados</h3>
          <p style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: 380, lineHeight: 1.6, margin: 0 }}>
            El bug tracker está vacío. Carga datos de ejemplo para ver contadores por severidad y tabla de seguimiento.
          </p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            style={{ marginTop: 8, padding: '10px 24px', borderRadius: 10, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', fontSize: '0.8rem', fontWeight: 600, cursor: seeding ? 'wait' : 'pointer' }}
          >
            {seeding ? 'Cargando datos...' : 'Cargar bugs de ejemplo'}
          </button>
        </div>
      )}

      {!isEmpty && (
        <>
          {/* Contadores por severidad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
            {(Object.entries(SEVERIDAD_CONFIG) as [string, typeof SEVERIDAD_CONFIG[string]][]).map(([key, cfg]) => (
              <div
                key={key}
                onClick={() => setFilterSeveridad(filterSeveridad === key ? '' : key)}
                style={{
                  background: filterSeveridad === key ? cfg.bg : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${filterSeveridad === key ? cfg.color + '55' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 12,
                  padding: '14px 18px',
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${cfg.color}88, transparent)` }} />
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{cfg.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: cfg.color }}>{counts[key as keyof typeof counts]}</div>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {proyectos.length > 0 && (
              <select
                value={filterProyecto}
                onChange={e => setFilterProyecto(e.target.value)}
                style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer' }}
              >
                <option value="">Todos los proyectos</option>
                {proyectos.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer' }}
            >
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {(filterProyecto || filterSeveridad || filterStatus) && (
              <button
                onClick={() => { setFilterProyecto(''); setFilterSeveridad(''); setFilterStatus(''); }}
                style={{ padding: '4px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', fontSize: '0.68rem', cursor: 'pointer' }}
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {/* Tabla */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden', backdropFilter: 'blur(8px)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {['Bug', 'Proyecto', 'Severidad', 'Persona', 'Estado', 'Asignado', 'Fecha'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.62rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((bug, idx) => (
                    <tr
                      key={bug.id}
                      style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)')}
                    >
                      <td style={{ padding: '10px 16px', color: '#e2e8f0', fontWeight: 500, maxWidth: 260 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={bug.titulo}>{bug.titulo}</div>
                      </td>
                      <td style={{ padding: '10px 16px', color: '#64748b', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{bug.proyecto || '—'}</td>
                      <td style={{ padding: '10px 16px' }}><SeveridadBadge severidad={bug.severidad} /></td>
                      <td style={{ padding: '10px 16px', color: '#64748b', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{bug.persona || '—'}</td>
                      <td style={{ padding: '10px 16px' }}><StatusBadge status={bug.status} /></td>
                      <td style={{ padding: '10px 16px', color: '#94a3b8', fontSize: '0.72rem' }}>{bug.asignado || '—'}</td>
                      <td style={{ padding: '10px 16px', color: '#475569', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                        {bug.created_at ? new Date(bug.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : '—'}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#475569', fontSize: '0.78rem' }}>
                        Sin bugs para los filtros seleccionados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style>{`@media (max-width: 640px) { table { min-width: 560px; } }`}</style>
    </div>
  );
}
