'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

interface TermLine {
  time: string;
  tag: string;
  tagColor: string;
  text: string;
  type?: 'system' | 'error' | 'success';
}

interface TermSession {
  id: string;
  agent: string;
  color: string;
  lines: TermLine[];
  running: boolean;
  newLines: number;
}

const TAG_COLORS: Record<string, string> = {
  claude: '#00e5b0', groq: '#f59e0b', grok: '#8b5cf6',
  gemini: '#22c55e', deploy: '#3b82f6', system: '#64748b',
  aws: '#f97316', error: '#ef4444', success: '#22c55e',
};

const now = () => new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export default function GlobalTerminal() {
  const [mode, setMode] = useState<'minimized' | 'normal' | 'expanded' | 'fullscreen'>('minimized');
  const [sessions, setSessions] = useState<TermSession[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [customH, setCustomH] = useState(0);

  const heights: Record<string, number | string> = { minimized: 34, normal: 240, expanded: 400, fullscreen: '100vh' };
  const height = customH > 0 && mode === 'normal' ? customH : heights[mode];

  // Listen for external events
  useEffect(() => {
    const toggleHandler = () => setMode(m => m === 'minimized' ? 'normal' : 'minimized');
    const execHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const { agent, prompt, taskType } = detail;
      const sessionId = `${agent}-${Date.now()}`;
      const color = TAG_COLORS[agent] || '#94a3b8';
      const newSession: TermSession = {
        id: sessionId, agent, color, running: true, newLines: 0,
        lines: [{ time: now(), tag: 'system', tagColor: TAG_COLORS.system, text: `Ejecutando ${agent}...` }],
      };
      setSessions(prev => [...prev, newSession]);
      setActiveTab(sessionId);
      setMode(m => m === 'minimized' ? 'normal' : m);

      // Start streaming
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      fetch('/api/agents/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, taskType, agentId: agent }),
        signal: controller.signal,
      }).then(async res => {
        if (!res.ok || !res.body) {
          setSessions(prev => prev.map(s => s.id === sessionId ? {
            ...s, running: false,
            lines: [...s.lines, { time: now(), tag: 'error', tagColor: TAG_COLORS.error, text: `Error: ${res.status}` }],
          } : s));
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

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
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullText += parsed.content;
                // Split by newlines for terminal display
                const displayLines = fullText.split('\n');
                setSessions(prev => prev.map(s => {
                  if (s.id !== sessionId) return s;
                  const termLines: TermLine[] = [
                    { time: now(), tag: 'system', tagColor: TAG_COLORS.system, text: `Ejecutando ${agent}...` },
                    ...displayLines.map(dl => ({
                      time: '', tag: agent, tagColor: color, text: dl,
                    })),
                  ];
                  return { ...s, lines: termLines, newLines: s.id === activeTab ? 0 : (s.newLines || 0) + 1 };
                }));
              }
            } catch {}
          }
        }

        setSessions(prev => prev.map(s => s.id === sessionId ? {
          ...s, running: false,
          lines: [...s.lines, { time: now(), tag: 'success', tagColor: TAG_COLORS.success, text: 'Completado' }],
        } : s));
      }).catch(err => {
        setSessions(prev => prev.map(s => s.id === sessionId ? {
          ...s, running: false,
          lines: [...s.lines, { time: now(), tag: 'error', tagColor: TAG_COLORS.error, text: String(err) }],
        } : s));
      });
    };

    window.addEventListener('toggle-terminal', toggleHandler);
    window.addEventListener('exec-agent', execHandler);
    return () => {
      window.removeEventListener('toggle-terminal', toggleHandler);
      window.removeEventListener('exec-agent', execHandler);
      abortRef.current?.abort();
    };
  }, [activeTab]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [sessions, activeTab]);

  const activeSession = sessions.find(s => s.id === activeTab);

  const handleInput = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      const cmd = input.trim();
      setHistory(h => [cmd, ...h].slice(0, 50));
      setHistoryIdx(-1);
      setInput('');
      // Parse: "claude analyze X" or "groq write Y"
      const parts = cmd.split(' ');
      const agent = parts[0].toLowerCase();
      const prompt = parts.slice(1).join(' ');
      if (['claude', 'groq', 'grok', 'gemini'].includes(agent) && prompt) {
        window.dispatchEvent(new CustomEvent('exec-agent', { detail: { agent, prompt, taskType: 'general' } }));
      } else {
        // Add as system message
        const sessionId = activeTab || 'system';
        setSessions(prev => {
          const existing = prev.find(s => s.id === sessionId);
          if (existing) {
            return prev.map(s => s.id === sessionId ? {
              ...s, lines: [...s.lines, { time: now(), tag: 'system', tagColor: TAG_COLORS.system, text: `> ${cmd}` }],
            } : s);
          }
          return [...prev, {
            id: 'system', agent: 'system', color: '#64748b', running: false, newLines: 0,
            lines: [{ time: now(), tag: 'system', tagColor: TAG_COLORS.system, text: `> ${cmd}` }],
          }];
        });
        if (!activeTab) setActiveTab('system');
      }
    }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHistoryIdx(i => { const next = Math.min(i + 1, history.length - 1); setInput(history[next] || ''); return next; }); }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHistoryIdx(i => { const next = Math.max(i - 1, -1); setInput(next === -1 ? '' : history[next]); return next; }); }
    if (e.ctrlKey && e.key === 'l') { e.preventDefault(); setSessions(prev => prev.map(s => s.id === activeTab ? { ...s, lines: [] } : s)); }
  }, [input, history, activeTab]);

  const closeSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeTab === id) setActiveTab(sessions.find(s => s.id !== id)?.id || null);
  };

  // Drag resize
  const onDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const h = typeof height === 'number' ? height : window.innerHeight;
    dragRef.current = { startY: e.clientY, startH: h };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = dragRef.current.startY - ev.clientY;
      const newH = Math.max(150, Math.min(600, dragRef.current.startH + delta));
      setCustomH(newH);
      setMode('normal');
    };
    const onUp = () => { dragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div className="global-terminal-wrap" style={{
      position: 'fixed', bottom: 0, left: 64, right: 0, zIndex: 90,
      height: typeof height === 'string' ? height : height,
      background: '#0d1117', borderTop: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', flexDirection: 'column',
      transition: mode === 'fullscreen' ? 'none' : 'height 0.2s ease',
      fontFamily: "'Inter', system-ui",
    }}>
      {/* Drag handle */}
      {mode !== 'minimized' && (
        <div onMouseDown={onDragStart} style={{
          height: 4, cursor: 'row-resize', background: 'transparent',
          position: 'absolute', top: -2, left: 0, right: 0, zIndex: 1,
        }}>
          <div style={{ width: 40, height: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto', marginTop: 1 }}></div>
        </div>
      )}

      {/* Topbar */}
      <div style={{
        height: 34, minHeight: 34, display: 'flex', alignItems: 'center', gap: 0,
        padding: '0 8px', borderBottom: mode !== 'minimized' ? '1px solid rgba(255,255,255,0.06)' : 'none',
        background: '#0d1117', cursor: mode === 'minimized' ? 'pointer' : 'default',
      }} onClick={() => mode === 'minimized' && setMode('normal')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#00e5b0', letterSpacing: '0.05em' }}>TERMINAL</span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, flex: 1, overflow: 'hidden' }}>
          {sessions.map(s => (
            <div key={s.id} onClick={e => { e.stopPropagation(); setActiveTab(s.id); if (mode === 'minimized') setMode('normal'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                borderRadius: 4, fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer',
                background: activeTab === s.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: activeTab === s.id ? s.color : '#475569',
                transition: 'all 0.1s',
              }}>
              {s.running && <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, boxShadow: `0 0 6px ${s.color}`, animation: 'pulse 1.5s infinite' }}></span>}
              <span>{s.agent}</span>
              {s.newLines > 0 && activeTab !== s.id && (
                <span style={{ background: s.color, color: '#0d1117', fontSize: '0.5rem', fontWeight: 800, padding: '0 4px', borderRadius: 999, minWidth: 14, textAlign: 'center' }}>{s.newLines}</span>
              )}
              <span onClick={e => { e.stopPropagation(); closeSession(s.id); }} style={{ color: '#334155', cursor: 'pointer', marginLeft: 2, fontSize: '0.7rem' }}>×</span>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 2, marginLeft: 'auto' }}>
          <button onClick={e => { e.stopPropagation(); setMode('minimized'); }} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '2px 4px', fontSize: '0.75rem' }} title="Minimizar (⌘`)">─</button>
          <button onClick={e => { e.stopPropagation(); setMode(m => m === 'fullscreen' ? 'normal' : 'fullscreen'); }} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '2px 4px', fontSize: '0.7rem' }} title="Fullscreen">□</button>
        </div>
      </div>

      {/* Terminal body */}
      {mode !== 'minimized' && (
        <>
          <div ref={scrollRef} style={{
            flex: 1, overflow: 'auto', padding: '8px 16px',
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', lineHeight: 1.7,
          }}>
            {!activeSession ? (
              <div style={{ color: '#334155', padding: '16px 0' }}>
                <div style={{ marginBottom: 8 }}>Escribe un comando: <span style={{ color: '#475569' }}>groq &lt;prompt&gt;</span> o <span style={{ color: '#475569' }}>claude &lt;prompt&gt;</span></div>
                <div style={{ color: '#1e293b' }}>Tip: usa ⌘K para abrir el Command Bar</div>
              </div>
            ) : (
              activeSession.lines.map((line, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, minHeight: 20 }}>
                  {line.time && <span style={{ color: '#334155', minWidth: 55, flexShrink: 0 }}>{line.time}</span>}
                  {line.tag && <span style={{ color: line.tagColor, minWidth: 50, fontWeight: 600, flexShrink: 0 }}>[{line.tag}]</span>}
                  <span style={{ color: line.type === 'error' ? '#ef4444' : line.type === 'success' ? '#22c55e' : '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{line.text}</span>
                </div>
              ))
            )}
            {activeSession?.running && (
              <span style={{ display: 'inline-block', width: 7, height: 14, background: activeSession.color, animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom' }}></span>
            )}
          </div>

          {/* Input line */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderTop: '1px solid rgba(255,255,255,0.04)',
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem',
          }}>
            <span style={{ color: '#00e5b0', fontWeight: 600, flexShrink: 0 }}>smconn@labs:~$</span>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleInput}
              placeholder="groq analiza las métricas..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem',
              }}
            />
          </div>
        </>
      )}

      <style>{`
        @keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0 } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @media (max-width: 768px) {
          .global-terminal-wrap { left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
