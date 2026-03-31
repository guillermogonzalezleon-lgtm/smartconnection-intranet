'use client';

import { useEffect, useState, useCallback } from 'react';

interface Provider {
  id: string;
  provider: string;
  model: string;
  use_case?: string;
  latency_ms?: number;
  cost_per_1m_tokens?: number;
  quality_score?: string;
  is_fallback?: boolean;
}

const QUALITY_COLORS: Record<string, string> = {
  'A+': '#22c55e',
  'A':  '#22c55e',
  'A-': '#4ade80',
  'B+': '#4ade80',
  'B':  '#4ade80',
  'B-': '#86efac',
  'C+': '#f59e0b',
  'C':  '#f59e0b',
  'C-': '#fbbf24',
  'D':  '#f97316',
  'F':  '#ef4444',
};

const SEED_PROVIDERS = [
  { provider: 'Groq',      model: 'llama-4-scout',      use_case: 'Chat intranet',     latency_ms: 200,  cost_per_1m_tokens: 0.10,  quality_score: 'B+', is_fallback: false },
  { provider: 'Anthropic', model: 'claude-sonnet-4-6',  use_case: 'Análisis docs',     latency_ms: 1000, cost_per_1m_tokens: 15.00, quality_score: 'A+', is_fallback: false },
  { provider: 'Anthropic', model: 'claude-opus-4',      use_case: 'Tareas complejas',  latency_ms: 2000, cost_per_1m_tokens: 75.00, quality_score: 'A+', is_fallback: false },
  { provider: 'Mistral',   model: 'mistral-large',      use_case: 'Clasificación',     latency_ms: 300,  cost_per_1m_tokens: 2.00,  quality_score: 'A-', is_fallback: true  },
  { provider: 'Cohere',    model: 'embed-v4',           use_case: 'Embeddings RAG',    latency_ms: 100,  cost_per_1m_tokens: 0.10,  quality_score: 'A',  is_fallback: false },
  { provider: 'OpenAI',    model: 'gpt-4o',             use_case: 'Fallback general',  latency_ms: 800,  cost_per_1m_tokens: 10.00, quality_score: 'A',  is_fallback: true  },
  { provider: 'Groq',      model: 'llama-4-maverick',   use_case: 'Fallback chat',     latency_ms: 250,  cost_per_1m_tokens: 0.20,  quality_score: 'B+', is_fallback: true  },
];

function QualityBadge({ score }: { score?: string }) {
  if (!score) return <span style={{ color: '#475569', fontSize: '0.72rem' }}>—</span>;
  const color = QUALITY_COLORS[score] || '#94a3b8';
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 6,
      fontSize: '0.7rem', fontWeight: 700,
      background: `${color}18`, color, border: `1px solid ${color}33`,
    }}>
      {score}
    </span>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: '0 0 60px', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

