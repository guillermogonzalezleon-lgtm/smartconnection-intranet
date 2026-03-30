'use client';

import { useEffect, useState, useCallback } from 'react';

interface Deal {
  id: string;
  client: string;
  stage: string;
  value_clp: number;
  probability: number;
  close_date?: string;
  contact?: string;
  notes?: string;
  created_at: string;
}

interface Metrics {
  totalPipeline: number;
  weightedPipeline: number;
  winRate: number;
  avgDealSize: number;
  avgCycleDays: number;
  totalDeals: number;
  byStage: Record<string, Deal[]>;
  conversions: Record<string, number>;
}

const STAGES = [
  { key: 'lead',        label: 'Lead',        color: '#94a3b8' },
  { key: 'calificado',  label: 'Calificado',  color: '#60a5fa' },
  { key: 'discovery',   label: 'Discovery',   color: '#a78bfa' },
  { key: 'propuesta',   label: 'Propuesta',   color: '#f59e0b' },
  { key: 'negociacion', label: 'Negociación', color: '#f97316' },
  { key: 'cierre',      label: 'Cierre',      color: '#22c55e' },
];

const SEED_DEALS = [
  { client: 'TechCorp Chile',    stage: 'propuesta',   value_clp: 2500000, probability: 60, close_date: '2026-04-30' },
  { client: 'Retail Express',    stage: 'discovery',   value_clp: 1800000, probability: 40, close_date: '2026-05-15' },
  { client: 'LogiSmart',         stage: 'negociacion', value_clp: 3200000, probability: 75, close_date: '2026-04-15' },
  { client: 'FoodService Pro',   stage: 'lead',        value_clp: 800000,  probability: 20, close_date: '2026-06-30' },
  { client: 'EduTech',           stage: 'calificado',  value_clp: 1200000, probability: 35, close_date: '2026-05-31' },
  { client: 'HealthCare Plus',   stage: 'cierre',      value_clp: 4500000, probability: 90, close_date: '2026-04-10' },
];

function fmtCLP(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function StageBadge({ stage }: { stage: string }) {
  const s = STAGES.find(s => s.key === stage);
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 20,
      fontSize: '0.65rem',
      fontWeight: 600,
      letterSpacing: '0.03em',
      background: s ? `${s.color}22` : 'rgba(255,255,255,0.06)',
      color: s?.color ?? '#94a3b8',
      border: `1px solid ${s ? s.color + '44' : 'rgba(255,255,255,0.1)'}`,
    }}>
      {s?.label ?? stage}
    </span>
  );
}

type SortKey = 'client' | 'stage' | 'value_clp' | 'probability' | 'close_date';

