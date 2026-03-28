'use client';
import { useState, useRef } from 'react';
import { AGENT_COLORS, COMPARE_MODELS } from '@/types/debates';
import type { CompareResult } from '@/types/debates';

export default function CompareLLMsPage() {
  const [prompt, setPrompt] = useState('');
  const [selected, setSelected] = useState<string[]>(['groq', 'claude', 'openai']);
  const [results, setResults] = useState<Record<string, CompareResult>>({});
  const [running, setRunning] = useState(false);
  const abortRefs = useRef<Record<string, AbortController>>({});

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const compare = async () => {
    if (!prompt.trim() || selected.length === 0 || running) return;
    setRunning(true);

    // Initialize results
    const init: Record<string, CompareResult> = {};
    selected.forEach(id => {
      const model = COMPARE_MODELS.find(m => m.id === id)!;
      init[id] = { agentId: id, agentName: model.name, content: '', status: 'streaming', tokens: 0, latencyMs: 0 };
    });
    setResults(init);

    // Fire all SSE streams in parallel
    const promises = selected.map(async (agentId) => {
      const controller = new AbortController();
      abortRefs.current[agentId] = controller;
      const start = Date.now();

      try {
        const res = await fetch('/api/agents/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: prompt.trim(), taskType: 'general', agentId }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          setResults(prev => ({ ...prev, [agentId]: { ...prev[agentId], status: 'error', content: `Error ${res.status}` } }));
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';
        let tokens = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                tokens++;
                setResults(prev => ({
                  ...prev,
                  [agentId]: { ...prev[agentId], content: fullContent, tokens },
                }));
              }
            } catch { /* skip non-JSON lines */ }
          }
        }

        setResults(prev => ({
          ...prev,
          [agentId]: { ...prev[agentId], status: 'done', latencyMs: Date.now() - start },
        }));
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setResults(prev => ({
            ...prev,
            [agentId]: { ...prev[agentId], status: 'error', content: 'Error de conexión' },
          }));
        }
      }
    });

    await Promise.allSettled(promises);
    setRunning(false);
  };

  const stop = () => {
    Object.values(abortRefs.current).forEach(c => c.abort());
    setRunning(false);
    setResults(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        if (updated[id].status === 'streaming') updated[id] = { ...updated[id], status: 'done' };
      });
      return updated;
    });
  };

  const hasResults = Object.keys(results).length > 0;

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
          <span style={{ color: '#fff', fontWeight: 600 }}>Comparar LLMs</span>
        </div>
      </div>

      {/* Input area */}
      <div style={{
        flexShrink: 0, padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: 'rgba(15,22,35,0.5)',
      }}>
        {/* Model selector */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {COMPARE_MODELS.map(m => {
            const active = selected.includes(m.id);
            const color = AGENT_COLORS[m.id] || '#64748b';
            return (
              <button key={m.id} onClick={() => !running && toggle(m.id)} style={{
                padding: '5px 12px', borderRadius: 8, border: 'none', cursor: running ? 'default' : 'pointer',
                background: active ? `${color}15` : 'rgba(255,255,255,0.03)',
                color: active ? color : '#475569',
                fontWeight: 600, fontSize: '0.7rem',
                borderWidth: 1, borderStyle: 'solid',
                borderColor: active ? `${color}40` : 'transparent',
                opacity: running ? 0.7 : 1,
                transition: 'all 0.15s',
              }} aria-pressed={active}>
                <span style={{
                  display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                  background: color, marginRight: 6, verticalAlign: 'middle',
                }} />
                {m.name}
                <span style={{ fontSize: '0.55rem', color: '#475569', marginLeft: 4 }}>{m.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Prompt + actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) compare(); }}
            placeholder="Escribe el prompt para comparar entre modelos... (Cmd+Enter para enviar)"
            rows={2}
            disabled={running}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 10, resize: 'none',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#e2e8f0', fontSize: '0.82rem', outline: 'none', lineHeight: 1.5,
              fontFamily: "'Inter', system-ui, sans-serif", boxSizing: 'border-box',
            }}
          />
          {running ? (
            <button onClick={stop} style={{
              padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'rgba(239,68,68,0.15)', color: '#ef4444',
              fontWeight: 700, fontSize: '0.78rem', alignSelf: 'flex-end',
            }}>Detener</button>
          ) : (
            <button onClick={compare} disabled={!prompt.trim() || selected.length === 0} style={{
              padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: (!prompt.trim() || selected.length === 0) ? 'rgba(148,163,184,0.1)' : 'linear-gradient(135deg, #00e5b0, #0ea5e9)',
              color: '#fff', fontWeight: 700, fontSize: '0.78rem', alignSelf: 'flex-end',
              opacity: (!prompt.trim() || selected.length === 0) ? 0.5 : 1,
            }}>Comparar</button>
          )}
        </div>
      </div>

      {/* Results grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {!hasResults ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⚡</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>
              Comparar LLMs
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>
              Envia un prompt a multiples modelos en paralelo y compara las respuestas lado a lado.
              Selecciona los modelos arriba y escribe tu prompt.
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(Object.keys(results).length, 3)}, 1fr)`,
            gap: 12,
            alignItems: 'start',
          }}>
            {Object.values(results).map(r => {
              const color = AGENT_COLORS[r.agentId] || '#64748b';
              return (
                <div key={r.agentId} style={{
                  borderRadius: 12, overflow: 'hidden',
                  border: `1px solid ${r.status === 'streaming' ? `${color}40` : 'rgba(255,255,255,0.06)'}`,
                  background: 'rgba(255,255,255,0.02)',
                  transition: 'border-color 0.3s',
                }}>
                  {/* Card header */}
                  <div style={{
                    padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: `${color}08`,
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0,
                      boxShadow: r.status === 'streaming' ? `0 0 8px ${color}` : 'none',
                    }} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color }}>{r.agentName}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: '#64748b' }}>
                      {r.status === 'streaming' && '● streaming...'}
                      {r.status === 'done' && `${(r.latencyMs / 1000).toFixed(1)}s · ${r.tokens} tokens`}
                      {r.status === 'error' && '✕ error'}
                    </span>
                  </div>
                  {/* Card body */}
                  <div style={{
                    padding: '12px 14px', fontSize: '0.78rem', color: '#cbd5e1',
                    lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    maxHeight: 500, overflowY: 'auto',
                  }}>
                    {r.content || (r.status === 'streaming' ? 'Esperando respuesta...' : '')}
                    {r.status === 'streaming' && (
                      <span style={{ display: 'inline-block', width: 6, height: 14, background: color, marginLeft: 2, animation: 'blink 1s infinite', verticalAlign: 'text-bottom' }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }`}</style>
    </div>
  );
}
