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
  const [activeStep, setActiveStep] = useState(0);
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
          {/* Mission sidebar */}
          <div style={{ width: 300, flexShrink: 0, overflow: 'auto', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { id: 'm1', week: 1, title: 'Master prompting', level: 'Beginner', steps: 4 },
              { id: 'm2', week: 2, title: 'Primera app Next.js con IA', level: 'Beginner', steps: 3 },
              { id: 'm3', week: 3, title: 'Supabase + pgvector RAG', level: 'Intermediate', steps: 4 },
              { id: 'm4', week: 4, title: 'Tool Use — Claude llama APIs', level: 'Intermediate', steps: 3 },
              { id: 'm5', week: 5, title: 'Hoku + Langfuse tracing', level: 'Intermediate', steps: 3 },
              { id: 'm6', week: 6, title: 'Crear MCP Server', level: 'Advanced', steps: 4 },
              { id: 'm7', week: 7, title: 'GitHub Actions DevSecOps', level: 'Advanced', steps: 3 },
              { id: 'm8', week: 8, title: 'InfoPet RAG veterinario', level: 'Advanced', steps: 4 },
            ].map(m => {
              const lc = m.level === 'Beginner' ? '#22c55e' : m.level === 'Intermediate' ? '#f59e0b' : '#8b5cf6';
              return (
                <div key={m.id} onClick={() => { setActiveMission(m.id); setActiveStep(0); }}
                  style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)', borderLeft: `3px solid ${activeMission === m.id ? lc : 'transparent'}`, background: activeMission === m.id ? 'rgba(0,229,176,0.04)' : 'transparent', transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${lc}15`, border: `1px solid ${lc}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900, color: lc, flexShrink: 0 }}>S{m.week}</div>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: activeMission === m.id ? '#f1f5f9' : '#94a3b8' }}>{m.title}</div>
                      <div style={{ fontSize: '0.55rem', color: '#475569' }}>{m.level} · {m.steps} pasos</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Lesson content */}
          <div style={{ flex: 1, overflow: 'auto', padding: '32px', maxWidth: 720 }}>
            {!activeMission ? (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🎓</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>Selecciona una misión</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>8 semanas de aprendizaje práctico con contenido interactivo</div>
              </div>
            ) : (() => {
              const LESSONS: Record<string, { title: string; content: React.ReactNode }[]> = {
                m1: [
                  { title: '¿Qué es un prompt y por qué importa?', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Un prompt es la instrucción que le das a un modelo de IA. La calidad determina la respuesta. Piénsalo como dar instrucciones a alguien muy capaz pero muy literal.</p>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Anatomía de un buen prompt</h4>
                      {['Contexto — Quién eres, qué proyecto, qué stack', 'Tarea — Qué necesitas exactamente', 'Formato — Cómo quieres la respuesta', 'Restricciones — Qué NO hacer'].map((s, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, margin: '6px 0' }}>
                          <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,229,176,0.1)', border: '1px solid rgba(0,229,176,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: '#00e5b0', flexShrink: 0 }}>{i+1}</span>
                          <span style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.6 }}>{s}</span>
                        </div>
                      ))}
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Ejemplo</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// ❌ Prompt malo:
"Hazme un login"

// ✅ Prompt bueno:
"Eres dev senior Next.js 16 + TypeScript.
Crea LoginForm.tsx con:
- Supabase Auth (email + password)
- Validación con zod
- Loading state y errores
- Dark mode Tailwind
- Client component ('use client')"`}</pre>
                      <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> En la intranet, los agentes ya tienen system prompts. Modo &quot;SAP&quot; incluye contexto de consultoría automáticamente.</div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Abre el chat de Hoku (🐾 abajo a la derecha). Prueba el prompt malo y el bueno. Compara las respuestas. ¿Cuál es mejor?</div>
                    </>
                  )},
                  { title: 'Chain-of-thought para debugging', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Chain-of-thought (CoT) le pide al modelo que &quot;piense paso a paso&quot;. Esto mejora dramáticamente la calidad en tareas complejas como debugging.</p>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`"Tengo este error en mi API route de Next.js:
TypeError: Cannot read properties of undefined

Analiza paso a paso:
1. ¿Qué variable podría ser undefined?
2. ¿En qué línea ocurre?
3. ¿Qué condición falta?
4. Dame el fix exacto con el código corregido"`}</pre>
                      <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#f5a623', lineHeight: 1.6 }}>⚠️ <strong>Importante:</strong> Sin CoT, el modelo adivina. Con CoT, razona. La diferencia es enorme en bugs complejos.</div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Pega un error real de tu proyecto en el chat de Hoku. Primero sin CoT, luego con &quot;analiza paso a paso&quot;. Compara.</div>
                    </>
                  )},
                  { title: 'System prompts y modos', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Un system prompt define la personalidad y contexto base del agente. En la intranet, cada modo (Chat, Code, SAP, Deploy) tiene su propio system prompt.</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '16px 0' }}>
                        {[{m:'💬 Chat',d:'Conversación general, respuestas concisas'},{m:'</> Code',d:'Genera código funcional con filename'},{m:'🏢 SAP',d:'Consultoría SAP Chile, propuestas en UF'},{m:'🚀 Deploy',d:'DevOps, AWS, CI/CD, infraestructura'}].map(x => (
                          <div key={x.m} style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>{x.m}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{x.d}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Ve a Agentes IA → selecciona Hoku → prueba el mismo prompt en modo Chat vs Code. ¿Cómo cambia la respuesta?</div>
                    </>
                  )},
                  { title: 'Hoku vs Panchita — cuándo usar cada uno', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Hoku 🐾 y Panchita 🐕 son dos personalidades del mismo motor. La diferencia está en el approach.</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '16px 0' }}>
                        <div style={{ background: '#0d1117', border: '1px solid rgba(226,232,240,0.1)', borderRadius: 10, padding: 16 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0', marginBottom: 8 }}>🐾 Hoku</div>
                          <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>Rebelde. Ejecuta directo.<br/>No pregunta, hace.<br/>Ideal para tareas claras.</div>
                        </div>
                        <div style={{ background: '#0d1117', border: '1px solid rgba(212,165,116,0.1)', borderRadius: 10, padding: 16 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#d4a574', marginBottom: 8 }}>🐕 Panchita</div>
                          <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>Metódica. Planifica primero.<br/>Pregunta, valida, confirma.<br/>Ideal para decisiones.</div>
                        </div>
                      </div>
                      <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Resumen:</strong> Usa Hoku para &quot;hazlo ya&quot;. Usa Panchita para &quot;pensemos primero&quot;.</div>
                    </>
                  )},
                ],
                m2: [
                  { title: 'Crear proyecto Next.js 16', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Next.js 16 con App Router es el framework que usamos en toda la intranet de SmartConnection. Vamos a crear un proyecto desde cero y entender la estructura.</p>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Crear el proyecto</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`# Crear proyecto con App Router + TypeScript + Tailwind
npx create-next-app@latest mi-app-ia --typescript --tailwind --app --src-dir
cd mi-app-ia

# Estructura resultante:
mi-app-ia/
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Layout raíz (Server Component)
│   │   ├── page.tsx         # Página principal
│   │   ├── globals.css      # Estilos globales + Tailwind
│   │   └── api/             # API Routes (Route Handlers)
│   │       └── chat/
│   │           └── route.ts # POST /api/chat
├── public/                  # Assets estáticos
├── next.config.ts           # Configuración
├── tailwind.config.ts       # Tailwind
└── tsconfig.json            # TypeScript`}</pre>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>App Router vs Pages Router</h4>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>App Router usa Server Components por defecto. Solo agrega <code style={{ color: '#a8d8ea', background: '#06080f', padding: '2px 6px', borderRadius: 4 }}>{`'use client'`}</code> cuando necesites interactividad (useState, onClick, etc).</p>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// src/app/page.tsx — Server Component (default)
export default function Home() {
  return <h1>Mi App con IA</h1>;
}

// src/app/chat/page.tsx — Client Component (interactivo)
'use client';
import { useState } from 'react';

export default function ChatPage() {
  const [messages, setMessages] = useState<string[]>([]);
  return <div>Chat con IA</div>;
}`}</pre>
                      <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> En SmartConnection usamos <code>src/app/dashboard/</code> como layout protegido con auth. Cada sección (learn, agents, kanban) es una carpeta dentro.</div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Crea un proyecto Next.js local. Agrega una ruta <code>/chat</code> con un textarea y un botón &quot;Enviar&quot;. Todavía sin IA, solo el UI.</div>
                    </>
                  )},
                  { title: 'Conectar con Groq API', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Groq ofrece inferencia ultra rápida con modelos como Llama 3.3 70B. Su API es compatible con OpenAI, así que la integración es directa.</p>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Instalar el SDK</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`npm install groq-sdk

# Crear .env.local
GROQ_API_KEY=gsk_tu_api_key_aqui`}</pre>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Crear API Route con streaming</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// src/app/api/chat/route.ts
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const { message } = await req.json();

  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: 'Eres un asistente útil. Responde en español.' },
      { role: 'user', content: message },
    ],
    stream: true,
  });

  // Crear ReadableStream para SSE
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}`}</pre>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Consumir el stream en el cliente</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// En tu componente cliente
const sendMessage = async (text: string) => {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text }),
  });

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  let result = '';

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value);
    setResponse(result); // Actualiza UI en tiempo real
  }
};`}</pre>
                      <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> Groq es gratis hasta 6,000 tokens/min. Para producción, Hoku usa un router multi-provider que cambia entre Groq, OpenAI y Claude según la tarea.</div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Conecta tu página <code>/chat</code> con la API Route. Verifica que la respuesta aparece en streaming (letra por letra). Pídele a Hoku que te ayude si te trabas.</div>
                    </>
                  )},
                  { title: 'Deploy en Vercel', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Vercel es la plataforma oficial de Next.js. Deploy en un push. La intranet de SmartConnection usa AWS Amplify, pero para proyectos personales Vercel es más simple.</p>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Pasos para deploy</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`# 1. Inicializar git y subir a GitHub
