'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import DebateView from '@/components/DebateView';
import type { Debate } from '@/types/debates';
import { AGENT_COLORS, AGENT_LIST, HORIZON_OPTIONS, DEFAULT_TEMPORAL, MODE_ICONS } from '@/types/debates';

function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{
        width: 16, height: 16, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.06)', color: '#64748b', fontSize: '0.55rem', fontWeight: 700, cursor: 'help',
        marginLeft: 4, flexShrink: 0,
      }} role="img" aria-label={text}>ⓘ</span>
      {show && (
        <span style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          padding: '6px 10px', borderRadius: 6, background: '#1e293b', color: '#e2e8f0',
          fontSize: '0.65rem', lineHeight: 1.4, whiteSpace: 'normal', width: 220,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
          zIndex: 100, marginBottom: 4, textAlign: 'left', fontWeight: 400,
        }}>{text}</span>
      )}
    </span>
  );
}

export default function DebatesPage() {
  const [debates, setDebates] = useState<Debate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDebate, setSelectedDebate] = useState<Debate | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // New debate form
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newAgents, setNewAgents] = useState<string[]>(['hoku', 'claude', 'groq']);
  const [newMode, setNewMode] = useState<'tutti' | 'dueto' | 'solo'>('tutti');
  const [newTemporal, setNewTemporal] = useState(false);
  const [newTemporalConfig, setNewTemporalConfig] = useState<Record<string, string>>(DEFAULT_TEMPORAL);
  const [creating, setCreating] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // BUG-6: Focus trap + Escape en modal
  useEffect(() => {
    if (!showNewModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShowNewModal(false); return; }
      if (e.key !== 'Tab' || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll<HTMLElement>('button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    // Auto-focus first input
    setTimeout(() => { modalRef.current?.querySelector<HTMLElement>('input')?.focus(); }, 50);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showNewModal]);

  const loadDebates = useCallback(async () => {
    try {
      const res = await fetch('/api/debates');
      if (res.ok) {
        const data = await res.json();
        setDebates(data);
      }
    } catch (err) { console.error('Error cargando debates:', err); }
    setLoading(false);
  }, []);

  useEffect(() => { loadDebates(); }, [loadDebates]);

  const openDebate = async (id: string) => {
    try {
      const res = await fetch(`/api/debates/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedDebate(data);
      }
    } catch (err) { console.error('Error abriendo debate:', err); }
  };

  const createDebate = async () => {
    if (!newTitle.trim() || !newTopic.trim() || newAgents.length === 0 || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/debates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          topic: newTopic.trim(),
          active_agent_ids: newAgents,
          orchestration_mode: newMode,
          temporal_enabled: newTemporal,
          temporal_config: newTemporal ? newTemporalConfig : {},
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setShowNewModal(false);
        setNewTitle(''); setNewTopic(''); setNewAgents(['hoku', 'claude', 'groq']);
        setNewMode('tutti'); setNewTemporal(false);
        // Open the new debate directly
        setSelectedDebate({
          ...created,
          messages: [], tensions: [], threads: [],
        });
        loadDebates();
      }
    } catch (err) { console.error('Error creando debate:', err); }
    setCreating(false);
  };

  const toggleNewAgent = (id: string) => {
    setNewAgents(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  // ═══ If viewing a debate ═══
  if (selectedDebate) {
    return <DebateView debate={selectedDebate} onBack={() => { setSelectedDebate(null); loadDebates(); }} />;
  }

  // ═══ List view ═══
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 34px)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        flexShrink: 0, background: 'rgba(15,22,35,0.92)',
        backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          height: 48, display: 'flex', alignItems: 'center', padding: '0 1.5rem',
          fontSize: '0.82rem', color: '#94a3b8',
        }}>
          <a href="/dashboard/agents" style={{ color: '#94a3b8', textDecoration: 'none' }}>Agentes IA</a>
          <span style={{ margin: '0 8px', color: '#475569' }}>/</span>
          <span style={{ color: '#fff', fontWeight: 600 }}>Debates Multi-Agente</span>
          <button onClick={() => setShowNewModal(true)} style={{
            marginLeft: 'auto', padding: '5px 14px', borderRadius: 8,
            border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #00e5b0, #0ea5e9)',
            color: '#fff', fontWeight: 700, fontSize: '0.72rem',
          }} aria-label="Crear nuevo debate">
            + Nuevo Debate
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>Cargando debates...</div>
        ) : debates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎼</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>
              Debate Multi-Agente
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
              Haz que multiples agentes IA debatan un tema desde distintas perspectivas.
              Director de orquesta para controlar el flujo, deteccion de tensiones,
              perspectivas temporales, e hilos de discusion.
            </div>
            <button onClick={() => setShowNewModal(true)} style={{
              marginTop: 24, padding: '10px 28px', borderRadius: 10,
              border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #00e5b0, #0ea5e9)',
              color: '#fff', fontWeight: 700, fontSize: '0.85rem',
            }}>
              Crear primer debate
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {debates.map(d => (
              <button key={d.id} onClick={() => openDebate(d.id)} style={{
                padding: '16px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.02)', textAlign: 'left', width: '100%',
                borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.06)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,176,0.2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#e2e8f0' }}>{d.title}</span>
                  <span style={{
                    fontSize: '0.55rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10, marginLeft: 'auto',
                    background: d.status === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.1)',
                    color: d.status === 'active' ? '#22c55e' : '#94a3b8',
                  }}>{d.status}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 10, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                  {d.topic}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.6rem', color: '#475569' }}>{MODE_ICONS[d.orchestration_mode]} {d.orchestration_mode}</span>
                  <span style={{ fontSize: '0.6rem', color: '#475569' }}>
                    {d.active_agent_ids?.length || 0} agentes
                  </span>
                  {d.temporal_enabled && (
                    <span style={{ fontSize: '0.55rem', padding: '1px 6px', borderRadius: 8, background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>
                      temporal
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: 3, marginLeft: 'auto' }}>
                    {(d.active_agent_ids || []).slice(0, 5).map(aid => (
                      <span key={aid} style={{
                        width: 14, height: 14, borderRadius: '50%',
                        background: `${AGENT_COLORS[aid] || '#64748b'}30`,
                        border: `1.5px solid ${AGENT_COLORS[aid] || '#64748b'}50`,
                      }} />
                    ))}
                    {(d.active_agent_ids || []).length > 5 && (
                      <span style={{ fontSize: '0.5rem', color: '#64748b', alignSelf: 'center' }}>+{d.active_agent_ids.length - 5}</span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '0.6rem', color: '#334155', marginTop: 8 }}>
                  {new Date(d.created_at).toLocaleDateString('es-CL')}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ═══ NEW DEBATE MODAL ═══ */}
      {showNewModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={e => { if (e.target === e.currentTarget) setShowNewModal(false); }} role="dialog" aria-modal="true" aria-label="Crear nuevo debate">
          <div ref={modalRef} style={{
            width: '90%', maxWidth: 600, maxHeight: '85vh', overflowY: 'auto',
            background: '#0f1623', borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '24px 28px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0' }}>Nuevo Debate Multi-Agente</span>
              <button onClick={() => setShowNewModal(false)} style={{
                marginLeft: 'auto', background: 'none', border: 'none', color: '#64748b',
                cursor: 'pointer', fontSize: '1.1rem', padding: '4px 8px',
              }} aria-label="Cerrar modal">✕</button>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                Titulo del debate
                <InfoTip text="Nombre corto para identificar este debate en la lista." />
              </label>
              <input
                value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="Ej: Arquitectura del nuevo dashboard"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#e2e8f0', fontSize: '0.82rem', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Topic */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                Tema / Prompt del debate
                <InfoTip text="El tema que los agentes van a debatir. Mientras más contexto des, mejor la discusión." />
              </label>
              <textarea
                value={newTopic} onChange={e => setNewTopic(e.target.value)}
                placeholder="Describe el tema que los agentes deben debatir. Mientras mas contexto, mejor la discusion."
                rows={4}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8, resize: 'vertical',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#e2e8f0', fontSize: '0.82rem', outline: 'none', lineHeight: 1.5,
                  fontFamily: "'Inter', system-ui, sans-serif", boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Prompt length warning */}
            {newTopic.length > 4000 && (
              <div style={{ fontSize: '0.65rem', color: '#f97316', marginBottom: 8 }}>
                ⚠️ Prompt largo ({newTopic.length}/5000 chars) — el costo se multiplica por cada agente
              </div>
            )}

            {/* Agent selector */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                Agentes participantes ({newAgents.length} seleccionados)
                <InfoTip text="Elige qué agentes IA participan. Cada uno tiene su perspectiva y provider." />
              </label>
              {newAgents.length === 0 && (
                <div style={{ fontSize: '0.65rem', color: '#ef4444', marginBottom: 6 }}>
                  Selecciona al menos 1 agente para iniciar el debate
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {AGENT_LIST.map(a => {
                  const selected = newAgents.includes(a.id);
                  const color = AGENT_COLORS[a.id] || '#64748b';
                  return (
                    <button key={a.id} onClick={() => toggleNewAgent(a.id)} style={{
                      padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: selected ? `${color}15` : 'rgba(255,255,255,0.03)',
                      color: selected ? color : '#475569',
                      fontWeight: 600, fontSize: '0.7rem',
                      borderWidth: 1, borderStyle: 'solid',
                      borderColor: selected ? `${color}40` : 'transparent',
                      transition: 'all 0.15s',
                    }} aria-pressed={selected}>
                      <span style={{
                        display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                        background: color, marginRight: 6, verticalAlign: 'middle',
                      }} />
                      {a.name}
                      <span style={{ fontSize: '0.55rem', color: '#475569', marginLeft: 4 }}>{a.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Director mode */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                Modo Director de Orquesta
                <InfoTip text="Tutti = todos hablan. Dueto = solo 2 agentes debaten. Solo = 1 agente profundiza." />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['tutti', 'dueto', 'solo'] as const).map(mode => (
                  <button key={mode} onClick={() => setNewMode(mode)} style={{
                    flex: 1, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: newMode === mode ? 'rgba(0,229,176,0.1)' : 'rgba(255,255,255,0.03)',
                    color: newMode === mode ? '#00e5b0' : '#64748b',
                    fontWeight: 600, fontSize: '0.75rem', textAlign: 'center',
                    borderWidth: 1, borderStyle: 'solid',
                    borderColor: newMode === mode ? 'rgba(0,229,176,0.3)' : 'transparent',
                  }} aria-pressed={newMode === mode}>
                    <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{MODE_ICONS[mode]}</div>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    <div style={{ fontSize: '0.55rem', color: '#475569', marginTop: 2 }}>
                      {mode === 'tutti' ? 'Todos hablan' : mode === 'dueto' ? 'Pares debaten' : 'Uno a la vez'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Temporal perspectives */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                  Perspectivas temporales
                  <InfoTip text="Cada agente argumenta desde un horizonte temporal diferente: corto, mediano o largo plazo." />
                </label>
                <button onClick={() => setNewTemporal(!newTemporal)} style={{
                  padding: '3px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: newTemporal ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                  color: newTemporal ? '#a78bfa' : '#64748b',
                  fontWeight: 700, fontSize: '0.65rem',
                }} aria-pressed={newTemporal}>
                  {newTemporal ? 'ON' : 'OFF'}
                </button>
              </div>
              {newTemporal && (
                <div style={{
                  padding: '12px 14px', borderRadius: 8, background: 'rgba(139,92,246,0.04)',
                  border: '1px solid rgba(139,92,246,0.1)',
                }}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: 8 }}>
                    Cada agente argumentara desde su horizonte temporal asignado:
                  </div>
                  {newAgents.map(agentId => {
                    const agent = AGENT_LIST.find(a => a.id === agentId);
                    if (!agent) return null;
                    return (
                      <div key={agentId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: AGENT_COLORS[agentId] || '#64748b', flexShrink: 0,
                        }} />
                        <span style={{ fontSize: '0.72rem', color: '#e2e8f0', fontWeight: 600, width: 80 }}>
                          {agent.name}
                        </span>
                        <select
                          value={newTemporalConfig[agentId] || DEFAULT_TEMPORAL[agentId] || '6_meses'}
                          onChange={e => setNewTemporalConfig(prev => ({ ...prev, [agentId]: e.target.value }))}
                          style={{
                            padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0',
                            fontSize: '0.68rem', outline: 'none',
                          }}
                          aria-label={`Horizonte temporal para ${agent.name}`}
                        >
                          {HORIZON_OPTIONS.map(h => (
                            <option key={h.id} value={h.id} style={{ background: '#1a1f2e' }}>{h.label}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNewModal(false)} style={{
                padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)', color: '#94a3b8',
                fontWeight: 600, fontSize: '0.78rem',
              }}>Cancelar</button>
              <button onClick={createDebate} disabled={!newTitle.trim() || !newTopic.trim() || newAgents.length === 0 || creating} style={{
                padding: '8px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: (!newTitle.trim() || !newTopic.trim() || newAgents.length === 0) ? 'rgba(148,163,184,0.1)' : 'linear-gradient(135deg, #00e5b0, #0ea5e9)',
                color: '#fff', fontWeight: 700, fontSize: '0.78rem',
                opacity: (!newTitle.trim() || !newTopic.trim() || newAgents.length === 0 || creating) ? 0.5 : 1,
              }}>
                {creating ? 'Creando...' : 'Iniciar Debate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