export default function PipelineDashboard() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('value_clp');
  const [sortAsc, setSortAsc] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/governance/pipeline');
      if (!res.ok) throw new Error('Error al cargar');
      const data = await res.json();
      setDeals(data.deals || []);
      setMetrics(data.metrics || null);
    } catch {
      setDeals([]);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/governance/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(SEED_DEALS),
      });
      if (!res.ok) throw new Error('Error al sembrar datos');
      await load();
    } catch {
      // silent
    } finally {
      setSeeding(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sortedDeals = [...deals].sort((a, b) => {
    let av: string | number = a[sortKey] ?? '';
    let bv: string | number = b[sortKey] ?? '';
    if (sortKey === 'stage') {
      av = STAGES.findIndex(s => s.key === a.stage);
      bv = STAGES.findIndex(s => s.key === b.stage);
    }
    if (av < bv) return sortAsc ? -1 : 1;
    if (av > bv) return sortAsc ? 1 : -1;
    return 0;
  });

  const maxStageCount = metrics
    ? Math.max(...STAGES.map(s => metrics.byStage[s.key]?.length || 0), 1)
    : 1;

  if (loading) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center', color: '#475569' }}>
        <div style={{ width: 32, height: 32, border: '2px solid rgba(34,197,94,0.3)', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: '0.8rem' }}>Cargando pipeline...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isEmpty = deals.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Pipeline & Win/Loss</h2>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
            {isEmpty ? 'Sin deals aún — carga datos de ejemplo para comenzar' : `${deals.length} deal${deals.length !== 1 ? 's' : ''} en el funnel`}
          </p>
        </div>
        {isEmpty && (
          <button
            onClick={handleSeed}
            disabled={seeding}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              background: 'rgba(34,197,94,0.12)',
              border: '1px solid rgba(34,197,94,0.35)',
              color: '#4ade80',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: seeding ? 'wait' : 'pointer',
              transition: 'all 0.15s ease',
              opacity: seeding ? 0.7 : 1,
            }}
          >
            {seeding ? 'Cargando...' : '+ Cargar datos de ejemplo'}
          </button>
        )}
      </div>

      {/* Estado vacío grande */}
      {isEmpty && (
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: '64px 40px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ fontSize: '2.5rem' }}>📊</span>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Sin datos de pipeline</h3>
          <p style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: 380, lineHeight: 1.6, margin: 0 }}>
            El pipeline de ventas aún no tiene deals registrados. Carga datos de ejemplo para ver el funnel, métricas y tabla de deals.
          </p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            style={{
              marginTop: 8,
              padding: '10px 24px',
              borderRadius: 10,
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.4)',
              color: '#4ade80',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: seeding ? 'wait' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {seeding ? 'Cargando datos...' : 'Cargar datos de ejemplo'}
          </button>
        </div>
      )}

      {!isEmpty && metrics && (
        <>
          {/* Metrics cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { label: 'Pipeline Total',    value: fmtCLP(metrics.totalPipeline),    sub: 'valor bruto',        color: '#60a5fa' },
              { label: 'Pipeline Ponderado', value: fmtCLP(metrics.weightedPipeline), sub: 'por probabilidad',  color: '#a78bfa' },
              { label: 'Win Rate',          value: `${metrics.winRate}%`,             sub: 'deals cerrados',    color: '#22c55e' },
              { label: 'Ticket Promedio',   value: fmtCLP(metrics.avgDealSize),       sub: 'por deal',          color: '#f59e0b' },
              { label: 'Ciclo Promedio',    value: metrics.avgCycleDays > 0 ? `${metrics.avgCycleDays}d` : '—', sub: 'días al cierre', color: '#f97316' },
              { label: 'Deals Activos',     value: String(metrics.totalDeals),         sub: 'en funnel',         color: '#94a3b8' },
            ].map(card => (
              <div key={card.label} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: '16px 20px',
                backdropFilter: 'blur(8px)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${card.color}88, transparent)` }} />
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{card.label}</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
                <div style={{ fontSize: '0.62rem', color: '#475569', marginTop: 4 }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Funnel visual */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: '20px 24px',
            backdropFilter: 'blur(8px)',
          }}>
            <h3 style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 20px' }}>
              Funnel de Conversión
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {STAGES.map((stage) => {
                const count = metrics.byStage[stage.key]?.length || 0;
                const value = metrics.byStage[stage.key]?.reduce((s, d) => s + (d.value_clp || 0), 0) || 0;
                const pct = Math.round((count / (metrics.totalDeals || 1)) * 100);
                const barWidth = Math.max((count / maxStageCount) * 100, count > 0 ? 4 : 0);

                return (
                  <div key={stage.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Label */}
                    <div style={{ flex: '0 0 100px', fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textAlign: 'right' }}>
                      {stage.label}
                    </div>
                    {/* Bar */}
                    <div style={{ flex: 1, height: 28, background: 'rgba(255,255,255,0.04)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                      <div style={{
                        position: 'absolute',
                        left: 0, top: 0, bottom: 0,
                        width: `${barWidth}%`,
                        background: `linear-gradient(90deg, ${stage.color}cc, ${stage.color}66)`,
                        borderRadius: 6,
                        transition: 'width 0.5s ease',
                        minWidth: count > 0 ? 4 : 0,
                      }} />
                      {count > 0 && (
                        <div style={{
                          position: 'absolute',
                          left: 10, top: 0, bottom: 0,
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          color: '#f1f5f9',
                          zIndex: 1,
                        }}>
                          {count} deal{count !== 1 ? 's' : ''} — {fmtCLP(value)}
                        </div>
                      )}
                    </div>
                    {/* Pct */}
                    <div style={{ flex: '0 0 48px', fontSize: '0.7rem', fontWeight: 700, color: stage.color, textAlign: 'right' }}>
                      {count > 0 ? `${pct}%` : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabla de deals */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            overflow: 'hidden',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                Deals ({deals.length})
              </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {([
                      { key: 'client',     label: 'Cliente' },
                      { key: 'stage',      label: 'Stage' },
                      { key: 'value_clp',  label: 'Valor' },
                      { key: 'probability', label: 'Prob.' },
                      { key: 'close_date', label: 'Cierre Est.' },
                    ] as { key: SortKey; label: string }[]).map(col => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        style={{
                          padding: '10px 16px',
                          textAlign: 'left',
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          color: sortKey === col.key ? '#a78bfa' : '#475569',
                          textTransform: 'uppercase',
                          letterSpacing: '0.07em',
                          cursor: 'pointer',
                          userSelect: 'none',
                          whiteSpace: 'nowrap',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        {col.label} {sortKey === col.key ? (sortAsc ? '↑' : '↓') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedDeals.map((deal, idx) => (
                    <tr
                      key={deal.id}
                      style={{
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(167,139,250,0.07)')}
                      onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)')}
                    >
                      <td style={{ padding: '10px 16px', color: '#e2e8f0', fontWeight: 500 }}>{deal.client}</td>
                      <td style={{ padding: '10px 16px' }}><StageBadge stage={deal.stage} /></td>
                      <td style={{ padding: '10px 16px', color: '#f1f5f9', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtCLP(deal.value_clp || 0)}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: '0 0 36px', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${deal.probability || 0}%`, background: deal.probability >= 70 ? '#22c55e' : deal.probability >= 40 ? '#f59e0b' : '#f87171', borderRadius: 2 }} />
                          </div>
                          <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{deal.probability || 0}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px', color: '#64748b', fontSize: '0.72rem' }}>
                        {deal.close_date
                          ? new Date(deal.close_date + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 640px) {
          table { min-width: 480px; }
        }
      `}</style>
    </div>
  );
}
