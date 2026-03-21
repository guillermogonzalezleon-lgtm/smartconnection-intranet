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

const agentColors: Record<string, string> = { claude: '#00e5b0', groq: '#f59e0b', grok: '#8b5cf6', gemini: '#22c55e', deployer: '#3b82f6' };
const estadoColors: Record<string, { bg: string; text: string }> = {
  pendiente: { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' },
  en_progreso: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  implementado: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e' },
};
const catColors: Record<string, string> = { 'Conversión': '#ef4444', 'Conversion': '#ef4444', SEO: '#8b5cf6', Contenido: '#f59e0b', Navegación: '#3b82f6', Navegacion: '#3b82f6', WhatsApp: '#22c55e', i18n: '#00e5b0', Checkout: '#f97316' };

/* ── Popup overlay ─────────────────────────────────────────── */
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: '#0f1623', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, width: '100%', maxWidth: 620, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
        {children}
      </div>
    </div>
  );
}

/* ── Animated dots ─────────────────────────────────────────── */
function AnimatedDots() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(t);
  }, []);
  return <span>{dots}</span>;
}

/* ── Main page ─────────────────────────────────────────────── */
export default function UXAgent() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [filterCat, setFilterCat] = useState('Todas');
  const [filterEstado, setFilterEstado] = useState('Todas');

  // Popups
  const [analysisPopup, setAnalysisPopup] = useState<'loading' | 'result' | null>(null);
  const [analysisResult, setAnalysisResult] = useState('');
  const [detailInsight, setDetailInsight] = useState<Insight | null>(null);
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentResult, setAgentResult] = useState('');

  const api = useCallback((payload: Record<string, unknown>) =>
    fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json()), []);

  const loadInsights = useCallback(() => {
    api({ action: 'query', table: 'ux_insights', order: 'created_at.desc', limit: 100 })
      .then(d => { if (d.data) setInsights(d.data as Insight[]); })
      .catch(() => {});
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

  const currentCiclo = insights.length > 0 ? Math.max(...insights.map(i => i.ciclo || 1)) : 1;

  /* ── Stream helper ────────────────────────────────── */
  const streamAgent = async (prompt: string, taskType: string, onChunk: (text: string) => void, onDone: () => void) => {
    try {
      const res = await fetch('/api/agents/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, taskType, agentId: 'groq' }),
      });
      if (!res.ok || !res.body) { onChunk(`Error: ${res.status}`); onDone(); return; }
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
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) onChunk(parsed.content);
            if (parsed.error) onChunk(`\nError: ${parsed.error}`);
          } catch {}
        }
      }
    } catch (err) { onChunk(`\nError: ${String(err)}`); }
    onDone();
  };

  /* ── Run new analysis (streaming) ───────────────── */
  const runAnalysis = async () => {
    setAnalysisPopup('loading');
    setAnalysisResult('');
    await streamAgent(
      'Analiza el sitio smconnection.cl y genera 3 mejoras UX concretas para mejorar conversión, SEO y experiencia de usuario. Para cada mejora incluye: título, descripción detallada, categoría (Conversión/SEO/Contenido/Navegación/WhatsApp), e impacto estimado. Responde de forma clara y estructurada.',
      'seo',
      (chunk) => setAnalysisResult(prev => prev + chunk),
      () => { setAnalysisPopup('result'); loadInsights(); },
    );
  };

  /* ── Run agent on specific insight (streaming) ──── */
  const runAgentOnInsight = async (insight: Insight) => {
    setAgentRunning(true);
    setAgentResult('');
    await streamAgent(
      `Analiza esta mejora UX para smconnection.cl y da recomendaciones detalladas de implementación:\n\nTítulo: ${insight.titulo}\nDescripción: ${insight.descripcion}\nCategoría: ${insight.categoria}\nImpacto: ${insight.impacto}\n\nDa pasos concretos, código si es necesario, y priorización.`,
      'seo',
      (chunk) => setAgentResult(prev => prev + chunk),
      () => setAgentRunning(false),
    );
  };

  const updateEstado = (id: string, newEstado: string) => {
    setInsights(prev => prev.map(i => i.id === id ? { ...i, estado: newEstado } : i));
    if (detailInsight?.id === id) setDetailInsight(prev => prev ? { ...prev, estado: newEstado } : null);
  };

  const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return d; } };

  /* ── Styles ─────────────────────────────────────────── */
  const pill = (active: boolean, color?: string): React.CSSProperties => ({
    background: active ? (color ? `${color}20` : 'rgba(0,229,176,0.15)') : 'transparent',
    color: active ? (color || '#00e5b0') : '#64748b',
    border: active ? `1px solid ${color || 'rgba(0,229,176,0.3)'}` : '1px solid rgba(255,255,255,0.06)',
    padding: '6px 16px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
    cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", transition: 'all 0.15s',
  });

  return (
    <>
      {/* ── Breadcrumb ──────────────────────────────────── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(15,22,35,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', height: 56, display: 'flex', alignItems: 'center', padding: '0 2rem', fontSize: '0.85rem', color: '#94a3b8' }}>
        <span>Intranet</span><span style={{ margin: '0 8px', color: '#475569' }}>/</span><span style={{ color: '#fff', fontWeight: 600 }}>Agente UX</span>
      </div>

      <div style={{ padding: '2rem', flex: 1 }}>
        {/* ── Header ──────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.4rem' }}>⚡</span> Agente UX
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 6 }}>
              Análisis continuo de experiencia y conversión — Ciclo {currentCiclo}
            </div>
          </div>
          <button
            onClick={runAnalysis}
            style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)', color: '#0a0d14', border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 20px rgba(0,229,176,0.25)', transition: 'all 0.2s' }}
          >
            <span style={{ fontSize: '1rem' }}>⚡</span> Nuevo análisis
          </button>
        </div>

        {/* ── KPI Cards ───────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.75rem' }}>
          {([
            { label: 'Pendientes', value: counts.pendiente, color: '#f59e0b', icon: '⏳' },
            { label: 'En progreso', value: counts.en_progreso, color: '#3b82f6', icon: '🔄' },
            { label: 'Implementadas', value: counts.implementado, color: '#22c55e', icon: '✅' },
            { label: 'Total mejoras', value: counts.total, color: '#f1f5f9', icon: '📊' },
          ] as const).map(kpi => (
            <div key={kpi.label} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.25rem 1.5rem', borderTop: `3px solid ${kpi.color}`, transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 6, fontWeight: 500 }}>{kpi.label}</div>
                </div>
                <span style={{ fontSize: '1.5rem', opacity: 0.5 }}>{kpi.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter Bar ──────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: '1.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {ESTADOS.map(e => {
            const eColors: Record<string, string> = { 'Pendiente': '#f59e0b', 'En progreso': '#3b82f6', 'Implementado': '#22c55e' };
            return <button key={e} onClick={() => setFilterEstado(e)} style={pill(filterEstado === e, eColors[e])}>{e}</button>;
          })}
          <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', margin: '0 6px' }}></span>
          {CATEGORIAS.map(c => (
            <button key={c} onClick={() => setFilterCat(c)} style={pill(filterCat === c, catColors[c])}>{c}</button>
          ))}
        </div>

        {/* ── Insight Cards ───────────────────────────────── */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#475569' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.3 }}>💡</div>
            <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>Sin insights para este filtro</p>
          </div>
        ) : filtered.map(insight => {
          const ec = estadoColors[insight.estado] || estadoColors.pendiente;
          return (
            <div
              key={insight.id}
              onClick={() => { setDetailInsight(insight); setAgentResult(''); setAgentRunning(false); }}
              style={{
                background: '#111827', border: insight.estado === 'en_progreso' ? '1px solid rgba(59,130,246,0.25)' : '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16, padding: '1.25rem 1.5rem', marginBottom: '0.65rem', cursor: 'pointer',
                transition: 'all 0.2s', display: 'flex', gap: 14, alignItems: 'flex-start',
              }}
            >
              {/* Left dot */}
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: agentColors[insight.agente] || '#475569', marginTop: 6, flexShrink: 0, boxShadow: `0 0 8px ${agentColors[insight.agente] || '#475569'}60` }}></div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Top badges row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: `${catColors[insight.categoria] || '#475569'}18`, color: catColors[insight.categoria] || '#94a3b8', letterSpacing: '0.02em' }}>{insight.categoria}</span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 600, color: '#475569' }}>Ciclo {insight.ciclo}</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#22c55e', marginLeft: 'auto' }}>{insight.impacto}</span>
                  <select
                    value={insight.estado}
                    onChange={e => { e.stopPropagation(); updateEstado(insight.id, e.target.value); }}
                    onClick={e => e.stopPropagation()}
                    style={{
                      background: ec.bg, border: `1px solid ${ec.text}30`, borderRadius: 8, padding: '4px 26px 4px 10px',
                      fontSize: '0.68rem', fontWeight: 700, color: ec.text, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif",
                      appearance: 'none' as const,
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%2394a3b8\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")',
                      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
                    }}
                  >
                    <option value="pendiente">⏳ Pendiente</option>
                    <option value="en_progreso">🔄 En progreso</option>
                    <option value="implementado">✅ Implementado</option>
                  </select>
                </div>
                {/* Title + desc */}
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 5 }}>{insight.titulo}</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{insight.descripcion}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════
          POPUP: Nuevo Análisis (loading)
         ══════════════════════════════════════════════════════ */}
      {analysisPopup === 'loading' && (
        <Overlay onClose={() => {}}>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', animation: 'pulse 1.5s ease-in-out infinite' }}></div>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9' }}>Groq Agent — Streaming</span>
              <span style={{ fontSize: '0.65rem', color: '#475569', marginLeft: 'auto' }}>llama-3.3-70b</span>
            </div>
            <div style={{
              background: '#0a0d14', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10,
              padding: '1rem', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem',
              color: '#22c55e', lineHeight: 1.8, whiteSpace: 'pre-wrap', minHeight: 200, maxHeight: '55vh',
              overflow: 'auto', position: 'relative',
            }}>
              <div style={{ color: '#475569', marginBottom: 8 }}>$ groq analyze --site smconnection.cl --mode ux</div>
              {analysisResult || <span style={{ color: '#475569' }}>Esperando respuesta<AnimatedDots /></span>}
              <span style={{ display: 'inline-block', width: 7, height: 14, background: '#22c55e', marginLeft: 2, animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom' }}></span>
            </div>
            <style>{`
              @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
              @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
            `}</style>
          </div>
        </Overlay>
      )}

      {/* ══════════════════════════════════════════════════════
          POPUP: Resultado del análisis
         ══════════════════════════════════════════════════════ */}
      {analysisPopup === 'result' && (
        <Overlay onClose={() => setAnalysisPopup(null)}>
          <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1rem' }}>✨</span> Resultado del análisis
              </div>
              <button onClick={() => setAnalysisPopup(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ background: '#0a0d14', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1.25rem', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: '50vh', overflow: 'auto', fontFamily: "'Inter', system-ui, sans-serif" }}>
              {typeof analysisResult === 'string' ? analysisResult : JSON.stringify(analysisResult, null, 2)}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setAnalysisPopup(null)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', padding: '10px 20px', borderRadius: 10, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}>
                Cerrar
              </button>
              <button onClick={() => { setAnalysisPopup(null); }} style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)', color: '#0a0d14', border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}>
                Guardar mejoras
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ══════════════════════════════════════════════════════
          POPUP: Detalle de insight
         ══════════════════════════════════════════════════════ */}
      {detailInsight && (
        <Overlay onClose={() => setDetailInsight(null)}>
          <div style={{ padding: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: agentColors[detailInsight.agente] || '#475569', boxShadow: `0 0 10px ${agentColors[detailInsight.agente] || '#475569'}60` }}></div>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Agente: {detailInsight.agente}
                </span>
              </div>
              <button onClick={() => setDetailInsight(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* Title */}
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '1rem', lineHeight: 1.4 }}>{detailInsight.titulo}</div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: `${catColors[detailInsight.categoria] || '#475569'}18`, color: catColors[detailInsight.categoria] || '#94a3b8' }}>{detailInsight.categoria}</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '4px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', color: '#64748b' }}>Ciclo {detailInsight.ciclo}</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>{detailInsight.impacto}</span>
            </div>

            {/* Description */}
            <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.7, marginBottom: '1.5rem', background: '#0a0d14', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: '1.25rem' }}>
              {detailInsight.descripcion}
            </div>

            {/* Status changer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Estado:</span>
              {(['pendiente', 'en_progreso', 'implementado'] as const).map(est => {
                const active = detailInsight.estado === est;
                const ec = estadoColors[est];
                const labels: Record<string, string> = { pendiente: '⏳ Pendiente', en_progreso: '🔄 En progreso', implementado: '✅ Implementado' };
                return (
                  <button
                    key={est}
                    onClick={() => updateEstado(detailInsight.id, est)}
                    style={{
                      background: active ? ec.bg : 'transparent',
                      border: active ? `1px solid ${ec.text}40` : '1px solid rgba(255,255,255,0.06)',
                      color: active ? ec.text : '#64748b',
                      padding: '6px 14px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600,
                      cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", transition: 'all 0.15s',
                    }}
                  >
                    {labels[est]}
                  </button>
                );
              })}
            </div>

            {/* Date */}
            <div style={{ fontSize: '0.72rem', color: '#475569', marginBottom: '1.5rem' }}>
              Creado: {fmtDate(detailInsight.created_at)}
            </div>

            {/* Agent execution button */}
            <button
              onClick={() => runAgentOnInsight(detailInsight)}
              disabled={agentRunning}
              style={{
                width: '100%', background: agentRunning ? '#1a2235' : 'linear-gradient(135deg, #f59e0b, #f97316)',
                color: agentRunning ? '#94a3b8' : '#0a0d14', border: 'none', padding: '12px', borderRadius: 12,
                fontWeight: 700, fontSize: '0.82rem', cursor: agentRunning ? 'not-allowed' : 'pointer',
                fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
            >
              {agentRunning ? (<>Ejecutando agente<AnimatedDots /></>) : (<><span>🤖</span> Ejecutar agente sobre este insight</>)}
            </button>

            {/* Agent result — terminal streaming */}
            {(agentResult || agentRunning) && (
              <div style={{ marginTop: '1rem', background: '#0a0d14', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 12, padding: '1rem', maxHeight: '40vh', overflow: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  {agentRunning && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 6px #f59e0b', animation: 'pulse 1.5s ease-in-out infinite' }}></div>}
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Groq Agent Output</span>
                  {!agentRunning && agentResult && <span style={{ fontSize: '0.6rem', color: '#22c55e', marginLeft: 'auto' }}>Completado</span>}
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: '#e2e8f0', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  {agentResult || <span style={{ color: '#475569' }}>Iniciando agente<AnimatedDots /></span>}
                  {agentRunning && <span style={{ display: 'inline-block', width: 6, height: 13, background: '#f59e0b', marginLeft: 2, animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom' }}></span>}
                </div>
                <style>{`@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
              </div>
            )}
          </div>
        </Overlay>
      )}
    </>
  );
}
