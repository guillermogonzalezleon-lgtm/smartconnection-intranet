'use client';
import { useState, useMemo } from 'react';

/* ─── Architecture Stack 2026 ─── */

interface Tool {
  name: string;
  category: string;
  description: string;
  tags: string[];
  status: 'active' | 'new';
  color: string;
}

interface Agent {
  model: string;
  speed: string;
  cost: string;
  strength: string;
  bestUse: string;
  color: string;
}

interface ComparisonRow {
  dimension: string;
  icon: string;
  claude: string;
  deepseek: string;
  gemini: string;
  winner: string;
  winnerColor: string;
}

interface Course {
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  link: string;
}

interface Mission {
  week: number;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  objectives: string[];
  tools: string[];
}

interface DecisionRow {
  need: string;
  solution: string;
  reason: string;
}

const TOOLS: Tool[] = [
  { name: 'Claude', category: 'LLM', description: 'Code review, advanced development, 200K context. Haiku 4.5 + Sonnet.', tags: ['Anthropic', 'MCP', 'Tool Use'], status: 'active', color: '#c0522a' },
  { name: 'Gemini 2.0 Flash', category: 'LLM', description: 'SEO, analytics, multimodal. Native Google integration.', tags: ['Google', 'Vision', 'SEO'], status: 'active', color: '#1a73e8' },
  { name: 'Groq (Llama 3.3 70B)', category: 'LLM', description: 'Ultra-fast inference: 3.4K tokens/sec via LPU.', tags: ['Groq', 'LPU', 'Gratis'], status: 'active', color: '#d97706' },
  { name: 'DeepSeek-chat', category: 'LLM', description: 'Massive code generation, STEM analysis. Top HumanEval.', tags: ['Code', 'Low-cost', 'STEM'], status: 'active', color: '#2a5fc0' },
  { name: 'GPT-4o-mini', category: 'LLM', description: 'Embeddings reference, fine-tuning, standard ecosystem.', tags: ['OpenAI', 'Embeddings'], status: 'active', color: '#10b981' },
  { name: 'Mistral-small', category: 'LLM', description: 'GDPR-friendly, European infrastructure, multilingual.', tags: ['EU', 'GDPR', 'Multilingual'], status: 'active', color: '#ff7000' },
  { name: 'Command-A (Cohere)', category: 'LLM', description: 'RAG specialist, reranking, knowledge base retrieval.', tags: ['RAG', 'Reranking'], status: 'active', color: '#3b82f6' },
  { name: 'OpenRouter', category: 'LLM', description: 'Unified endpoint for 200+ models, fallbacks, anti lock-in.', tags: ['Router', 'Fallback', '200+ models'], status: 'active', color: '#6b3ec0' },
  { name: 'Bedrock (Claude 3.5 Haiku)', category: 'LLM', description: 'Enterprise AWS infrastructure, native integration.', tags: ['AWS', 'Enterprise'], status: 'active', color: '#f97316' },
  { name: 'Grok-3-mini', category: 'LLM', description: 'Real-time X/Twitter data integration, trends.', tags: ['xAI', 'Real-time', 'Social'], status: 'new', color: '#9333ea' },
  { name: 'Supabase', category: 'Backend', description: 'PostgreSQL, Auth, Storage, RLS. 7 tablas activas. pgvector para RAG.', tags: ['PostgreSQL', 'Auth', 'pgvector'], status: 'active', color: '#22c55e' },
  { name: 'Airtable', category: 'Backend', description: 'CMS visual con campos IA. 6 tablas activas.', tags: ['CMS', 'No-code', 'AI Fields'], status: 'active', color: '#f59e0b' },
  { name: 'Bsale', category: 'Backend', description: 'Facturación electrónica + POS + inventario (Chile). ~500 docs.', tags: ['ERP', 'Chile', 'Facturas'], status: 'active', color: '#8b5cf6' },
  { name: 'Jumpseller', category: 'E-commerce', description: 'E-commerce Chile. ~200 productos activos.', tags: ['E-commerce', 'Chile'], status: 'active', color: '#ec4899' },
  { name: 'Next.js 16 SSR', category: 'Frontend', description: 'intranet.smconnection.cl — auto-deploy on push.', tags: ['React 19', 'SSR', 'App Router'], status: 'active', color: '#000' },
  { name: 'AWS S3', category: 'Infrastructure', description: 'Static hosting. Bucket smartconnection25. 50+ files.', tags: ['S3', 'Static', 'sa-east-1'], status: 'active', color: '#f97316' },
  { name: 'CloudFront CDN', category: 'Infrastructure', description: 'Global delivery. 2 aliases configurados.', tags: ['CDN', 'Edge', 'SSL'], status: 'active', color: '#f97316' },
  { name: 'Route 53', category: 'Infrastructure', description: '4 zonas DNS configuradas.', tags: ['DNS', 'AWS'], status: 'active', color: '#f97316' },
  { name: 'GitHub', category: 'DevOps', description: '2 repos. CI/CD con GitHub Actions.', tags: ['Git', 'CI/CD', 'Actions'], status: 'active', color: '#64748b' },
  { name: 'Google Workspace', category: 'Integration', description: 'Gmail, Calendar, Drive APIs. Google Meet auto-scheduled.', tags: ['Gmail', 'Calendar', 'Meet'], status: 'active', color: '#1a73e8' },
  { name: 'n8n (self-hosted)', category: 'Integration', description: '400+ integraciones. Automatización de workflows.', tags: ['Automation', '400+ integrations'], status: 'active', color: '#ff6d5a' },
  { name: 'Langfuse', category: 'Observability', description: 'Trazabilidad de agentes: latencia, costos, traces.', tags: ['Tracing', 'Cost', 'Latency'], status: 'new', color: '#3b82f6' },
  { name: 'Resend', category: 'Integration', description: 'Email API con React Email. Alta deliverability.', tags: ['Email', 'React Email'], status: 'active', color: '#000' },
  { name: 'Vercel AI SDK', category: 'Framework', description: 'Streaming LLMs en Next.js. AI gateway.', tags: ['Streaming', 'AI SDK'], status: 'active', color: '#000' },
];

