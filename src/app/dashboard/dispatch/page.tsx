// @ts-nocheck
'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { api, AGENT_COLORS, CONFIG } from '@/lib/config';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  agent?: string;
  model?: string;
  tokens?: number;
  duration?: number;
  ts: string;
  files?: { name: string; lang: string; content: string }[];
}

interface Conversation {
  id: string;
  title: string;
  lastMsg: string;
  ts: string;
  agent: string;
}

const AGENTS = [
  { id: 'hoku', name: 'Hoku 🐾', model: 'Fusión 9in1', desc: 'Rebelde · ejecuta directo', color: '#e2e8f0' },
  { id: 'panchita', name: 'Panchita 🐕', model: 'Fusión cuidadosa', desc: 'Metódica · pregunta antes', color: '#d4a574' },
  { id: 'groq', name: 'Groq ⚡', model: 'llama-3.3-70b', desc: 'Ultra rápido · gratis', color: '#f59e0b' },
  { id: 'claude', name: 'Claude 🤖', model: 'haiku-4.5', desc: 'Código premium', color: '#00e5b0' },
  { id: 'grok', name: 'Grok 🔮', model: 'grok-3-mini', desc: 'Análisis · xAI', color: '#8b5cf6' },
  { id: 'deepseek', name: 'DeepSeek 💎', model: 'deepseek-chat', desc: 'Programación', color: '#0ea5e9' },
];

const TOOLS = [
  { id: 'ux', icon: '🔍', label: 'Análisis UX', prompt: 'Analiza la UX de smconnection.cl. Da 3 mejoras concretas con código implementable.' },
  { id: 'deploy', icon: '🚀', label: 'Deploy', prompt: 'Ejecuta verificación pre-deploy: health check endpoints, CDN, S3, Amplify status.' },
  { id: 'leads', icon: '👥', label: 'CRM', prompt: '¿Cuántos leads tenemos? Resumen del estado del CRM con pipeline de conversión.' },
  { id: 'sap', icon: '💼', label: 'SAP', prompt: 'Genera propuesta SAP BTP para cliente retail Chile. Scope, timeline, pricing en UF.' },
  { id: 'code', icon: '⌨️', label: 'Código', prompt: 'Genera un componente React con TypeScript para ' },
  { id: 'docs', icon: '📄', label: 'Docs', prompt: 'Genera documentación técnica para ' },
];

const now = () => new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

function extractCodeBlocks(text: string): { name: string; lang: string; content: string }[] {
  const regex = /```(\w+)?(?:\s+(?:filename=)?["']?([^"'\n]+)["']?)?\n([\s\S]*?)```/g;
  const files: { name: string; lang: string; content: string }[] = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (m[3].trim().length > 20) files.push({ lang: m[1] || 'txt', name: m[2] || `file.${m[1] || 'txt'}`, content: m[3].trim() });
  }
  return files;
}

