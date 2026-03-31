'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const DriveDocViewer = dynamic(() => import('@/components/governance/DriveDocViewer'), { ssr: false });
const SheetViewer = dynamic(() => import('@/components/governance/SheetViewer'), { ssr: false });
const SlidesEmbed = dynamic(() => import('@/components/governance/SlidesEmbed'), { ssr: false });

const DesignTokensDashboard = dynamic(() => import('@/components/governance/DesignTokensDashboard'), { ssr: false });
const ProvidersIaDashboard = dynamic(() => import('@/components/governance/ProvidersIaDashboard'), { ssr: false });
const IntegrationMapDashboard = dynamic(() => import('@/components/governance/IntegrationMapDashboard'), { ssr: false });

const TechRadarDashboard = dynamic(
  () => import('@/components/governance/TechRadarDashboard'),
  { ssr: false, loading: () => (
    <div style={{ padding: '60px 0', textAlign: 'center', color: '#475569' }}>
      <div style={{ width: 32, height: 32, border: '2px solid rgba(167,139,250,0.3)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }}></div>
      <p style={{ fontSize: '0.8rem' }}>Cargando Tech Radar...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )}
);

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
  drive_file_id?: string;
  reads?: string[];
  updated_at?: string;
}

const FALLBACK_STANDARDS: Record<string, GovernanceDoc> = {
  'coding-standards': { id: '20', slug: 'coding-standards', title: 'Coding Standards', icon: '\uD83D\uDCCF', category: 'standard', format: 'doc', owner: 'Arielito', ownerEmoji: '\uD83D\uDD0D', status: 'active', version: 'v2.0', description: 'Estandares de codigo TypeScript, naming, estructura', reads: ['ABAP', 'Fiori', 'Hoku'], updated_at: '2026-03-25' },
  'api-standards': { id: '21', slug: 'api-standards', title: 'API Standards', icon: '\uD83C\uDF10', category: 'standard', format: 'doc', owner: 'Arielito', ownerEmoji: '\uD83D\uDD0D', status: 'active', version: 'v1.1', description: 'Estandares REST: versionado, paginacion, errores', reads: ['ABAP', 'Integrador'], updated_at: '2026-03-22' },
  'security-standards': { id: '22', slug: 'security-standards', title: 'Security Standards', icon: '\uD83D\uDD12', category: 'standard', format: 'doc', owner: 'Arielito', ownerEmoji: '\uD83D\uDD0D', status: 'active', version: 'v1.0', description: 'Headers, CORS, RLS, secrets, auth — todo proyecto', reads: ['ABAP', 'Pipeline', 'Hoku'], updated_at: '2026-03-20' },
  'db-standards': { id: '23', slug: 'db-standards', title: 'DB Standards', icon: '\uD83D\uDDC4\uFE0F', category: 'standard', format: 'doc', owner: 'ABAP', ownerEmoji: '\uD83D\uDD27', status: 'active', version: 'v1.0', description: 'Naming, migrations, RLS, indices en Supabase', reads: ['Arielito', 'Hoku'], updated_at: '2026-03-18' },
  'frontend-standards': { id: '24', slug: 'frontend-standards', title: 'Frontend Standards', icon: '\uD83D\uDDA5\uFE0F', category: 'standard', format: 'doc', owner: 'Fiori', ownerEmoji: '\uD83C\uDFA8', status: 'active', version: 'v1.0', description: 'Performance, accesibilidad, responsive, tokens CSS', reads: ['Panchita', 'Camilita'], updated_at: '2026-03-15' },
  'ai-safety-standards': { id: '25', slug: 'ai-safety-standards', title: 'AI Safety Standards', icon: '\uD83D\uDEE1\uFE0F', category: 'standard', format: 'doc', owner: 'Hoku', ownerEmoji: '\uD83D\uDC3E', status: 'active', version: 'v1.0', description: 'Guardrails, PII, injection, hallucination prevention', reads: ['Arielito', 'Integrador'], updated_at: '2026-03-12' },
  'deploy-standards': { id: '26', slug: 'deploy-standards', title: 'Deploy Standards', icon: '\uD83D\uDE80', category: 'standard', format: 'doc', owner: 'Pipeline', ownerEmoji: '\uD83D\uDEE0\uFE0F', status: 'active', version: 'v1.0', description: 'CI/CD, smoke tests, rollback, env vars', reads: ['ABAP', 'Fiori', 'Hoku'], updated_at: '2026-03-10' },
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

export default function StandardDocPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const [doc, setDoc] = useState<GovernanceDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/governance/documents?slug=${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { if (data?.document) setDoc(data.document); else throw new Error('not found'); })
      .catch(() => { setDoc(FALLBACK_STANDARDS[slug] || null); })
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

  const DYNAMIC_STANDARDS = ['tech-radar', 'design-tokens', 'providers-ia', 'catalogo-integraciones'];

  if (!doc && !DYNAMIC_STANDARDS.includes(slug)) {
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

  const DYNAMIC_FALLBACK: Record<string, GovernanceDoc> = {
    'design-tokens': { id: 'dt', slug: 'design-tokens', title: 'Design Tokens', icon: '🎨', category: 'standard', format: 'dashboard', owner: 'Fiori', ownerEmoji: '🎨', status: 'active', version: 'v1.0', description: 'Tokens de diseño: colores, tipografía, spacing, shadows' },
    'providers-ia': { id: 'pi', slug: 'providers-ia', title: 'Providers IA', icon: '🤖', category: 'standard', format: 'dashboard', owner: 'Integrador', ownerEmoji: '🔌', status: 'active', version: 'v1.0', description: 'Catálogo de providers IA con benchmarks y costos' },
    'catalogo-integraciones': { id: 'ci', slug: 'catalogo-integraciones', title: 'Catálogo de Integraciones', icon: '🔌', category: 'standard', format: 'dashboard', owner: 'Integrador', ownerEmoji: '🔌', status: 'active', version: 'v1.0', description: 'Inventario de todas las integraciones externas' },
  };
  const resolvedDoc = doc || DYNAMIC_FALLBACK[slug] || null;
  if (!resolvedDoc) return null;

  const st = STATUS_COLORS[resolvedDoc.status] || STATUS_COLORS.active;
  const placeholder = FORMAT_PLACEHOLDERS[resolvedDoc.format] || FORMAT_PLACEHOLDERS.doc;

  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      {/* Main content */}
      <div style={{ flex: '1 1 600px', minWidth: 0 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: '2rem' }}>{resolvedDoc.icon}</span>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{resolvedDoc.title}</h1>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>{resolvedDoc.description}</p>
        </div>

        {slug === 'tech-radar' ? (
          <TechRadarDashboard />
        ) : slug === 'design-tokens' ? (
          <DesignTokensDashboard />
        ) : slug === 'providers-ia' ? (
          <ProvidersIaDashboard />
        ) : slug === 'catalogo-integraciones' ? (
          <IntegrationMapDashboard />
        ) : resolvedDoc.drive_file_id && resolvedDoc.format === 'doc' ? (
          <DriveDocViewer fileId={resolvedDoc.drive_file_id} title={resolvedDoc.title} driveUrl={resolvedDoc.drive_url} />
        ) : resolvedDoc.drive_file_id && resolvedDoc.format === 'sheet' ? (
          <SheetViewer fileId={resolvedDoc.drive_file_id} title={resolvedDoc.title} driveUrl={resolvedDoc.drive_url} />
        ) : resolvedDoc.drive_file_id && resolvedDoc.format === 'slides' ? (
          <SlidesEmbed fileId={resolvedDoc.drive_file_id} title={resolvedDoc.title} driveUrl={resolvedDoc.drive_url} />
        ) : (
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

            {resolvedDoc.drive_url ? (
              <a href={resolvedDoc.drive_url} target="_blank" rel="noopener noreferrer" style={{
                marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 20px', borderRadius: 8, background: 'rgba(167,139,250,0.15)',
                border: '1px solid rgba(167,139,250,0.3)', color: '#c4b5fd',
                fontSize: '0.78rem', fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s ease',
              }}>
                <i className="bi bi-box-arrow-up-right" style={{ fontSize: '0.75rem' }}></i>
                Abrir en Drive
              </a>
            ) : (
              <div style={{
                marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 20px', borderRadius: 8, background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', color: '#475569', fontSize: '0.72rem',
              }}>
                <i className="bi bi-link-45deg"></i>
                Drive URL pendiente de configurar
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metadata sidebar */}
      <div style={{ flex: '0 0 260px', minWidth: 240 }}>
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12, padding: 20, position: 'sticky', top: 24,
        }}>
          <h3 style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>Metadata</h3>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 4, fontWeight: 600 }}>Owner</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '1rem' }}>{resolvedDoc.ownerEmoji}</span>
              <span style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: 500 }}>{resolvedDoc.owner}</span>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 4, fontWeight: 600 }}>Estado</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.dot, boxShadow: `0 0 6px ${st.dot}` }}></span>
              <span style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>{st.label}</span>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 4, fontWeight: 600 }}>Version</div>
            <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(167,139,250,0.12)', color: '#a78bfa', fontSize: '0.7rem', fontWeight: 600 }}>{resolvedDoc.version}</span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 4, fontWeight: 600 }}>Formato</div>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'capitalize' }}>{resolvedDoc.format}</span>
          </div>

          {resolvedDoc.reads && resolvedDoc.reads.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 6, fontWeight: 600 }}>Consumido por</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {resolvedDoc.reads?.map(r => (
                  <span key={r} style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8', fontSize: '0.62rem', fontWeight: 500 }}>{r}</span>
                ))}
              </div>
            </div>
          )}

          {resolvedDoc.updated_at && (
            <div>
              <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 4, fontWeight: 600 }}>Actualizado</div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{resolvedDoc.updated_at}</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="flex: 0 0 260px"] { flex: 1 1 100% !important; }
        }
      `}</style>
    </div>
  );
}
