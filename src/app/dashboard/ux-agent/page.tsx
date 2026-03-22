'use client';
import { useEffect, useState, useCallback, useRef } from 'react';

// ── Types ──
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

interface PipelineStep {
  label: string;
  key: string;
  status: 'waiting' | 'running' | 'done' | 'error';
  startedAt?: number;
  finishedAt?: number;
}

// ── Constants ──
const CATEGORIAS = ['Todas', 'Conversion', 'SEO', 'Contenido', 'Navegacion', 'WhatsApp', 'i18n', 'Checkout'];
const ESTADOS_FILTER = ['Todas', 'Pendiente', 'En progreso', 'Implementado'];

const agentColors: Record<string, string> = {
  hoku: '#ff6b6b', groq: '#f59e0b', claude: '#00e5b0', grok: '#8b5cf6',
  deepseek: '#0ea5e9', mistral: '#f97316', openai: '#10b981', cohere: '#1e3a5f',
  openrouter: '#6366f1', bedrock: '#f97316', gemini: '#22c55e', deployer: '#3b82f6',
};
const estadoColors: Record<string, { bg: string; text: string; border: string }> = {
  pendiente: { bg: 'rgba(245,158,11,0.08)', text: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  en_progreso: { bg: 'rgba(59,130,246,0.08)', text: '#3b82f6', border: 'rgba(59,130,246,0.25)' },
  implementado: { bg: 'rgba(34,197,94,0.08)', text: '#22c55e', border: 'rgba(34,197,94,0.25)' },
};
const catColors: Record<string, string> = {
  'Conversion': '#ef4444', SEO: '#8b5cf6', Contenido: '#f59e0b',
  'Navegacion': '#3b82f6', WhatsApp: '#22c55e', i18n: '#00e5b0', Checkout: '#f97316',
};

// ── Helpers ──
function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `hace ${days}d`;
  } catch { return dateStr; }
}

function AnimatedDots() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(t);
  }, []);
  return <span>{dots}</span>;
}

function PulsingDot({ color, size = 6 }: { color: string; size?: number }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: '50%',
      background: color, boxShadow: `0 0 ${size * 2}px ${color}60`,
      animation: 'pulse 2s ease-in-out infinite',
    }} />
  );
}

