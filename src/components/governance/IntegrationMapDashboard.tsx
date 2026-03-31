'use client';

import { useEffect, useState, useCallback } from 'react';

interface Integration {
  id: string;
  service: string;
  type: 'business' | 'ia' | 'infra' | 'platform';
  projects: string[];
  status: 'ok' | 'warn' | 'down';
  version?: string;
  rate_limit?: string;
  cost_monthly?: number;
  notes?: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  business: { label: 'Negocio',   color: '#60a5fa' },
  ia:       { label: 'IA',        color: '#a78bfa' },
  infra:    { label: 'Infra',     color: '#f59e0b' },
  platform: { label: 'Platform',  color: '#4ade80' },
};

const STATUS_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
  ok:   { emoji: '🟢', color: '#22c55e', label: 'OK'   },
  warn: { emoji: '🟡', color: '#f59e0b', label: 'Warn' },
  down: { emoji: '🔴', color: '#ef4444', label: 'Down' },
};

const SEED_INTEGRATIONS = [
  { service: 'Supabase',     type: 'platform', projects: ['Intranet', 'Marketing'], status: 'ok',   version: 'v2',  rate_limit: '500/min',  cost_monthly: 0 },
  { service: 'Groq',         type: 'ia',       projects: ['Intranet', 'InfoPet'],  status: 'ok',   version: 'v1',  rate_limit: '30/min',   cost_monthly: 5 },
  { service: 'Anthropic',    type: 'ia',       projects: ['Intranet'],             status: 'ok',   version: 'v1',  rate_limit: 'varía',    cost_monthly: 15 },
  { service: 'AWS Amplify',  type: 'infra',    projects: ['Intranet', 'InfoPet'],  status: 'ok',   version: 'v2',  rate_limit: '—',        cost_monthly: 5 },
  { service: 'AWS S3',       type: 'infra',    projects: ['Marketing'],            status: 'ok',   version: 'v4',  rate_limit: '—',        cost_monthly: 2 },
  { service: 'CloudFront',   type: 'infra',    projects: ['Marketing'],            status: 'ok',   version: 'v3',  rate_limit: '—',        cost_monthly: 3 },
  { service: 'Airtable',     type: 'business', projects: ['VOY'],                  status: 'ok',   version: 'v0',  rate_limit: '5/sec',    cost_monthly: 0 },
  { service: 'Bsale',        type: 'business', projects: ['InfoPet'],              status: 'warn', version: 'v1',  rate_limit: '100/min',  cost_monthly: 0 },
  { service: 'MeLi API',     type: 'business', projects: ['Marketplace'],          status: 'ok',   version: 'v2',  rate_limit: '50/min',   cost_monthly: 0 },
  { service: 'Vercel',       type: 'platform', projects: ['VOY', 'Marketing'],     status: 'ok',   version: 'v1',  rate_limit: '—',        cost_monthly: 0 },
];

