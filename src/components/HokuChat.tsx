'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  id?: string;
  role: 'user' | 'hoku';
  content: string;
  timestamp: Date;
  feedback?: 'positive' | 'negative' | null;
  knowledgeIds?: string[];
}

interface CodeBlock {
  lang: string;
  filename: string;
  content: string;
}

const SESSION_KEY = 'hoku_session_id';

interface AgentProfile {
  id: string;
  name: string;
  emoji: string;
  color: string;
  welcome: string;
  systemHint: string;
}

const PROFILES: Record<string, AgentProfile> = {
  hoku: {
    id: 'hoku', name: 'Hoku', emoji: '🐾', color: '#e2e8f0',
    welcome: '¡Woof! Soy Hoku 🐾 — el rebelde. Ejecuto rápido, fusiono 12 agentes, y no pregunto mucho. ¿Qué hacemos?',
    systemHint: 'Eres HOKU, un agente REBELDE y DIRECTO. Ejecutas sin preguntar, vas al grano, generas código funcional inmediatamente. No pidas confirmación — HAZLO. Responde en español.',
  },
  panchita: {
    id: 'panchita', name: 'Panchita', emoji: '🐕', color: '#d4a574',
    welcome: '¡Hola! Soy Panchita 🐕 — la metódica. Antes de hacer algo, te pregunto, valido, y confirmo. Así las cosas salen bien. ¿Qué necesitas?',
    systemHint: 'Eres PANCHITA, una agente CUIDADOSA y METÓDICA. SIEMPRE pregunta antes de ejecutar. Valida los requerimientos, ofrece opciones, pide confirmación, y explica paso a paso qué vas a hacer ANTES de hacerlo. Nunca ejecutes sin preguntar. Responde en español.',
  },
};

function getSessionId(): string {
  if (typeof window === 'undefined') return 'default';
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(SESSION_KEY, id); }
  return id;
}

function extractCodeBlocks(text: string): CodeBlock[] {
  const regex = /```(\w+)?(?:\s+(?:filename=)?["']?([^"'\n]+)["']?)?\n([\s\S]*?)```/g;
  const blocks: CodeBlock[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const lang = match[1] || 'txt';
    const filename = match[2] || `archivo.${lang === 'tsx' || lang === 'typescript' ? 'tsx' : lang === 'html' ? 'html' : lang === 'css' ? 'css' : lang}`;
    const content = match[3].trim();
    if (content.length > 20) blocks.push({ lang, filename, content });
  }
  return blocks;
}

function isHtmlContent(block: CodeBlock): boolean {
  return ['html', 'htm'].includes(block.lang) || block.filename.endsWith('.html');
}

import { api as apiCall } from '@/lib/config';

