'use client';
import { useEffect, useState, useCallback, useRef } from 'react';

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
const catColors: Record<string, string> = { 'Conversión': '#ef4444', SEO: '#8b5cf6', Contenido: '#f59e0b', Navegación: '#3b82f6', WhatsApp: '#22c55e', i18n: '#00e5b0', Checkout: '#f97316' };

const AGENTS = [
  { id: 'hoku', name: 'Hoku', model: 'fusión 4 agentes', color: '#ff6b6b', role: 'Síntesis — ejecuta los 4 agentes y combina lo mejor', special: true },
  { id: 'groq', name: 'Groq', model: 'llama-3.3-70b', color: '#f59e0b', role: 'Inferencia ultra rápida' },
  { id: 'claude', name: 'Claude', model: 'claude-sonnet-4-5', color: '#00e5b0', role: 'Desarrollo & Code Review' },
  { id: 'gemini', name: 'Gemini', model: 'gemini-2.0-flash', color: '#22c55e', role: 'SEO & Analytics' },
  { id: 'grok', name: 'Grok', model: 'grok-3', color: '#8b5cf6', role: 'Análisis & Research' },
];

const PLACEHOLDERS: Record<string, string> = {
  hoku: 'Analiza smconnection.cl desde todos los ángulos: código, SEO, UX, mercado...',
  groq: 'Analiza UX del sitio smconnection.cl...',
  claude: 'Revisa el código y sugiere mejoras de rendimiento...',
  gemini: 'Genera mejoras SEO para la landing page...',
  grok: 'Investiga tendencias de conversión en SaaS B2B...',
};

function AnimatedDots() {
  const [dots, setDots] = useState('');
  useEffect(() => { const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400); return () => clearInterval(t); }, []);
  return <span>{dots}</span>;
}

