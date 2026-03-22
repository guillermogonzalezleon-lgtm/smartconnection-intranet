'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Connector {
  id: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  status: 'active' | 'available' | 'error' | 'coming_soon';
  description: string;
  authType: string;
  lastSync?: string;
  dataVolume?: string;
  endpoints?: string[];
  action?: string;
  businessValue?: number;
}

const CONNECTORS: Connector[] = [
  // SAP Connectors
  { id: 'sap-btp', name: 'SAP BTP', category: 'SAP', icon: '🔷', color: '#0070f2', status: 'available', description: 'Business Technology Platform — Integration hub, extensiones y desarrollo cloud', authType: 'OAuth 2.0', endpoints: ['/api/v1/btp/services', '/api/v1/btp/subaccounts'], businessValue: 5 },
  { id: 'sap-s4hana', name: 'SAP S/4HANA Cloud', category: 'SAP', icon: '🏢', color: '#0070f2', status: 'available', description: 'ERP Cloud — Finanzas, logística, manufactura, ventas', authType: 'OAuth 2.0', endpoints: ['/sap/opu/odata/sap/*', '/api/v1/s4hana/'], businessValue: 5 },
  { id: 'sap-analytics', name: 'SAP Analytics Cloud', category: 'SAP', icon: '📈', color: '#0070f2', status: 'available', description: 'Analytics & Planning — BI, predicción, planificación financiera', authType: 'OAuth 2.0', endpoints: ['/api/v1/stories', '/api/v1/models'], businessValue: 4 },
  { id: 'sap-integration-suite', name: 'SAP Integration Suite', category: 'SAP', icon: '🔀', color: '#0070f2', status: 'available', description: 'iPaaS — Integración A2A, B2B, API Management, Event Mesh', authType: 'OAuth 2.0', endpoints: ['/api/v1/IntegrationDesigntimeArtifacts', '/api/v1/MessageProcessingLogs'], businessValue: 4 },
  { id: 'sap-build', name: 'SAP Build', category: 'SAP', icon: '🧩', color: '#0070f2', status: 'available', description: 'Low-code/No-code — Apps, Process Automation, Work Zone', authType: 'API Key', endpoints: ['/api/v1/build/apps', '/api/v1/build/processes'], businessValue: 3 },
  { id: 'sap-datasphere', name: 'SAP Datasphere', category: 'SAP', icon: '🗄️', color: '#0070f2', status: 'available', description: 'Data Warehouse Cloud — Modelado, federación, data marketplace', authType: 'OAuth 2.0', endpoints: ['/api/v1/datasphere/spaces', '/api/v1/datasphere/views'], businessValue: 4 },

  // Business Tools
  { id: 'proposal-gen', name: 'Generador de Propuestas (IA)', category: 'Business', icon: '📝', color: '#f59e0b', status: 'active', description: 'Genera propuestas de consultoría SAP con IA (Groq) — scoping, estimaciones, entregables', authType: 'API Key', lastSync: 'On demand', dataVolume: '~15 propuestas', endpoints: ['/api/agents'], action: 'proposal-gen', businessValue: 5 },
  { id: 'client-reports', name: 'Generador de Reportes', category: 'Business', icon: '📊', color: '#3b82f6', status: 'active', description: 'Reportes automáticos de clientes desde Supabase — estado proyectos, KPIs, hitos', authType: 'Service Key', lastSync: 'Hace 1 hora', dataVolume: '12 reportes', endpoints: ['/api/reports'], action: 'client-reports', businessValue: 5 },
  { id: 'competitor-analysis', name: 'Análisis de Competencia', category: 'Business', icon: '🎯', color: '#8b5cf6', status: 'active', description: 'Research de mercado con IA — tendencias SAP, posicionamiento, oportunidades', authType: 'API Key', lastSync: 'Semanal', dataVolume: '8 análisis', endpoints: ['/api/agents'], action: 'competitor-analysis', businessValue: 4 },

  // Active
  { id: 'anthropic', name: 'Claude (Anthropic)', category: 'IA Generativa', icon: '🤖', color: '#00e5b0', status: 'active', description: 'Code review, arquitectura, desarrollo avanzado', authType: 'API Key', lastSync: 'Hace 2 min', dataVolume: '1.2K tokens', endpoints: ['/v1/messages'], action: 'claude', businessValue: 4 },
  { id: 'groq', name: 'Groq', category: 'IA Generativa', icon: '⚡', color: '#f59e0b', status: 'active', description: 'Llama 3.3 70B — Inferencia ultra rápida', authType: 'API Key', lastSync: 'Hace 5 min', dataVolume: '3.4K tokens', endpoints: ['/openai/v1/chat/completions'], action: 'groq', businessValue: 4 },
  { id: 'gemini', name: 'Gemini', category: 'IA Generativa', icon: '💎', color: '#22c55e', status: 'active', description: 'Google AI — SEO, analytics, multimodal', authType: 'API Key', lastSync: 'Hace 15 min', dataVolume: '800 tokens', endpoints: ['/v1beta/models/gemini-2.0-flash:generateContent'], action: 'gemini', businessValue: 3 },
  { id: 'grok', name: 'Grok (xAI)', category: 'IA Generativa', icon: '🔮', color: '#8b5cf6', status: 'available', description: 'Análisis y research avanzado', authType: 'API Key', endpoints: ['/v1/chat/completions'], action: 'grok', businessValue: 2 },

  { id: 'supabase', name: 'Supabase', category: 'Base de Datos', icon: '⚡', color: '#22c55e', status: 'active', description: 'PostgreSQL — Auth, Storage, Realtime, RLS', authType: 'Service Key', lastSync: 'Realtime', dataVolume: '7 tablas', endpoints: ['/rest/v1/*', '/auth/v1/*'], action: 'https://supabase.com/dashboard', businessValue: 4 },
  { id: 'github', name: 'GitHub', category: 'DevOps', icon: '🐙', color: '#f1f5f9', status: 'active', description: 'Repositorios, Actions, CI/CD, PRs', authType: 'Personal Token', lastSync: 'Cada push', dataVolume: '2 repos', endpoints: ['/repos/*/actions/workflows/*/dispatches'], action: 'https://github.com/guillermogonzalezleon-lgtm', businessValue: 3 },
  { id: 'aws-s3', name: 'AWS S3', category: 'Cloud', icon: '📦', color: '#f97316', status: 'active', description: 'Bucket smartconnetion25 — static hosting', authType: 'IAM Keys', lastSync: 'Cada deploy', dataVolume: '~50 archivos', endpoints: ['s3://smartconnetion25'], businessValue: 2 },
  { id: 'aws-cf', name: 'AWS CloudFront', category: 'CDN', icon: '🌐', color: '#f97316', status: 'active', description: 'CDN global — smconnection.cl', authType: 'IAM Keys', lastSync: 'Cada invalidación', dataVolume: '2 aliases', endpoints: ['E3O4YBX3RKHQUL'], businessValue: 2 },
  { id: 'aws-amplify', name: 'AWS Amplify', category: 'Deploy', icon: '📡', color: '#f97316', status: 'active', description: 'Next.js SSR — intranet.smconnection.cl', authType: 'IAM Keys', lastSync: 'Auto-deploy', dataVolume: '1 app', endpoints: ['d2qam7xccab5t8'], businessValue: 3 },
  { id: 'google-cal', name: 'Google Calendar', category: 'Productividad', icon: '📅', color: '#3b82f6', status: 'active', description: 'Crear reuniones con Meet automático', authType: 'Service Account', endpoints: ['/calendar/v3/calendars/*/events'], businessValue: 2 },
  { id: 'google-ws', name: 'Google Workspace', category: 'Productividad', icon: '📧', color: '#ef4444', status: 'active', description: 'Gmail, Calendar, Drive APIs', authType: 'Service Account', endpoints: ['Gmail API', 'Calendar API', 'Drive API'], businessValue: 3 },
  { id: 'route53', name: 'AWS Route 53', category: 'DNS', icon: '🗺️', color: '#f97316', status: 'active', description: 'DNS smconnection.cl — 4 zonas', authType: 'IAM Keys', endpoints: ['Z3DOBGB40V1Y3P'], businessValue: 1 },

  // Available
  { id: 'canva', name: 'Canva', category: 'Design', icon: '🎨', color: '#06b6d4', status: 'available', description: 'Diseño gráfico, social media, presentaciones', authType: 'OAuth 2.0', endpoints: ['/v1/designs'], businessValue: 2 },
  { id: 'airtable', name: 'Airtable', category: 'Base de Datos', icon: '📊', color: '#f59e0b', status: 'active', description: 'Base VOY app6BzCBjniZqtXmd', authType: 'Personal Token', lastSync: 'Via VOY', dataVolume: '8 tablas', endpoints: ['/v0/app6BzCBjniZqtXmd/*'], businessValue: 3 },
  { id: 'resend', name: 'Resend', category: 'Email', icon: '📨', color: '#3b82f6', status: 'available', description: 'Email transaccional', authType: 'API Key', endpoints: ['/emails'], businessValue: 2 },
  { id: 'whatsapp', name: 'WhatsApp Business', category: 'Messaging', icon: '💬', color: '#22c55e', status: 'available', description: 'Mensajería automatizada', authType: 'Cloud API', endpoints: ['/v1/messages'], businessValue: 3 },
  { id: 'make', name: 'Make (Integromat)', category: 'Automation', icon: '⚙️', color: '#a855f7', status: 'available', description: 'Workflows visuales de automatización', authType: 'API Key', businessValue: 2 },
  { id: 'zapier', name: 'Zapier', category: 'Automation', icon: '🔗', color: '#f97316', status: 'available', description: 'Conectar 5000+ apps', authType: 'OAuth 2.0', businessValue: 2 },

  // Coming soon
  { id: 'midjourney', name: 'Midjourney', category: 'IA Visual', icon: '🎨', color: '#8b5cf6', status: 'coming_soon', description: 'Generación de imágenes', authType: 'Discord Bot', businessValue: 1 },
  { id: 'sora', name: 'Sora (OpenAI)', category: 'IA Video', icon: '🌀', color: '#f1f5f9', status: 'coming_soon', description: 'Text to video', authType: 'API Key', businessValue: 1 },
  { id: 'runway', name: 'Runway ML', category: 'IA Video', icon: '🎬', color: '#06b6d4', status: 'coming_soon', description: 'Video generation & editing', authType: 'API Key', businessValue: 1 },
  { id: 'n8n', name: 'n8n', category: 'Automation', icon: '🔄', color: '#ef4444', status: 'coming_soon', description: 'Self-hosted workflow automation', authType: 'API Key', businessValue: 2 },
  { id: 'stripe', name: 'Stripe', category: 'Pagos', icon: '💳', color: '#635bff', status: 'coming_soon', description: 'Procesamiento de pagos', authType: 'API Key', businessValue: 3 },
  { id: 'slack', name: 'Slack', category: 'Messaging', icon: '💬', color: '#e01e5a', status: 'coming_soon', description: 'Notificaciones y bots', authType: 'OAuth 2.0', businessValue: 2 },
];