export default function IntegrationMapDashboard() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [activeType, setActiveType] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = activeType
        ? `/api/governance/integrations?type=${activeType}`
        : '/api/governance/integrations';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error');
      const data = await res.json();
      setIntegrations(data.integrations || []);
    } catch {
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, [activeType]);

  useEffect(() => { load(); }, [load]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      for (const item of SEED_INTEGRATIONS) {
        await fetch('/api/governance/integrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
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
        <div style={{ width: 32, height: 32, border: '2px solid rgba(96,165,250,0.3)', borderTopColor: '#60a5fa', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: '0.8rem' }}>Cargando integraciones...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isEmpty = integrations.length === 0 && !activeType;
  const filtered = activeType ? integrations : integrations;

  const counts = { ok: 0, warn: 0, down: 0 };
  integrations.forEach(i => { counts[i.status] = (counts[i.status] || 0) + 1; });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Mapa de Integraciones</h2>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
            {isEmpty
              ? 'Sin integraciones aún — carga datos de ejemplo para comenzar'
              : `${integrations.length} integración${integrations.length !== 1 ? 'es' : ''} registradas`
            }
          </p>
        </div>
        {isEmpty && (
          <button
            onClick={handleSeed}
            disabled={seeding}
            style={{ padding: '8px 18px', borderRadius: 8, background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.35)', color: '#93c5fd', fontSize: '0.75rem', fontWeight: 600, cursor: seeding ? 'wait' : 'pointer', opacity: seeding ? 0.7 : 1 }}
          >
            {seeding ? 'Cargando...' : '+ Cargar datos ejemplo'}
          </button>
        )}
      </div>

      {/* Estado vacío */}
      {isEmpty && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 16, padding: '64px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '2.5rem' }}>🔌</span>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Sin integraciones registradas</h3>
          <p style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: 380, lineHeight: 1.6, margin: 0 }}>
            El catálogo de integraciones aún está vacío. Carga datos de ejemplo para ver el mapa completo.
          </p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            style={{ marginTop: 8, padding: '10px 24px', borderRadius: 10, background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.4)', color: '#93c5fd', fontSize: '0.8rem', fontWeight: 600, cursor: seeding ? 'wait' : 'pointer' }}
          >
            {seeding ? 'Cargando datos...' : 'Cargar datos de ejemplo'}
          </button>
        </div>
      )}

      {!isEmpty && (
        <>
          {/* Semáforo resumen */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {(Object.entries(STATUS_CONFIG) as [string, typeof STATUS_CONFIG[string]][]).map(([key, cfg]) => (
              <div key={key} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 18px', backdropFilter: 'blur(8px)' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{cfg.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: cfg.color }}>{counts[key as keyof typeof counts] ?? 0}</div>
              </div>
            ))}
          </div>

          {/* Filtros por tipo — glassmorphism cards */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveType(null)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: '1px solid',
                borderColor: activeType === null ? '#60a5fa' : 'rgba(255,255,255,0.1)',
                background: activeType === null ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.03)',
                color: activeType === null ? '#93c5fd' : '#64748b',
                fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                backdropFilter: 'blur(8px)',
              }}
            >
              Todos ({integrations.length})
            </button>
            {(Object.entries(TYPE_CONFIG) as [string, typeof TYPE_CONFIG[string]][]).map(([key, cfg]) => {
              const cnt = integrations.filter(i => i.type === key).length;
              const isActive = activeType === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveType(isActive ? null : key)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 20,
                    border: '1px solid',
                    borderColor: isActive ? cfg.color : 'rgba(255,255,255,0.08)',
                    background: isActive ? `${cfg.color}18` : 'rgba(255,255,255,0.03)',
                    color: isActive ? cfg.color : '#64748b',
                    fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {cfg.label} ({cnt})
                </button>
              );
            })}
          </div>

          {/* Tabla */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden', backdropFilter: 'blur(8px)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {['Servicio', 'Tipo', 'Proyectos', 'Status', 'Versión', 'Rate Limit', 'Costo/mes'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.62rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, idx) => {
                    const typeCfg = TYPE_CONFIG[item.type] || { label: item.type, color: '#94a3b8' };
                    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.ok;
                    return (
                      <tr
                        key={item.id}
                        style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(96,165,250,0.07)')}
                        onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)')}
                      >
                        <td style={{ padding: '10px 16px', color: '#e2e8f0', fontWeight: 600 }}>{item.service}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.62rem', fontWeight: 600, background: `${typeCfg.color}18`, color: typeCfg.color, border: `1px solid ${typeCfg.color}33` }}>{typeCfg.label}</span>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {(item.projects || []).map(p => (
                              <span key={p} style={{ padding: '1px 7px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 500, background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>{p}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusCfg.color, boxShadow: `0 0 5px ${statusCfg.color}` }} />
                            <span style={{ fontSize: '0.7rem', color: statusCfg.color, fontWeight: 600 }}>{statusCfg.label}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px', color: '#64748b', fontSize: '0.72rem' }}>{item.version || '—'}</td>
                        <td style={{ padding: '10px 16px', color: '#64748b', fontSize: '0.72rem' }}>{item.rate_limit || '—'}</td>
                        <td style={{ padding: '10px 16px', color: item.cost_monthly === 0 ? '#22c55e' : '#f1f5f9', fontWeight: 600, fontSize: '0.72rem' }}>
                          {item.cost_monthly === 0 ? 'Gratis' : item.cost_monthly != null ? `$${item.cost_monthly}/mes` : '—'}
                        </td>
                      </tr>
                    );
                  })}
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
