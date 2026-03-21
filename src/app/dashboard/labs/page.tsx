'use client';
import { useState, useRef, useCallback, useEffect } from 'react';

interface AgentConfig {
  id: string;
  name: string;
  model: string;
  color: string;
  role: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

interface SessionRecord {
  id: string;
  agent: string;
  prompt: string;
  result: string;
  ts: number;
}

const AGENTS: AgentConfig[] = [
  { id: 'groq', name: 'Groq', model: 'llama-3.3-70b', color: '#f59e0b', role: 'Inferencia ultra rápida', temperature: 0.7, maxTokens: 2048, systemPrompt: 'Eres un asistente técnico. Responde en español.' },
  { id: 'claude', name: 'Claude', model: 'claude-sonnet-4-5', color: '#00e5b0', role: 'Desarrollo & Code Review', temperature: 0.7, maxTokens: 4096, systemPrompt: 'Eres un experto en desarrollo. Responde en español.' },
  { id: 'gemini', name: 'Gemini', model: 'gemini-2.0-flash', color: '#22c55e', role: 'SEO & Analytics', temperature: 0.7, maxTokens: 2048, systemPrompt: 'Eres un experto en SEO. Responde en español.' },
  { id: 'grok', name: 'Grok', model: 'grok-3', color: '#8b5cf6', role: 'Análisis & Research', temperature: 0.7, maxTokens: 2048, systemPrompt: 'Eres un analista de mercado. Responde en español.' },
];

const PLACEHOLDERS: Record<string, string> = {
  groq: 'Escribe el copy para la sección hero en es/en...',
  claude: 'Revisa el código de src/lib/agents/ y sugiere mejoras...',
  gemini: 'Genera el SEO structured data para la página /es...',
  grok: 'Analiza las métricas de analytics y detecta patrones...',
};

export default function LabsPage() {
  const [selectedAgent, setSelectedAgent] = useState('groq');
  const [task, setTask] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [tokens, setTokens] = useState(0);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [contextFiles, setContextFiles] = useState<string[]>([]);
  const [contextInput, setContextInput] = useState('');
  const [leftW, setLeftW] = useState(260);
  const [rightW, setRightW] = useState(300);
  const outputRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const agent = AGENTS.find(a => a.id === selectedAgent) || AGENTS[0];

  useEffect(() => { try { const s = localStorage.getItem('labs-sessions'); if (s) setSessions(JSON.parse(s)); } catch {} }, []);
  const saveSessions = (s: SessionRecord[]) => { setSessions(s); try { localStorage.setItem('labs-sessions', JSON.stringify(s.slice(0, 20))); } catch {} };

  const execute = useCallback(async () => {
    if (!task.trim() || running) return;
    setRunning(true); setOutput(''); setElapsed(0); setTokens(0);
    const start = Date.now();
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 100);
    window.dispatchEvent(new CustomEvent('exec-agent', { detail: { agent: selectedAgent, prompt: task, taskType: 'general' } }));

    try {
      const res = await fetch('/api/agents/stream', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: task, taskType: 'general', agentId: selectedAgent }),
      });
      if (!res.ok || !res.body) { setOutput(`Error: ${res.status}`); setRunning(false); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '', full = '', tokenCount = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;
          try { const p = JSON.parse(data); if (p.content) { full += p.content; tokenCount += p.content.split(/\s+/).length; setOutput(full); setTokens(tokenCount); } } catch {}
        }
      }
      saveSessions([{ id: String(Date.now()), agent: selectedAgent, prompt: task, result: full, ts: Date.now() }, ...sessions]);
    } catch (err) { setOutput(`Error: ${String(err)}`); }
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
  }, [task, selectedAgent, running, sessions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); execute(); }
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) { e.preventDefault(); execute(); }
  };

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const startResize = (side: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = side === 'left' ? leftW : rightW;
    const onMove = (ev: MouseEvent) => { const d = side === 'left' ? ev.clientX - startX : startX - ev.clientX; const w = Math.max(200, Math.min(400, startW + d)); if (side === 'left') setLeftW(w); else setRightW(w); };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  };

  useEffect(() => { if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight; }, [output]);

  return (
    <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 34px)', overflow: 'hidden' }}>
      {/* LEFT: Agent Selector */}
      <div style={{ width: leftW, minWidth: 200, background: '#0a0d14', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Agentes</div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          {AGENTS.map(a => (
            <div key={a.id} onClick={() => setSelectedAgent(a.id)} style={{
              padding: '10px 12px', borderRadius: 10, marginBottom: 4, cursor: 'pointer',
              background: selectedAgent === a.id ? `${a.color}10` : 'transparent',
              border: selectedAgent === a.id ? `1px solid ${a.color}30` : '1px solid transparent',
              transition: 'all 0.15s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, boxShadow: selectedAgent === a.id ? `0 0 8px ${a.color}60` : 'none' }}></span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: selectedAgent === a.id ? a.color : '#e2e8f0' }}>{a.name}</span>
              </div>
              <div style={{ fontSize: '0.62rem', color: '#475569', marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>{a.model}</div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 2 }}>{a.role}</div>
            </div>
          ))}
        </div>
        {sessions.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 8px', marginBottom: 4 }}>Recientes</div>
            {sessions.slice(0, 5).map(s => (
              <div key={s.id} onClick={() => { setSelectedAgent(s.agent); setTask(s.prompt); setOutput(s.result); }} style={{
                padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.65rem',
                color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                <span style={{ color: AGENTS.find(a => a.id === s.agent)?.color || '#94a3b8', marginRight: 4 }}>●</span>
                {s.prompt.slice(0, 40)}{s.prompt.length > 40 ? '...' : ''}
              </div>
            ))}
          </div>
        )}
      </div>

      <div onMouseDown={startResize('left')} style={{ width: 4, cursor: 'col-resize', flexShrink: 0 }}><div style={{ width: 1, height: '100%', background: 'rgba(255,255,255,0.04)', margin: '0 auto' }}></div></div>

      {/* CENTER: Task Editor + Output */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 300, overflow: 'hidden' }}>
        <div style={{ height: 44, minHeight: 44, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0a0d14' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: agent.color }}></span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9' }}>{agent.name}</span>
          </div>
          <span style={{ fontSize: '0.62rem', color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>{agent.model}</span>
          <div style={{ flex: 1 }}></div>
          <button onClick={execute} disabled={running || !task.trim()} style={{
            background: running ? '#1a2235' : `linear-gradient(135deg, ${agent.color}, ${agent.color}cc)`,
            color: running ? '#64748b' : '#0a0d14', border: 'none',
            padding: '6px 16px', borderRadius: 8, fontWeight: 700, fontSize: '0.72rem',
            cursor: running ? 'not-allowed' : 'pointer', fontFamily: "'Inter', system-ui",
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {running ? <><span style={{ width: 10, height: 10, border: '2px solid #475569', borderTopColor: agent.color, borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }}></span> {fmtTime(elapsed)}</> : <>▶ Run</>}
          </button>
          {running && <button onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setRunning(false); }} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>⏹</button>}
        </div>

        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <textarea value={task} onChange={e => setTask(e.target.value)} onKeyDown={handleKeyDown} placeholder={PLACEHOLDERS[selectedAgent] || 'Escribe tu tarea...'} rows={4} style={{
            width: '100%', background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', color: '#e2e8f0', fontSize: '0.82rem', fontFamily: "'Inter', system-ui", lineHeight: 1.6, resize: 'vertical', outline: 'none', minHeight: 80, maxHeight: 200,
          }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: '0.6rem', color: '#334155' }}>
            <span>Enter = ejecutar</span><span>·</span><span>Shift+Enter = nueva línea</span>
          </div>
        </div>

        <div ref={outputRef} style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {!output && !running ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#1e293b' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 12, opacity: 0.3 }}>⚡</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Selecciona un agente y escribe tu tarea</div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', background: '#111827', borderRadius: 8, border: `1px solid ${agent.color}20` }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: running ? agent.color : '#22c55e', boxShadow: running ? `0 0 8px ${agent.color}` : '0 0 8px #22c55e', animation: running ? 'pulse 1.5s infinite' : 'none' }}></span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: agent.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{agent.name}</span>
                <span style={{ fontSize: '0.62rem', color: '#475569', marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace" }}>{fmtTime(elapsed)} · ~{tokens} tok</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {output}
                {running && <span style={{ display: 'inline-block', width: 7, height: 14, background: agent.color, marginLeft: 2, animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom' }}></span>}
              </div>
              {!running && output && (
                <div style={{ display: 'flex', gap: 6, marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  {[{ icon: '📋', label: 'Copiar', action: () => navigator.clipboard.writeText(output) }, { icon: '🔄', label: 'Re-ejecutar', action: execute }].map(b => (
                    <button key={b.label} onClick={b.action} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '5px 10px', color: '#64748b', fontSize: '0.68rem', fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 4 }}>{b.icon} {b.label}</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div onMouseDown={startResize('right')} style={{ width: 4, cursor: 'col-resize', flexShrink: 0 }}><div style={{ width: 1, height: '100%', background: 'rgba(255,255,255,0.04)', margin: '0 auto' }}></div></div>

      {/* RIGHT: Context */}
      <div style={{ width: rightW, minWidth: 200, background: '#0a0d14', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Contexto</div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, padding: '0 4px' }}>Archivos</div>
            {contextFiles.length === 0 ? (
              <div style={{ fontSize: '0.68rem', color: '#1e293b', padding: '8px 4px' }}>Sin archivos de contexto</div>
            ) : contextFiles.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 6, fontSize: '0.68rem', color: '#94a3b8', background: 'rgba(255,255,255,0.02)', marginBottom: 2 }}>
                <span style={{ color: '#3b82f6' }}>📄</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</span>
                <span onClick={() => setContextFiles(prev => prev.filter((_, j) => j !== i))} style={{ color: '#334155', cursor: 'pointer', fontSize: '0.7rem' }}>×</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              <input value={contextInput} onChange={e => setContextInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && contextInput.trim()) { setContextFiles(prev => [...prev, contextInput.trim()]); setContextInput(''); } }} placeholder="ruta/archivo.ts" style={{ flex: 1, background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '5px 8px', color: '#e2e8f0', fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", outline: 'none' }} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, padding: '0 4px' }}>Tokens</div>
            <div style={{ background: '#111827', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.65rem' }}>
                <span style={{ color: '#64748b' }}>Contexto</span>
                <span style={{ color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}>{task.split(/\s+/).filter(Boolean).length} tok</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${Math.min((task.split(/\s+/).filter(Boolean).length / agent.maxTokens) * 100, 100)}%`, background: agent.color, borderRadius: 999, transition: 'width 0.3s' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem' }}>
                <span style={{ color: '#334155' }}>Max: {agent.maxTokens}</span>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, padding: '0 4px' }}>Config</div>
            <div style={{ background: '#111827', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: '0.6rem', color: '#475569', marginBottom: 4 }}>Temperature</div>
                <input type="range" min="0" max="1" step="0.1" defaultValue={agent.temperature} style={{ width: '100%', accentColor: agent.color }} />
              </div>
              <div>
                <div style={{ fontSize: '0.6rem', color: '#475569', marginBottom: 4 }}>System Prompt</div>
                <textarea defaultValue={agent.systemPrompt} rows={3} style={{ width: '100%', background: '#0a0d14', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '6px 8px', color: '#94a3b8', fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", resize: 'vertical', outline: 'none' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0 } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
      `}</style>
    </div>
  );
}