export default function ProvidersIaDashboard() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/governance/providers-ia');
      if (!res.ok) throw new Error('Error');
      const data = await res.json();
      setProviders(data.providers || []);
    } catch {
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      for (const p of SEED_PROVIDERS) {
        await fetch('/api/governance/providers-ia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        });
      }
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
        <div style={{ width: 32, height: 32, border: '2px solid rgba(167,139,250,0.3)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: '0.8rem' }}>Cargando providers IA...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isEmpty = providers.length === 0;
  const maxLatency = Math.max(...providers.map(p => p.latency_ms || 0), 1);
  const maxCost = Math.max(...providers.map(p => p.cost_per_1m_tokens || 0), 1);

  // Agrupar por provider para tarjetas
  const byProvider = providers.reduce<Record<string, Provider[]>>((acc, p) => {
    if (!acc[p.provider]) acc[p.provider] = [];
    acc[p.provider].push(p);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Providers IA</h2>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
            {isEmpty ? 'Sin providers configurados — carga datos de ejemplo' : `${providers.length} modelo${providers.length !== 1 ? 's' : ''} registrados`}
          </p>
        </div>
        {isEmpty && (
          <button
            onClick={handleSeed}
            disabled={seeding}
            style={{ padding: '8px 18px', borderRadius: 8, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.35)', color: '#c4b5fd', fontSize: '0.75rem', fontWeight: 600, cursor: seeding ? 'wait' : 'pointer', opacity: seeding ? 0.7 : 1 }}
          >
            {seeding ? 'Cargando...' : '+ Cargar datos ejemplo'}
          </button>
        )}
      </div>

      {/* Estado vacío */}
      {isEmpty && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 16, padding: '64px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '2.5rem' }}>🤖</span>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Sin providers registrados</h3>
          <p style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: 380, lineHeight: 1.6, margin: 0 }}>
            La matriz de providers IA está vacía. Carga los datos de ejemplo para ver comparativas de latencia, costo y calidad.
          </p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            style={{ marginTop: 8, padding: '10px 24px', borderRadius: 10, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.4)', color: '#c4b5fd', fontSize: '0.8rem', fontWeight: 600, cursor: seeding ? 'wait' : 'pointer' }}
          >
            {seeding ? 'Cargando datos...' : 'Cargar datos de ejemplo'}
          </button>
        </div>
      )}

      {!isEmpty && (
        <>
          {/* Cards por provider */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {Object.entries(byProvider).map(([providerName, models]) => {
              const bestQuality = models.sort((a, b) => (a.quality_score ?? 'Z').localeCompare(b.quality_score ?? 'Z'))[0];
              const avgLatency = Math.round(models.reduce((s, m) => s + (m.latency_ms || 0), 0) / models.length);
              const minCost = Math.min(...models.map(m => m.cost_per_1m_tokens || 0));
              const color = QUALITY_COLORS[bestQuality?.quality_score || ''] || '#94a3b8';
              return (
                <div key={providerName} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${color}22`,
                  borderRadius: 14,
                  padding: '18px 20px',
                  backdropFilter: 'blur(8px)',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                  cursor: 'default',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.borderColor = `${color}44`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.borderColor = `${color}22`; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9' }}>{providerName}</span>
                    <QualityBadge score={bestQuality?.quality_score} />
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#475569', marginBottom: 8 }}>{models.length} modelo{models.length !== 1 ? 's' : ''}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.62rem', color: '#64748b' }}>Latencia prom.</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8' }}>{avgLatency}ms</span>
                      </div>
                      <MiniBar value={avgLatency} max={maxLatency} color="#60a5fa" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.62rem', color: '#64748b' }}>Desde</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8' }}>${minCost}/1M tok</span>
                      </div>
                      <MiniBar value={minCost} max={maxCost} color="#a78bfa" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabla comparativa */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden', backdropFilter: 'blur(8px)' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Matriz comparativa</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {['Provider', 'Modelo', 'Caso de uso', 'Latencia', '$/1M tokens', 'Calidad', 'Fallback'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.62rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p, idx) => (
                    <tr
                      key={p.id}
                      style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(167,139,250,0.07)')}
                      onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)')}
                    >
                      <td style={{ padding: '10px 16px', color: '#e2e8f0', fontWeight: 600 }}>{p.provider}</td>
                      <td style={{ padding: '10px 16px', color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.72rem' }}>{p.model}</td>
                      <td style={{ padding: '10px 16px', color: '#64748b', fontSize: '0.72rem' }}>{p.use_case || '—'}</td>
                      <td style={{ padding: '10px 16px', color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>
                        {p.latency_ms != null ? `${p.latency_ms}ms` : '—'}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>
                        {p.cost_per_1m_tokens != null ? `$${p.cost_per_1m_tokens.toFixed(2)}` : '—'}
                      </td>
                      <td style={{ padding: '10px 16px' }}><QualityBadge score={p.quality_score} /></td>
                      <td style={{ padding: '10px 16px' }}>
                        {p.is_fallback
                          ? <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.62rem', fontWeight: 600, background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>Fallback</span>
                          : <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.62rem', fontWeight: 600, background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>Primary</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style>{`@media (max-width: 640px) { table { min-width: 600px; } }`}</style>
    </div>
  );
}