export default function HokuChat() {
  const [open, setOpen] = useState(false);
  const [activeProfile, setActiveProfile] = useState<string>('hoku');
  const profile = PROFILES[activeProfile];
  const [messages, setMessages] = useState<Message[]>([
    { role: 'hoku', content: PROFILES.hoku.welcome, timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [pulse, setPulse] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [preview, setPreview] = useState<{ title: string; html: string } | null>(null);

  const switchProfile = (id: string) => {
    setActiveProfile(id);
    const p = PROFILES[id];
    setMessages([{ role: 'hoku', content: p.welcome, timestamp: new Date() }]);
    setLoaded(false);
  };
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadHistory = useCallback(async () => {
    if (loaded) return;
    try {
      const sessionId = getSessionId();
      const d = await apiCall({ action: 'query', table: 'hoku_chat', filter: `session_id=eq.${sessionId}`, order: 'created_at.asc', limit: 100 });
      if (d.data && d.data.length > 0) {
        const history: Message[] = d.data.map((m: Record<string, unknown>) => ({
          role: m.role as 'user' | 'hoku',
          content: m.content as string,
          timestamp: new Date(m.created_at as string),
        }));
        setMessages([{ role: 'hoku', content: profile.welcome, timestamp: new Date(history[0].timestamp.getTime() - 1000) }, ...history]);
      }
    } catch { /* table may not exist yet */ }
    setLoaded(true);
  }, [loaded]);

  const saveMessage = (role: 'user' | 'hoku', content: string) => {
    fetch('/api/agents', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'insert_chat', session_id: getSessionId(), role, content }),
    }).catch(() => {});
  };

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => { if (open) { setPulse(false); loadHistory(); if (inputRef.current) inputRef.current.focus(); } }, [open, loadHistory]);

  // Fetch live intranet data for Hoku superagent context
  const fetchIntranetContext = async (): Promise<string> => {
    try {
      const [agentsRes, leadsRes, projectsRes, logsRes, insightsRes, knowledgeRes, deployRes] = await Promise.allSettled([
        apiCall({ action: 'list' }),
        apiCall({ action: 'query', table: 'leads', order: 'created_at.desc', limit: 5 }),
        apiCall({ action: 'query', table: 'projects', limit: 5 }),
        apiCall({ action: 'query', table: 'agent_logs', order: 'created_at.desc', limit: 5 }),
        apiCall({ action: 'query', table: 'ux_insights', order: 'created_at.desc', limit: 5 }),
        apiCall({ action: 'query', table: 'hoku_knowledge', order: 'quality_score.desc', limit: 1 }),
        apiCall({ action: 'query', table: 'agent_logs', filter: 'agent_id=eq.deployer', order: 'created_at.desc', limit: 20 }),
      ]);

      const parts: string[] = ['DATOS EN TIEMPO REAL DE LA INTRANET SMARTCONNECTION:'];

      if (agentsRes.status === 'fulfilled' && agentsRes.value.agents) {
        const agents = agentsRes.value.agents;
        const active = agents.filter((a: Record<string, unknown>) => a.active).length;
        parts.push(`AGENTES: ${active}/${agents.length} activos — ${agents.map((a: Record<string, unknown>) => `${a.name}(${a.active ? 'ON' : 'OFF'})`).join(', ')}`);
      }

      if (leadsRes.status === 'fulfilled' && leadsRes.value.data) {
        const leads = leadsRes.value.data;
        parts.push(`LEADS (${leads.length} recientes): ${leads.map((l: Record<string, unknown>) => `${l.nombre || l.email}[${l.estado}]`).join(', ')}`);
      }

      if (projectsRes.status === 'fulfilled' && projectsRes.value.data) {
        const projects = projectsRes.value.data;
        parts.push(`PROYECTOS: ${projects.map((p: Record<string, unknown>) => `${p.name}(${p.status},${p.progress}%)`).join(', ')}`);
      }

      if (logsRes.status === 'fulfilled' && logsRes.value.data) {
        const logs = logsRes.value.data;
        parts.push(`ACTIVIDAD RECIENTE: ${logs.map((l: Record<string, unknown>) => `${l.agent_id}:${l.action}[${l.status}]`).join(', ')}`);
      }

      if (insightsRes.status === 'fulfilled' && insightsRes.value.data) {
        const insights = insightsRes.value.data;
        parts.push(`MEJORAS UX: ${insights.map((i: Record<string, unknown>) => `${i.titulo}[${i.estado}]`).join(', ')}`);
      }

      if (knowledgeRes.status === 'fulfilled' && knowledgeRes.value.data) {
        const count = knowledgeRes.value.total || knowledgeRes.value.data.length;
        parts.push(`KNOWLEDGE BASE: ${count} conocimientos almacenados`);
      }

      if (deployRes.status === 'fulfilled' && deployRes.value.data) {
        const deploys = deployRes.value.data;
        const total = deploys.length;
        const successCount = deploys.filter((d: Record<string, unknown>) => d.status === 'success').length;
        const rate = total > 0 ? Math.round((successCount / total) * 100) : 0;
        parts.push(`DEPLOY RATE: ${successCount}/${total} exitosos (${rate}%)`);
      }

      return '\n\n' + parts.join('\n') + '\n\nUsa estos datos reales para responder con información actualizada. Eres un SUPERAGENTE con acceso total a la intranet.\n';
    } catch { return ''; }
  };

  // ML: Search knowledge base for relevant context
  const searchKnowledge = async (query: string): Promise<{ context: string; ids: string[] }> => {
    try {
      const res = await apiCall({ action: 'hoku_search', query });
      if (!res.results?.length) return { context: '', ids: [] };
      const ids = res.results.map((r: Record<string, unknown>) => r.id as string);
      const context = '\n\nCONOCIMIENTO APRENDIDO (usa esto como referencia prioritaria):\n' +
        res.results.map((r: Record<string, unknown>) =>
          `[${r.topic}] (score:${(r.quality_score as number)?.toFixed(2)}): ${(r.content as string).slice(0, 400)}`
        ).join('\n') + '\n';
      return { context, ids };
    } catch { return { context: '', ids: [] }; }
  };

  // ML: Extract learnings from a conversation exchange
  const extractAndLearn = async (userMsg: string, hokuResponse: string) => {
    if (hokuResponse.length < 50) return; // skip short/error responses
    // Extract topic from user message
    const topic = userMsg.slice(0, 150).replace(/[^\w\sáéíóúñ]/gi, '').trim();
    // Save condensed knowledge
    const content = hokuResponse
      .replace(/```[\s\S]*?```/g, '[código]') // remove code blocks for storage
      .slice(0, 2000);
    apiCall({
      action: 'hoku_learn',
      topic,
      content,
      source: 'conversation',
      quality_score: 0.5,
    }).catch(() => {});
  };

  // ML: Submit feedback
  const submitFeedback = (msgIndex: number, feedback: 'positive' | 'negative') => {
    setMessages(prev => {
      const updated = [...prev];
      updated[msgIndex] = { ...updated[msgIndex], feedback };
      return updated;
    });
    const msg = messages[msgIndex];
    if (msg.id) {
      apiCall({ action: 'hoku_feedback', messageId: msg.id, feedback, knowledgeIds: msg.knowledgeIds || [] }).catch(() => {});
    }
  };

  const buildContext = (msgs: Message[]): string => {
    const recent = msgs.filter(m => m.content !== profile.welcome).slice(-10);
    if (recent.length === 0) return '';
    return '\n\nHISTORIAL RECIENTE:\n' +
      recent.map(m => `${m.role === 'user' ? 'Usuario' : 'Hoku'}: ${m.content.slice(0, 300)}`).join('\n') +
      '\n\nUsa este contexto para dar continuidad.\n';
  };

  // Detect if user is asking for file generation
  const wantsCode = (text: string): boolean => {
    const keywords = ['genera', 'crea', 'html', 'pdf', 'código', 'codigo', 'archivo', 'componente', 'script', 'página', 'pagina', 'template', 'plantilla', 'reporte', 'report', 'scanner', 'escáner', 'escaner'];
    const lower = text.toLowerCase();
    return keywords.some(k => lower.includes(k));
  };

  const handlePreview = (block: CodeBlock) => {
    if (isHtmlContent(block)) {
      setPreview({ title: block.filename, html: block.content });
    } else {
      // Wrap non-HTML code in a styled HTML page for preview
      const wrapped = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{background:#0a0d14;color:#e2e8f0;font-family:'JetBrains Mono',monospace;font-size:13px;padding:24px;margin:0;white-space:pre-wrap;line-height:1.6}</style></head><body>${block.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body></html>`;
      setPreview({ title: block.filename, html: wrapped });
    }
  };

  const handleDownload = (block: CodeBlock) => {
    const blob = new Blob([block.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = block.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);
    saveMessage('user', text);

    const hokuMsg: Message = { role: 'hoku', content: '', timestamp: new Date() };
    setMessages(prev => [...prev, hokuMsg]);

    const [chatContext, intranetData, knowledge] = await Promise.all([
      Promise.resolve(buildContext([...messages, userMsg])),
      fetchIntranetContext(),
      searchKnowledge(text),
    ]);
    const context = chatContext + intranetData + knowledge.context;
    const useCodeMode = wantsCode(text);
    let fullResponse = '';

    try {
      const res = await fetch('/api/agents/stream', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${profile.systemHint}\n\n${text}` + context,
          taskType: useCodeMode ? 'general' : 'general',
          agentId: 'hoku',
          chatMode: !useCodeMode,
        }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => '');
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: `Error (${res.status}): ${errText || 'No se pudo conectar.'}` };
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
              fullResponse += p.content;
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
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: 'Error de conexión.' };
        return updated;
      });
    }

    if (fullResponse) {
      saveMessage('hoku', fullResponse);
      // ML: learn from this exchange
      extractAndLearn(text, fullResponse);
      // Store knowledge IDs on the last message
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], knowledgeIds: knowledge.ids };
        return updated;
      });
    }
    setStreaming(false);
  };

  const formatTime = (d: Date) => d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  // Render message content with code block actions
  const renderContent = (content: string, isStreaming: boolean) => {
    const blocks = extractCodeBlocks(content);
    if (blocks.length === 0 || isStreaming) return content;

    // Split content around code blocks and render with action buttons
    const parts: React.ReactNode[] = [];
    let remaining = content;
    let idx = 0;

    for (const block of blocks) {
      const blockFull = content.indexOf('```' + block.lang, remaining === content ? 0 : content.length - remaining.length);
      if (blockFull === -1) continue;
      const before = remaining.slice(0, blockFull - (content.length - remaining.length));
      if (before.trim()) parts.push(<span key={`t${idx}`}>{before}</span>);

      parts.push(
        <div key={`b${idx}`} style={{ margin: '8px 0', background: '#0a0d14', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}>{block.filename}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => handlePreview(block)} style={{ fontSize: '0.6rem', padding: '2px 8px', borderRadius: 6, background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Preview
              </button>
              <button onClick={() => handleDownload(block)} style={{ fontSize: '0.6rem', padding: '2px 8px', borderRadius: 6, background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Descargar
              </button>
            </div>
          </div>
          <pre style={{ margin: 0, padding: '8px 10px', fontSize: '0.65rem', color: '#94a3b8', overflow: 'auto', maxHeight: 120, lineHeight: 1.5 }}>
            {block.content.slice(0, 500)}{block.content.length > 500 ? '\n...' : ''}
          </pre>
        </div>
      );

      const blockEnd = content.indexOf('```', blockFull + 3);
      const endPos = blockEnd !== -1 ? blockEnd + 3 : content.length;
      remaining = content.slice(endPos);
      idx++;
    }

    if (remaining.trim()) parts.push(<span key="last">{remaining}</span>);
    return parts.length > 0 ? parts : content;
  };

  const btnStyle = (color: string, disabled: boolean): React.CSSProperties => ({
    fontSize: '0.6rem', padding: '2px 8px', borderRadius: 6,
    background: disabled ? '#1e293b' : `${color}15`, color: disabled ? '#475569' : color,
    border: 'none', cursor: disabled ? 'default' : 'pointer', fontWeight: 600,
  });

  return (
    <>
      {/* Preview Popup */}
      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
          onClick={() => setPreview(null)}>
          <div style={{ background: '#111827', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 16, width: '90vw', maxWidth: 900, height: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>🐾 Preview</span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}>{preview.title}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => {
                  const blob = new Blob([preview.html], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = preview.title; a.click();
                  URL.revokeObjectURL(url);
                }} style={btnStyle('#22c55e', false)}>Descargar</button>
                <button onClick={() => {
                  const w = window.open('', '_blank');
                  if (w) { w.document.write(preview.html); w.document.close(); }
                }} style={btnStyle('#3b82f6', false)}>Abrir en tab</button>
                <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
              </div>
            </div>
            <iframe
              srcDoc={preview.html}
              style={{ flex: 1, border: 'none', background: '#fff', borderRadius: '0 0 16px 16px' }}
              sandbox="allow-scripts allow-same-origin"
              title="Hoku Preview"
            />
          </div>
        </div>
      )}

      {/* Chat Window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 90, right: 24, width: 420, maxHeight: 560,
          background: '#111827', border: `1px solid ${profile.color}40`,
          borderRadius: 20, boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${profile.color}15`,
          display: 'flex', flexDirection: 'column', zIndex: 999,
          animation: 'hokuSlideUp 0.25s ease-out', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '10px 14px', background: `linear-gradient(135deg, ${profile.color}15, ${profile.color}08)`,
            borderBottom: `1px solid ${profile.color}25`,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `linear-gradient(135deg, ${profile.color}, ${profile.color}cc)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', boxShadow: `0 4px 12px ${profile.color}40`,
              }}>{profile.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9' }}>{profile.name}</div>
                <div style={{ fontSize: '0.6rem', color: profile.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }}></span>
                  {activeProfile === 'hoku' ? 'Rebelde · Ejecuta directo' : 'Metódica · Valida antes'}
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{
                background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
                fontSize: '1rem', padding: 4, borderRadius: 8, transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f1f5f9')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
            >✕</button>
            </div>
            {/* Profile Switch */}
            <div style={{ display: 'flex', gap: 4 }}>
              {Object.values(PROFILES).map(p => (
                <button key={p.id} onClick={() => switchProfile(p.id)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    padding: '4px 8px', borderRadius: 6, fontSize: '0.6rem', fontWeight: 700,
                    background: activeProfile === p.id ? `${p.color}20` : 'rgba(255,255,255,0.03)',
                    color: activeProfile === p.id ? p.color : '#475569',
                    border: `1px solid ${activeProfile === p.id ? `${p.color}30` : 'rgba(255,255,255,0.04)'}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  {p.emoji} {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 10,
            maxHeight: 400, minHeight: 200,
          }}>
            {messages.map((msg, i) => {
              const isLastStreaming = streaming && i === messages.length - 1 && msg.role === 'hoku';
              return (
                <div key={i} style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    maxWidth: '90%', padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                      : 'rgba(255,255,255,0.05)',
                    border: msg.role === 'hoku' ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    fontSize: '0.78rem', lineHeight: 1.6,
                    color: msg.role === 'user' ? '#fff' : '#d1d5db',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {msg.role === 'hoku' ? renderContent(msg.content, isLastStreaming) : msg.content}
                    {isLastStreaming && (
                      <span style={{ animation: 'hokuBlink 1s infinite', color: '#ff6b6b' }}>▊</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <span style={{
                      fontSize: '0.55rem', color: '#475569',
                      paddingLeft: msg.role === 'hoku' ? 4 : 0,
                      paddingRight: msg.role === 'user' ? 4 : 0,
                    }}>
                      {msg.role === 'hoku' && '🐾 '}{formatTime(msg.timestamp)}
                    </span>
                    {msg.role === 'hoku' && !isLastStreaming && msg.content.length > 20 && msg.content !== profile.welcome && (
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button onClick={() => submitFeedback(i, 'positive')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', opacity: msg.feedback === 'positive' ? 1 : 0.4, transition: 'opacity 0.15s', padding: '0 2px' }}
                          title="Buena respuesta">👍</button>
                        <button onClick={() => submitFeedback(i, 'negative')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', opacity: msg.feedback === 'negative' ? 1 : 0.4, transition: 'opacity 0.15s', padding: '0 2px' }}
                          title="Mala respuesta">👎</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
          background: `linear-gradient(135deg, ${profile.color}, ${profile.color}cc)`,
          boxShadow: `0 8px 32px ${profile.color}50, 0 0 20px ${profile.color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', zIndex: 1000, transition: 'all 0.3s',
          animation: pulse ? 'hokuPulse 2s infinite' : 'none',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {open ? '✕' : profile.emoji}
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
          div[style*="width: 420"] {
            width: calc(100vw - 32px) !important;
            right: 16px !important;
            bottom: 80px !important;
          }
        }
      `}</style>
    </>
  );
}
