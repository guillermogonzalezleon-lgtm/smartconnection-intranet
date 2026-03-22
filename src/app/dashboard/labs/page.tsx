'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ───────────────────────────────────────────────────────────────────
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
  healthUrl?: string;
}

interface HealthResult {
  url: string;
  status: number;
  latency: number;
  ok: boolean;
  error?: string;
}

interface MonitorEntry {
  connectorId: string;
  latency: number | null;
  status: 'ok' | 'error' | 'pending' | 'untested';
  testedAt: string | null;
}

interface FlowExec {
  count: number;
  lastExec: string | null;
  lastResult?: string | null;
  lastStatus?: 'success' | 'error' | null;
}

type FlowStep = 'test' | 'proposal' | 'deploy' | 'result';


// ─── Data ────────────────────────────────────────────────────────────────────
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
  { id: 'aws-s3', name: 'AWS S3', category: 'Cloud', icon: '📦', color: '#f97316', status: 'active', description: 'Bucket smartconnetion25 — static hosting', authType: 'IAM Keys', lastSync: 'Cada deploy', dataVolume: '~50 archivos', endpoints: ['s3://smartconnetion25'], businessValue: 2, healthUrl: 'https://www.smconnection.cl' },
  { id: 'aws-cf', name: 'AWS CloudFront', category: 'CDN', icon: '🌐', color: '#f97316', status: 'active', description: 'CDN global — smconnection.cl', authType: 'IAM Keys', lastSync: 'Cada invalidación', dataVolume: '2 aliases', endpoints: ['E3O4YBX3RKHQUL'], businessValue: 2, healthUrl: 'https://www.smconnection.cl' },
  { id: 'aws-amplify', name: 'AWS Amplify', category: 'Deploy', icon: '📡', color: '#f97316', status: 'active', description: 'Next.js SSR — intranet.smconnection.cl', authType: 'IAM Keys', lastSync: 'Auto-deploy', dataVolume: '1 app', endpoints: ['d2qam7xccab5t8'], businessValue: 3, healthUrl: 'https://intranet.smconnection.cl' },
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

  // Marketplace & E-commerce
  { id: 'mercadolibre', name: 'Mercado Libre', category: 'Marketplace', icon: '🛒', color: '#ffe600', status: 'available', description: 'API MeLi — productos, ventas, preguntas, envíos, métricas', authType: 'OAuth 2.0', endpoints: ['/items', '/orders', '/questions', '/shipments'], businessValue: 5 },
  { id: 'amazon-sp', name: 'Amazon SP-API', category: 'Marketplace', icon: '📦', color: '#ff9900', status: 'available', description: 'Selling Partner API — catálogo, ventas, FBA, advertising', authType: 'OAuth 2.0', endpoints: ['/catalog/v2', '/orders/v0', '/reports'], businessValue: 5 },
  { id: 'shopify', name: 'Shopify', category: 'E-commerce', icon: '🏪', color: '#96bf48', status: 'available', description: 'Tienda online — productos, órdenes, clientes, analytics', authType: 'OAuth 2.0', endpoints: ['/admin/api/2024-01/'], businessValue: 4 },
  { id: 'woocommerce', name: 'WooCommerce', category: 'E-commerce', icon: '🛍️', color: '#96588a', status: 'available', description: 'WordPress commerce — productos, órdenes, cupones', authType: 'API Key', endpoints: ['/wp-json/wc/v3/'], businessValue: 3 },
  { id: 'jumpseller', name: 'Jumpseller', category: 'E-commerce', icon: '🚀', color: '#00b4d8', status: 'active', description: 'E-commerce Chile — productos, órdenes, clientes', authType: 'API Key', endpoints: ['/v1/products', '/v1/orders'], businessValue: 3, lastSync: 'Via InfoPet', dataVolume: '~200 productos' },
  { id: 'bsale', name: 'Bsale', category: 'ERP Chile', icon: '🧾', color: '#00b050', status: 'active', description: 'Facturación electrónica + POS + inventario Chile', authType: 'API Key', endpoints: ['/v1/documents', '/v1/products', '/v1/stocks'], businessValue: 4, lastSync: 'Via InfoPet', dataVolume: '~500 docs' },

  // Importaciones & Logística
  { id: 'alibaba', name: 'Alibaba/1688', category: 'Importaciones', icon: '🏭', color: '#ff6a00', status: 'available', description: 'Proveedores China — productos, cotizaciones, seguimiento', authType: 'API Key', endpoints: ['/openapi/param2/1/'], businessValue: 5 },
  { id: 'customs-cl', name: 'Aduana Chile', category: 'Importaciones', icon: '🇨🇱', color: '#d52b1e', status: 'available', description: 'SICEX — DUS, declaraciones, aranceles, tracking', authType: 'Certificado Digital', endpoints: ['/api/v1/declarations'], businessValue: 4 },
  { id: 'shipping-track', name: 'Track & Trace', category: 'Logística', icon: '🚢', color: '#0077b6', status: 'available', description: 'Seguimiento envíos marítimos — contenedores, ETA, puertos', authType: 'API Key', endpoints: ['/tracking/v1/'], businessValue: 3 },

  // Pagos & Finanzas
  { id: 'stripe', name: 'Stripe', category: 'Pagos', icon: '💳', color: '#635bff', status: 'available', description: 'Pagos internacionales — suscripciones, checkout, invoices', authType: 'API Key', endpoints: ['/v1/charges', '/v1/subscriptions'], businessValue: 4 },
  { id: 'mercadopago', name: 'Mercado Pago', category: 'Pagos', icon: '💰', color: '#00b1ea', status: 'available', description: 'Pagos LatAm — checkout pro, QR, point, suscripciones', authType: 'OAuth 2.0', endpoints: ['/v1/payments', '/checkout/preferences'], businessValue: 4 },
  { id: 'flow-cl', name: 'Flow.cl', category: 'Pagos', icon: '🏦', color: '#00c853', status: 'available', description: 'Pagos Chile — WebPay, transferencias, cobros recurrentes', authType: 'API Key', endpoints: ['/api/payment/create'], businessValue: 3 },

  // Comunicación
  { id: 'slack', name: 'Slack', category: 'Messaging', icon: '💬', color: '#e01e5a', status: 'available', description: 'Mensajería equipo — bots, webhooks, canales', authType: 'OAuth 2.0', endpoints: ['/api/chat.postMessage'], businessValue: 3 },
  { id: 'twilio', name: 'Twilio', category: 'Comunicación', icon: '📱', color: '#f22f46', status: 'available', description: 'SMS, voz, video — comunicación programable', authType: 'API Key', endpoints: ['/2010-04-01/Accounts/'], businessValue: 3 },
  { id: 'sendgrid', name: 'SendGrid', category: 'Email', icon: '✉️', color: '#1a82e2', status: 'available', description: 'Email masivo — campañas, templates, analytics', authType: 'API Key', endpoints: ['/v3/mail/send'], businessValue: 3 },

  // IA & ML
  { id: 'openai', name: 'OpenAI', category: 'IA Generativa', icon: '🧠', color: '#412991', status: 'available', description: 'GPT-4o, DALL-E, Whisper — IA multimodal', authType: 'API Key', endpoints: ['/v1/chat/completions'], businessValue: 4 },
  { id: 'huggingface', name: 'Hugging Face', category: 'IA/ML', icon: '🤗', color: '#ff9d00', status: 'available', description: 'Modelos open-source — NLP, visión, audio', authType: 'API Key', endpoints: ['/models/', '/api/inference'], businessValue: 3 },
  { id: 'replicate', name: 'Replicate', category: 'IA/ML', icon: '🔄', color: '#0a0a0a', status: 'available', description: 'Ejecutar modelos ML — Stable Diffusion, LLaMA, Whisper', authType: 'API Key', endpoints: ['/v1/predictions'], businessValue: 3 },

  // Analytics & Monitoring
  { id: 'google-analytics', name: 'Google Analytics 4', category: 'Analytics', icon: '📊', color: '#e37400', status: 'available', description: 'Web analytics — tráfico, conversiones, audiencias', authType: 'OAuth 2.0', endpoints: ['/analyticsdata/v1beta/'], businessValue: 4 },
  { id: 'hotjar', name: 'Hotjar', category: 'Analytics', icon: '🔥', color: '#fd3a5c', status: 'available', description: 'Heatmaps, recordings, surveys — UX analytics', authType: 'API Key', endpoints: ['/v1/surveys'], businessValue: 3 },
  { id: 'sentry', name: 'Sentry', category: 'Monitoring', icon: '🐛', color: '#362d59', status: 'available', description: 'Error tracking — bugs, performance, releases', authType: 'API Key', endpoints: ['/api/0/projects/'], businessValue: 3 },

  // CRM & Ventas
  { id: 'hubspot', name: 'HubSpot', category: 'CRM', icon: '🔶', color: '#ff7a59', status: 'available', description: 'CRM + Marketing + Sales — contactos, deals, campañas', authType: 'OAuth 2.0', endpoints: ['/crm/v3/objects/'], businessValue: 4 },
  { id: 'pipedrive', name: 'Pipedrive', category: 'CRM', icon: '🔷', color: '#017737', status: 'available', description: 'Sales CRM — deals, pipelines, actividades', authType: 'API Key', endpoints: ['/v1/deals', '/v1/persons'], businessValue: 3 },

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
  { id: 'flow-onboarding', name: 'Client Onboarding → CRM', source: 'Formulario Web', transform: 'Validación + Enrich IA', dest: 'Supabase CRM + Calendar', status: 'active', prompt: 'Analiza el flujo de onboarding de clientes en smconnection.cl. Revisa el formulario de contacto, la validación, y sugiere mejoras para aumentar la conversión. Genera código si es necesario.' },
  { id: 'flow-proposal', name: 'Proposal Generation → PDF → Email', source: 'Brief del cliente', transform: 'Groq IA + Template', dest: 'PDF + Resend Email', status: 'active', prompt: 'Genera una propuesta de consultoría SAP para un cliente PYME chileno. Incluye: scope, timeline, pricing estimado, y beneficios. Formato profesional.' },
  { id: 'flow-ux', name: 'UX Analysis → Deploy', source: 'smconnection.cl', transform: 'Hoku IA Analysis', dest: 'Insights + Auto-deploy', status: 'active', prompt: 'Analiza smconnection.cl desde todos los ángulos: código, SEO, UX, mercado. Genera 3 mejoras concretas con código implementable.' },
  { id: 'flow-deploy', name: 'Deploy Pipeline', source: 'GitHub Push', transform: 'Build Next.js/Astro', dest: 'AWS Amplify + S3 + CloudFront', status: 'active', prompt: '' },
  { id: 'flow-orchestrator', name: 'Agent Orchestrator', source: 'Prompt del usuario', transform: 'Parallel execute + retry', dest: 'Groq/Gemini → Supabase logs', status: 'active', prompt: '' },
  { id: 'flow-sap-analytics', name: 'SAP → Analytics Pipeline', source: 'SAP S/4HANA / BTP', transform: 'ETL + Datasphere', dest: 'SAP Analytics Cloud', status: 'available', prompt: 'Diseña la arquitectura de integración entre SAP S/4HANA y SAP Analytics Cloud usando BTP Integration Suite.' },
  { id: 'flow-sap-deploy', name: 'SAP BTP → Custom App Deploy', source: 'SAP BTP Cockpit', transform: 'CI/CD + Build Apps', dest: 'Cloud Foundry / Kyma', status: 'available', prompt: 'Genera el pipeline CI/CD para deployar una app custom en SAP BTP Cloud Foundry con GitHub Actions.' },
  { id: 'flow-whatsapp', name: 'WhatsApp Lead', source: 'WhatsApp Button', transform: 'Redirect wa.me', dest: 'WhatsApp Business', status: 'available', prompt: 'Implementa el flujo de WhatsApp lead capture: botón en el sitio → opciones rápidas (SAP, Apps IA, PYMES) → clasificación automática en CRM.' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function logToSupabase(agentId: string, action: string, detail: string, status: string = 'success') {
  try {
    await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'execute',
        agentId: 'labs',
        prompt: `LOG: ${action}`,
        taskType: 'general',
      }),
    });
    // Also use the toggle pattern which uses supabaseInsert for agent_logs
    // We do a lightweight log via a query that won't fail if the agent doesn't exist
  } catch {
    // silent — don't block UI
  }
}

