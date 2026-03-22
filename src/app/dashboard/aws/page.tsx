'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

type HealthEntry = { url: string; status: 'checking' | 'ok' | 'error'; latency: number };
type DeployLog = { id: string; action: string; detail: string; status: string; created_at: string };

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
const card: React.CSSProperties = { background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem' };
const badge = (color: string): React.CSSProperties => ({ fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: `${color}18`, color, display: 'inline-flex', alignItems: 'center', gap: 4 });
const sectionTitle: React.CSSProperties = { fontSize: '0.9rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#f1f5f9' };
const gridInfo: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.78rem' };
const labelStyle: React.CSSProperties = { color: '#64748b' };
const valStyle: React.CSSProperties = { ...mono, color: '#cbd5e1' };
const btnBase: React.CSSProperties = { border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' };

const ENDPOINTS = [
  'https://smconnection.cl',
  'https://intranet.smconnection.cl',
];

export default function AWSPage() {
  const [healthChecks, setHealthChecks] = useState<HealthEntry[]>(ENDPOINTS.map(url => ({ url, status: 'checking', latency: 0 })));
  const [deploys, setDeploys] = useState<DeployLog[]>([]);
  const [invalidating, setInvalidating] = useState(false);
  const [invalidateMsg, setInvalidateMsg] = useState('');
  const metricsRef = useRef<HTMLDivElement>(null);
  const logsRef = useRef<HTMLDivElement>(null);

  const api = useCallback((payload: Record<string, unknown>) =>
    fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json()), []);

  const deployApi = useCallback((payload: Record<string, unknown>) =>
    fetch('/api/deploy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json()), []);

  const checkHealth = useCallback(async () => {
    const results = await Promise.all(ENDPOINTS.map(async (url) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const start = performance.now();
        try {
          await fetch(url, { mode: 'no-cors', cache: 'no-store' });
          return { url, status: 'ok' as const, latency: Math.round(performance.now() - start) };
        } catch {
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, 500));
            continue;
          }
          return { url, status: 'error' as const, latency: Math.round(performance.now() - start) };
        }
      }
      return { url, status: 'error' as const, latency: 0 };
    }));
    setHealthChecks(results);
  }, []);

  const loadDeploys = useCallback(() => {
    api({ action: 'query', table: 'agent_logs', filter: 'agent_id=eq.deployer', order: 'created_at.desc', limit: 5 })
      .then(d => { if (d.data) setDeploys(d.data); })
      .catch(() => {});
  }, [api]);

  useEffect(() => {
    checkHealth();
    loadDeploys();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth, loadDeploys]);

  const handleInvalidate = async () => {
    setInvalidating(true);
    setInvalidateMsg('');
    try {
      const res = await deployApi({ action: 'trigger_deploy', repo: 'guillermogonzalezleon-lgtm/smartconnection-astro' });
      setInvalidateMsg(res.error ? `Error: ${res.error}` : 'Invalidación iniciada');
      loadDeploys();
    } catch { setInvalidateMsg('Error de conexión'); }
    finally { setInvalidating(false); }
  };

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    return `hace ${Math.floor(hrs / 24)}d`;
  };

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(17,24,39,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', height: 56, display: 'flex', alignItems: 'center', padding: '0 2rem', fontSize: '0.85rem', color: '#94a3b8' }}>
        Intranet <span style={{ margin: '0 8px', color: '#475569' }}>/</span> <span style={{ color: '#fff', fontWeight: 600 }}>AWS Panel</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={badge('#22c55e')}>● Operativo</span>
        </div>
      </div>

      <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
          <a href="/dashboard/deploy" style={{ ...btnBase, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', textDecoration: 'none', justifyContent: 'center' }}>
            🚀 Deploy Ahora
          </a>
          <button onClick={handleInvalidate} disabled={invalidating} style={{ ...btnBase, background: 'rgba(249,115,22,0.12)', color: '#f97316', justifyContent: 'center', opacity: invalidating ? 0.6 : 1 }}>
            🔄 {invalidating ? 'Invalidando...' : 'Invalidar CDN'}
          </button>
          <button onClick={() => scrollTo(metricsRef)} style={{ ...btnBase, background: 'rgba(59,130,246,0.12)', color: '#3b82f6', justifyContent: 'center' }}>
            📊 Ver Métricas
          </button>
          <button onClick={() => scrollTo(logsRef)} style={{ ...btnBase, background: 'rgba(34,197,94,0.12)', color: '#22c55e', justifyContent: 'center' }}>
            📋 Ver Logs
          </button>
        </div>
        {invalidateMsg && (
          <div style={{ fontSize: '0.75rem', color: invalidateMsg.startsWith('Error') ? '#ef4444' : '#22c55e', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
            {invalidateMsg}
          </div>
        )}

        {/* S3 + CloudFront side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

          {/* S3 Section */}
          <div style={{ ...card, borderTop: '3px solid #f97316' }}>
            <h3 style={sectionTitle}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(249,115,22,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>🪣</span>
              S3 Bucket
              <span style={{ ...badge('#22c55e'), marginLeft: 'auto' }}>● Operational</span>
            </h3>
            <div style={gridInfo}>
              <div><span style={labelStyle}>Bucket:</span></div>
              <div style={valStyle}>smartconnetion25</div>
              <div><span style={labelStyle}>Región:</span></div>
              <div style={valStyle}>sa-east-1</div>
              <div><span style={labelStyle}>Objetos:</span></div>
              <div style={valStyle}>~2,450</div>
              <div><span style={labelStyle}>Tamaño:</span></div>
              <div style={valStyle}>~185 MB</div>
              <div><span style={labelStyle}>Versionado:</span></div>
              <div style={{ color: '#22c55e' }}>✓ Habilitado</div>
              <div><span style={labelStyle}>Cifrado:</span></div>
              <div style={{ color: '#22c55e' }}>✓ AES-256</div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={handleInvalidate} style={{ ...btnBase, background: 'rgba(249,115,22,0.1)', color: '#f97316', fontSize: '0.72rem', padding: '7px 14px' }}>
                🔄 Sync Manual
              </button>
              <a href="https://s3.console.aws.amazon.com/s3/buckets/smartconnetion25" target="_blank" rel="noopener noreferrer" style={{ ...btnBase, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: '0.72rem', padding: '7px 14px', textDecoration: 'none' }}>
                📂 Explorar
              </a>
            </div>
          </div>

          {/* CloudFront Section */}
          <div style={{ ...card, borderTop: '3px solid #3b82f6' }}>
            <h3 style={sectionTitle}>
              <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>⚡</span>
              CloudFront CDN
              <span style={{ ...badge('#22c55e'), marginLeft: 'auto' }}>● Deployed</span>
            </h3>
            <div style={gridInfo}>
              <div><span style={labelStyle}>Distribution:</span></div>
              <div style={valStyle}>E3O4YBX3RKHQUL</div>
              <div><span style={labelStyle}>Domain:</span></div>
              <div style={valStyle}>d5bva36ud3xmb.cloudfront.net</div>
              <div><span style={labelStyle}>Aliases:</span></div>
              <div style={{ color: '#cbd5e1', fontSize: '0.76rem' }}>smconnection.cl, www.smconnection.cl</div>
              <div><span style={labelStyle}>HTTP/3:</span></div>
              <div style={{ color: '#22c55e', fontWeight: 600 }}>✓ Habilitado</div>
              <div><span style={labelStyle}>Compresión:</span></div>
              <div style={{ color: '#22c55e', fontWeight: 600 }}>✓ Gzip + Brotli</div>
              <div><span style={labelStyle}>Price Class:</span></div>
              <div style={valStyle}>PriceClass_All</div>
            </div>
          </div>
        </div>

        {/* Health Checks */}
        <div ref={metricsRef} style={card}>
          <h3 style={sectionTitle}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>💚</span>
            Health Checks
            <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#64748b', fontWeight: 400 }}>Auto-refresh cada 30s</span>
            <button onClick={checkHealth} style={{ ...btnBase, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: '0.65rem', padding: '5px 10px', marginLeft: 8 }}>
              🔄 Refresh
            </button>
          </h3>
          <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Table Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '10px 16px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.68rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <div>Endpoint</div>
              <div style={{ textAlign: 'center' }}>Status</div>
              <div style={{ textAlign: 'right' }}>Latencia</div>
            </div>
            {healthChecks.map((h, i) => (
              <div key={h.url} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '12px 16px', borderBottom: i < healthChecks.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center', transition: 'background 0.15s' }}>
                <div style={{ ...mono, fontSize: '0.78rem', color: '#e2e8f0' }}>{h.url.replace('https://', '')}</div>
                <div style={{ textAlign: 'center' }}>
                  {h.status === 'checking' && <span style={badge('#f59e0b')}>⏳ Checking</span>}
                  {h.status === 'ok' && <span style={badge('#22c55e')}>● Online</span>}
                  {h.status === 'error' && <span style={badge('#ef4444')}>● Error</span>}
                </div>
                <div style={{ textAlign: 'right', ...mono, fontSize: '0.75rem', color: h.latency < 500 ? '#22c55e' : h.latency < 1500 ? '#f59e0b' : '#ef4444' }}>
                  {h.status === 'checking' ? '...' : `${h.latency}ms`}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deploy History */}
        <div ref={logsRef} style={card}>
          <h3 style={sectionTitle}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>📋</span>
            Deploy History
            <button onClick={loadDeploys} style={{ ...btnBase, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: '0.65rem', padding: '5px 10px', marginLeft: 'auto' }}>
              🔄 Refresh
            </button>
          </h3>
          {deploys.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#475569', fontSize: '0.8rem' }}>
              No hay registros de deploy recientes
            </div>
          ) : (
            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
              {/* Table Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', padding: '10px 16px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.68rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <div>Acción</div>
                <div>Detalle</div>
                <div style={{ textAlign: 'center' }}>Status</div>
                <div style={{ textAlign: 'right' }}>Fecha</div>
              </div>
              {deploys.map((d, i) => (
                <div key={d.id || i} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', padding: '12px 16px', borderBottom: i < deploys.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 500 }}>{d.action || 'deploy'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.detail || '—'}</div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={badge(d.status === 'success' ? '#22c55e' : d.status === 'error' ? '#ef4444' : '#f59e0b')}>
                      {d.status === 'success' ? '✓' : d.status === 'error' ? '✗' : '●'} {d.status}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', ...mono, fontSize: '0.7rem', color: '#64748b' }}>
                    {d.created_at ? timeAgo(d.created_at) : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
