'use client';
import { useEffect, useState, useCallback } from 'react';

interface Insight {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  impacto: string;
  estado: string;
  ciclo: number;
  agente: string;
  created_at: string;
}

const CATEGORIAS = ['Todas', 'Conversión', 'SEO', 'Contenido', 'Navegación', 'WhatsApp', 'i18n', 'Checkout'];
const ESTADOS = ['Todas', 'Pendiente', 'En progreso', 'Implementado'];

const agentColors: Record<string, string> = { claude: '#00e5b0', groq: '#f59e0b', grok: '#8b5cf6', gemini: '#22c55e', hoku: '#ff6b6b', deployer: '#3b82f6' };
const estadoColors: Record<string, { bg: string; text: string }> = {
  pendiente: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
  en_progreso: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  implementado: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e' },
};
const catColors: Record<string, string> = { 'Conversión': '#ef4444', SEO: '#8b5cf6', Contenido: '#f59e0b', Navegación: '#3b82f6', WhatsApp: '#22c55e', i18n: '#00e5b0', Checkout: '#f97316' };

function AnimatedDots() {
  const [dots, setDots] = useState('');
  useEffect(() => { const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400); return () => clearInterval(t); }, []);
  return <span>{dots}</span>;
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0f1623', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, width: '100%', maxWidth: 620, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
        {children}
      </div>
    </div>
  );
}

