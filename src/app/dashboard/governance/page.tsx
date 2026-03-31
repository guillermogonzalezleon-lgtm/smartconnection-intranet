'use client';

import { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const PipelineDashboard = lazy(() => import('@/components/governance/PipelineDashboard'));
const AuditDashboard = lazy(() => import('@/components/governance/AuditDashboard'));
const IntegrationMapDashboard = lazy(() => import('@/components/governance/IntegrationMapDashboard'));
const InfraCostsDashboard = lazy(() => import('@/components/governance/InfraCostsDashboard'));
const BugTrackerDashboard = lazy(() => import('@/components/governance/BugTrackerDashboard'));
const CustomerOpsDashboard = lazy(() => import('@/components/governance/CustomerOpsDashboard'));
const SprintDashboard = lazy(() => import('@/components/governance/SprintDashboard'));
const TechRadarDashboard = lazy(() => import('@/components/governance/TechRadarDashboard'));
const DesignTokensDashboard = lazy(() => import('@/components/governance/DesignTokensDashboard'));
const ProvidersIaDashboard = lazy(() => import('@/components/governance/ProvidersIaDashboard'));

const DASHBOARD_COMPONENTS: Record<string, React.ReactNode> = {
  'pipeline-winloss': <PipelineDashboard />,
  'audit-report': <AuditDashboard />,
  'integration-map': <IntegrationMapDashboard />,
  'infra-deploy': <InfraCostsDashboard />,
  'test-report': <BugTrackerDashboard />,
  'customer-ops': <CustomerOpsDashboard />,
  'sprint-report': <SprintDashboard />,
  'tech-radar': <TechRadarDashboard />,
  'design-tokens': <DesignTokensDashboard />,
  'providers-ia': <ProvidersIaDashboard />,
};

interface GovernanceDoc {
  id: string;
  slug: string;
  title: string;
  icon: string;
  category: 'template' | 'guideline' | 'standard';
  format: 'slides' | 'doc' | 'dashboard' | 'sheet' | 'form';
  owner: string;
  ownerEmoji: string;
  status: 'active' | 'draft' | 'deprecated';
  version: string;
  description: string;
}

const AGENTS = [
  { key: 'all', label: 'Todos', emoji: '' },
  { key: 'PM', label: 'PM', emoji: '\uD83D\uDC54' },
  { key: 'Panchita', label: 'Panchita', emoji: '\uD83D\uDC15' },
  { key: 'Arielito', label: 'Arielito', emoji: '\uD83D\uDD0D' },
  { key: 'Hoku', label: 'Hoku', emoji: '\uD83D\uDC3E' },
  { key: 'ABAP', label: 'ABAP', emoji: '\uD83D\uDD27' },
  { key: 'Fiori', label: 'Fiori', emoji: '\uD83C\uDFA8' },
  { key: 'Integrador', label: 'Integrador', emoji: '\uD83D\uDD0C' },
  { key: 'Camilita', label: 'Camilita', emoji: '\uD83D\uDC69' },
  { key: 'Sergito', label: 'Sergito', emoji: '\u26A1' },
  { key: 'Comercial', label: 'Comercial', emoji: '\uD83D\uDCBC' },
  { key: 'Pipeline', label: 'Pipeline', emoji: '\uD83D\uDEE0\uFE0F' },
  { key: 'ClienteX', label: 'ClienteX', emoji: '\uD83C\uDFA7' },
];

const FALLBACK_DOCS: GovernanceDoc[] = [
  { id: '1', slug: 'project-charter', title: 'Project Charter', icon: '\uD83D\uDCCB', category: 'template', format: 'slides', owner: 'PM', ownerEmoji: '\uD83D\uDC54', status: 'active', version: 'v1.0', description: 'Carta de inicio de proyecto con objetivos, alcance y stakeholders' },
  { id: '2', slug: 'sprint-planning', title: 'Sprint Planning', icon: '\uD83C\uDFAF', category: 'template', format: 'sheet', owner: 'PM', ownerEmoji: '\uD83D\uDC54', status: 'active', version: 'v2.1', description: 'Template para planificacion de sprints con RICE scoring' },
  { id: '3', slug: 'weekly-report', title: 'Reporte Semanal', icon: '\uD83D\uDCCA', category: 'template', format: 'slides', owner: 'PM', ownerEmoji: '\uD83D\uDC54', status: 'active', version: 'v1.3', description: 'Reporte semanal con metricas AARRR y estado del sprint' },
  { id: '4', slug: 'benchmark-competitivo', title: 'Benchmark Competitivo', icon: '\uD83D\uDD0D', category: 'template', format: 'doc', owner: 'Panchita', ownerEmoji: '\uD83D\uDC15', status: 'active', version: 'v1.0', description: 'Analisis de 3-5 competidores con tabla comparativa' },
  { id: '5', slug: 'handoff-funcional', title: 'Handoff Funcional', icon: '\uD83D\uDCE6', category: 'template', format: 'doc', owner: 'Panchita', ownerEmoji: '\uD83D\uDC15', status: 'active', version: 'v2.0', description: 'Handoff de Panchita a equipo tecnico con specs completas' },
  { id: '6', slug: 'maqueta-html', title: 'Maqueta HTML', icon: '\uD83C\uDFA8', category: 'template', format: 'doc', owner: 'Panchita', ownerEmoji: '\uD83D\uDC15', status: 'active', version: 'v1.0', description: 'Template base para maquetas HTML autocontenidas' },
  { id: '7', slug: 'user-stories', title: 'User Stories', icon: '\uD83D\uDCDD', category: 'template', format: 'doc', owner: 'Panchita', ownerEmoji: '\uD83D\uDC15', status: 'active', version: 'v1.1', description: 'Template de historias de usuario con criterios de aceptacion' },
  { id: '8', slug: 'adr-template', title: 'ADR Template', icon: '\uD83D\uDCC4', category: 'template', format: 'doc', owner: 'Arielito', ownerEmoji: '\uD83D\uDD0D', status: 'active', version: 'v1.0', description: 'Architecture Decision Record para decisiones tecnicas' },
  { id: '9', slug: 'api-contract', title: 'API Contract', icon: '\uD83D\uDD17', category: 'template', format: 'doc', owner: 'Arielito', ownerEmoji: '\uD83D\uDD0D', status: 'active', version: 'v1.2', description: 'Contrato OpenAPI entre frontend y backend' },
  { id: '10', slug: 'tech-radar', title: 'Tech Radar', icon: '\uD83D\uDCE1', category: 'standard', format: 'dashboard', owner: 'Arielito', ownerEmoji: '\uD83D\uDD0D', status: 'active', version: 'v1.0', description: 'Radar tecnologico: adoptar, evaluar, mantener, deprecar' },
  { id: '11', slug: 'kaizen-report', title: 'Kaizen Report', icon: '\uD83D\uDD04', category: 'template', format: 'doc', owner: 'Arielito', ownerEmoji: '\uD83D\uDD0D', status: 'active', version: 'v1.0', description: 'Assessment 360 del sistema con scoring A-F' },
  { id: '12', slug: 'ai-feature-spec', title: 'AI Feature Spec', icon: '\uD83E\uDD16', category: 'template', format: 'doc', owner: 'Hoku', ownerEmoji: '\uD83D\uDC3E', status: 'active', version: 'v1.0', description: 'Especificacion de feature IA con guardrails y evals' },
  { id: '13', slug: 'eval-report', title: 'Eval Report', icon: '\uD83E\uddEA', category: 'template', format: 'doc', owner: 'Hoku', ownerEmoji: '\uD83D\uDC3E', status: 'active', version: 'v1.0', description: 'Reporte de evaluacion de prompts con metricas' },
  { id: '14', slug: 'prompt-library', title: 'Prompt Library', icon: '\uD83D\uDCDA', category: 'template', format: 'sheet', owner: 'Hoku', ownerEmoji: '\uD83D\uDC3E', status: 'active', version: 'v1.0', description: 'Biblioteca de prompts versionados por feature' },
  { id: '15', slug: 'bug-report', title: 'Bug Report', icon: '\uD83D\uDC1B', category: 'template', format: 'form', owner: 'Camilita', ownerEmoji: '\uD83D\uDC69', status: 'active', version: 'v1.0', description: 'Formulario de reporte de bugs con severidad y pasos' },
  { id: '16', slug: 'qa-checklist', title: 'QA Checklist', icon: '\u2705', category: 'template', format: 'sheet', owner: 'Camilita', ownerEmoji: '\uD83D\uDC69', status: 'active', version: 'v1.2', description: 'Checklist de QA por persona y area de testing' },
  { id: '17', slug: 'propuesta-comercial', title: 'Propuesta Comercial', icon: '\uD83D\uDCB0', category: 'template', format: 'slides', owner: 'Comercial', ownerEmoji: '\uD83D\uDCBC', status: 'active', version: 'v1.0', description: 'Template de propuesta con diagnostico, solucion e inversion' },
  { id: '18', slug: 'battle-card', title: 'Battle Card', icon: '\u2694\uFE0F', category: 'template', format: 'doc', owner: 'Comercial', ownerEmoji: '\uD83D\uDCBC', status: 'active', version: 'v1.0', description: 'Posicionamiento vs competidor especifico' },
  { id: '19', slug: 'integracion-catalog', title: 'Catalogo Integraciones', icon: '\uD83D\uDD0C', category: 'template', format: 'sheet', owner: 'Integrador', ownerEmoji: '\uD83D\uDD0C', status: 'active', version: 'v1.0', description: 'Inventario de APIs y providers con estado y rate limits' },
  { id: '32', slug: 'pipeline-winloss', title: 'Pipeline & Win/Loss', icon: '\uD83D\uDCCA', category: 'template', format: 'dashboard', owner: 'Comercial', ownerEmoji: '\uD83D\uDCBC', status: 'active', version: 'v1.0', description: 'Funnel de ventas, metricas de conversion y analisis win/loss' },
  { id: '33', slug: 'audit-report', title: 'Audit Report', icon: '\uD83D\uDCCA', category: 'template', format: 'dashboard', owner: 'Arielito', ownerEmoji: '\uD83D\uDD0D', status: 'active', version: 'v1.0', description: 'Scoring A-F por proyecto y area, deuda tecnica y risk heatmap' },
  { id: '34', slug: 'integration-map', title: 'Mapa de Integraciones', icon: '\uD83D\uDD0C', category: 'template', format: 'dashboard', owner: 'Integrador', ownerEmoji: '\uD83D\uDD0C', status: 'active', version: 'v1.0', description: 'Catalogo de APIs, providers y conectores con semaforo de estado' },
  { id: '35', slug: 'infra-deploy', title: 'Costos de Infra', icon: '\uD83D\uDCB0', category: 'template', format: 'dashboard', owner: 'Pipeline', ownerEmoji: '\uD83D\uDEE0\uFE0F', status: 'active', version: 'v1.0', description: 'Desglose mensual de costos AWS, Vercel y Supabase' },
  { id: '36', slug: 'test-report', title: 'Bug Tracker', icon: '\uD83D\uDC1B', category: 'template', format: 'dashboard', owner: 'Camilita', ownerEmoji: '\uD83D\uDC69', status: 'active', version: 'v1.0', description: 'Seguimiento de bugs por severidad, proyecto y estado' },
  { id: '37', slug: 'customer-ops', title: 'Customer Ops', icon: '\uD83C\uDFA7', category: 'template', format: 'dashboard', owner: 'ClienteX', ownerEmoji: '\uD83C\uDFA7', status: 'active', version: 'v1.0', description: 'Tickets de soporte, SLA y NPS de clientes' },
  { id: '38', slug: 'sprint-report', title: 'Sprint Dashboard', icon: '\uD83C\uDFAF', category: 'template', format: 'dashboard', owner: 'PM', ownerEmoji: '\uD83D\uDC54', status: 'active', version: 'v1.0', description: 'Sprint activo con tablero kanban, RICE scores y estado por agente' },
  { id: '39', slug: 'design-tokens', title: 'Design Tokens', icon: '\uD83C\uDFA8', category: 'standard', format: 'dashboard', owner: 'Fiori', ownerEmoji: '\uD83C\uDFA8', status: 'active', version: 'v1.0', description: 'Paleta, tipografia, spacing y tokens CSS del sistema de diseno' },
  { id: '40', slug: 'providers-ia', title: 'Providers IA', icon: '\uD83E\uDD16', category: 'standard', format: 'dashboard', owner: 'Integrador', ownerEmoji: '\uD83D\uDD0C', status: 'active', version: 'v1.0', description: 'Matriz de providers IA con costos, latencia y calidad por caso de uso' },
  { id: '20', slug: 'coding-standards', title: 'Coding Standards', icon: '\uD83D\uDCCF', category: 'standard', format: 'doc', owner: 'Arielito', ownerEmoji: '\uD83D\uDD0D', status: 'active', version: 'v2.0', description: 'Estandares de codigo TypeScript, naming, estructura' },
  { id: '21', slug: 'api-standards', title: 'API Standards', icon: '\uD83C\uDF10', category: 'standard', format: 'doc', owner: 'Arielito', ownerEmoji: '\uD83D\uDD0D', status: 'active', version: 'v1.1', description: 'Estandares REST: versionado, paginacion, errores' },
  { id: '22', slug: 'security-standards', title: 'Security Standards', icon: '\uD83D\uDD12', category: 'standard', format: 'doc', owner: 'Arielito', ownerEmoji: '\uD83D\uDD0D', status: 'active', version: 'v1.0', description: 'Headers, CORS, RLS, secrets, auth — todo proyecto' },
  { id: '23', slug: 'db-standards', title: 'DB Standards', icon: '\uD83D\uDDC4\uFE0F', category: 'standard', format: 'doc', owner: 'ABAP', ownerEmoji: '\uD83D\uDD27', status: 'active', version: 'v1.0', description: 'Naming, migrations, RLS, indices en Supabase' },
  { id: '24', slug: 'frontend-standards', title: 'Frontend Standards', icon: '\uD83D\uDDA5\uFE0F', category: 'standard', format: 'doc', owner: 'Fiori', ownerEmoji: '\uD83C\uDFA8', status: 'active', version: 'v1.0', description: 'Performance, accesibilidad, responsive, tokens CSS' },
  { id: '25', slug: 'ai-safety-standards', title: 'AI Safety Standards', icon: '\uD83D\uDEE1\uFE0F', category: 'standard', format: 'doc', owner: 'Hoku', ownerEmoji: '\uD83D\uDC3E', status: 'active', version: 'v1.0', description: 'Guardrails, PII, injection, hallucination prevention' },
  { id: '26', slug: 'deploy-standards', title: 'Deploy Standards', icon: '\uD83D\uDE80', category: 'standard', format: 'doc', owner: 'Pipeline', ownerEmoji: '\uD83D\uDEE0\uFE0F', status: 'active', version: 'v1.0', description: 'CI/CD, smoke tests, rollback, env vars' },
  { id: '27', slug: 'ux-guidelines', title: 'UX Guidelines', icon: '\uD83C\uDFA8', category: 'guideline', format: 'doc', owner: 'Panchita', ownerEmoji: '\uD83D\uDC15', status: 'active', version: 'v1.0', description: 'Principios UX: mobile-first, dark mode, glassmorphism' },
  { id: '28', slug: 'copy-guidelines', title: 'Copy & Microcopy', icon: '\u270D\uFE0F', category: 'guideline', format: 'doc', owner: 'Panchita', ownerEmoji: '\uD83D\uDC15', status: 'active', version: 'v1.0', description: 'Tono, mensajes error, estados vacios, CTAs' },
  { id: '29', slug: 'onboarding-guide', title: 'Onboarding Guide', icon: '\uD83D\uDC4B', category: 'guideline', format: 'doc', owner: 'ClienteX', ownerEmoji: '\uD83C\uDFA7', status: 'active', version: 'v1.0', description: 'Flujo de bienvenida y primeros pasos por producto' },
  { id: '30', slug: 'pricing-guidelines', title: 'Pricing Guidelines', icon: '\uD83D\uDCB5', category: 'guideline', format: 'doc', owner: 'Comercial', ownerEmoji: '\uD83D\uDCBC', status: 'active', version: 'v1.0', description: 'Estructura de precios, anclas, descuentos' },
  { id: '31', slug: 'innovation-playbook', title: 'Innovation Playbook', icon: '\uD83D\uDCA1', category: 'guideline', format: 'doc', owner: 'Sergito', ownerEmoji: '\u26A1', status: 'active', version: 'v1.0', description: 'TRIZ, SCAMPER, Blue Ocean, First Principles aplicados' },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  template: { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa', label: 'Template' },
  guideline: { bg: 'rgba(167,139,250,0.12)', text: '#a78bfa', label: 'Guideline' },
  standard: { bg: 'rgba(34,197,94,0.12)', text: '#4ade80', label: 'Standard' },
};

const FORMAT_LABELS: Record<string, { icon: string; label: string }> = {
  slides: { icon: '\uD83D\uDCCA', label: 'Slides' },
  doc: { icon: '\uD83D\uDCC4', label: 'Doc' },
  dashboard: { icon: '\uD83D\uDCBB', label: 'Dashboard' },
  sheet: { icon: '\uD83D\uDCC8', label: 'Sheet' },
  form: { icon: '\uD83D\uDCCB', label: 'Form' },
};

const STATUS_COLORS: Record<string, { dot: string; label: string }> = {
  active: { dot: '#22c55e', label: 'Activo' },
  draft: { dot: '#f59e0b', label: 'Borrador' },
  deprecated: { dot: '#ef4444', label: 'Deprecado' },
};

export default function GovernancePage() {
  const searchParams = useSearchParams();
  const categoryFilter = searchParams?.get('category') || 'all';
  const [agentFilter, setAgentFilter] = useState('all');
  const [docs, setDocs] = useState<GovernanceDoc[]>(FALLBACK_DOCS);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDashboard, setOpenDashboard] = useState<string | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  const openDoc = docs.find(d => d.slug === openDashboard) || null;

  const closeModal = useCallback(() => {
    setOpenDashboard(null);
    setTimeout(() => triggerRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    if (!openDashboard) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [openDashboard, closeModal]);

  useEffect(() => {
    fetch('/api/governance/documents')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { if (data?.documents?.length) setDocs(data.documents); })
      .catch(() => { /* use fallback */ })
      .finally(() => setLoading(false));
  }, []);

  const filtered = docs.filter(d => {
    if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
    if (agentFilter !== 'all' && d.owner !== agentFilter) return false;
    if (searchQuery && !d.title.toLowerCase().includes(searchQuery.toLowerCase()) && !d.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const categoryPath = (d: GovernanceDoc) => {
    const map: Record<string, string> = { template: 'templates', guideline: 'guidelines', standard: 'standards' };
    return map[d.category] || 'templates';
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.6rem' }}>{'\uD83C\uDFDB\uFE0F'}</span> Centro de Gobierno
        </h1>
        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '6px 0 0' }}>
          Base de gobierno de Smart Connection — {docs.length} documentos
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          maxWidth: 360,
        }}>
          <i className="bi bi-search" style={{ color: '#475569', fontSize: '0.85rem' }}></i>
          <input
            type="text"
            placeholder="Buscar documento..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#e2e8f0',
              fontSize: '0.78rem',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          />
        </div>
      </div>

      {/* Agent filter pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
        {AGENTS.map(a => {
          const isActive = agentFilter === a.key;
          return (
            <button
              key={a.key}
              onClick={() => setAgentFilter(a.key)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                border: isActive ? '1px solid #a78bfa' : '1px solid rgba(255,255,255,0.08)',
                background: isActive ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.03)',
                color: isActive ? '#c4b5fd' : '#94a3b8',
                fontSize: '0.7rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: "'Inter', system-ui, sans-serif",
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {a.emoji && <span style={{ fontSize: '0.75rem' }}>{a.emoji}</span>}
              {a.label}
            </button>
          );
        })}
      </div>

      {/* Cards grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              padding: 20,
              height: 140,
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
          <style>{`@keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
          <i className="bi bi-folder2-open" style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12 }}></i>
          <p style={{ fontSize: '0.85rem', margin: 0 }}>No se encontraron documentos con esos filtros</p>
          <button
            onClick={() => { setAgentFilter('all'); setSearchQuery(''); }}
            style={{
              marginTop: 12,
              padding: '6px 16px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: '#94a3b8',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
        }}>
          {filtered.map(doc => {
            const cat = CATEGORY_COLORS[doc.category];
            const fmt = FORMAT_LABELS[doc.format];
            const st = STATUS_COLORS[doc.status];
            const isHovered = hoveredCard === doc.id;
            const isDashboard = doc.format === 'dashboard' && DASHBOARD_COMPONENTS[doc.slug];
            const Wrapper = isDashboard ? 'div' : 'a';
            const wrapperProps = isDashboard
              ? { onClick: () => { triggerRef.current = document.activeElement as HTMLDivElement; setOpenDashboard(doc.slug); } }
              : { href: `/dashboard/governance/${categoryPath(doc)}/${doc.slug}` };
            return (
              <Wrapper
                key={doc.id}
                {...wrapperProps as any}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHoveredCard(doc.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div style={{
                  background: isHovered ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
                  border: isHovered ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12,
                  padding: 20,
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(8px)',
                  cursor: 'pointer',
                  transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                  boxShadow: isHovered ? '0 8px 30px rgba(0,0,0,0.3)' : 'none',
                }}>
                  {/* Icon + Title */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{doc.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9', lineHeight: 1.3 }}>{doc.title}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 4, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.description}</div>
                    </div>
                  </div>

                  {/* Badges row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                    {/* Category badge */}
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: cat.bg,
                      color: cat.text,
                      fontSize: '0.62rem',
                      fontWeight: 600,
                    }}>{cat.label}</span>

                    {/* Format badge */}
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: 3,
                      fontSize: '0.62rem', color: '#64748b',
                    }}>
                      {fmt.icon} {fmt.label}
                    </span>

                    {/* Separator */}
                    <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.08)' }}></span>

                    {/* Owner */}
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: 3,
                      fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500,
                    }}>
                      {doc.ownerEmoji} {doc.owner}
                    </span>

                    {/* Status dot */}
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: st.dot,
                        boxShadow: `0 0 6px ${st.dot}`,
                      }}></span>
                      <span style={{ fontSize: '0.6rem', color: '#64748b' }}>{st.label}</span>
                    </span>
                  </div>
                </div>
              </Wrapper>
            );
          })}
        </div>
      )}

      {/* Dashboard Modal */}
      {openDashboard && openDoc && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'modalFadeIn 0.2s ease-out',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div style={{
            width: '90vw', maxWidth: 1200, height: '90vh',
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16,
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
            animation: 'modalScaleIn 0.2s ease-out',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 20px',
              background: 'rgba(15,23,42,0.95)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '1.2rem' }}>{openDoc.icon}</span>
              <span id="modal-title" style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9', flex: 1 }}>{openDoc.title}</span>
              <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(167,139,250,0.12)', color: '#a78bfa', fontSize: '0.62rem', fontWeight: 600 }}>
                {openDoc.ownerEmoji} {openDoc.owner}
              </span>
              <button
                onClick={closeModal}
                aria-label="Cerrar"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: '#94a3b8',
                  width: 32, height: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#f87171'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}
              >
                <i className="bi bi-x-lg" style={{ fontSize: '0.75rem' }}></i>
              </button>
            </div>
            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              <Suspense fallback={
                <div style={{ padding: '60px 0', textAlign: 'center', color: '#475569' }}>
                  <div style={{ width: 32, height: 32, border: '2px solid rgba(167,139,250,0.3)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: '0.8rem' }}>Cargando dashboard...</p>
                </div>
              }>
                {DASHBOARD_COMPONENTS[openDashboard]}
              </Suspense>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalScaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
          }
          div[role="dialog"] > div {
            width: 100vw !important;
            height: 100vh !important;
            max-width: 100vw !important;
            border-radius: 0 !important;
          }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          div[style*="gridTemplateColumns"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
