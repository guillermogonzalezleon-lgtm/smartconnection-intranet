'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ModalData {
  title: string;
  content: Record<string, unknown> | Record<string, unknown>[] | string;
}

export default function Dashboard() {
  const [agents, setAgents] = useState<Record<string, unknown>[]>([]);
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const [leads, setLeads] = useState(0);
  const [meetings, setMeetings] = useState(0);
  const [leadsData, setLeadsData] = useState<Record<string, unknown>[]>([]);
  const [meetingsData, setMeetingsData] = useState<Record<string, unknown>[]>([]);
  const [projects, setProjects] = useState<Record<string, unknown>[]>([]);
  const [modal, setModal] = useState<ModalData | null>(null);
  const [selectedLog, setSelectedLog] = useState<Record<string, unknown> | null>(null);
  const [tokensToday, setTokensToday] = useState(0);
  const [lastDeploy, setLastDeploy] = useState('—');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };
  const formattedDate = new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  const api = (payload: Record<string, unknown>) =>
    fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json());

  const refresh = () => {
    const done = () => setLoading(false);
    api({ action: 'list' }).then(d => { if (d.agents) setAgents(d.agents); done(); }).catch(done);
    api({ action: 'query', table: 'leads', order: 'created_at.desc', limit: 100 }).then(d => { if (d.data) { setLeads(d.data.length); setLeadsData(d.data); } }).catch(() => {});
    api({ action: 'query', table: 'reuniones', order: 'created_at.desc', limit: 100 }).then(d => { if (d.data) { setMeetings(d.data.length); setMeetingsData(d.data); } }).catch(() => {});
    api({ action: 'query', table: 'projects', limit: 4 }).then(d => { if (d.data) setProjects(d.data); }).catch(() => {});
    api({ action: 'query', table: 'agent_logs', order: 'created_at.desc', limit: 100 })
      .then(d => { if (d.data) { const total = d.data.reduce((s: number, r: Record<string, unknown>) => s + ((r.tokens_used as number) || 0), 0); setTokensToday(total); } }).catch(() => {});
    api({ action: 'logs', agentId: 'deployer' })
      .then(d => {
        if (d.logs && d.logs.length > 0) {
          const latest = d.logs[0];
          const mins = Math.round((Date.now() - new Date(latest.created_at as string).getTime()) / 60000);
          const timeStr = mins < 60 ? `hace ${mins}m` : mins < 1440 ? `hace ${Math.round(mins / 60)}h` : `hace ${Math.round(mins / 1440)}d`;
          const status = latest.status === 'error' ? '✗ Error' : '✓ AWS';
          setLastDeploy(`${timeStr} · ${status}`);
        }
      }).catch(() => {});
    Promise.all(['hoku','groq','claude','grok','deepseek','mistral','openai','cohere','openrouter','bedrock','gemini','deployer'].map(id => api({ action: 'logs', agentId: id })))
      .then(results => {
        const all = results.flatMap(r => r.logs || []).sort((a: Record<string, unknown>, b: Record<string, unknown>) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime());
        setLogs(all.slice(0, 15));
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
    hoku: { color: '#ff6b6b', icon: 'bi-stars' },
    groq: { color: '#f59e0b', icon: 'bi-cpu' },
    claude: { color: '#00e5b0', icon: 'bi-robot' },
    grok: { color: '#8b5cf6', icon: 'bi-lightning-charge' },
    deepseek: { color: '#0ea5e9', icon: 'bi-code-slash' },
    mistral: { color: '#f97316', icon: 'bi-translate' },
    openai: { color: '#10b981', icon: 'bi-braces' },
    cohere: { color: '#1e3a5f', icon: 'bi-file-text' },
    openrouter: { color: '#6366f1', icon: 'bi-shuffle' },
    bedrock: { color: '#f97316', icon: 'bi-cloud' },
    gemini: { color: '#22c55e', icon: 'bi-gem' },
    deployer: { color: '#3b82f6', icon: 'bi-gear-wide-connected' },
  };

  const kpis = [
    { icon: 'bi-robot', value: active, label: 'Agentes Activos', color: '#00e5b0', onClick: () => router.push('/dashboard/agents') },
    { icon: 'bi-lightning-charge', value: tasks, label: 'Tareas Hoy', color: '#8b5cf6', onClick: () => setModal({ title: 'Tareas de Hoy', content: `${tasks} tareas ejecutadas por ${agents.length} agentes configurados.` }) },
    { icon: 'bi-people', value: leads, label: 'Leads', color: '#3b82f6', onClick: () => setModal({ title: `Leads (${leads})`, content: leadsData.slice(0, 10) }) },
    { icon: 'bi-calendar-check', value: meetings, label: 'Reuniones', color: '#f59e0b', onClick: () => setModal({ title: `Reuniones (${meetings})`, content: meetingsData.slice(0, 10) }) },
    { icon: 'bi-rocket-takeoff', value: lastDeploy, label: 'Último Deploy', color: '#22c55e', small: true, onClick: () => setModal({ title: 'Deploy Info', content: 'Deploy automático cada push a main.\n\nAWS Amplify: intranet.smconnection.cl\nAWS S3+CloudFront: www.smconnection.cl' }) },
    { icon: 'bi-coin', value: tokensToday.toLocaleString(), label: 'Tokens IA', color: '#f97316', onClick: () => setModal({ title: 'Tokens IA', content: `Uso total: ${tokensToday.toLocaleString()} tokens\n\n10 agentes configurados:\nHoku (fusión 9 agentes)\nGroq: llama-3.3-70b (gratis)\nClaude: claude-haiku-4.5\nGrok: grok-3-mini\nDeepSeek: deepseek-chat\nMistral: mistral-small\nOpenAI: gpt-4o-mini\nCohere: command-a\nOpenRouter: llama-3.3-70b\nBedrock: claude-3.5-haiku` }) },
    { icon: 'bi-cloud-check', value: 'Live', label: 'AWS Status', color: '#f97316', onClick: () => router.push('/dashboard/aws') },
  ];

  const showAgentDetail = (a: Record<string, unknown>) => {
    const m = agentMeta[a.agent_id as string] || { color: '#94a3b8', icon: 'bi-cpu' };
    setModal({
      title: `${a.name as string} — ${a.provider as string}`,
      content: {
        'ID': a.agent_id,
        'Modelo': a.model || '—',
        'Rol': a.role,
        'Descripción': a.description,
        'Estado': a.active ? '✅ Activo' : '○ Standby',
        'API Key Env': a.api_key_env || '—',
        'Tareas': a.tasks_count || 0,
        'Color': m.color,
      },
    });
  };

  const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' };
  const modalBox: React.CSSProperties = { background: '#111827', border: '1px solid rgba(0,229,176,0.2)', borderRadius: 16, padding: '1.5rem', maxWidth: 560, width: '100%', maxHeight: '80vh', overflowY: 'auto', position: 'relative' };
  const modalTitle: React.CSSProperties = { fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8, color: '#f1f5f9' };
  const modalClose: React.CSSProperties = { position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' };

  const renderModalContent = (content: ModalData['content']) => {
    if (typeof content === 'string') {
      return <pre style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: "'JetBrains Mono', monospace" }}>{content}</pre>;
    }
    if (Array.isArray(content)) {
      if (content.length === 0) return <div style={{ color: '#475569', fontSize: '0.8rem' }}>Sin datos</div>;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {content.map((item, i) => (
            <div key={i} style={{ background: '#0a0d14', borderRadius: 10, padding: '0.75rem 1rem', border: '1px solid rgba(255,255,255,0.04)' }}>
              {Object.entries(item).filter(([k]) => !['id', 'created_at', 'updated_at'].includes(k)).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '0.75rem' }}>
                  <span style={{ color: '#64748b', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                  <span style={{ color: '#e2e8f0', maxWidth: '60%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(v ?? '—') as string}</span>
                </div>
              ))}
              {item.created_at ? <div style={{ fontSize: '0.6rem', color: '#475569', marginTop: 4 }}>{new Date(String(item.created_at)).toLocaleString('es-CL')}</div> : null}
            </div>
          ))}
        </div>
      );
    }
    // Object
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {Object.entries(content).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.8rem' }}>
            <span style={{ color: '#64748b' }}>{k}</span>
            <span style={{ color: '#e2e8f0', fontFamily: typeof v === 'string' && v.includes('-') ? "'JetBrains Mono', monospace" : 'inherit', fontSize: '0.78rem' }}>{String(v ?? '—')}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(17,24,39,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', height: 56, display: 'flex', alignItems: 'center', padding: '0 2rem', fontSize: '0.85rem', color: '#94a3b8' }}>
        <span>Intranet</span><span style={{ margin: '0 8px', color: '#475569' }}>/</span><span style={{ color: '#fff', fontWeight: 600 }}>Dashboard</span>
      </div>
      <div style={{ padding: '1.5rem 2rem', flex: 1 }}>
        {/* Welcome Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f1f5f9', margin: 0, lineHeight: 1.3 }}>{getGreeting()}, Guillermo 👋</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>{capitalizedDate}</p>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {loading ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: '#1e293b', marginBottom: 10, animation: 'shimmer 1.5s infinite' }}></div>
              <div style={{ width: '50%', height: 28, borderRadius: 6, background: '#1e293b', animation: 'shimmer 1.5s infinite' }}></div>
              <div style={{ width: '70%', height: 12, borderRadius: 4, background: '#1e293b', marginTop: 8, animation: 'shimmer 1.5s infinite' }}></div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: '#1e293b' }}></div>
            </div>
          )) : kpis.map((kpi, i) => (
            <div key={i} onClick={kpi.onClick} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1.25rem', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = kpi.color + '40'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
              <div style={{ fontSize: '1.1rem', marginBottom: 10, color: kpi.color }}><i className={`bi ${kpi.icon}`}></i></div>
              <div style={{ fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1, color: '#f1f5f9', fontSize: kpi.small ? '0.95rem' : '1.75rem' }}>{kpi.value}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 6, fontWeight: 500 }}>{kpi.label}</div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: kpi.color }}></div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { icon: 'bi-play-circle-fill', label: 'Ejecutar Agente', color: '#00e5b0', href: '/dashboard/agents' },
            { icon: 'bi-person-plus-fill', label: 'Nuevo Lead', color: '#3b82f6', href: '/dashboard/leads' },
            { icon: 'bi-kanban-fill', label: 'Ver Proyectos', color: '#8b5cf6', href: '/dashboard/projects' },
            { icon: 'bi-bar-chart-line-fill', label: 'Analytics', color: '#f59e0b', href: '/dashboard/analytics' },
          ].map((btn, i) => (
            <div key={i} onClick={() => router.push(btn.href)} style={{ background: 'rgba(17,24,39,0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = btn.color + '50'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${btn.color}15`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: btn.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: btn.color }}>
                <i className={`bi ${btn.icon}`}></i>
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>{btn.label}</span>
            </div>
          ))}
        </div>

        {/* Agents + Live Feed */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '0.75rem' }}>
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><i className="bi bi-robot" style={{ color: '#00e5b0' }}></i> Agentes IA — Estado</h3>
              <a href="/dashboard/agents" style={{ fontSize: '0.7rem', color: '#94a3b8', textDecoration: 'none' }}>Ver todos →</a>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={{ textAlign: 'left', padding: '0.6rem 1rem', fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Agente</th>
                  <th style={{ textAlign: 'left', padding: '0.6rem 1rem', fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Provider</th>
                  <th style={{ textAlign: 'left', padding: '0.6rem 1rem', fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Modelo</th>
                  <th style={{ textAlign: 'left', padding: '0.6rem 1rem', fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Estado</th>
                  <th style={{ textAlign: 'left', padding: '0.6rem 1rem', fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Tareas</th>
                </tr></thead>
                <tbody>
                  {loading ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} style={{ padding: '0.6rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ width: j === 0 ? '80%' : j === 3 ? 60 : '60%', height: 14, borderRadius: 4, background: '#1e293b', animation: 'shimmer 1.5s infinite' }}></div>
                        </td>
                      ))}
                    </tr>
                  )) : agents.map((a, i) => {
                    const m = agentMeta[a.agent_id as string] || { color: '#94a3b8', icon: 'bi-cpu' };
                    return (
                      <tr key={i} onClick={() => showAgentDetail(a)} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,176,0.04)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                        <td style={{ padding: '0.6rem 1rem', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#e2e8f0', fontWeight: 600 }}>
                          <i className={`bi ${m.icon}`} style={{ color: m.color, marginRight: 8 }}></i>{a.name as string}
                        </td>
                        <td style={{ padding: '0.6rem 1rem', fontSize: '0.7rem', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.04)', textTransform: 'capitalize' }}>{(a.provider as string) || '—'}</td>
                        <td style={{ padding: '0.6rem 1rem', fontSize: '0.7rem', fontFamily: "'JetBrains Mono', monospace", color: '#64748b', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{(a.model as string) || '—'}</td>
                        <td style={{ padding: '0.6rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: a.active ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)', color: a.active ? '#22c55e' : '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: a.active ? '#22c55e' : '#f59e0b', display: 'inline-block', boxShadow: a.active ? '0 0 6px #22c55e' : 'none' }}></span>
                            {a.active ? 'Activo' : 'Standby'}
                          </span>
                        </td>
                        <td style={{ padding: '0.6rem 1rem', fontSize: '0.8rem', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{(a.tasks_count as number) || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><i className="bi bi-terminal" style={{ color: '#00e5b0' }}></i> Live Feed</h3>
            </div>
            <div style={{ padding: '1rem', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', lineHeight: 1.7, maxHeight: 320, overflowY: 'auto', background: '#0a0d14' }}>
              {logs.length === 0 ? (
                <div style={{ color: '#475569' }}>Esperando actividad...</div>
              ) : logs.map((l, i) => {
                const fullText = (l.detail || l.action) as string || '';
                const isTruncated = fullText.length > 60;
                const isExpanded = selectedLog === l;
                return (
                <div key={i} onClick={() => setSelectedLog(isExpanded ? null : l)} style={{ display: 'flex', gap: 12, marginBottom: 2, cursor: 'pointer', padding: '2px 4px', borderRadius: 4, background: isExpanded ? 'rgba(0,229,176,0.06)' : 'transparent', transition: 'background 0.15s', borderLeft: isExpanded ? '2px solid rgba(0,229,176,0.4)' : '2px solid transparent' }}>
                  <span style={{ color: '#475569', minWidth: 62, flexShrink: 0 }}>
                    {l.created_at ? new Date(l.created_at as string).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
                  </span>
                  <span style={{ fontWeight: 600, minWidth: 50, flexShrink: 0, color: l.status === 'error' ? '#ef4444' : '#00e5b0' }}>
                    {((l.agent_name || l.agent_id) as string || '').toUpperCase().substring(0, 6)}
                  </span>
                  <span style={{ color: '#94a3b8', flex: 1, whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap', wordBreak: isExpanded ? 'break-word' : undefined, overflow: isExpanded ? 'visible' : 'hidden', textOverflow: isExpanded ? undefined : 'ellipsis' }}>
                    {isExpanded ? fullText : fullText.substring(0, 60) + (isTruncated ? '...' : '')}
                    {isTruncated && <span style={{ color: '#475569', fontSize: '0.6rem', marginLeft: 4 }}>{isExpanded ? '▲' : '▼'}</span>}
                  </span>
                </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Proyectos Recientes */}
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}><i className="bi bi-kanban" style={{ color: '#8b5cf6' }}></i> Proyectos Recientes</h3>
            <a href="/dashboard/projects" style={{ fontSize: '0.7rem', color: '#94a3b8', textDecoration: 'none' }}>Ver todos →</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            {loading ? Array.from({ length: 2 }).map((_, i) => (
              <div key={i} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ width: '60%', height: 14, borderRadius: 4, background: '#1e293b', animation: 'shimmer 1.5s infinite' }}></div>
                  <div style={{ width: 50, height: 16, borderRadius: 999, background: '#1e293b', animation: 'shimmer 1.5s infinite' }}></div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 999, height: 6, overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{ height: '100%', width: '30%', background: '#1e293b', borderRadius: 999, animation: 'shimmer 1.5s infinite' }}></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ width: 30, height: 10, borderRadius: 4, background: '#1e293b', animation: 'shimmer 1.5s infinite' }}></div>
                  <div style={{ width: '40%', height: 10, borderRadius: 4, background: '#1e293b', animation: 'shimmer 1.5s infinite' }}></div>
                </div>
              </div>
            )) : projects.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '2rem', textAlign: 'center', color: '#475569', fontSize: '0.8rem' }}>Sin proyectos</div>
            ) : projects.map((p, i) => {
              const statusColors: Record<string, { bg: string; text: string }> = {
                activo: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e' },
                active: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e' },
                completado: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
                completed: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
                pausado: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
                paused: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
              };
              const st = statusColors[((p.status as string) || '').toLowerCase()] || { bg: 'rgba(148,163,184,0.12)', text: '#94a3b8' };
              const progress = (p.progress as number) || 0;
              return (
                <div key={i} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.25rem', transition: 'all 0.2s', cursor: 'pointer' }}
                  onClick={() => setModal({ title: (p.name as string) || 'Proyecto', content: p })}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.3)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{(p.name as string) || 'Sin nombre'}</span>
                    <span style={{ fontSize: '0.55rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: st.bg, color: st.text, textTransform: 'capitalize' }}>{(p.status as string) || '—'}</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 999, height: 6, overflow: 'hidden', marginBottom: 10 }}>
                    <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)', borderRadius: 999, transition: 'width 0.4s ease' }}></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{progress}%</span>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{(p.owner as string) || '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Shimmer animation */}
      <style>{`@keyframes shimmer { 0% { opacity: 0.3; } 50% { opacity: 0.6; } 100% { opacity: 0.3; } }`}</style>

      {/* Modal */}
      {modal && (
        <div style={modalOverlay} onClick={() => setModal(null)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <button onClick={() => setModal(null)} style={modalClose}><i className="bi bi-x-lg"></i></button>
            <div style={modalTitle}><i className="bi bi-info-circle" style={{ color: '#00e5b0' }}></i> {modal.title}</div>
            {renderModalContent(modal.content)}
          </div>
        </div>
      )}
    </>
  );
}