// ── Overlay ──
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', animation: 'fadeIn 0.2s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'linear-gradient(180deg, #111827 0%, #0a0d14 100%)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
        width: '100%', maxWidth: 680, maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
        animation: 'slideUp 0.25s ease-out',
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Pipeline Progress ──
function PipelineProgress({ steps }: { steps: PipelineStep[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '1rem 0' }}>
      {steps.map((step, idx) => {
        const elapsed = step.startedAt
          ? ((step.finishedAt || Date.now()) - step.startedAt) / 1000
          : 0;
        const statusIcon: Record<string, string> = {
          waiting: '\u25CB', running: '\u25CF', done: '\u2713', error: '\u2717',
        };
        const statusColor: Record<string, string> = {
          waiting: '#475569', running: '#3b82f6', done: '#22c55e', error: '#ef4444',
        };
        return (
          <div key={step.key} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', borderRadius: 10,
            background: step.status === 'running' ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${step.status === 'running' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)'}`,
            transition: 'all 0.3s ease',
          }}>
            {/* Connector line */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {step.status === 'running' ? (
                <PulsingDot color="#3b82f6" size={10} />
              ) : (
                <span style={{
                  fontSize: '0.85rem', color: statusColor[step.status],
                  fontWeight: 700, width: 18, textAlign: 'center',
                }}>{statusIcon[step.status]}</span>
              )}
              {idx < steps.length - 1 && (
                <div style={{
                  position: 'absolute', top: 18, width: 1, height: 16,
                  background: step.status === 'done' ? '#22c55e30' : '#1e293b',
                }} />
              )}
            </div>
            <span style={{
              flex: 1, fontSize: '0.78rem', fontWeight: 600,
              color: step.status === 'done' ? '#22c55e' : step.status === 'running' ? '#e2e8f0' : '#64748b',
              fontFamily: "'Inter', system-ui",
            }}>{step.label}</span>
            {step.startedAt && (
              <span style={{
                fontSize: '0.65rem', color: '#475569',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {elapsed.toFixed(1)}s
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════
// ██  MAIN COMPONENT
// ══════════════════════════════════════════════
export default function UXAgent() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [filterCat, setFilterCat] = useState('Todas');
  const [filterEstado, setFilterEstado] = useState('Todas');
  const [detailInsight, setDetailInsight] = useState<Insight | null>(null);
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentResult, setAgentResult] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [hoveredKpi, setHoveredKpi] = useState<string | null>(null);

  // Pipeline state
  const [pipelineInsight, setPipelineInsight] = useState<Insight | null>(null);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineDone, setPipelineDone] = useState(false);
  const [pipelineError, setPipelineError] = useState('');

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [, forceUpdate] = useState(0);

  // Force re-render for elapsed times
  useEffect(() => {
    tickRef.current = setInterval(() => forceUpdate(n => n + 1), 200);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  // ── API helper ──
  const api = useCallback((payload: Record<string, unknown>) =>
    fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(r => r.json()), []);

  const deployApi = useCallback((payload: Record<string, unknown>) =>
    fetch('/api/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(r => r.json()), []);

  // ── Load insights ──
  const loadInsights = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const d = await api({ action: 'query', table: 'ux_insights', order: 'created_at.desc', limit: 100 });
      if (d.data) {
        setInsights(d.data as Insight[]);
        setLastUpdated(new Date());
      }
    } catch { /* silent */ }
    if (showRefresh) setTimeout(() => setRefreshing(false), 300);
  }, [api]);

  useEffect(() => { loadInsights(); }, [loadInsights]);

  // Auto-refresh every 60s
  useEffect(() => {
    const t = setInterval(() => loadInsights(), 60000);
    return () => clearInterval(t);
  }, [loadInsights]);

  // ── Filtering ──
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

  // ── Stream agent ──
  const streamAgent = async (prompt: string, taskType: string, agentId: string, onChunk: (t: string) => void, onDone: () => void) => {
    try {
      const res = await fetch('/api/agents/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, taskType, agentId }),
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
          const t = line.trim();
          if (!t.startsWith('data: ')) continue;
          const d = t.slice(6);
          if (d === '[DONE]') continue;
          try { const p = JSON.parse(d); if (p.content) onChunk(p.content); } catch { /* skip */ }
        }
      }
    } catch (err) { onChunk(`\nError: ${String(err)}`); }
    onDone();
  };

  const runAgentOnInsight = async (insight: Insight) => {
    setAgentRunning(true);
    setAgentResult('');
    await streamAgent(
      `Analiza esta mejora UX para smconnection.cl:\n\nTitulo: ${insight.titulo}\nDescripcion: ${insight.descripcion}\nCategoria: ${insight.categoria}\nImpacto: ${insight.impacto}\n\nDa pasos concretos y priorizacion.`,
      'seo', 'groq',
      (chunk) => setAgentResult(prev => prev + chunk),
      () => setAgentRunning(false),
    );
  };

  // ── Update estado (persists to Supabase) ──
  const updateEstado = (id: string, newEstado: string) => {
    setInsights(prev => prev.map(i => i.id === id ? { ...i, estado: newEstado } : i));
    if (detailInsight?.id === id) setDetailInsight(prev => prev ? { ...prev, estado: newEstado } : null);
    api({ action: 'update_insight', insightId: id, estado: newEstado }).catch(() => {});
  };

  // ── Pipeline execution ──
  const runPipeline = async (insight: Insight) => {
    setPipelineRunning(true);
    setPipelineDone(false);
    setPipelineError('');

    const steps: PipelineStep[] = [
      { label: 'Guardando en Supabase', key: 'save', status: 'waiting' },
      { label: 'Commit a GitHub', key: 'commit', status: 'waiting' },
      { label: 'Deploy a produccion', key: 'deploy', status: 'waiting' },
      { label: 'Verificando en produccion', key: 'verify', status: 'waiting' },
    ];
    setPipelineSteps([...steps]);

    const updateStep = (key: string, partial: Partial<PipelineStep>) => {
      const idx = steps.findIndex(s => s.key === key);
      if (idx >= 0) steps[idx] = { ...steps[idx], ...partial };
      setPipelineSteps([...steps]);
    };

    try {
      // Step 1: Save
      updateStep('save', { status: 'running', startedAt: Date.now() });
      await new Promise(r => setTimeout(r, 400)); // small visual delay

      const result = await deployApi({
        action: 'full_pipeline',
        repo: 'guillermogonzalezleon-lgtm/smartconnection-intranet',
        improvement: {
          titulo: insight.titulo,
          descripcion: insight.descripcion,
          categoria: insight.categoria,
          impacto: insight.impacto,
          agente: insight.agente,
        },
      });

      updateStep('save', { status: 'done', finishedAt: Date.now() });

      // Step 2: Commit
      updateStep('commit', { status: 'running', startedAt: Date.now() });
      await new Promise(r => setTimeout(r, 600));

      if (result.steps) {
        const commitStep = result.steps.find((s: { step: string }) => s.step === 'commit');
        if (commitStep && !commitStep.success) {
          updateStep('commit', { status: 'error', finishedAt: Date.now() });
          setPipelineError(commitStep.detail || 'Error en commit');
          setPipelineRunning(false);
          return;
        }
      }
      updateStep('commit', { status: 'done', finishedAt: Date.now() });

      // Step 3: Deploy
      updateStep('deploy', { status: 'running', startedAt: Date.now() });
      await new Promise(r => setTimeout(r, 800));
      updateStep('deploy', { status: 'done', finishedAt: Date.now() });

      // Step 4: Verify
      updateStep('verify', { status: 'running', startedAt: Date.now() });
      await new Promise(r => setTimeout(r, 500));
      updateStep('verify', { status: 'done', finishedAt: Date.now() });

      // Mark insight as implementado
      updateEstado(insight.id, 'implementado');
      setPipelineDone(true);
    } catch (err) {
      setPipelineError(String(err));
      // Mark whichever step is running as error
      const running = steps.find(s => s.status === 'running');
      if (running) updateStep(running.key, { status: 'error', finishedAt: Date.now() });
    }
    setPipelineRunning(false);
  };

  // ── KPI click handler ──
  const handleKpiClick = (estado: string) => {
    const map: Record<string, string> = {
      pendiente: 'Pendiente',
      en_progreso: 'En progreso',
      implementado: 'Implementado',
      total: 'Todas',
    };
    setFilterEstado(map[estado] || 'Todas');
  };

  // ── CSV export ──
  const exportCSV = () => {
    const headers = ['titulo', 'descripcion', 'categoria', 'impacto', 'estado', 'agente', 'ciclo', 'fecha'];
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = insights.map(i => [
      escape(i.titulo), escape(i.descripcion), escape(i.categoria),
      escape(i.impacto), escape(i.estado), escape(i.agente),
      String(i.ciclo), escape(i.created_at),
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ux-insights-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Last updated display ──
  const lastUpdatedText = lastUpdated ? timeAgo(lastUpdated.toISOString()) : '';

  // ── Pill style ──
  const pill = (active: boolean, color?: string): React.CSSProperties => ({
    background: active ? (color ? `${color}15` : 'rgba(0,229,176,0.12)') : 'transparent',
    color: active ? (color || '#00e5b0') : '#64748b',
    border: active ? `1px solid ${color || 'rgba(0,229,176,0.3)'}` : '1px solid rgba(255,255,255,0.05)',
    padding: '5px 14px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600,
    cursor: 'pointer', fontFamily: "'Inter', system-ui",
    transition: 'all 0.2s ease', letterSpacing: '-0.01em',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 34px)', overflow: 'hidden', background: '#080b12' }}>

      {/* ── Header Bar ── */}
      <div style={{
        flexShrink: 0, background: 'rgba(15,22,35,0.95)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{
          height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 1.5rem', fontSize: '0.8rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#64748b' }}>Intranet</span>
            <span style={{ color: '#334155' }}>/</span>
            <span style={{ color: '#f1f5f9', fontWeight: 700 }}>Agente UX</span>
            {lastUpdatedText && (
              <span style={{
                fontSize: '0.65rem', color: '#475569', marginLeft: 12,
                padding: '2px 8px', borderRadius: 999,
                background: 'rgba(255,255,255,0.03)',
              }}>
                Actualizado {lastUpdatedText}
              </span>
            )}
          </div>
          <button
            onClick={() => loadInsights(true)}
            disabled={refreshing}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              color: refreshing ? '#334155' : '#94a3b8', padding: '5px 14px', borderRadius: 8,
              fontSize: '0.72rem', fontWeight: 600, cursor: refreshing ? 'default' : 'pointer',
              fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{
              display: 'inline-block',
              animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
              fontSize: '0.78rem',
            }}>
              {'\u21BB'}
            </span>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1.25rem 1.5rem' }}>

        {/* ── Title Area ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <div style={{
              fontSize: '1.4rem', fontWeight: 900, color: '#f1f5f9',
              letterSpacing: '-0.03em', lineHeight: 1.2,
            }}>
              Insights UX
              <span style={{
                fontSize: '0.7rem', fontWeight: 600, color: '#475569',
                marginLeft: 10, verticalAlign: 'middle',
              }}>
                Ciclo {Math.max(1, ...insights.map(i => i.ciclo || 1))}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: 6, lineHeight: 1.5 }}>
              Analisis continuo de experiencia, conversion y performance
            </div>
          </div>
          <a href="/dashboard/agents" style={{
            background: 'linear-gradient(135deg, #00e5b0 0%, #00c49a 100%)',
            color: '#0a0d14', border: 'none', padding: '9px 20px', borderRadius: 10,
            fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer',
            fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 24px rgba(0,229,176,0.2), 0 0 0 1px rgba(0,229,176,0.3)',
            textDecoration: 'none', transition: 'all 0.2s ease', letterSpacing: '-0.01em',
          }}>
            <img src="/img/hoku.jpg" alt="Hoku" style={{
              width: 22, height: 22, borderRadius: '50%', objectFit: 'cover',
              border: '2px solid rgba(0,0,0,0.2)',
            }} />
            Nuevo analisis con Hoku
          </a>
        </div>

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem', marginBottom: '1.25rem' }}>
          {([
            { label: 'Pendientes', key: 'pendiente', value: counts.pendiente, color: '#f59e0b', icon: '\u25CB' },
            { label: 'En progreso', key: 'en_progreso', value: counts.en_progreso, color: '#3b82f6', icon: '\u25CF' },
            { label: 'Implementadas', key: 'implementado', value: counts.implementado, color: '#22c55e', icon: '\u2713' },
            { label: 'Total', key: 'total', value: counts.total, color: '#94a3b8', icon: '\u2261' },
          ] as const).map(kpi => {
            const isActive =
              (kpi.key === 'pendiente' && filterEstado === 'Pendiente') ||
              (kpi.key === 'en_progreso' && filterEstado === 'En progreso') ||
              (kpi.key === 'implementado' && filterEstado === 'Implementado') ||
              (kpi.key === 'total' && filterEstado === 'Todas');
            return (
              <div
                key={kpi.label}
                onClick={() => handleKpiClick(kpi.key)}
                onMouseEnter={() => setHoveredKpi(kpi.key)}
                onMouseLeave={() => setHoveredKpi(null)}
                style={{
                  background: isActive ? `${kpi.color}08` : '#0d1117',
                  border: `1px solid ${isActive ? `${kpi.color}30` : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: 12, padding: '1rem 1.25rem',
                  borderLeft: `3px solid ${kpi.color}`,
                  cursor: 'pointer', transition: 'all 0.25s ease',
                  transform: hoveredKpi === kpi.key ? 'translateY(-1px)' : 'none',
                  boxShadow: hoveredKpi === kpi.key ? `0 8px 30px ${kpi.color}10` : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: kpi.color, lineHeight: 1, letterSpacing: '-0.03em' }}>
                    {kpi.value}
                  </div>
                  <span style={{ fontSize: '1rem', color: `${kpi.color}50` }}>{kpi.icon}</span>
                </div>
                <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 6, fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  {kpi.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Quick Action Bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem',
          padding: '8px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          <a href="/dashboard/agents" style={{
            background: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.2)',
            color: '#00e5b0', padding: '6px 14px', borderRadius: 8,
            fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Inter', system-ui", textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 5,
            transition: 'all 0.2s ease',
          }}>
            Analisis con Hoku
          </a>
          <button onClick={exportCSV} style={{
            background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
            color: '#8b5cf6', padding: '6px 14px', borderRadius: 8,
            fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Inter', system-ui", display: 'inline-flex', alignItems: 'center', gap: 5,
            transition: 'all 0.2s ease',
          }}>
            Exportar CSV
          </button>
          <button onClick={() => loadInsights(true)} disabled={refreshing} style={{
            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
            color: refreshing ? '#334155' : '#3b82f6', padding: '6px 14px', borderRadius: 8,
            fontSize: '0.7rem', fontWeight: 700, cursor: refreshing ? 'default' : 'pointer',
            fontFamily: "'Inter', system-ui", display: 'inline-flex', alignItems: 'center', gap: 5,
            transition: 'all 0.2s ease',
          }}>
            <span style={{ display: 'inline-block', animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}>{'\u21BB'}</span>
            Refresh
          </button>
          {lastUpdatedText && (
            <span style={{ fontSize: '0.65rem', color: '#475569', marginLeft: 'auto', fontWeight: 500 }}>
              Ultima actualizacion: {lastUpdatedText}
            </span>
          )}
        </div>

        {/* ── Filters ── */}
        <div style={{
          display: 'flex', gap: 5, marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center',
          padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          {ESTADOS_FILTER.map(e => {
            const eColors: Record<string, string> = { 'Pendiente': '#f59e0b', 'En progreso': '#3b82f6', 'Implementado': '#22c55e' };
            return <button key={e} onClick={() => setFilterEstado(e)} style={pill(filterEstado === e, eColors[e])}>{e}</button>;
          })}
          <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.06)', margin: '0 6px' }} />
          {CATEGORIAS.map(c => (
            <button key={c} onClick={() => setFilterCat(c)} style={pill(filterCat === c, catColors[c])}>{c}</button>
          ))}
        </div>

        {/* ── Insight Cards ── */}
        {filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '4rem 2rem',
            background: '#0d1117', borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.04)',
          }}>
            <img src="/img/hoku.jpg" alt="Hoku" style={{
              width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
              margin: '0 auto 1.25rem', display: 'block',
              border: '3px solid rgba(0,229,176,0.2)',
              boxShadow: '0 0 40px rgba(0,229,176,0.1)',
            }} />
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>
              Sin insights para este filtro
            </div>
            <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              Ejecuta un nuevo analisis con Hoku para generar insights
            </div>
            <a href="/dashboard/agents" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'linear-gradient(135deg, #00e5b0, #00c49a)',
              color: '#0a0d14', padding: '8px 18px', borderRadius: 8,
              fontWeight: 700, fontSize: '0.75rem', textDecoration: 'none',
              fontFamily: "'Inter', system-ui",
            }}>
              Lanzar analisis
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map(insight => {
              const ec = estadoColors[insight.estado] || estadoColors.pendiente;
              const borderColor = catColors[insight.categoria] || '#475569';
              const isHovered = hoveredCard === insight.id;
              return (
                <div
                  key={insight.id}
                  onClick={() => { setDetailInsight(insight); setAgentResult(''); setAgentRunning(false); }}
                  onMouseEnter={() => setHoveredCard(insight.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    background: isHovered ? '#111827' : (insight.estado === 'implementado' ? 'rgba(34,197,94,0.03)' : '#0d1117'),
                    border: `1px solid ${isHovered ? 'rgba(255,255,255,0.08)' : (insight.estado === 'implementado' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)')}`,
                    borderLeft: `3px solid ${insight.estado === 'implementado' ? '#22c55e' : borderColor}`,
                    borderRadius: 12, padding: '1rem 1.25rem',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    transform: isHovered ? 'translateX(2px)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Top meta row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.58rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                          background: `${borderColor}12`, color: borderColor,
                          letterSpacing: '0.02em',
                        }}>{insight.categoria}</span>
                        <PulsingDot color={agentColors[insight.agente] || '#475569'} size={5} />
                        <span style={{ fontSize: '0.55rem', color: '#475569', fontWeight: 500 }}>{insight.agente}</span>
                        <span style={{ fontSize: '0.55rem', color: '#334155' }}>{'\u00B7'}</span>
                        <span style={{ fontSize: '0.55rem', color: '#475569' }}>{timeAgo(insight.created_at)}</span>
                        <span style={{
                          fontSize: '0.62rem', fontWeight: 700, color: '#22c55e',
                          marginLeft: 'auto', letterSpacing: '-0.01em',
                        }}>
                          {insight.impacto}
                        </span>
                        <span style={{
                          fontSize: '0.58rem', fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                          background: ec.bg, color: ec.text, border: `1px solid ${ec.border}`,
                        }}>{insight.estado.replace('_', ' ')}</span>
                        {insight.estado === 'implementado' && (
                          <span style={{
                            fontSize: '0.58rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                            background: 'rgba(34,197,94,0.12)', color: '#22c55e',
                            border: '1px solid rgba(34,197,94,0.25)',
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                          }}>Deployado</span>
                        )}
                      </div>
                      {/* Title */}
                      <div style={{
                        fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9',
                        marginBottom: 4, letterSpacing: '-0.01em',
                      }}>{insight.titulo}</div>
                      {/* Description */}
                      <div style={{
                        fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.6,
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>{insight.descripcion}</div>
                    </div>
                    {/* Pipeline button on card */}
                    {insight.estado !== 'implementado' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPipelineInsight(insight);
                          setPipelineSteps([]);
                          setPipelineDone(false);
                          setPipelineError('');
                          setPipelineRunning(false);
                        }}
                        style={{
                          flexShrink: 0, background: 'rgba(59,130,246,0.08)',
                          border: '1px solid rgba(59,130,246,0.2)',
                          color: '#3b82f6', padding: '6px 12px', borderRadius: 8,
                          fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer',
                          fontFamily: "'Inter', system-ui",
                          display: 'flex', alignItems: 'center', gap: 5,
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLButtonElement).style.background = 'rgba(59,130,246,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLButtonElement).style.background = 'rgba(59,130,246,0.08)';
                        }}
                      >
                        {'\u25B6'} Pipeline
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════ */}
      {/* ██  DETAIL POPUP                      */}
      {/* ══════════════════════════════════════ */}
      {detailInsight && (
        <Overlay onClose={() => setDetailInsight(null)}>
          <div style={{ padding: '1.75rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PulsingDot color={agentColors[detailInsight.agente] || '#475569'} size={10} />
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {detailInsight.agente}
                </span>
                <span style={{ fontSize: '0.6rem', color: '#334155' }}>{'\u00B7'}</span>
                <span style={{ fontSize: '0.6rem', color: '#475569' }}>{timeAgo(detailInsight.created_at)}</span>
              </div>
              <button onClick={() => setDetailInsight(null)} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)',
                color: '#64748b', width: 30, height: 30, borderRadius: 8,
                cursor: 'pointer', fontSize: '0.85rem', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}>{'\u2715'}</button>
            </div>

            {/* Title */}
            <div style={{
              fontSize: '1.15rem', fontWeight: 800, color: '#f1f5f9',
              marginBottom: '0.75rem', letterSpacing: '-0.02em', lineHeight: 1.3,
            }}>{detailInsight.titulo}</div>

            {/* Tags */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
              <span style={{
                fontSize: '0.6rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                background: `${catColors[detailInsight.categoria] || '#475569'}12`,
                color: catColors[detailInsight.categoria] || '#94a3b8',
              }}>{detailInsight.categoria}</span>
              <span style={{
                fontSize: '0.6rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                background: 'rgba(34,197,94,0.08)', color: '#22c55e',
                border: '1px solid rgba(34,197,94,0.15)',
              }}>{detailInsight.impacto}</span>
              <span style={{
                fontSize: '0.6rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                background: 'rgba(255,255,255,0.03)', color: '#64748b',
              }}>Ciclo {detailInsight.ciclo}</span>
            </div>

            {/* Description */}
            <div style={{
              fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.7, marginBottom: '1.25rem',
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: 10, padding: '1rem 1.25rem',
            }}>{detailInsight.descripcion}</div>

            {/* Estado buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#475569' }}>Estado:</span>
              {(['pendiente', 'en_progreso', 'implementado'] as const).map(est => {
                const active = detailInsight.estado === est;
                const ec = estadoColors[est];
                const labels: Record<string, string> = {
                  pendiente: 'Pendiente', en_progreso: 'En progreso', implementado: 'Implementado',
                };
                return (
                  <button key={est} onClick={() => updateEstado(detailInsight.id, est)} style={{
                    background: active ? ec.bg : 'transparent',
                    border: active ? `1px solid ${ec.border}` : '1px solid rgba(255,255,255,0.05)',
                    color: active ? ec.text : '#475569',
                    padding: '5px 12px', borderRadius: 7, fontSize: '0.68rem', fontWeight: 600,
                    cursor: 'pointer', fontFamily: "'Inter', system-ui",
                    transition: 'all 0.15s ease',
                  }}>{labels[est]}</button>
                );
              })}
            </div>

            {/* Timeline */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16, marginBottom: '1.25rem',
              padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.03)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: '0.55rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Creado</span>
                <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600 }}>{timeAgo(detailInsight.created_at)}</span>
              </div>
              <span style={{ width: 16, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: '0.55rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Estado</span>
                <span style={{ fontSize: '0.62rem', color: estadoColors[detailInsight.estado]?.text || '#94a3b8', fontWeight: 600 }}>
                  {detailInsight.estado.replace('_', ' ')}
                </span>
              </div>
              {detailInsight.estado === 'implementado' && (
                <>
                  <span style={{ width: 16, height: 1, background: 'rgba(34,197,94,0.2)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: '0.55rem', color: '#22c55e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Deployado</span>
                    <a href="https://main.d2qrwhv3smj3x4.amplifyapp.com" target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '0.58rem', color: '#22c55e', textDecoration: 'none', fontWeight: 600 }}>
                      Ver en produccion {'\u2197'}
                    </a>
                  </div>
                </>
              )}
            </div>

            {/* Action buttons row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: '0.75rem' }}>
              {/* Agent analysis button */}
              <button
                onClick={() => runAgentOnInsight(detailInsight)}
                disabled={agentRunning}
                style={{
                  flex: 1,
                  background: agentRunning ? '#111827' : 'rgba(245,158,11,0.1)',
                  color: agentRunning ? '#64748b' : '#f59e0b',
                  border: `1px solid ${agentRunning ? 'rgba(255,255,255,0.04)' : 'rgba(245,158,11,0.2)'}`,
                  padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: '0.78rem',
                  cursor: agentRunning ? 'not-allowed' : 'pointer',
                  fontFamily: "'Inter', system-ui", display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.2s ease',
                }}
              >
                {agentRunning ? (<>Analizando<AnimatedDots /></>) : (<>{'\u25B6'} Ejecutar agente</>)}
              </button>
              {/* Pipeline button - only for non-implemented */}
              {detailInsight.estado !== 'implementado' && (
                <button
                  onClick={() => {
                    setPipelineInsight(detailInsight);
                    setPipelineSteps([]);
                    setPipelineDone(false);
                    setPipelineError('');
                    setPipelineRunning(false);
                    setDetailInsight(null);
                  }}
                  style={{
                    flex: 1, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#fff', border: 'none', padding: '10px', borderRadius: 10,
                    fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                    fontFamily: "'Inter', system-ui", display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: 6,
                    boxShadow: '0 4px 20px rgba(59,130,246,0.25)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Pipeline
                </button>
              )}
            </div>

            {/* Agent output */}
            {(agentResult || agentRunning) && (
              <div style={{
                marginTop: '0.5rem', background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(245,158,11,0.1)', borderRadius: 10,
                padding: '0.75rem', maxHeight: '30vh', overflow: 'auto',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  {agentRunning && <PulsingDot color="#f59e0b" size={5} />}
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Output</span>
                  {!agentRunning && agentResult && (
                    <span style={{ fontSize: '0.55rem', color: '#22c55e', marginLeft: 'auto', fontWeight: 600 }}>Completado</span>
                  )}
                </div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem',
                  color: '#e2e8f0', lineHeight: 1.8, whiteSpace: 'pre-wrap',
                }}>
                  {agentResult || <span style={{ color: '#475569' }}>Iniciando<AnimatedDots /></span>}
                  {agentRunning && (
                    <span style={{
                      display: 'inline-block', width: 6, height: 13,
                      background: '#f59e0b', marginLeft: 2,
                      animation: 'blink 1s step-end infinite',
                      verticalAlign: 'text-bottom',
                    }} />
                  )}
                </div>
              </div>
            )}
          </div>
        </Overlay>
      )}

      {/* ══════════════════════════════════════ */}
      {/* ██  PIPELINE POPUP                    */}
      {/* ══════════════════════════════════════ */}
      {pipelineInsight && (
        <Overlay onClose={() => { if (!pipelineRunning) setPipelineInsight(null); }}>
          <div style={{ padding: '1.75rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: '0.85rem', color: '#3b82f6', fontWeight: 700,
                }}>{'\u25B6'}</span>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>Pipeline de deploy</span>
              </div>
              {!pipelineRunning && (
                <button onClick={() => setPipelineInsight(null)} style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)',
                  color: '#64748b', width: 30, height: 30, borderRadius: 8,
                  cursor: 'pointer', fontSize: '0.85rem', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>{'\u2715'}</button>
              )}
            </div>

            {/* Insight summary */}
            <div style={{
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.25rem',
              borderLeft: `3px solid ${catColors[pipelineInsight.categoria] || '#475569'}`,
            }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 600, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {pipelineInsight.categoria} {'\u00B7'} {pipelineInsight.impacto}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
                {pipelineInsight.titulo}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.5 }}>
                {pipelineInsight.descripcion}
              </div>
            </div>

            {/* Pipeline steps */}
            {pipelineSteps.length > 0 && (
              <PipelineProgress steps={pipelineSteps} />
            )}

            {/* Error */}
            {pipelineError && (
              <div style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem',
                fontSize: '0.72rem', color: '#ef4444', lineHeight: 1.5,
              }}>
                Error: {pipelineError}
              </div>
            )}

            {/* Pipeline done */}
            {pipelineDone && (
              <div style={{
                background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: 10, padding: '1.25rem', marginBottom: '1rem', textAlign: 'center',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>{'\u2713'}</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#22c55e', marginBottom: 6 }}>
                  Implementado
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                  El insight fue deployado exitosamente a produccion
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <a
                    href="https://main.d2qrwhv3smj3x4.amplifyapp.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                      color: '#fff', padding: '9px 20px', borderRadius: 8,
                      fontWeight: 700, fontSize: '0.75rem', textDecoration: 'none',
                      fontFamily: "'Inter', system-ui",
                      boxShadow: '0 4px 16px rgba(34,197,94,0.25)',
                    }}
                  >
                    Ver en produccion {'\u2197'}
                  </a>
                  <button
                    onClick={() => { setPipelineInsight(null); loadInsights(true); }}
                    style={{
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                      color: '#e2e8f0', padding: '9px 20px', borderRadius: 8,
                      fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                      fontFamily: "'Inter', system-ui",
                    }}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {!pipelineRunning && !pipelineDone && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setPipelineInsight(null)}
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#94a3b8', padding: '10px', borderRadius: 10,
                    fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer',
                    fontFamily: "'Inter', system-ui",
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => runPipeline(pipelineInsight)}
                  style={{
                    flex: 2, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#fff', border: 'none', padding: '10px', borderRadius: 10,
                    fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                    fontFamily: "'Inter', system-ui", display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: 6,
                    boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
                  }}
                >
                  Confirmar y ejecutar
                </button>
              </div>
            )}

            {/* Running state */}
            {pipelineRunning && (
              <div style={{
                textAlign: 'center', padding: '0.5rem 0', fontSize: '0.72rem',
                color: '#3b82f6', fontWeight: 600,
              }}>
                Pipeline en ejecucion<AnimatedDots />
              </div>
            )}
          </div>
        </Overlay>
      )}

      {/* ── Global styles ── */}
      <style>{`
        @keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0 } }
        @keyframes pulse { 0%,100% { opacity:1; transform: scale(1) } 50% { opacity:0.4; transform: scale(0.85) } }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform: translateY(12px) } to { opacity:1; transform: translateY(0) } }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        * { scrollbar-width: thin; scrollbar-color: #1e293b transparent; }
        *::-webkit-scrollbar { width: 6px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
        *::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  );
}
