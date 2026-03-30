'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, lazy, Suspense } from 'react';

const PipelineDashboard = lazy(() => import('@/components/governance/PipelineDashboard'));
const AuditDashboard = lazy(() => import('@/components/governance/AuditDashboard'));

interface GovernanceDoc {
  id: string;
  slug: string;
  title: string;
  icon: string;
  category: string;
  format: string;
  owner: string;
  ownerEmoji: string;
  status: string;
  version: string;
  description: string;
  drive_url?: string;
  reads?: string[];
  updated_at?: string;
}

const FALLBACK_TEMPLATES: Record<string, GovernanceDoc> = {
  'project-charter': { id: '1', slug: 'project-charter', title: 'Project Charter', icon: '\uD83D\uDCCB', category: 'template', format: 'slides', owner: 'PM', ownerEmoji: '\uD83D\uDC54', status: 'active', version: 'v1.0', description: 'Carta de inicio de proyecto con objetivos, alcance y stakeholders', reads: ['Arielito', 'Panchita', 'ABAP', 'Fiori', 'Hoku'], updated_at: '2026-03-28' },
  'sprint-planning': { id: '2', slug: 'sprint-planning', title: 'Sprint Planning', icon: '\uD83C\uDFAF', category: 'template', format: 'sheet', owner: 'PM', ownerEmoji: '\uD83D\uDC54', status: 'active', version: 'v2.1', description: 'Template para planificacion de sprints con RICE scoring', reads: ['Todo el equipo'], updated_at: '2026-03-25' },
  'weekly-report': { id: '3', slug: 'weekly-report', title: 'Reporte Semanal', icon: '\uD83D\uDCCA', category: 'template', format: 'slides', owner: 'PM', ownerEmoji: '\uD83D\uDC54', status: 'active', version: 'v1.3', description: 'Reporte semanal con metricas AARRR y estado del sprint', reads: ['Guillermo', 'Todo el equipo'], updated_at: '2026-03-30' },
  'benchmark-competitivo': { id: '4', slug: 'benchmark-competitivo', title: 'Benchmark Competitivo', icon: '\uD83D\uDD0D', category: 'template', format: 'doc', owner: 'Panchita', ownerEmoji: '\uD83D\uDC15', status: 'active', version: 'v1.0', description: 'Analisis de 3-5 competidores con tabla comparativa', reads: ['PM', 'Comercial', 'Fiori'], updated_at: '2026-03-20' },
  'handoff-funcional': { id: '5', slug: 'handoff-funcional', title: 'Handoff Funcional', icon: '\uD83D\uDCE6', category: 'template', format: 'doc', owner: 'Panchita', ownerEmoji: '\uD83D\uDC15', status: 'active', version: 'v2.0', description: 'Handoff de Panchita a equipo tecnico con specs completas', reads: ['Arielito', 'ABAP', 'Fiori', 'Hoku'], updated_at: '2026-03-22' },
  'maqueta-html': { id: '6', slug: 'maqueta-html', title: 'Maqueta HTML', icon: '\uD83C\uDFA8', category: 'template', format: 'doc', owner: 'Panchita', ownerEmoji: '\uD83D\uDC15', status: 'active', version: 'v1.0', description: 'Template base para maquetas HTML autocontenidas', reads: ['Fiori', 'Hoku'], updated_at: '2026-03-15' },
  'user-stories': { id: '7', slug: 'user-stories', title: 'User Stories', icon: '\uD83D\uDCDD', category: 'template', format: 'doc', owner: 'Panchita', ownerEmoji: '\uD83D\uDC15', status: 'active', version: 'v1.1', description: 'Template de historias de usuario con criterios de aceptacion', reads: ['PM', 'Camilita', 'ABAP', 'Fiori'], updated_at: '2026-03-18' },
  'adr-template': { id: '8', slug: 'adr-template', title: 'ADR Template', icon: '\uD83D\uDCC4', category: 'template', format: 'doc', owner: 'Arielito', ownerEmoji: '\uD83D\uDD0D', status: 'active', version: 'v1.0', description: 'Architecture Decision Record para decisiones tecnicas', reads: ['ABAP', 'Fiori', 'Hoku', 'Pipeline'], updated_at: '2026-03-10' },
  'api-contract': { id: '9', slug: 'api-contract', title: 'API Contract', icon: '\uD83D\uDD17', category: 'template', format: 'doc', owner: 'Arielito', ownerEmoji: '\uD83D\uDD0D', status: 'active', version: 'v1.2', description: 'Contrato OpenAPI entre frontend y backend', reads: ['ABAP', 'Fiori', 'Integrador'], updated_at: '2026-03-12' },
  'tech-radar': { id: '10', slug: 'tech-radar', title: 'Tech Radar', icon: '\uD83D\uDCE1', category: 'template', format: 'dashboard', owner: 'Arielito', ownerEmoji: '\uD83D\uDD0D', status: 'active', version: 'v1.0', description: 'Radar tecnologico: adoptar, evaluar, mantener, deprecar', reads: ['Todo el equipo'], updated_at: '2026-03-28' },
  'kaizen-report': { id: '11', slug: 'kaizen-report', title: 'Kaizen Report', icon: '\uD83D\uDD04', category: 'template', format: 'doc', owner: 'Arielito', ownerEmoji: '\uD83D\uDD0D', status: 'active', version: 'v1.0', description: 'Assessment 360 del sistema con scoring A-F', reads: ['PM', 'Todo el equipo'], updated_at: '2026-03-27' },
  'ai-feature-spec': { id: '12', slug: 'ai-feature-spec', title: 'AI Feature Spec', icon: '\uD83E\uDD16', category: 'template', format: 'doc', owner: 'Hoku', ownerEmoji: '\uD83D\uDC3E', status: 'active', version: 'v1.0', description: 'Especificacion de feature IA con guardrails y evals', reads: ['Arielito', 'Integrador'], updated_at: '2026-03-25' },
  'eval-report': { id: '13', slug: 'eval-report', title: 'Eval Report', icon: '\uD83E\uddEA', category: 'template', format: 'doc', owner: 'Hoku', ownerEmoji: '\uD83D\uDC3E', status: 'active', version: 'v1.0', description: 'Reporte de evaluacion de prompts con metricas', reads: ['Arielito', 'PM'], updated_at: '2026-03-24' },
  'prompt-library': { id: '14', slug: 'prompt-library', title: 'Prompt Library', icon: '\uD83D\uDCDA', category: 'template', format: 'sheet', owner: 'Hoku', ownerEmoji: '\uD83D\uDC3E', status: 'active', version: 'v1.0', description: 'Biblioteca de prompts versionados por feature', reads: ['Integrador'], updated_at: '2026-03-20' },
  'bug-report': { id: '15', slug: 'bug-report', title: 'Bug Report', icon: '\uD83D\uDC1B', category: 'template', format: 'form', owner: 'Camilita', ownerEmoji: '\uD83D\uDC69', status: 'active', version: 'v1.0', description: 'Formulario de reporte de bugs con severidad y pasos', reads: ['ABAP', 'Fiori', 'Hoku'], updated_at: '2026-03-22' },
  'qa-checklist': { id: '16', slug: 'qa-checklist', title: 'QA Checklist', icon: '\u2705', category: 'template', format: 'sheet', owner: 'Camilita', ownerEmoji: '\uD83D\uDC69', status: 'active', version: 'v1.2', description: 'Checklist de QA por persona y area de testing', reads: ['PM', 'Panchita'], updated_at: '2026-03-26' },
  'propuesta-comercial': { id: '17', slug: 'propuesta-comercial', title: 'Propuesta Comercial', icon: '\uD83D\uDCB0', category: 'template', format: 'slides', owner: 'Comercial', ownerEmoji: '\uD83D\uDCBC', status: 'active', version: 'v1.0', description: 'Template de propuesta con diagnostico, solucion e inversion', reads: ['PM', 'Guillermo'], updated_at: '2026-03-15' },
  'battle-card': { id: '18', slug: 'battle-card', title: 'Battle Card', icon: '\u2694\uFE0F', category: 'template', format: 'doc', owner: 'Comercial', ownerEmoji: '\uD83D\uDCBC', status: 'active', version: 'v1.0', description: 'Posicionamiento vs competidor especifico', reads: ['PM', 'Panchita'], updated_at: '2026-03-18' },
  'integracion-catalog': { id: '19', slug: 'integracion-catalog', title: 'Catalogo Integraciones', icon: '\uD83D\uDD0C', category: 'template', format: 'sheet', owner: 'Integrador', ownerEmoji: '\uD83D\uDD0C', status: 'active', version: 'v1.0', description: 'Inventario de APIs y providers con estado y rate limits', reads: ['Arielito', 'ABAP', 'Hoku'], updated_at: '2026-03-20' },
};