git init
git add .
git commit -m "feat: app de chat con Groq streaming"
git remote add origin https://github.com/tu-usuario/mi-app-ia.git
git push -u origin main

# 2. En vercel.com:
#    → Import Git Repository → seleccionar mi-app-ia
#    → Framework: Next.js (detecta automático)
#    → Build: npm run build (default)

# 3. Configurar Environment Variables:
#    → Settings → Environment Variables
#    → GROQ_API_KEY = gsk_tu_key_aqui
#    → Aplica a Production + Preview

# 4. Re-deploy para que tome las env vars
#    → Deployments → último → Redeploy`}</pre>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Verificar el deploy</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`# Tu app estará en:
https://mi-app-ia.vercel.app

# Verifica que el chat funcione:
# 1. Abre la URL
# 2. Escribe un mensaje
# 3. Confirma que llega respuesta en streaming
# 4. Revisa logs en Vercel Dashboard → Logs`}</pre>
                      <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> Cada push a main hace deploy automático. Los PRs generan Preview Deployments con URL única. Útil para code review.</div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Haz deploy de tu app en Vercel. Comparte la URL en el chat de Hoku y pídele que la revise. ¿Funciona el streaming?</div>
                    </>
                  )},
                ],
                m3: [
                  { title: 'Setup Supabase con pgvector', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>pgvector es una extensión de PostgreSQL que permite almacenar y buscar embeddings vectoriales. Supabase la incluye nativamente. Es la base de cualquier sistema RAG.</p>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Habilitar la extensión</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`-- En el SQL Editor de Supabase:
CREATE EXTENSION IF NOT EXISTS vector;`}</pre>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Crear tabla de documentos con embeddings</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(1536),  -- dimensión de text-embedding-3-small
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsqueda rápida (IVFFlat)
CREATE INDEX ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Función de búsqueda por similitud
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.78,
  match_count INT DEFAULT 5
)
RETURNS TABLE (id BIGINT, content TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id, d.content, d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;`}</pre>
                      <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> El operador <code>&lt;=&gt;</code> calcula distancia coseno en pgvector. Menor distancia = mayor similitud. Por eso hacemos <code>1 - distancia</code> para obtener el score.</div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Crea la tabla <code>documents</code> en tu proyecto Supabase. Verifica que la extensión vector esté habilitada con <code>SELECT * FROM pg_extension WHERE extname = &apos;vector&apos;;</code></div>
                    </>
                  )},
                  { title: 'Generar embeddings con OpenAI', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Los embeddings convierten texto en vectores numéricos que capturan el significado semántico. Textos similares tienen vectores cercanos en el espacio vectorial.</p>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Instalar dependencias</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`npm install openai @supabase/supabase-js

# .env.local
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...`}</pre>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Generar e insertar embeddings</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// src/lib/embeddings.ts
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

export async function insertDocument(content: string, metadata = {}) {
  const embedding = await generateEmbedding(content);

  const { error } = await supabase.from('documents').insert({
    content,
    metadata,
    embedding,
  });

  if (error) throw error;
}

// Ejemplo: ingestar documentos
const docs = [
  'Next.js 16 usa App Router con Server Components por defecto.',
  'Supabase ofrece PostgreSQL con auth, storage y realtime incluido.',
  'Groq usa LPU para inferencia ultra rápida de modelos Llama.',
];

for (const doc of docs) {
  await insertDocument(doc, { source: 'manual' });
}`}</pre>
                      <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> <code>text-embedding-3-small</code> cuesta $0.02/1M tokens y genera vectores de 1536 dimensiones. Para la mayoría de casos en español, funciona excelente.</div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Crea un script que inserte 5 documentos sobre tu área de trabajo en la tabla <code>documents</code>. Verifica en el SQL Editor que los embeddings se guardaron (la columna embedding debería tener valores).</div>
                    </>
                  )},
                  { title: 'Búsqueda semántica', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Ahora que tenemos documentos con embeddings, podemos buscar por significado en vez de keywords exactas. Esto es el corazón de RAG: Retrieval Augmented Generation.</p>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>API Route de búsqueda semántica</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// src/app/api/search/route.ts
import { generateEmbedding } from '@/lib/embeddings';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  const { query } = await req.json();

  // 1. Convertir query a embedding
  const queryEmbedding = await generateEmbedding(query);

  // 2. Buscar documentos similares
  const { data: docs } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: 0.75,
    match_count: 3,
  });

  return Response.json({ results: docs });
}`}</pre>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Integrar con el chat (RAG completo)</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// src/app/api/chat-rag/route.ts
import Groq from 'groq-sdk';
import { generateEmbedding } from '@/lib/embeddings';
import { createClient } from '@supabase/supabase-js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  const { message } = await req.json();

  // 1. Buscar contexto relevante
  const embedding = await generateEmbedding(message);
  const { data: docs } = await supabase.rpc('match_documents', {
    query_embedding: embedding,
    match_threshold: 0.75,
    match_count: 3,
  });

  const context = docs?.map((d: { content: string }) => d.content).join('\\n') || '';

  // 2. Generar respuesta con contexto
  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: \`Responde basándote en este contexto:\\n\${context}\\n\\nSi no encuentras la respuesta en el contexto, dilo.\`,
      },
      { role: 'user', content: message },
    ],
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}`}</pre>
                      <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> El threshold de 0.75 funciona bien para español. Si obtienes resultados irrelevantes, súbelo a 0.80. Si faltan resultados, bájalo a 0.70.</div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Conecta tu chat con la API RAG. Inserta 10 documentos sobre un tema que conozcas. Haz preguntas y verifica que las respuestas usan el contexto correcto.</div>
                    </>
                  )},
                ],
                m4: [
                  { title: 'Qué es Tool Use', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Tool Use (o Function Calling) permite que un LLM decida cuándo llamar a una función externa. En vez de solo generar texto, el modelo puede consultar bases de datos, llamar APIs o ejecutar acciones.</p>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Cómo funciona el flujo</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// Flujo de Tool Use:
// 1. Tú defines las tools disponibles (schema JSON)
// 2. Envías el mensaje del usuario + tools al modelo
// 3. El modelo decide si necesita una tool
// 4. Si sí → responde con tool_use (nombre + parámetros)
// 5. Tú ejecutas la función real
// 6. Envías el resultado de vuelta al modelo
// 7. El modelo genera la respuesta final con los datos

Usuario: "¿Cuántos leads tenemos este mes?"
    ↓
Claude: tool_use → get_leads_count({ month: "2026-03" })
    ↓
Tu código: ejecuta query a Supabase → 42 leads
    ↓
Claude: "Este mes tienen 42 leads registrados."`}</pre>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Definir una tool</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// Schema de tool para Claude/Anthropic
const tools = [
  {
    name: 'get_leads_count',
    description: 'Obtiene la cantidad de leads registrados en un período',
    input_schema: {
      type: 'object',
      properties: {
        month: {
          type: 'string',
          description: 'Mes en formato YYYY-MM',
        },
        status: {
          type: 'string',
          enum: ['new', 'contacted', 'qualified', 'closed'],
          description: 'Filtrar por estado del lead',
        },
      },
      required: ['month'],
    },
  },
];`}</pre>
                      <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> La descripción de la tool es clave. El modelo decide cuándo usarla basándose en ella. Sé específico: &quot;Obtiene leads de Supabase&quot; es mejor que &quot;Consulta datos&quot;.</div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Pregúntale a Hoku en modo Code: &quot;Diseña 3 tools para un sistema de inventario de productos: buscar producto, ver stock y actualizar precio&quot;. Revisa los schemas que genera.</div>
                    </>
                  )},
                  { title: 'Conectar Claude con Supabase', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Vamos a implementar un endpoint donde Claude puede consultar datos de Supabase usando Tool Use. Este es el patrón que usa Hoku internamente.</p>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Implementación completa</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// src/app/api/agent/route.ts
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const tools: Anthropic.Tool[] = [
  {
    name: 'query_leads',
    description: 'Consulta leads en la base de datos con filtros opcionales',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Estado: new, contacted, qualified, closed' },
        limit: { type: 'number', description: 'Máximo de resultados (default 10)' },
      },
      required: [],
    },
  },
];

