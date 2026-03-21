'use client';
import { useEffect, useState } from 'react';

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
const estadoColors: Record<string, { bg: string; text: string; dot: string }> = {
  pendiente: { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b', dot: '#f59e0b' },
  en_progreso: { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', dot: '#3b82f6' },
  implementado: { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', dot: '#22c55e' },
};
const catColors: Record<string, string> = { 'Conversión': '#ef4444', 'Conversion': '#ef4444', SEO: '#8b5cf6', Contenido: '#f59e0b', Navegación: '#3b82f6', Navegacion: '#3b82f6', WhatsApp: '#22c55e', i18n: '#00e5b0', Checkout: '#f97316' };

export default function UXAgent() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [filterCat, setFilterCat] = useState('Todas');
  const [filterEstado, setFilterEstado] = useState('Todas');
  const [analyzing, setAnalyzing] = useState(false);

  const api = (payload: Record<string, unknown>) =>
    fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json());

  const loadInsights = () => {
    api({ action: 'query', table: 'ux_insights', order: 'created_at.desc', limit: 100 })
      .then(d => { if (d.data) setInsights(d.data as Insight[]); })
      .catch(() => {});
  };

  useEffect(() => { loadInsights(); }, []);

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

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      await api({
        action: 'execute',
        agentId: 'claude',
        prompt: 'Analiza el sitio smconnection.cl y genera 3 mejoras UX concretas para mejorar conversión, SEO y experiencia. Para cada mejora incluye: título, descripción detallada, categoría (Conversión/SEO/Contenido/Navegación/WhatsApp), e impacto estimado. Responde en formato JSON array.',
        taskType: 'seo',
      });
      loadInsights();
    } catch { /* */ }
    setAnalyzing(false);
  };

  const updateEstado = (id: string, newEstado: string) => {
    setInsights(prev => prev.map(i => i.id === id ? { ...i, estado: newEstado } : i));
    // TODO: persist to Supabase
  };

  const s = {
    page: { padding: '2rem', flex: 1 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' },
    title: { fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, color: '#f1f5f9' },
    subtitle: { fontSize: '0.8rem', color: '#64748b', marginTop: 4 },
    analyzeBtn: { background: analyzing ? '#1a2235' : '#00e5b0', color: analyzing ? '#94a3b8' : '#0a0d14', border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: '0.8rem', cursor: analyzing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Inter', system-ui, sans-serif" },
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' },
    kpiCard: (color: string) => ({ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1.25rem', borderTop: `3px solid ${color}` }),
    kpiValue: (color: string) => ({ fontSize: '1.75rem', fontWeight: 900, color, lineHeight: 1 }),
    kpiLabel: { fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 },
    filters: { display: 'flex', gap: 6, marginBottom: '1.5rem', flexWrap: 'wrap' as const },
    filterBtn: (active: boolean) => ({ background: active ? 'rgba(0,229,176,0.15)' : 'transparent', color: active ? '#00e5b0' : '#94a3b8', border: active ? '1px solid rgba(0,229,176,0.3)' : '1px solid rgba(255,255,255,0.08)', padding: '6px 14px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }),
    card: (estado: string) => ({ background: '#111827', border: estado === 'en_progreso' ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem', marginBottom: '0.75rem', transition: 'all 0.2s' }),
    cardHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' as const },
    catBadge: (cat: string) => ({ fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: `${catColors[cat] || '#475569'}20`, color: catColors[cat] || '#94a3b8' }),
    cicloBadge: { fontSize: '0.6rem', fontWeight: 600, color: '#475569', marginLeft: 4 },
    impacto: { fontSize: '0.7rem', fontWeight: 600, color: '#22c55e', marginLeft: 'auto' },
    cardTitle: { fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 8 },
    cardDesc: { fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: 12 },
    estadoSelect: { background: '#1a2235', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 10px', fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", appearance: 'none' as const, paddingRight: 24, backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%2394a3b8\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' },
    agentDot: (agente: string) => ({ width: 8, height: 8, borderRadius: '50%', background: agentColors[agente] || '#475569', display: 'inline-block', marginRight: 4 }),
  };

  return (
    <>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(17,24,39,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', height: 56, display: 'flex', alignItems: 'center', padding: '0 2rem', fontSize: '0.85rem', color: '#94a3b8' }}>
        <span>Intranet</span><span style={{ margin: '0 8px', color: '#475569' }}>/</span><span style={{ color: '#fff', fontWeight: 600 }}>Agente UX</span>
      </div>
      <div style={s.page}>
        <div style={s.header}>
          <div>
            <div style={s.title}>⚡ Agente UX</div>
            <div style={s.subtitle}>Análisis continuo de experiencia y conversión — Ciclo {currentCiclo}</div>
          </div>
          <button onClick={runAnalysis} disabled={analyzing} style={s.analyzeBtn}>
            {analyzing ? <><i className="bi bi-hourglass-split"></i> Analizando...</> : <><i className="bi bi-lightning-charge"></i> Nuevo análisis</>}
          </button>
        </div>

        {/* KPIs */}
        <div style={s.kpiGrid}>
          <div style={s.kpiCard('#f59e0b')}><div style={s.kpiValue('#f59e0b')}>{counts.pendiente}</div><div style={s.kpiLabel}>Pendientes</div></div>
          <div style={s.kpiCard('#3b82f6')}><div style={s.kpiValue('#3b82f6')}>{counts.en_progreso}</div><div style={s.kpiLabel}>En progreso</div></div>
          <div style={s.kpiCard('#22c55e')}><div style={s.kpiValue('#22c55e')}>{counts.implementado}</div><div style={s.kpiLabel}>Implementadas</div></div>
          <div style={s.kpiCard('#f1f5f9')}><div style={s.kpiValue('#f1f5f9')}>{counts.total}</div><div style={s.kpiLabel}>Total mejoras</div></div>
        </div>

        {/* Filters - Estado */}
        <div style={s.filters}>
          {ESTADOS.map(e => (
            <button key={e} onClick={() => setFilterEstado(e)} style={s.filterBtn(filterEstado === e)}>{e}</button>
          ))}
          <span style={{ width: 1, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }}></span>
          {CATEGORIAS.map(c => (
            <button key={c} onClick={() => setFilterCat(c)} style={s.filterBtn(filterCat === c)}>{c}</button>
          ))}
        </div>

        {/* Insights List */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#475569' }}>
            <i className="bi bi-lightbulb" style={{ fontSize: '2rem', display: 'block', marginBottom: 8, opacity: 0.3 }}></i>
            <p style={{ fontSize: '0.8rem' }}>Sin insights para este filtro</p>
          </div>
        ) : filtered.map(insight => {
          const ec = estadoColors[insight.estado] || estadoColors.pendiente;
          return (
            <div key={insight.id} style={s.card(insight.estado)}>
              <div style={s.cardHeader}>
                <span style={s.agentDot(insight.agente)}></span>
                <span style={s.catBadge(insight.categoria)}>{insight.categoria}</span>
                <span style={s.cicloBadge}>Ciclo {insight.ciclo}</span>
                <span style={{ ...s.impacto, color: '#22c55e' }}>{insight.impacto}</span>
                <select
                  value={insight.estado}
                  onChange={e => updateEstado(insight.id, e.target.value)}
                  style={{ ...s.estadoSelect, color: ec.text, background: ec.bg }}
                >
                  <option value="pendiente">⏳ Pendiente</option>
                  <option value="en_progreso">🔄 En progreso</option>
                  <option value="implementado">✅ Implementado</option>
                </select>
              </div>
              <div style={s.cardTitle}>{insight.titulo}</div>
              <div style={s.cardDesc}>{insight.descripcion}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
