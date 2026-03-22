'use client';
import { useState, useEffect, useCallback } from 'react';

const AGENTS: Record<string, { name: string; color: string }> = {
  hoku: { name: 'Hoku', color: '#ff6b6b' },
  groq: { name: 'Groq', color: '#f59e0b' },
  claude: { name: 'Claude', color: '#00e5b0' },
  gemini: { name: 'Gemini', color: '#22c55e' },
};

type Status = 'pendiente' | 'en_revision' | 'deployado';

interface Improvement {
  id: string;
  titulo: string;
  descripcion: string;
  agente: string;
  status: Status;
  created_at: string;
  categoria?: string;
  impacto?: string;
  commit_url?: string;
  files_affected?: string[];
  diff?: string;
  ciclo?: number;
}

const STATUS_MAP: Record<Status, { label: string; color: string; bg: string }> = {
  pendiente: { label: 'Pendiente', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  en_revision: { label: 'En revision', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  deployado: { label: 'Deployado', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days}d`;
  return `hace ${Math.floor(days / 30)} mes(es)`;
}

export default function ImprovementsPage() {
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todos' | Status>('todos');
  const [agentFilter, setAgentFilter] = useState<string>('todos');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDiffId, setShowDiffId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'query', table: 'ux_insights', order: 'created_at.desc', limit: 50 }),
      });
      const data = await res.json();
      if (data.data && Array.isArray(data.data)) {
        setImprovements(data.data.map((d: Record<string, unknown>, i: number) => ({
          id: (d.id as string) || String(i),
          titulo: (d.titulo as string) || 'Sin titulo',
          descripcion: (d.descripcion as string) || '',
          agente: (d.agente as string) || 'hoku',
          status: (['pendiente', 'en_revision', 'deployado'].includes(d.status as string) ? d.status : 'pendiente') as Status,
          created_at: (d.created_at as string) || new Date().toISOString(),
          categoria: (d.categoria as string) || '',
          impacto: (d.impacto as string) || '',
          commit_url: (d.commit_url as string) || '',
          files_affected: Array.isArray(d.files_affected) ? d.files_affected as string[] : [],
          diff: (d.diff as string) || '',
          ciclo: (d.ciclo as number) || 0,
        })));
      }
    } catch (err) {
      console.error('Error fetching improvements:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = improvements.filter(imp => {
    if (filter !== 'todos' && imp.status !== filter) return false;
    if (agentFilter !== 'todos' && imp.agente !== agentFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!imp.titulo.toLowerCase().includes(q) && !imp.descripcion.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const lastImprovement = improvements.length > 0 ? improvements[0] : null;

  const handleDeploy = async (imp: Improvement) => {
    try {
      await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', table: 'ux_insights', id: imp.id, data: { status: 'deployado' } }),
      });
      setImprovements(prev => prev.map(i => i.id === imp.id ? { ...i, status: 'deployado' as Status } : i));
    } catch (err) {
      console.error('Deploy error:', err);
    }
  };

  const handleRevert = async (imp: Improvement) => {
    try {
      await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', table: 'ux_insights', id: imp.id, data: { status: 'pendiente' } }),
      });
      setImprovements(prev => prev.map(i => i.id === imp.id ? { ...i, status: 'pendiente' as Status } : i));
    } catch (err) {
      console.error('Revert error:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 34px)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, background: 'rgba(15,22,35,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ height: 48, display: 'flex', alignItems: 'center', padding: '0 1.5rem', fontSize: '0.82rem', color: '#94a3b8' }}>
          <span>Intranet</span>
          <span style={{ margin: '0 8px', color: '#475569' }}>/</span>
          <span style={{ color: '#fff', fontWeight: 600 }}>Improvements</span>
        </div>
      </div>

      {/* Title bar */}
      <div style={{ flexShrink: 0, padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0a0d14' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/img/hoku.jpg" alt="Hoku" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,107,107,0.3)' }} />
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
              Improvements
              <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>
                {improvements.length}
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 2 }}>
              {lastImprovement ? `Ultima: ${timeAgo(lastImprovement.created_at)}` : 'Sin mejoras registradas'}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          {(['todos', 'pendiente', 'en_revision', 'deployado'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
              border: filter === f ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.06)',
              color: filter === f ? '#a78bfa' : '#64748b',
              padding: '5px 12px', borderRadius: 7, fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer',
              fontFamily: "'Inter', system-ui", transition: 'all 0.15s',
            }}>
              {f === 'todos' ? 'Todos' : STATUS_MAP[f].label}
            </button>
          ))}

          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)', margin: '0 4px' }} />

          {['todos', ...Object.keys(AGENTS)].map(a => (
            <button key={a} onClick={() => setAgentFilter(a)} style={{
              background: agentFilter === a ? (a === 'todos' ? 'rgba(139,92,246,0.15)' : `${AGENTS[a]?.color || '#8b5cf6'}15`) : 'rgba(255,255,255,0.03)',
              border: agentFilter === a ? `1px solid ${a === 'todos' ? 'rgba(139,92,246,0.3)' : (AGENTS[a]?.color || '#8b5cf6') + '40'}` : '1px solid rgba(255,255,255,0.06)',
              color: agentFilter === a ? (a === 'todos' ? '#a78bfa' : AGENTS[a]?.color || '#a78bfa') : '#64748b',
              padding: '5px 12px', borderRadius: 7, fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer',
              fontFamily: "'Inter', system-ui", transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              {a !== 'todos' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: AGENTS[a]?.color || '#8b5cf6' }} />}
              {a === 'todos' ? 'Todos' : AGENTS[a]?.name || a}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por titulo o descripcion..."
            style={{
              background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
              padding: '6px 12px', color: '#e2e8f0', fontSize: '0.72rem', fontFamily: "'Inter', system-ui",
              outline: 'none', width: 240, transition: 'border-color 0.15s',
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ textAlign: 'center', color: '#334155' }}>
              <div style={{ width: 24, height: 24, border: '3px solid #1e293b', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <div style={{ fontSize: '0.78rem' }}>Cargando mejoras...</div>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <img src="/img/hoku.jpg" alt="Hoku" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 14px', opacity: 0.5 }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                {improvements.length === 0 ? 'Sin mejoras registradas' : 'No hay resultados para este filtro'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#1e293b', marginTop: 6 }}>
                Las mejoras generadas por agentes apareceran aqui
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(imp => {
              const agent = AGENTS[imp.agente] || { name: imp.agente, color: '#8b5cf6' };
              const status = STATUS_MAP[imp.status] || STATUS_MAP.pendiente;
              const isExpanded = expandedId === imp.id;
              const showDiff = showDiffId === imp.id;
              const preview = imp.descripcion.length > 200 ? imp.descripcion.slice(0, 200) + '...' : imp.descripcion;

              return (
                <div key={imp.id} style={{
                  background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14,
                  overflow: 'hidden', transition: 'border-color 0.2s',
                }}>
                  {/* Card header */}
                  <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{
                          fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                          background: `${agent.color}15`, color: agent.color, border: `1px solid ${agent.color}30`,
                          display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: agent.color }} />
                          {agent.name}
                        </span>
                        <span style={{
                          fontSize: '0.6rem', fontWeight: 600, padding: '2px 8px', borderRadius: 5,
                          background: status.bg, color: status.color, border: `1px solid ${status.color}30`,
                        }}>
                          {status.label}
                        </span>
                        {imp.categoria && (
                          <span style={{ fontSize: '0.58rem', color: '#475569', fontWeight: 500 }}>
                            {imp.categoria}
                          </span>
                        )}
                        <span style={{ fontSize: '0.6rem', color: '#334155', marginLeft: 'auto', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>
                          {timeAgo(imp.created_at)}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.4, marginBottom: 6 }}>
                        {imp.titulo}
                      </div>

                      <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {isExpanded ? imp.descripcion : preview}
                      </div>

                      {/* Files affected */}
                      {imp.files_affected && imp.files_affected.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {imp.files_affected.map((f, i) => (
                            <span key={i} style={{
                              fontSize: '0.58rem', padding: '2px 6px', borderRadius: 4,
                              background: 'rgba(59,130,246,0.08)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.15)',
                              fontFamily: "'JetBrains Mono', monospace",
                            }}>
                              {f}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Diff view */}
                      {showDiff && imp.diff && (
                        <div style={{
                          marginTop: 10, background: '#0a0d14', borderRadius: 8, padding: '10px 12px',
                          border: '1px solid rgba(255,255,255,0.04)', maxHeight: 300, overflow: 'auto',
                        }}>
                          <pre style={{
                            fontSize: '0.62rem', color: '#94a3b8', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap',
                            fontFamily: "'JetBrains Mono', monospace",
                          }}>
                            {imp.diff.split('\n').map((line, i) => (
                              <div key={i} style={{
                                color: line.startsWith('+') ? '#22c55e' : line.startsWith('-') ? '#ef4444' : line.startsWith('@@') ? '#8b5cf6' : '#64748b',
                              }}>
                                {line}
                              </div>
                            ))}
                          </pre>
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : imp.id)}
                          style={{
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 6, padding: '4px 10px', color: '#64748b', fontSize: '0.63rem',
                            cursor: 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          {isExpanded ? '▲ Colapsar' : '▼ Ver detalle'}
                        </button>

                        {imp.status !== 'deployado' && (
                          <button
                            onClick={() => handleDeploy(imp)}
                            style={{
                              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                              borderRadius: 6, padding: '4px 10px', color: '#22c55e', fontSize: '0.63rem',
                              cursor: 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 4,
                            }}
                          >
                            🚀 Deploy
                          </button>
                        )}

                        {imp.status === 'deployado' && (
                          <button
                            onClick={() => handleRevert(imp)}
                            style={{
                              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                              borderRadius: 6, padding: '4px 10px', color: '#ef4444', fontSize: '0.63rem',
                              cursor: 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 4,
                            }}
                          >
                            ↩ Revertir
                          </button>
                        )}

                        {imp.commit_url && (
                          <a
                            href={imp.commit_url} target="_blank" rel="noopener noreferrer"
                            style={{
                              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: 6, padding: '4px 10px', color: '#64748b', fontSize: '0.63rem',
                              cursor: 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 4,
                              textDecoration: 'none',
                            }}
                          >
                            🔗 Ver en GitHub
                          </a>
                        )}

                        {imp.diff && (
                          <button
                            onClick={() => setShowDiffId(showDiff ? null : imp.id)}
                            style={{
                              background: showDiff ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.04)',
                              border: showDiff ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.06)',
                              borderRadius: 6, padding: '4px 10px', color: showDiff ? '#a78bfa' : '#64748b', fontSize: '0.63rem',
                              cursor: 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 4,
                            }}
                          >
                            {showDiff ? '▲ Ocultar diff' : 'Ver diff'}
                          </button>
                        )}

                        <button
                          onClick={() => navigator.clipboard.writeText(`${imp.titulo}\n\n${imp.descripcion}`)}
                          style={{
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 6, padding: '4px 10px', color: '#64748b', fontSize: '0.63rem',
                            cursor: 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          📋 Copiar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
