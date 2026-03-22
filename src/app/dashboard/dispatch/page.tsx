// @ts-nocheck
'use client';
import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/config';

interface Msg { id: string; role: 'user' | 'ai'; text: string; agent?: string; model?: string; tokens?: number; ms?: number; ts: string; }
interface Conv { id: string; title: string; ts: string; }

const MODELS = [
  { id: 'hoku', label: 'Hoku 🐾', sub: 'Fusión 9in1', color: '#e2e8f0' },
  { id: 'panchita', label: 'Panchita 🐕', sub: 'Fusión cuidadosa', color: '#d4a574' },
  { id: 'groq', label: 'Groq ⚡', sub: 'llama-3.3-70b', color: '#f59e0b' },
  { id: 'claude', label: 'Claude', sub: 'haiku-4.5', color: '#00e5b0' },
  { id: 'deepseek', label: 'DeepSeek', sub: 'deepseek-chat', color: '#0ea5e9' },
  { id: 'openai', label: 'GPT-4o mini', sub: 'gpt-4o-mini', color: '#10b981' },
];

const HINTS: Record<string, string> = {
  hoku: 'Eres HOKU, agente directo. Vas al grano, ejecutas. Español.',
  panchita: 'Eres PANCHITA, agente cuidadosa. Preguntas antes de ejecutar. Español.',
};

const SUGGESTIONS = [
  { icon: '🔍', text: 'Analiza la UX de smconnection.cl' },
  { icon: '🚀', text: 'Estado del deploy y AWS' },
  { icon: '👥', text: '¿Cuántos leads tenemos hoy?' },
  { icon: '💼', text: 'Genera propuesta SAP para retail' },
  { icon: '💻', text: 'Crea un componente React' },
  { icon: '📊', text: 'Reporte del estado de la intranet' },
];

const now = () => new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