const AGENTS: Agent[] = [
  { model: 'Groq llama-3.3-70b', speed: '⚡ Ultra-fast', cost: '$ Muy bajo', strength: 'LPU velocity', bestUse: 'Respuestas real-time, chatbots', color: '#d97706' },
  { model: 'Claude haiku-4.5', speed: '🟢 Rápido', cost: '$$ Bajo', strength: 'Razonamiento + safety', bestUse: 'Propuestas SAP, InfoPet', color: '#00e5b0' },
  { model: 'Gemini 2.0-flash', speed: '🟢 Rápido', cost: '$$ Bajo', strength: 'Multimodal + Google', bestUse: 'Análisis competitivo, SEO', color: '#1a73e8' },
  { model: 'DeepSeek-chat', speed: '🟡 Medio', cost: '$ Muy bajo', strength: 'Código masivo', bestUse: 'Code review, scripts', color: '#2a5fc0' },
  { model: 'OpenAI gpt-4o-mini', speed: '🟢 Rápido', cost: '$$ Bajo', strength: 'Ecosistema estándar', bestUse: 'Embeddings, clasificación', color: '#10b981' },
  { model: 'Mistral-small', speed: '🟢 Rápido', cost: '$$ Bajo', strength: 'EU, multilingual', bestUse: 'Clientes europeos', color: '#ff7000' },
  { model: 'Cohere command-a', speed: '🟡 Medio', cost: '$$ Medio', strength: 'RAG + reranking', bestUse: 'RAG knowledge base', color: '#3b82f6' },
  { model: 'OpenRouter (llama)', speed: '🟡 Variable', cost: '$ Min markup', strength: 'Fallback + routing', bestUse: 'Resiliencia, anti lock-in', color: '#6b3ec0' },
  { model: 'Bedrock haiku-3.5', speed: '🟢 Rápido', cost: '$$ Bajo', strength: 'AWS nativo', bestUse: 'Integración stack AWS', color: '#f97316' },
  { model: 'Grok 3-mini', speed: '🟢 Rápido', cost: '$$ Bajo', strength: 'Datos X real-time', bestUse: 'Trends, social monitoring', color: '#9333ea' },
];

const COMPARISON: ComparisonRow[] = [
  { dimension: 'Razonamiento', icon: '💡', claude: 'Excepcional (200K ctx)', deepseek: 'Fuerte STEM', gemini: 'Multi-step analysis', winner: 'CLAUDE', winnerColor: '#c0522a' },
  { dimension: 'Código', icon: '⚙️', claude: 'Sólido Python, tool use', deepseek: 'Top HumanEval', gemini: 'Bueno pero no especializado', winner: 'DEEPSEEK', winnerColor: '#2a5fc0' },
  { dimension: 'Multimodal', icon: '🌐', claude: 'Visión + texto', deepseek: 'Texto/código mainly', gemini: 'Texto+imagen+video+audio', winner: 'GEMINI', winnerColor: '#1a73e8' },
  { dimension: 'SEO & Analytics', icon: '🔍', claude: 'Análisis de contenido', deepseek: 'Sin SEO nativo', gemini: 'Google nativo', winner: 'GEMINI', winnerColor: '#1a73e8' },
  { dimension: 'Safety', icon: '🛡️', claude: 'Líder industria', deepseek: 'Más permisivo', gemini: 'Filtrado político', winner: 'CLAUDE', winnerColor: '#c0522a' },
  { dimension: 'Costo', icon: '💰', claude: 'Premium ($$$/$)', deepseek: 'Muy bajo ($)', gemini: 'Medio ($$)', winner: 'DEEPSEEK', winnerColor: '#2a5fc0' },
  { dimension: 'API/Integration', icon: '🤝', claude: 'Robusto, MCP, Bedrock', deepseek: 'Inestable fuera de China', gemini: 'AI Studio, Vertex', winner: 'CLAUDE', winnerColor: '#c0522a' },
  { dimension: 'SmConnection Score', icon: '🏆', claude: '27/30', deepseek: '25/30', gemini: '26/30', winner: 'COMBINADO', winnerColor: '#00e5b0' },
];