const STATUS_COLORS: Record<string, { dot: string; label: string }> = {
  active: { dot: '#22c55e', label: 'Activo' },
  draft: { dot: '#f59e0b', label: 'Borrador' },
  deprecated: { dot: '#ef4444', label: 'Deprecado' },
};

const FORMAT_PLACEHOLDERS: Record<string, { title: string; icon: string; description: string }> = {
  dashboard: { title: 'Dashboard dinamico', icon: '\uD83D\uDCBB', description: 'Este documento se renderiza como dashboard interactivo — proximamente' },
  doc: { title: 'Contenido desde Google Drive', icon: '\uD83D\uDCC4', description: 'El contenido de este documento se sincroniza desde Google Drive — proximamente' },
  slides: { title: 'Presentacion embebida', icon: '\uD83D\uDCCA', description: 'Esta presentacion se embebe directamente desde Google Slides — proximamente' },
  sheet: { title: 'Hoja de calculo embebida', icon: '\uD83D\uDCC8', description: 'Esta hoja se embebe directamente desde Google Sheets — proximamente' },
  form: { title: 'Formulario interactivo', icon: '\uD83D\uDCCB', description: 'Este formulario se embebe directamente desde Google Forms — proximamente' },
};

export default function TemplateDocPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const [doc, setDoc] = useState<GovernanceDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/governance/documents?slug=${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { if (data?.document) setDoc(data.document); else throw new Error('not found'); })
      .catch(() => { setDoc(FALLBACK_TEMPLATES[slug] || null); })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: '#475569' }}>
        <div style={{ width: 32, height: 32, border: '2px solid rgba(167,139,250,0.3)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }}></div>
        <p style={{ fontSize: '0.8rem' }}>Cargando documento...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Slugs de dashboards dinámicos no necesitan doc de Drive
  const DYNAMIC_DASHBOARDS = ['pipeline-winloss', 'audit-report'];

  if (!doc && !DYNAMIC_DASHBOARDS.includes(slug)) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: '#475569' }}>
        <i className="bi bi-file-earmark-x" style={{ fontSize: '2.5rem', display: 'block', marginBottom: 12 }}></i>
        <p style={{ fontSize: '0.85rem' }}>Documento no encontrado</p>
        <a href="/dashboard/governance" style={{ color: '#a78bfa', fontSize: '0.78rem', textDecoration: 'none' }}>
          Volver al Centro de Gobierno
        </a>
      </div>
    );
  }

  // Metadata fallback para dashboards dinámicos
  const dynamicDocFallbacks: Record<string, GovernanceDoc> = {
    'audit-report': {
      id: 'dyn-2',
      slug: 'audit-report',
      title: 'Audit Report',
      icon: '📊',
      category: 'dashboard',
      format: 'dashboard',
      owner: 'Arielito',
      ownerEmoji: '🔍',
      status: 'active',
      version: 'v1.0',
      description: 'Scoring A-F por proyecto y área, deuda técnica y risk heatmap',
      reads: ['PM', 'Guillermo', 'Todo el equipo'],
      updated_at: '2026-03-30',
    },
    'pipeline-winloss': {
      id: 'dyn-1',
      slug: 'pipeline-winloss',
      title: 'Pipeline & Win/Loss',
      icon: '📊',
      category: 'dashboard',
      format: 'dashboard',
      owner: 'Comercial',
      ownerEmoji: '💼',
      status: 'active',
      version: 'v1.0',
      description: 'Funnel de ventas, métricas de conversión y análisis win/loss',
      reads: ['PM', 'Guillermo', 'Comercial'],
      updated_at: '2026-03-30',
    },
  };

  const resolvedDoc = doc ?? dynamicDocFallbacks[slug];

  const st = STATUS_COLORS[resolvedDoc!.status] || STATUS_COLORS.active;
  const placeholder = FORMAT_PLACEHOLDERS[resolvedDoc!.format] || FORMAT_PLACEHOLDERS.doc;

  // Dashboards dinámicos por slug
  if (slug === 'audit-report') {
    return (
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 600px', minWidth: 0 }}>
          <Suspense fallback={
            <div style={{ padding: '48px 0', textAlign: 'center', color: '#475569' }}>
              <div style={{ width: 32, height: 32, border: '2px solid rgba(167,139,250,0.3)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ fontSize: '0.8rem' }}>Cargando dashboard...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          }>
            <AuditDashboard />
          </Suspense>
        </div>
        <div style={{ flex: '0 0 260px', minWidth: 240 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20, position: 'sticky', top: 24 }}>
            <h3 style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>Metadata</h3>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 4, fontWeight: 600 }}>Owner</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '1rem' }}>{resolvedDoc!.ownerEmoji}</span>
                <span style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: 500 }}>{resolvedDoc!.owner}</span>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 4, fontWeight: 600 }}>Estado</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.dot, boxShadow: `0 0 6px ${st.dot}` }} />
                <span style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>{st.label}</span>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 4, fontWeight: 600 }}>Version</div>
              <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(167,139,250,0.12)', color: '#a78bfa', fontSize: '0.7rem', fontWeight: 600 }}>{resolvedDoc!.version}</span>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 4, fontWeight: 600 }}>Formato</div>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'capitalize' }}>{resolvedDoc!.format}</span>
            </div>
            {resolvedDoc!.reads && resolvedDoc!.reads!.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 6, fontWeight: 600 }}>Consumido por</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {resolvedDoc!.reads!.map(r => (
                    <span key={r} style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8', fontSize: '0.62rem', fontWeight: 500 }}>{r}</span>
                  ))}
                </div>
              </div>
            )}
            {resolvedDoc!.updated_at && (
              <div>
                <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 4, fontWeight: 600 }}>Actualizado</div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{resolvedDoc!.updated_at}</span>
              </div>
            )}
          </div>
        </div>
        <style>{`@media (max-width: 768px) { div[style*="flex: 0 0 260px"] { flex: 1 1 100% !important; } }`}</style>
      </div>
    );
  }

  if (slug === 'pipeline-winloss') {
    return (
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Dashboard principal */}
        <div style={{ flex: '1 1 600px', minWidth: 0 }}>
          <Suspense fallback={
            <div style={{ padding: '48px 0', textAlign: 'center', color: '#475569' }}>
              <div style={{ width: 32, height: 32, border: '2px solid rgba(34,197,94,0.3)', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ fontSize: '0.8rem' }}>Cargando dashboard...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          }>
            <PipelineDashboard />
          </Suspense>
        </div>

        {/* Metadata sidebar */}
        <div style={{ flex: '0 0 260px', minWidth: 240 }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            padding: 20,
            position: 'sticky',
            top: 24,
          }}>
            <h3 style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>Metadata</h3>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 4, fontWeight: 600 }}>Owner</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '1rem' }}>{resolvedDoc!.ownerEmoji}</span>
                <span style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: 500 }}>{resolvedDoc!.owner}</span>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 4, fontWeight: 600 }}>Estado</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.dot, boxShadow: `0 0 6px ${st.dot}` }} />
                <span style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>{st.label}</span>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 4, fontWeight: 600 }}>Version</div>
              <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(167,139,250,0.12)', color: '#a78bfa', fontSize: '0.7rem', fontWeight: 600 }}>{resolvedDoc!.version}</span>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 4, fontWeight: 600 }}>Formato</div>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'capitalize' }}>{resolvedDoc!.format}</span>
            </div>
            {resolvedDoc!.reads && resolvedDoc!.reads!.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 6, fontWeight: 600 }}>Consumido por</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {resolvedDoc!.reads!.map(r => (
                    <span key={r} style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8', fontSize: '0.62rem', fontWeight: 500 }}>{r}</span>
                  ))}
                </div>
              </div>
            )}
            {resolvedDoc!.updated_at && (
              <div>
                <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 4, fontWeight: 600 }}>Actualizado</div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{resolvedDoc!.updated_at}</span>
              </div>
            )}
          </div>
        </div>
        <style>{`@media (max-width: 768px) { div[style*="flex: 0 0 260px"] { flex: 1 1 100% !important; } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      {/* Main content */}
      <div style={{ flex: '1 1 600px', minWidth: 0 }}>
        {/* Doc header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: '2rem' }}>{resolvedDoc!.icon}</span>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{resolvedDoc!.title}</h1>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>{resolvedDoc!.description}</p>
        </div>

        {/* Content placeholder */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: '60px 40px',
          textAlign: 'center',
          minHeight: 300,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}>
          <span style={{ fontSize: '2.5rem' }}>{placeholder.icon}</span>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>{placeholder.title}</h3>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, maxWidth: 400 }}>{placeholder.description}</p>

          {resolvedDoc!.drive_url && (
            <a
              href={resolvedDoc!.drive_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginTop: 16,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 20px',
                borderRadius: 8,
                background: 'rgba(167,139,250,0.15)',
                border: '1px solid rgba(167,139,250,0.3)',
                color: '#c4b5fd',
                fontSize: '0.78rem',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <i className="bi bi-box-arrow-up-right" style={{ fontSize: '0.75rem' }}></i>
              Abrir en Drive
            </a>
          )}

          {!resolvedDoc!.drive_url && (
            <div style={{
              marginTop: 16,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 20px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#475569',
              fontSize: '0.72rem',
            }}>
              <i className="bi bi-link-45deg"></i>
              Drive URL pendiente de configurar
            </div>
          )}
        </div>
      </div>

      {/* Metadata sidebar */}
      <div style={{ flex: '0 0 260px', minWidth: 240 }}>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12,
          padding: 20,
          position: 'sticky',
          top: 24,
        }}>
          <h3 style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>Metadata</h3>

          {/* Owner */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 4, fontWeight: 600 }}>Owner</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '1rem' }}>{resolvedDoc!.ownerEmoji}</span>
              <span style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: 500 }}>{resolvedDoc!.owner}</span>
            </div>
          </div>

          {/* Status */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 4, fontWeight: 600 }}>Estado</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.dot, boxShadow: `0 0 6px ${st.dot}` }}></span>
              <span style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>{st.label}</span>
            </div>
          </div>

          {/* Version */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 4, fontWeight: 600 }}>Version</div>
            <span style={{
              padding: '2px 8px',
              borderRadius: 6,
              background: 'rgba(167,139,250,0.12)',
              color: '#a78bfa',
              fontSize: '0.7rem',
              fontWeight: 600,
            }}>{resolvedDoc!.version}</span>
          </div>

          {/* Format */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 4, fontWeight: 600 }}>Formato</div>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'capitalize' }}>{resolvedDoc!.format}</span>
          </div>

          {/* Reads */}
          {resolvedDoc!.reads && resolvedDoc!.reads.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 6, fontWeight: 600 }}>Consumido por</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {resolvedDoc!.reads.map(r => (
                  <span key={r} style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#94a3b8',
                    fontSize: '0.62rem',
                    fontWeight: 500,
                  }}>{r}</span>
                ))}
              </div>
            </div>
          )}

          {/* Updated */}
          {resolvedDoc!.updated_at && (
            <div>
              <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 4, fontWeight: 600 }}>Actualizado</div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{resolvedDoc!.updated_at}</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="flex: 0 0 260px"] {
            flex: 1 1 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
