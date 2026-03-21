'use client';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [agents, setAgents] = useState<Record<string, unknown>[]>([]);
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const [leads, setLeads] = useState(0);
  const [meetings, setMeetings] = useState(0);

  const api = (payload: Record<string, unknown>) =>
    fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json());

  const refresh = () => {
    api({ action: 'list' }).then(d => { if (d.agents) setAgents(d.agents); });
    api({ action: 'query', table: 'leads', limit: 1000 }).then(d => { if (d.data) setLeads(d.data.length); }).catch(() => {});
    api({ action: 'query', table: 'reuniones', limit: 1000 }).then(d => { if (d.data) setMeetings(d.data.length); }).catch(() => {});
    Promise.all(['claude','groq','grok','gemini','deployer'].map(id => api({ action: 'logs', agentId: id })))
      .then(results => {
        const all = results.flatMap(r => r.logs || []).sort((a: Record<string, unknown>, b: Record<string, unknown>) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime());
        setLogs(all.slice(0, 10));
      }).catch(() => {});
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    const onVis = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  const active = agents.filter(a => a.active).length;
  const tasks = agents.reduce((s, a) => s + ((a.tasks_count as number) || 0), 0);

  const agentMeta: Record<string, { color: string; icon: string }> = {
    claude: { color: '#00e5b0', icon: 'bi-robot' },
    groq: { color: '#f59e0b', icon: 'bi-cpu' },
    grok: { color: '#8b5cf6', icon: 'bi-lightning-charge' },
    gemini: { color: '#22c55e', icon: 'bi-gem' },
    deployer: { color: '#3b82f6', icon: 'bi-gear-wide-connected' },
  };

  const kpis = [
    { icon: 'bi-robot', value: active, label: 'Agentes Activos', color: '#00e5b0' },
    { icon: 'bi-lightning-charge', value: tasks, label: 'Tareas Hoy', color: '#8b5cf6' },
    { icon: 'bi-people', value: leads, label: 'Leads', color: '#3b82f6' },
    { icon: 'bi-calendar-check', value: meetings, label: 'Reuniones', color: '#f59e0b' },
    { icon: 'bi-rocket-takeoff', value: new Date().toLocaleDateString('es-CL'), label: 'Último Deploy', color: '#22c55e', small: true },
    { icon: 'bi-coin', value: 0, label: 'Tokens IA', color: '#f97316' },
  ];

  const s = {
    topbar: { position: 'sticky' as const, top: 0, zIndex: 50, background: 'rgba(17,24,39,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', height: 56, display: 'flex', alignItems: 'center', padding: '0 2rem', fontSize: '0.85rem', color: '#94a3b8' },
    page: { padding: '1.5rem 2rem', flex: 1 },
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' },
    kpiCard: { background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1.25rem', position: 'relative' as const, overflow: 'hidden' as const },
    kpiIcon: { fontSize: '1.1rem', marginBottom: 10 },
    kpiValue: { fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1, color: '#f1f5f9' },
    kpiLabel: { fontSize: '0.7rem', color: '#94a3b8', marginTop: 6, fontWeight: 500 },
    kpiAccent: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, height: 3 },
    grid: { display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '0.75rem' },
    card: { background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' as const },
    cardHeader: { padding: '0.875rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    cardTitle: { fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 },
    th: { textAlign: 'left' as const, padding: '0.6rem 1rem', fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' },
    td: { padding: '0.6rem 1rem', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#e2e8f0' },
    badge: (active: boolean) => ({ fontSize: '0.6rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: active ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)', color: active ? '#22c55e' : '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: 4 }),
    dot: (active: boolean) => ({ width: 6, height: 6, borderRadius: '50%', background: active ? '#22c55e' : '#f59e0b', display: 'inline-block', boxShadow: active ? '0 0 6px #22c55e' : 'none' }),
    terminal: { padding: '1rem', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', lineHeight: 1.7, maxHeight: 280, overflowY: 'auto' as const, background: '#0a0d14' },
    logLine: { display: 'flex', gap: 12, marginBottom: 2 },
    logTime: { color: '#475569', minWidth: 62 },
    link: { fontSize: '0.7rem', color: '#94a3b8', textDecoration: 'none' },
  };

  return (
    <>
      <div style={s.topbar}>
        <span>Intranet</span>
        <span style={{ margin: '0 8px', color: '#475569' }}>/</span>
        <span style={{ color: '#fff', fontWeight: 600 }}>Dashboard</span>
      </div>
      <div style={s.page}>
        {/* KPIs */}
        <div style={s.kpiGrid}>
          {kpis.map((kpi, i) => (
            <div key={i} style={s.kpiCard}>
              <div style={{ ...s.kpiIcon, color: kpi.color }}><i className={`bi ${kpi.icon}`}></i></div>
              <div style={{ ...s.kpiValue, fontSize: kpi.small ? '0.95rem' : '1.75rem' }}>{kpi.value}</div>
              <div style={s.kpiLabel}>{kpi.label}</div>
              <div style={{ ...s.kpiAccent, background: kpi.color }}></div>
            </div>
          ))}
        </div>

        {/* Agents + Live Feed */}
        <div style={s.grid}>
          <div style={s.card}>
            <div style={s.cardHeader}>
              <h3 style={s.cardTitle}><i className="bi bi-robot" style={{ color: '#00e5b0' }}></i> Agentes IA — Estado</h3>
              <a href="/dashboard/agents" style={s.link}>Ver todos →</a>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={s.th}>Agente</th>
                    <th style={s.th}>Modelo</th>
                    <th style={s.th}>Estado</th>
                    <th style={s.th}>Tareas</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a, i) => {
                    const m = agentMeta[a.agent_id as string] || { color: '#94a3b8', icon: 'bi-cpu' };
                    return (
                      <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ ...s.td, fontWeight: 600 }}>
                          <i className={`bi ${m.icon}`} style={{ color: m.color, marginRight: 8 }}></i>
                          {a.name as string}
                        </td>
                        <td style={{ ...s.td, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: '#64748b' }}>
                          {(a.model as string) || '—'}
                        </td>
                        <td style={s.td}>
                          <span style={s.badge(!!a.active)}>
                            <span style={s.dot(!!a.active)}></span>
                            {a.active ? 'Activo' : 'Standby'}
                          </span>
                        </td>
                        <td style={{ ...s.td, color: '#94a3b8' }}>{(a.tasks_count as number) || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={s.card}>
            <div style={s.cardHeader}>
              <h3 style={s.cardTitle}><i className="bi bi-terminal" style={{ color: '#00e5b0' }}></i> Live Feed</h3>
            </div>
            <div style={s.terminal}>
              {logs.length === 0 ? (
                <div style={{ color: '#475569' }}>Esperando actividad...</div>
              ) : logs.map((l, i) => (
                <div key={i} style={s.logLine}>
                  <span style={s.logTime}>
                    {l.created_at ? new Date(l.created_at as string).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
                  </span>
                  <span style={{ fontWeight: 600, minWidth: 50, color: l.status === 'error' ? '#ef4444' : '#00e5b0' }}>
                    {((l.agent_name || l.agent_id) as string || '').toUpperCase().substring(0, 6)}
                  </span>
                  <span style={{ color: '#94a3b8' }}>
                    {((l.detail || l.action) as string || '').substring(0, 80)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