/* ── Overlay ─────────────────────────────────────────── */
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0f1623', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, width: '100%', maxWidth: 620, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
export default function UXAgent() {
  // Tab state — check URL param and sessionStorage for connector context
  const [tab, setTab] = useState<'insights' | 'workspace'>('insights');
  const [fromConnector, setFromConnector] = useState<string | null>(null);

  useEffect(() => {
    // Check if coming from Labs with tab=workspace
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'workspace') setTab('workspace');
    // Check connector context
    try {
      const c = sessionStorage.getItem('labs-connector');
      if (c) { setFromConnector(c); sessionStorage.removeItem('labs-connector'); }
    } catch {}
  }, []);

  // Insights state
  const [insights, setInsights] = useState<Insight[]>([]);
  const [filterCat, setFilterCat] = useState('Todas');
  const [filterEstado, setFilterEstado] = useState('Todas');
  const [detailInsight, setDetailInsight] = useState<Insight | null>(null);
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentResult, setAgentResult] = useState('');

  // Workspace state
  const [selectedAgent, setSelectedAgent] = useState('groq');
  const [task, setTask] = useState('');
  const [output, setOutput] = useState('');
  const [wsRunning, setWsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [tokens, setTokens] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Pipeline state
  type PipelineStep = 'idle' | 'confirm' | 'pushing' | 'deploying' | 'done' | 'error';
  const [pipeline, setPipeline] = useState<PipelineStep>('idle');
  const [pipelineLog, setPipelineLog] = useState<string[]>([]);

  const agent = AGENTS.find(a => a.id === selectedAgent) || AGENTS[0];

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

  /* ── Stream helper ───────────────────────────── */
  const streamAgent = async (prompt: string, taskType: string, agentId: string, onChunk: (t: string) => void, onDone: () => void) => {
    try {
      const res = await fetch('/api/agents/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, taskType, agentId }) });
      if (!res.ok || !res.body) { onChunk(`Error: ${res.status}`); onDone(); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;
          try { const p = JSON.parse(data); if (p.content) onChunk(p.content); } catch {}
        }
      }
    } catch (err) { onChunk(`\nError: ${String(err)}`); }
    onDone();
  };

  /* ── Workspace execute ───────────────────────── */
  const executeWorkspace = useCallback(async () => {
    if (!task.trim() || wsRunning) return;
    setWsRunning(true); setOutput(''); setElapsed(0); setTokens(0);
    const start = Date.now();
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 100);
    window.dispatchEvent(new CustomEvent('exec-agent', { detail: { agent: selectedAgent, prompt: task, taskType: 'general' } }));
    let tokenCount = 0;
    await streamAgent(task, 'general', selectedAgent,
      (chunk) => { setOutput(prev => prev + chunk); tokenCount += chunk.split(/\s+/).length; setTokens(tokenCount); },
      () => { if (timerRef.current) clearInterval(timerRef.current); setWsRunning(false); },
    );
  }, [task, selectedAgent, wsRunning]);

  /* ── Insight agent run ───────────────────────── */
  const runAgentOnInsight = async (insight: Insight) => {
    setAgentRunning(true); setAgentResult('');
    await streamAgent(
      `Analiza esta mejora UX para smconnection.cl:\n\nTítulo: ${insight.titulo}\nDescripción: ${insight.descripcion}\nCategoría: ${insight.categoria}\nImpacto: ${insight.impacto}\n\nDa pasos concretos y priorización.`,
      'seo', 'groq',
      (chunk) => setAgentResult(prev => prev + chunk),
      () => setAgentRunning(false),
    );
  };

  const updateEstado = (id: string, newEstado: string) => {
    setInsights(prev => prev.map(i => i.id === id ? { ...i, estado: newEstado } : i));
    if (detailInsight?.id === id) setDetailInsight(prev => prev ? { ...prev, estado: newEstado } : null);
  };

  useEffect(() => { if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight; }, [output]);

  /* ── Pipeline: Save → Commit → Deploy → Redirect ──── */
  const deployApi = (payload: Record<string, unknown>) =>
    fetch('/api/deploy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json());

  const [targetRepo, setTargetRepo] = useState('smartconnection-astro');
  const repos = [
    { id: 'smartconnection-astro', label: 'Astro (Vercel)', repo: 'guillermogonzalezleon-lgtm/smartconnection-astro', url: 'https://www.smconnection.cl' },
    { id: 'smartconnection-intranet', label: 'Intranet (AWS)', repo: 'guillermogonzalezleon-lgtm/smartconnection-intranet', url: 'https://intranet.smconnection.cl' },
  ];

  const startPipeline = () => {
    setPipeline('confirm');
    setPipelineLog([]);
  };

  const runPipeline = async () => {
    const target = repos.find(r => r.id === targetRepo) || repos[0];
    setPipeline('pushing');
    setPipelineLog([`Pipeline → ${target.label}`, '']);

    // Step 1: Save improvement to Supabase
    setPipelineLog(prev => [...prev, '📤 Guardando mejora en Supabase...']);
    try {
      // Extract title from first line of output
      const firstLine = output.split('\n').find(l => l.trim().length > 10) || 'Mejora generada por IA';
      const titulo = firstLine.replace(/^\*\*|^\d+\.\s*|\*\*$/g, '').trim().slice(0, 100);
      await deployApi({
        action: 'save_improvement',
        titulo,
        descripcion: output.slice(0, 500),
        categoria: 'UX',
        impacto: 'Por evaluar',
        agente: selectedAgent,
        ciclo: Math.max(1, ...insights.map(i => i.ciclo || 1)) + 1,
      });
      setPipelineLog(prev => [...prev, `✅ Insight guardado: "${titulo.slice(0, 50)}..."`]);
    } catch (err) {
      setPipelineLog(prev => [...prev, `⚠️ Error guardando: ${String(err)}`]);
    }

    // Step 2: Commit to GitHub
    setPipeline('deploying');
    setPipelineLog(prev => [...prev, '', `🔗 Conectando con GitHub (${target.repo})...`]);
    try {
      // Create a changelog file with the improvement
      const date = new Date().toISOString().split('T')[0];
      const changelogContent = `# Mejora UX — ${date}\n\n**Agente:** ${selectedAgent}\n**Tarea:** ${task}\n\n## Output del agente\n\n${output}\n\n---\n*Generado automáticamente desde intranet.smconnection.cl*\n`;

      const commitResult = await deployApi({
        action: 'commit_file',
        repo: target.repo,
        path: `docs/improvements/${date}-${selectedAgent}-${Date.now()}.md`,
        content: changelogContent,
        message: `feat(ux): mejora automática via ${selectedAgent} — ${task.slice(0, 50)}`,
      });

      if (commitResult.success) {
        setPipelineLog(prev => [...prev, `✅ Committed a ${target.repo} (main)`]);
      } else {
        setPipelineLog(prev => [...prev, `❌ Error commit: ${commitResult.error}`]);
        setPipeline('error');
        return;
      }
    } catch (err) {
      setPipelineLog(prev => [...prev, `❌ Error GitHub: ${String(err)}`]);
      setPipeline('error');
      return;
    }

    // Step 3: Deploy triggered automatically (push to main = auto-deploy)
    setPipelineLog(prev => [...prev, '', '🚀 Push a main detectado — auto-deploy iniciado...']);
    await new Promise(r => setTimeout(r, 1000));
    setPipelineLog(prev => [...prev, `📡 ${target.id === 'smartconnection-astro' ? 'Vercel' : 'AWS Amplify'} build en progreso...`]);
    await new Promise(r => setTimeout(r, 1500));
    setPipelineLog(prev => [...prev, `✅ Deploy completado → ${target.url}`]);

    // Done
    setPipeline('done');
    setPipelineLog(prev => [...prev, '', `🎯 Pipeline completo — redirigiendo a Insights...`]);

    setTimeout(() => {
      loadInsights();
      setTab('insights');
      setPipeline('idle');
      setPipelineLog([]);
    }, 3000);
  };

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
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
      {/* ── Header + Tabs ──────────────────────────────── */}
      <div style={{ flexShrink: 0, background: 'rgba(15,22,35,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ height: 48, display: 'flex', alignItems: 'center', padding: '0 1.5rem', fontSize: '0.82rem', color: '#94a3b8' }}>
          <span>Intranet</span><span style={{ margin: '0 8px', color: '#475569' }}>/</span><span style={{ color: '#fff', fontWeight: 600 }}>Agente UX</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 0 }}>
            <button onClick={() => setTab('insights')} style={{ background: 'none', border: 'none', padding: '8px 16px', color: tab === 'insights' ? '#00e5b0' : '#64748b', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', borderBottom: tab === 'insights' ? '2px solid #00e5b0' : '2px solid transparent', fontFamily: "'Inter', system-ui" }}>Insights UX</button>
            <button onClick={() => setTab('workspace')} style={{ background: 'none', border: 'none', padding: '8px 16px', color: tab === 'workspace' ? '#00e5b0' : '#64748b', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', borderBottom: tab === 'workspace' ? '2px solid #00e5b0' : '2px solid transparent', fontFamily: "'Inter', system-ui" }}>Workspace Agentes</button>
          </div>
        </div>
      </div>

      {/* ═══ TAB: Insights UX ═══ */}
      {tab === 'insights' && (
        <div style={{ padding: '1.25rem 1.5rem', flex: 1, overflow: 'auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f1f5f9' }}>Insights UX — Ciclo {Math.max(1, ...insights.map(i => i.ciclo || 1))}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>Análisis continuo de experiencia y conversión</div>
            </div>
            <button onClick={() => { setTab('workspace'); setTask('Analiza el sitio smconnection.cl y genera 3 mejoras UX concretas para mejorar conversión, SEO y experiencia de usuario.'); }} style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)', color: '#0a0d14', border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 20px rgba(0,229,176,0.25)' }}>
              ⚡ Nuevo análisis
            </button>
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

          {/* Insight list */}
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
      )}

      {/* ═══ TAB: Workspace Agentes ═══ */}
      {tab === 'workspace' && (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left: Agent selector — compact */}
          <div style={{ width: 180, minWidth: 140, background: '#0a0d14', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 10px 6px' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Agentes</div>
            </div>
            <div style={{ padding: '0 6px', flex: 1, overflow: 'auto' }}>
              {AGENTS.map(a => {
                const isHoku = a.id === 'hoku';
                const selected = selectedAgent === a.id;
                return (
                  <div key={a.id} onClick={() => setSelectedAgent(a.id)} style={{
                    padding: '7px 8px', borderRadius: 8, marginBottom: isHoku ? 6 : 2, cursor: 'pointer',
                    background: isHoku
                      ? (selected ? 'linear-gradient(135deg, rgba(255,107,107,0.15), rgba(139,92,246,0.15))' : 'linear-gradient(135deg, rgba(255,107,107,0.06), rgba(139,92,246,0.06))')
                      : (selected ? `${a.color}10` : 'transparent'),
                    border: selected ? `1px solid ${a.color}40` : isHoku ? '1px solid rgba(255,107,107,0.15)' : '1px solid transparent',
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isHoku ? (
                        <span style={{ fontSize: '0.75rem' }}>🔥</span>
                      ) : (
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.color, boxShadow: selected ? `0 0 6px ${a.color}60` : 'none', flexShrink: 0 }}></span>
                      )}
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: selected ? a.color : '#e2e8f0' }}>{a.name}</span>
                      {isHoku && <span style={{ fontSize: '0.45rem', fontWeight: 800, padding: '1px 4px', borderRadius: 3, background: 'linear-gradient(135deg, #ff6b6b, #8b5cf6)', color: '#fff' }}>4in1</span>}
                    </div>
                    <div style={{ fontSize: '0.55rem', color: '#475569', marginTop: 2, fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.model}</div>
                  </div>
                );
              })}
            </div>
            {/* Quick tip */}
            <div style={{ padding: '6px 10px', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: '0.55rem', color: '#334155' }}>
              Enter = ejecutar
            </div>
          </div>

          {/* Center: Task + Output */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 300, overflow: 'hidden' }}>
            {/* Topbar */}
            <div style={{ height: 42, minHeight: 42, display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0a0d14' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: agent.color }}></span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9' }}>{agent.name}</span>
              <span style={{ fontSize: '0.6rem', color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>{agent.model}</span>
              <div style={{ flex: 1 }}></div>
              <button onClick={executeWorkspace} disabled={wsRunning || !task.trim()} style={{
                background: wsRunning ? '#1a2235' : `linear-gradient(135deg, ${agent.color}, ${agent.color}cc)`,
                color: wsRunning ? '#64748b' : '#0a0d14', border: 'none',
                padding: '5px 14px', borderRadius: 7, fontWeight: 700, fontSize: '0.7rem',
                cursor: wsRunning ? 'not-allowed' : 'pointer', fontFamily: "'Inter', system-ui",
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {wsRunning ? <><span style={{ width: 8, height: 8, border: '2px solid #475569', borderTopColor: agent.color, borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }}></span> {fmtTime(elapsed)}</> : <>▶ Run</>}
              </button>
              {wsRunning && <button onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setWsRunning(false); }} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '5px 10px', borderRadius: 7, fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>⏹</button>}
              {/* Pipeline button in topbar — always visible */}
              {!wsRunning && output && pipeline === 'idle' && (
                <>
                  <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }}></div>
                  <select value={targetRepo} onChange={e => setTargetRepo(e.target.value)} style={{ background: '#0a0d14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '4px 8px', color: '#94a3b8', fontSize: '0.62rem', fontFamily: "'Inter', system-ui", outline: 'none', cursor: 'pointer' }}>
                    {repos.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                  <button onClick={startPipeline} style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: 7, fontWeight: 700, fontSize: '0.65rem', cursor: 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 12px rgba(59,130,246,0.3)', whiteSpace: 'nowrap' }}>
                    🚀 Deploy
                  </button>
                </>
              )}
              {/* Pipeline running indicator in topbar */}
              {pipeline !== 'idle' && (
                <span style={{ fontSize: '0.62rem', fontWeight: 600, color: pipeline === 'done' ? '#22c55e' : pipeline === 'error' ? '#ef4444' : '#3b82f6', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {pipeline === 'done' ? '✅ Live' : pipeline === 'error' ? '❌ Error' : <><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', animation: 'pulse 1s infinite' }}></span> Deploying...</>}
                </span>
              )}
            </div>

            {/* Connector context banner */}
            {fromConnector && (
              <div style={{ padding: '8px 16px', background: 'rgba(0,229,176,0.06)', borderBottom: '1px solid rgba(0,229,176,0.1)', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.68rem' }}>
                <span style={{ color: '#00e5b0', fontWeight: 700 }}>🔗 Desde Labs:</span>
                <span style={{ color: '#94a3b8' }}>{fromConnector}</span>
                <span style={{ color: '#475569' }}>— Escribe qué quieres hacer con este conector</span>
                <button onClick={() => setFromConnector(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '0.7rem' }}>×</button>
              </div>
            )}

            {/* Task input */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <textarea value={task} onChange={e => setTask(e.target.value)} onKeyDown={e => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); executeWorkspace(); }
                if (e.key === 'Enter' && !e.shiftKey && !e.metaKey) { e.preventDefault(); executeWorkspace(); }
              }} placeholder={PLACEHOLDERS[selectedAgent] || 'Escribe tu tarea...'} rows={3} style={{
                width: '100%', background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', color: '#e2e8f0', fontSize: '0.8rem', fontFamily: "'Inter', system-ui", lineHeight: 1.6, resize: 'vertical', outline: 'none', minHeight: 70, maxHeight: 180,
              }} />
              <div style={{ fontSize: '0.58rem', color: '#334155', marginTop: 4 }}>Enter = ejecutar · Shift+Enter = nueva línea</div>
            </div>

            {/* Output */}
            <div ref={outputRef} style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>
              {!output && !wsRunning ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#1e293b' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: 10, opacity: 0.3 }}>⚡</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>Selecciona un agente y escribe tu tarea</div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '6px 10px', background: '#111827', borderRadius: 8, border: `1px solid ${agent.color}20` }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: wsRunning ? agent.color : '#22c55e', boxShadow: wsRunning ? `0 0 8px ${agent.color}` : '0 0 8px #22c55e', animation: wsRunning ? 'pulse 1.5s infinite' : 'none' }}></span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: agent.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{agent.name}</span>
                    <span style={{ fontSize: '0.6rem', color: '#475569', marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace" }}>{fmtTime(elapsed)} · ~{tokens} tok</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {output}
                    {wsRunning && <span style={{ display: 'inline-block', width: 7, height: 14, background: agent.color, marginLeft: 2, animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom' }}></span>}
                  </div>
                  {!wsRunning && output && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <button onClick={() => navigator.clipboard.writeText(output)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '4px 10px', color: '#64748b', fontSize: '0.65rem', cursor: 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 4 }}>📋 Copiar</button>
                      <button onClick={executeWorkspace} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '4px 10px', color: '#64748b', fontSize: '0.65rem', cursor: 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 4 }}>🔄 Re-ejecutar</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Pipeline Bar (sticky bottom) ── */}
            {!wsRunning && output && (
              <div style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                background: pipeline !== 'idle' ? '#0a0d14' : '#111827',
                padding: pipeline !== 'idle' ? '12px 16px' : '8px 16px',
                transition: 'all 0.3s',
              }}>
                {pipeline === 'idle' && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select value={targetRepo} onChange={e => setTargetRepo(e.target.value)} style={{ background: '#0a0d14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: '0.72rem', fontFamily: "'Inter', system-ui", outline: 'none', cursor: 'pointer', minWidth: 160 }}>
                      {repos.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                    <button onClick={startPipeline} style={{ flex: 1, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(59,130,246,0.3)' }}>
                      🚀 Aplicar cambios → Deploy
                    </button>
                  </div>
                )}

                {/* Confirmation step */}
                {pipeline === 'confirm' && (
                  <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '14px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>¿Aplicar estos cambios?</div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: 10 }}>
                      Se va a:<br/>
                      1. Guardar la mejora como insight en Supabase<br/>
                      2. Commit a <strong style={{ color: '#e2e8f0' }}>{repos.find(r => r.id === targetRepo)?.repo}</strong> (main)<br/>
                      3. Auto-deploy en {repos.find(r => r.id === targetRepo)?.label}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setPipeline('idle')} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', padding: '8px', borderRadius: 8, fontWeight: 600, fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>
                        Cancelar
                      </button>
                      <button onClick={runPipeline} style={{ flex: 2, background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', border: 'none', padding: '8px', borderRadius: 8, fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        ✅ Confirmar y ejecutar pipeline
                      </button>
                    </div>
                  </div>
                )}

                {pipeline !== 'idle' && (
                  <>
                    {/* Steps visual */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 10 }}>
                      {[
                        { key: 'pushing', label: 'Guardar', icon: '📤' },
                        { key: 'deploying', label: 'Deploy AWS', icon: '🚀' },
                        { key: 'done', label: 'Live', icon: '🎯' },
                      ].map((step, i) => {
                        const steps: PipelineStep[] = ['pushing', 'deploying', 'done'];
                        const currentIdx = steps.indexOf(pipeline);
                        const isActive = i === currentIdx;
                        const isDone = i < currentIdx || pipeline === 'done';
                        const isError = pipeline === 'error' && i === currentIdx;
                        const color = isError ? '#ef4444' : isDone ? '#22c55e' : isActive ? '#3b82f6' : '#334155';
                        return (
                          <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: isDone ? 'rgba(34,197,94,0.15)' : isActive ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                                border: `2px solid ${color}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: isDone ? '0.8rem' : '0.75rem', color,
                                transition: 'all 0.3s',
                              }}>
                                {isDone ? '✓' : isError ? '✗' : isActive ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, animation: 'pulse 1s infinite' }}></span> : step.icon}
                              </div>
                              <span style={{ fontSize: '0.58rem', fontWeight: 600, color, whiteSpace: 'nowrap' }}>{step.label}</span>
                            </div>
                            {i < 2 && (
                              <div style={{ flex: 1, height: 2, background: isDone ? '#22c55e' : 'rgba(255,255,255,0.06)', margin: '0 8px', marginBottom: 16, borderRadius: 1, transition: 'background 0.5s' }}></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Log */}
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.62rem', lineHeight: 1.6, maxHeight: 80, overflow: 'auto' }}>
                      {pipelineLog.map((line, i) => (
                        <div key={i} style={{ color: line.startsWith('✅') ? '#22c55e' : line.startsWith('❌') ? '#ef4444' : line.startsWith('🎯') ? '#3b82f6' : '#94a3b8' }}>{line}</div>
                      ))}
                      {(pipeline === 'pushing' || pipeline === 'deploying') && (
                        <span style={{ display: 'inline-block', width: 6, height: 12, background: '#3b82f6', animation: 'blink 1s step-end infinite' }}></span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ POPUP: Detalle insight ═══ */}
      {detailInsight && (
        <Overlay onClose={() => setDetailInsight(null)}>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: agentColors[detailInsight.agente] || '#475569', boxShadow: `0 0 8px ${agentColors[detailInsight.agente] || '#475569'}60` }}></div>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agente: {detailInsight.agente}</span>
              </div>
              <button onClick={() => setDetailInsight(null)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '0.75rem', lineHeight: 1.4 }}>{detailInsight.titulo}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: `${catColors[detailInsight.categoria] || '#475569'}15`, color: catColors[detailInsight.categoria] || '#94a3b8' }}>{detailInsight.categoria}</span>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>{detailInsight.impacto}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.7, marginBottom: '1rem', background: '#0a0d14', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, padding: '1rem' }}>
              {detailInsight.descripcion}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>Estado:</span>
              {(['pendiente', 'en_progreso', 'implementado'] as const).map(est => {
                const active = detailInsight.estado === est;
                const ec = estadoColors[est];
                const labels: Record<string, string> = { pendiente: '⏳ Pendiente', en_progreso: '🔄 En progreso', implementado: '✅ Implementado' };
                return <button key={est} onClick={() => updateEstado(detailInsight.id, est)} style={{ background: active ? ec.bg : 'transparent', border: active ? `1px solid ${ec.text}40` : '1px solid rgba(255,255,255,0.06)', color: active ? ec.text : '#64748b', padding: '5px 12px', borderRadius: 7, fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', system-ui", transition: 'all 0.15s' }}>{labels[est]}</button>;
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
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Output</span>
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
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0 } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
      `}</style>
    </div>
  );
}
