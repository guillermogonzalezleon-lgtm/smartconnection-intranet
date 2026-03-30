'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

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

const FALLBACK_GUIDELINES: Record<string, GovernanceDoc> = {
  'ux-guidelines': { id: '27', slug: 'ux-guidelines', title: 'UX Guidelines', icon: '\uD83C\uDFA8', category: 'guideline', format: 'doc', owner: 'Panchita', ownerEmoji: '\uD83D\uDC15', status: 'active', version: 'v1.0', description: 'Principios UX: mobile-first, dark mode, glassmorphism', reads: ['Fiori', 'Hoku', 'Camilita'], updated_at: '2026-03-20' },
  'copy-guidelines': { id: '28', slug: 'copy-guidelines', title: 'Copy & Microcopy', icon: '\u270D\uFE0F', category: 'guideline', format: 'doc', owner: 'Panchita', ownerEmoji: '\uD83D\uDC15', status: 'active', version: 'v1.0', description: 'Tono, mensajes error, estados vacios, CTAs', reads: ['Fiori', 'ClienteX'], updated_at: '2026-03-18' },
  'onboarding-guide': { id: '29', slug: 'onboarding-guide', title: 'Onboarding Guide', icon: '\uD83D\uDC4B', category: 'guideline', format: 'doc', owner: 'ClienteX', ownerEmoji: '\uD83C\uDFA7', status: 'active', version: 'v1.0', description: 'Flujo de bienvenida y primeros pasos por producto', reads: ['Comercial', 'PM'], updated_at: '2026-03-15' },
  'pricing-guidelines': { id: '30', slug: 'pricing-guidelines', title: 'Pricing Guidelines', icon: '\uD83D\uDCB5', category: 'guideline', format: 'doc', owner: 'Comercial', ownerEmoji: '\uD83D\uDCBC', status: 'active', version: 'v1.0', description: 'Estructura de precios, anclas, descuentos', reads: ['PM', 'Guillermo'], updated_at: '2026-03-12' },
  'innovation-playbook': { id: '31', slug: 'innovation-playbook', title: 'Innovation Playbook', icon: '\uD83D\uDCA1', category: 'guideline', format: 'doc', owner: 'Sergito', ownerEmoji: '\u26A1', status: 'active', version: 'v1.0', description: 'TRIZ, SCAMPER, Blue Ocean, First Principles aplicados', reads: ['Todo el equipo'], updated_at: '2026-03-10' },
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

export default function GuidelineDocPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const [doc, setDoc] = useState<GovernanceDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/governance/documents?slug=${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { if (data?.document) setDoc(data.document); else throw new Error('not found'); })
      .catch(() => { setDoc(FALLBACK_GUIDELINES[slug] || null); })
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

  if (!doc) {
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

  const st = STATUS_COLORS[doc.status] || STATUS_COLORS.active;
  const placeholder = FORMAT_PLACEHOLDERS[doc.format] || FORMAT_PLACEHOLDERS.doc;

  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      {/* Main content */}
      <div style={{ flex: '1 1 600px', minWidth: 0 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: '2rem' }}>{doc.icon}</span>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{doc.title}</h1>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>{doc.description}</p>
        </div>

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

          {doc.drive_url ? (
            <a href={doc.drive_url} target="_blank" rel="noopener noreferrer" style={{
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
              <span style={{ fontSize: '1rem' }}>{doc.ownerEmoji}</span>
              <span style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: 500 }}>{doc.owner}</span>
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
            <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(167,139,250,0.12)', color: '#a78bfa', fontSize: '0.7rem', fontWeight: 600 }}>{doc.version}</span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 4, fontWeight: 600 }}>Formato</div>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'capitalize' }}>{doc.format}</span>
          </div>

          {doc.reads && doc.reads.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 6, fontWeight: 600 }}>Consumido por</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {doc.reads.map(r => (
                  <span key={r} style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8', fontSize: '0.62rem', fontWeight: 500 }}>{r}</span>
                ))}
              </div>
            </div>
          )}

          {doc.updated_at && (
            <div>
              <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: 4, fontWeight: 600 }}>Actualizado</div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{doc.updated_at}</span>
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