// Handler que ejecuta la tool real
async function handleTool(name: string, input: Record<string, unknown>) {
  if (name === 'query_leads') {
    let query = supabase.from('leads').select('*');
    if (input.status) query = query.eq('status', input.status);
    const { data } = await query.limit((input.limit as number) || 10);
    return JSON.stringify(data);
  }
  return 'Tool no encontrada';
}

export async function POST(req: Request) {
  const { message } = await req.json();

  // Primera llamada: Claude decide si usar tools
  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    tools,
    messages: [{ role: 'user', content: message }],
  });

  // Loop: mientras Claude quiera usar tools
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: message },
  ];

  while (response.stop_reason === 'tool_use') {
    const toolBlock = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );
    if (!toolBlock) break;

    const result = await handleTool(toolBlock.name, toolBlock.input as Record<string, unknown>);

    messages.push({ role: 'assistant', content: response.content });
    messages.push({
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: toolBlock.id, content: result }],
    });

    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      tools,
      messages,
    });
  }

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === 'text'
  );
  return Response.json({ response: textBlock?.text || '' });
}`}</pre>
                      <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> El loop de tool_use es importante. Claude puede necesitar llamar múltiples tools antes de responder. Siempre verifica <code>stop_reason</code>.</div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Implementa una tool <code>search_documents</code> que use la función <code>match_documents</code> de la misión anterior. Ahora Claude puede buscar en tu base de conocimiento.</div>
                    </>
                  )},
                  { title: 'Multi-tool chain', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>El verdadero poder de Tool Use aparece cuando el modelo encadena múltiples tools en una sola conversación. Por ejemplo: buscar un producto, verificar stock y generar una cotización.</p>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Ejemplo: Agente de ventas con 3 tools</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`const tools: Anthropic.Tool[] = [
  {
    name: 'search_products',
    description: 'Busca productos por nombre o categoría',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Término de búsqueda' },
      },
      required: ['query'],
    },
  },
  {
    name: 'check_stock',
    description: 'Verifica stock disponible de un producto por ID',
    input_schema: {
      type: 'object' as const,
      properties: {
        product_id: { type: 'number', description: 'ID del producto' },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'create_quote',
    description: 'Crea una cotización con productos y cantidades',
    input_schema: {
      type: 'object' as const,
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              product_id: { type: 'number' },
              quantity: { type: 'number' },
            },
          },
          description: 'Lista de productos y cantidades',
        },
        client_name: { type: 'string', description: 'Nombre del cliente' },
      },
      required: ['items', 'client_name'],
    },
  },
];

