'use client';
import { useState, useEffect, useCallback } from 'react';

interface KaizenAudit {
  id: string;
  audit_number: number;
  score_global: string;
  total_bytes: number;
  total_tokens: number;
  total_files: number;
  criticals: string[];
  improvements: string[];
  positives: string[];
  top_actions: string[];
  scores_by_area: Record<string, string>;
  fixes_applied: number;
  source: string;
  created_at: string;
}

interface AndonSignal {
  id: string;
  project: string;
  area: string;
  status: 'green' | 'yellow' | 'red';
  score: string;
  detail: string;
  last_checked: string;
}

interface OodaDecision {
  id: string;
  title: string;
  observe: string;
  orient: string;
  decide: string;
  act: string;
  result: string;
  project: string;
  agent: string;
  status: string;
  created_at: string;
}

const SCORE_COLORS: Record<string, string> = {
  A: '#22c55e', B: '#00e5b0', C: '#f59e0b', D: '#f97316', F: '#ef4444',
};
const STATUS_COLORS: Record<string, string> = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444' };
const STATUS_ICONS: Record<string, string> = { green: '●', yellow: '▲', red: '■' };

const METHODOLOGIES = [
  { agent: 'Hoku', icon: '🐾', methods: ['Poka-Yoke', 'Jidoka', 'Canary Deploy'], color: '#ff6b6b' },
  { agent: 'Panchita', icon: '🐕', methods: ['Design Thinking', 'Jobs to Be Done', 'Wardley Mapping'], color: '#d97706' },
  { agent: 'Camilita', icon: '👩', methods: ['Shift Left', 'Chaos Engineering', 'Exploratory Testing'], color: '#ec4899' },
  { agent: 'Arielito', icon: '🔍', methods: ['Kaizen', 'Andon', 'OODA', 'Gemba', 'Six Sigma'], color: '#3b82f6' },
  { agent: 'Sergito', icon: '⚡', methods: ['TRIZ', 'SCAMPER', 'First Principles', 'Blue Ocean'], color: '#a855f7' },
];

