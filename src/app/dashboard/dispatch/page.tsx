// @ts-nocheck
'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { api, AGENT_COLORS, CONFIG } from '@/lib/config';

interface AgentCard {
  id: string; name: string; model: string; color: string;
  status: 'idle' | 'running' | 'done'; task: string; progress: number;
}

interface ChatMsg {
  role: 'user' | 'hoku';
  text: string;
  agent?: string; model?: string; cost?: string; tokens?: number; duration?: number;
  ts: string;
}

interface TermLine { ts: string; tag: string; color: string; text: string; }

const QUICK_ACTIONS = [
  { emoji: '🔍', label: 'Análisis UX', sub: 'Hoku · fusión', prompt: 'Analiza la UX de smconnection.cl. Da 3 mejoras concretas con impacto estimado.' },
  { emoji: '🚀', label: 'Deploy AWS', sub: 'Pipeline · real', prompt: 'Ejecuta verificación pre-deploy: health check endpoints, CDN status, S3 status.' },
  { emoji: '👥', label: 'Ver Leads', sub: 'Supabase · CRM', prompt: '¿Cuántos leads tenemos hoy? Dame un resumen del estado del CRM.' },
  { emoji: '💼', label: 'Propuesta SAP', sub: 'Hoku · ventas', prompt: 'Genera una propuesta de consultoría SAP BTP para un cliente retail en Chile. Incluye scope, timeline y pricing en UF.' },
];

const TAG_COLORS: Record<string, string> = {
  hoku: '#b794ff', groq: '#00e5b0', claude: '#b794ff', openai: '#1fd975',
  deepseek: '#4f8ef7', grok: '#f5a623', bedrock: '#ff8c42',
  system: '#6b8099', dispatch: '#00e5b0', ok: '#1fd975', error: '#ef4444', aws: '#ff8c42',
};