// Conversación del usuario:
// "Cotiza 5 teclados mecánicos para Juan Pérez"
//
// Claude ejecutará automáticamente:
// 1. search_products({ query: "teclado mecánico" })
// 2. check_stock({ product_id: 42 })
// 3. create_quote({ items: [{ product_id: 42, quantity: 5 }],
//                    client_name: "Juan Pérez" })`}</pre>
                      <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> En producción, limita las tools a las que el usuario tiene permiso. Un agente de ventas no debería poder borrar datos. Usa roles de Supabase RLS.</div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Agrega una cuarta tool <code>send_email</code> que simule enviar la cotización por email. Prueba que Claude la encadene después de <code>create_quote</code>.</div>
                    </>
                  )},
                ],
                m5: [
                  { title: 'Agregar un modelo nuevo a Hoku', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Hoku es un agente multi-provider: puede usar Claude, Groq, OpenAI, DeepSeek, Mistral y más. Todos pasan por un adaptador OpenAI-compatible en <code>openai-compat.ts</code>.</p>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Estructura del router de modelos</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// src/lib/openai-compat.ts — Patrón simplificado

interface ProviderConfig {
  baseURL: string;
  apiKey: string;
  models: string[];
}

const PROVIDERS: Record<string, ProviderConfig> = {
  groq: {
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY!,
    models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
  },
  deepseek: {
    baseURL: 'https://api.deepseek.com/v1',
    apiKey: process.env.DEEPSEEK_API_KEY!,
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  openai: {
    baseURL: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY!,
    models: ['gpt-4o', 'gpt-4o-mini'],
  },
  // Agregar un nuevo provider:
  mistral: {
    baseURL: 'https://api.mistral.ai/v1',
    apiKey: process.env.MISTRAL_API_KEY!,
    models: ['mistral-large-latest', 'mistral-small-latest'],
  },
};

// Resolver provider desde el nombre del modelo
function getProvider(model: string): ProviderConfig {
  for (const [, config] of Object.entries(PROVIDERS)) {
    if (config.models.includes(model)) return config;
  }
  return PROVIDERS.groq; // fallback
}`}</pre>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Agregar Mistral como provider</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// 1. Agregar env var en .env.local
MISTRAL_API_KEY=tu_key_aqui

// 2. Agregar al objeto PROVIDERS (como arriba)

// 3. Agregar al selector de modelos en el UI
const MODEL_OPTIONS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', provider: 'Groq' },
  { id: 'deepseek-chat', label: 'DeepSeek V3', provider: 'DeepSeek' },
  { id: 'mistral-large-latest', label: 'Mistral Large', provider: 'Mistral' },
  // ... más modelos
];

// 4. La API Route ya funciona — usa OpenAI SDK apuntando al baseURL
import OpenAI from 'openai';

const provider = getProvider(selectedModel);
const client = new OpenAI({
  baseURL: provider.baseURL,
  apiKey: provider.apiKey,
});`}</pre>
                      <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> La mayoría de providers modernos son OpenAI-compatible. Solo cambia <code>baseURL</code> y <code>apiKey</code>. Groq, DeepSeek, Mistral, Together AI, todos funcionan así.</div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Crea una cuenta gratis en Mistral (<code>console.mistral.ai</code>). Obtén tu API key y agrégala al proyecto. Prueba que Hoku pueda responder con Mistral Large.</div>
                    </>
                  )},
                  { title: 'Tracing con agent_logs', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Cada interacción con Hoku se registra en la tabla <code>agent_logs</code> de Supabase. Esto permite ver métricas de uso, costos, latencia y calidad de respuestas.</p>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Schema de agent_logs</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`CREATE TABLE agent_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  model TEXT NOT NULL,          -- 'llama-3.3-70b-versatile'
  provider TEXT NOT NULL,       -- 'groq'
  mode TEXT DEFAULT 'chat',     -- 'chat', 'code', 'sap', 'deploy'
  prompt_tokens INT,
  completion_tokens INT,
  total_tokens INT,
  latency_ms INT,               -- tiempo de respuesta
  quality_score SMALLINT,       -- 1-5, feedback del usuario
  user_message TEXT,
  assistant_message TEXT,
  metadata JSONB DEFAULT '{}',  -- tool_calls, errors, etc
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices útiles
CREATE INDEX idx_logs_user ON agent_logs(user_id, created_at DESC);
CREATE INDEX idx_logs_model ON agent_logs(model, created_at DESC);`}</pre>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Queries para métricas</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`-- Uso por modelo esta semana
SELECT model, COUNT(*) as requests,
       AVG(latency_ms) as avg_latency,
       SUM(total_tokens) as total_tokens
FROM agent_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY model ORDER BY requests DESC;

-- Calidad promedio por modo
SELECT mode, AVG(quality_score) as avg_quality,
       COUNT(*) as total
FROM agent_logs
WHERE quality_score IS NOT NULL
GROUP BY mode;

-- Costo estimado (ejemplo con precios de Groq)
SELECT model,
  SUM(prompt_tokens) / 1000000.0 * 0.05 +
  SUM(completion_tokens) / 1000000.0 * 0.10 AS estimated_cost_usd
FROM agent_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY model;`}</pre>
                      <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> El campo <code>quality_score</code> viene del feedback 👍/👎 del usuario. Usa esto para comparar modelos: si DeepSeek tiene mejor score que Groq en modo &quot;code&quot;, redirige automáticamente.</div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Ejecuta las queries de métricas en el SQL Editor de Supabase. ¿Qué modelo es el más usado? ¿Cuál tiene mejor latencia? Comparte los resultados con Hoku.</div>
                    </>
                  )},
                  { title: 'Optimizar costos', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>No todos los modelos cuestan lo mismo. La clave es usar el modelo más barato que cumpla con la calidad requerida para cada tarea.</p>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Matriz de decisión por tarea</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// Estrategia de routing por tarea:

// Chat general / Q&A simple:
//   → Groq Llama 3.3 70B (gratis, ultra rápido)

// Generación de código:
//   → DeepSeek V3 ($0.27/1M input, excelente en código)

// Razonamiento complejo / Tool Use:
//   → Claude Sonnet ($3/1M input, mejor tool use)

// Resumen / traducción:
//   → Mistral Small ($0.10/1M, suficiente calidad)

// Implementación en el router:
function selectModel(mode: string, complexity: string): string {
  if (mode === 'code') return 'deepseek-chat';
  if (mode === 'sap' || complexity === 'high') return 'claude-sonnet-4-20250514';
  if (mode === 'deploy') return 'deepseek-chat';
  return 'llama-3.3-70b-versatile'; // default: rápido y gratis
}`}</pre>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Comparativa de precios (Marzo 2026)</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`| Modelo                  | Input/1M   | Output/1M  | Velocidad  |
|------------------------|------------|------------|------------|
| Groq Llama 3.3 70B    | $0.05      | $0.10      | ~800 tok/s |
| DeepSeek V3            | $0.27      | $1.10      | ~60 tok/s  |
| Mistral Small          | $0.10      | $0.30      | ~150 tok/s |
| GPT-4o mini            | $0.15      | $0.60      | ~100 tok/s |
| Claude Sonnet          | $3.00      | $15.00     | ~80 tok/s  |
| GPT-4o                 | $2.50      | $10.00     | ~80 tok/s  |

// Tip: Para 10,000 mensajes/mes promedio:
// Solo Groq: ~$1.50/mes
// Mix inteligente: ~$15/mes
// Solo Claude: ~$180/mes`}</pre>
                      <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> Groq es gratis para desarrollo y tareas simples. Usa Claude solo cuando necesitas razonamiento complejo o Tool Use avanzado. El 80% de requests pueden ir a Groq.</div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Revisa los logs de la última semana. Calcula cuánto costaría si todo fuera Claude vs el mix actual. Pregúntale a Hoku: &quot;¿Cuánto estamos gastando en IA este mes?&quot;</div>
                    </>
                  )},
                ],
                m6: [
                  { title: 'Qué es MCP', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Model Context Protocol (MCP) es un estándar abierto de Anthropic para conectar modelos de IA con herramientas externas. Piensa en USB pero para IA: un protocolo universal para que cualquier modelo use cualquier herramienta.</p>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Arquitectura</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// Arquitectura MCP:
//
//  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
//  │  MCP Client  │────▶│  MCP Server  │────▶│   Resource   │
//  │ (Claude Code │     │ (Tu código)  │     │ (Supabase,   │
//  │  VS Code,    │     │              │     │  GitHub,     │
//  │  tu app)     │     │  Tools       │     │  Slack, etc) │
//  └──────────────┘     │  Resources   │     └──────────────┘
//                       │  Prompts     │
//                       └──────────────┘
//
// MCP Server expone:
// - Tools: funciones que el modelo puede ejecutar
// - Resources: datos que el modelo puede leer
// - Prompts: templates predefinidos

// Transporte: stdio (local) o SSE (remoto)
// Protocolo: JSON-RPC 2.0`}</pre>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Cuándo crear un MCP Server</h4>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Crea un MCP server cuando quieras que Claude Code (o cualquier cliente MCP) pueda interactuar con un servicio que usas frecuentemente. Ejemplos: tu base de datos, tu CRM, tu sistema de tickets.</p>
                      <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> MCP es diferente de Tool Use. Tool Use es una feature de la API de Claude. MCP es un protocolo estándar que funciona con cualquier cliente compatible (Claude Code, VS Code, etc).</div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Revisa los MCP servers disponibles en <code>github.com/modelcontextprotocol/servers</code>. Identifica 3 que serían útiles para SmartConnection. Pídele a Hoku su opinión.</div>
                    </>
                  )},
                  { title: 'Crear un server básico', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Vamos a crear un MCP server en TypeScript que expone tools para consultar datos de Supabase. Claude Code podrá usar estas tools directamente.</p>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Setup del proyecto</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`mkdir mcp-supabase-server && cd mcp-supabase-server
npm init -y
npm install @modelcontextprotocol/sdk @supabase/supabase-js zod
npm install -D typescript @types/node

# tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "strict": true
  }
}`}</pre>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Implementar el server</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// src/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