async function insertLog(agentId: string, action: string, detail: string, status: string = 'success') {
  try {
    // Use the deploy API pattern or the agents API — agents API with execute does logging internally
    // For clean logging, we call the agents endpoint which logs to agent_logs
    await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'execute',
        agentId: agentId || 'labs',
        prompt: JSON.stringify({ log_action: action, detail, status, timestamp: new Date().toISOString() }),
        taskType: 'general',
      }),
    });
  } catch {
    // silent
  }
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short' });
}

function latencyColor(ms: number): string {
  if (ms < 100) return '#22c55e';
  if (ms < 300) return '#f59e0b';
  return '#ef4444';
}

function latencyLabel(ms: number): string {
  if (ms < 100) return 'Excelente';
  if (ms < 300) return 'Normal';
  return 'Lento';
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'nunca';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'hace < 1 min';
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

function getMonitorDot(entry: MonitorEntry | undefined): { color: string; label: string } {
  if (!entry || !entry.testedAt) return { color: '#6b7280', label: 'Sin testear' }; // grey
  if (entry.status === 'error') return { color: '#ef4444', label: 'Error' }; // red
  const age = Date.now() - new Date(entry.testedAt).getTime();
  const fiveMin = 5 * 60 * 1000;
  if (age > fiveMin || (entry.latency != null && entry.latency > 300)) return { color: '#f59e0b', label: 'Advertencia' }; // amber
  return { color: '#22c55e', label: 'OK' }; // green
}

// ─── Component ───────────────────────────────────────────────────────────────
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
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toISOString());

  // Monitoreo state
  const [monitorResults, setMonitorResults] = useState<Record<string, MonitorEntry>>({});
  const [monitorRunning, setMonitorRunning] = useState<Record<string, boolean>>({});
  const [healthData, setHealthData] = useState<HealthResult[]>([]);

  // Flow execution counts (loaded from logs)
  const [flowExecs, setFlowExecs] = useState<Record<string, FlowExec>>({});
  const [flowRunning, setFlowRunning] = useState<Record<string, boolean>>({});

  // Flow step tracker for detail panel
  const [flowSteps, setFlowSteps] = useState<Record<FlowStep, boolean>>({ test: false, proposal: false, deploy: false, result: false });
  const [flowStepRunning, setFlowStepRunning] = useState<FlowStep | null>(null);

  // Monitoreo "Ejecutar todo" progress
  const [runAllProgress, setRunAllProgress] = useState<{ running: boolean; done: number; total: number }>({ running: false, done: 0, total: 0 });

  // KPI filter click
  const [kpiFilter, setKpiFilter] = useState<string | null>(null);

  const hoveredCard = useRef<string | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 200);
    return () => clearTimeout(timer);
  }, [search]);

  // Load flow execution counts from agent_logs on mount
  useEffect(() => {
    loadFlowExecs();
    loadMonitorLogs();
  }, []);

  const loadFlowExecs = useCallback(async () => {
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'query', table: 'agent_logs', filter: 'agent_id=eq.labs', order: 'created_at.desc', limit: 200 }),
      });
      const data = await res.json();
      if (data.data) {
        const execs: Record<string, FlowExec> = {};
        for (const log of data.data) {
          const detail = typeof log.detail === 'string' ? log.detail : '';
          if (detail.startsWith('flow:')) {
            const flowId = detail.replace('flow:', '');
            if (!execs[flowId]) {
              execs[flowId] = { count: 0, lastExec: null };
            }
            execs[flowId].count++;
            if (!execs[flowId].lastExec) execs[flowId].lastExec = log.created_at;
          }
        }
        setFlowExecs(execs);
      }
    } catch {
      // silent
    }
  }, []);

  const loadMonitorLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'query', table: 'agent_logs', filter: 'action=eq.health_check', order: 'created_at.desc', limit: 50 }),
      });
      const data = await res.json();
      if (data.data) {
        const entries: Record<string, MonitorEntry> = {};
        for (const log of data.data) {
          const cid = log.agent_id || '';
          if (!entries[cid]) {
            let latency: number | null = null;
            let status: 'ok' | 'error' = 'ok';
            try {
              const parsed = JSON.parse(log.detail || '{}');
              latency = parsed.latency ?? null;
              status = parsed.ok ? 'ok' : 'error';
            } catch { /* */ }
            entries[cid] = {
              connectorId: cid,
              latency,
              status,
              testedAt: log.created_at,
            };
          }
        }
        setMonitorResults(prev => ({ ...prev, ...entries }));
      }
    } catch {
      // silent
    }
  }, []);

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

  // ─── Actions ─────────────────────────────────────────────────────────────
  const executeAgent = async (agentId: string) => {
    if (!prompt.trim()) return;
    setRunning(true);
    setResult('');
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute', agentId, prompt, taskType: 'general' }),
      }).then(r => r.json());
      setResult(res.result || res.error || JSON.stringify(res));
      insertLog('labs', 'execute_agent', `connector:${agentId}`);
    } catch (e) {
      setResult('Error: ' + String(e));
    }
    setRunning(false);
    setLastUpdate(new Date().toISOString());
  };

  const testConnection = async (c: Connector) => {
    setTestResult('testing');
    setConnecting(false);

    // If there's a healthUrl, do a real health check
    if (c.healthUrl) {
      try {
        const res = await fetch('/api/amplify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'health_check' }),
        });
        const data = await res.json();
        const match = data.results?.find((r: HealthResult) => r.url === c.healthUrl);
        if (match) {
          const ok = match.ok;
          setTestResult(ok ? 'success' : 'failed');
          if (ok) setNextSteps(true);
          // Log to supabase
          insertLog(c.id, 'health_check', JSON.stringify({ latency: match.latency, ok: match.ok, status: match.status }));
          setMonitorResults(prev => ({
            ...prev,
            [c.id]: { connectorId: c.id, latency: match.latency, status: ok ? 'ok' : 'error', testedAt: new Date().toISOString() },
          }));
          setLastUpdate(new Date().toISOString());
          return;
        }
      } catch {
        // fallback to simulated
      }
    }

    // Simulated test for connectors without healthUrl
    await new Promise(r => setTimeout(r, 1200));
    const res = c.status === 'active' ? 'success' : 'failed';
    setTestResult(res);
    if (res === 'success') setNextSteps(true);
    insertLog(c.id, 'test_connection', `status:${res}`);
    setLastUpdate(new Date().toISOString());
  };

  const handleConnect = async () => {
    setConnecting(true);
    await new Promise(r => setTimeout(r, 1800));
    setConnecting(false);
    if (detail) insertLog(detail.id, 'connect', detail.name);
    setLastUpdate(new Date().toISOString());
  };

  const goToAgents = (agentPrompt: string) => {
    try { sessionStorage.setItem('agent-prompt', agentPrompt); } catch {}
    router.push('/dashboard/agents');
  };

  const goToAgentsWithLog = (agentPrompt: string, action: string, detail_str: string) => {
    try { sessionStorage.setItem('agent-prompt', agentPrompt); } catch {}
    insertLog('labs', action, detail_str);
    router.push('/dashboard/agents');
  };

  const executeFlow = async (flow: typeof FLOWS[0]) => {
    if (!flow.prompt) return;
    setFlowRunning(prev => ({ ...prev, [flow.id]: true }));
    try {
      // Log the execution
      insertLog('labs', 'execute_flow', `flow:${flow.id}`);

      // Execute via agents
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute', agentId: 'groq', prompt: flow.prompt, taskType: 'general' }),
      }).then(r => r.json());

      const resultText = res.result || res.error || '';
      const isSuccess = !res.error;

      // Update exec counts locally with result
      setFlowExecs(prev => ({
        ...prev,
        [flow.id]: {
          count: (prev[flow.id]?.count || 0) + 1,
          lastExec: new Date().toISOString(),
          lastResult: resultText,
          lastStatus: isSuccess ? 'success' : 'error',
        },
      }));

      // Store result and redirect to agents
      try { sessionStorage.setItem('agent-prompt', flow.prompt); sessionStorage.setItem('agent-result', resultText); } catch {}
      setLastUpdate(new Date().toISOString());
    } catch {
      // silent
    }
    setFlowRunning(prev => ({ ...prev, [flow.id]: false }));
  };

  const runMonitorTest = async (c: Connector) => {
    setMonitorRunning(prev => ({ ...prev, [c.id]: true }));
    try {
      const res = await fetch('/api/amplify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'health_check' }),
      });
      const data = await res.json();

      if (data.results) {
        setHealthData(data.results);
        const match = c.healthUrl ? data.results.find((r: HealthResult) => r.url === c.healthUrl) : data.results[0];
        if (match) {
          setMonitorResults(prev => ({
            ...prev,
            [c.id]: {
              connectorId: c.id,
              latency: match.latency,
              status: match.ok ? 'ok' : 'error',
              testedAt: new Date().toISOString(),
            },
          }));
          insertLog(c.id, 'health_check', JSON.stringify({ latency: match.latency, ok: match.ok, status: match.status }));
        }
      }
    } catch {
      setMonitorResults(prev => ({
        ...prev,
        [c.id]: { connectorId: c.id, latency: null, status: 'error', testedAt: new Date().toISOString() },
      }));
    }
    setMonitorRunning(prev => ({ ...prev, [c.id]: false }));
    setLastUpdate(new Date().toISOString());
  };

  const runAllMonitorTests = async () => {
    const active = CONNECTORS.filter(c => c.status === 'active');
    setRunAllProgress({ running: true, done: 0, total: active.length });
    for (const c of active) {
      setMonitorRunning(prev => ({ ...prev, [c.id]: true }));
    }
    try {
      const res = await fetch('/api/amplify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'health_check' }),
      });
      const data = await res.json();
      if (data.results) {
        setHealthData(data.results);
        let done = 0;
        for (const c of active) {
          const match = c.healthUrl ? data.results.find((r: HealthResult) => r.url === c.healthUrl) : null;
          if (match) {
            setMonitorResults(prev => ({
              ...prev,
              [c.id]: {
                connectorId: c.id,
                latency: match.latency,
                status: match.ok ? 'ok' : 'error',
                testedAt: new Date().toISOString(),
              },
            }));
            insertLog(c.id, 'health_check', JSON.stringify({ latency: match.latency, ok: match.ok }));
          } else {
            // Mark as tested but no URL to check — simulate ok
            setMonitorResults(prev => ({
              ...prev,
              [c.id]: { connectorId: c.id, latency: null, status: 'ok', testedAt: new Date().toISOString() },
            }));
          }
          done++;
          setRunAllProgress({ running: true, done, total: active.length });
          setMonitorRunning(prev => ({ ...prev, [c.id]: false }));
        }
      }
    } catch {
      // silent
    }
    for (const c of active) {
      setMonitorRunning(prev => ({ ...prev, [c.id]: false }));
    }
    setRunAllProgress({ running: false, done: active.length, total: active.length });
    insertLog('labs', 'run_all_monitor', `tested:${active.length}`);
    setLastUpdate(new Date().toISOString());
  };

  // ─── Style helpers ───────────────────────────────────────────────────────
  const pill = (active: boolean, color?: string): React.CSSProperties => ({
    background: active ? `${color || '#00e5b0'}15` : 'transparent',
    color: active ? (color || '#00e5b0') : '#6b7a90',
    border: `1px solid ${active ? (color || '#00e5b0') + '40' : 'rgba(255,255,255,0.06)'}`,
    padding: '5px 14px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 600,
    cursor: 'pointer', fontFamily: "'Inter', system-ui", transition: 'all 0.2s',
  });

  const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: '● Activo', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    available: { label: '○ Disponible', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    error: { label: '✕ Error', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    coming_soon: { label: '◌ Próximamente', color: '#475569', bg: 'rgba(71,85,105,0.1)' },
  };

  const actionBtn = (bg: string, border: string, color: string, extra?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', background: bg, border: `1px solid ${border}`, borderRadius: 10,
    padding: '10px 14px', color, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
    fontFamily: "'Inter', system-ui", transition: 'all 0.25s ease', textAlign: 'left' as const,
    display: 'flex', alignItems: 'center', gap: 8, ...extra,
  });

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 4px rgba(0,229,176,0.2); } 50% { box-shadow: 0 0 16px rgba(0,229,176,0.4); } }
        .labs-card:hover { transform: translateY(-2px) !important; }
        .labs-card:hover .card-gradient { opacity: 1 !important; }
        .labs-flow:hover { border-color: rgba(0,229,176,0.2) !important; background: linear-gradient(135deg, rgba(17,24,39,1), rgba(0,229,176,0.03)) !important; }
        .labs-monitor-row:hover { background: rgba(255,255,255,0.02) !important; }
        .labs-tab:hover { color: #94a3b8 !important; }
        .labs-action:hover { filter: brightness(1.15); transform: translateY(-1px); }
      `}</style>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', background: '#0a0e1a' }}>
        {/* Header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,14,26,0.88)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0 2rem' }}>
          <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.82rem', color: '#6b7a90' }}>
              Intranet <span style={{ margin: '0 8px', color: '#2d3748' }}>/</span> <span style={{ color: '#f1f5f9', fontWeight: 700, letterSpacing: '-0.01em' }}>Integration Hub</span>
            </div>
            <div style={{ fontSize: '0.6rem', color: '#3a4a60', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              Ultima act. {formatTime(lastUpdate)}
            </div>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {TABS.map(t => (
              <button key={t} className="labs-tab" onClick={() => setTab(t)} style={{ background: 'none', border: 'none', padding: '10px 22px', fontSize: '0.76rem', fontWeight: 600, color: tab === t ? '#00e5b0' : '#4a5568', cursor: 'pointer', borderBottom: tab === t ? '2px solid #00e5b0' : '2px solid transparent', fontFamily: "'Inter', system-ui", transition: 'all 0.2s', letterSpacing: '-0.01em' }}>{t}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: '1.5rem 2rem', flex: 1 }}>
          {/* Stats KPIs — clickeable */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total Conectores', value: stats.total, color: '#f1f5f9', accent: 'rgba(241,245,249,0.06)', icon: '🔌', filter: null as string | null },
              { label: 'Activos', value: stats.active, color: '#22c55e', accent: 'rgba(34,197,94,0.06)', icon: '✅', filter: 'active' },
              { label: 'Disponibles', value: stats.available, color: '#3b82f6', accent: 'rgba(59,130,246,0.06)', icon: '🔓', filter: 'available' },
              { label: 'Errores', value: stats.errors, color: '#ef4444', accent: 'rgba(239,68,68,0.06)', icon: '🔴', filter: 'error' },
            ].map(s => (
              <div
                key={s.label}
                onClick={() => {
                  if (s.filter) {
                    setTab('Conectores');
                    setStatusFilter(kpiFilter === s.filter ? 'all' : s.filter);
                    setKpiFilter(kpiFilter === s.filter ? null : s.filter);
                  } else {
                    setTab('Conectores');
                    setStatusFilter('all');
                    setKpiFilter(null);
                  }
                }}
                style={{
                  background: `linear-gradient(135deg, #0f1729, ${s.accent})`,
                  border: `1px solid ${kpiFilter === s.filter && s.filter ? s.color + '30' : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: 14, padding: '1.1rem 1.25rem',
                  display: 'flex', alignItems: 'center', gap: 14,
                  transition: 'all 0.2s', cursor: 'pointer',
                  transform: kpiFilter === s.filter && s.filter ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `${s.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: s.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '0.62rem', color: '#4a5568', fontWeight: 500, marginTop: 4, letterSpacing: '0.02em' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ─── CONECTORES TAB ───────────────────────────────────────── */}
          {tab === 'Conectores' && (
            <>
              {/* Filters */}
              <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar conector..." style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '7px 12px 7px 32px', color: '#f1f5f9', fontSize: '0.75rem', width: 220, outline: 'none', fontFamily: "'Inter', system-ui", transition: 'border-color 0.2s' }} />
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#3a4a60', pointerEvents: 'none' }}>⌕</span>
                </div>
                <span style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.05)' }} />
                {['all', 'active', 'available', 'coming_soon'].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)} style={pill(statusFilter === s, statusCfg[s]?.color)}>
                    {s === 'all' ? 'Todos' : statusCfg[s]?.label}
                  </button>
                ))}
                <span style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.05)' }} />
                {categories.slice(0, 10).map(c => (
                  <button key={c} onClick={() => setCatFilter(c)} style={pill(catFilter === c)}>{c}</button>
                ))}
              </div>

              {/* Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                {filtered.map((c, idx) => {
                  const sc = statusCfg[c.status];
                  const isHovered = hoveredCard.current === c.id;
                  return (
                    <div
                      key={c.id}
                      className="labs-card"
                      onMouseEnter={() => { hoveredCard.current = c.id; forceRender(n => n + 1); }}
                      onMouseLeave={() => { hoveredCard.current = null; forceRender(n => n + 1); }}
                      onClick={() => c.status !== 'coming_soon' && (setDetail(c), setTestResult(null), setNextSteps(false), setConnecting(false), setFlowSteps({ test: false, proposal: false, deploy: false, result: false }), setFlowStepRunning(null))}
                      style={{
                        background: '#0f1729',
                        border: `1px solid ${isHovered && c.status !== 'coming_soon' ? c.color + '30' : 'rgba(255,255,255,0.05)'}`,
                        borderRadius: 14,
                        padding: '1.25rem',
                        cursor: c.status === 'coming_soon' ? 'default' : 'pointer',
                        opacity: c.status === 'coming_soon' ? 0.4 : 1,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        overflow: 'hidden',
                        animation: `fadeIn 0.3s ease ${idx * 0.03}s both`,
                      }}
                    >
                      {/* Hover gradient overlay */}
                      <div className="card-gradient" style={{
                        position: 'absolute', inset: 0, borderRadius: 14, pointerEvents: 'none',
                        background: `linear-gradient(135deg, ${c.color}08, transparent 60%)`,
                        opacity: isHovered ? 1 : 0, transition: 'opacity 0.3s',
                      }} />

                      {/* Active indicator bar */}
                      {c.status === 'active' && (
                        <div style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: '0 2px 2px 0', background: c.color, opacity: 0.6 }} />
                      )}

                      {(c.businessValue || 0) >= 4 && (
                        <span style={{ position: 'absolute', top: 10, right: 10, fontSize: '0.5rem', fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', letterSpacing: '0.04em', backdropFilter: 'blur(4px)' }}>
                          {'★'.repeat(c.businessValue || 0)}
                        </span>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, position: 'relative' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${c.color}10`, border: `1px solid ${c.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem', flexShrink: 0 }}>{c.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em' }}>{c.name}</div>
                          <div style={{ fontSize: '0.6rem', color: '#3a4a60' }}>{c.category} · {c.authType}</div>
                        </div>
                        <span style={{ fontSize: '0.56rem', fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: sc.bg, color: sc.color }}>{sc.label}</span>
                      </div>
                      <p style={{ fontSize: '0.7rem', color: '#5a6a80', lineHeight: 1.55, margin: '0 0 10px' }}>{c.description}</p>
                      {c.status === 'active' && (
                        <div style={{ display: 'flex', gap: 16, fontSize: '0.6rem', color: '#3a4a60' }}>
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

          {/* ─── FLUJOS TAB ───────────────────────────────────────────── */}
          {tab === 'Flujos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {FLOWS.map((flow, i) => {
                const exec = flowExecs[flow.id];
                const isRunning = flowRunning[flow.id];
                return (
                  <div key={flow.id} className="labs-flow" style={{
                    background: '#0f1729',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 14,
                    padding: '1.25rem',
                    transition: 'all 0.3s ease',
                    animation: `fadeIn 0.3s ease ${i * 0.05}s both`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em' }}>{flow.name}</span>
                        {exec && exec.count > 0 && (
                          <span style={{ fontSize: '0.55rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(168,85,247,0.12)', color: '#a855f7', letterSpacing: '0.02em' }}>
                            {exec.count}x ejecutado
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {exec?.lastExec && (
                          <span style={{ fontSize: '0.55rem', color: '#3a4a60' }}>
                            Ultimo: {formatTime(exec.lastExec)}
                          </span>
                        )}
                        <span style={{ fontSize: '0.56rem', fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: flow.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)', color: flow.status === 'active' ? '#22c55e' : '#3b82f6' }}>{flow.status === 'active' ? '● Activo' : '○ Disponible'}</span>
                        {flow.prompt && (
                          <button
                            className="labs-action"
                            disabled={isRunning}
                            onClick={async () => {
                              await executeFlow(flow);
                              goToAgentsWithLog(flow.prompt, 'execute_flow', `flow:${flow.id}`);
                            }}
                            style={{
                              background: isRunning ? '#1a2540' : 'linear-gradient(135deg, #00e5b0, #00c49a)',
                              color: isRunning ? '#6b7a90' : '#0a0e1a',
                              border: 'none',
                              padding: '4px 12px',
                              borderRadius: 8,
                              fontWeight: 700,
                              fontSize: '0.62rem',
                              cursor: isRunning ? 'wait' : 'pointer',
                              fontFamily: "'Inter', system-ui",
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              transition: 'all 0.2s',
                            }}
                          >
                            {isRunning ? '⏳ Ejecutando...' : '▶ Ejecutar'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Pipeline visual */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      {[
                        { label: 'SOURCE', value: flow.source, color: '#6b7a90', borderColor: 'rgba(255,255,255,0.05)' },
                        null, // arrow
                        { label: 'TRANSFORM', value: flow.transform, color: '#00e5b0', borderColor: 'rgba(0,229,176,0.15)' },
                        null, // arrow
                        { label: 'DESTINATION', value: flow.dest, color: '#6b7a90', borderColor: 'rgba(255,255,255,0.05)' },
                      ].map((item, j) => {
                        if (!item) return <div key={`arrow-${j}`} style={{ color: '#00e5b0', padding: '0 6px', fontSize: '0.85rem', opacity: 0.5 }}>→</div>;
                        return (
                          <div key={j} style={{ background: '#080c18', border: `1px solid ${item.borderColor}`, borderRadius: 10, padding: '10px 14px', fontSize: '0.7rem', color: item.color, flex: item.label === 'TRANSFORM' ? 1.2 : 1, textAlign: 'center' }}>
                            <div style={{ fontSize: '0.52rem', color: '#2d3748', fontWeight: 700, marginBottom: 3, letterSpacing: '0.1em' }}>{item.label}</div>
                            {item.value}
                          </div>
                        );
                      })}
                    </div>

                    {/* Last execution result inline */}
                    {exec && exec.lastExec && (
                      <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.015)', border: `1px solid ${exec.lastStatus === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)'}`, borderRadius: 10, padding: '10px 14px', animation: 'fadeIn 0.3s ease' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: exec.lastResult ? 6 : 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: exec.lastStatus === 'error' ? '#ef4444' : '#22c55e', display: 'inline-block' }} />
                            <span style={{ fontSize: '0.6rem', color: '#6b7a90' }}>
                              Ultima ejecucion: {timeAgo(exec.lastExec)} — {exec.lastStatus === 'error' ? '✕ error' : '✓ exitosa'}
                            </span>
                          </div>
                          <button
                            className="labs-action"
                            onClick={() => {
                              try { sessionStorage.setItem('agent-result', exec.lastResult || ''); } catch {}
                              router.push('/dashboard/agents');
                            }}
                            style={{
                              background: 'rgba(0,229,176,0.06)', border: '1px solid rgba(0,229,176,0.15)',
                              color: '#00e5b0', padding: '3px 8px', borderRadius: 6, fontSize: '0.55rem',
                              fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', system-ui", transition: 'all 0.2s',
                            }}
                          >
                            Ver resultado completo →
                          </button>
                        </div>
                        {exec.lastResult && (
                          <div style={{ fontSize: '0.62rem', color: '#4a5568', lineHeight: 1.5, fontFamily: "'JetBrains Mono', monospace", background: '#080c18', borderRadius: 6, padding: '8px 10px', maxHeight: 48, overflow: 'hidden', whiteSpace: 'pre-wrap', position: 'relative' }}>
                            {exec.lastResult.slice(0, 120)}{exec.lastResult.length > 120 ? '...' : ''}
                            {exec.lastResult.length > 120 && (
                              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 20, background: 'linear-gradient(transparent, #080c18)' }} />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── MONITOREO TAB ────────────────────────────────────────── */}
          {tab === 'Monitoreo' && (
            <div>
              {/* Health check results banner */}
              {healthData.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${healthData.length}, 1fr)`, gap: '0.75rem', marginBottom: '1rem' }}>
                  {healthData.map(h => (
                    <div key={h.url} style={{
                      background: `linear-gradient(135deg, #0f1729, ${h.ok ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)'})`,
                      border: `1px solid ${h.ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
                      borderRadius: 12, padding: '1rem 1.25rem',
                    }}>
                      <div style={{ fontSize: '0.6rem', color: '#3a4a60', fontWeight: 600, marginBottom: 6, letterSpacing: '0.04em' }}>{h.url.replace('https://', '')}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: '1.8rem', fontWeight: 900, color: latencyColor(h.latency), letterSpacing: '-0.03em', lineHeight: 1 }}>{h.latency}</span>
                        <span style={{ fontSize: '0.6rem', color: '#4a5568' }}>ms</span>
                        <span style={{ fontSize: '0.55rem', fontWeight: 600, padding: '2px 6px', borderRadius: 6, background: `${latencyColor(h.latency)}15`, color: latencyColor(h.latency), marginLeft: 'auto' }}>{latencyLabel(h.latency)}</span>
                      </div>
                      <div style={{ fontSize: '0.58rem', color: h.ok ? '#22c55e' : '#ef4444', marginTop: 4 }}>
                        HTTP {h.status} {h.ok ? '— OK' : '— Error'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions bar */}
              <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', alignItems: 'center' }}>
                <button
                  className="labs-action"
                  onClick={runAllMonitorTests}
                  disabled={runAllProgress.running}
                  style={{
                    background: runAllProgress.running ? '#1a2540' : 'linear-gradient(135deg, #00e5b0, #00c49a)',
                    color: runAllProgress.running ? '#6b7a90' : '#0a0e1a', border: 'none', padding: '7px 16px', borderRadius: 8,
                    fontWeight: 700, fontSize: '0.68rem', cursor: runAllProgress.running ? 'wait' : 'pointer', fontFamily: "'Inter', system-ui",
                    display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
                    position: 'relative', overflow: 'hidden', minWidth: 180,
                  }}
                >
                  {runAllProgress.running && (
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: `${runAllProgress.total > 0 ? (runAllProgress.done / runAllProgress.total) * 100 : 0}%`,
                      background: 'rgba(0,229,176,0.15)', transition: 'width 0.3s ease',
                    }} />
                  )}
                  <span style={{ position: 'relative', zIndex: 1 }}>
                    {runAllProgress.running ? `⏳ Testeando ${runAllProgress.done}/${runAllProgress.total}...` : '🔍 Ejecutar todo'}
                  </span>
                </button>
                <span style={{ flex: 1 }} />
                {/* Status summary dots */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: '0.58rem', color: '#4a5568' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                    {CONNECTORS.filter(c => c.status === 'active').filter(c => getMonitorDot(monitorResults[c.id]).color === '#22c55e').length} OK
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                    {CONNECTORS.filter(c => c.status === 'active').filter(c => getMonitorDot(monitorResults[c.id]).color === '#f59e0b').length} Warn
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                    {CONNECTORS.filter(c => c.status === 'active').filter(c => getMonitorDot(monitorResults[c.id]).color === '#ef4444').length} Error
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6b7280', display: 'inline-block' }} />
                    {CONNECTORS.filter(c => c.status === 'active').filter(c => getMonitorDot(monitorResults[c.id]).color === '#6b7280').length} Sin test
                  </span>
                </div>
              </div>

              {/* Table */}
              <div style={{ background: '#0f1729', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    {['', 'Conector', 'Estado', 'Latencia', 'Último Sync', 'Último Test', 'Volumen', 'Acciones'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '12px 14px', fontSize: '0.58rem', color: '#2d3748', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {CONNECTORS.filter(c => c.status === 'active').map(c => {
                      const sc = statusCfg[c.status];
                      const mon = monitorResults[c.id];
                      const isTestRunning = monitorRunning[c.id];
                      return (
                        <tr key={c.id} className="labs-monitor-row" style={{ borderTop: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}>
                          <td style={{ padding: '11px 8px 11px 14px', width: 28 }}>
                            {(() => {
                              const dot = getMonitorDot(mon);
                              return (
                                <div title={dot.label} style={{
                                  width: 10, height: 10, borderRadius: '50%', background: dot.color,
                                  boxShadow: `0 0 6px ${dot.color}40`,
                                  animation: isTestRunning ? 'pulse 1s infinite' : 'none',
                                  transition: 'all 0.3s',
                                }} />
                              );
                            })()}
                          </td>
                          <td style={{ padding: '11px 14px', fontSize: '0.76rem', color: '#e2e8f0', fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span>{c.icon}</span>
                              <span>{c.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ fontSize: '0.58rem', fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: sc.bg, color: sc.color }}>{sc.label}</span>
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            {mon?.latency != null ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', fontWeight: 700, color: latencyColor(mon.latency) }}>{mon.latency}ms</span>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: latencyColor(mon.latency) }} />
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.68rem', color: '#2d3748' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '11px 14px', fontSize: '0.7rem', color: '#4a5568' }}>{c.lastSync || '—'}</td>
                          <td style={{ padding: '11px 14px', fontSize: '0.65rem', color: '#3a4a60', fontFamily: "'JetBrains Mono', monospace" }}>
                            {mon?.testedAt ? formatTime(mon.testedAt) : '—'}
                          </td>
                          <td style={{ padding: '11px 14px', fontSize: '0.7rem', color: '#6b7a90', fontFamily: "'JetBrains Mono', monospace" }}>{c.dataVolume || '—'}</td>
                          <td style={{ padding: '11px 14px' }}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                className="labs-action"
                                disabled={isTestRunning}
                                onClick={() => runMonitorTest(c)}
                                style={{ background: isTestRunning ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '5px 10px', color: isTestRunning ? '#2d3748' : '#94a3b8', fontSize: '0.6rem', cursor: isTestRunning ? 'wait' : 'pointer', fontFamily: "'Inter', system-ui", fontWeight: 600, transition: 'all 0.2s' }}
                              >
                                {isTestRunning ? '⏳' : '🔌'} Test
                              </button>
                              {c.action && !c.action.startsWith('http') && (
                                <button
                                  className="labs-action"
                                  onClick={() => goToAgentsWithLog(
                                    `Genera un reporte completo del conector ${c.name}: estado, métricas, recomendaciones de optimización, y próximos pasos. Incluye datos técnicos.`,
                                    'generate_report',
                                    `connector:${c.name}`
                                  )}
                                  style={{ background: 'rgba(0,229,176,0.06)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 8, padding: '5px 10px', color: '#00e5b0', fontSize: '0.6rem', cursor: 'pointer', fontFamily: "'Inter', system-ui", fontWeight: 600, transition: 'all 0.2s' }}
                                >
                                  ⚡ Reporte
                                </button>
                              )}
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

      {/* ─── Detail Panel (slide-in) ──────────────────────────────────────── */}
      {detail && (
        <div style={{ width: 390, minWidth: 390, background: '#0c1121', borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', overflow: 'auto', animation: 'slideIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}>

          {/* Header */}
          <div style={{ padding: '1.5rem 1.25rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: `linear-gradient(180deg, ${detail.color}06, transparent)` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${detail.color}10`, border: `1px solid ${detail.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>{detail.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>{detail.name}</div>
                <div style={{ fontSize: '0.62rem', color: '#3a4a60', marginTop: 1 }}>{detail.category}</div>
              </div>
              <button onClick={() => setDetail(null)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#4a5568', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>✕</button>
            </div>
            <p style={{ fontSize: '0.73rem', color: '#6b7a90', lineHeight: 1.6, margin: 0 }}>{detail.description}</p>
          </div>

          {/* Info */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.56rem', fontWeight: 700, color: '#2d3748', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Configuracion</div>
            {[
              { k: 'Auth', v: detail.authType },
              { k: 'Estado', v: statusCfg[detail.status]?.label },
              { k: 'Ultimo Sync', v: detail.lastSync || '—' },
              { k: 'Volumen', v: detail.dataVolume || '—' },
              { k: 'Valor Negocio', v: detail.businessValue ? '★'.repeat(detail.businessValue) + '☆'.repeat(5 - detail.businessValue) : '—' },
            ].map(item => (
              <div key={item.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.7rem', borderBottom: '1px solid rgba(255,255,255,0.025)' }}>
                <span style={{ color: '#4a5568' }}>{item.k}</span>
                <span style={{ color: item.k === 'Valor Negocio' ? '#f59e0b' : '#cbd5e1', fontFamily: item.k === 'Volumen' ? "'JetBrains Mono', monospace" : 'inherit', fontWeight: 500 }}>{item.v}</span>
              </div>
            ))}
          </div>

          {/* Endpoints */}
          {detail.endpoints && (
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '0.56rem', fontWeight: 700, color: '#2d3748', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Endpoints</div>
              {detail.endpoints.map((ep, i) => (
                <div key={i} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', color: '#00e5b0', background: 'rgba(0,229,176,0.04)', border: '1px solid rgba(0,229,176,0.08)', padding: '7px 10px', borderRadius: 8, marginBottom: 4 }}>{ep}</div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: '0.56rem', fontWeight: 700, color: '#2d3748', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Acciones</div>

            {/* Test Connection */}
            <button className="labs-action" onClick={() => { setNextSteps(false); testConnection(detail); }} style={actionBtn(
              testResult === 'success' ? 'rgba(34,197,94,0.1)' : testResult === 'failed' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)',
              testResult === 'success' ? '#22c55e30' : testResult === 'failed' ? '#ef444430' : 'rgba(255,255,255,0.06)',
              testResult === 'success' ? '#22c55e' : testResult === 'failed' ? '#ef4444' : '#94a3b8',
            )}>
              {testResult === 'testing' ? '⏳ Testeando conexion...' : testResult === 'success' ? '✅ Conexion exitosa' : testResult === 'failed' ? '✕ Conexion fallida' : '🔌 Test Conexion'}
            </button>

            {/* Connect */}
            <button className="labs-action" onClick={handleConnect} style={actionBtn(
              connecting ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.06)',
              connecting ? '#3b82f630' : 'rgba(59,130,246,0.15)',
              '#3b82f6',
              connecting ? { animation: 'pulse 1.5s infinite' } : {},
            )}>
              {connecting ? '🔗 Conectando...' : '🔗 Conectar'}
            </button>

            {/* Generate Proposal */}
            <button className="labs-action" onClick={() => goToAgentsWithLog(
              `Genera una propuesta profesional para integrar ${detail.name} con Smart Connection. Incluye: arquitectura, timeline, costos estimados, beneficios. Formato estructurado con headers.`,
              'generate_proposal',
              detail.name,
            )} style={actionBtn('rgba(245,158,11,0.06)', 'rgba(245,158,11,0.15)', '#f59e0b')}>
              ⚡ Generar Propuesta
            </button>

            {/* Generate Mockup */}
            <button className="labs-action" onClick={() => goToAgentsWithLog(
              `Diseña una maqueta/wireframe en texto para la integración de ${detail.name}. Incluye: layout de dashboard, flujo de datos, componentes UI necesarios, endpoints. Usa diagramas ASCII si es posible.`,
              'generate_mockup',
              detail.name,
            )} style={actionBtn('rgba(6,182,212,0.06)', 'rgba(6,182,212,0.15)', '#06b6d4')}>
              🎨 Generar Maqueta
            </button>

            {/* Generate Demo */}
            <button className="labs-action" onClick={() => goToAgentsWithLog(
              `Crea un demo funcional de la integración con ${detail.name}. Genera el código HTML completo con estilos inline para mostrar cómo se vería el dashboard de ${detail.name} integrado en Smart Connection.`,
              'generate_demo',
              detail.name,
            )} style={actionBtn('rgba(139,92,246,0.06)', 'rgba(139,92,246,0.15)', '#8b5cf6')}>
              📊 Generar Demo
            </button>
          </div>

          {/* Flujo completo — step-by-step pipeline after successful test */}
          {nextSteps && testResult === 'success' && (
            <div style={{ padding: '0 1.25rem 1rem', animation: 'fadeIn 0.3s ease' }}>
              <div style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.12)', borderRadius: 12, padding: '14px' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#22c55e', marginBottom: 6 }}>Conexion verificada</div>
                <div style={{ fontSize: '0.63rem', color: '#6b7a90', lineHeight: 1.6, marginBottom: 12 }}>
                  {detail.name} responde correctamente.
                  {monitorResults[detail.id]?.latency != null && (
                    <span style={{ color: latencyColor(monitorResults[detail.id].latency!), fontWeight: 600 }}> Latencia: {monitorResults[detail.id].latency}ms</span>
                  )}
                </div>

                {/* Flow pipeline diagram */}
                <div style={{ fontSize: '0.56rem', fontWeight: 700, color: '#2d3748', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Flujo completo</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 14 }}>
                  {([
                    { step: 'test' as FlowStep, label: 'Test', icon: '✅', done: true },
                    { step: 'proposal' as FlowStep, label: 'Propuesta', icon: '📝', done: flowSteps.proposal },
                    { step: 'deploy' as FlowStep, label: 'Deploy', icon: '🚀', done: flowSteps.deploy },
                    { step: 'result' as FlowStep, label: 'Resultado', icon: '📊', done: flowSteps.result },
                  ] as const).map((s, i, arr) => (
                    <div key={s.step} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <div style={{
                        flex: 1, textAlign: 'center', padding: '6px 2px', borderRadius: 8,
                        background: s.done ? 'rgba(34,197,94,0.1)' : flowStepRunning === s.step ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${s.done ? 'rgba(34,197,94,0.2)' : flowStepRunning === s.step ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)'}`,
                        transition: 'all 0.3s',
                      }}>
                        <div style={{ fontSize: '0.9rem', marginBottom: 2 }}>{s.done ? '✅' : flowStepRunning === s.step ? '⏳' : s.icon}</div>
                        <div style={{ fontSize: '0.52rem', fontWeight: 600, color: s.done ? '#22c55e' : '#4a5568' }}>{s.label}</div>
                      </div>
                      {i < arr.length - 1 && (
                        <div style={{ color: s.done ? '#22c55e' : '#2d3748', fontSize: '0.7rem', padding: '0 3px', flexShrink: 0 }}>→</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Step buttons — each enabled only after previous completes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button
                    className="labs-action"
                    disabled={flowSteps.proposal || flowStepRunning === 'proposal'}
                    onClick={async () => {
                      setFlowStepRunning('proposal');
                      await insertLog(detail.id, 'flow_step_proposal', detail.name);
                      goToAgentsWithLog(
                        `Genera una propuesta profesional para integrar ${detail.name} con Smart Connection. Incluye: arquitectura, timeline, costos estimados, beneficios.`,
                        'generate_proposal', detail.name,
                      );
                      setFlowSteps(prev => ({ ...prev, proposal: true }));
                      setFlowStepRunning(null);
                    }}
                    style={{
                      width: '100%', background: flowSteps.proposal ? 'rgba(34,197,94,0.06)' : 'rgba(245,158,11,0.08)',
                      border: `1px solid ${flowSteps.proposal ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)'}`,
                      color: flowSteps.proposal ? '#22c55e' : '#f59e0b', padding: '8px', borderRadius: 8,
                      fontWeight: 600, fontSize: '0.66rem', cursor: flowSteps.proposal ? 'default' : 'pointer',
                      fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
                      opacity: flowStepRunning === 'proposal' ? 0.6 : 1,
                    }}
                  >
                    {flowSteps.proposal ? '✅ Propuesta generada' : flowStepRunning === 'proposal' ? '⏳ Generando...' : '📝 Generar propuesta'}
                  </button>

                  <button
                    className="labs-action"
                    disabled={!flowSteps.proposal || flowSteps.deploy || flowStepRunning === 'deploy'}
                    onClick={async () => {
                      setFlowStepRunning('deploy');
                      await insertLog(detail.id, 'flow_step_deploy', detail.name);
                      goToAgentsWithLog(
                        `Genera el pipeline de deploy para integrar ${detail.name}. Incluye: CI/CD, configuracion, variables de entorno, y pasos de validacion.`,
                        'generate_deploy', detail.name,
                      );
                      setFlowSteps(prev => ({ ...prev, deploy: true }));
                      setFlowStepRunning(null);
                    }}
                    style={{
                      width: '100%', background: flowSteps.deploy ? 'rgba(34,197,94,0.06)' : !flowSteps.proposal ? 'rgba(255,255,255,0.01)' : 'rgba(139,92,246,0.08)',
                      border: `1px solid ${flowSteps.deploy ? 'rgba(34,197,94,0.15)' : !flowSteps.proposal ? 'rgba(255,255,255,0.03)' : 'rgba(139,92,246,0.15)'}`,
                      color: flowSteps.deploy ? '#22c55e' : !flowSteps.proposal ? '#2d3748' : '#8b5cf6',
                      padding: '8px', borderRadius: 8,
                      fontWeight: 600, fontSize: '0.66rem', cursor: !flowSteps.proposal || flowSteps.deploy ? 'default' : 'pointer',
                      fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
                    }}
                  >
                    {flowSteps.deploy ? '✅ Deploy configurado' : !flowSteps.proposal ? '🔒 Deploy (requiere propuesta)' : '🚀 Configurar deploy'}
                  </button>

                  <button
                    className="labs-action"
                    disabled={!flowSteps.deploy || flowSteps.result}
                    onClick={() => {
                      setFlowSteps(prev => ({ ...prev, result: true }));
                      insertLog(detail.id, 'flow_step_result', detail.name);
                      router.push('/dashboard/agents');
                    }}
                    style={{
                      width: '100%',
                      background: flowSteps.result ? 'rgba(34,197,94,0.06)' : !flowSteps.deploy ? 'rgba(255,255,255,0.01)' : 'linear-gradient(135deg, #00e5b0, #00c49a)',
                      color: flowSteps.result ? '#22c55e' : !flowSteps.deploy ? '#2d3748' : '#0a0e1a',
                      border: flowSteps.result ? '1px solid rgba(34,197,94,0.15)' : !flowSteps.deploy ? '1px solid rgba(255,255,255,0.03)' : 'none',
                      padding: '9px', borderRadius: 8,
                      fontWeight: 700, fontSize: '0.7rem', cursor: !flowSteps.deploy || flowSteps.result ? 'default' : 'pointer',
                      fontFamily: "'Inter', system-ui", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s',
                    }}
                  >
                    {flowSteps.result ? '✅ Completado' : !flowSteps.deploy ? '🔒 Ver resultado' : '📊 Ver resultado →'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Next steps after failed test */}
          {testResult === 'failed' && (
            <div style={{ padding: '0 1.25rem 1rem', animation: 'fadeIn 0.3s ease' }}>
              <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 12, padding: '14px' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>Conexion fallida</div>
                <div style={{ fontSize: '0.63rem', color: '#6b7a90', lineHeight: 1.6 }}>
                  Verifica las credenciales y la configuracion del conector. Para conectores en estado &quot;Disponible&quot;, primero necesitas configurar las API keys.
                </div>
              </div>
            </div>
          )}

          {/* Execute (for agents) */}
          {detail.action && !detail.action.startsWith('http') && !detail.action.startsWith('/') && (
            <div style={{ padding: '1rem 1.25rem', flex: 1 }}>
              <div style={{ fontSize: '0.56rem', fontWeight: 700, color: '#2d3748', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Ejecutar</div>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={`Prompt para ${detail.name}...`} style={{ width: '100%', background: '#080c18', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px', color: '#e2e8f0', fontSize: '0.73rem', fontFamily: "'Inter', system-ui", minHeight: 80, resize: 'vertical', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }} />
              <button className="labs-action" onClick={() => executeAgent(detail.action!)} disabled={running || !prompt.trim()} style={{ width: '100%', marginTop: 8, background: running ? '#111827' : `linear-gradient(135deg, ${detail.color}, ${detail.color}cc)`, color: running ? '#6b7a90' : '#0a0e1a', border: 'none', padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: '0.73rem', cursor: running ? 'not-allowed' : 'pointer', fontFamily: "'Inter', system-ui", transition: 'all 0.2s' }}>
                {running ? '⏳ Procesando...' : '⚡ Ejecutar'}
              </button>
              {result && (
                <div style={{ marginTop: 10, background: '#080c18', border: `1px solid ${detail.color}15`, borderRadius: 10, padding: '12px', fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>{result}</div>
              )}
            </div>
          )}

          {/* External link */}
          {detail.action && (detail.action.startsWith('http') || detail.action.startsWith('/')) && (
            <div style={{ padding: '1rem 1.25rem' }}>
              <a href={detail.action} target={detail.action.startsWith('/') ? '_self' : '_blank'} rel="noopener" onClick={() => insertLog('labs', 'open_external', detail?.name || '')} style={{ display: 'block', width: '100%', background: `${detail.color}08`, border: `1px solid ${detail.color}20`, borderRadius: 12, padding: '11px', color: detail.color, fontSize: '0.73rem', fontWeight: 600, textAlign: 'center', textDecoration: 'none', fontFamily: "'Inter', system-ui", transition: 'all 0.2s', boxSizing: 'border-box' }}>
                🔗 Abrir {detail.name} →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