export default function DispatchPage() {
  const [selectedAgent, setSelectedAgent] = useState('hoku');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string>('new');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [preview, setPreview] = useState<{ title: string; html: string } | null>(null);

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const agent = AGENTS.find(a => a.id === selectedAgent) || AGENTS[0];

  // Auto-scroll
  useEffect(() => { chatRef.current && (chatRef.current.scrollTop = chatRef.current.scrollHeight); }, [messages]);

  // Load conversations from Supabase
  useEffect(() => {
    api({ action: 'query', table: 'hoku_chat', order: 'created_at.desc', limit: 50 })
      .then(d => {
        if (!d.data) return;
        const convMap: Record<string, Conversation> = {};
        for (const msg of d.data) {
          const sid = msg.session_id;
          if (!convMap[sid]) {
            convMap[sid] = { id: sid, title: (msg.content || '').slice(0, 40), lastMsg: (msg.content || '').slice(0, 60), ts: msg.created_at, agent: 'hoku' };
          }
        }
        setConversations(Object.values(convMap).slice(0, 20));
      }).catch(() => {});
  }, []);

  // Voice
  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'es-CL'; rec.interimResults = false;
    rec.onresult = (e: any) => { setListening(false); const t = e.results[0][0].transcript; setInput(t); setTimeout(() => sendMessage(t), 100); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const speak = (text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/```[\s\S]*?```/g, '').replace(/[#*_`→✓●]/g, '').replace(/https?:\/\/\S+/g, '').slice(0, 600);
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'es-CL'; u.rate = 1.1;
    const v = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('es'));
    if (v) u.voice = v;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  // Send message
  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || streaming) return;
    setInput('');
    setStreaming(true);
    setShowTools(false);

    const userMsg: ChatMsg = { id: `u${Date.now()}`, role: 'user', text, ts: now() };
    setMessages(p => [...p, userMsg]);

    // Save to Supabase
    const sessionId = activeConv === 'new' ? `dispatch_${Date.now()}` : activeConv;
    if (activeConv === 'new') setActiveConv(sessionId);
    fetch('/api/agents', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'insert_chat', session_id: sessionId, role: 'user', content: text }) }).catch(() => {});

    // Determine system hint based on agent
    const hints: Record<string, string> = {
      hoku: 'Eres HOKU, agente REBELDE y DIRECTO. Ejecutas sin preguntar, vas al grano. Responde en español.',
      panchita: 'Eres PANCHITA, agente CUIDADOSA. SIEMPRE pregunta antes de ejecutar. Valida, ofrece opciones, pide confirmación. Responde en español.',
    };
    const systemHint = hints[selectedAgent] || '';

    // Add placeholder
    const assistantId = `a${Date.now()}`;
    setMessages(p => [...p, { id: assistantId, role: 'assistant', text: '', ts: now(), agent: agent.name, model: agent.model }]);

    const start = Date.now();
    let fullText = '';
    let tokenCount = 0;

    try {
      const res = await fetch('/api/agents/stream', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: systemHint ? `${systemHint}\n\n${text}` : text,
          taskType: 'general',
          agentId: ['hoku', 'panchita'].includes(selectedAgent) ? 'hoku' : selectedAgent,
          chatMode: true,
        }),
      });

      if (!res.ok || !res.body) {
        setMessages(p => p.map(m => m.id === assistantId ? { ...m, text: `Error (${res.status})` } : m));
        setStreaming(false); return;
      }

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
      setMessages(p => p.map(m => m.id === assistantId ? { ...m, text: `Error: ${String(err).slice(0, 100)}` } : m));
    }

    const duration = Math.round((Date.now() - start) / 1000);
    const files = extractCodeBlocks(fullText);

    // Final update
    setMessages(p => p.map(m => m.id === assistantId ? { ...m, tokens: tokenCount, duration, files: files.length > 0 ? files : undefined } : m));

    // Save to Supabase
    if (fullText) {
      fetch('/api/agents', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'insert_chat', session_id: sessionId, role: 'hoku', content: fullText.slice(0, 5000) }) }).catch(() => {});
      // ML learn
      fetch('/api/agents', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'hoku_learn', topic: text.slice(0, 150), content: fullText.slice(0, 2000), source: 'dispatch' }) }).catch(() => {});
    }

    if (fullText) speak(fullText);
    setStreaming(false);

    // Update conversations
    setConversations(p => {
      const existing = p.find(c => c.id === sessionId);
      if (existing) return p.map(c => c.id === sessionId ? { ...c, lastMsg: text.slice(0, 60), ts: new Date().toISOString() } : c);
      return [{ id: sessionId, title: text.slice(0, 40), lastMsg: text.slice(0, 60), ts: new Date().toISOString(), agent: selectedAgent }, ...p];
    });
  };

  const newChat = () => {
    setMessages([]);
    setActiveConv('new');
  };

  const handlePreview = (file: { name: string; lang: string; content: string }) => {
    if (['html', 'htm'].includes(file.lang)) {
      setPreview({ title: file.name, html: file.content });
    } else {
      setPreview({ title: file.name, html: `<!DOCTYPE html><html><head><style>body{background:#0a0d14;color:#e2e8f0;font-family:'JetBrains Mono',monospace;font-size:13px;padding:24px;white-space:pre-wrap;line-height:1.6}</style></head><body>${file.content.replace(/</g, '&lt;')}</body></html>` });
    }
  };

  const handleDownload = (file: { name: string; content: string }) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 34px)', overflow: 'hidden', background: '#0a0d14' }}>
      {/* Preview popup */}
      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }} onClick={() => setPreview(null)}>
          <div style={{ background: '#111827', border: '1px solid rgba(0,229,176,0.2)', borderRadius: 16, width: '90vw', maxWidth: 1000, height: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9' }}>Preview — {preview.title}</span>
              <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
            </div>
            <iframe srcDoc={preview.html} style={{ flex: 1, border: 'none', background: '#fff' }} sandbox="allow-scripts" />
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      {sidebarOpen && (
        <div style={{ width: 260, flexShrink: 0, background: '#0f1219', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
          {/* New chat */}
          <div style={{ padding: '12px' }}>
            <button onClick={newChat} style={{ width: '100%', padding: '10px', borderRadius: 10, background: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.15)', color: '#00e5b0', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              + Nuevo chat
            </button>
          </div>

          {/* Agent selector */}
          <div style={{ padding: '0 12px 10px' }}>
            <div style={{ fontSize: '0.58rem', color: '#475569', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agente</div>
            {AGENTS.slice(0, 2).map(a => (
              <button key={a.id} onClick={() => setSelectedAgent(a.id)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', marginBottom: 3,
                borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                background: selectedAgent === a.id ? `${a.color}10` : 'transparent',
                border: `1px solid ${selectedAgent === a.id ? `${a.color}30` : 'transparent'}`,
                color: selectedAgent === a.id ? a.color : '#94a3b8',
              }}>
                <span style={{ fontSize: '0.9rem' }}>{a.name.split(' ')[1]}</span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600 }}>{a.name.split(' ')[0]}</div>
                  <div style={{ fontSize: '0.52rem', color: '#475569' }}>{a.desc}</div>
                </div>
              </button>
            ))}
            <button onClick={() => setShowAgentPicker(!showAgentPicker)} style={{ fontSize: '0.6rem', color: '#475569', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 10px' }}>
              {showAgentPicker ? '▲ Menos' : '▼ Más modelos'}
            </button>
            {showAgentPicker && AGENTS.slice(2).map(a => (
              <button key={a.id} onClick={() => { setSelectedAgent(a.id); setShowAgentPicker(false); }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', marginBottom: 2,
                borderRadius: 6, cursor: 'pointer', background: selectedAgent === a.id ? 'rgba(255,255,255,0.04)' : 'transparent',
                border: 'none', color: '#94a3b8',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: a.color }} />
                <span style={{ fontSize: '0.65rem' }}>{a.name.split(' ')[0]}</span>
                <span style={{ fontSize: '0.52rem', color: '#475569' }}>{a.model}</span>
              </button>
            ))}
          </div>

          {/* History */}
          <div style={{ flex: 1, overflow: 'auto', padding: '0 12px' }}>
            <div style={{ fontSize: '0.58rem', color: '#475569', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Historial</div>
            {conversations.map(c => (
              <button key={c.id} onClick={() => { setActiveConv(c.id); /* load conv */ }} style={{
                width: '100%', textAlign: 'left', padding: '8px 10px', marginBottom: 2,
                borderRadius: 6, cursor: 'pointer', fontSize: '0.65rem',
                background: activeConv === c.id ? 'rgba(255,255,255,0.04)' : 'transparent',
                border: 'none', color: activeConv === c.id ? '#e2e8f0' : '#64748b',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {c.title || 'Chat sin título'}
              </button>
            ))}
          </div>

          {/* Voice toggle */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <button onClick={() => setVoiceEnabled(!voiceEnabled)} style={{
              width: '100%', padding: '6px', borderRadius: 6, fontSize: '0.6rem', cursor: 'pointer',
              background: voiceEnabled ? 'rgba(0,229,176,0.08)' : 'rgba(255,255,255,0.02)',
              color: voiceEnabled ? '#00e5b0' : '#475569',
              border: `1px solid ${voiceEnabled ? 'rgba(0,229,176,0.15)' : 'rgba(255,255,255,0.04)'}`,
            }}>{voiceEnabled ? '🔊 Voz activada' : '🔇 Voz desactivada'}</button>
          </div>
        </div>
      )}

      {/* MAIN CHAT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{ height: 50, flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem' }}>☰</button>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: agent.color }}>{agent.name}</span>
          <span style={{ fontSize: '0.6rem', color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>{agent.model}</span>
          <div style={{ flex: 1 }} />
          {speaking && <span style={{ fontSize: '0.6rem', color: '#00e5b0', animation: 'breathe 1s infinite' }}>🔊 Hablando...</span>}
          {speaking && <button onClick={() => { window.speechSynthesis.cancel(); setSpeaking(false); }} style={{ fontSize: '0.55rem', padding: '2px 8px', borderRadius: 5, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', cursor: 'pointer' }}>⏹</button>}
          <a href="/dashboard" style={{ fontSize: '0.6rem', color: '#475569', textDecoration: 'none' }}>Dashboard →</a>
        </div>

        {/* Messages */}
        <div ref={chatRef} style={{ flex: 1, overflow: 'auto', padding: '20px 0' }}>
          {messages.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: '0 20px' }}>
              <div style={{ fontSize: '3rem' }}>{agent.name.includes('Hoku') ? '🐾' : agent.name.includes('Panchita') ? '🐕' : '🤖'}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f1f5f9' }}>{agent.name.split(' ')[0]}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', maxWidth: 400 }}>{agent.desc}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                {TOOLS.map(t => (
                  <button key={t.id} onClick={() => sendMessage(t.prompt)} style={{
                    padding: '8px 14px', borderRadius: 10, fontSize: '0.7rem', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
                  }}>{t.icon} {t.label}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} style={{ padding: '8px 0', display: 'flex', justifyContent: 'center' }}>
              <div style={{ maxWidth: 720, width: '100%', padding: '0 20px' }}>
                {msg.role === 'user' ? (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#3b82f6', fontWeight: 700, flexShrink: 0 }}>G</div>
                    <div style={{ fontSize: '0.8rem', color: '#f1f5f9', lineHeight: 1.7, paddingTop: 4 }}>{msg.text}</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${agent.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', flexShrink: 0 }}>
                      {agent.name.includes('Hoku') ? '🐾' : agent.name.includes('Panchita') ? '🐕' : '🤖'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Streaming cursor */}
                      <div style={{ fontSize: '0.8rem', color: '#d1d5db', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {msg.text || ''}
                        {streaming && msg.id === messages[messages.length - 1]?.id && <span style={{ color: agent.color, animation: 'breathe 0.8s infinite' }}>▊</span>}
                      </div>
                      {/* Code files */}
                      {msg.files && msg.files.map((f, i) => (
                        <div key={i} style={{ marginTop: 8, background: '#111827', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}>{f.name}</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => handlePreview(f)} style={{ fontSize: '0.55rem', padding: '2px 8px', borderRadius: 5, background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Preview</button>
                              <button onClick={() => handleDownload(f)} style={{ fontSize: '0.55rem', padding: '2px 8px', borderRadius: 5, background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Descargar</button>
                              <button onClick={() => navigator.clipboard.writeText(f.content)} style={{ fontSize: '0.55rem', padding: '2px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', color: '#64748b', border: 'none', cursor: 'pointer' }}>Copiar</button>
                            </div>
                          </div>
                          <pre style={{ margin: 0, padding: '8px 10px', fontSize: '0.62rem', color: '#94a3b8', overflow: 'auto', maxHeight: 200, lineHeight: 1.5, fontFamily: "'JetBrains Mono', monospace" }}>{f.content.slice(0, 1000)}</pre>
                        </div>
                      ))}
                      {/* Metadata */}
                      {msg.tokens && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: '0.55rem', color: '#475569' }}>
                          <span>{msg.agent}</span>
                          <span>·</span>
                          <span>{msg.model}</span>
                          <span>·</span>
                          <span>{msg.duration}s</span>
                          <span>·</span>
                          <span>{msg.tokens} tokens</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input area */}
        <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 20px 16px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {/* Tools bar */}
            {showTools && (
              <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                {TOOLS.map(t => (
                  <button key={t.id} onClick={() => { setInput(t.prompt); setShowTools(false); inputRef.current?.focus(); }}
                    style={{ padding: '5px 10px', borderRadius: 6, fontSize: '0.62rem', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: '#111827', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', padding: '8px 12px' }}>
              {/* Tools toggle */}
              <button onClick={() => setShowTools(!showTools)} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem', flexShrink: 0 }}>⚡</button>
              {/* Mic */}
              <button onClick={listening ? () => { recognitionRef.current?.stop(); setListening(false); } : startListening}
                disabled={streaming}
                style={{
                  width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.8rem', flexShrink: 0,
                  background: listening ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.04)',
                  color: listening ? '#ef4444' : '#64748b',
                  animation: listening ? 'breathe 0.8s infinite' : 'none',
                }}>🎤</button>
              {/* Input */}
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={listening ? '🎤 Escuchando...' : `Mensaje para ${agent.name.split(' ')[0]}...`}
                disabled={streaming}
                rows={1}
                style={{
                  flex: 1, background: 'transparent', border: 'none', color: '#f1f5f9', fontSize: '0.8rem',
                  outline: 'none', resize: 'none', fontFamily: "'DM Sans', system-ui", lineHeight: 1.5,
                  maxHeight: 120, minHeight: 30,
                }} />
              {/* Send */}
              <button onClick={() => sendMessage()} disabled={streaming || !input.trim()}
                style={{
                  width: 30, height: 30, borderRadius: 8, border: 'none', cursor: streaming ? 'default' : 'pointer',
                  background: streaming || !input.trim() ? 'rgba(255,255,255,0.04)' : '#00e5b0',
                  color: streaming || !input.trim() ? '#475569' : '#0a0d14',
                  fontSize: '0.85rem', fontWeight: 700, flexShrink: 0,
                }}>↑</button>
            </div>
            <div style={{ fontSize: '0.52rem', color: '#2e4060', textAlign: 'center', marginTop: 6 }}>
              {agent.name} · {agent.model} · Shift+Enter para nueva línea
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 99px; }
        @keyframes breathe { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        textarea::placeholder, input::placeholder { color: #2e4060; }
      `}</style>
    </div>
  );
}