const server = new McpServer({
  name: 'supabase-server',
  version: '1.0.0',
});

// Tool: consultar leads
server.tool(
  'query_leads',
  'Consulta leads de SmartConnection con filtros',
  {
    status: z.string().optional().describe('Estado: new, contacted, qualified'),
    limit: z.number().default(10).describe('Máximo de resultados'),
  },
  async ({ status, limit }) => {
    let query = supabase.from('leads').select('*');
    if (status) query = query.eq('status', status);
    const { data, error } = await query.limit(limit);

    if (error) return { content: [{ type: 'text' as const, text: \`Error: \${error.message}\` }] };
    return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// Tool: buscar en knowledge base
server.tool(
  'search_knowledge',
  'Búsqueda semántica en la base de conocimiento',
  {
    query: z.string().describe('Texto a buscar'),
  },
  async ({ query }) => {
    const { data } = await supabase
      .from('hoku_knowledge')
      .select('question, answer, quality_score')
      .textSearch('question', query, { type: 'websearch' })
      .order('quality_score', { ascending: false })
      .limit(5);

    return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// Iniciar server
const transport = new StdioServerTransport();
await server.connect(transport);`}</pre>
                      <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> Usa <code>zod</code> para validar inputs. MCP SDK lo integra nativamente. Cada tool debe tener una descripción clara para que el modelo sepa cuándo usarla.</div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Crea el MCP server con la tool <code>query_leads</code>. Compílalo con <code>npx tsc</code> y verifica que no hay errores. En el siguiente paso lo conectaremos con Claude Code.</div>
                    </>
                  )},
                  { title: 'Conectar con Claude Code', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Ahora que tenemos el MCP server compilado, lo conectamos con Claude Code para que pueda usar las tools desde la terminal.</p>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Configurar en Claude Code</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`# Opción 1: Configuración por proyecto
# Crear .mcp.json en la raíz del proyecto:
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": ["./mcp-supabase-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://xxx.supabase.co",
        "SUPABASE_KEY": "eyJ..."
      }
    }
  }
}

# Opción 2: Configuración global
# ~/.claude/settings.json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": ["/ruta/absoluta/mcp-supabase-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://xxx.supabase.co",
        "SUPABASE_KEY": "eyJ..."
      }
    }
  }
}`}</pre>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Probar las tools</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`# En Claude Code, ahora puedes decir:

> "¿Cuántos leads nuevos hay?"
# Claude usará automáticamente query_leads({ status: "new" })

> "Busca en la base de conocimiento sobre configuración de Amplify"
# Claude usará search_knowledge({ query: "configuración Amplify" })

# Para verificar que las tools están disponibles:
> /mcp
# Mostrará los servers conectados y sus tools`}</pre>
                      <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> Usa <code>.mcp.json</code> por proyecto para servers específicos y <code>settings.json</code> global para servers que usas en todos los proyectos (como Supabase).</div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Conecta tu MCP server con Claude Code. Pídele que consulte los leads. Luego agrega una tercera tool que inserte datos. Verifica todo el flujo end-to-end.</div>
                    </>
                  )},
                ],
                m7: [
                  { title: 'CI/CD con GitHub Actions', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>GitHub Actions permite automatizar build, test y deploy en cada push o PR. Cada workflow es un archivo YAML en <code>.github/workflows/</code>.</p>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Workflow básico para Next.js</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build
        env:
          GROQ_API_KEY: \${{ secrets.GROQ_API_KEY }}
          NEXT_PUBLIC_SUPABASE_URL: \${{ secrets.SUPABASE_URL }}

      - name: Test
        run: npm test -- --passWithNoTests`}</pre>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Triggers comunes</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`# Solo en push a main
on:
  push:
    branches: [main]

# En PRs hacia main
on:
  pull_request:
    branches: [main]

# Programado (cron) — ej: cada lunes a las 9am
on:
  schedule:
    - cron: '0 9 * * 1'

# Manual desde GitHub UI
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deploy environment'
        required: true
        default: 'staging'`}</pre>
                      <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> AWS Amplify ya tiene CI/CD integrado. GitHub Actions es útil para pasos adicionales: lint, type-check, tests, security scans. Complementa, no reemplaza, el deploy de Amplify.</div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Crea el workflow <code>ci.yml</code> en tu repo. Haz un push y verifica que el job se ejecute correctamente en la pestaña Actions de GitHub.</div>
                    </>
                  )},
                  { title: 'Code review con IA', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Puedes usar IA para revisar automáticamente cada PR. DeepSeek es excelente para code review por su capacidad de análisis de código y bajo costo.</p>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Workflow de code review automático</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`# .github/workflows/ai-review.yml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Get diff
        id: diff
        run: |
          DIFF=$(git diff origin/main...HEAD -- '*.ts' '*.tsx' | head -c 10000)
          echo "diff<<EOF" >> $GITHUB_OUTPUT
          echo "$DIFF" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: AI Review
        uses: actions/github-script@v7
        env:
          DEEPSEEK_API_KEY: \${{ secrets.DEEPSEEK_API_KEY }}
        with:
          script: |
            const diff = \`\${{ steps.diff.outputs.diff }}\`;
            if (!diff.trim()) return;

            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': \`Bearer \${process.env.DEEPSEEK_API_KEY}\`
              },
              body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [{
                  role: 'system',
                  content: 'Eres un code reviewer experto en Next.js + TypeScript. Revisa el diff y reporta: bugs, seguridad, performance, mejoras. Sé conciso. Responde en español.'
                }, {
                  role: 'user',
                  content: \`Revisa este diff:\\n\\\`\\\`\\\`diff\\n\${diff}\\n\\\`\\\`\\\`\`
                }],
                max_tokens: 1000
              })
            });

            const data = await response.json();
            const review = data.choices[0].message.content;

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: \`## 🤖 AI Code Review\\n\\n\${review}\\n\\n---\\n*Powered by DeepSeek V3*\`
            });`}</pre>
                      <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> DeepSeek V3 cuesta $0.27/1M tokens input. Un code review típico usa ~2000 tokens. Eso es ~$0.0005 por review. Prácticamente gratis.</div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Agrega el workflow de AI review a tu repo. Crea un PR con un bug intencional (ej: <code>console.log</code> olvidado) y verifica que DeepSeek lo detecte.</div>
                    </>
                  )},
                  { title: 'Security scanning', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>DevSecOps integra seguridad en el pipeline de desarrollo. GitHub ofrece Dependabot, CodeQL y secret scanning sin costo para repos públicos.</p>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Dependabot — Dependencias actualizadas</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    labels:
      - "dependencies"
    # Agrupar updates menores
    groups:
      minor-and-patch:
        update-types:
          - "minor"
          - "patch"`}</pre>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>CodeQL — Análisis estático de seguridad</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`# .github/workflows/codeql.yml
name: CodeQL Analysis

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'  # Cada lunes a las 6am

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write

    steps:
      - uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
          queries: security-extended

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3`}</pre>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Secret detection con custom workflow</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`# En tu workflow CI, agrega este step:
- name: Check for secrets in code
  run: |
    # Buscar patrones de API keys en el código
    PATTERNS="sk-[a-zA-Z0-9]{20,}|gsk_[a-zA-Z0-9]{20,}|eyJ[a-zA-Z0-9._-]{50,}"
    if grep -rE "$PATTERNS" --include='*.ts' --include='*.tsx' src/; then
      echo "::error::Posible secret en el código fuente!"
      exit 1
    fi
    echo "✅ No se encontraron secrets"

# También habilitar en GitHub:
# Settings → Code security → Secret scanning → Enable`}</pre>
                      <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> La regla número 1 de seguridad: nunca hardcodear secrets. Usa siempre <code>process.env</code> en el código y GitHub Secrets en los workflows. Revisa tu <code>.gitignore</code> incluya <code>.env*</code>.</div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Habilita Dependabot y CodeQL en tu repo. Revisa si hay vulnerabilidades en tus dependencias actuales con <code>npm audit</code>. Pídele a Hoku que corrija las que encuentre.</div>
                    </>
                  )},
                ],
                m8: [
                  { title: 'Diseñar el schema', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>InfoPet es un asistente veterinario con RAG. Necesitamos tablas para productos (de Bsale/Jumpseller), consultas de usuarios y embeddings para búsqueda semántica.</p>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Schema de la base de datos</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`-- Extensión para embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Productos sincronizados desde Bsale/Jumpseller
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  external_id TEXT NOT NULL,       -- ID en Bsale o Jumpseller
  source TEXT NOT NULL,            -- 'bsale' | 'jumpseller'
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,                   -- 'alimento', 'medicamento', 'accesorio'
  species TEXT[],                  -- ['perro', 'gato']
  price DECIMAL(10,2),
  stock INT DEFAULT 0,
  image_url TEXT,
  metadata JSONB DEFAULT '{}',    -- datos extra del provider
  embedding VECTOR(1536),         -- para búsqueda semántica
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Base de conocimiento veterinario
CREATE TABLE vet_knowledge (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,           -- artículo, ficha técnica, etc
  category TEXT,                   -- 'nutricion', 'salud', 'comportamiento'
  species TEXT[],                  -- ['perro', 'gato', 'conejo']
  source TEXT,                     -- URL o referencia
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historial de consultas del usuario
CREATE TABLE pet_consultations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  assistant_message TEXT NOT NULL,
  products_referenced BIGINT[],   -- IDs de productos mencionados
  knowledge_used BIGINT[],        -- IDs de vet_knowledge usados
  model TEXT,
  tokens_used INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsqueda vectorial
CREATE INDEX ON products USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
CREATE INDEX ON vet_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);`}</pre>
                      <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> El campo <code>species</code> es un array para productos multi-especie. <code>JSONB metadata</code> guarda datos variables del provider sin alterar el schema.</div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Crea las tablas en Supabase. Inserta 5 productos de ejemplo y 3 artículos de conocimiento veterinario. Verifica en el SQL Editor que todo funcione.</div>
                    </>
                  )},
                  { title: 'Pipeline RAG completo', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>El pipeline RAG de InfoPet tiene 3 fases: ingest (cargar datos), search (buscar contexto relevante) y generate (generar respuesta con el contexto).</p>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Fase 1: Ingest — Cargar y embeddear documentos</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// src/lib/infopet/ingest.ts
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return res.data[0].embedding;
}

