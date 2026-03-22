'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  role: 'user' | 'hoku';
  content: string;
  timestamp: Date;
}

export default function HokuChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'hoku', content: '¡Hola! Soy Hoku 🐾, tu asistente IA de Smart Connection. Combino 12 agentes para darte la mejor respuesta. ¿En qué te ayudo?', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [pulse, setPulse] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);
  useEffect(() => { if (open) setPulse(false); }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    // Add empty hoku message for streaming
    const hokuMsg: Message = { role: 'hoku', content: '', timestamp: new Date() };
    setMessages(prev => [...prev, hokuMsg]);

    try {
      const res = await fetch('/api/agents/stream', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, taskType: 'general', agentId: 'hoku', chatMode: true }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => '');
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: `Error (${res.status}): ${errText || 'No se pudo conectar con Hoku.'}` };
          return updated;
        });
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data: ')) continue;
          const d = t.slice(6);
          if (d === '[DONE]') continue;
          try {
            const p = JSON.parse(d);
            if (p.content) {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = { ...last, content: last.content + p.content };
                return updated;
              });
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: 'Error de conexión. Verifica tu red.' };
        return updated;
      });
    }

    setStreaming(false);
  };

  const formatTime = (d: Date) => d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      {/* Chat Window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 90, right: 24, width: 380, maxHeight: 520,
          background: '#111827', border: '1px solid rgba(255,107,107,0.25)',
          borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(255,107,107,0.08)',
          display: 'flex', flexDirection: 'column', zIndex: 999,
          animation: 'hokuSlideUp 0.25s ease-out',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 18px', background: 'linear-gradient(135deg, #ff6b6b15, #ff6b6b08)',
            borderBottom: '1px solid rgba(255,107,107,0.15)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'linear-gradient(135deg, #ff6b6b, #ff8e8e)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', boxShadow: '0 4px 12px rgba(255,107,107,0.3)',
            }}>🐾</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>Hoku</div>
              <div style={{ fontSize: '0.65rem', color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }}></span>
                Fusión 12 agentes · Online
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
              fontSize: '1.1rem', padding: 4, borderRadius: 8, transition: 'color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f1f5f9')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
            >✕</button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 10,
            maxHeight: 360, minHeight: 200,
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '85%', padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                    : 'rgba(255,255,255,0.05)',
                  border: msg.role === 'hoku' ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  fontSize: '0.78rem', lineHeight: 1.6,
                  color: msg.role === 'user' ? '#fff' : '#d1d5db',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {msg.content}
                  {streaming && i === messages.length - 1 && msg.role === 'hoku' && (
                    <span style={{ animation: 'hokuBlink 1s infinite', color: '#ff6b6b' }}>▊</span>
                  )}
                </div>
                <span style={{
                  fontSize: '0.55rem', color: '#475569', marginTop: 3,
                  paddingLeft: msg.role === 'hoku' ? 4 : 0,
                  paddingRight: msg.role === 'user' ? 4 : 0,
                }}>
                  {msg.role === 'hoku' && '🐾 '}{formatTime(msg.timestamp)}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', gap: 8, background: '#0d1117',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={streaming ? 'Hoku pensando...' : 'Escribe tu mensaje...'}
              disabled={streaming}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '9px 14px', color: '#f1f5f9', fontSize: '0.78rem',
                outline: 'none', transition: 'border-color 0.2s',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,107,107,0.4)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
            <button
              onClick={sendMessage}
              disabled={streaming || !input.trim()}
              style={{
                width: 38, height: 38, borderRadius: 10,
                background: streaming || !input.trim() ? '#1e293b' : 'linear-gradient(135deg, #ff6b6b, #ff8e8e)',
                border: 'none', cursor: streaming || !input.trim() ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.9rem', color: '#fff', transition: 'all 0.2s',
                boxShadow: streaming || !input.trim() ? 'none' : '0 4px 12px rgba(255,107,107,0.3)',
              }}
            >
              {streaming ? '⏳' : '→'}
            </button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: 24, right: 24, width: 56, height: 56,
          borderRadius: 16, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #ff6b6b, #ff8e8e)',
          boxShadow: '0 8px 32px rgba(255,107,107,0.35), 0 0 20px rgba(255,107,107,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', zIndex: 1000, transition: 'all 0.2s',
          animation: pulse ? 'hokuPulse 2s infinite' : 'none',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(255,107,107,0.45)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(255,107,107,0.35)'; }}
      >
        {open ? '✕' : '🐾'}
      </button>

      <style>{`
        @keyframes hokuSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes hokuBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes hokuPulse {
          0%, 100% { box-shadow: 0 8px 32px rgba(255,107,107,0.35); }
          50% { box-shadow: 0 8px 32px rgba(255,107,107,0.55), 0 0 30px rgba(255,107,107,0.2); }
        }
        @media (max-width: 768px) {
          div[style*="width: 380"] {
            width: calc(100vw - 32px) !important;
            right: 16px !important;
            bottom: 80px !important;
          }
        }
      `}</style>
    </>
  );
}
