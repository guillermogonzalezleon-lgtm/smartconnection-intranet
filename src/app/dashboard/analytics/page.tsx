'use client';
import { useEffect, useState } from 'react';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Record<string, unknown>[]>([]);
  const [leadsCount, setLeadsCount] = useState(0);
  const [meetingsCount, setMeetingsCount] = useState(0);

  const api = (p: Record<string, unknown>) => fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).then(r => r.json());

  useEffect(() => {
    api({ action: 'query', table: 'analytics', order: 'created_at.desc', limit: 500 }).then(d => { if (d.data) setAnalytics(d.data); }).catch(() => {});
    api({ action: 'query', table: 'leads', limit: 1000 }).then(d => { if (d.data) setLeadsCount(d.data.length); }).catch(() => {});
    api({ action: 'query', table: 'reuniones', limit: 1000 }).then(d => { if (d.data) setMeetingsCount(d.data.length); }).catch(() => {});
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const week = new Date(Date.now() - 7 * 86400000).toISOString();
  const visitasHoy = analytics.filter(e => e.created_at && (e.created_at as string).startsWith(today)).length;
  const visitasSemana = analytics.filter(e => e.created_at && (e.created_at as string) >= week).length;

  const sources: Record<string, number> = {};
  analytics.forEach(e => { const s = (e.source as string) || 'direct'; sources[s] = (sources[s] || 0) + 1; });
  const sortedSources = Object.entries(sources).sort((a, b) => b[1] - a[1]);
  const maxSource = sortedSources[0]?.[1] || 1;

  const pages: Record<string, number> = {};
  analytics.forEach(e => { const p = (e.page as string) || '/'; pages[p] = (pages[p] || 0) + 1; });
  const sortedPages = Object.entries(pages).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const kpis = [
    { value: visitasHoy, label: 'Visitas hoy', color: '#00e5b0' },
    { value: visitasSemana, label: 'Visitas 7d', color: '#3b82f6' },
    { value: leadsCount, label: 'Leads totales', color: '#f59e0b' },
    { value: meetingsCount, label: 'Reuniones', color: '#8b5cf6' },
  ];

  return (
    <>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(17,24,39,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', height: 56, display: 'flex', alignItems: 'center', padding: '0 2rem', fontSize: '0.85rem', color: '#94a3b8' }}>
        Intranet <span style={{ margin: '0 8px', color: '#475569' }}>/</span> <span style={{ color: '#fff', fontWeight: 600 }}>Analytics</span>
      </div>
      <div style={{ padding: '1.5rem 2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1.25rem', borderTop: `3px solid ${k.color}` }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>{k.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#f1f5f9' }}><i className="bi bi-diagram-3" style={{ color: '#00e5b0' }}></i> Fuentes de tráfico</h3>
            {sortedSources.length === 0 ? <div style={{ color: '#475569', fontSize: '0.8rem' }}>Sin datos</div> : sortedSources.slice(0, 6).map(([name, count]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', minWidth: 80 }}>{name}</span>
                <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(count / maxSource) * 100}%`, background: '#00e5b0', borderRadius: 4 }}></div>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#475569', minWidth: 30, textAlign: 'right' }}>{count}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#f1f5f9' }}><i className="bi bi-file-earmark-text" style={{ color: '#00e5b0' }}></i> Páginas más visitadas</h3>
            {sortedPages.length === 0 ? <div style={{ color: '#475569', fontSize: '0.8rem' }}>Sin datos</div> : sortedPages.map(([page, count]) => (
              <div key={page} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.78rem' }}>
                <span style={{ color: '#94a3b8' }}>{page}</span>
                <span style={{ color: '#475569' }}>{count} views</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