const TABS = ['Conectores', 'Flujos', 'Monitoreo'];

const FLOWS = [
  { name: 'Client Onboarding → CRM', source: 'Formulario Web', transform: 'Validación + Enrich IA', dest: 'Supabase CRM + Calendar', status: 'active', prompt: 'Analiza el flujo de onboarding de clientes en smconnection.cl. Revisa el formulario de contacto, la validación, y sugiere mejoras para aumentar la conversión. Genera código si es necesario.' },
  { name: 'Proposal Generation → PDF → Email', source: 'Brief del cliente', transform: 'Groq IA + Template', dest: 'PDF + Resend Email', status: 'active', prompt: 'Genera una propuesta de consultoría SAP para un cliente PYME chileno. Incluye: scope, timeline, pricing estimado, y beneficios. Formato profesional.' },
  { name: 'UX Analysis → Deploy', source: 'smconnection.cl', transform: 'Hoku IA Analysis', dest: 'Insights + Auto-deploy', status: 'active', prompt: 'Analiza smconnection.cl desde todos los ángulos: código, SEO, UX, mercado. Genera 3 mejoras concretas con código implementable.' },
  { name: 'Deploy Pipeline', source: 'GitHub Push', transform: 'Build Next.js/Astro', dest: 'AWS Amplify + S3 + CloudFront', status: 'active', prompt: '' },
  { name: 'Agent Orchestrator', source: 'Prompt del usuario', transform: 'Parallel execute + retry', dest: 'Groq/Gemini → Supabase logs', status: 'active', prompt: '' },
  { name: 'SAP → Analytics Pipeline', source: 'SAP S/4HANA / BTP', transform: 'ETL + Datasphere', dest: 'SAP Analytics Cloud', status: 'available', prompt: 'Diseña la arquitectura de integración entre SAP S/4HANA y SAP Analytics Cloud usando BTP Integration Suite.' },
  { name: 'SAP BTP → Custom App Deploy', source: 'SAP BTP Cockpit', transform: 'CI/CD + Build Apps', dest: 'Cloud Foundry / Kyma', status: 'available', prompt: 'Genera el pipeline CI/CD para deployar una app custom en SAP BTP Cloud Foundry con GitHub Actions.' },
  { name: 'WhatsApp Lead', source: 'WhatsApp Button', transform: 'Redirect wa.me', dest: 'WhatsApp Business', status: 'available', prompt: 'Implementa el flujo de WhatsApp lead capture: botón en el sitio → opciones rápidas (SAP, Apps IA, PYMES) → clasificación automática en CRM.' },
];