export default function OpsCenterPage() {
  const [tab, setTab] = useState<'andon' | 'kaizen' | 'ooda' | 'methods'>('andon');
  const [kaizen, setKaizen] = useState<KaizenAudit[]>([]);
  const [andon, setAndon] = useState<AndonSignal[]>([]);
  const [ooda, setOoda] = useState<OodaDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOoda, setExpandedOoda] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const runAgent = async (agent: string) => {
    setRunning(agent);
    try {
      const res = await fetch('/api/ops-center/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent }),
      });
      if (res.ok) {
        showToast(`${agent === 'all' ? 'Todos los agentes' : agent} ejecutado`);
        load();
      } else {
        showToast('Error ejecutando auditoría');
      }
    } catch { showToast('Error de conexión'); }
    setRunning(null);
  };

  const sendEmail = async () => {
    setSendingEmail(true);
    try {
      const res = await fetch('/api/ops-center/email', { method: 'POST' });
      if (res.ok) showToast('Reporte enviado a guillermo.gonzalez@smconnection.cl');
      else showToast('Error enviando email');
    } catch { showToast('Error de conexión'); }
    setSendingEmail(false);
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/ops-center?section=all');
      if (res.ok) {
        const data = await res.json();
        setKaizen(data.kaizen || []);
        setAndon(data.andon || []);
        setOoda(data.ooda || []);
      }
    } catch (err) { console.error('Error cargando Ops Center:', err); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const scoreColor = (s: string) => SCORE_COLORS[s] || '#64748b';

  // ═══ Agrupar andon por proyecto ═══
  const andonByProject: Record<string, AndonSignal[]> = {};
  andon.forEach(s => {
    if (!andonByProject[s.project]) andonByProject[s.project] = [];
    andonByProject[s.project].push(s);
  });

  const projectStatus = (signals: AndonSignal[]) => {
    if (signals.some(s => s.status === 'red')) return 'red';
    if (signals.some(s => s.status === 'yellow')) return 'yellow';
    return 'green';
  };

  const tabs = [
    { id: 'andon' as const, label: 'Andon Board', icon: '🚦' },
    { id: 'kaizen' as const, label: 'Kaizen', icon: '📊' },
    { id: 'ooda' as const, label: 'OODA Log', icon: '🔄' },
    { id: 'methods' as const, label: 'Metodologías', icon: '🧠' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 34px)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        flexShrink: 0, background: 'rgba(15,22,35,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ height: 48, display: 'flex', alignItems: 'center', padding: '0 1.5rem', fontSize: '0.82rem', color: '#94a3b8' }}>
          <span style={{ color: '#fff', fontWeight: 700 }}>Ops Center</span>
          <span style={{ margin: '0 10px', color: '#334155' }}>—</span>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Kaizen + Andon + OODA + Metodologías</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {/* Run per agent */}
            {METHODOLOGIES.map(m => (
              <button key={m.agent} onClick={() => runAgent(m.agent.toLowerCase())} disabled={running !== null}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', cursor: running ? 'wait' : 'pointer',
                  background: running === m.agent.toLowerCase() ? `${m.color}25` : 'rgba(255,255,255,0.04)',
                  color: running === m.agent.toLowerCase() ? m.color : '#64748b',
                  fontSize: '0.65rem', fontWeight: 700, transition: 'all 0.15s',
                  opacity: running && running !== m.agent.toLowerCase() ? 0.4 : 1,
                }} title={`Ejecutar ${m.agent}`}>
                {running === m.agent.toLowerCase() ? '...' : m.icon}
              </button>
            ))}
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', margin: '0 2px', alignSelf: 'center' }} />
            {/* Run ALL */}
            <button onClick={() => runAgent('all')} disabled={running !== null}
              style={{
                padding: '4px 12px', borderRadius: 6, border: 'none', cursor: running ? 'wait' : 'pointer',
                background: running === 'all' ? 'rgba(0,229,176,0.15)' : 'rgba(0,229,176,0.08)',
                color: '#00e5b0', fontSize: '0.65rem', fontWeight: 700,
                opacity: running && running !== 'all' ? 0.4 : 1,
              }}>
              {running === 'all' ? 'Ejecutando...' : '▶ Todos'}
            </button>
            {/* Email */}
            <button onClick={sendEmail} disabled={sendingEmail}
              style={{
                padding: '4px 12px', borderRadius: 6, border: 'none', cursor: sendingEmail ? 'wait' : 'pointer',
                background: 'rgba(139,92,246,0.08)', color: '#a78bfa',
                fontSize: '0.65rem', fontWeight: 700,
              }}>
              {sendingEmail ? 'Enviando...' : '✉ Email'}
            </button>
            {/* Refresh */}
            <button onClick={load} style={{
              padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: '0.65rem', fontWeight: 600,
            }}>↻</button>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '0 1.5rem 8px' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: tab === t.id ? 'rgba(0,229,176,0.12)' : 'rgba(255,255,255,0.03)',
              color: tab === t.id ? '#00e5b0' : '#64748b',
              fontWeight: 600, fontSize: '0.75rem', transition: 'all 0.15s',
              borderWidth: 1, borderStyle: 'solid',
              borderColor: tab === t.id ? 'rgba(0,229,176,0.25)' : 'transparent',
            }}>{t.icon} {t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>Cargando Ops Center...</div>
        ) : (
          <>
            {/* ═══ ANDON BOARD ═══ */}
            {tab === 'andon' && (
              <div>
                {Object.keys(andonByProject).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>🚦</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>Andon Board</div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
                      Señales visuales de estado por proyecto y area.
                      Se actualiza automaticamente con cada Kaizen de Arielito.
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 16 }}>
                      Proximo Kaizen automatico: cada 3 dias a las 9am Chile
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                    {Object.entries(andonByProject).map(([project, signals]) => {
                      const pStatus = projectStatus(signals);
                      return (
                        <div key={project} style={{
                          borderRadius: 14, padding: '20px 22px',
                          background: 'rgba(255,255,255,0.02)',
                          border: `1px solid ${STATUS_COLORS[pStatus]}25`,
                          transition: 'all 0.3s',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                            <span style={{ fontSize: '1.2rem', color: STATUS_COLORS[pStatus] }}>{STATUS_ICONS[pStatus]}</span>
                            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>{project}</span>
                            <span style={{
                              marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 700, padding: '2px 10px', borderRadius: 10,
                              background: `${STATUS_COLORS[pStatus]}15`, color: STATUS_COLORS[pStatus],
                            }}>{pStatus.toUpperCase()}</span>
                          </div>
                          {signals.map(s => (
                            <div key={s.id} style={{
                              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 4,
                              borderRadius: 8, background: 'rgba(255,255,255,0.02)',
                            }}>
                              <span style={{ color: STATUS_COLORS[s.status], fontSize: '0.7rem' }}>{STATUS_ICONS[s.status]}</span>
                              <span style={{ fontSize: '0.78rem', color: '#cbd5e1', flex: 1 }}>{s.area}</span>
                              <span style={{
                                fontSize: '0.65rem', fontWeight: 700, color: scoreColor(s.score),
                                background: `${scoreColor(s.score)}15`, padding: '1px 8px', borderRadius: 6,
                              }}>{s.score}</span>
                            </div>
                          ))}
                          <div style={{ fontSize: '0.6rem', color: '#475569', marginTop: 8 }}>
                            Ultimo check: {new Date(signals[0]?.last_checked).toLocaleDateString('es-CL')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ═══ KAIZEN DASHBOARD ═══ */}
            {tab === 'kaizen' && (
              <div>
                {kaizen.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>📊</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>Kaizen Dashboard</div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
                      Historial de auditorias del sistema. Arielito ejecuta un Kaizen automatico
                      cada 3 dias, auditando CLAUDE.md, agentes y memorias.
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Latest audit hero */}
                    {kaizen[0] && (() => {
                      const latest = kaizen[0];
                      return (
                        <div style={{
                          borderRadius: 16, padding: '24px 28px', marginBottom: 20,
                          background: `linear-gradient(135deg, ${scoreColor(latest.score_global)}08, rgba(255,255,255,0.02))`,
                          border: `1px solid ${scoreColor(latest.score_global)}20`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <span style={{
                              fontSize: '2rem', fontWeight: 900, color: scoreColor(latest.score_global),
                              textShadow: `0 0 30px ${scoreColor(latest.score_global)}40`,
                            }}>{latest.score_global}</span>
                            <div>
                              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>
                                Kaizen #{latest.audit_number}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                {new Date(latest.created_at).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                {' · '}{latest.source}
                              </div>
                            </div>
                            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                {(latest.total_bytes / 1024).toFixed(1)} KB · ~{latest.total_tokens.toLocaleString()} tokens · {latest.total_files} archivos
                              </div>
                              <div style={{ fontSize: '0.65rem', color: '#22c55e', marginTop: 2 }}>
                                {latest.fixes_applied} fixes aplicados
                              </div>
                            </div>
                          </div>

                          {/* Scores by area */}
                          {Object.keys(latest.scores_by_area || {}).length > 0 && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                              {Object.entries(latest.scores_by_area).map(([area, score]) => (
                                <span key={area} style={{
                                  padding: '4px 12px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 600,
                                  background: `${scoreColor(score)}12`, color: scoreColor(score),
                                  border: `1px solid ${scoreColor(score)}20`,
                                }}>{area}: {score}</span>
                              ))}
                            </div>
                          )}

                          {/* Top actions */}
                          {(latest.top_actions || []).length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>Top acciones</div>
                              {latest.top_actions.map((a, i) => (
                                <div key={i} style={{ fontSize: '0.78rem', color: '#cbd5e1', padding: '4px 0', display: 'flex', gap: 8 }}>
                                  <span style={{ color: '#00e5b0', fontWeight: 700 }}>{i + 1}.</span> {a}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* History */}
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>Historial</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {kaizen.slice(1).map(k => (
                        <div key={k.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                          borderRadius: 10, background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.04)',
                        }}>
                          <span style={{
                            fontSize: '1.1rem', fontWeight: 800, color: scoreColor(k.score_global), width: 30,
                          }}>{k.score_global}</span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0' }}>#{k.audit_number}</span>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', flex: 1 }}>
                            {new Date(k.created_at).toLocaleDateString('es-CL')} · {k.source}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#475569' }}>
                            {(k.total_bytes / 1024).toFixed(1)} KB · {k.fixes_applied} fixes
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ OODA LOG ═══ */}
            {tab === 'ooda' && (
              <div>
                {ooda.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔄</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>OODA Decision Log</div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
                      Observe → Orient → Decide → Act. Registro de decisiones tecnicas
                      con contexto completo para aprender de cada una.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ooda.map(d => (
                      <div key={d.id} onClick={() => setExpandedOoda(expandedOoda === d.id ? null : d.id)} style={{
                        borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
                        background: expandedOoda === d.id ? 'rgba(0,229,176,0.04)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${expandedOoda === d.id ? 'rgba(0,229,176,0.15)' : 'rgba(255,255,255,0.04)'}`,
                        transition: 'all 0.2s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0', flex: 1 }}>{d.title}</span>
                          {d.project && <span style={{ fontSize: '0.6rem', color: '#64748b', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 6 }}>{d.project}</span>}
                          {d.agent && <span style={{ fontSize: '0.6rem', color: '#00e5b0', background: 'rgba(0,229,176,0.08)', padding: '2px 8px', borderRadius: 6 }}>{d.agent}</span>}
                          <span style={{ fontSize: '0.6rem', color: '#475569' }}>
                            {new Date(d.created_at).toLocaleDateString('es-CL')}
                          </span>
                          <span style={{ color: '#64748b', fontSize: '0.7rem' }}>{expandedOoda === d.id ? '▼' : '▶'}</span>
                        </div>
                        {expandedOoda === d.id && (
                          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {[
                              { label: 'Observe', value: d.observe, color: '#3b82f6' },
                              { label: 'Orient', value: d.orient, color: '#8b5cf6' },
                              { label: 'Decide', value: d.decide, color: '#f59e0b' },
                              { label: 'Act', value: d.act, color: '#22c55e' },
                            ].map(step => (
                              <div key={step.label} style={{
                                padding: '10px 12px', borderRadius: 8,
                                background: `${step.color}08`, borderLeft: `3px solid ${step.color}`,
                              }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: step.color, marginBottom: 4 }}>{step.label}</div>
                                <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.5 }}>{step.value || '—'}</div>
                              </div>
                            ))}
                            {d.result && (
                              <div style={{
                                gridColumn: '1 / -1', padding: '10px 12px', borderRadius: 8,
                                background: 'rgba(34,197,94,0.06)', borderLeft: '3px solid #22c55e',
                              }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#22c55e', marginBottom: 4 }}>Resultado</div>
                                <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.5 }}>{d.result}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ METODOLOGÍAS ═══ */}
            {tab === 'methods' && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
                    Metodologias del Equipo SmartConnection
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Cada agente aplica metodologias especificas de mejora continua
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {METHODOLOGIES.map(m => (
                    <div key={m.agent} style={{
                      borderRadius: 14, padding: '20px 22px',
                      background: `linear-gradient(135deg, ${m.color}06, rgba(255,255,255,0.02))`,
                      border: `1px solid ${m.color}20`,
                      transition: 'all 0.3s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <span style={{ fontSize: '1.5rem' }}>{m.icon}</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: m.color }}>{m.agent}</span>
                      </div>
                      {m.methods.map(method => (
                        <div key={method} style={{
                          padding: '8px 12px', marginBottom: 4, borderRadius: 8,
                          background: 'rgba(255,255,255,0.02)', fontSize: '0.78rem', color: '#cbd5e1',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                          {method}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 60, right: 20, padding: '10px 20px', borderRadius: 10,
          background: 'rgba(15,22,35,0.95)', border: '1px solid rgba(0,229,176,0.2)',
          color: '#00e5b0', fontSize: '0.78rem', fontWeight: 600,
          backdropFilter: 'blur(12px)', zIndex: 200,
          animation: 'fadeInUp 0.3s ease-out',
        }} role="status">{toast}</div>
      )}
    </div>
  );
}