const now = () => new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export default function DispatchPage() {
  // Agents
  const [agents, setAgents] = useState<AgentCard[]>([
    { id: 'groq', name: 'Groq', model: 'llama-3.3-70b', color: '#f59e0b', status: 'idle', task: '', progress: 0 },
    { id: 'claude', name: 'Claude', model: 'haiku-4.5', color: '#00e5b0', status: 'idle', task: '', progress: 0 },
    { id: 'openai', name: 'OpenAI', model: 'gpt-4o-mini', color: '#10b981', status: 'idle', task: '', progress: 0 },
    { id: 'deepseek', name: 'DeepSeek', model: 'deepseek-chat', color: '#0ea5e9', status: 'idle', task: '', progress: 0 },
    { id: 'grok', name: 'Grok', model: 'grok-3-mini', color: '#8b5cf6', status: 'idle', task: '', progress: 0 },
    { id: 'bedrock', name: 'Bedrock', model: 'claude-3.5', color: '#f97316', status: 'idle', task: '', progress: 0 },
  ]);

  // Chat
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'hoku', text: '👋 Hola Guillermo. Estoy ejecutándome en tu Mac. Puedes darme tareas desde aquí y las ejecuto en segundo plano con 9 providers. ¿Qué necesitas?', ts: now() },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);

  // Terminal
  const [termLines, setTermLines] = useState<TermLine[]>([
    { ts: now(), tag: 'system', color: TAG_COLORS.system, text: 'Hoku Dispatch iniciado · 9 providers conectados' },
    { ts: now(), tag: 'system', color: TAG_COLORS.system, text: 'Esperando instrucciones...' },
  ]);
  const [termTab, setTermTab] = useState('hoku');

  // Metrics
  const [metrics, setMetrics] = useState({ tokens: 0, tasks: 0, cost: 0, avgTime: 0 });

  // Intranet panel
  const [iframeTab, setIframeTab] = useState('dashboard');
  const [liveFeed, setLiveFeed] = useState<string[]>([]);
  const [intranetStats, setIntranetStats] = useState({ agents: 0, leads: 0, deploy: '' });

  // Voice
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { addTerm('error', 'Speech API no disponible en este browser'); return; }
    const recognition = new SR();
    recognition.lang = 'es-CL';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setListening(false);
      executeTask(text);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    addTerm('dispatch', '🎤 Escuchando...');
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const speakText = (text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    // Clean text for speech
    const clean = text
      .replace(/```[\s\S]*?```/g, 'código generado')
      .replace(/[#*_`→✓●◌⟳]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .slice(0, 800);
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'es-CL';
    utterance.rate = 1.1;
    utterance.pitch = 1;
    // Try to find a Spanish voice
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v => v.lang.startsWith('es')) || voices[0];
    if (esVoice) utterance.voice = esVoice;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Refs
  const chatRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<HTMLDivElement>(null);

  // Load real data
  useEffect(() => {
    api({ action: 'list' }).then(d => {
      if (d.agents) setIntranetStats(s => ({ ...s, agents: d.agents.filter((a: Record<string, unknown>) => a.active).length }));
    }).catch(() => {});
    api({ action: 'query', table: 'leads', limit: 100 }).then(d => {
      if (d.data) setIntranetStats(s => ({ ...s, leads: d.data.length }));
    }).catch(() => {});
    api({ action: 'query', table: 'agent_logs', filter: 'agent_id=eq.deployer', order: 'created_at.desc', limit: 1 }).then(d => {
      if (d.data?.[0]) {
        const mins = Math.round((Date.now() - new Date(d.data[0].created_at).getTime()) / 60000);
        setIntranetStats(s => ({ ...s, deploy: mins < 60 ? `hace ${mins}m` : `hace ${Math.round(mins / 60)}h` }));
      }
    }).catch(() => {});
  }, []);

  // Auto-scroll
  useEffect(() => { chatRef.current && (chatRef.current.scrollTop = chatRef.current.scrollHeight); }, [messages]);
  useEffect(() => { termRef.current && (termRef.current.scrollTop = termRef.current.scrollHeight); }, [termLines]);

  const addTerm = useCallback((tag: string, text: string) => {
    setTermLines(p => [...p, { ts: now(), tag, color: TAG_COLORS[tag] || '#6b8099', text }]);
  }, []);

  const activateAgent = (id: string, task: string) => {
    setAgents(p => p.map(a => a.id === id ? { ...a, status: 'running', task: task.slice(0, 40) + '...', progress: 0 } : a));
    const interval = setInterval(() => {
      setAgents(p => {
        const agent = p.find(a => a.id === id);
        if (!agent || agent.progress >= 100) { clearInterval(interval); return p; }
        return p.map(a => a.id === id ? { ...a, progress: Math.min(100, a.progress + 8 + Math.random() * 12) } : a);
      });
    }, 300);
    return () => clearInterval(interval);
  };

  const completeAgent = (id: string) => {
    setAgents(p => p.map(a => a.id === id ? { ...a, status: 'done', progress: 100 } : a));
    setTimeout(() => setAgents(p => p.map(a => a.id === id ? { ...a, status: 'idle', task: '', progress: 0 } : a)), 3000);
  };

  // Execute real task via Hoku streaming
  const executeTask = async (prompt: string) => {
    if (streaming) return;
    setStreaming(true);
    const userMsg: ChatMsg = { role: 'user', text: prompt, ts: now() };
    setMessages(p => [...p, userMsg]);

    // Activate agents visually
    addTerm('dispatch', `Instrucción recibida: "${prompt.slice(0, 60)}..."`);
    addTerm('hoku', 'Enrutando a Hoku (fusión 9 agentes)...');
    const cleanup = activateAgent('groq', prompt);

    // Add typing indicator
    const typingMsg: ChatMsg = { role: 'hoku', text: '...', ts: now() };
    setMessages(p => [...p, typingMsg]);

    const start = Date.now();
    let fullText = '';
    let tokenCount = 0;

    try {
      const res = await fetch('/api/agents/stream', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, taskType: 'general', agentId: 'hoku', chatMode: true }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => '');
        addTerm('error', `Error: ${res.status} ${errText.slice(0, 100)}`);
        setMessages(p => { const u = [...p]; u[u.length - 1] = { role: 'hoku', text: `Error (${res.status})`, ts: now() }; return u; });
        setStreaming(false);
        return;
      }

      // Parse streaming
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Activate multiple agents as Hoku fusion runs
      const agentIds = ['claude', 'deepseek', 'grok'];
      agentIds.forEach((id, i) => setTimeout(() => activateAgent(id, prompt), 500 + i * 400));

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
              // Update message in place
              setMessages(prev => {
                const u = [...prev];
                u[u.length - 1] = { role: 'hoku', text: fullText, ts: now(), agent: 'Hoku', model: 'fusión 9in1' };
                return u;
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      addTerm('error', String(err).slice(0, 100));
    }

    const duration = Date.now() - start;
    const cost = Math.round(tokenCount * 0.00001 * 10000) / 10000;

    // Complete agents
    ['groq', 'claude', 'deepseek', 'grok'].forEach(id => completeAgent(id));

    // Update final message with metadata
    setMessages(prev => {
      const u = [...prev];
      u[u.length - 1] = { ...u[u.length - 1], cost: `$${cost}`, tokens: tokenCount, duration: Math.round(duration / 1000), ts: now() };
      return u;
    });

    // Terminal logs
    addTerm('ok', `✓ Completado · ${Math.round(duration / 1000)}s · ${tokenCount} tokens · $${cost}`);

    // Metrics
    setMetrics(p => ({
      tokens: p.tokens + tokenCount,
      tasks: p.tasks + 1,
      cost: Math.round((p.cost + cost) * 10000) / 10000,
      avgTime: Math.round(((p.avgTime * p.tasks + duration / 1000) / (p.tasks + 1)) * 10) / 10,
    }));

    // Live feed
    setLiveFeed(p => [`${now()} · Hoku · ${prompt.slice(0, 40)}...`, ...p].slice(0, 10));

    // Speak response
    if (fullText) speakText(fullText);

    setStreaming(false);
    cleanup?.();
  };

  const handleSend = () => {
    if (!input.trim() || streaming) return;
    executeTask(input.trim());
    setInput('');
  };

  const statusBadge = (s: string, color?: string) => (
    <span style={{ fontSize: '0.55rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: s === 'running' ? 'rgba(0,229,176,0.12)' : s === 'done' ? 'rgba(31,217,117,0.12)' : 'rgba(107,128,153,0.12)', color: s === 'running' ? '#00e5b0' : s === 'done' ? '#1fd975' : '#6b8099', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', boxShadow: s === 'running' ? '0 0 6px currentColor' : 'none', animation: s === 'running' ? 'breathe 1.5s infinite' : 'none' }} />
      {s === 'running' ? 'Ejecutando' : s === 'done' ? 'Listo' : 'Activo'}
    </span>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 34px)', overflow: 'hidden', background: '#05070e' }}>
      {/* TOPNAV */}
      <div style={{ height: 46, flexShrink: 0, background: '#0a0f1e', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12 }}>
        <span style={{ fontFamily: 'system-ui', fontWeight: 800, color: '#00e5b0', fontSize: '0.85rem' }}>SC</span>
        <span style={{ color: '#dde4f0', fontWeight: 700, fontSize: '0.8rem' }}>Hoku Dispatch</span>
        <span style={{ fontSize: '0.55rem', padding: '2px 8px', borderRadius: 6, background: 'rgba(0,229,176,0.1)', color: '#00e5b0', fontWeight: 700 }}>9in1</span>
        <span style={{ fontSize: '0.6rem', color: '#6b8099', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1fd975', boxShadow: '0 0 8px #1fd975', animation: 'breathe 2s infinite' }} />
          Dispatch activo · Mac conectada
        </span>
        <div style={{ flex: 1 }} />
        <a href="/dashboard" style={{ fontSize: '0.65rem', color: '#6b8099', textDecoration: 'none', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>⊞ Dashboard</a>
        <a href="/dashboard/deploy" style={{ fontSize: '0.65rem', color: '#6b8099', textDecoration: 'none', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>☁ AWS</a>
        <button onClick={() => executeTask('Ejecuta verificación pre-deploy completa: health check, CDN, S3, Amplify status.')} disabled={streaming} style={{ fontSize: '0.65rem', padding: '4px 12px', borderRadius: 6, background: 'rgba(0,229,176,0.1)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.2)', cursor: 'pointer', fontWeight: 700 }}>🚀 Deploy Now</button>
      </div>

      {/* 3 COLUMNS */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* COL 1: DISPATCH */}
        <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.06)', background: '#0a0f1e' }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#dde4f0' }}>🐾 Hoku Dispatch</div>
                <div style={{ fontSize: '0.6rem', color: '#6b8099', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#1fd975', animation: 'breathe 2s infinite' }} />
                  Mac conectada · {new Date().toLocaleDateString('es-CL')}
                </div>
              </div>
              <span style={{ fontSize: '1.1rem', fontFamily: "'JetBrains Mono', monospace", color: '#dde4f0', fontWeight: 700 }}>{new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '10px 12px' }}>
            {QUICK_ACTIONS.map(qa => (
              <button key={qa.label} onClick={() => executeTask(qa.prompt)} disabled={streaming}
                style={{ background: '#0f1628', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px', cursor: streaming ? 'not-allowed' : 'pointer', textAlign: 'center', transition: 'all 0.15s', opacity: streaming ? 0.5 : 1 }}>
                <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{qa.emoji}</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#dde4f0' }}>{qa.label}</div>
                <div style={{ fontSize: '0.52rem', color: '#6b8099' }}>{qa.sub}</div>
              </button>
            ))}
          </div>

          {/* Chat Feed */}
          <div ref={chatRef} style={{ flex: 1, overflow: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '92%', padding: '9px 12px', borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, #0f1628, #161f38)' : '#0f1628',
                  border: `1px solid ${msg.role === 'user' ? 'rgba(0,229,176,0.15)' : 'rgba(255,255,255,0.04)'}`,
                  fontSize: '0.72rem', lineHeight: 1.6, color: '#dde4f0', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {msg.text === '...' ? (
                    <span style={{ display: 'flex', gap: 3 }}>{[0, 1, 2].map(d => <span key={d} style={{ width: 5, height: 5, borderRadius: '50%', background: '#00e5b0', animation: `breathe 1s ${d * 0.2}s infinite` }} />)}</span>
                  ) : msg.text}
                  {msg.agent && (
                    <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.55rem', color: '#6b8099' }}>
                      <span style={{ color: '#00e5b0', fontWeight: 700 }}>✓ {msg.agent}</span>
                      <span>{msg.model}</span>
                      {msg.duration && <span>{msg.duration}s</span>}
                      {msg.cost && <span style={{ color: '#1fd975' }}>{msg.cost}</span>}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: '0.5rem', color: '#2e4060', marginTop: 2, padding: '0 4px' }}>{msg.ts}</span>
              </div>
            ))}
          </div>

          {/* Voice controls */}
          <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <button onClick={() => setVoiceEnabled(!voiceEnabled)} style={{
              fontSize: '0.55rem', padding: '2px 8px', borderRadius: 5, cursor: 'pointer',
              background: voiceEnabled ? 'rgba(0,229,176,0.1)' : 'rgba(255,255,255,0.03)',
              color: voiceEnabled ? '#00e5b0' : '#6b8099',
              border: `1px solid ${voiceEnabled ? 'rgba(0,229,176,0.2)' : 'rgba(255,255,255,0.04)'}`,
            }}>{voiceEnabled ? '🔊 Voz ON' : '🔇 Voz OFF'}</button>
            {speaking && <span style={{ fontSize: '0.55rem', color: '#00e5b0', animation: 'breathe 1s infinite' }}>🔊 Hoku hablando...</span>}
            {speaking && <button onClick={() => { window.speechSynthesis.cancel(); setSpeaking(false); }} style={{ fontSize: '0.55rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>⏹ Parar</button>}
          </div>

          {/* Input */}
          <div style={{ padding: '6px 12px 10px', display: 'flex', gap: 6 }}>
            {/* Mic button */}
            <button onClick={listening ? stopListening : startListening} disabled={streaming}
              style={{
                width: 34, height: 34, borderRadius: 8, border: 'none', cursor: streaming ? 'default' : 'pointer',
                background: listening ? 'linear-gradient(135deg, #ef4444, #dc2626)' : '#0f1628',
                color: listening ? '#fff' : '#6b8099', fontSize: '0.9rem',
                boxShadow: listening ? '0 0 16px rgba(239,68,68,0.4)' : 'none',
                animation: listening ? 'breathe 0.8s infinite' : 'none',
                transition: 'all 0.2s',
              }}>🎤</button>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={listening ? '🎤 Escuchando...' : streaming ? 'Hoku procesando...' : 'Escribe o habla...'}
              disabled={streaming || listening}
              style={{ flex: 1, background: '#0f1628', border: `1px solid ${listening ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, padding: '8px 12px', color: '#dde4f0', fontSize: '0.72rem', outline: 'none', fontFamily: "'DM Sans', system-ui", transition: 'border-color 0.2s' }} />
            <button onClick={handleSend} disabled={streaming || !input.trim()}
              style={{ width: 34, height: 34, borderRadius: 8, background: streaming ? '#161f38' : '#00e5b0', border: 'none', color: streaming ? '#6b8099' : '#05070e', cursor: streaming ? 'default' : 'pointer', fontSize: '0.85rem', fontWeight: 700 }}>→</button>
          </div>
        </div>

        {/* COL 2: AGENTS + TERMINAL */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Agent Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: '10px 12px' }}>
            {agents.map(a => (
              <div key={a.id} style={{
                background: '#0a0f1e', border: `1px solid ${a.status === 'running' ? 'rgba(0,229,176,0.25)' : 'rgba(255,255,255,0.04)'}`,
                borderRadius: 10, padding: '10px 12px', transition: 'all 0.2s',
                boxShadow: a.status === 'running' ? '0 0 20px rgba(0,229,176,0.08)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.color }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dde4f0' }}>{a.name}</span>
                  </div>
                  {statusBadge(a.status)}
                </div>
                <div style={{ fontSize: '0.55rem', color: '#6b8099', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minHeight: 14 }}>
                  {a.task || `${a.model}`}
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${a.progress}%`, background: a.status === 'done' ? '#1fd975' : '#00e5b0', borderRadius: 99, transition: 'width 0.3s ease' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Metrics */}
          <div style={{ display: 'flex', gap: 6, padding: '0 12px 8px' }}>
            {[
              { label: 'Tokens', value: metrics.tokens.toLocaleString(), color: '#4f8ef7' },
              { label: 'Tareas', value: metrics.tasks, color: '#00e5b0' },
              { label: 'Costo', value: `$${metrics.cost}`, color: '#1fd975' },
              { label: 'Avg', value: `${metrics.avgTime}s`, color: '#f5a623' },
            ].map(m => (
              <div key={m.label} style={{ flex: 1, background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: m.color, fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</div>
                <div style={{ fontSize: '0.52rem', color: '#6b8099', marginTop: 2 }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* Terminal */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', margin: '0 12px 10px', background: '#060a13', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {['hoku', 'deploy', 'aws'].map(t => (
                <button key={t} onClick={() => setTermTab(t)} style={{
                  padding: '6px 14px', fontSize: '0.6rem', fontWeight: 600, cursor: 'pointer',
                  background: termTab === t ? 'rgba(255,255,255,0.04)' : 'transparent',
                  color: termTab === t ? '#dde4f0' : '#6b8099',
                  border: 'none', borderBottom: termTab === t ? '2px solid #00e5b0' : '2px solid transparent',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>{t}</button>
              ))}
            </div>
            <div ref={termRef} style={{ flex: 1, overflow: 'auto', padding: '8px 10px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem', lineHeight: 1.8 }}>
              {termLines.map((l, i) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: '#2e4060', minWidth: 55, flexShrink: 0 }}>{l.ts}</span>
                  <span style={{ color: l.color, fontWeight: 700, minWidth: 60, flexShrink: 0, textAlign: 'right' }}>{l.tag}</span>
                  <span style={{ color: '#dde4f0' }}>{l.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COL 3: INTRANET PANEL */}
        <div style={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(255,255,255,0.06)', background: '#0a0f1e' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {['dashboard', 'resultado', 'aws'].map(t => (
              <button key={t} onClick={() => setIframeTab(t)} style={{
                flex: 1, padding: '8px', fontSize: '0.62rem', fontWeight: 600, cursor: 'pointer',
                background: iframeTab === t ? 'rgba(255,255,255,0.03)' : 'transparent',
                color: iframeTab === t ? '#dde4f0' : '#6b8099', border: 'none',
                borderBottom: iframeTab === t ? '2px solid #00e5b0' : '2px solid transparent',
                textTransform: 'capitalize',
              }}>{t}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
            {iframeTab === 'dashboard' && (
              <>
                {/* KPIs */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {[
                    { v: intranetStats.agents, l: 'Agentes', c: '#00e5b0' },
                    { v: intranetStats.leads, l: 'Leads', c: '#4f8ef7' },
                    { v: intranetStats.deploy || '✓', l: 'Deploy', c: '#1fd975' },
                  ].map(k => (
                    <div key={k.l} style={{ flex: 1, background: '#0f1628', borderRadius: 8, padding: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: k.c }}>{k.v}</div>
                      <div style={{ fontSize: '0.52rem', color: '#6b8099', marginTop: 2 }}>{k.l}</div>
                    </div>
                  ))}
                </div>

                {/* Agents table */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#6b8099', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agentes IA</div>
                  {agents.map(a => (
                    <div key={a.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, marginBottom: 2,
                      background: a.status === 'running' ? 'rgba(0,229,176,0.04)' : 'transparent',
                      transition: 'background 0.3s',
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: a.color }} />
                      <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#dde4f0', flex: 1 }}>{a.name}</span>
                      {statusBadge(a.status)}
                    </div>
                  ))}
                </div>

                {/* Live Feed */}
                <div>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#6b8099', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Feed</div>
                  {liveFeed.length === 0 ? (
                    <div style={{ fontSize: '0.6rem', color: '#2e4060', padding: '12px', textAlign: 'center' }}>Esperando actividad...</div>
                  ) : liveFeed.map((l, i) => (
                    <div key={i} style={{ fontSize: '0.58rem', color: '#6b8099', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.02)', fontFamily: "'JetBrains Mono', monospace" }}>{l}</div>
                  ))}
                </div>
              </>
            )}

            {iframeTab === 'resultado' && (
              <div style={{ fontSize: '0.7rem', color: '#dde4f0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {messages.filter(m => m.role === 'hoku' && m.agent).slice(-1)[0]?.text || 'Ejecuta una tarea para ver el resultado aquí.'}
              </div>
            )}

            {iframeTab === 'aws' && (
              <>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#6b8099', marginBottom: 8, textTransform: 'uppercase' }}>AWS Status</div>
                {[
                  { name: 'S3 smartconnetion25', status: 'Operational', region: 'sa-east-1' },
                  { name: 'CloudFront E3O4YBX', status: 'Deployed', region: 'Global' },
                  { name: 'Amplify d2qam7xc', status: 'Active', region: 'us-east-1' },
                ].map(s => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#0f1628', borderRadius: 8, marginBottom: 6, border: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1fd975', boxShadow: '0 0 6px #1fd975' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#dde4f0' }}>{s.name}</div>
                      <div style={{ fontSize: '0.52rem', color: '#6b8099' }}>{s.region}</div>
                    </div>
                    <span style={{ fontSize: '0.55rem', color: '#1fd975', fontWeight: 700 }}>{s.status}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', system-ui, sans-serif; background: #05070e; color: #dde4f0; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #161f38; border-radius: 99px; }
        @keyframes breathe { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        input::placeholder { color: #2e4060; }
      `}</style>
    </div>
  );
}
