'use client';
import { useState } from 'react';

interface Tool {
  id: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  status: 'connected' | 'available' | 'coming_soon';
  description: string;
  action?: string;
}

const TOOLS: Tool[] = [
  // IA Generativa (connected)
  { id: 'claude', name: 'Claude', category: 'IA Generativa', icon: '🤖', color: '#00e5b0', status: 'connected', description: 'Anthropic — Code review, arquitectura, desarrollo', action: 'claude' },
  { id: 'groq', name: 'Groq', category: 'IA Generativa', icon: '⚡', color: '#f59e0b', status: 'connected', description: 'Llama 3.3 70B — Respuestas ultra rápidas', action: 'groq' },
  { id: 'gemini', name: 'Gemini', category: 'IA Generativa', icon: '💎', color: '#22c55e', status: 'connected', description: 'Google — SEO, analytics, contenido', action: 'gemini' },
  { id: 'grok', name: 'Grok', category: 'IA Generativa', icon: '⚡', color: '#8b5cf6', status: 'available', description: 'xAI — Análisis y research (falta API key)', action: 'grok' },

  // Dev Tools (connected)
  { id: 'github', name: 'GitHub', category: 'Dev Tools', icon: '🐙', color: '#f1f5f9', status: 'connected', description: 'Repos, CI/CD, Actions', action: 'https://github.com/guillermogonzalezleon-lgtm' },
  { id: 'vercel', name: 'Vercel', category: 'Dev Tools', icon: '▲', color: '#f1f5f9', status: 'connected', description: 'Deploy frontend, serverless, analytics', action: 'https://vercel.com/gglpro' },
  { id: 'aws', name: 'AWS', category: 'Dev Tools', icon: '☁️', color: '#f97316', status: 'connected', description: 'S3, CloudFront, Amplify, Lambda', action: '/dashboard/aws' },
  { id: 'supabase', name: 'Supabase', category: 'Dev Tools', icon: '⚡', color: '#22c55e', status: 'connected', description: 'PostgreSQL, Auth, Storage, Realtime', action: 'https://supabase.com/dashboard' },
  { id: 'replit', name: 'Replit AI', category: 'Dev Tools', icon: '🔷', color: '#3b82f6', status: 'available', description: 'IDE en la nube con IA' },
  { id: 'bolt', name: 'Bolt.new', category: 'Dev Tools', icon: '⚡', color: '#f59e0b', status: 'available', description: 'Prototipado rápido con IA' },

  // Visual Design
  { id: 'midjourney', name: 'Midjourney', category: 'Visual Design', icon: '🎨', color: '#8b5cf6', status: 'coming_soon', description: 'Generación de imágenes premium' },
  { id: 'dalle', name: 'DALL-E 3', category: 'Visual Design', icon: '🖼️', color: '#22c55e', status: 'coming_soon', description: 'OpenAI — Imágenes desde texto' },
  { id: 'leonardo', name: 'Leonardo AI', category: 'Visual Design', icon: '🎭', color: '#f97316', status: 'coming_soon', description: 'Assets de juegos y diseño' },
  { id: 'canva', name: 'Canva', category: 'Visual Design', icon: '🎨', color: '#06b6d4', status: 'available', description: 'Diseño gráfico y social media' },
  { id: 'figma', name: 'Figma', category: 'Visual Design', icon: '🖌️', color: '#a855f7', status: 'available', description: 'UI/UX design colaborativo' },

  // UX Writing
  { id: 'jasper', name: 'Jasper', category: 'UX Writing', icon: '✍️', color: '#ef4444', status: 'coming_soon', description: 'Copy marketing con IA' },
  { id: 'copyai', name: 'Copy.ai', category: 'UX Writing', icon: '📝', color: '#8b5cf6', status: 'coming_soon', description: 'Generador de copy' },
  { id: 'writesonic', name: 'Writesonic', category: 'UX Writing', icon: '✏️', color: '#3b82f6', status: 'coming_soon', description: 'Contenido SEO y blogs' },

  // Research
  { id: 'dovetail', name: 'Dovetail', category: 'Research', icon: '🔍', color: '#a855f7', status: 'coming_soon', description: 'Research analysis platform' },
  { id: 'hotjar', name: 'Hotjar', category: 'Research', icon: '🔥', color: '#ef4444', status: 'available', description: 'Heatmaps y grabaciones de sesión' },

  // Video
  { id: 'runway', name: 'Runway', category: 'Video', icon: '🎬', color: '#06b6d4', status: 'coming_soon', description: 'Generación de video con IA' },
  { id: 'synthesia', name: 'Synthesia', category: 'Video', icon: '🎥', color: '#8b5cf6', status: 'coming_soon', description: 'Videos con avatares IA' },
  { id: 'sora', name: 'Sora', category: 'Video', icon: '🌀', color: '#f1f5f9', status: 'coming_soon', description: 'OpenAI — Text to video' },

  // Automation
  { id: 'make', name: 'Make', category: 'Automation', icon: '⚙️', color: '#a855f7', status: 'available', description: 'Automatización visual de workflows' },
  { id: 'zapier', name: 'Zapier', category: 'Automation', icon: '🔗', color: '#f97316', status: 'available', description: 'Conectar apps sin código' },
  { id: 'n8n', name: 'n8n', category: 'Automation', icon: '🔄', color: '#ef4444', status: 'coming_soon', description: 'Workflow automation open source' },
];

const CATEGORIES = ['Todas', 'IA Generativa', 'Dev Tools', 'Visual Design', 'UX Writing', 'Research', 'Video', 'Automation'];