const COURSES: Course[] = [
  { title: 'Claude API & Anthropic SDK', difficulty: 'Intermediate', description: 'Streaming, tool use, agents', link: 'https://docs.anthropic.com' },
  { title: 'Groq — Ultra-fast Inference', difficulty: 'Beginner', description: 'Optimización LPU', link: 'https://console.groq.com' },
  { title: 'OpenAI — GPT-4o & Assistants', difficulty: 'Intermediate', description: 'Embeddings, fine-tuning', link: 'https://platform.openai.com' },
  { title: 'Hugging Face — Open Source', difficulty: 'Beginner', description: 'Hub, Spaces, Transformers', link: 'https://huggingface.co' },
  { title: 'Next.js 16', difficulty: 'Intermediate', description: 'App Router, Server Components', link: 'https://nextjs.org/docs' },
  { title: 'TypeScript', difficulty: 'Beginner', description: 'Types, interfaces, generics', link: 'https://typescriptlang.org' },
  { title: 'Tailwind CSS v4', difficulty: 'Beginner', description: 'Utility-first framework', link: 'https://tailwindcss.com' },
  { title: 'Figma', difficulty: 'Beginner', description: 'Design systems, prototyping', link: 'https://figma.com' },
  { title: 'AWS Amplify', difficulty: 'Intermediate', description: 'Deploy Next.js, CI/CD', link: 'https://docs.amplify.aws' },
  { title: 'Supabase', difficulty: 'Beginner', description: 'PostgreSQL, Auth, Realtime, pgvector', link: 'https://supabase.com/docs' },
  { title: 'Vercel', difficulty: 'Beginner', description: 'Serverless, Edge Network', link: 'https://vercel.com/docs' },
  { title: 'MCP Servers', difficulty: 'Advanced', description: 'Custom AI connectors', link: 'https://modelcontextprotocol.io' },
  { title: 'GitHub Actions', difficulty: 'Intermediate', description: 'CI/CD workflows', link: 'https://docs.github.com/actions' },
  { title: 'SAP BTP', difficulty: 'Advanced', description: 'Business Technology Platform', link: 'https://developers.sap.com' },
];

const MISSIONS: Mission[] = [
  { week: 1, title: 'Master prompting con Claude & Groq', difficulty: 'Beginner', objectives: ['Dominar prompting', 'Comparar modelos', 'System prompts'], tools: ['Claude', 'Groq'] },
  { week: 2, title: 'Primera app Next.js con IA', difficulty: 'Beginner', objectives: ['Crear app Next.js', 'Integrar AI SDK', 'Deploy en Vercel'], tools: ['Next.js', 'Vercel AI SDK'] },
  { week: 3, title: 'Supabase + pgvector para RAG', difficulty: 'Intermediate', objectives: ['Configurar pgvector', 'Crear embeddings', 'Búsqueda semántica'], tools: ['Supabase', 'OpenAI'] },
  { week: 4, title: 'Tool Use — Claude llama APIs externas', difficulty: 'Intermediate', objectives: ['Conectar Bsale', 'Integrar Jumpseller', 'Function calling'], tools: ['Claude', 'Bsale', 'Jumpseller'] },
  { week: 5, title: 'Agregar modelo a Hoku + Langfuse', difficulty: 'Intermediate', objectives: ['Nuevo agente', 'Langfuse tracing', 'Cost tracking'], tools: ['Hoku', 'Langfuse'] },
  { week: 6, title: 'Crear MCP Server para SmConnection', difficulty: 'Advanced', objectives: ['MCP protocol', 'Custom server', 'Tool definitions'], tools: ['MCP', 'TypeScript'] },
  { week: 7, title: 'GitHub Actions + DeepSeek DevSecOps', difficulty: 'Advanced', objectives: ['CI/CD pipeline', 'Code review IA', 'Security scanning'], tools: ['GitHub Actions', 'DeepSeek'] },
  { week: 8, title: 'InfoPet — Asistente veterinario RAG', difficulty: 'Advanced', objectives: ['Sistema completo', 'RAG veterinario', 'Deploy producción'], tools: ['Claude', 'Supabase', 'Next.js'] },
];

