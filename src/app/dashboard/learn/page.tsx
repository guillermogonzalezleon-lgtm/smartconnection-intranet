'use client';
import { useState } from 'react';

interface Resource {
  title: string;
  description: string;
  url: string;
  type: 'docs' | 'video' | 'playground' | 'tutorial';
  duration?: string;
}

interface Course {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  category: string;
  level: 'Principiante' | 'Intermedio' | 'Avanzado';
  resources: Resource[];
  tags: string[];
}

const CATEGORIES = ['Todos', 'IA', 'Desarrollo', 'Cloud', 'SAP', 'Diseño', 'Extensiones'];

const typeIcons: Record<string, { icon: string; color: string; label: string }> = {
  docs: { icon: '📄', color: '#3b82f6', label: 'Docs' },
  video: { icon: '▶️', color: '#ef4444', label: 'Video' },
  playground: { icon: '⚡', color: '#22c55e', label: 'Playground' },
  tutorial: { icon: '🎓', color: '#f59e0b', label: 'Tutorial' },
};

const COURSES: Course[] = [
  // IA
  {
    id: 'claude-api', emoji: '🤖', title: 'Claude API & Anthropic SDK',
    subtitle: 'Integrar Claude en aplicaciones — streaming, tool use, agentes',
    category: 'IA', level: 'Intermedio', tags: ['Claude', 'API', 'Streaming', 'Agentes'],
    resources: [
      { title: 'Anthropic API Docs', description: 'Referencia completa de la API de Claude', url: 'https://docs.anthropic.com/en/api/getting-started', type: 'docs' },
      { title: 'Prompt Engineering Guide', description: 'Técnicas avanzadas de prompting', url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview', type: 'tutorial' },
      { title: 'Tool Use (Function Calling)', description: 'Conectar Claude con APIs externas', url: 'https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview', type: 'docs' },
      { title: 'Streaming con SSE', description: 'Respuestas en tiempo real', url: 'https://docs.anthropic.com/en/api/streaming', type: 'docs' },
    ],
  },
  {
    id: 'groq-speed', emoji: '⚡', title: 'Groq — Inferencia ultra rápida',
    subtitle: 'LPU para modelos Llama a velocidad récord',
    category: 'IA', level: 'Principiante', tags: ['Groq', 'Llama', 'LPU', 'Gratis'],
    resources: [
      { title: 'Groq Console', description: 'Dashboard y API keys', url: 'https://console.groq.com', type: 'playground' },
      { title: 'Groq API Docs', description: 'OpenAI-compatible API', url: 'https://console.groq.com/docs/api-reference', type: 'docs' },
      { title: 'Modelos disponibles', description: 'Llama 3.3 70B, Mixtral, Gemma', url: 'https://console.groq.com/docs/models', type: 'docs' },
    ],
  },
  {
    id: 'openai-gpt', emoji: '🧠', title: 'OpenAI — GPT-4o & Assistants',
    subtitle: 'APIs de OpenAI, assistants, embeddings, vision',
    category: 'IA', level: 'Intermedio', tags: ['OpenAI', 'GPT-4o', 'Assistants', 'Embeddings'],
    resources: [
      { title: 'OpenAI Platform Docs', description: 'API reference completa', url: 'https://platform.openai.com/docs/api-reference', type: 'docs' },
      { title: 'Playground', description: 'Probar modelos en el browser', url: 'https://platform.openai.com/playground', type: 'playground' },
      { title: 'Cookbook', description: 'Ejemplos y recetas', url: 'https://cookbook.openai.com', type: 'tutorial' },
    ],
  },
  {
    id: 'huggingface', emoji: '🤗', title: 'Hugging Face — Modelos open source',
    subtitle: 'Hub de modelos, Spaces, Transformers',
    category: 'IA', level: 'Principiante', tags: ['HuggingFace', 'Open Source', 'Transformers'],
    resources: [
      { title: 'HF Hub', description: 'Explorar 500K+ modelos', url: 'https://huggingface.co/models', type: 'playground' },
      { title: 'Spaces', description: 'Demos interactivas', url: 'https://huggingface.co/spaces', type: 'playground' },
      { title: 'NLP Course', description: 'Curso gratuito de NLP', url: 'https://huggingface.co/learn/nlp-course', type: 'tutorial' },
    ],
  },
  // Desarrollo
  {
    id: 'nextjs', emoji: '▲', title: 'Next.js 16 — Framework React',
    subtitle: 'App Router, Server Components, Streaming, API Routes',
    category: 'Desarrollo', level: 'Intermedio', tags: ['Next.js', 'React', 'SSR', 'App Router'],
    resources: [
      { title: 'Next.js Docs', description: 'Documentación oficial', url: 'https://nextjs.org/docs', type: 'docs' },
      { title: 'Learn Next.js', description: 'Tutorial interactivo oficial', url: 'https://nextjs.org/learn', type: 'tutorial' },
      { title: 'App Router Guide', description: 'Server Components y layouts', url: 'https://nextjs.org/docs/app', type: 'docs' },
      { title: 'API Routes', description: 'Crear APIs con Next.js', url: 'https://nextjs.org/docs/app/building-your-application/routing/route-handlers', type: 'docs' },
    ],
  },
  {
    id: 'typescript', emoji: '🔷', title: 'TypeScript — JavaScript tipado',
    subtitle: 'Types, interfaces, generics, utility types',
    category: 'Desarrollo', level: 'Principiante', tags: ['TypeScript', 'JavaScript', 'Types'],
    resources: [
      { title: 'TS Handbook', description: 'Guía oficial completa', url: 'https://www.typescriptlang.org/docs/handbook/intro.html', type: 'docs' },
      { title: 'Playground', description: 'Probar TypeScript online', url: 'https://www.typescriptlang.org/play', type: 'playground' },
      { title: 'Matt Pocock — Total TypeScript', description: 'Tips avanzados', url: 'https://www.totaltypescript.com/tutorials', type: 'tutorial' },
    ],
  },
  // Diseño
  {
    id: 'tailwind', emoji: '🎨', title: 'Tailwind CSS v4',
    subtitle: 'Utility-first CSS framework',
    category: 'Diseño', level: 'Principiante', tags: ['Tailwind', 'CSS', 'Dark Mode', 'Responsive'],
    resources: [
      { title: 'Tailwind Docs', description: 'Referencia de clases', url: 'https://tailwindcss.com/docs', type: 'docs' },
      { title: 'Tailwind Play', description: 'Playground online', url: 'https://play.tailwindcss.com', type: 'playground' },
      { title: 'Headless UI', description: 'Componentes accesibles', url: 'https://headlessui.com', type: 'docs' },
    ],
  },
  {
    id: 'figma', emoji: '🖌️', title: 'Figma — Diseño de interfaces',
    subtitle: 'Prototipos, design systems, auto-layout',
    category: 'Diseño', level: 'Principiante', tags: ['Figma', 'UI/UX', 'Prototipos', 'Design System'],
    resources: [
      { title: 'Figma Learn', description: 'Tutoriales oficiales', url: 'https://help.figma.com/hc/en-us', type: 'tutorial' },
      { title: 'Community', description: 'Templates y plugins gratis', url: 'https://www.figma.com/community', type: 'playground' },
    ],
  },
  // Cloud
  {
    id: 'aws-amplify', emoji: '☁️', title: 'AWS Amplify — Deploy Next.js',
    subtitle: 'Hosting, CI/CD, SSR en AWS',
    category: 'Cloud', level: 'Intermedio', tags: ['AWS', 'Amplify', 'Deploy', 'CI/CD'],
    resources: [
      { title: 'Amplify Docs', description: 'Hosting de apps web', url: 'https://docs.aws.amazon.com/amplify/', type: 'docs' },
      { title: 'Amplify Console', description: 'Dashboard de apps', url: 'https://console.aws.amazon.com/amplify/', type: 'playground' },
      { title: 'Next.js en Amplify', description: 'Guía de deploy SSR', url: 'https://docs.aws.amazon.com/amplify/latest/userguide/ssr-nextjs.html', type: 'tutorial' },
    ],
  },
  {
    id: 'supabase', emoji: '⚡', title: 'Supabase — PostgreSQL moderno',
    subtitle: 'Auth, Storage, Realtime, Edge Functions',
    category: 'Cloud', level: 'Principiante', tags: ['Supabase', 'PostgreSQL', 'Auth', 'Realtime'],
    resources: [
      { title: 'Supabase Docs', description: 'Guía completa', url: 'https://supabase.com/docs', type: 'docs' },
      { title: 'Dashboard', description: 'SQL Editor y tablas', url: 'https://supabase.com/dashboard', type: 'playground' },
      { title: 'Next.js + Supabase', description: 'Quickstart oficial', url: 'https://supabase.com/docs/guides/getting-started/quickstarts/nextjs', type: 'tutorial' },
    ],
  },
  {
    id: 'vercel', emoji: '▲', title: 'Vercel — Deploy en segundos',
    subtitle: 'Edge Network, Serverless, Analytics',
    category: 'Cloud', level: 'Principiante', tags: ['Vercel', 'Edge', 'Serverless'],
    resources: [
      { title: 'Vercel Docs', description: 'Platform docs', url: 'https://vercel.com/docs', type: 'docs' },
      { title: 'Dashboard', description: 'Proyectos y deploys', url: 'https://vercel.com/dashboard', type: 'playground' },
    ],
  },
  // SAP
  {
    id: 'sap-btp', emoji: '🔷', title: 'SAP BTP — Business Technology Platform',
    subtitle: 'Integration Suite, Build Apps, Datasphere',
    category: 'SAP', level: 'Avanzado', tags: ['SAP', 'BTP', 'Integration', 'ABAP Cloud'],
    resources: [
      { title: 'SAP Discovery Center', description: 'Misiones y tutoriales SAP', url: 'https://discovery-center.cloud.sap/missionCatalog/', type: 'tutorial' },
      { title: 'SAP Learning', description: 'Cursos gratuitos', url: 'https://learning.sap.com', type: 'tutorial' },
      { title: 'SAP Community', description: 'Blogs y Q&A', url: 'https://community.sap.com', type: 'docs' },
      { title: 'SAP BTP Cockpit', description: 'Administrar subaccounts', url: 'https://cockpit.btp.cloud.sap', type: 'playground' },
    ],
  },
  // Extensiones
  {
    id: 'mcp-servers', emoji: '🔌', title: 'MCP Servers — Conectores IA',
    subtitle: 'Model Context Protocol para integrar herramientas con IA',
    category: 'Extensiones', level: 'Avanzado', tags: ['MCP', 'Conectores', 'Claude', 'Extensiones'],
    resources: [
      { title: 'MCP Docs', description: 'Protocolo y arquitectura', url: 'https://modelcontextprotocol.io/introduction', type: 'docs' },
      { title: 'MCP Servers Registry', description: 'Servidores disponibles', url: 'https://github.com/modelcontextprotocol/servers', type: 'playground' },
      { title: 'Crear un MCP Server', description: 'Tutorial paso a paso', url: 'https://modelcontextprotocol.io/quickstart/server', type: 'tutorial' },
    ],
  },
  {
    id: 'github-actions', emoji: '🐙', title: 'GitHub Actions — CI/CD',
    subtitle: 'Workflows, automación, deploy automático',
    category: 'Extensiones', level: 'Intermedio', tags: ['GitHub', 'CI/CD', 'Actions', 'Automation'],
    resources: [
      { title: 'Actions Docs', description: 'Documentación oficial', url: 'https://docs.github.com/en/actions', type: 'docs' },
      { title: 'Marketplace', description: 'Actions pre-hechas', url: 'https://github.com/marketplace?type=actions', type: 'playground' },
      { title: 'Starter Workflows', description: 'Templates para empezar', url: 'https://github.com/actions/starter-workflows', type: 'tutorial' },
    ],
  },
];

const levelColors: Record<string, { bg: string; text: string; border: string }> = {
  'Principiante': { bg: 'rgba(34,197,94,0.08)', text: '#22c55e', border: 'rgba(34,197,94,0.2)' },
  'Intermedio': { bg: 'rgba(59,130,246,0.08)', text: '#3b82f6', border: 'rgba(59,130,246,0.2)' },
  'Avanzado': { bg: 'rgba(139,92,246,0.08)', text: '#8b5cf6', border: 'rgba(139,92,246,0.2)' },
};

export default function LearnPage() {
  const [catFilter, setCatFilter] = useState('Todos');
  const [levelFilter, setLevelFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [activeResource, setActiveResource] = useState<{ course: Course; resource: Resource } | null>(null);
  const [tab, setTab] = useState<'tech' | 'missions'>('tech');
  const [activeMission, setActiveMission] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState(false);

  // Sites known to block iframes
  // Verified via curl -I (X-Frame-Options / CSP frame-ancestors)
  const BLOCKED_DOMAINS = [
    'docs.anthropic.com',    // SAMEORIGIN
    'platform.openai.com',   // SAMEORIGIN
    'console.groq.com',      // CSP frame-src self only
    'huggingface.co',        // DENY
    'nextjs.org',            // DENY
    'supabase.com',          // DENY
    'docs.aws.amazon.com',   // SAMEORIGIN
    'figma.com',             // blocked
    'vercel.com',            // blocked
    'cloud.sap',             // blocked
    'learning.sap.com',      // blocked
    'community.sap.com',     // blocked
    'docs.github.com',       // CSP frame-ancestors self
    'github.com',            // CSP
    'cookbook.openai.com',    // blocked
    'totaltypescript.com',   // blocked
  ];
  const isBlocked = (url: string) => BLOCKED_DOMAINS.some(d => url.includes(d));

  const filtered = COURSES.filter(c => {
    if (catFilter !== 'Todos' && c.category !== catFilter) return false;
    if (levelFilter !== 'Todos' && c.level !== levelFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.title.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q) || c.tags.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 34px)', overflow: 'hidden' }}>
      {/* Breadcrumb */}
      <div style={{ flexShrink: 0, background: 'rgba(15,22,35,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', height: 48, display: 'flex', alignItems: 'center', padding: '0 1.5rem', gap: 8 }}>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Intranet</span>
        <span style={{ color: '#2d3748' }}>/</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>Discovery Center</span>
        <div style={{ display: 'flex', gap: 4, marginLeft: 16 }}>
          {[{ id: 'tech' as const, label: 'Tecnología' }, { id: 'missions' as const, label: 'Misiones' }].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setActiveResource(null); }} style={{
              padding: '4px 12px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer',
              background: tab === t.id ? 'rgba(0,229,176,0.12)' : 'transparent',
              color: tab === t.id ? '#00e5b0' : '#64748b',
              border: tab === t.id ? '1px solid rgba(0,229,176,0.2)' : '1px solid rgba(255,255,255,0.04)',
            }}>{t.label}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '0.62rem', color: '#475569' }}>{COURSES.length} cursos · {COURSES.reduce((s, c) => s + c.resources.length, 0)} recursos</span>
      </div>

      {/* MISSIONS TAB */}
      {tab === 'missions' && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Mission list */}
          <div style={{ width: activeMission ? 340 : '100%', flexShrink: 0, overflow: 'auto', padding: activeMission ? '1rem' : '1.5rem 2rem', borderRight: activeMission ? '1px solid rgba(255,255,255,0.06)' : 'none', transition: 'width 0.3s' }}>
            {!activeMission && <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>Misiones — 8 Semanas</h2>}
            {!activeMission && <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 20 }}>Cada misión abre una herramienta interactiva en el panel derecho.</p>}
            <div style={{ display: 'grid', gridTemplateColumns: activeMission ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: 8 }}>
              {[
                { id: 'm1', week: 1, title: 'Master prompting con Claude & Groq', level: 'Beginner', tools: ['Claude', 'Groq'], url: 'https://www.typescriptlang.org/play', urlLabel: 'TS Playground' },
                { id: 'm2', week: 2, title: 'Primera app Next.js con IA', level: 'Beginner', tools: ['Next.js', 'Vercel'], url: 'https://play.tailwindcss.com', urlLabel: 'Tailwind Play' },
                { id: 'm3', week: 3, title: 'Supabase + pgvector para RAG', level: 'Intermediate', tools: ['Supabase', 'OpenAI'], url: '/dashboard/agents', urlLabel: 'Workspace Agentes' },
                { id: 'm4', week: 4, title: 'Tool Use — Claude llama APIs', level: 'Intermediate', tools: ['Claude', 'Bsale'], url: '/dashboard/labs', urlLabel: 'Extensiones' },
                { id: 'm5', week: 5, title: 'Agregar modelo a Hoku + Langfuse', level: 'Intermediate', tools: ['Hoku', 'Langfuse'], url: '/dashboard/agents', urlLabel: 'Agentes IA' },
                { id: 'm6', week: 6, title: 'Crear MCP Server', level: 'Advanced', tools: ['MCP', 'TypeScript'], url: '/dashboard/stack', urlLabel: 'Stack 2026' },
                { id: 'm7', week: 7, title: 'GitHub Actions + DeepSeek DevSecOps', level: 'Advanced', tools: ['GitHub', 'DeepSeek'], url: '/dashboard/deploy', urlLabel: 'Deploy Center' },
                { id: 'm8', week: 8, title: 'InfoPet — Asistente veterinario RAG', level: 'Advanced', tools: ['Claude', 'Supabase'], url: '/dashboard/improvements', urlLabel: 'Mejoras & UX' },
              ].map(m => {
                const isActive = activeMission === m.id;
                const lc = m.level === 'Beginner' ? '#22c55e' : m.level === 'Intermediate' ? '#f59e0b' : '#8b5cf6';
                return (
                  <div key={m.id} onClick={() => setActiveMission(isActive ? null : m.id)}
                    style={{ background: isActive ? 'rgba(0,229,176,0.04)' : '#0d1117', border: `1px solid ${isActive ? 'rgba(0,229,176,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, padding: activeMission ? '10px 12px' : '16px 18px', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: activeMission ? 4 : 8 }}>
                      <div style={{ width: activeMission ? 28 : 36, height: activeMission ? 28 : 36, borderRadius: 8, background: `${lc}15`, border: `1px solid ${lc}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: activeMission ? '0.7rem' : '0.85rem', fontWeight: 900, color: lc, flexShrink: 0 }}>S{m.week}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: activeMission ? '0.72rem' : '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>{m.title}</div>
                        <div style={{ fontSize: '0.58rem', color: '#64748b', display: 'flex', gap: 6, marginTop: 2 }}>
                          <span style={{ color: lc }}>{m.level}</span>
                          <span>·</span>
                          <span>{m.urlLabel}</span>
                        </div>
                      </div>
                    </div>
                    {!activeMission && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {m.tools.map(t => <span key={t} style={{ fontSize: '0.52rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.03)', color: '#64748b', border: '1px solid rgba(255,255,255,0.05)' }}>{t}</span>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Mission iframe — grande */}
          {activeMission && (() => {
            const missions = [
              { id: 'm1', url: 'https://www.typescriptlang.org/play', title: 'TypeScript Playground', internal: false, desc: 'Practica TypeScript en el playground oficial. Escribe código, ve los tipos, experimenta.' },
              { id: 'm2', url: 'https://play.tailwindcss.com', title: 'Tailwind Play', internal: false, desc: 'Diseña con Tailwind CSS en tiempo real. Prueba clases, dark mode, responsive.' },
              { id: 'm3', url: '/dashboard/agents', title: 'Workspace Agentes', internal: true, desc: 'Ejecuta agentes IA: Hoku fusión, Groq, Claude. Prueba modos chat, code, SAP.' },
              { id: 'm4', url: '/dashboard/labs', title: 'Extensiones', internal: true, desc: 'Explora 50+ conectores. Ejecuta automatizaciones con Hoku.' },
              { id: 'm5', url: '/dashboard/agents', title: 'Agentes IA', internal: true, desc: 'Agrega un modelo a Hoku. Configura Langfuse para tracing.' },
              { id: 'm6', url: '/dashboard/stack', title: 'Stack 2026', internal: true, desc: 'Revisa la arquitectura completa. 24 herramientas, 10 modelos IA.' },
              { id: 'm7', url: '/dashboard/deploy', title: 'Deploy Center', internal: true, desc: 'Pipeline de 7 pasos. Health checks, stress test, CDN invalidation.' },
              { id: 'm8', url: '/dashboard/improvements', title: 'Mejoras & UX', internal: true, desc: 'Genera mejoras con Hoku. Deploy con preview POC.' },
            ];
            const m = missions.find(x => x.id === activeMission);
            if (!m) return null;
            const isExternal = !m.internal && !isBlocked(m.url);
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#06080f' }}>
                <div style={{ flexShrink: 0, padding: '8px 14px', background: '#0d1117', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 3 }}><div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} /><div style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} /><div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} /></div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f1f5f9' }}>{m.title}</span>
                  <span style={{ fontSize: '0.6rem', color: '#475569', fontFamily: "'JetBrains Mono', monospace", flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.url}</span>
                  <a href={m.url} style={{ fontSize: '0.6rem', padding: '3px 10px', borderRadius: 6, background: 'rgba(0,229,176,0.1)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.2)', textDecoration: 'none', fontWeight: 600 }}>{m.internal ? 'Ir →' : 'Abrir ↗'}</a>
                  <button onClick={() => setActiveMission(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                </div>
                {isExternal ? (
                  <iframe src={m.url} style={{ flex: 1, border: 'none', background: '#fff' }} title={m.title} sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 40 }}>
                    <div style={{ fontSize: 48 }}>{m.internal ? '🏠' : '🔗'}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>{m.title}</div>
                    <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>{m.desc}</div>
                    <a href={m.url} style={{
                      padding: '14px 36px', borderRadius: 12, fontSize: 15, fontWeight: 700,
                      background: 'linear-gradient(135deg, rgba(0,229,176,0.15), rgba(0,229,176,0.08))',
                      border: '1px solid rgba(0,229,176,0.25)', color: '#00e5b0',
                      textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8,
                      transition: 'all 0.2s',
                    }}>{m.internal ? `Ir a ${m.title} →` : `Abrir en nueva pestaña ↗`}</a>
                    {m.internal && <div style={{ fontSize: 11, color: '#2a3d58' }}>Se abre dentro de la intranet</div>}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* TECH TAB */}
      {tab === 'tech' && <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Course list (shrinks when preview is open) */}
        <div style={{
          width: activeResource ? 360 : '100%',
          minWidth: activeResource ? 360 : undefined,
          flexShrink: 0,
          overflow: 'auto', padding: activeResource ? '1rem' : '1.5rem 2rem',
          transition: 'width 0.3s ease',
          borderRight: activeResource ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}>
          {/* Title */}
          {!activeResource && (
            <div style={{ marginBottom: '1.25rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Discovery Center</h1>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '4px 0 0 0' }}>Aprende tecnología — IA, Cloud, SAP, Desarrollo, Diseño</p>
            </div>
          )}

          {/* Search */}
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar tecnología..."
            style={{
              width: '100%', background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
              padding: '8px 12px', color: '#f1f5f9', fontSize: '0.75rem', outline: 'none',
              fontFamily: "'Inter', system-ui", marginBottom: '0.75rem',
            }}
          />

          {/* Filters */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: '0.4rem' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)} style={{
                padding: '4px 10px', borderRadius: 6, fontSize: activeResource ? '0.58rem' : '0.65rem', fontWeight: 600, cursor: 'pointer',
                background: catFilter === cat ? 'rgba(0,229,176,0.12)' : 'rgba(255,255,255,0.03)',
                color: catFilter === cat ? '#00e5b0' : '#94a3b8',
                border: catFilter === cat ? '1px solid rgba(0,229,176,0.2)' : '1px solid rgba(255,255,255,0.04)',
                fontFamily: "'Inter', system-ui",
              }}>{cat}</button>
            ))}
          </div>
          {!activeResource && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: '1rem' }}>
              {['Todos', 'Principiante', 'Intermedio', 'Avanzado'].map(lvl => (
                <button key={lvl} onClick={() => setLevelFilter(lvl)} style={{
                  padding: '3px 8px', borderRadius: 5, fontSize: '0.6rem', fontWeight: 600, cursor: 'pointer',
                  background: levelFilter === lvl ? 'rgba(139,92,246,0.12)' : 'transparent',
                  color: levelFilter === lvl ? '#a78bfa' : '#475569',
                  border: levelFilter === lvl ? '1px solid rgba(139,92,246,0.2)' : '1px solid rgba(255,255,255,0.04)',
                  fontFamily: "'Inter', system-ui",
                }}>{lvl}</button>
              ))}
            </div>
          )}

          {/* Course Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: activeResource ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.7rem' }}>
            {filtered.map(course => {
              const lc = levelColors[course.level];
              const isActive = activeResource?.course.id === course.id;
              return (
                <div key={course.id} style={{
                  background: isActive ? 'rgba(0,229,176,0.04)' : '#111827',
                  border: `1px solid ${isActive ? 'rgba(0,229,176,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 14, padding: activeResource ? '0.8rem' : '1.1rem',
                  transition: 'all 0.15s',
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: activeResource ? '1rem' : '1.3rem' }}>{course.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: activeResource ? '0.75rem' : '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>{course.title}</div>
                      <div style={{ fontSize: '0.6rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.subtitle}</div>
                    </div>
                    <span style={{ fontSize: '0.5rem', fontWeight: 700, padding: '2px 6px', borderRadius: 5, background: lc.bg, color: lc.text, border: `1px solid ${lc.border}`, flexShrink: 0 }}>{course.level}</span>
                  </div>

                  {/* Tags */}
                  {!activeResource && (
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 10 }}>
                      {course.tags.map(t => (
                        <span key={t} style={{ fontSize: '0.52rem', padding: '1px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.03)', color: '#64748b', border: '1px solid rgba(255,255,255,0.05)' }}>{t}</span>
                      ))}
                    </div>
                  )}

                  {/* Resources */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {course.resources.map((res, i) => {
                      const ti = typeIcons[res.type];
                      const isResActive = activeResource?.resource.url === res.url;
                      return (
                        <button key={i} onClick={() => { setIframeError(false); setActiveResource({ course, resource: res }); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                            background: isResActive ? 'rgba(0,229,176,0.08)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${isResActive ? 'rgba(0,229,176,0.2)' : 'rgba(255,255,255,0.04)'}`,
                            borderRadius: 8, cursor: 'pointer', width: '100%', textAlign: 'left',
                            transition: 'all 0.15s',
                          }}>
                          <span style={{ fontSize: '0.8rem' }}>{ti.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: isResActive ? '#00e5b0' : '#e2e8f0' }}>{res.title}</div>
                            <div style={{ fontSize: '0.58rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{res.description}</div>
                          </div>
                          <span style={{ fontSize: '0.5rem', padding: '1px 5px', borderRadius: 4, background: `${ti.color}15`, color: ti.color, fontWeight: 700, flexShrink: 0 }}>{ti.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#475569', fontSize: '0.8rem' }}>Sin resultados</div>
          )}
        </div>

        {/* Resource Preview (iframe) */}
        {activeResource && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0a0d14' }}>
            {/* Preview Header */}
            <div style={{ flexShrink: 0, padding: '10px 16px', background: '#111827', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: '0.8rem' }}>{activeResource.course.emoji}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f1f5f9' }}>{activeResource.resource.title}</span>
                <span style={{ fontSize: '0.6rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" }}>{activeResource.resource.url}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <a href={activeResource.resource.url} target="_blank" rel="noopener noreferrer" style={{
                  fontSize: '0.6rem', padding: '3px 10px', borderRadius: 6,
                  background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)',
                  textDecoration: 'none', fontWeight: 600,
                }}>Abrir ↗</a>
                <button onClick={() => setActiveResource(null)} style={{
                  background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem', padding: '0 4px',
                }}>✕</button>
              </div>
            </div>
            {/* Content */}
            {isBlocked(activeResource.resource.url) || iframeError ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 40 }}>
                <div style={{ fontSize: 48 }}>{activeResource.course.emoji}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', textAlign: 'center' }}>{activeResource.resource.title}</div>
                <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>{activeResource.resource.description}</div>
                <div style={{ fontSize: 11, color: '#475569', fontFamily: "'JetBrains Mono', monospace", background: '#111827', padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>{activeResource.resource.url}</div>
                <a href={activeResource.resource.url} target="_blank" rel="noopener noreferrer" style={{
                  padding: '12px 32px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                  background: 'rgba(0,229,176,0.1)', border: '1px solid rgba(0,229,176,0.2)',
                  color: '#00e5b0', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8,
                }}>Abrir en nueva pestaña ↗</a>
                <div style={{ fontSize: 10, color: '#2a3d58' }}>Este sitio no permite ser embebido</div>
              </div>
            ) : (
              <iframe
                src={activeResource.resource.url}
                style={{ flex: 1, border: 'none', background: '#fff' }}
                title={activeResource.resource.title}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                onError={() => setIframeError(true)}
              />
            )}
          </div>
        )}
      </div>}
    </div>
  );
}