export default function UXAgent() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [filterCat, setFilterCat] = useState('Todas');
  const [filterEstado, setFilterEstado] = useState('Todas');
  const [detailInsight, setDetailInsight] = useState<Insight | null>(null);
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentResult, setAgentResult] = useState('');

  const api = useCallback((payload: Record<string, unknown>) =>
    fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json()), []);

  const loadInsights = useCallback(() => {
    api({ action: 'query', table: 'ux_insights', order: 'created_at.desc', limit: 100 })
      .then(d => { if (d.data) setInsights(d.data as Insight[]); }).catch(() => {});
  }, [api]);

  useEffect(() => { loadInsights(); }, [loadInsights]);

  const filtered = insights.filter(i => {
    if (filterCat !== 'Todas' && i.categoria !== filterCat) return false;
    if (filterEstado === 'Pendiente' && i.estado !== 'pendiente') return false;
    if (filterEstado === 'En progreso' && i.estado !== 'en_progreso') return false;
    if (filterEstado === 'Implementado' && i.estado !== 'implementado') return false;
    return true;
  });

  const counts = {
    pendiente: insights.filter(i => i.estado === 'pendiente').length,
    en_progreso: insights.filter(i => i.estado === 'en_progreso').length,
    implementado: insights.filter(i => i.estado === 'implementado').length,
    total: insights.length,
  };

  const streamAgent = async (prompt: string, taskType: string, agentId: string, onChunk: (t: string) => void, onDone: () => void) => {
    try {
      const res = await fetch('/api/agents/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, taskType, agentId }) });
      if (!res.ok || !res.body) { onChunk(`Error: ${res.status}`); onDone(); return; }
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines) { const t = line.trim(); if (!t.startsWith('data: ')) continue; const d = t.slice(6); if (d === '[DONE]') continue; try { const p = JSON.parse(d); if (p.content) onChunk(p.content); } catch {} }
      }
    } catch (err) { onChunk(`\nError: ${String(err)}`); }
    onDone();
  };

  const runAgentOnInsight = async (insight: Insight) => {
    setAgentRunning(true); setAgentResult('');
    await streamAgent(`Analiza esta mejora UX para smconnection.cl:\n\nTítulo: ${insight.titulo}\nDescripción: ${insight.descripcion}\nCategoría: ${insight.categoria}\nImpacto: ${insight.impacto}\n\nDa pasos concretos y priorización.`, 'seo', 'groq',
      (chunk) => setAgentResult(prev => prev + chunk), () => setAgentRunning(false));
  };

  const updateEstado = (id: string, newEstado: string) => {
    setInsights(prev => prev.map(i => i.id === id ? { ...i, estado: newEstado } : i));
    if (detailInsight?.id === id) setDetailInsight(prev => prev ? { ...prev, estado: newEstado } : null);
  };

  const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d; } };

  const pill = (active: boolean, color?: string): React.CSSProperties => ({
    background: active ? (color ? `${color}20` : 'rgba(0,229,176,0.15)') : 'transparent',
    color: active ? (color || '#00e5b0') : '#64748b',
    border: active ? `1px solid ${color || 'rgba(0,229,176,0.3)'}` : '1px solid rgba(255,255,255,0.06)',
    padding: '5px 14px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600,
    cursor: 'pointer', fontFamily: "'Inter', system-ui", transition: 'all 0.15s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 34px)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, background: 'rgba(15,22,35,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ height: 48, display: 'flex', alignItems: 'center', padding: '0 1.5rem', fontSize: '0.82rem', color: '#94a3b8' }}>
          <span>Intranet</span><span style={{ margin: '0 8px', color: '#475569' }}>/</span><span style={{ color: '#fff', fontWeight: 600 }}>Agente UX</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1.25rem 1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f1f5f9' }}>Insights UX — Ciclo {Math.max(1, ...insights.map(i => i.ciclo || 1))}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>Análisis continuo de experiencia y conversión</div>
          </div>
          <a href="/dashboard/agents" style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)', color: '#0a0d14', border: 'none', padding: '8px 18px', borderRadius: 10, fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 20px rgba(0,229,176,0.25)', textDecoration: 'none' }}>
            <img src="/img/hoku.jpg" alt="Hoku" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} /> Nuevo análisis con Hoku
          </a>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem', marginBottom: '1.25rem' }}>
          {([
            { label: 'Pendientes', value: counts.pendiente, color: '#f59e0b' },
            { label: 'En progreso', value: counts.en_progreso, color: '#3b82f6' },
            { label: 'Implementadas', value: counts.implementado, color: '#22c55e' },
            { label: 'Total', value: counts.total, color: '#94a3b8' },
          ] as const).map(kpi => (
            <div key={kpi.label} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '1rem 1.25rem', borderTop: `3px solid ${kpi.color}` }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 4, fontWeight: 500 }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 5, marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {ESTADOS.map(e => {
            const eColors: Record<string, string> = { 'Pendiente': '#f59e0b', 'En progreso': '#3b82f6', 'Implementado': '#22c55e' };
            return <button key={e} onClick={() => setFilterEstado(e)} style={pill(filterEstado === e, eColors[e])}>{e}</button>;
          })}
          <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.06)', margin: '0 4px' }}></span>
          {CATEGORIAS.map(c => <button key={c} onClick={() => setFilterCat(c)} style={pill(filterCat === c, catColors[c])}>{c}</button>)}
        </div>

        {/* Insights */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#475569', fontSize: '0.82rem' }}>Sin insights para este filtro</div>
        ) : filtered.map(insight => {
          const ec = estadoColors[insight.estado] || estadoColors.pendiente;
          return (
            <div key={insight.id} onClick={() => { setDetailInsight(insight); setAgentResult(''); setAgentRunning(false); }}
              style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '0.5rem', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: agentColors[insight.agente] || '#475569', marginTop: 6, flexShrink: 0, boxShadow: `0 0 6px ${agentColors[insight.agente] || '#475569'}50` }}></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: `${catColors[insight.categoria] || '#475569'}15`, color: catColors[insight.categoria] || '#94a3b8' }}>{insight.categoria}</span>
                  <span style={{ fontSize: '0.58rem', color: '#475569' }}>Ciclo {insight.ciclo}</span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#22c55e', marginLeft: 'auto' }}>{insight.impacto}</span>
                  <span style={{ fontSize: '0.58rem', fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: ec.bg, color: ec.text }}>{insight.estado.replace('_', ' ')}</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 3 }}>{insight.titulo}</div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{insight.descripcion}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail popup */}
      {detailInsight && (
        <Overlay onClose={() => setDetailInsight(null)}>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: agentColors[detailInsight.agente] || '#475569' }}></div>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Agente: {detailInsight.agente}</span>
              </div>
              <button onClick={() => setDetailInsight(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '0.75rem' }}>{detailInsight.titulo}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: `${catColors[detailInsight.categoria] || '#475569'}15`, color: catColors[detailInsight.categoria] || '#94a3b8' }}>{detailInsight.categoria}</span>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>{detailInsight.impacto}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.7, marginBottom: '1rem', background: '#0a0d14', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, padding: '1rem' }}>{detailInsight.descripcion}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>Estado:</span>
              {(['pendiente', 'en_progreso', 'implementado'] as const).map(est => {
                const active = detailInsight.estado === est; const ec = estadoColors[est];
                const labels: Record<string, string> = { pendiente: '⏳ Pendiente', en_progreso: '🔄 En progreso', implementado: '✅ Implementado' };
                return <button key={est} onClick={() => updateEstado(detailInsight.id, est)} style={{ background: active ? ec.bg : 'transparent', border: active ? `1px solid ${ec.text}40` : '1px solid rgba(255,255,255,0.06)', color: active ? ec.text : '#64748b', padding: '5px 12px', borderRadius: 7, fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>{labels[est]}</button>;
              })}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: '1rem' }}>Creado: {fmtDate(detailInsight.created_at)}</div>
            <button onClick={() => runAgentOnInsight(detailInsight)} disabled={agentRunning} style={{ width: '100%', background: agentRunning ? '#1a2235' : 'linear-gradient(135deg, #f59e0b, #f97316)', color: agentRunning ? '#94a3b8' : '#0a0d14', border: 'none', padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: '0.78rem', cursor: agentRunning ? 'not-allowed' : 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {agentRunning ? <>Ejecutando<AnimatedDots /></> : <>🤖 Ejecutar agente</>}
            </button>
            {(agentResult || agentRunning) && (
              <div style={{ marginTop: '0.75rem', background: '#0a0d14', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, padding: '0.75rem', maxHeight: '35vh', overflow: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  {agentRunning && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s infinite' }}></span>}
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>Output</span>
                  {!agentRunning && agentResult && <span style={{ fontSize: '0.55rem', color: '#22c55e', marginLeft: 'auto' }}>Completado</span>}
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', color: '#e2e8f0', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  {agentResult || <span style={{ color: '#475569' }}>Iniciando<AnimatedDots /></span>}
                  {agentRunning && <span style={{ display: 'inline-block', width: 6, height: 13, background: '#f59e0b', marginLeft: 2, animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom' }}></span>}
                </div>
              </div>
            )}
          </div>
        </Overlay>
      )}

      <style>{`
        @keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0 } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
      `}</style>
    </div>
  );
}