const DECISIONS: DecisionRow[] = [
  { need: 'Razonamiento complejo, propuestas SAP', solution: 'Claude Sonnet/Haiku', reason: '200K contexto, tool use, safety' },
  { need: 'Análisis competitivo + SEO', solution: 'Gemini 2.0 Flash', reason: 'Google Analytics nativo' },
  { need: 'Generación masiva de código', solution: 'DeepSeek-Coder', reason: 'Top HumanEval, muy bajo costo' },
  { need: 'Chat real-time', solution: 'Groq llama-3.3-70b', reason: '<100ms latencia (LPU)' },
  { need: 'RAG sobre documentos', solution: 'Claude + Supabase pgvector', reason: 'Coherencia + búsqueda semántica' },
  { need: 'Embeddings', solution: 'OpenAI text-embedding-3', reason: 'Mejor calidad de vectores' },
  { need: 'Fallback si Claude cae', solution: 'OpenRouter → Bedrock', reason: 'Mismo modelo en AWS' },
  { need: 'Monitorear Hoku en producción', solution: 'Langfuse / LangSmith', reason: 'Traces, costo, latencia' },
  { need: 'Conectar Claude a Bsale/Supabase', solution: 'MCP Server smconnection', reason: 'Tool use nativo' },
  { need: 'Automatizar workflows', solution: 'n8n self-hosted', reason: '400+ integraciones' },
  { need: 'Deploy features', solution: 'GitHub Actions + Amplify', reason: 'Ya configurado' },
  { need: 'Notificaciones email', solution: 'Resend + React Email', reason: 'Alta deliverability' },
  { need: 'Clientes europeos (GDPR)', solution: 'Mistral (EU region)', reason: '100% infra europea' },
  { need: 'Prototipo rápido (no-tech)', solution: 'Airtable AI fields', reason: 'No-code, ya instalado' },
  { need: 'SAP BTP + IA', solution: 'Claude + MCP + BTP APIs', reason: 'Diferenciador competitivo' },
];

interface Project {
  name: string; emoji: string; url: string; stack: string[]; status: 'live' | 'dev' | 'planned';
  score: number; // 0-100 adoption score
  adopted: string[]; // tech already in use
  pending: string[]; // tech to adopt
  roadmap: { q: string; item: string; priority: 'high' | 'medium' | 'low' }[];
}

const PROJECTS: Project[] = [
  {
    name: 'Intranet SmartConnection', emoji: '🏢', url: 'intranet.smconnection.cl', status: 'live', score: 95,
    stack: ['Next.js 16', 'TypeScript', 'Tailwind v4', 'Supabase', 'AWS Amplify'],
    adopted: ['Claude', 'Groq', 'DeepSeek', 'Mistral', 'OpenAI', 'Grok', 'Cohere', 'OpenRouter', 'Bedrock', 'Gemini', 'Supabase', 'AWS S3', 'CloudFront', 'GitHub Actions', 'Google Workspace'],
    pending: ['Langfuse', 'MCP Server', 'pgvector RAG', 'n8n workflows'],
    roadmap: [
      { q: 'Q2 2026', item: 'Langfuse observability', priority: 'high' },
      { q: 'Q2 2026', item: 'MCP Server propio', priority: 'high' },
      { q: 'Q3 2026', item: 'pgvector RAG en knowledge base', priority: 'medium' },
      { q: 'Q3 2026', item: 'n8n automaciones', priority: 'medium' },
    ],
  },
  {
    name: 'SmartConnection Marketing', emoji: '🌐', url: 'smconnection.cl', status: 'live', score: 70,
    stack: ['Astro', 'Tailwind', 'AWS S3', 'CloudFront'],
    adopted: ['Astro', 'Tailwind', 'AWS S3', 'CloudFront', 'Route 53', 'Google Workspace'],
    pending: ['Resend email', 'Analytics tracking', 'Supabase forms', 'SEO con Gemini'],
    roadmap: [
      { q: 'Q2 2026', item: 'Resend para formulario contacto', priority: 'high' },
      { q: 'Q2 2026', item: 'Analytics real con Supabase', priority: 'high' },
      { q: 'Q3 2026', item: 'Blog con IA (Gemini SEO)', priority: 'medium' },
    ],
  },
  {
    name: 'VOY', emoji: '🚐', url: 'voy app', status: 'live', score: 60,
    stack: ['Next.js', 'Airtable', 'jsPDF'],
    adopted: ['Next.js', 'Airtable', 'jsPDF', 'Tailwind'],
    pending: ['Supabase migración', 'Claude para cotizaciones', 'Deploy Vercel'],
    roadmap: [
      { q: 'Q2 2026', item: 'Migrar de Airtable a Supabase', priority: 'high' },
      { q: 'Q3 2026', item: 'Claude genera cotizaciones automáticas', priority: 'medium' },
    ],
  },
  {
    name: 'InfoPet', emoji: '🐾', url: 'infopet (Amplify)', status: 'live', score: 55,
    stack: ['Next.js', 'AWS Amplify', 'Groq'],
    adopted: ['Next.js', 'AWS Amplify', 'Groq', 'Bsale', 'Jumpseller'],
    pending: ['Supabase', 'RAG veterinario', 'Claude tool use', 'MCP Bsale'],
    roadmap: [
      { q: 'Q2 2026', item: 'RAG con docs veterinarios', priority: 'high' },
      { q: 'Q3 2026', item: 'Claude + MCP para Bsale/Jumpseller', priority: 'high' },
      { q: 'Q3 2026', item: 'Migrar a Supabase', priority: 'medium' },
    ],
  },
  {
    name: 'Marketplace', emoji: '🛒', url: 'marketplace.smconnection.cl', status: 'dev', score: 40,
    stack: ['Next.js', 'AWS Amplify'],
    adopted: ['Next.js', 'Tailwind', 'AWS Amplify'],
    pending: ['Helium 10 API', 'MeLi API', 'Supabase', 'Groq análisis', 'n8n scrapers'],
    roadmap: [
      { q: 'Q2 2026', item: 'MeLi API integración', priority: 'high' },
      { q: 'Q2 2026', item: 'Helium 10 keywords', priority: 'high' },
      { q: 'Q3 2026', item: 'n8n scraper automático', priority: 'medium' },
      { q: 'Q4 2026', item: 'Amazon SP-API', priority: 'low' },
    ],
  },
];