export default function LabsPage() {
  const router = useRouter();
  const [tab, setTab] = useState('Conectores');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [catFilter, setCatFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detail, setDetail] = useState<Connector | null>(null);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [running, setRunning] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [nextSteps, setNextSteps] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 200);
    return () => clearTimeout(timer);
  }, [search]);

  const categories = ['Todas', ...Array.from(new Set(CONNECTORS.map(c => c.category)))];

  const stats = {
    total: CONNECTORS.length,
    active: CONNECTORS.filter(c => c.status === 'active').length,
    available: CONNECTORS.filter(c => c.status === 'available').length,
    errors: CONNECTORS.filter(c => c.status === 'error').length,
  };

  const filtered = CONNECTORS.filter(c => {
    if (catFilter !== 'Todas' && c.category !== catFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchDebounced && !c.name.toLowerCase().includes(searchDebounced.toLowerCase()) && !c.description.toLowerCase().includes(searchDebounced.toLowerCase())) return false;
    return true;
  }).sort((a, b) => (b.businessValue || 0) - (a.businessValue || 0));

  const executeAgent = async (agentId: string) => {
    if (!prompt.trim()) return;
    setRunning(true);
    setResult('');
    try {
      const res = await fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'execute', agentId, prompt, taskType: 'general' }) }).then(r => r.json());
      setResult(res.result || res.error || JSON.stringify(res));
    } catch (e) { setResult('Error: ' + String(e)); }
    setRunning(false);
  };

  const testConnection = async (c: Connector) => {
    setTestResult('testing');
    setConnecting(false);
    await new Promise(r => setTimeout(r, 1500));
    const res = c.status === 'active' ? 'success' : 'failed';
    setTestResult(res);
    if (res === 'success') setNextSteps(true);
  };

  const handleConnect = async () => {
    setConnecting(true);
    await new Promise(r => setTimeout(r, 2000));
    setConnecting(false);
  };

  const goToAgents = (agentPrompt: string) => {
    try { sessionStorage.setItem('agent-prompt', agentPrompt); } catch {}
    router.push('/dashboard/agents');
  };

  const goToWorkspace = (connectorName: string) => {
    try { sessionStorage.setItem('labs-connector', connectorName); } catch {}
    router.push('/dashboard/ux-agent?tab=workspace');
  };

  // Styles
  const pill = (active: boolean, color?: string): React.CSSProperties => ({
    background: active ? `${color || '#00e5b0'}15` : 'transparent',
    color: active ? (color || '#00e5b0') : '#64748b',
    border: `1px solid ${active ? (color || '#00e5b0') + '40' : 'rgba(255,255,255,0.06)'}`,
    padding: '5px 14px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 600,
    cursor: 'pointer', fontFamily: "'Inter', system-ui", transition: 'all 0.15s',
  });

  const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: '● Activo', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    available: { label: '○ Disponible', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    error: { label: '✕ Error', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    coming_soon: { label: '◌ Próximamente', color: '#475569', bg: 'rgba(71,85,105,0.1)' },
  };

  const actionBtn = (bg: string, border: string, color: string, extra?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', background: bg, border: `1px solid ${border}`, borderRadius: 8,
    padding: '9px 12px', color, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
    fontFamily: "'Inter', system-ui", transition: 'all 0.2s', textAlign: 'left' as const,
    display: 'flex', alignItems: 'center', gap: 8, ...extra,
  });

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(15,22,35,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 2rem' }}>
          <div style={{ height: 56, display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
            Intranet <span style={{ margin: '0 8px', color: '#475569' }}>/</span> <span style={{ color: '#fff', fontWeight: 600 }}>Integration Hub</span>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.06)', marginTop: -1 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ background: 'none', border: 'none', padding: '10px 20px', fontSize: '0.78rem', fontWeight: 600, color: tab === t ? '#00e5b0' : '#64748b', cursor: 'pointer', borderBottom: tab === t ? '2px solid #00e5b0' : '2px solid transparent', fontFamily: "'Inter', system-ui", transition: 'all 0.15s' }}>{t}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: '1.5rem 2rem', flex: 1 }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total Conectores', value: stats.total, color: '#f1f5f9', icon: '🔌' },
              { label: 'Activos', value: stats.active, color: '#22c55e', icon: '✅' },
              { label: 'Disponibles', value: stats.available, color: '#3b82f6', icon: '🔓' },
              { label: 'Errores', value: stats.errors, color: '#ef4444', icon: '⚠️' },
            ].map(s => (
              <div key={s.label} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.5rem' }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 500 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {tab === 'Conectores' && (
            <>
              {/* Filters */}
              <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar conector..." style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: '0.75rem', width: 200, outline: 'none', fontFamily: "'Inter', system-ui" }} />
                <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)' }}></span>
                {['all', 'active', 'available', 'coming_soon'].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)} style={pill(statusFilter === s, statusCfg[s]?.color)}>
                    {s === 'all' ? 'Todos' : statusCfg[s]?.label}
                  </button>
                ))}
                <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)' }}></span>
                {categories.slice(0, 10).map(c => (
                  <button key={c} onClick={() => setCatFilter(c)} style={pill(catFilter === c)}>{c}</button>
                ))}
              </div>

              {/* Grid — more responsive with 240px min */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
                {filtered.map(c => {
                  const sc = statusCfg[c.status];
                  return (
                    <div key={c.id} onClick={() => c.status !== 'coming_soon' && (setDetail(c), setTestResult(null), setNextSteps(false), setConnecting(false))} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.25rem', cursor: c.status === 'coming_soon' ? 'default' : 'pointer', opacity: c.status === 'coming_soon' ? 0.45 : 1, transition: 'all 0.2s', borderLeft: `3px solid ${c.status === 'active' ? c.color : 'transparent'}`, position: 'relative' }}>
                      {(c.businessValue || 0) >= 4 && (
                        <span style={{ position: 'absolute', top: 10, right: 10, fontSize: '0.52rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', letterSpacing: '0.03em' }}>
                          {'★'.repeat(c.businessValue || 0)} VALUE
                        </span>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${c.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem' }}>{c.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9' }}>{c.name}</div>
                          <div style={{ fontSize: '0.6rem', color: '#475569' }}>{c.category} · {c.authType}</div>
                        </div>
                        <span style={{ fontSize: '0.58rem', fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: sc.bg, color: sc.color }}>{sc.label}</span>
                      </div>
                      <p style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 10px' }}>{c.description}</p>
                      {c.status === 'active' && (
                        <div style={{ display: 'flex', gap: 16, fontSize: '0.62rem', color: '#475569' }}>
                          {c.lastSync && <span>🔄 {c.lastSync}</span>}
                          {c.dataVolume && <span>📊 {c.dataVolume}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === 'Flujos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {FLOWS.map((flow, i) => (
                <div key={i} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>{flow.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.58rem', fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: flow.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)', color: flow.status === 'active' ? '#22c55e' : '#3b82f6' }}>{flow.status === 'active' ? '● Activo' : '○ Disponible'}</span>
                      {flow.prompt && (
                        <button onClick={() => goToAgents(flow.prompt)} style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)', color: '#0a0d14', border: 'none', padding: '3px 10px', borderRadius: 6, fontWeight: 700, fontSize: '0.6rem', cursor: 'pointer', fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 4 }}>
                          ▶ Ejecutar
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <div style={{ background: '#0a0d14', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 14px', fontSize: '0.72rem', color: '#94a3b8', flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.58rem', color: '#475569', fontWeight: 600, marginBottom: 2 }}>SOURCE</div>
                      {flow.source}
                    </div>
                    <div style={{ color: '#00e5b0', padding: '0 8px', fontSize: '0.8rem' }}>→</div>
                    <div style={{ background: '#0a0d14', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 8, padding: '8px 14px', fontSize: '0.72rem', color: '#00e5b0', flex: 1.2, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.58rem', color: '#475569', fontWeight: 600, marginBottom: 2 }}>TRANSFORM</div>
                      {flow.transform}
                    </div>
                    <div style={{ color: '#00e5b0', padding: '0 8px', fontSize: '0.8rem' }}>→</div>
                    <div style={{ background: '#0a0d14', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 14px', fontSize: '0.72rem', color: '#94a3b8', flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.58rem', color: '#475569', fontWeight: 600, marginBottom: 2 }}>DESTINATION</div>
                      {flow.dest}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'Monitoreo' && (
            <div>
              <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    {['Conector', 'Estado', 'Último Sync', 'Volumen', 'Acciones'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '0.62rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {CONNECTORS.filter(c => c.status === 'active').map(c => {
                      const sc = statusCfg[c.status];
                      return (
                        <tr key={c.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 600 }}>
                            <span style={{ marginRight: 8 }}>{c.icon}</span>{c.name}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: sc.bg, color: sc.color }}>{sc.label}</span>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: '0.72rem', color: '#64748b' }}>{c.lastSync || '—'}</td>
                          <td style={{ padding: '10px 14px', fontSize: '0.72rem', color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}>{c.dataVolume || '—'}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => { setDetail(c); setNextSteps(false); setTestResult(null); setConnecting(false); testConnection(c); }} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '4px 8px', color: '#94a3b8', fontSize: '0.62rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>🔌 Test</button>
                              {c.action && !c.action.startsWith('http') && (
                                <button onClick={() => goToAgents(`Genera un reporte completo del conector ${c.name}: estado, métricas, recomendaciones de optimización, y próximos pasos. Incluye datos técnicos.`)} style={{ background: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.2)', borderRadius: 6, padding: '4px 8px', color: '#00e5b0', fontSize: '0.62rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>⚡ Reporte</button>
                              )}
                              <button onClick={() => alert(`Métricas de ${c.name}: Uptime 99.9%, Latencia ~120ms, Requests 24h: 847`)} style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 6, padding: '4px 8px', color: '#8b5cf6', fontSize: '0.62rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>📊 Métricas</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel (slide-in) */}
      {detail && (
        <div style={{ width: 380, minWidth: 380, background: '#0f1623', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'auto', animation: 'slideIn 0.2s ease' }}>

          {/* Header */}
          <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${detail.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>{detail.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f1f5f9' }}>{detail.name}</div>
                <div style={{ fontSize: '0.65rem', color: '#475569' }}>{detail.category}</div>
              </div>
              <button onClick={() => setDetail(null)} style={{ background: 'rgba(255,255,255,0.04)', border: 'none', color: '#64748b', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>{detail.description}</p>
          </div>

          {/* Info */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Configuración</div>
            {[
              { k: 'Auth', v: detail.authType },
              { k: 'Estado', v: statusCfg[detail.status]?.label },
              { k: 'Último Sync', v: detail.lastSync || '—' },
              { k: 'Volumen', v: detail.dataVolume || '—' },
              { k: 'Valor Negocio', v: detail.businessValue ? '★'.repeat(detail.businessValue) + '☆'.repeat(5 - detail.businessValue) : '—' },
            ].map(item => (
              <div key={item.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '0.72rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ color: '#64748b' }}>{item.k}</span>
                <span style={{ color: item.k === 'Valor Negocio' ? '#f59e0b' : '#e2e8f0', fontFamily: item.k === 'Volumen' ? "'JetBrains Mono', monospace" : 'inherit' }}>{item.v}</span>
              </div>
            ))}
          </div>

          {/* Endpoints */}
          {detail.endpoints && (
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Endpoints</div>
              {detail.endpoints.map((ep, i) => (
                <div key={i} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.68rem', color: '#00e5b0', background: '#0a0d14', padding: '6px 10px', borderRadius: 6, marginBottom: 4 }}>{ep}</div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Acciones</div>

            {/* Test Conexión */}
            <button onClick={() => { setNextSteps(false); testConnection(detail); }} style={actionBtn(
              testResult === 'success' ? 'rgba(34,197,94,0.15)' : testResult === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
              testResult === 'success' ? '#22c55e40' : testResult === 'failed' ? '#ef444440' : 'rgba(255,255,255,0.08)',
              testResult === 'success' ? '#22c55e' : testResult === 'failed' ? '#ef4444' : '#94a3b8',
            )}>
              {testResult === 'testing' ? '⏳ Testeando conexión...' : testResult === 'success' ? '✅ Conexión exitosa' : testResult === 'failed' ? '❌ Conexión fallida' : '🔌 Test Conexión'}
            </button>

            {/* Conectar */}
            <button onClick={handleConnect} style={actionBtn(
              connecting ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)',
              connecting ? '#3b82f640' : 'rgba(59,130,246,0.2)',
              '#3b82f6',
              connecting ? { animation: 'pulse 1.5s infinite' } : {},
            )}>
              {connecting ? '🔗 Conectando...' : '🔗 Conectar'}
            </button>

            {/* Generar Propuesta */}
            <button onClick={() => goToAgents(`Genera una propuesta profesional para integrar ${detail.name} con Smart Connection. Incluye: arquitectura, timeline, costos estimados, beneficios. Formato estructurado con headers.`)} style={actionBtn('rgba(245,158,11,0.08)', 'rgba(245,158,11,0.2)', '#f59e0b')}>
              ⚡ Generar Propuesta
            </button>

            {/* Generar Maqueta */}
            <button onClick={() => goToAgents(`Diseña una maqueta/wireframe en texto para la integración de ${detail.name}. Incluye: layout de dashboard, flujo de datos, componentes UI necesarios, endpoints. Usa diagramas ASCII si es posible.`)} style={actionBtn('rgba(6,182,212,0.08)', 'rgba(6,182,212,0.2)', '#06b6d4')}>
              🎨 Generar Maqueta
            </button>

            {/* Generar Demo */}
            <button onClick={() => goToAgents(`Crea un demo funcional de la integración con ${detail.name}. Genera el código HTML completo con estilos inline para mostrar cómo se vería el dashboard de ${detail.name} integrado en Smart Connection.`)} style={actionBtn('rgba(139,92,246,0.08)', 'rgba(139,92,246,0.2)', '#8b5cf6')}>
              📊 Generar Demo
            </button>
          </div>

          {/* Next steps after successful test */}
          {nextSteps && testResult === 'success' && (
            <div style={{ padding: '0 1.25rem 1rem', animation: 'fadeIn 0.3s ease' }}>
              <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 10, padding: '12px' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#22c55e', marginBottom: 8 }}>✅ Conexión verificada — Próximos pasos</div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: 10 }}>
                  {detail.name} está conectado y responde correctamente.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button onClick={() => goToAgents(`Genera una propuesta profesional para integrar ${detail.name} con Smart Connection. Incluye: arquitectura, timeline, costos estimados, beneficios. Formato estructurado con headers.`)} style={{
                    width: '100%', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                    color: '#f59e0b', padding: '8px', borderRadius: 8,
                    fontWeight: 600, fontSize: '0.68rem', cursor: 'pointer', fontFamily: "'Inter', system-ui",
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    📊 Generar propuesta
                  </button>
                  <button onClick={() => goToAgents(`Diseña una maqueta/wireframe en texto para la integración de ${detail.name}. Incluye: layout de dashboard, flujo de datos, componentes UI necesarios, endpoints. Usa diagramas ASCII si es posible.`)} style={{
                    width: '100%', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)',
                    color: '#06b6d4', padding: '8px', borderRadius: 8,
                    fontWeight: 600, fontSize: '0.68rem', cursor: 'pointer', fontFamily: "'Inter', system-ui",
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    🎨 Diseñar maqueta
                  </button>
                  <button onClick={() => { try { sessionStorage.setItem('agent-prompt', ''); } catch {} router.push('/dashboard/agents'); }} style={{
                    width: '100%', background: 'linear-gradient(135deg, #00e5b0, #00c49a)',
                    color: '#0a0d14', border: 'none', padding: '9px', borderRadius: 8,
                    fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'Inter', system-ui",
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    ⚡ Ir al Workspace →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Next steps after failed test */}
          {testResult === 'failed' && (
            <div style={{ padding: '0 1.25rem 1rem' }}>
              <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '12px' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>Conexión fallida</div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', lineHeight: 1.6 }}>
                  Verifica las credenciales y la configuración del conector. Para conectores en estado &quot;Disponible&quot;, primero necesitas configurar las API keys.
                </div>
              </div>
            </div>
          )}

          {/* Execute (for agents) */}
          {detail.action && !detail.action.startsWith('http') && !detail.action.startsWith('/') && (
            <div style={{ padding: '1rem 1.25rem', flex: 1 }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Ejecutar</div>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={`Prompt para ${detail.name}...`} style={{ width: '100%', background: '#0a0d14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px', color: '#e2e8f0', fontSize: '0.75rem', fontFamily: "'Inter', system-ui", minHeight: 80, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
              <button onClick={() => executeAgent(detail.action!)} disabled={running || !prompt.trim()} style={{ width: '100%', marginTop: 8, background: running ? '#1a2235' : `linear-gradient(135deg, ${detail.color}, ${detail.color}cc)`, color: running ? '#94a3b8' : '#0a0d14', border: 'none', padding: '10px', borderRadius: 8, fontWeight: 700, fontSize: '0.75rem', cursor: running ? 'not-allowed' : 'pointer', fontFamily: "'Inter', system-ui" }}>
                {running ? '⏳ Procesando...' : '⚡ Ejecutar'}
              </button>
              {result && (
                <div style={{ marginTop: 10, background: '#0a0d14', border: `1px solid ${detail.color}25`, borderRadius: 8, padding: '10px', fontSize: '0.7rem', color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>{result}</div>
              )}
            </div>
          )}

          {/* External link */}
          {detail.action && (detail.action.startsWith('http') || detail.action.startsWith('/')) && (
            <div style={{ padding: '1rem 1.25rem' }}>
              <a href={detail.action} target={detail.action.startsWith('/') ? '_self' : '_blank'} rel="noopener" style={{ display: 'block', width: '100%', background: `${detail.color}15`, border: `1px solid ${detail.color}30`, borderRadius: 10, padding: '10px', color: detail.color, fontSize: '0.75rem', fontWeight: 600, textAlign: 'center', textDecoration: 'none', fontFamily: "'Inter', system-ui" }}>
                🔗 Abrir {detail.name} →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
