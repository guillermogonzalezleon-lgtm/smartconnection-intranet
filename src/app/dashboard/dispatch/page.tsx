// @ts-nocheck
'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { api, AGENT_COLORS, CONFIG } from '@/lib/config';

/* ── Types ── */
interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  agent?: string;
  model?: string;
  tokens?: number;
  cost?: number;
  duration?: number;
  ts: string;
  pipeline?: number; // 0-4 progress dots
}

interface LogEntry {
  id: string;
  ts: string;
  tag: string;
  color: string;
  text: string;
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';
type ChatMode = 'voice' | 'chat' | 'quick';
type RightTab = 'intranet' | 'resultado' | 'aws';

/* ── Constants ── */
const GRID_AGENTS = [
  { id: 'groq', name: 'Groq', model: 'llama-3.3-70b', emoji: '⚡' },
  { id: 'claude', name: 'Claude', model: 'haiku-4.5', emoji: '🤖' },
  { id: 'openai', name: 'OpenAI', model: 'gpt-4o-mini', emoji: '🧠' },
  { id: 'deepseek', name: 'DeepSeek', model: 'deepseek-chat', emoji: '💎' },
  { id: 'grok', name: 'Grok', model: 'grok-3-mini', emoji: '🔮' },
  { id: 'bedrock', name: 'Bedrock', model: 'claude-3.5-haiku', emoji: '☁️' },
];

const QUICK_CHIPS = [
  { label: 'UX', prompt: 'Analiza la UX de smconnection.cl. Da 3 mejoras concretas con codigo implementable.' },
  { label: 'Deploy', prompt: 'Ejecuta verificacion pre-deploy: health check endpoints, CDN, S3, Amplify status.' },
  { label: 'Leads', prompt: 'Cuantos leads tenemos? Resumen del estado del CRM con pipeline de conversion.' },
  { label: 'SAP', prompt: 'Genera propuesta SAP BTP para cliente retail Chile. Scope, timeline, pricing en UF.' },
  { label: 'Codigo', prompt: 'Genera un componente React con TypeScript optimizado para dashboard.' },
];

const now = () => new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

/* ── Component ── */
export default function DispatchPage() {
  // State - Col 1
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [chatMode, setChatMode] = useState<ChatMode>('chat');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [clock, setClock] = useState(now());

  // State - Col 2
  const [activeAgents, setActiveAgents] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [kpis, setKpis] = useState({ tokens: 0, tasks: 0, cost: 0, avgTime: 0 });
  const [taskTimes, setTaskTimes] = useState<number[]>([]);

  // State - Col 3
  const [rightTab, setRightTab] = useState<RightTab>('intranet');
  const [liveFeed, setLiveFeed] = useState<{ id: string; ts: string; text: string }[]>([]);
  const [lastResult, setLastResult] = useState('');
  const [intranetKpis, setIntranetKpis] = useState({ agents: 0, leads: 0, deploys: 0 });

  // Refs
  const chatRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setClock(now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll chat & terminal
  useEffect(() => { chatRef.current && (chatRef.current.scrollTop = chatRef.current.scrollHeight); }, [messages]);
  useEffect(() => { termRef.current && (termRef.current.scrollTop = termRef.current.scrollHeight); }, [logs]);

  // Load intranet KPIs
  useEffect(() => {
    api({ action: 'query', table: 'agent_logs', order: 'created_at.desc', limit: 100 })
      .then(d => {
        if (!d.data) return;
        const agents = new Set(d.data.map((r: any) => r.agent_id)).size;
        const deploys = d.data.filter((r: any) => r.action?.includes('deploy')).length;
        setIntranetKpis({ agents, leads: d.data.length, deploys });
      }).catch(() => {});
  }, []);

  // Add log
  const addLog = useCallback((tag: string, color: string, text: string) => {
    setLogs(p => [...p.slice(-80), { id: uid(), ts: now(), tag, color, text }]);
  }, []);

  // Activate agent visually
  const activateAgent = useCallback((agentId: string) => {
    setActiveAgents(p => ({ ...p, [agentId]: 0 }));
    const iv = setInterval(() => {
      setActiveAgents(p => {
        const v = (p[agentId] ?? 0) + Math.random() * 15 + 5;
        if (v >= 100) { clearInterval(iv); const next = { ...p }; delete next[agentId]; return next; }
        return { ...p, [agentId]: Math.min(v, 95) };
      });
    }, 200);
    return () => clearInterval(iv);
  }, []);

  // Voice - start listening
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { addLog('VOICE', '#ef4444', 'SpeechRecognition no soportado'); return; }
    const rec = new SR();
    rec.lang = 'es-CL';
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      setVoiceState('processing');
      setInput(t);
      addLog('VOICE', '#00e5b0', `Reconocido: "${t}"`);
      setTimeout(() => sendMessage(t), 200);
    };
    rec.onerror = () => { setVoiceState('idle'); addLog('VOICE', '#ef4444', 'Error de reconocimiento'); };
    rec.onend = () => { if (voiceState === 'listening') setVoiceState('idle'); };
    recognitionRef.current = rec;
    rec.start();
    setVoiceState('listening');
    addLog('VOICE', '#f59e0b', 'Escuchando...');
  }, [voiceState]);

  // Preload voices (Chrome loads async)
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  // Voice - speak response
  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/```[\s\S]*?```/g, 'código generado').replace(/[#*_`→✓●◌⟳🐾🔍🚀👥💼⚡📊]/g, '').replace(/https?:\/\/\S+/g, '').replace(/\n{2,}/g, '. ').slice(0, 800);
    if (clean.trim().length < 10) return;
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'es-CL'; u.rate = 1.05; u.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find((v: any) => v.lang === 'es-CL') || voices.find((v: any) => v.lang.startsWith('es')) || voices[0];
    if (esVoice) u.voice = esVoice;
    u.onstart = () => setVoiceState('speaking');
    u.onend = () => setVoiceState('idle');
    u.onerror = () => setVoiceState('idle');
    window.speechSynthesis.speak(u);
  }, []);

  // Send message
  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || streaming) return;
    setInput('');
    setStreaming(true);
    if (voiceState !== 'processing') setVoiceState('idle');

    const userMsg: ChatMsg = { id: `u${Date.now()}`, role: 'user', text, ts: now() };
    setMessages(p => [...p, userMsg]);
    addLog('USER', '#3b82f6', text.slice(0, 80));

    // Save to Supabase
    const sessionId = `dispatch_${Date.now()}`;
    fetch('/api/agents', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'insert_chat', session_id: sessionId, role: 'user', content: text }) }).catch(() => {});

    // Activate random agents visually
    const shuffled = [...GRID_AGENTS].sort(() => Math.random() - 0.5);
    const toActivate = shuffled.slice(0, Math.floor(Math.random() * 3) + 2);
    const cleanups = toActivate.map(a => {
      addLog('AGENT', AGENT_COLORS[a.id] || '#64748b', `${a.name} activado`);
      return activateAgent(a.id);
    });

    // Placeholder
    const assistantId = `a${Date.now()}`;
    setMessages(p => [...p, { id: assistantId, role: 'assistant', text: '', ts: now(), agent: 'Hoku', model: 'Fusion 9in1', pipeline: 0 }]);

    const start = Date.now();
    let fullText = '';
    let tokenCount = 0;

    // Pipeline progress
    const pipelineIv = setInterval(() => {
      setMessages(p => p.map(m => m.id === assistantId ? { ...m, pipeline: Math.min((m.pipeline || 0) + 1, 3) } : m));
    }, 1500);

    try {
      addLog('STREAM', '#00e5b0', 'Conectando a /api/agents/stream...');
      const res = await fetch('/api/agents/stream', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Eres HOKU, agente REBELDE y DIRECTO. Ejecutas sin preguntar.\n\n${text}`,
          taskType: 'general',
          agentId: 'hoku',
          chatMode: true,
        }),
      });

      if (!res.ok || !res.body) {
        addLog('ERROR', '#ef4444', `HTTP ${res.status}`);
        setMessages(p => p.map(m => m.id === assistantId ? { ...m, text: `Error (${res.status})`, pipeline: 4 } : m));
        setStreaming(false); clearInterval(pipelineIv); return;
      }

      addLog('STREAM', '#22c55e', 'Streaming iniciado');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data: ')) continue;
          const d = t.slice(6);
          if (d === '[DONE]') continue;
          try {
            const p = JSON.parse(d);
            if (p.content) {
              fullText += p.content;
              tokenCount += p.content.split(/\s+/).length;
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, text: fullText } : m));
            }
          } catch {}
        }
      }
    } catch (err) {
      addLog('ERROR', '#ef4444', String(err).slice(0, 80));
      setMessages(p => p.map(m => m.id === assistantId ? { ...m, text: `Error: ${String(err).slice(0, 100)}`, pipeline: 4 } : m));
    }

    clearInterval(pipelineIv);
    const duration = Math.round((Date.now() - start) / 1000);
    const cost = +(tokenCount * 0.00002).toFixed(4);
    cleanups.forEach(c => c());

    // Final update
    setMessages(p => p.map(m => m.id === assistantId ? { ...m, tokens: tokenCount, duration, cost, pipeline: 4 } : m));
    setLastResult(fullText);

    // Update KPIs
    setTaskTimes(p => {
      const next = [...p, duration];
      const avg = Math.round(next.reduce((a, b) => a + b, 0) / next.length);
      setKpis(k => ({ tokens: k.tokens + tokenCount, tasks: k.tasks + 1, cost: +(k.cost + cost).toFixed(4), avgTime: avg }));
      return next;
    });

    // Live feed
    setLiveFeed(p => [{ id: uid(), ts: now(), text: `Hoku: "${text.slice(0, 50)}..." (${duration}s)` }, ...p].slice(0, 20));
    addLog('DONE', '#22c55e', `Completado en ${duration}s, ${tokenCount} tokens`);

    // Save to Supabase
    if (fullText) {
      fetch('/api/agents', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'insert_chat', session_id: sessionId, role: 'hoku', content: fullText.slice(0, 5000) }) }).catch(() => {});
      fetch('/api/agents', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'hoku_learn', topic: text.slice(0, 150), content: fullText.slice(0, 2000), source: 'dispatch' }) }).catch(() => {});
    }

    // Voice speak
    if (fullText) speak(fullText);
    setStreaming(false);
    if (voiceState === 'processing') setVoiceState('idle');
  };

  // Orb click handler
  const handleOrbClick = () => {
    if (voiceState === 'listening') {
      recognitionRef.current?.stop();
      setVoiceState('idle');
    } else if (voiceState === 'speaking') {
      window.speechSynthesis?.cancel();
      setVoiceState('idle');
    } else if (voiceState === 'idle') {
      startListening();
    }
  };

  // Orb styles based on state
  const orbStyles: Record<VoiceState, { bg: string; shadow: string; emoji: string; anim: string }> = {
    idle: { bg: 'linear-gradient(135deg, #0d9488 0%, #00e5b0 50%, #0ea5e9 100%)', shadow: '0 0 30px rgba(0,229,176,0.3)', emoji: '🎤', anim: '' },
    listening: { bg: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)', shadow: '0 0 40px rgba(239,68,68,0.5)', emoji: '🔴', anim: 'ringpulse 1s infinite' },
    processing: { bg: 'conic-gradient(#00e5b0, #3b82f6, #8b5cf6, #f59e0b, #ef4444, #00e5b0)', shadow: '0 0 40px rgba(139,92,246,0.4)', emoji: '⚙️', anim: 'spin 1s linear infinite' },
    speaking: { bg: 'linear-gradient(135deg, #22c55e 0%, #00e5b0 100%)', shadow: '0 0 40px rgba(34,197,94,0.5)', emoji: '🔊', anim: 'breathe 1s infinite' },
  };
  const orb = orbStyles[voiceState];

  // Pipeline dots
  const PipelineDots = ({ stage }: { stage: number }) => {
    const labels = ['IA', 'DB', 'Deploy', 'Live'];
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
        {labels.map((l, i) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: i <= stage ? '#00e5b0' : '#1e293b',
              boxShadow: i <= stage ? '0 0 6px rgba(0,229,176,0.5)' : 'none',
              transition: 'all 0.3s',
            }} />
            <span style={{ fontSize: '0.5rem', color: i <= stage ? '#00e5b0' : '#334155' }}>{l}</span>
            {i < labels.length - 1 && <div style={{ width: 12, height: 1, background: i < stage ? '#00e5b040' : '#1e293b' }} />}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 34px)', overflow: 'hidden', background: '#060a13', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#e2e8f0' }}>
      {/* ── COL 1: Dispatch (340px) ── */}
      <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.06)', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f1f5f9' }}>Hoku Dispatch · 9in1</div>
            <div style={{ fontSize: '0.6rem', color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>{clock}</div>
          </div>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: streaming ? '#f59e0b' : '#22c55e', boxShadow: `0 0 8px ${streaming ? '#f59e0b50' : '#22c55e50'}` }} />
        </div>

        {/* Voice Orb */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0 16px' }}>
          <button onClick={handleOrbClick} style={{
            width: 100, height: 100, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: orb.bg, boxShadow: orb.shadow,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', animation: orb.anim, transition: 'all 0.3s',
            position: 'relative',
          }}>
            {orb.emoji}
            {voiceState === 'listening' && (
              <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: '2px solid rgba(239,68,68,0.3)', animation: 'ringpulse 1.5s infinite' }} />
            )}
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.55rem', color: '#475569', marginBottom: 12 }}>
          {voiceState === 'idle' ? 'Click para hablar' : voiceState === 'listening' ? 'Escuchando...' : voiceState === 'processing' ? 'Procesando...' : 'Hoku habla...'}
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '0 16px', marginBottom: 12 }}>
          {([['voice', '🎤 Voz'], ['chat', '💬 Chat'], ['quick', '⚡ Rapido']] as [ChatMode, string][]).map(([m, l]) => (
            <button key={m} onClick={() => setChatMode(m)} style={{
              flex: 1, padding: '6px 0', borderRadius: 8, fontSize: '0.62rem', fontWeight: 600, cursor: 'pointer',
              background: chatMode === m ? 'rgba(0,229,176,0.1)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${chatMode === m ? 'rgba(0,229,176,0.2)' : 'rgba(255,255,255,0.04)'}`,
              color: chatMode === m ? '#00e5b0' : '#64748b',
            }}>{l}</button>
          ))}
        </div>

        {/* Quick chips */}
        <div style={{ display: 'flex', gap: 4, padding: '0 16px', marginBottom: 12, flexWrap: 'wrap' }}>
          {QUICK_CHIPS.map(c => (
            <button key={c.label} onClick={() => sendMessage(c.prompt)} style={{
              padding: '4px 10px', borderRadius: 20, fontSize: '0.58rem', cursor: 'pointer',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8',
            }}>{c.label}</button>
          ))}
        </div>

        {/* Chat feed */}
        <div ref={chatRef} style={{ flex: 1, overflow: 'auto', padding: '0 12px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: '#334155', fontSize: '0.7rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🐾</div>
              Habla o escribe para comenzar
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} style={{ marginBottom: 10 }}>
              {msg.role === 'user' ? (
                <div style={{
                  background: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.12)',
                  borderRadius: '14px 14px 4px 14px', padding: '8px 12px', marginLeft: 30,
                  fontSize: '0.72rem', color: '#d1fae5', lineHeight: 1.5,
                }}>{msg.text}</div>
              ) : (
                <div>
                  <div style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '4px 14px 14px 14px', padding: '10px 12px', marginRight: 10,
                  }}>
                    {/* Agent/model header */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#00e5b0' }}>{msg.agent || 'Hoku'}</span>
                      <span style={{ fontSize: '0.5rem', color: '#334155' }}>·</span>
                      <span style={{ fontSize: '0.5rem', color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>{msg.model || 'Fusion'}</span>
                      {msg.cost != null && msg.cost > 0 && <span style={{ fontSize: '0.5rem', color: '#f59e0b' }}>${msg.cost}</span>}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {msg.text || ''}
                      {streaming && msg.id === messages[messages.length - 1]?.id && <span style={{ color: '#00e5b0', animation: 'breathe 0.8s infinite' }}>▊</span>}
                    </div>
                    {/* Pipeline */}
                    {msg.pipeline != null && <PipelineDots stage={msg.pipeline} />}
                  </div>
                  {msg.tokens && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 3, paddingLeft: 4, fontSize: '0.5rem', color: '#334155' }}>
                      <span>{msg.duration}s</span><span>·</span><span>{msg.tokens} tok</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', background: '#0f1219', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', padding: '8px 10px' }}>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={streaming ? 'Procesando...' : 'Mensaje para Hoku...'}
              disabled={streaming} rows={1}
              style={{
                flex: 1, background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: '0.75rem',
                outline: 'none', resize: 'none', fontFamily: "'DM Sans', system-ui", lineHeight: 1.5,
                maxHeight: 80, minHeight: 28,
              }} />
            <button onClick={() => sendMessage()} disabled={streaming || !input.trim()} style={{
              width: 28, height: 28, borderRadius: 8, border: 'none', cursor: streaming ? 'default' : 'pointer',
              background: streaming || !input.trim() ? 'rgba(255,255,255,0.04)' : '#00e5b0',
              color: streaming || !input.trim() ? '#475569' : '#060a13',
              fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
            }}>↑</button>
          </div>
        </div>
      </div>

      {/* ── COL 2: Agentes + Terminal (flex) ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', minWidth: 0 }}>
        {/* Agent Grid 3x2 */}
        <div style={{ padding: '14px 16px 10px' }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Agentes Activos</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {GRID_AGENTS.map(a => {
              const isActive = a.id in activeAgents;
              const progress = activeAgents[a.id] ?? 0;
              const color = AGENT_COLORS[a.id] || '#64748b';
              return (
                <div key={a.id} style={{
                  background: isActive ? `${color}08` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isActive ? `${color}25` : 'rgba(255,255,255,0.04)'}`,
                  borderRadius: 10, padding: '10px', position: 'relative', overflow: 'hidden',
                  transition: 'all 0.3s',
                }}>
                  {/* Shimmer sweep */}
                  {isActive && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: `linear-gradient(90deg, transparent 0%, ${color}10 50%, transparent 100%)`,
                      animation: 'sweep 1.5s infinite',
                    }} />
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, position: 'relative' }}>
                    <span style={{ fontSize: '0.9rem' }}>{a.emoji}</span>
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: isActive ? color : '#94a3b8' }}>{a.name}</div>
                      <div style={{ fontSize: '0.5rem', color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>{a.model}</div>
                    </div>
                  </div>
                  {/* Status badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6, position: 'relative' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: isActive ? color : '#334155' }} />
                    <span style={{ fontSize: '0.5rem', color: isActive ? color : '#334155' }}>{isActive ? 'Ejecutando' : 'Standby'}</span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.04)', overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      background: isActive ? `linear-gradient(90deg, ${color}, ${color}80)` : 'transparent',
                      width: `${progress}%`, transition: 'width 0.2s',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '0 16px 10px' }}>
          {[
            { label: 'Tokens', value: kpis.tokens.toLocaleString(), color: '#00e5b0' },
            { label: 'Tareas', value: kpis.tasks, color: '#3b82f6' },
            { label: 'Costo', value: `$${kpis.cost.toFixed(3)}`, color: '#f59e0b' },
            { label: 'Avg Time', value: `${kpis.avgTime}s`, color: '#8b5cf6' },
          ].map(k => (
            <div key={k.label} style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: 8, padding: '8px 10px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: k.color, fontFamily: "'JetBrains Mono', monospace" }}>{k.value}</div>
              <div style={{ fontSize: '0.5rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Terminal */}
        <div style={{ flex: 1, margin: '0 16px 14px', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} />
            </div>
            <span style={{ fontSize: '0.55rem', color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>hoku-terminal</span>
          </div>
          <div ref={termRef} style={{
            flex: 1, background: '#060a13', padding: '8px 12px', overflow: 'auto',
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', lineHeight: 1.7,
          }}>
            {logs.length === 0 && <div style={{ color: '#1e293b' }}>$ esperando comandos...</div>}
            {logs.map(l => (
              <div key={l.id}>
                <span style={{ color: '#334155' }}>{l.ts}</span>
                {' '}
                <span style={{ color: l.color, fontWeight: 700, fontSize: '0.55rem', padding: '0 4px', background: `${l.color}10`, borderRadius: 3 }}>{l.tag}</span>
                {' '}
                <span style={{ color: '#94a3b8' }}>{l.text}</span>
              </div>
            ))}
            {streaming && <div style={{ color: '#00e5b0', animation: 'breathe 0.8s infinite' }}>▊ streaming...</div>}
          </div>
        </div>
      </div>

      {/* ── COL 3: Intranet Panel (380px) ── */}
      <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(255,255,255,0.06)', overflow: 'auto' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {([['intranet', 'Intranet'], ['resultado', 'Resultado'], ['aws', 'AWS']] as [RightTab, string][]).map(([t, l]) => (
            <button key={t} onClick={() => setRightTab(t)} style={{
              flex: 1, padding: '10px 0', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer',
              background: rightTab === t ? 'rgba(255,255,255,0.03)' : 'transparent',
              borderBottom: rightTab === t ? '2px solid #00e5b0' : '2px solid transparent',
              border: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              color: rightTab === t ? '#00e5b0' : '#475569',
            }}>{l}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '14px' }}>
          {/* Tab: Intranet */}
          {rightTab === 'intranet' && (
            <div>
              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Agentes', value: intranetKpis.agents, color: '#00e5b0' },
                  { label: 'Logs', value: intranetKpis.leads, color: '#3b82f6' },
                  { label: 'Deploys', value: intranetKpis.deploys, color: '#f59e0b' },
                ].map(k => (
                  <div key={k.label} style={{
                    background: `${k.color}08`, border: `1px solid ${k.color}15`, borderRadius: 8, padding: '10px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: k.color }}>{k.value}</div>
                    <div style={{ fontSize: '0.5rem', color: '#475569' }}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Agent table */}
              <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>Agentes</div>
              <div style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden', marginBottom: 16 }}>
                {GRID_AGENTS.map((a, i) => (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                    borderBottom: i < GRID_AGENTS.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.75rem' }}>{a.emoji}</span>
                      <span style={{ fontSize: '0.62rem', color: '#cbd5e1' }}>{a.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: '0.5rem', color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>{a.model}</span>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: a.id in activeAgents ? AGENT_COLORS[a.id] : '#22c55e',
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Live feed */}
              <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>Live Feed</div>
              {liveFeed.length === 0 && <div style={{ fontSize: '0.6rem', color: '#1e293b' }}>Sin actividad reciente</div>}
              {liveFeed.map(f => (
                <div key={f.id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.58rem' }}>
                  <span style={{ color: '#334155', fontFamily: "'JetBrains Mono', monospace" }}>{f.ts}</span>
                  {' '}
                  <span style={{ color: '#94a3b8' }}>{f.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tab: Resultado */}
          {rightTab === 'resultado' && (
            <div>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 10 }}>Ultimo Output</div>
              {lastResult ? (
                <div style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: 8, padding: '12px', fontSize: '0.68rem', color: '#cbd5e1',
                  lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>{lastResult}</div>
              ) : (
                <div style={{ color: '#1e293b', fontSize: '0.65rem', textAlign: 'center', padding: '40px 0' }}>
                  Sin resultado aun. Envia un mensaje a Hoku.
                </div>
              )}
            </div>
          )}

          {/* Tab: AWS */}
          {rightTab === 'aws' && (
            <div>
              {[
                { label: 'S3 Bucket', value: CONFIG.aws.s3Bucket, status: 'Active', color: '#22c55e' },
                { label: 'CloudFront', value: CONFIG.aws.cloudfrontDomain, status: 'Deployed', color: '#22c55e' },
                { label: 'Amplify App', value: CONFIG.aws.amplifyAppId, status: 'Running', color: '#22c55e' },
                { label: 'Region', value: CONFIG.aws.s3Region, status: 'sa-east-1', color: '#3b82f6' },
                { label: 'Domain', value: CONFIG.aws.intranetDomain, status: 'DNS OK', color: '#22c55e' },
              ].map(item => (
                <div key={item.label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#cbd5e1' }}>{item.label}</div>
                    <div style={{ fontSize: '0.52rem', color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>{item.value}</div>
                  </div>
                  <div style={{
                    padding: '3px 8px', borderRadius: 20, fontSize: '0.5rem', fontWeight: 600,
                    background: `${item.color}15`, color: item.color,
                  }}>{item.status}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 99px; }
        @keyframes breathe { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes sweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes ringpulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.4); opacity: 0; } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        textarea::placeholder { color: #2e4060; }
      `}</style>
    </div>
  );
}
