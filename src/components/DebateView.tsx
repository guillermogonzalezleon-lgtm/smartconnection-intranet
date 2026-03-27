'use client';
import { useState, useRef, useEffect, useCallback, type MutableRefObject } from 'react';
import type { Debate, DebateMessage, Tension, Thread, ThreadMessage } from '@/types/debates';
import { AGENT_COLORS, AGENT_LIST, HORIZON_LABELS, HORIZON_OPTIONS, MODE_ICONS } from '@/types/debates';

// ═══ Main Component ═══
export default function DebateView({ debate: initialDebate, onBack }: { debate: Debate; onBack: () => void }) {
  const [debate, setDebate] = useState<Debate>(initialDebate);
  const [messages, setMessages] = useState<DebateMessage[]>(initialDebate.messages || []);
  const [tensions, setTensions] = useState<Tension[]>(initialDebate.tensions || []);
  const [threads, setThreads] = useState<Thread[]>(initialDebate.threads || []);
  const [streaming, setStreaming] = useState(false);
  const [typingAgent, setTypingAgent] = useState<string | null>(null);
  const [userInput, setUserInput] = useState('');
  const [tensionsOpen, setTensionsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Thread panel
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [threadInput, setThreadInput] = useState('');
  const [threadPanelOpen, setThreadPanelOpen] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [creatingThread, setCreatingThread] = useState(false);

  // New debate modal
  const [showNewThread, setShowNewThread] = useState<string | null>(null); // message_id for thread creation
  const [newThreadTitle, setNewThreadTitle] = useState('');

  // Refs para race condition y cancelación
  const streamingRef = useRef(false) as MutableRefObject<boolean>;
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typingAgent]);
  useEffect(() => { threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [threadMessages]);

  // ═══ Cancelar debate ═══
  const cancelDebate = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    streamingRef.current = false;
    setStreaming(false);
    setTypingAgent(null);
  }, []);

  // ═══ Streaming debate ═══
  const startDebate = useCallback(async () => {
    if (streamingRef.current) return;
    streamingRef.current = true;
    setStreaming(true);
    setTypingAgent(null);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch(`/api/debates/${debate.id}/stream`, { method: 'POST', signal: controller.signal });
      if (!res.ok || !res.body) {
        setError('Error al conectar con el servidor de debate');
        streamingRef.current = false;
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentAgentContent = '';
      let currentAgentId = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const lines = part.split('\n');
          let eventType = '';
          let eventData = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7);
            if (line.startsWith('data: ')) eventData = line.slice(6);
          }
          if (!eventType || !eventData) continue;

          try {
            const data = JSON.parse(eventData);

            switch (eventType) {
              case 'agent_start':
                setTypingAgent(data.agent_name);
                currentAgentId = data.agent_id;
                currentAgentContent = '';
                break;

              case 'token':
                currentAgentContent += data.content;
                break;

              case 'agent_done':
                setTypingAgent(null);
                setMessages(prev => [...prev, {
                  id: data.message_id || crypto.randomUUID(),
                  debate_id: debate.id,
                  agent_id: data.agent_id,
                  agent_name: data.agent_name,
                  content: data.content,
                  role: 'assistant',
                  time_horizon: data.time_horizon,
                  tokens_used: data.tokens || 0,
                  tension_with: null,
                  created_at: new Date().toISOString(),
                }]);
                // Actualizar total_tokens en tiempo real
                setDebate(prev => ({ ...prev, total_tokens: (prev.total_tokens || 0) + (data.tokens || 0) }));
                break;

              case 'tension_detected':
                setTensions(prev => [...prev, {
                  id: crypto.randomUUID(),
                  agent_a: data.agent_a,
                  agent_b: data.agent_b,
                  summary: data.summary,
                  severity: data.severity,
                  resolved: false,
                  message_id: data.message_id,
                }]);
                // Update the message with tension_with
                setMessages(prev => prev.map(m =>
                  m.id === data.message_id ? { ...m, tension_with: data.agent_a } : m
                ));
                break;

              case 'debate_done':
                break;

              case 'error':
                console.error('Debate stream error:', data.message);
                break;
            }
          } catch (err) { console.error('Error parseando evento SSE:', err); }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Error en stream del debate:', err);
        setError('Error durante la ejecución del debate');
      }
    }

    streamingRef.current = false;
    abortControllerRef.current = null;
    setStreaming(false);
    setTypingAgent(null);
  }, [debate.id]);

  // ═══ Orchestration ═══
  const updateOrchestration = async (updates: Record<string, unknown>) => {
    try {
      await fetch(`/api/debates/${debate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      setDebate(prev => ({ ...prev, ...updates } as Debate));
    } catch (err) {
      console.error('Error actualizando orquestación:', err);
      setError('Error al actualizar la configuración del debate');
    }
  };

  const toggleAgent = (agentId: string) => {
    const current = debate.active_agent_ids;
    const next = current.includes(agentId)
      ? current.filter(id => id !== agentId)
      : [...current, agentId];
    updateOrchestration({ active_agent_ids: next });
  };

  // ═══ User intervention ═══
  const sendUserMessage = async () => {
    if (!userInput.trim() || streaming) return;
    const content = userInput.trim();
    setUserInput('');

    try {
      const res = await fetch(`/api/debates/${debate.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const saved = await res.json();
        setMessages(prev => [...prev, {
          id: saved.id || crypto.randomUUID(),
          debate_id: debate.id,
          agent_id: 'user',
          agent_name: 'Usuario',
          content,
          role: 'user',
          time_horizon: null,
          tokens_used: 0,
          tension_with: null,
          created_at: new Date().toISOString(),
        }]);
      }
    } catch (err) {
      console.error('Error enviando mensaje:', err);
      setError('Error al enviar el mensaje');
    }
  };

  // ═══ Threads ═══
  const createThread = async (messageId: string) => {
    if (!newThreadTitle.trim() || creatingThread) return;
    setCreatingThread(true);
    try {
      const res = await fetch(`/api/debates/${debate.id}/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_message_id: messageId, title: newThreadTitle.trim() }),
      });
      if (res.ok) {
        const thread = await res.json();
        setThreads(prev => [thread, ...prev]);
        setActiveThread(thread);
        setThreadMessages([]);
        setThreadPanelOpen(true);
        setShowNewThread(null);
        setNewThreadTitle('');
      } else {
        setError('Error al crear el hilo');
      }
    } catch (err) {
      console.error('Error creando hilo:', err);
      setError('Error al crear el hilo de discusión');
    }
    setCreatingThread(false);
  };

  const openThread = async (thread: Thread) => {
    setActiveThread(thread);
    setThreadPanelOpen(true);
    setThreadLoading(true);
    try {
      const res = await fetch(`/api/threads/${thread.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setThreadMessages(Array.isArray(data) ? data : []);
      } else {
        setThreadMessages([]);
        setError('Error al cargar mensajes del hilo');
      }
    } catch (err) {
      console.error('Error cargando mensajes del hilo:', err);
      setThreadMessages([]);
      setError('Error al cargar mensajes del hilo');
    }
    setThreadLoading(false);
  };

  const sendThreadMessage = async () => {
    if (!threadInput.trim() || !activeThread || threadLoading) return;
    const content = threadInput.trim();
    setThreadInput('');
    setThreadLoading(true);

    // Add user message locally
    const userMsg: ThreadMessage = {
      id: crypto.randomUUID(), thread_id: activeThread.id,
      agent_id: 'user', agent_name: 'Usuario', content, role: 'user',
      created_at: new Date().toISOString(),
    };
    setThreadMessages(prev => [...prev, userMsg]);

    // Get source message agent
    const sourceMsg = messages.find(m => m.id === activeThread.source_message_id);
    const agentId = sourceMsg?.agent_id || 'groq';

    try {
      const res = await fetch(`/api/threads/${activeThread.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, agent_id: agentId }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '', full = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith('data: ')) continue;
            const d = t.slice(6);
            if (d === '[DONE]') continue;
            try {
              const p = JSON.parse(d);
              if (p.content) full += p.content;
            } catch (err) { console.error('Error parseando chunk de hilo:', err); }
          }
        }

        if (full) {
          setThreadMessages(prev => [...prev, {
            id: crypto.randomUUID(), thread_id: activeThread.id,
            agent_id: agentId, agent_name: sourceMsg?.agent_name || agentId,
            content: full, role: 'assistant', created_at: new Date().toISOString(),
          }]);
        }
      }
    } catch (err) {
      console.error('Error enviando mensaje en hilo:', err);
      setError('Error al enviar mensaje en el hilo');
    }
    setThreadLoading(false);
  };

  const updateThreadStatus = async (status: 'approved' | 'rejected' | 'open') => {
    if (!activeThread) return;
    try {
      await fetch(`/api/threads/${activeThread.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setActiveThread(prev => prev ? { ...prev, status } : null);
      setThreads(prev => prev.map(t => t.id === activeThread.id ? { ...t, status } : t));
    } catch (err) {
      console.error('Error actualizando estado del hilo:', err);
      setError('Error al actualizar el estado del hilo');
    }
  };

  // ═══ Render ═══
  const agentColor = (id: string) => AGENT_COLORS[id] || '#64748b';

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 34px)', overflow: 'hidden' }}>
      {/* ═══ LEFT PANEL: Debate ═══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{
          flexShrink: 0, padding: '12px 20px', background: 'rgba(15,22,35,0.92)',
          backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onBack} style={{
              background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
              fontSize: '1.1rem', padding: '4px 8px', borderRadius: 6,
            }} aria-label="Volver a la lista de debates">
              ←
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{debate.title}</span>
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                  background: debate.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)',
                  color: debate.status === 'active' ? '#22c55e' : '#94a3b8',
                }}>{debate.status}</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                {messages.length} mensajes · {tensions.length} tensiones · {debate.total_tokens} tokens
              </div>
            </div>
            {streaming ? (
              <button onClick={cancelDebate} style={{
                padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                fontWeight: 700, fontSize: '0.75rem',
              }} aria-label="Cancelar debate">
                ■ Cancelar
              </button>
            ) : (
              <button onClick={startDebate} style={{
                padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #00e5b0, #0ea5e9)',
                color: '#fff', fontWeight: 700, fontSize: '0.75rem',
              }} aria-label="Ejecutar debate">
                ▶ Ejecutar ronda
              </button>
            )}
          </div>

          {/* Director de Orquesta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {/* Mode buttons */}
            {(['tutti', 'dueto', 'solo'] as const).map(mode => (
              <button key={mode} onClick={() => updateOrchestration({ orchestration_mode: mode })} style={{
                padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: debate.orchestration_mode === mode ? 'rgba(0,229,176,0.15)' : 'rgba(255,255,255,0.04)',
                color: debate.orchestration_mode === mode ? '#00e5b0' : '#94a3b8',
                fontWeight: 600, fontSize: '0.7rem',
                borderWidth: 1, borderStyle: 'solid',
                borderColor: debate.orchestration_mode === mode ? 'rgba(0,229,176,0.3)' : 'transparent',
              }} aria-pressed={debate.orchestration_mode === mode}>
                {MODE_ICONS[mode]} {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}

            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

            {/* Temporal toggle */}
            <button onClick={() => updateOrchestration({ temporal_enabled: !debate.temporal_enabled })} style={{
              padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: debate.temporal_enabled ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
              color: debate.temporal_enabled ? '#a78bfa' : '#64748b',
              fontWeight: 600, fontSize: '0.7rem',
              borderWidth: 1, borderStyle: 'solid',
              borderColor: debate.temporal_enabled ? 'rgba(139,92,246,0.3)' : 'transparent',
            }} aria-pressed={debate.temporal_enabled}>
              ⏱ Temporal {debate.temporal_enabled ? 'ON' : 'OFF'}
            </button>

            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

            {/* Tensions bar toggle */}
            {tensions.length > 0 && (
              <button onClick={() => setTensionsOpen(!tensionsOpen)} style={{
                padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: 'rgba(249,115,22,0.1)', color: '#f97316',
                fontWeight: 600, fontSize: '0.7rem',
              }}>
                ⚡ {tensions.length} tension{tensions.length !== 1 ? 'es' : ''}
              </button>
            )}
          </div>

          {/* Agent chips */}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {AGENT_LIST.map(a => {
              const active = debate.active_agent_ids.includes(a.id);
              return (
                <button key={a.id} onClick={() => toggleAgent(a.id)} style={{
                  padding: '3px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: active ? `${agentColor(a.id)}18` : 'rgba(255,255,255,0.03)',
                  color: active ? agentColor(a.id) : '#475569',
                  fontWeight: 600, fontSize: '0.65rem', opacity: active ? 1 : 0.5,
                  borderWidth: 1, borderStyle: 'solid',
                  borderColor: active ? `${agentColor(a.id)}30` : 'transparent',
                  transition: 'all 0.15s',
                }} aria-pressed={active} aria-label={`${active ? 'Desactivar' : 'Activar'} agente ${a.name}`}>
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: agentColor(a.id), marginRight: 4, verticalAlign: 'middle' }} />
                  {a.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            flexShrink: 0, padding: '8px 20px', background: 'rgba(239,68,68,0.08)',
            borderBottom: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: 8,
          }} role="alert">
            <span style={{ fontSize: '0.75rem', color: '#ef4444', flex: 1 }}>{error}</span>
            <button onClick={() => setError(null)} style={{
              background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer',
              fontSize: '0.8rem', padding: '2px 6px',
            }} aria-label="Cerrar error">✕</button>
          </div>
        )}

        {/* Tensions bar (collapsible) */}
        {tensionsOpen && tensions.length > 0 && (
          <div style={{
            flexShrink: 0, padding: '10px 20px', background: 'rgba(249,115,22,0.04)',
            borderBottom: '1px solid rgba(249,115,22,0.15)', maxHeight: 180, overflowY: 'auto',
          }} role="region" aria-label="Tensiones detectadas">
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f97316', marginBottom: 6 }}>Tensiones detectadas</div>
            {tensions.map(t => (
              <div key={t.id} style={{
                padding: '6px 10px', marginBottom: 4, borderRadius: 6,
                background: 'rgba(249,115,22,0.06)', fontSize: '0.7rem', color: '#e2e8f0',
                borderLeft: `3px solid ${t.severity === 'high' ? '#ef4444' : t.severity === 'medium' ? '#f97316' : '#f59e0b'}`,
              }}>
                <span style={{ color: agentColor(t.agent_a), fontWeight: 700 }}>
                  {AGENT_LIST.find(a => a.id === t.agent_a)?.name || t.agent_a}
                </span>
                {' vs '}
                <span style={{ color: agentColor(t.agent_b), fontWeight: 700 }}>
                  {AGENT_LIST.find(a => a.id === t.agent_b)?.name || t.agent_b}
                </span>
                : {t.summary}
              </div>
            ))}
          </div>
        )}

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }} role="log" aria-label="Mensajes del debate">
          {messages.length === 0 && !streaming && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>🎼</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Debate listo</div>
              <div style={{ fontSize: '0.75rem', marginTop: 4 }}>Presiona "Ejecutar ronda" para que los agentes debatan sobre el tema</div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} style={{
              marginBottom: 16, padding: '12px 16px', borderRadius: 10,
              background: msg.role === 'user' ? 'rgba(148,163,184,0.06)' : 'rgba(255,255,255,0.02)',
              borderLeft: msg.tension_with ? '3px solid #f97316' : `3px solid ${agentColor(msg.agent_id)}30`,
              position: 'relative',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${agentColor(msg.agent_id)}20`, color: agentColor(msg.agent_id),
                  fontSize: '0.65rem', fontWeight: 800, flexShrink: 0,
                }}>
                  {msg.agent_name.slice(0, 2).toUpperCase()}
                </span>
                <span style={{ fontWeight: 700, fontSize: '0.78rem', color: agentColor(msg.agent_id) }}>
                  {msg.agent_name}
                </span>
                {msg.time_horizon && (
                  <span style={{
                    fontSize: '0.55rem', fontWeight: 700, padding: '1px 6px', borderRadius: 8,
                    background: 'rgba(139,92,246,0.12)', color: '#a78bfa',
                  }}>
                    {HORIZON_LABELS[msg.time_horizon] || msg.time_horizon}
                  </span>
                )}
                {msg.tension_with && (
                  <span style={{
                    fontSize: '0.55rem', fontWeight: 700, padding: '1px 6px', borderRadius: 8,
                    background: 'rgba(249,115,22,0.12)', color: '#f97316',
                  }}>
                    Tension con {AGENT_LIST.find(a => a.id === msg.tension_with)?.name || msg.tension_with}
                  </span>
                )}
                <span style={{ fontSize: '0.6rem', color: '#475569', marginLeft: 'auto' }}>
                  {new Date(msg.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {/* Content */}
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </div>
              {/* Actions */}
              {msg.role === 'assistant' && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button onClick={() => { setShowNewThread(msg.id); setNewThreadTitle(`Hilo: ${msg.agent_name}`); }} style={{
                    padding: '2px 8px', borderRadius: 4, border: 'none', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.04)', color: '#64748b',
                    fontSize: '0.6rem', fontWeight: 600,
                  }} aria-label={`Crear hilo desde mensaje de ${msg.agent_name}`}>
                    💬 Abrir hilo
                  </button>
                </div>
              )}
              {/* New thread form inline */}
              {showNewThread === msg.id && (
                <div style={{
                  marginTop: 8, padding: '8px 12px', borderRadius: 8,
                  background: 'rgba(0,229,176,0.04)', border: '1px solid rgba(0,229,176,0.15)',
                }}>
                  <input
                    value={newThreadTitle} onChange={e => setNewThreadTitle(e.target.value)}
                    placeholder="Titulo del hilo..."
                    style={{
                      width: '100%', padding: '6px 10px', borderRadius: 6,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      color: '#e2e8f0', fontSize: '0.75rem', outline: 'none',
                    }}
                    aria-label="Titulo del nuevo hilo"
                  />
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button onClick={() => createThread(msg.id)} style={{
                      padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: 'rgba(0,229,176,0.15)', color: '#00e5b0',
                      fontWeight: 700, fontSize: '0.65rem',
                    }}>Crear hilo</button>
                    <button onClick={() => setShowNewThread(null)} style={{
                      padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: 'rgba(255,255,255,0.04)', color: '#64748b',
                      fontSize: '0.65rem',
                    }}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {typingAgent && (
            <div style={{
              padding: '10px 16px', borderRadius: 10, marginBottom: 16,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
            }} role="status" aria-live="polite">
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                <span style={{ color: '#00e5b0', fontWeight: 700 }}>{typingAgent}</span> esta escribiendo...
              </span>
              <span style={{ display: 'inline-block', animation: 'pulse 1.5s infinite' }}> ●●●</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          flexShrink: 0, padding: '12px 20px', background: 'rgba(15,22,35,0.92)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              value={userInput} onChange={e => setUserInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendUserMessage(); } }}
              placeholder="Intervenir en el debate..."
              rows={1}
              style={{
                flex: 1, resize: 'none', padding: '8px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#e2e8f0', fontSize: '0.8rem', outline: 'none',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
              aria-label="Mensaje de intervención del usuario"
            />
            <button onClick={sendUserMessage} disabled={!userInput.trim() || streaming} style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'rgba(0,229,176,0.15)', color: '#00e5b0',
              fontWeight: 700, fontSize: '0.75rem',
              opacity: !userInput.trim() || streaming ? 0.4 : 1,
            }} aria-label="Enviar intervención">
              Enviar
            </button>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL: Threads ═══ */}
      {threadPanelOpen && (
        <div style={{
          width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: '#080b12', borderLeft: '1px solid rgba(255,255,255,0.06)',
        }} role="complementary" aria-label="Panel de hilos">
          {/* Mobile close bar */}
          <div style={{
            flexShrink: 0, padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0' }}>Hilos</span>
            <button onClick={() => setThreadPanelOpen(false)} style={{
              padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: 'rgba(239,68,68,0.1)', color: '#ef4444',
              fontWeight: 700, fontSize: '0.7rem', minWidth: 44, minHeight: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }} aria-label="Cerrar panel de hilos">
              ✕ Cerrar
            </button>
          </div>
          {/* Thread tabs */}
          <div style={{
            flexShrink: 0, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto',
          }}>
            {threads.map(t => (
              <button key={t.id} onClick={() => openThread(t)} style={{
                padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: activeThread?.id === t.id ? 'rgba(0,229,176,0.1)' : 'rgba(255,255,255,0.03)',
                color: activeThread?.id === t.id ? '#00e5b0' : '#64748b',
                fontWeight: 600, fontSize: '0.65rem', whiteSpace: 'nowrap',
              }}>
                {t.title.slice(0, 20)}
                {t.status !== 'open' && (
                  <span style={{
                    marginLeft: 4, width: 6, height: 6, borderRadius: '50%', display: 'inline-block',
                    background: t.status === 'approved' ? '#22c55e' : t.status === 'rejected' ? '#ef4444' : '#f59e0b',
                  }} />
                )}
              </button>
            ))}
            <div style={{ marginLeft: 'auto' }} />
          </div>

          {activeThread ? (
            <>
              {/* Source message */}
              <div style={{
                flexShrink: 0, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: 'rgba(255,255,255,0.02)',
              }}>
                <div style={{ fontSize: '0.6rem', color: '#475569', marginBottom: 4 }}>Mensaje original</div>
                {(() => {
                  const src = messages.find(m => m.id === activeThread.source_message_id);
                  if (!src) return <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Mensaje no encontrado</div>;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `${agentColor(src.agent_id)}20`, color: agentColor(src.agent_id),
                        fontSize: '0.5rem', fontWeight: 800, flexShrink: 0,
                      }}>
                        {src.agent_name.slice(0, 2).toUpperCase()}
                      </span>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 700, color: agentColor(src.agent_id) }}>{src.agent_name}:</span> {src.content.length > 120 ? `${src.content.slice(0, 120)}...` : src.content}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Thread messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }} role="log" aria-label="Mensajes del hilo">
                {threadMessages.map(tm => (
                  <div key={tm.id} style={{
                    marginBottom: 12, padding: '8px 12px', borderRadius: 8,
                    background: tm.role === 'user' ? 'rgba(148,163,184,0.05)' : 'rgba(255,255,255,0.02)',
                    borderLeft: `2px solid ${agentColor(tm.agent_id)}30`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.7rem', color: agentColor(tm.agent_id) }}>{tm.agent_name}</span>
                      <span style={{ fontSize: '0.55rem', color: '#475569' }}>
                        {new Date(tm.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{tm.content}</div>
                  </div>
                ))}
                {threadLoading && (
                  <div style={{ fontSize: '0.7rem', color: '#64748b', padding: 8 }} role="status">Cargando...</div>
                )}
                <div ref={threadEndRef} />
              </div>

              {/* Thread actions */}
              {activeThread.status === 'open' ? (
                <div style={{
                  flexShrink: 0, padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.04)',
                  display: 'flex', gap: 8,
                }}>
                  <button onClick={() => updateThreadStatus('approved')} style={{
                    flex: 1, padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: 'rgba(34,197,94,0.12)', color: '#22c55e',
                    fontWeight: 700, fontSize: '0.7rem',
                  }}>Aprobar</button>
                  <button onClick={() => updateThreadStatus('rejected')} style={{
                    flex: 1, padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                    fontWeight: 700, fontSize: '0.7rem',
                  }}>Rechazar</button>
                </div>
              ) : (
                <div style={{
                  flexShrink: 0, padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700, padding: '2px 10px', borderRadius: 8,
                    background: activeThread.status === 'approved' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                    color: activeThread.status === 'approved' ? '#22c55e' : '#ef4444',
                  }}>
                    {activeThread.status === 'approved' ? 'Aprobado' : activeThread.status === 'rejected' ? 'Rechazado' : activeThread.status}
                  </span>
                  <button onClick={() => updateThreadStatus('open')} style={{
                    padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: 'rgba(148,163,184,0.1)', color: '#94a3b8',
                    fontWeight: 600, fontSize: '0.65rem',
                  }}>Revertir</button>
                </div>
              )}

              {/* Thread input */}
              <div style={{
                flexShrink: 0, padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.04)',
              }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={threadInput} onChange={e => setThreadInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendThreadMessage(); } }}
                    placeholder="Escribir en el hilo..."
                    style={{
                      flex: 1, padding: '6px 10px', borderRadius: 6,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      color: '#e2e8f0', fontSize: '0.72rem', outline: 'none',
                    }}
                    aria-label="Mensaje en el hilo"
                  />
                  <button onClick={sendThreadMessage} disabled={!threadInput.trim() || threadLoading} style={{
                    padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: 'rgba(0,229,176,0.15)', color: '#00e5b0',
                    fontWeight: 700, fontSize: '0.7rem',
                    opacity: !threadInput.trim() || threadLoading ? 0.4 : 1,
                  }} aria-label="Enviar mensaje en hilo">
                    →
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '0.75rem' }}>
              Selecciona un hilo
            </div>
          )}
        </div>
      )}

      {/* Thread panel toggle (when closed) */}
      {!threadPanelOpen && threads.length > 0 && (
        <button onClick={() => setThreadPanelOpen(true)} style={{
          position: 'fixed', right: 16, top: '50%', transform: 'translateY(-50%)',
          padding: '8px 12px', borderRadius: '8px 0 0 8px', border: 'none', cursor: 'pointer',
          background: 'rgba(0,229,176,0.1)', color: '#00e5b0',
          fontWeight: 700, fontSize: '0.7rem', zIndex: 10,
          borderRight: '2px solid rgba(0,229,176,0.3)',
        }} aria-label="Abrir panel de hilos">
          💬 {threads.length}
        </button>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @media (max-width: 768px) {
          [role="complementary"] { position: fixed !important; left: 0 !important; top: 0 !important; width: 100% !important; height: 100% !important; z-index: 50 !important; }
        }
      `}</style>
    </div>
  );
}