const priorityColors = { high: { bg: 'rgba(239,68,68,0.08)', text: '#ef4444' }, medium: { bg: 'rgba(245,158,11,0.08)', text: '#f59e0b' }, low: { bg: 'rgba(107,128,153,0.08)', text: '#6b8099' } };

const difficultyColor = (d: string) => {
  if (d === 'Beginner') return { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' };
  if (d === 'Intermediate') return { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' };
  return { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' };
};

export default function StackPage() {
  const [activeSection, setActiveSection] = useState('tools');
  const [toolFilter, setToolFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = useMemo(() => ['All', ...Array.from(new Set(TOOLS.map(t => t.category)))], []);

  const filteredTools = useMemo(() => {
    return TOOLS.filter(t => {
      const matchCategory = toolFilter === 'All' || t.category === toolFilter;
      const matchSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [toolFilter, searchQuery]);

  const sections = [
    { id: 'tools', label: 'Stack Completo', icon: 'bi-layers' },
    { id: 'agents', label: 'Hoku Agents', icon: 'bi-robot' },
    { id: 'comparison', label: 'Comparativa', icon: 'bi-bar-chart' },
    { id: 'discovery', label: 'Discovery', icon: 'bi-compass' },
    { id: 'missions', label: 'Misiones', icon: 'bi-flag' },
    { id: 'decisions', label: 'Decisiones', icon: 'bi-signpost-split' },
    { id: 'projects', label: 'Proyectos', icon: 'bi-diagram-3' },
  ];

  const s = {
    page: { padding: '1.5rem 2rem', flex: 1, minHeight: '100vh' } as React.CSSProperties,
    topbar: { position: 'sticky' as const, top: 0, zIndex: 50, background: 'rgba(17,24,39,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', height: 56, display: 'flex', alignItems: 'center', padding: '0 2rem', fontSize: '0.85rem', color: '#94a3b8' },
    hero: { background: 'linear-gradient(135deg, #0a0d14 0%, #111827 50%, #0f172a 100%)', borderRadius: 20, padding: '3rem', marginBottom: '2rem', position: 'relative' as const, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' },
    heroOverlay: { position: 'absolute' as const, inset: 0, background: 'radial-gradient(ellipse 60% 50% at 80% 30%, rgba(192,82,42,0.12) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 20% 80%, rgba(42,95,192,0.08) 0%, transparent 60%)', pointerEvents: 'none' as const },
    heroTitle: { fontFamily: "'Inter', system-ui", fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 900, color: '#f1f5f9', lineHeight: 1.1, marginBottom: '0.75rem', letterSpacing: '-0.02em', position: 'relative' as const, zIndex: 1 },
    heroSub: { fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: 520, position: 'relative' as const, zIndex: 1 },
    tabs: { display: 'flex', gap: '2px', marginBottom: '2rem', background: '#111827', borderRadius: 12, padding: 4, border: '1px solid rgba(255,255,255,0.06)' } as React.CSSProperties,
    tab: (active: boolean) => ({ padding: '0.6rem 1.2rem', borderRadius: 10, border: 'none', background: active ? 'rgba(0,229,176,0.12)' : 'transparent', color: active ? '#00e5b0' : '#94a3b8', fontSize: '0.75rem', fontWeight: active ? 700 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', fontFamily: "'Inter', system-ui" }) as React.CSSProperties,
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1px', background: 'rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' } as React.CSSProperties,
    toolCard: { background: '#0d1117', padding: '1.5rem', position: 'relative' as const, transition: 'background 0.15s', cursor: 'default' },
    filterBar: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const, marginBottom: '1.5rem', alignItems: 'center' },
    filterBtn: (active: boolean) => ({ padding: '0.35rem 0.8rem', borderRadius: 6, border: '1px solid', borderColor: active ? 'rgba(0,229,176,0.3)' : 'rgba(255,255,255,0.08)', background: active ? 'rgba(0,229,176,0.1)' : 'transparent', color: active ? '#00e5b0' : '#94a3b8', fontSize: '0.68rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'Inter', system-ui" }) as React.CSSProperties,
    searchInput: { padding: '0.4rem 0.8rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#f1f5f9', fontSize: '0.75rem', outline: 'none', marginLeft: 'auto', width: 200, fontFamily: "'JetBrains Mono', monospace" } as React.CSSProperties,
    tableWrap: { borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' } as React.CSSProperties,
    th: { padding: '0.8rem 1rem', fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'left' as const, fontFamily: "'JetBrains Mono', monospace" },
    td: { padding: '0.75rem 1rem', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#e2e8f0' },
    tdMuted: { padding: '0.75rem 1rem', fontSize: '0.78rem', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#94a3b8' },
    badge: (bg: string, color: string) => ({ fontSize: '0.6rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: bg, color, display: 'inline-flex', alignItems: 'center', gap: 4 }) as React.CSSProperties,
    sectionTitle: { fontSize: '1.1rem', fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' },
    courseGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' } as React.CSSProperties,
    courseCard: { background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.25rem', transition: 'all 0.2s', cursor: 'pointer' },
    missionCard: { background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem', transition: 'all 0.2s' },
    tag: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '2px 8px', fontSize: '0.6rem', color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace" } as React.CSSProperties,
    metric: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 } as React.CSSProperties,
  };

  return (
    <>
      <div style={s.topbar}>
        <span>Intranet</span><span style={{ margin: '0 8px', color: '#475569' }}>/</span><span style={{ color: '#fff', fontWeight: 600 }}>Architecture Stack 2026</span>
      </div>
      <div style={s.page}>
        {/* Hero */}
        <div style={s.hero}>
          <div style={s.heroOverlay} />
          <div style={{ position: 'relative', zIndex: 1, marginBottom: '1.5rem' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c0522a', marginBottom: '1rem' }}>SmConnection · Architecture 2026</div>
            <h1 style={s.heroTitle}>
              Full-Stack <span style={{ color: '#c0522a' }}>AI-First</span> Architecture
            </h1>
            <p style={s.heroSub}>
              10 modelos LLM orquestados por Hoku, infraestructura AWS, Supabase como backend, y un ecosistema de integraciones que reduce costos de $450/mes a $120/mes.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
            {[
              { label: '10 LLM Models', value: 'Hoku' },
              { label: '24 Tools', value: 'Active' },
              { label: 'Cost', value: '$120/mes' },
              { label: 'Inference', value: '3.4K tok/s' },
            ].map((m, i) => (
              <div key={i} style={s.metric}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f1f5f9' }}>{m.value}</span>
                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          {sections.map(sec => (
            <button key={sec.id} style={s.tab(activeSection === sec.id)} onClick={() => setActiveSection(sec.id)}>
              <i className={`bi ${sec.icon}`}></i> {sec.label}
            </button>
          ))}
        </div>

        {/* ── Section: Tools ── */}
        {activeSection === 'tools' && (
          <>
            <div style={s.filterBar}>
              {categories.map(cat => (
                <button key={cat} style={s.filterBtn(toolFilter === cat)} onClick={() => setToolFilter(cat)}>
                  {cat}
                </button>
              ))}
              <input
                type="text"
                placeholder="Buscar herramienta..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={s.searchInput}
              />
            </div>
            <div style={s.grid}>
              {filteredTools.map((tool, i) => (
                <div key={i} style={s.toolCard}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#161b28'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#0d1117'; }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: tool.color }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f1f5f9', letterSpacing: '-0.01em' }}>{tool.name}</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', marginTop: 2 }}>{tool.category}</div>
                    </div>
                    <span style={s.badge(
                      tool.status === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                      tool.status === 'active' ? '#22c55e' : '#f59e0b'
                    )}>
                      {tool.status === 'active' ? 'Active' : 'New'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', lineHeight: 1.6, color: '#94a3b8', marginBottom: '0.75rem' }}>{tool.description}</div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {tool.tags.map((tag, j) => (
                      <span key={j} style={s.tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Section: Hoku Agents ── */}
        {activeSection === 'agents' && (
          <>
            <h2 style={s.sectionTitle}><i className="bi bi-stars" style={{ color: '#ff6b6b' }}></i> Hoku — Arquitectura de 10 Agentes</h2>
            <div style={s.tableWrap}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#0a0d14' }}>
                  <tr>
                    {['Modelo', 'Velocidad', 'Costo', 'Fortaleza', 'Mejor Uso'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {AGENTS.map((agent, i) => (
                    <tr key={i} style={{ transition: 'background 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,176,0.03)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <td style={{ ...s.td, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: agent.color, marginRight: 10, boxShadow: `0 0 8px ${agent.color}60` }}></span>
                        {agent.model}
                      </td>
                      <td style={s.tdMuted}>{agent.speed}</td>
                      <td style={s.tdMuted}>{agent.cost}</td>
                      <td style={s.tdMuted}>{agent.strength}</td>
                      <td style={s.td}>{agent.bestUse}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Section: Comparison ── */}
        {activeSection === 'comparison' && (
          <>
            <h2 style={s.sectionTitle}><i className="bi bi-bar-chart" style={{ color: '#c0522a' }}></i> Claude vs DeepSeek vs Gemini — Head to Head</h2>
            <div style={s.tableWrap}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#0a0d14' }}>
                  <tr>
                    {['Dimensión', 'Claude', 'DeepSeek', 'Gemini', 'Ganador'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row, i) => (
                    <tr key={i} style={{ transition: 'background 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,176,0.03)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <td style={{ ...s.td, fontWeight: 600 }}>
                        <span style={{ marginRight: 8 }}>{row.icon}</span>{row.dimension}
                      </td>
                      <td style={s.tdMuted}>{row.claude}</td>
                      <td style={s.tdMuted}>{row.deepseek}</td>
                      <td style={s.tdMuted}>{row.gemini}</td>
                      <td style={s.td}>
                        <span style={{ ...s.badge(`${row.winnerColor}20`, row.winnerColor), fontWeight: 700, fontSize: '0.65rem' }}>
                          {row.winner}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cost comparison */}
            <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>SaaS Tradicional</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ef4444', lineHeight: 1 }}>$450<span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>/mes</span></div>
              </div>
              <div style={{ background: '#111827', border: '1px solid rgba(0,229,176,0.2)', borderRadius: 16, padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#00e5b0', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>SmConnection AI Stack</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#00e5b0', lineHeight: 1 }}>$120<span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>/mes</span></div>
                <div style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '0.5rem', fontWeight: 600 }}>73% ahorro</div>
              </div>
            </div>
          </>
        )}

        {/* ── Section: Discovery ── */}
        {activeSection === 'discovery' && (
          <>
            <h2 style={s.sectionTitle}><i className="bi bi-compass" style={{ color: '#3b82f6' }}></i> Discovery Center — 14 Cursos</h2>
            <div style={s.courseGrid}>
              {COURSES.map((course, i) => {
                const dc = difficultyColor(course.difficulty);
                return (
                  <a key={i} href={course.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                    <div style={s.courseCard}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.3)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div style={{ fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", color: '#64748b', letterSpacing: '0.1em' }}>CURSO {String(i + 1).padStart(2, '0')}</div>
                        <span style={s.badge(dc.bg, dc.color)}>{course.difficulty}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f1f5f9', marginBottom: '0.4rem' }}>{course.title}</div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>{course.description}</div>
                      <div style={{ marginTop: '0.75rem', fontSize: '0.65rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <i className="bi bi-box-arrow-up-right"></i> Abrir docs
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </>
        )}

        {/* ── Section: Missions ── */}
        {activeSection === 'missions' && (
          <>
            <h2 style={s.sectionTitle}><i className="bi bi-flag" style={{ color: '#f59e0b' }}></i> Misiones — 8 Semanas de Aprendizaje</h2>
            {MISSIONS.map((mission, i) => {
              const dc = difficultyColor(mission.difficulty);
              return (
                <div key={i} style={s.missionCard}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,158,11,0.2)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 900, color: '#f59e0b', flexShrink: 0 }}>
                      S{mission.week}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f1f5f9' }}>{mission.title}</div>
                      <span style={s.badge(dc.bg, dc.color)}>{mission.difficulty}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Objetivos</div>
                      {mission.objectives.map((obj, j) => (
                        <div key={j} style={{ fontSize: '0.78rem', color: '#94a3b8', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: '#f59e0b' }}>→</span> {obj}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Herramientas</div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {mission.tools.map((tool, j) => (
                          <span key={j} style={s.tag}>{tool}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── Section: Decision Matrix ── */}
        {activeSection === 'decisions' && (
          <>
            <h2 style={s.sectionTitle}><i className="bi bi-signpost-split" style={{ color: '#8b5cf6' }}></i> Matriz de Decisión — ¿Qué Usar Cuándo?</h2>
            <div style={s.tableWrap}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#0a0d14' }}>
                  <tr>
                    {['Necesidad', 'Solución', 'Razón'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DECISIONS.map((row, i) => (
                    <tr key={i} style={{ transition: 'background 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,176,0.03)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <td style={s.td}>{row.need}</td>
                      <td style={{ ...s.td, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: '#00e5b0' }}>{row.solution}</td>
                      <td style={s.tdMuted}>{row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeSection === 'projects' && (
          <>
            <h2 style={s.sectionTitle}><i className="bi bi-diagram-3" style={{ color: '#00e5b0' }}></i> Proyectos — Assessment & Roadmap</h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem' }}>Stack adoptado vs pendiente por proyecto. Score = % de tecnologías del stack 2026 implementadas.</p>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {PROJECTS.map(p => (
                <div key={p.name} style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden', transition: 'all 0.2s' }}>
                  {/* Header */}
                  <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: '1.5rem' }}>{p.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9' }}>{p.name}</div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>{p.url}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: p.score > 80 ? '#1fd975' : p.score > 60 ? '#f5a623' : '#ef4444' }}>{p.score}%</div>
                      <div style={{ fontSize: '0.55rem', color: '#64748b' }}>Adopción</div>
                    </div>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: p.status === 'live' ? 'rgba(31,217,117,0.1)' : p.status === 'dev' ? 'rgba(245,158,11,0.1)' : 'rgba(107,128,153,0.1)', color: p.status === 'live' ? '#1fd975' : p.status === 'dev' ? '#f5a623' : '#6b8099' }}>
                      {p.status === 'live' ? '● Live' : p.status === 'dev' ? '◐ Dev' : '○ Planned'}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.04)' }}>
                    <div style={{ height: '100%', width: `${p.score}%`, background: p.score > 80 ? '#1fd975' : p.score > 60 ? '#f5a623' : '#ef4444', transition: 'width 0.5s' }} />
                  </div>
                  {/* Body */}
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                      {/* Adopted */}
                      <div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#1fd975', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>✓ Adoptado ({p.adopted.length})</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {p.adopted.map(t => (
                            <span key={t} style={{ fontSize: '0.58rem', padding: '2px 8px', borderRadius: 5, background: 'rgba(31,217,117,0.06)', color: '#1fd975', border: '1px solid rgba(31,217,117,0.12)' }}>{t}</span>
                          ))}
                        </div>
                      </div>
                      {/* Pending */}
                      <div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#f5a623', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>⏳ Pendiente ({p.pending.length})</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {p.pending.map(t => (
                            <span key={t} style={{ fontSize: '0.58rem', padding: '2px 8px', borderRadius: 5, background: 'rgba(245,158,11,0.06)', color: '#f5a623', border: '1px solid rgba(245,158,11,0.12)' }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Roadmap */}
                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Roadmap</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {p.roadmap.map((r, i) => {
                        const pc = priorityColors[r.priority];
                        return (
                          <div key={i} style={{ background: pc.bg, border: `1px solid ${pc.text}20`, borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '0.55rem', color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>{r.q}</span>
                            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#f1f5f9' }}>{r.item}</span>
                            <span style={{ fontSize: '0.5rem', fontWeight: 700, color: pc.text, textTransform: 'uppercase' }}>{r.priority}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Global summary */}
            <div style={{ marginTop: '1.5rem', background: '#0d1117', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 14, padding: '20px', display: 'flex', gap: 20, justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#00e5b0' }}>{Math.round(PROJECTS.reduce((s, p) => s + p.score, 0) / PROJECTS.length)}%</div>
                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Score Promedio</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#1fd975' }}>{PROJECTS.filter(p => p.status === 'live').length}</div>
                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Live</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f5a623' }}>{PROJECTS.reduce((s, p) => s + p.roadmap.filter(r => r.priority === 'high').length, 0)}</div>
                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>High Priority</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#4f8ef7' }}>{PROJECTS.reduce((s, p) => s + p.roadmap.length, 0)}</div>
                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Roadmap Items</div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