const statusConfig = {
  connected: { label: 'Conectado', bg: 'rgba(34,197,94,0.12)', color: '#22c55e', dot: '#22c55e' },
  available: { label: 'Disponible', bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', dot: '#3b82f6' },
  coming_soon: { label: 'Próximamente', bg: 'rgba(71,85,105,0.12)', color: '#64748b', dot: '#475569' },
};

export default function LabsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [running, setRunning] = useState(false);

  const filtered = TOOLS.filter(t => {
    if (category !== 'Todas' && t.category !== category) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const connected = TOOLS.filter(t => t.status === 'connected');

  const executeAgent = async (agentId: string) => {
    if (!prompt.trim()) return;
    setRunning(true);
    setResult('');
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute', agentId, prompt, taskType: 'general' }),
      }).then(r => r.json());
      setResult(res.result || res.error || JSON.stringify(res));
    } catch (e) {
      setResult('Error: ' + String(e));
    }
    setRunning(false);
  };

  const handleToolClick = (tool: Tool) => {
    if (tool.status === 'coming_soon') return;
    if (tool.action?.startsWith('http') || tool.action?.startsWith('/')) {
      window.open(tool.action, tool.action.startsWith('/') ? '_self' : '_blank');
      return;
    }
    setSelectedTool(tool);
    setPrompt('');
    setResult('');
  };

  return (
    <>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(15,22,35,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', height: 56, display: 'flex', alignItems: 'center', padding: '0 2rem', fontSize: '0.85rem', color: '#94a3b8' }}>
        Intranet <span style={{ margin: '0 8px', color: '#475569' }}>/</span> <span style={{ color: '#fff', fontWeight: 600 }}>Labs</span>
      </div>

      <div style={{ padding: '1.5rem 2rem', flex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>🧪 Labs</h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0' }}>Integraciones y herramientas IA — {connected.length} conectadas</p>
        </div>

        {/* Active integrations */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {connected.map(t => (
            <div key={t.id} onClick={() => handleToolClick(t)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#111827', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 999, padding: '5px 14px 5px 8px', cursor: 'pointer', transition: 'all 0.15s' }}>
              <span style={{ fontSize: '0.85rem' }}>{t.icon}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#e2e8f0' }}>{t.name}</span>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }}></span>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar herramienta..." style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 14px', color: '#fff', fontSize: '0.78rem', width: 240, outline: 'none', fontFamily: "'Inter', system-ui" }} />
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{ background: category === c ? 'rgba(0,229,176,0.12)' : 'transparent', color: category === c ? '#00e5b0' : '#64748b', border: category === c ? '1px solid rgba(0,229,176,0.3)' : '1px solid rgba(255,255,255,0.06)', padding: '6px 14px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>{c}</button>
          ))}
        </div>

        {/* Tools Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {filtered.map(tool => {
            const sc = statusConfig[tool.status];
            const isDisabled = tool.status === 'coming_soon';
            return (
              <div key={tool.id} onClick={() => handleToolClick(tool)} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.25rem', cursor: isDisabled ? 'default' : 'pointer', opacity: isDisabled ? 0.5 : 1, transition: 'all 0.2s', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${tool.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>{tool.icon}</div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>{tool.name}</div>
                    <div style={{ fontSize: '0.6rem', color: '#475569', fontWeight: 600 }}>{tool.category}</div>
                  </div>
                </div>
                <p style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 12px', minHeight: 32 }}>{tool.description}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: sc.bg, color: sc.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot, boxShadow: tool.status === 'connected' ? `0 0 6px ${sc.dot}` : 'none' }}></span>
                    {sc.label}
                  </span>
                  {tool.status === 'connected' && <span style={{ fontSize: '0.65rem', color: '#00e5b0', fontWeight: 600 }}>Usar →</span>}
                  {tool.status === 'available' && <span style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: 600 }}>Conectar →</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agent Modal */}
      {selectedTool && selectedTool.action && !selectedTool.action.startsWith('http') && !selectedTool.action.startsWith('/') && (
        <div onClick={() => setSelectedTool(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0f1623', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, width: '100%', maxWidth: 580, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ padding: '1.5rem 2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${selectedTool.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>{selectedTool.icon}</div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f1f5f9' }}>{selectedTool.name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{selectedTool.description}</div>
                </div>
                <button onClick={() => setSelectedTool(null)} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: '1rem' }}>✕</button>
              </div>

              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={`Escribe tu instrucción para ${selectedTool.name}...`} style={{ width: '100%', background: '#0a0d14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1rem', color: '#e2e8f0', fontSize: '0.82rem', fontFamily: "'Inter', system-ui", minHeight: 100, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />

              <button onClick={() => executeAgent(selectedTool.action!)} disabled={running || !prompt.trim()} style={{ width: '100%', marginTop: '0.75rem', background: running ? '#1a2235' : `linear-gradient(135deg, ${selectedTool.color}, ${selectedTool.color}cc)`, color: running ? '#94a3b8' : '#0a0d14', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: '0.82rem', cursor: running ? 'not-allowed' : 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {running ? '⏳ Procesando...' : `⚡ Ejecutar ${selectedTool.name}`}
              </button>

              {result && (
                <div style={{ marginTop: '1rem', background: '#0a0d14', border: `1px solid ${selectedTool.color}30`, borderRadius: 12, padding: '1.25rem', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: '40vh', overflow: 'auto' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: selectedTool.color, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Respuesta de {selectedTool.name}</div>
                  {result}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