export default function DispatchPage() {
  const [model, setModel] = useState('hoku');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeConv, setActiveConv] = useState('new');
  const [showModels, setShowModels] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const m = MODELS.find(x => x.id === model) || MODELS[0];

  useEffect(() => { chatRef.current && (chatRef.current.scrollTop = chatRef.current.scrollHeight); }, [msgs]);

  useEffect(() => {
    api({ action: 'query', table: 'hoku_chat', order: 'created_at.desc', limit: 50 }).then(d => {
      if (!d.data) return;
      const map: Record<string, Conv> = {};
      for (const r of d.data) {
        if (!map[r.session_id]) map[r.session_id] = { id: r.session_id, title: (r.content || '').slice(0, 35), ts: r.created_at };
      }
      setConvs(Object.values(map).slice(0, 15));
    }).catch(() => {});
  }, []);

  const send = async (override?: string) => {
    const text = (override || input).trim();
    if (!text || streaming) return;
    setInput('');
    setStreaming(true);

    const uid = `u${Date.now()}`;
    const aid = `a${Date.now()}`;
    setMsgs(p => [...p, { id: uid, role: 'user', text, ts: now() }]);
    setMsgs(p => [...p, { id: aid, role: 'ai', text: '', ts: now(), agent: m.label, model: m.sub }]);

    const sid = activeConv === 'new' ? `d_${Date.now()}` : activeConv;
    if (activeConv === 'new') setActiveConv(sid);

    fetch('/api/agents', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'insert_chat', session_id: sid, role: 'user', content: text }) }).catch(() => {});

    const hint = HINTS[model] || '';
    const start = Date.now();
    let full = '', tokens = 0;

    try {
      const res = await fetch('/api/agents/stream', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: hint ? `${hint}\n\n${text}` : text, taskType: 'general', agentId: ['hoku', 'panchita'].includes(model) ? 'hoku' : model, chatMode: true }),
      });
      if (!res.ok || !res.body) { setMsgs(p => p.map(x => x.id === aid ? { ...x, text: `Error (${res.status})` } : x)); setStreaming(false); return; }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop() || '';
        for (const l of lines) {
          const t = l.trim();
          if (!t.startsWith('data: ')) continue;
          const d = t.slice(6);
          if (d === '[DONE]') continue;
          try { const p = JSON.parse(d); if (p.content) { full += p.content; tokens++; setMsgs(prev => prev.map(x => x.id === aid ? { ...x, text: full } : x)); } } catch {}
        }
      }
    } catch (e) { setMsgs(p => p.map(x => x.id === aid ? { ...x, text: `Error: ${String(e).slice(0, 80)}` } : x)); }

    const ms = Date.now() - start;
    setMsgs(p => p.map(x => x.id === aid ? { ...x, tokens, ms } : x));

    if (full) {
      fetch('/api/agents', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'insert_chat', session_id: sid, role: 'hoku', content: full.slice(0, 5000) }) }).catch(() => {});
      fetch('/api/agents', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'hoku_learn', topic: text.slice(0, 150), content: full.slice(0, 2000), source: 'dispatch' }) }).catch(() => {});
    }

    setStreaming(false);
    setConvs(p => {
      if (p.find(c => c.id === sid)) return p;
      return [{ id: sid, title: text.slice(0, 35), ts: new Date().toISOString() }, ...p].slice(0, 15);
    });
  };

  const newChat = () => { setMsgs([]); setActiveConv('new'); };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 34px)', background: '#0a0d14', overflow: 'hidden' }}>
      {/* SIDEBAR */}
      {sidebar && (
        <div style={{ width: 250, flexShrink: 0, background: '#0f1219', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 12 }}>
            <button onClick={newChat} style={{ width: '100%', padding: 10, borderRadius: 10, background: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.15)', color: '#00e5b0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Nuevo chat</button>
          </div>
          <div style={{ padding: '0 12px 8px' }}>
            <button onClick={() => setShowModels(!showModels)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', color: '#e2e8f0' }}>
              <span style={{ fontSize: 16 }}>{m.label.includes('🐾') ? '🐾' : m.label.includes('🐕') ? '🐕' : '🤖'}</span>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{m.label}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>{m.sub}</div>
              </div>
              <span style={{ fontSize: 10, color: '#64748b' }}>▼</span>
            </button>
            {showModels && (
              <div style={{ marginTop: 4, background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
                {MODELS.map(x => (
                  <button key={x.id} onClick={() => { setModel(x.id); setShowModels(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: model === x.id ? 'rgba(0,229,176,0.06)' : 'transparent', border: 'none', cursor: 'pointer', color: model === x.id ? '#00e5b0' : '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: x.color }} />
                    <span style={{ fontSize: 12, fontWeight: 600, flex: 1, textAlign: 'left' }}>{x.label}</span>
                    <span style={{ fontSize: 9, color: '#475569' }}>{x.sub}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '0 12px' }}>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Recientes</div>
            {convs.map(c => (
              <button key={c.id} onClick={() => setActiveConv(c.id)} style={{ width: '100%', textAlign: 'left', padding: '7px 10px', marginBottom: 2, borderRadius: 6, cursor: 'pointer', fontSize: 12, background: activeConv === c.id ? 'rgba(255,255,255,0.04)' : 'transparent', border: 'none', color: activeConv === c.id ? '#e2e8f0' : '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.title || 'Sin título'}
              </button>
            ))}
          </div>
          <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <a href="/dashboard" style={{ display: 'block', padding: 6, borderRadius: 6, fontSize: 11, color: '#475569', textDecoration: 'none', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>← Dashboard</a>
          </div>
        </div>
      )}

      {/* CHAT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ height: 48, flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10 }}>
          <button onClick={() => setSidebar(!sidebar)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}>☰</button>
          <span style={{ fontSize: 14, fontWeight: 700, color: m.color }}>{m.label}</span>
          <span style={{ fontSize: 11, color: '#475569' }}>{m.sub}</span>
        </div>

        <div ref={chatRef} style={{ flex: 1, overflow: 'auto', padding: '20px 0' }}>
          {msgs.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20, padding: '0 20px' }}>
              <div style={{ fontSize: 48 }}>{m.label.includes('🐾') ? '🐾' : m.label.includes('🐕') ? '🐕' : '🤖'}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>¿Qué necesitas?</div>
              <div style={{ fontSize: 13, color: '#64748b', textAlign: 'center', maxWidth: 420 }}>{m.sub}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 500, width: '100%', marginTop: 8 }}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => send(s.text)} style={{ padding: '12px 14px', borderRadius: 12, fontSize: 13, cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8', textAlign: 'left', lineHeight: 1.4 }}>
                    <span style={{ marginRight: 6 }}>{s.icon}</span>{s.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {msgs.map(msg => (
            <div key={msg.id} style={{ padding: '6px 0', display: 'flex', justifyContent: 'center' }}>
              <div style={{ maxWidth: 700, width: '100%', padding: '0 20px' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, background: msg.role === 'user' ? 'rgba(59,130,246,0.12)' : `${m.color}12`, color: msg.role === 'user' ? '#3b82f6' : m.color, fontWeight: 700 }}>
                    {msg.role === 'user' ? 'G' : m.label.includes('🐾') ? '🐾' : m.label.includes('🐕') ? '🐕' : '🤖'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: msg.role === 'user' ? '#94a3b8' : m.color, marginBottom: 3 }}>
                      {msg.role === 'user' ? 'Tú' : msg.agent || m.label}
                    </div>
                    <div style={{ fontSize: 14, color: '#d1d5db', lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {msg.text || ''}
                      {streaming && msg.role === 'ai' && msg.id === msgs[msgs.length - 1]?.id && !msg.text && (
                        <span style={{ display: 'inline-flex', gap: 3 }}>{[0,1,2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e5b0', animation: `pulse 0.8s ${i * 0.15}s infinite` }} />)}</span>
                      )}
                      {streaming && msg.role === 'ai' && msg.id === msgs[msgs.length - 1]?.id && msg.text && (
                        <span style={{ color: m.color, animation: 'pulse 0.8s infinite' }}>▊</span>
                      )}
                    </div>
                    {msg.ms && (
                      <div style={{ fontSize: 10, color: '#475569', marginTop: 4, display: 'flex', gap: 8 }}>
                        <span>{msg.agent}</span><span>·</span><span>{Math.round(msg.ms / 1000)}s</span>
                        {msg.tokens && <><span>·</span><span>{msg.tokens} tok</span></>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div style={{ flexShrink: 0, padding: '12px 20px 20px' }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: '#111827', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', padding: '10px 14px' }}>
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={`Mensaje para ${m.label.replace(/[🐾🐕]/g, '').trim()}...`}
                disabled={streaming} rows={1}
                style={{ flex: 1, background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: 14, outline: 'none', resize: 'none', lineHeight: 1.5, maxHeight: 120, minHeight: 28, fontFamily: "'DM Sans', system-ui" }} />
              <button onClick={() => send()} disabled={streaming || !input.trim()}
                style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: streaming ? 'default' : 'pointer', background: streaming || !input.trim() ? 'rgba(255,255,255,0.04)' : '#00e5b0', color: streaming || !input.trim() ? '#475569' : '#0a0d14', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>↑</button>
            </div>
            <div style={{ fontSize: 10, color: '#2e4060', textAlign: 'center', marginTop: 6 }}>
              {m.label} · Enter enviar · Shift+Enter nueva línea
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', system-ui, sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 99px; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        textarea::placeholder { color: #475569; }
      `}</style>
    </div>
  );
}