// Ingestar conocimiento veterinario
export async function ingestKnowledge(articles: {
  title: string; content: string; category: string; species: string[];
}[]) {
  for (const article of articles) {
    const textToEmbed = \`\${article.title}. \${article.content}\`;
    const embedding = await embed(textToEmbed);

    await supabase.from('vet_knowledge').insert({
      ...article,
      embedding,
    });
  }
}

// Ingestar productos (embeddear nombre + descripción)
export async function ingestProducts(products: {
  external_id: string; source: string; name: string;
  description: string; category: string; species: string[];
  price: number; stock: number;
}[]) {
  for (const product of products) {
    const textToEmbed = \`\${product.name}. \${product.description}. Categoría: \${product.category}\`;
    const embedding = await embed(textToEmbed);

    await supabase.from('products').upsert({
      ...product,
      embedding,
    }, { onConflict: 'external_id,source' });
  }
}`}</pre>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Fase 2 y 3: Search + Generate</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// src/app/api/infopet/chat/route.ts
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const { message, session_id } = await req.json();

  // 1. SEARCH — Buscar contexto relevante
  const embedding = await embed(message);

  // Buscar en conocimiento veterinario
  const { data: knowledge } = await supabase.rpc('match_documents_vet', {
    query_embedding: embedding,
    match_threshold: 0.75,
    match_count: 3,
  });

  // Buscar productos relevantes
  const { data: products } = await supabase.rpc('match_products', {
    query_embedding: embedding,
    match_threshold: 0.70,
    match_count: 3,
  });

  // 2. GENERATE — Responder con contexto
  const context = [
    '## Conocimiento veterinario:',
    ...(knowledge?.map((k: { title: string; content: string }) =>
      \`- \${k.title}: \${k.content}\`) || []),
    '## Productos disponibles:',
    ...(products?.map((p: { name: string; price: number; stock: number }) =>
      \`- \${p.name} ($\${p.price}) - Stock: \${p.stock}\`) || []),
  ].join('\\n');

  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: \`Eres InfoPet, un asistente veterinario experto. Responde en español chileno, amigable.
Usa SOLO la información del contexto. Si no sabes, di que consulten a un veterinario.
Si hay productos relevantes, recomiéndalos con precio.

Contexto:
\${context}\`,
      },
      { role: 'user', content: message },
    ],
    stream: true,
  });

  // Stream response...
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}`}</pre>
                      <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> Buscar en dos tablas (conocimiento + productos) da mejores respuestas. El modelo puede combinar la información médica con recomendaciones de productos concretos.</div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Ingesta 10 artículos veterinarios y 10 productos. Haz preguntas como &quot;Mi perro tiene diarrea, ¿qué le doy?&quot; y verifica que la respuesta use el contexto correcto.</div>
                    </>
                  )},
                  { title: 'Integrar con Bsale/Jumpseller', content: (
                    <>
                      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>InfoPet se conecta con Bsale y Jumpseller para sincronizar productos reales: alimentos, medicamentos, accesorios. Las APIs permiten leer catálogo, stock y precios.</p>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Conectar con Bsale API</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// src/lib/infopet/bsale.ts

const BSALE_API = 'https://api.bsale.io/v1';
const BSALE_TOKEN = process.env.BSALE_ACCESS_TOKEN!;

interface BsaleProduct {
  id: number;
  name: string;
  description: string;
  classifications: { name: string }[];
}

export async function fetchBsaleProducts(): Promise<BsaleProduct[]> {
  const res = await fetch(\`\${BSALE_API}/products.json?limit=50&state=1\`, {
    headers: { 'access_token': BSALE_TOKEN },
  });
  const data = await res.json();
  return data.items || [];
}

// Obtener stock de variantes
export async function fetchBsaleStock(productId: number) {
  const res = await fetch(\`\${BSALE_API}/products/\${productId}/variants.json\`, {
    headers: { 'access_token': BSALE_TOKEN },
  });
  const data = await res.json();
  return data.items?.map((v: { id: number; description: string; finalPrice: number; stock: number }) => ({
    variant_id: v.id,
    name: v.description,
    price: v.finalPrice,
    stock: v.stock,
  }));
}`}</pre>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Conectar con Jumpseller API</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// src/lib/infopet/jumpseller.ts

const JS_API = 'https://api.jumpseller.com/v1';
const JS_LOGIN = process.env.JUMPSELLER_LOGIN!;
const JS_TOKEN = process.env.JUMPSELLER_AUTH_TOKEN!;

export async function fetchJumpsellerProducts() {
  const res = await fetch(
    \`\${JS_API}/products.json?login=\${JS_LOGIN}&authtoken=\${JS_TOKEN}&limit=50\`
  );
  const data = await res.json();
  return data.map((item: { product: { id: number; name: string; description: string; price: number; stock: number } }) => ({
    id: item.product.id,
    name: item.product.name,
    description: item.product.description,
    price: item.product.price,
    stock: item.product.stock,
  }));
}`}</pre>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#00e5b0', margin: '20px 0 10px' }}>Sync automático con cron</h4>
                      <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// src/app/api/infopet/sync/route.ts
import { fetchBsaleProducts } from '@/lib/infopet/bsale';
import { fetchJumpsellerProducts } from '@/lib/infopet/jumpseller';
import { ingestProducts } from '@/lib/infopet/ingest';

export async function POST(req: Request) {
  // Verificar API key para seguridad
  const authHeader = req.headers.get('authorization');
  if (authHeader !== \`Bearer \${process.env.SYNC_SECRET}\`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Sync Bsale
  const bsaleProducts = await fetchBsaleProducts();
  await ingestProducts(bsaleProducts.map(p => ({
    external_id: String(p.id),
    source: 'bsale',
    name: p.name,
    description: p.description || '',
    category: p.classifications?.[0]?.name || 'general',
    species: [],  // clasificar manualmente o con IA
    price: 0,     // se obtiene de variants
    stock: 0,
  })));

  // Sync Jumpseller
  const jsProducts = await fetchJumpsellerProducts();
  await ingestProducts(jsProducts.map((p: { id: number; name: string; description: string; price: number; stock: number }) => ({
    external_id: String(p.id),
    source: 'jumpseller',
    name: p.name,
    description: p.description || '',
    category: 'general',
    species: [],
    price: p.price,
    stock: p.stock,
  })));

  return Response.json({
    synced: { bsale: bsaleProducts.length, jumpseller: jsProducts.length },
  });
}

// Llamar desde un cron job (GitHub Actions o Vercel Cron):
// POST /api/infopet/sync con Authorization: Bearer <SYNC_SECRET>`}</pre>
                      <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> Bsale y Jumpseller tienen rate limits diferentes. Bsale permite ~60 req/min, Jumpseller ~120 req/min. Agrega delays si sincronizas muchos productos.</div>
                      <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Si tienes acceso a Bsale o Jumpseller, sincroniza productos reales. Si no, crea un mock de la API y prueba el flujo completo: sync → embed → search → chat.</div>
                    </>
                  )},
                ],
              };
              const steps = LESSONS[activeMission] || [{ title: 'Contenido en desarrollo', content: <p style={{ color: '#64748b' }}>Esta misión está siendo creada. Pronto tendrá contenido interactivo.</p> }];
              const step = steps[activeStep] || steps[0];
              return (
                <>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(0,229,176,0.1)', color: '#00e5b0' }}>Semana {activeMission?.replace('m','')}</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(79,142,247,0.1)', color: '#4f8ef7' }}>Paso {activeStep + 1} de {steps.length}</span>
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 16 }}>{step.title}</h2>
                  {step.content}
                  <div style={{ display: 'flex', gap: 8, marginTop: 32, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button onClick={() => setActiveStep(Math.max(0, activeStep - 1))} disabled={activeStep === 0}
                      style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: activeStep === 0 ? 'default' : 'pointer', background: 'rgba(255,255,255,0.04)', color: activeStep === 0 ? '#2a3d58' : '#94a3b8', border: 'none' }}>← Anterior</button>
                    <button onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))} disabled={activeStep >= steps.length - 1}
                      style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: activeStep >= steps.length - 1 ? 'default' : 'pointer', background: activeStep >= steps.length - 1 ? 'rgba(255,255,255,0.04)' : 'rgba(0,229,176,0.1)', color: activeStep >= steps.length - 1 ? '#2a3d58' : '#00e5b0', border: activeStep >= steps.length - 1 ? 'none' : '1px solid rgba(0,229,176,0.2)' }}>Siguiente →</button>
                  </div>
                </>
              );
            })()}
          </div>
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
              <iframe
                src={`/api/proxy?url=${encodeURIComponent(activeResource.resource.url)}`}
                style={{ flex: 1, border: 'none', background: '#fff' }}
                title={activeResource.resource.title}
              />
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
