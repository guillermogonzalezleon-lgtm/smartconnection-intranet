'use client';
import { useState, useEffect, useCallback } from 'react';
import { FlowDiagram, ArchDiagram, ComparisonDiagram, SchemaDiagram } from '@/components/LessonDiagram';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

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

interface Mission {
  id: string;
  title: string;
  description: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  tools: string;
  tutorialCount: number;
  gradient: string;
  badges: { label: string; type: string }[];
  filters: string[];
  overview: {
    useCase: string;
    challenge: string;
    solution: string;
    diagram: { steps: string[]; colors: string[] };
    learnings: string[];
    prerequisites: string;
    cost: string;
  };
  board: { col: string; icon: string; items: { title: string; type: string; typeColor: string; duration: string }[] }[];
}

// ═══════════════════════════════════════════════════════════════
// TECH TAB DATA
// ═══════════════════════════════════════════════════════════════

const CATEGORIES = ['Todos', 'IA', 'Desarrollo', 'Cloud', 'SAP', 'Diseño', 'Extensiones'];

const typeIcons: Record<string, { icon: string; color: string; label: string }> = {
  docs: { icon: '📄', color: '#3b82f6', label: 'Docs' },
  video: { icon: '▶️', color: '#ef4444', label: 'Video' },
  playground: { icon: '⚡', color: '#22c55e', label: 'Playground' },
  tutorial: { icon: '🎓', color: '#f59e0b', label: 'Tutorial' },
};

const COURSES: Course[] = [
  { id: 'claude-api', emoji: '🤖', title: 'Claude API & Anthropic SDK', subtitle: 'Integrar Claude en aplicaciones — streaming, tool use, agentes', category: 'IA', level: 'Intermedio', tags: ['Claude', 'API', 'Streaming', 'Agentes'], resources: [
    { title: 'Anthropic API Docs', description: 'Referencia completa de la API de Claude', url: 'https://docs.anthropic.com/en/api/getting-started', type: 'docs' },
    { title: 'Prompt Engineering Guide', description: 'Técnicas avanzadas de prompting', url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview', type: 'tutorial' },
    { title: 'Tool Use (Function Calling)', description: 'Conectar Claude con APIs externas', url: 'https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview', type: 'docs' },
    { title: 'Streaming con SSE', description: 'Respuestas en tiempo real', url: 'https://docs.anthropic.com/en/api/streaming', type: 'docs' },
  ]},
  { id: 'groq-speed', emoji: '⚡', title: 'Groq — Inferencia ultra rápida', subtitle: 'LPU para modelos Llama a velocidad récord', category: 'IA', level: 'Principiante', tags: ['Groq', 'Llama', 'LPU', 'Gratis'], resources: [
    { title: 'Groq Console', description: 'Dashboard y API keys', url: 'https://console.groq.com', type: 'playground' },
    { title: 'Groq API Docs', description: 'OpenAI-compatible API', url: 'https://console.groq.com/docs/api-reference', type: 'docs' },
    { title: 'Modelos disponibles', description: 'Llama 3.3 70B, Mixtral, Gemma', url: 'https://console.groq.com/docs/models', type: 'docs' },
  ]},
  { id: 'openai-gpt', emoji: '🧠', title: 'OpenAI — GPT-4o & Assistants', subtitle: 'APIs de OpenAI, assistants, embeddings, vision', category: 'IA', level: 'Intermedio', tags: ['OpenAI', 'GPT-4o', 'Assistants', 'Embeddings'], resources: [
    { title: 'OpenAI Platform Docs', description: 'API reference completa', url: 'https://platform.openai.com/docs/api-reference', type: 'docs' },
    { title: 'Playground', description: 'Probar modelos en el browser', url: 'https://platform.openai.com/playground', type: 'playground' },
    { title: 'Cookbook', description: 'Ejemplos y recetas', url: 'https://cookbook.openai.com', type: 'tutorial' },
  ]},
  { id: 'huggingface', emoji: '🤗', title: 'Hugging Face — Modelos open source', subtitle: 'Hub de modelos, Spaces, Transformers', category: 'IA', level: 'Principiante', tags: ['HuggingFace', 'Open Source', 'Transformers'], resources: [
    { title: 'HF Hub', description: 'Explorar 500K+ modelos', url: 'https://huggingface.co/models', type: 'playground' },
    { title: 'Spaces', description: 'Demos interactivas', url: 'https://huggingface.co/spaces', type: 'playground' },
    { title: 'NLP Course', description: 'Curso gratuito de NLP', url: 'https://huggingface.co/learn/nlp-course', type: 'tutorial' },
  ]},
  { id: 'nextjs', emoji: '▲', title: 'Next.js 16 — Framework React', subtitle: 'App Router, Server Components, Streaming, API Routes', category: 'Desarrollo', level: 'Intermedio', tags: ['Next.js', 'React', 'SSR', 'App Router'], resources: [
    { title: 'Next.js Docs', description: 'Documentación oficial', url: 'https://nextjs.org/docs', type: 'docs' },
    { title: 'Learn Next.js', description: 'Tutorial interactivo oficial', url: 'https://nextjs.org/learn', type: 'tutorial' },
    { title: 'App Router Guide', description: 'Server Components y layouts', url: 'https://nextjs.org/docs/app', type: 'docs' },
    { title: 'API Routes', description: 'Crear APIs con Next.js', url: 'https://nextjs.org/docs/app/building-your-application/routing/route-handlers', type: 'docs' },
  ]},
  { id: 'typescript', emoji: '🔷', title: 'TypeScript — JavaScript tipado', subtitle: 'Types, interfaces, generics, utility types', category: 'Desarrollo', level: 'Principiante', tags: ['TypeScript', 'JavaScript', 'Types'], resources: [
    { title: 'TS Handbook', description: 'Guía oficial completa', url: 'https://www.typescriptlang.org/docs/handbook/intro.html', type: 'docs' },
    { title: 'Playground', description: 'Probar TypeScript online', url: 'https://www.typescriptlang.org/play', type: 'playground' },
    { title: 'Matt Pocock — Total TypeScript', description: 'Tips avanzados', url: 'https://www.totaltypescript.com/tutorials', type: 'tutorial' },
  ]},
  { id: 'tailwind', emoji: '🎨', title: 'Tailwind CSS v4', subtitle: 'Utility-first CSS framework', category: 'Diseño', level: 'Principiante', tags: ['Tailwind', 'CSS', 'Dark Mode', 'Responsive'], resources: [
    { title: 'Tailwind Docs', description: 'Referencia de clases', url: 'https://tailwindcss.com/docs', type: 'docs' },
    { title: 'Tailwind Play', description: 'Playground online', url: 'https://play.tailwindcss.com', type: 'playground' },
    { title: 'Headless UI', description: 'Componentes accesibles', url: 'https://headlessui.com', type: 'docs' },
  ]},
  { id: 'figma', emoji: '🖌️', title: 'Figma — Diseño de interfaces', subtitle: 'Prototipos, design systems, auto-layout', category: 'Diseño', level: 'Principiante', tags: ['Figma', 'UI/UX', 'Prototipos', 'Design System'], resources: [
    { title: 'Figma Learn', description: 'Tutoriales oficiales', url: 'https://help.figma.com/hc/en-us', type: 'tutorial' },
    { title: 'Community', description: 'Templates y plugins gratis', url: 'https://www.figma.com/community', type: 'playground' },
  ]},
  { id: 'aws-amplify', emoji: '☁️', title: 'AWS Amplify — Deploy Next.js', subtitle: 'Hosting, CI/CD, SSR en AWS', category: 'Cloud', level: 'Intermedio', tags: ['AWS', 'Amplify', 'Deploy', 'CI/CD'], resources: [
    { title: 'Amplify Docs', description: 'Hosting de apps web', url: 'https://docs.aws.amazon.com/amplify/', type: 'docs' },
    { title: 'Amplify Console', description: 'Dashboard de apps', url: 'https://console.aws.amazon.com/amplify/', type: 'playground' },
    { title: 'Next.js en Amplify', description: 'Guía de deploy SSR', url: 'https://docs.aws.amazon.com/amplify/latest/userguide/ssr-nextjs.html', type: 'tutorial' },
  ]},
  { id: 'supabase', emoji: '⚡', title: 'Supabase — PostgreSQL moderno', subtitle: 'Auth, Storage, Realtime, Edge Functions', category: 'Cloud', level: 'Principiante', tags: ['Supabase', 'PostgreSQL', 'Auth', 'Realtime'], resources: [
    { title: 'Supabase Docs', description: 'Guía completa', url: 'https://supabase.com/docs', type: 'docs' },
    { title: 'Dashboard', description: 'SQL Editor y tablas', url: 'https://supabase.com/dashboard', type: 'playground' },
    { title: 'Next.js + Supabase', description: 'Quickstart oficial', url: 'https://supabase.com/docs/guides/getting-started/quickstarts/nextjs', type: 'tutorial' },
  ]},
  { id: 'vercel', emoji: '▲', title: 'Vercel — Deploy en segundos', subtitle: 'Edge Network, Serverless, Analytics', category: 'Cloud', level: 'Principiante', tags: ['Vercel', 'Edge', 'Serverless'], resources: [
    { title: 'Vercel Docs', description: 'Platform docs', url: 'https://vercel.com/docs', type: 'docs' },
    { title: 'Dashboard', description: 'Proyectos y deploys', url: 'https://vercel.com/dashboard', type: 'playground' },
  ]},
  { id: 'sap-btp', emoji: '🔷', title: 'SAP BTP — Business Technology Platform', subtitle: 'Integration Suite, Build Apps, Datasphere', category: 'SAP', level: 'Avanzado', tags: ['SAP', 'BTP', 'Integration', 'ABAP Cloud'], resources: [
    { title: 'SAP Discovery Center', description: 'Misiones y tutoriales SAP', url: 'https://discovery-center.cloud.sap/missionCatalog/', type: 'tutorial' },
    { title: 'SAP Learning', description: 'Cursos gratuitos', url: 'https://learning.sap.com', type: 'tutorial' },
    { title: 'SAP Community', description: 'Blogs y Q&A', url: 'https://community.sap.com', type: 'docs' },
    { title: 'SAP BTP Cockpit', description: 'Administrar subaccounts', url: 'https://cockpit.btp.cloud.sap', type: 'playground' },
  ]},
  { id: 'mcp-servers', emoji: '🔌', title: 'MCP Servers — Conectores IA', subtitle: 'Model Context Protocol para integrar herramientas con IA', category: 'Extensiones', level: 'Avanzado', tags: ['MCP', 'Conectores', 'Claude', 'Extensiones'], resources: [
    { title: 'MCP Docs', description: 'Protocolo y arquitectura', url: 'https://modelcontextprotocol.io/introduction', type: 'docs' },
    { title: 'MCP Servers Registry', description: 'Servidores disponibles', url: 'https://github.com/modelcontextprotocol/servers', type: 'playground' },
    { title: 'Crear un MCP Server', description: 'Tutorial paso a paso', url: 'https://modelcontextprotocol.io/quickstart/server', type: 'tutorial' },
  ]},
  { id: 'github-actions', emoji: '🐙', title: 'GitHub Actions — CI/CD', subtitle: 'Workflows, automación, deploy automático', category: 'Extensiones', level: 'Intermedio', tags: ['GitHub', 'CI/CD', 'Actions', 'Automation'], resources: [
    { title: 'Actions Docs', description: 'Documentación oficial', url: 'https://docs.github.com/en/actions', type: 'docs' },
    { title: 'Marketplace', description: 'Actions pre-hechas', url: 'https://github.com/marketplace?type=actions', type: 'playground' },
    { title: 'Starter Workflows', description: 'Templates para empezar', url: 'https://github.com/actions/starter-workflows', type: 'tutorial' },
  ]},
];

// ═══════════════════════════════════════════════════════════════
// MISSIONS DATA (v2)
// ═══════════════════════════════════════════════════════════════

const MISSION_FILTERS = ['Todas', '⭐ Recomendadas', '🔥 Populares', '🆓 Gratis', '🆕 Nuevas', 'IA', 'Cloud', 'Frontend', 'SAP', 'DevOps'];

const MISSIONS: Mission[] = [
  {
    id: 'm1', title: 'Master Prompting con Claude & Groq',
    description: 'Aprende a escribir prompts efectivos. Compara modelos. Chain-of-thought para debugging.',
    level: 'Beginner', duration: '45 min', tools: 'Claude, Groq', tutorialCount: 4,
    gradient: 'linear-gradient(90deg,#00e5b0,#1fd975)',
    badges: [{ label: 'Beginner', type: 'ok' }, { label: '🆓 Gratis', type: 'free' }, { label: '⭐ Recomendada', type: 'teal' }],
    filters: ['⭐ Recomendadas', '🆓 Gratis', 'IA'],
    overview: {
      useCase: 'Quieres usar IA para desarrollo pero tus prompts generan respuestas genéricas. Esta misión te enseña a escribir prompts que producen código funcional, propuestas SAP, y análisis UX de alta calidad.',
      challenge: 'Los prompts vagos producen resultados vagos. "Hazme un login" vs un prompt estructurado con contexto, formato y restricciones produce resultados radicalmente diferentes.',
      solution: 'Dominar las 4 partes de un prompt efectivo y aprender técnicas avanzadas como Chain-of-thought y system prompts para diferentes modos.',
      diagram: { steps: ['Prompt estructurado', 'Hoku 9in1', '9 Agentes en paralelo', 'Respuesta sintetizada'], colors: ['#00e5b0', '#4f8ef7', '#f5a623', '#1fd975'] },
      learnings: ['Anatomía de un prompt efectivo', 'Chain-of-thought debugging', 'System prompts y modos', 'Cuándo usar Hoku vs Panchita'],
      prerequisites: 'Ninguno', cost: 'Gratis',
    },
    board: [
      { col: 'Aprender', icon: '📚', items: [{ title: 'Anatomía de un prompt', type: 'Tutorial', typeColor: '#1fd975', duration: '10 min' }, { title: 'Chain-of-thought', type: 'Tutorial', typeColor: '#1fd975', duration: '15 min' }] },
      { col: 'Experiencia', icon: '🔬', items: [{ title: 'System prompts y modos', type: 'Práctica', typeColor: '#4f8ef7', duration: '10 min' }] },
      { col: 'Explorar', icon: '🚀', items: [{ title: 'Hoku vs Panchita', type: 'Exploración', typeColor: '#b794ff', duration: '10 min' }] },
    ],
  },
  {
    id: 'm2', title: 'Primera app Next.js con IA',
    description: 'Crea un proyecto Next.js 16, conecta Groq API con streaming, deploya en Vercel.',
    level: 'Beginner', duration: '60 min', tools: 'Next.js, Groq, Vercel', tutorialCount: 3,
    gradient: 'linear-gradient(90deg,#4f8ef7,#00e5b0)',
    badges: [{ label: 'Beginner', type: 'ok' }, { label: '🆓 Gratis', type: 'free' }],
    filters: ['🆓 Gratis', 'Frontend'],
    overview: {
      useCase: 'Quieres crear tu primera aplicación web con IA integrada. Desde cero hasta deploy en producción.',
      challenge: 'Conectar un frontend con una API de IA requiere entender streaming, API routes, y deploy.',
      solution: 'Crear un proyecto Next.js 16 con App Router, conectar Groq para inferencia rápida con streaming SSE, y desplegar en Vercel.',
      diagram: { steps: ['Next.js 16', 'API Route', 'Groq SDK', 'Streaming SSE', 'Vercel Deploy'], colors: ['#4f8ef7', '#00e5b0', '#f5a623', '#1fd975', '#b794ff'] },
      learnings: ['App Router y Server Components', 'API Routes con streaming', 'Integración Groq SDK', 'Deploy en Vercel'],
      prerequisites: 'Ninguno', cost: 'Gratis',
    },
    board: [
      { col: 'Aprender', icon: '📚', items: [{ title: 'Crear proyecto Next.js 16', type: 'Tutorial', typeColor: '#1fd975', duration: '15 min' }] },
      { col: 'Experiencia', icon: '🔬', items: [{ title: 'Conectar con Groq API', type: 'Práctica', typeColor: '#4f8ef7', duration: '25 min' }] },
      { col: 'Explorar', icon: '🚀', items: [{ title: 'Deploy en Vercel', type: 'Deploy', typeColor: '#b794ff', duration: '20 min' }] },
    ],
  },
  {
    id: 'm3', title: 'Supabase + pgvector para RAG',
    description: 'Configura pgvector, genera embeddings con OpenAI, implementa búsqueda semántica.',
    level: 'Intermediate', duration: '90 min', tools: 'Supabase, OpenAI', tutorialCount: 4,
    gradient: 'linear-gradient(90deg,#f5a623,#4f8ef7)',
    badges: [{ label: 'Intermediate', type: 'warn' }, { label: '🆓 Gratis', type: 'free' }, { label: '🔥 Popular', type: 'info' }],
    filters: ['🔥 Populares', '🆓 Gratis', 'IA', 'Cloud'],
    overview: {
      useCase: 'Necesitas búsqueda semántica: que tus usuarios encuentren información por significado, no por keywords exactas.',
      challenge: 'Las búsquedas tradicionales con LIKE o full-text search no entienden sinónimos ni contexto.',
      solution: 'pgvector en Supabase + embeddings de OpenAI para búsqueda por similitud vectorial. Base de cualquier sistema RAG.',
      diagram: { steps: ['Documento', 'Chunks', 'Embeddings', 'pgvector', 'Query', 'Similitud', 'LLM', 'Respuesta'], colors: ['#f5a623', '#f5a623', '#4f8ef7', '#1fd975', '#00e5b0', '#1fd975', '#b794ff', '#00e5b0'] },
      learnings: ['Setup pgvector en Supabase', 'Generar embeddings con OpenAI', 'Búsqueda semántica por similitud', 'Pipeline RAG completo'],
      prerequisites: 'Cuenta Supabase', cost: 'Gratis',
    },
    board: [
      { col: 'Aprender', icon: '📚', items: [{ title: 'Setup pgvector', type: 'Tutorial', typeColor: '#1fd975', duration: '20 min' }, { title: 'Generar embeddings', type: 'Tutorial', typeColor: '#1fd975', duration: '25 min' }] },
      { col: 'Experiencia', icon: '🔬', items: [{ title: 'Búsqueda semántica', type: 'Práctica', typeColor: '#4f8ef7', duration: '25 min' }] },
      { col: 'Explorar', icon: '🚀', items: [{ title: 'Chat RAG completo', type: 'Integración', typeColor: '#b794ff', duration: '20 min' }] },
    ],
  },
  {
    id: 'm4', title: 'Tool Use — Claude llama APIs',
    description: 'Conecta Claude con Supabase, Bsale, APIs externas usando function calling.',
    level: 'Intermediate', duration: '75 min', tools: 'Claude, Supabase', tutorialCount: 3,
    gradient: 'linear-gradient(90deg,#b794ff,#4f8ef7)',
    badges: [{ label: 'Intermediate', type: 'warn' }, { label: '🆕 Nueva', type: 'teal' }],
    filters: ['🆕 Nuevas', 'IA'],
    overview: {
      useCase: 'Quieres que Claude no solo genere texto, sino que consulte bases de datos, llame APIs y ejecute acciones reales.',
      challenge: 'Un LLM sin tools solo genera texto. Con Tool Use, el modelo puede interactuar con sistemas externos.',
      solution: 'Implementar Tool Use con Claude API: definir schemas, manejar el loop de tool calls, y encadenar múltiples tools.',
      diagram: { steps: ['Usuario', 'Claude API', 'Tool Use', 'Supabase/APIs', 'Respuesta con datos'], colors: ['#00e5b0', '#b794ff', '#f5a623', '#4f8ef7', '#1fd975'] },
      learnings: ['Qué es Tool Use y cómo funciona', 'Conectar Claude con Supabase', 'Multi-tool chains', 'Patrones de agentes'],
      prerequisites: 'API key Anthropic', cost: 'API key requerida',
    },
    board: [
      { col: 'Aprender', icon: '📚', items: [{ title: 'Qué es Tool Use', type: 'Tutorial', typeColor: '#1fd975', duration: '20 min' }] },
      { col: 'Experiencia', icon: '🔬', items: [{ title: 'Claude + Supabase', type: 'Práctica', typeColor: '#4f8ef7', duration: '30 min' }] },
      { col: 'Explorar', icon: '🚀', items: [{ title: 'Multi-tool chain', type: 'Avanzado', typeColor: '#b794ff', duration: '25 min' }] },
    ],
  },
  {
    id: 'm5', title: 'Hoku + Multi-provider routing',
    description: 'Agrega modelos, tracing con agent_logs, optimización de costos multi-provider.',
    level: 'Intermediate', duration: '75 min', tools: 'Groq, Mistral, Supabase', tutorialCount: 3,
    gradient: 'linear-gradient(90deg,#1fd975,#f5a623)',
    badges: [{ label: 'Intermediate', type: 'warn' }, { label: '🔥 Popular', type: 'info' }],
    filters: ['🔥 Populares', 'IA'],
    overview: {
      useCase: 'Quieres usar múltiples modelos de IA de forma inteligente: el más rápido para chat, el más barato para código, el mejor para razonamiento.',
      challenge: 'Cada provider tiene precios, velocidades y calidades diferentes. Sin routing, pagas de más o sacrificas calidad.',
      solution: 'Router multi-provider con adaptador OpenAI-compatible, logging en Supabase, y estrategia de costos por tarea.',
      diagram: { steps: ['Request', 'Router', 'Groq/DeepSeek/Claude', 'Response', 'agent_logs'], colors: ['#00e5b0', '#f5a623', '#4f8ef7', '#1fd975', '#b794ff'] },
      learnings: ['Agregar providers OpenAI-compatible', 'Tracing con agent_logs', 'Optimizar costos por tarea'],
      prerequisites: 'Misión 1 completada', cost: 'Gratis (Groq)',
    },
    board: [
      { col: 'Aprender', icon: '📚', items: [{ title: 'Agregar modelo nuevo', type: 'Tutorial', typeColor: '#1fd975', duration: '20 min' }] },
      { col: 'Experiencia', icon: '🔬', items: [{ title: 'Tracing con agent_logs', type: 'Práctica', typeColor: '#4f8ef7', duration: '30 min' }] },
      { col: 'Explorar', icon: '🚀', items: [{ title: 'Optimizar costos', type: 'Análisis', typeColor: '#b794ff', duration: '25 min' }] },
    ],
  },
  {
    id: 'm6', title: 'Crear MCP Server',
    description: 'Protocol completo: TypeScript server, tool definitions, conectar con Claude Code.',
    level: 'Advanced', duration: '120 min', tools: 'MCP, TypeScript', tutorialCount: 4,
    gradient: 'linear-gradient(90deg,#f04747,#b794ff)',
    badges: [{ label: 'Advanced', type: 'violet' }],
    filters: ['IA', 'DevOps'],
    overview: {
      useCase: 'Quieres que Claude Code pueda interactuar directamente con Supabase, tu CRM, o cualquier servicio que uses frecuentemente.',
      challenge: 'Sin MCP, cada integración requiere copiar y pegar contexto manualmente.',
      solution: 'Crear un MCP Server en TypeScript que expone tools para consultar y modificar datos. Claude Code las usa automáticamente.',
      diagram: { steps: ['Claude Code', 'MCP Protocol', 'Tu Server', 'Supabase/APIs'], colors: ['#00e5b0', '#f5a623', '#b794ff', '#4f8ef7'] },
      learnings: ['Qué es MCP y arquitectura', 'Crear un server TypeScript', 'Definir tools con zod', 'Conectar con Claude Code'],
      prerequisites: 'TypeScript, Node.js', cost: 'Gratis',
    },
    board: [
      { col: 'Aprender', icon: '📚', items: [{ title: 'Qué es MCP', type: 'Tutorial', typeColor: '#1fd975', duration: '25 min' }, { title: 'Server básico', type: 'Tutorial', typeColor: '#1fd975', duration: '35 min' }] },
      { col: 'Experiencia', icon: '🔬', items: [{ title: 'Conectar con Claude Code', type: 'Práctica', typeColor: '#4f8ef7', duration: '30 min' }] },
      { col: 'Explorar', icon: '🚀', items: [{ title: 'Resources y Prompts', type: 'Avanzado', typeColor: '#b794ff', duration: '30 min' }] },
    ],
  },
  {
    id: 'm7', title: 'GitHub Actions DevSecOps',
    description: 'CI/CD completo, code review con IA, security scanning automático.',
    level: 'Advanced', duration: '90 min', tools: 'GitHub, DeepSeek', tutorialCount: 3,
    gradient: 'linear-gradient(90deg,#4f8ef7,#1fd975)',
    badges: [{ label: 'Advanced', type: 'violet' }, { label: '🆕 Nueva', type: 'teal' }],
    filters: ['🆕 Nuevas', 'DevOps'],
    overview: {
      useCase: 'Quieres automatizar build, test, code review y security en cada push o PR.',
      challenge: 'Sin CI/CD, los bugs llegan a producción. Sin code review automático, se pierden issues de calidad.',
      solution: 'GitHub Actions para CI/CD, DeepSeek para code review automático, y Dependabot + CodeQL para seguridad.',
      diagram: { steps: ['Push/PR', 'GitHub Actions', 'Build + Test', 'AI Review', 'Security Scan', 'Deploy'], colors: ['#6b8099', '#4f8ef7', '#1fd975', '#b794ff', '#f04747', '#00e5b0'] },
      learnings: ['CI/CD con GitHub Actions', 'Code review con IA (DeepSeek)', 'Security scanning (Dependabot + CodeQL)'],
      prerequisites: 'Repo en GitHub', cost: 'Gratis',
    },
    board: [
      { col: 'Aprender', icon: '📚', items: [{ title: 'CI/CD con Actions', type: 'Tutorial', typeColor: '#1fd975', duration: '30 min' }] },
      { col: 'Experiencia', icon: '🔬', items: [{ title: 'AI Code Review', type: 'Práctica', typeColor: '#4f8ef7', duration: '30 min' }] },
      { col: 'Explorar', icon: '🚀', items: [{ title: 'Security scanning', type: 'Seguridad', typeColor: '#f04747', duration: '30 min' }] },
    ],
  },
  {
    id: 'm8', title: 'InfoPet — RAG Veterinario',
    description: 'Sistema completo: schema, pipeline RAG, integración Bsale/Jumpseller.',
    level: 'Advanced', duration: '150 min', tools: 'Claude, Supabase, Bsale', tutorialCount: 4,
    gradient: 'linear-gradient(90deg,#f5a623,#f04747)',
    badges: [{ label: 'Advanced', type: 'violet' }, { label: '🔥 Popular', type: 'info' }],
    filters: ['🔥 Populares', 'IA', 'Cloud'],
    overview: {
      useCase: 'Construir un asistente veterinario completo que busca en una base de conocimiento y recomienda productos reales sincronizados desde Bsale/Jumpseller.',
      challenge: 'Integrar múltiples fuentes de datos (conocimiento veterinario + catálogo de productos) en un sistema RAG coherente.',
      solution: 'Pipeline RAG dual: buscar en vet_knowledge + products con pgvector, generar respuestas con Groq, sincronizar catálogo automáticamente.',
      diagram: { steps: ['Bsale/Jumpseller', 'Sync API', 'pgvector', 'RAG Search', 'Groq LLM', 'Respuesta'], colors: ['#f5a623', '#4f8ef7', '#1fd975', '#00e5b0', '#b794ff', '#1fd975'] },
      learnings: ['Diseñar schema para RAG', 'Pipeline ingest + embed', 'RAG dual (knowledge + products)', 'Integrar APIs de e-commerce'],
      prerequisites: 'Misiones 2 y 3', cost: 'API keys requeridas',
    },
    board: [
      { col: 'Aprender', icon: '📚', items: [{ title: 'Diseñar el schema', type: 'Tutorial', typeColor: '#1fd975', duration: '30 min' }] },
      { col: 'Experiencia', icon: '🔬', items: [{ title: 'Pipeline RAG completo', type: 'Práctica', typeColor: '#4f8ef7', duration: '50 min' }] },
      { col: 'Explorar', icon: '🚀', items: [{ title: 'Bsale + Jumpseller', type: 'Integración', typeColor: '#b794ff', duration: '70 min' }] },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// LESSON CONTENT (all existing content preserved)
// ═══════════════════════════════════════════════════════════════

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
        <FlowDiagram title="Flujo de un prompt" steps={['Contexto', 'Tarea', 'Formato', 'Restricciones', 'Respuesta IA']} />
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
        <ArchDiagram title="Arquitectura de modos" layers={[
          { label: 'Usuario', items: [{ name: 'Prompt', color: '#00e5b0' }] },
          { label: 'Modo seleccionado', items: [{ name: '💬 Chat', color: '#4f8ef7' }, { name: '</> Code', color: '#1fd975' }, { name: '🏢 SAP', color: '#f5a623' }, { name: '🚀 Deploy', color: '#b794ff' }] },
          { label: 'System prompt inyectado', items: [{ name: 'Contexto + reglas + formato', color: '#6b8099' }] },
          { label: 'Agente ejecuta', items: [{ name: 'Hoku 9in1', color: '#00e5b0' }] },
        ]} />
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
        <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> Cada push a main hace deploy automático. Los PRs generan Preview Deployments con URL única. Útil para code review.</div>
        <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Haz deploy de tu app en Vercel. Comparte la URL en el chat de Hoku y pídele que la revise. ¿Funciona el streaming?</div>
      </>
    )},
  ],
  m3: [
    { title: 'Setup Supabase con pgvector', content: (
      <>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>pgvector es una extensión de PostgreSQL que permite almacenar y buscar embeddings vectoriales. Supabase la incluye nativamente. Es la base de cualquier sistema RAG.</p>
        <FlowDiagram title="Pipeline RAG" steps={['Documento', 'Chunks', 'Embeddings', 'pgvector', 'Query', 'Similitud', 'LLM', 'Respuesta']} colors={['#f5a623','#f5a623','#4f8ef7','#1fd975','#00e5b0','#1fd975','#b794ff','#00e5b0']} />
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
    content, metadata, embedding,
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
        <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Crea un script que inserte 5 documentos sobre tu área de trabajo en la tabla <code>documents</code>. Verifica en el SQL Editor que los embeddings se guardaron.</div>
      </>
    )},
    { title: 'Búsqueda semántica', content: (
      <>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Ahora que tenemos documentos con embeddings, podemos buscar por significado en vez de keywords exactas. Esto es el corazón de RAG.</p>
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
  const queryEmbedding = await generateEmbedding(query);
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
  const embedding = await generateEmbedding(message);
  const { data: docs } = await supabase.rpc('match_documents', {
    query_embedding: embedding, match_threshold: 0.75, match_count: 3,
  });

  const context = docs?.map((d: { content: string }) => d.content).join('\\n') || '';

  const stream = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: \`Responde basándote en este contexto:\\n\${context}\\n\\nSi no encuentras la respuesta en el contexto, dilo.\` },
      { role: 'user', content: message },
    ],
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        controller.enqueue(encoder.encode(chunk.choices[0]?.delta?.content || ''));
      }
      controller.close();
    },
  });
  return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}`}</pre>
        <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> El threshold de 0.75 funciona bien para español. Si obtienes resultados irrelevantes, súbelo a 0.80.</div>
        <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Conecta tu chat con la API RAG. Inserta 10 documentos y verifica que las respuestas usan el contexto correcto.</div>
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
        <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`const tools = [
  {
    name: 'get_leads_count',
    description: 'Obtiene la cantidad de leads registrados en un período',
    input_schema: {
      type: 'object',
      properties: {
        month: { type: 'string', description: 'Mes en formato YYYY-MM' },
        status: { type: 'string', enum: ['new', 'contacted', 'qualified', 'closed'], description: 'Filtrar por estado' },
      },
      required: ['month'],
    },
  },
];`}</pre>
        <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> La descripción de la tool es clave. El modelo decide cuándo usarla basándose en ella.</div>
        <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Pregúntale a Hoku en modo Code: &quot;Diseña 3 tools para un sistema de inventario&quot;. Revisa los schemas.</div>
      </>
    )},
    { title: 'Conectar Claude con Supabase', content: (
      <>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Vamos a implementar un endpoint donde Claude puede consultar datos de Supabase usando Tool Use.</p>
        <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// src/app/api/agent/route.ts
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

const tools: Anthropic.Tool[] = [{
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
}];

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
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: message }];

  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514', max_tokens: 1024, tools, messages,
  });

  while (response.stop_reason === 'tool_use') {
    const toolBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    if (!toolBlock) break;
    const result = await handleTool(toolBlock.name, toolBlock.input as Record<string, unknown>);
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: toolBlock.id, content: result }] });
    response = await anthropic.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: 1024, tools, messages });
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  return Response.json({ response: textBlock?.text || '' });
}`}</pre>
        <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> El loop de tool_use es importante. Claude puede necesitar múltiples tools antes de responder.</div>
        <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Implementa una tool <code>search_documents</code> que use <code>match_documents</code> de la misión anterior.</div>
      </>
    )},
    { title: 'Multi-tool chain', content: (
      <>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>El verdadero poder de Tool Use aparece cuando el modelo encadena múltiples tools en una sola conversación.</p>
        <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`const tools: Anthropic.Tool[] = [
  { name: 'search_products', description: 'Busca productos por nombre o categoría',
    input_schema: { type: 'object' as const, properties: { query: { type: 'string', description: 'Término de búsqueda' } }, required: ['query'] } },
  { name: 'check_stock', description: 'Verifica stock disponible de un producto por ID',
    input_schema: { type: 'object' as const, properties: { product_id: { type: 'number', description: 'ID del producto' } }, required: ['product_id'] } },
  { name: 'create_quote', description: 'Crea una cotización con productos y cantidades',
    input_schema: { type: 'object' as const, properties: {
      items: { type: 'array', items: { type: 'object', properties: { product_id: { type: 'number' }, quantity: { type: 'number' } } }, description: 'Lista de productos' },
      client_name: { type: 'string', description: 'Nombre del cliente' },
    }, required: ['items', 'client_name'] } },
];

// Conversación: "Cotiza 5 teclados mecánicos para Juan Pérez"
// Claude ejecutará:
// 1. search_products({ query: "teclado mecánico" })
// 2. check_stock({ product_id: 42 })
// 3. create_quote({ items: [...], client_name: "Juan Pérez" })`}</pre>
        <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> En producción, limita las tools a las que el usuario tiene permiso. Usa roles de Supabase RLS.</div>
        <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Agrega una cuarta tool <code>send_email</code> que simule enviar la cotización por email.</div>
      </>
    )},
  ],
  m5: [
    { title: 'Agregar un modelo nuevo a Hoku', content: (
      <>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Hoku es un agente multi-provider: puede usar Claude, Groq, OpenAI, DeepSeek, Mistral y más. Todos pasan por un adaptador OpenAI-compatible.</p>
        <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// src/lib/openai-compat.ts — Patrón simplificado
interface ProviderConfig { baseURL: string; apiKey: string; models: string[]; }

const PROVIDERS: Record<string, ProviderConfig> = {
  groq: { baseURL: 'https://api.groq.com/openai/v1', apiKey: process.env.GROQ_API_KEY!, models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'] },
  deepseek: { baseURL: 'https://api.deepseek.com/v1', apiKey: process.env.DEEPSEEK_API_KEY!, models: ['deepseek-chat', 'deepseek-reasoner'] },
  openai: { baseURL: 'https://api.openai.com/v1', apiKey: process.env.OPENAI_API_KEY!, models: ['gpt-4o', 'gpt-4o-mini'] },
  mistral: { baseURL: 'https://api.mistral.ai/v1', apiKey: process.env.MISTRAL_API_KEY!, models: ['mistral-large-latest', 'mistral-small-latest'] },
};

function getProvider(model: string): ProviderConfig {
  for (const [, config] of Object.entries(PROVIDERS)) {
    if (config.models.includes(model)) return config;
  }
  return PROVIDERS.groq; // fallback
}`}</pre>
        <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> La mayoría de providers modernos son OpenAI-compatible. Solo cambia <code>baseURL</code> y <code>apiKey</code>.</div>
        <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Crea una cuenta en Mistral. Obtén tu API key y agrégala. Prueba que Hoku pueda responder con Mistral Large.</div>
      </>
    )},
    { title: 'Tracing con agent_logs', content: (
      <>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Cada interacción con Hoku se registra en <code>agent_logs</code> de Supabase. Esto permite ver métricas de uso, costos, latencia y calidad.</p>
        <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`CREATE TABLE agent_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model TEXT NOT NULL, provider TEXT NOT NULL, mode TEXT DEFAULT 'chat',
  prompt_tokens INT, completion_tokens INT, total_tokens INT,
  latency_ms INT, quality_score SMALLINT,
  user_message TEXT, assistant_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Queries útiles
SELECT model, COUNT(*) as requests, AVG(latency_ms) as avg_latency
FROM agent_logs WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY model ORDER BY requests DESC;`}</pre>
        <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> El campo <code>quality_score</code> viene del feedback 👍/👎. Usa esto para comparar modelos.</div>
        <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Ejecuta las queries de métricas en Supabase. ¿Qué modelo es el más usado?</div>
      </>
    )},
    { title: 'Optimizar costos', content: (
      <>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>No todos los modelos cuestan lo mismo. La clave es usar el modelo más barato que cumpla la calidad requerida.</p>
        <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// Estrategia de routing por tarea:
// Chat general → Groq Llama 3.3 70B (gratis)
// Código → DeepSeek V3 ($0.27/1M)
// Razonamiento → Claude Sonnet ($3/1M)
// Resumen → Mistral Small ($0.10/1M)

function selectModel(mode: string): string {
  if (mode === 'code') return 'deepseek-chat';
  if (mode === 'sap') return 'claude-sonnet-4-20250514';
  return 'llama-3.3-70b-versatile'; // default: rápido y gratis
}

// Para 10,000 msgs/mes:
// Solo Groq: ~$1.50/mes | Mix: ~$15/mes | Solo Claude: ~$180/mes`}</pre>
        <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> El 80% de requests pueden ir a Groq. Usa Claude solo para razonamiento complejo.</div>
        <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Revisa los logs. Calcula cuánto costaría si todo fuera Claude vs el mix actual.</div>
      </>
    )},
  ],
  m6: [
    { title: 'Qué es MCP', content: (
      <>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Model Context Protocol (MCP) es un estándar abierto de Anthropic para conectar modelos de IA con herramientas externas. Piensa en USB pero para IA.</p>
        <ArchDiagram title="Arquitectura MCP" layers={[
          { label: 'Host (Claude Code / IDE)', items: [{ name: 'Claude', color: '#00e5b0' }, { name: 'Cursor', color: '#4f8ef7' }] },
          { label: 'MCP Protocol (JSON-RPC)', items: [{ name: 'Tools', color: '#f5a623' }, { name: 'Resources', color: '#b794ff' }, { name: 'Prompts', color: '#1fd975' }] },
          { label: 'MCP Servers', items: [{ name: 'Supabase', color: '#1fd975' }, { name: 'GitHub', color: '#6b8099' }, { name: 'Bsale', color: '#8b5cf6' }, { name: 'Custom', color: '#f04747' }] },
        ]} />
        <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// MCP Server expone:
// - Tools: funciones que el modelo puede ejecutar
// - Resources: datos que el modelo puede leer
// - Prompts: templates predefinidos
// Transporte: stdio (local) o SSE (remoto)
// Protocolo: JSON-RPC 2.0`}</pre>
        <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> MCP es diferente de Tool Use. Tool Use es una feature de la API. MCP es un protocolo estándar.</div>
        <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Revisa los MCP servers disponibles. Identifica 3 útiles para SmartConnection.</div>
      </>
    )},
    { title: 'Crear un server básico', content: (
      <>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Vamos a crear un MCP server en TypeScript que expone tools para consultar datos de Supabase.</p>
        <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`mkdir mcp-supabase-server && cd mcp-supabase-server
npm init -y
npm install @modelcontextprotocol/sdk @supabase/supabase-js zod
npm install -D typescript @types/node`}</pre>
        <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// src/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
const server = new McpServer({ name: 'supabase-server', version: '1.0.0' });

server.tool('query_leads', 'Consulta leads de SmartConnection', {
  status: z.string().optional().describe('Estado: new, contacted, qualified'),
  limit: z.number().default(10).describe('Máximo de resultados'),
}, async ({ status, limit }) => {
  let query = supabase.from('leads').select('*');
  if (status) query = query.eq('status', status);
  const { data, error } = await query.limit(limit);
  if (error) return { content: [{ type: 'text' as const, text: \`Error: \${error.message}\` }] };
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);`}</pre>
        <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> Usa <code>zod</code> para validar inputs. MCP SDK lo integra nativamente.</div>
        <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Crea el MCP server. Compílalo con <code>npx tsc</code>.</div>
      </>
    )},
    { title: 'Conectar con Claude Code', content: (
      <>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Ahora conectamos el MCP server con Claude Code para que pueda usar las tools desde la terminal.</p>
        <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// .mcp.json (en la raíz del proyecto)
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

// En Claude Code:
> "¿Cuántos leads nuevos hay?"
// → Claude usará query_leads({ status: "new" })

> /mcp  // Muestra servers conectados`}</pre>
        <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> Usa <code>.mcp.json</code> por proyecto y <code>settings.json</code> global para servers compartidos.</div>
        <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Conecta tu MCP server con Claude Code. Verifica el flujo end-to-end.</div>
      </>
    )},
  ],
  m7: [
    { title: 'CI/CD con GitHub Actions', content: (
      <>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>GitHub Actions permite automatizar build, test y deploy en cada push o PR.</p>
        <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`# .github/workflows/ci.yml
name: CI
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - name: Type check
        run: npx tsc --noEmit
      - name: Build
        run: npm run build
        env:
          GROQ_API_KEY: \${{ secrets.GROQ_API_KEY }}
      - name: Test
        run: npm test -- --passWithNoTests`}</pre>
        <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> AWS Amplify ya tiene CI/CD. GitHub Actions complementa con lint, type-check, tests, security scans.</div>
        <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Crea el workflow y verifica que se ejecute en la pestaña Actions.</div>
      </>
    )},
    { title: 'Code review con IA', content: (
      <>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>Puedes usar IA para revisar automáticamente cada PR. DeepSeek es excelente para code review.</p>
        <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`# .github/workflows/ai-review.yml
name: AI Code Review
on:
  pull_request: { types: [opened, synchronize] }

jobs:
  review:
    runs-on: ubuntu-latest
    permissions: { pull-requests: write }
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
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
              headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${process.env.DEEPSEEK_API_KEY}\` },
              body: JSON.stringify({ model: 'deepseek-chat', messages: [
                { role: 'system', content: 'Eres code reviewer experto en Next.js + TypeScript. Revisa bugs, seguridad, performance. Responde en español.' },
                { role: 'user', content: \`Revisa:\\n\\\`\\\`\\\`diff\\n\${diff}\\n\\\`\\\`\\\`\` }
              ], max_tokens: 1000 })
            });
            const data = await response.json();
            await github.rest.issues.createComment({
              owner: context.repo.owner, repo: context.repo.repo, issue_number: context.issue.number,
              body: \`## 🤖 AI Code Review\\n\\n\${data.choices[0].message.content}\\n\\n---\\n*Powered by DeepSeek V3*\`
            });`}</pre>
        <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> DeepSeek cuesta ~$0.0005 por review. Prácticamente gratis.</div>
        <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Agrega el workflow. Crea un PR con un bug intencional y verifica que lo detecte.</div>
      </>
    )},
    { title: 'Security scanning', content: (
      <>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>DevSecOps integra seguridad en el pipeline. GitHub ofrece Dependabot, CodeQL y secret scanning.</p>
        <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule: { interval: "weekly" }
    open-pull-requests-limit: 5`}</pre>
        <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`# .github/workflows/codeql.yml
name: CodeQL Analysis
on:
  push: { branches: [main] }
  schedule: [{ cron: '0 6 * * 1' }]
jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions: { security-events: write }
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with: { languages: javascript-typescript, queries: security-extended }
      - uses: github/codeql-action/analyze@v3`}</pre>
        <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> Regla #1: nunca hardcodear secrets. Siempre <code>process.env</code> + GitHub Secrets.</div>
        <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Habilita Dependabot y CodeQL. Ejecuta <code>npm audit</code>.</div>
      </>
    )},
  ],
  m8: [
    { title: 'Diseñar el schema', content: (
      <>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>InfoPet es un asistente veterinario con RAG. Necesitamos tablas para productos, consultas y embeddings.</p>
        <SchemaDiagram title="Schema InfoPet" tables={[
          { name: 'products', color: '#00e5b0', fields: ['id uuid PK', 'name text', 'sku text', 'price int', 'stock int', 'source text', 'embedding vector(1536)'] },
          { name: 'vet_docs', color: '#4f8ef7', fields: ['id uuid PK', 'title text', 'content text', 'category text', 'embedding vector(1536)'] },
          { name: 'consultations', color: '#f5a623', fields: ['id uuid PK', 'user_query text', 'response text', 'sources jsonb', 'created_at timestamptz'] },
        ]} />
        <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  external_id TEXT NOT NULL, source TEXT NOT NULL,
  name TEXT NOT NULL, description TEXT, category TEXT,
  species TEXT[], price DECIMAL(10,2), stock INT DEFAULT 0,
  embedding VECTOR(1536), synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vet_knowledge (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL, content TEXT NOT NULL,
  category TEXT, species TEXT[], source TEXT,
  embedding VECTOR(1536), created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pet_consultations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL, user_message TEXT NOT NULL,
  assistant_message TEXT NOT NULL,
  products_referenced BIGINT[], knowledge_used BIGINT[],
  model TEXT, tokens_used INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON products USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
CREATE INDEX ON vet_knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);`}</pre>
        <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> El campo <code>species</code> es un array para productos multi-especie.</div>
        <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Crea las tablas en Supabase. Inserta 5 productos de ejemplo.</div>
      </>
    )},
    { title: 'Pipeline RAG completo', content: (
      <>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>El pipeline tiene 3 fases: ingest, search y generate.</p>
        <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// src/lib/infopet/ingest.ts
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({ model: 'text-embedding-3-small', input: text });
  return res.data[0].embedding;
}

export async function ingestKnowledge(articles: { title: string; content: string; category: string; species: string[] }[]) {
  for (const article of articles) {
    const embedding = await embed(\`\${article.title}. \${article.content}\`);
    await supabase.from('vet_knowledge').insert({ ...article, embedding });
  }
}`}</pre>
        <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// src/app/api/infopet/chat/route.ts — Search + Generate
export async function POST(req: Request) {
  const { message } = await req.json();
  const embedding = await embed(message);

  // Buscar en ambas tablas
  const { data: knowledge } = await supabase.rpc('match_documents_vet', { query_embedding: embedding, match_threshold: 0.75, match_count: 3 });
  const { data: products } = await supabase.rpc('match_products', { query_embedding: embedding, match_threshold: 0.70, match_count: 3 });

  const context = [
    '## Conocimiento veterinario:',
    ...(knowledge?.map((k: { title: string; content: string }) => \`- \${k.title}: \${k.content}\`) || []),
    '## Productos disponibles:',
    ...(products?.map((p: { name: string; price: number; stock: number }) => \`- \${p.name} ($\${p.price}) - Stock: \${p.stock}\`) || []),
  ].join('\\n');

  // Generar respuesta con Groq...
}`}</pre>
        <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> Buscar en dos tablas da mejores respuestas: info médica + productos concretos.</div>
        <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Ingesta 10 artículos y 10 productos. Pregunta &quot;Mi perro tiene diarrea, ¿qué le doy?&quot;</div>
      </>
    )},
    { title: 'Integrar con Bsale/Jumpseller', content: (
      <>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>InfoPet se conecta con Bsale y Jumpseller para sincronizar productos reales.</p>
        <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// src/lib/infopet/bsale.ts
const BSALE_API = 'https://api.bsale.io/v1';

export async function fetchBsaleProducts() {
  const res = await fetch(\`\${BSALE_API}/products.json?limit=50&state=1\`, {
    headers: { 'access_token': process.env.BSALE_ACCESS_TOKEN! },
  });
  const data = await res.json();
  return data.items || [];
}

// src/lib/infopet/jumpseller.ts
export async function fetchJumpsellerProducts() {
  const res = await fetch(
    \`https://api.jumpseller.com/v1/products.json?login=\${process.env.JUMPSELLER_LOGIN}&authtoken=\${process.env.JUMPSELLER_AUTH_TOKEN}&limit=50\`
  );
  return (await res.json()).map((item: { product: Record<string, unknown> }) => item.product);
}`}</pre>
        <pre style={{ background: '#06080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: '#a8d8ea', overflow: 'auto', margin: '12px 0' }}>{`// src/app/api/infopet/sync/route.ts — Sync automático
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== \`Bearer \${process.env.SYNC_SECRET}\`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bsaleProducts = await fetchBsaleProducts();
  const jsProducts = await fetchJumpsellerProducts();
  // ingestProducts(...)...
  return Response.json({ synced: { bsale: bsaleProducts.length, jumpseller: jsProducts.length } });
}`}</pre>
        <div style={{ background: 'rgba(0,229,176,0.05)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 10, padding: '12px 16px', margin: '16px 0', fontSize: 13, color: '#00e5b0', lineHeight: 1.6 }}>💡 <strong>Tip:</strong> Bsale: ~60 req/min. Jumpseller: ~120 req/min. Agrega delays si sincronizas mucho.</div>
        <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: 16, margin: '16px 0', fontSize: 13, color: '#b794ff', lineHeight: 1.6 }}>🎯 <strong>Ejercicio:</strong> Sincroniza productos reales o usa un mock. Prueba el flujo completo: sync → embed → search → chat.</div>
      </>
    )},
  ],
};

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const levelColors: Record<string, { bg: string; text: string; border: string }> = {
  'Principiante': { bg: 'rgba(34,197,94,0.08)', text: '#22c55e', border: 'rgba(34,197,94,0.2)' },
  'Intermedio': { bg: 'rgba(59,130,246,0.08)', text: '#3b82f6', border: 'rgba(59,130,246,0.2)' },
  'Avanzado': { bg: 'rgba(139,92,246,0.08)', text: '#8b5cf6', border: 'rgba(139,92,246,0.2)' },
};

const badgeStyles: Record<string, React.CSSProperties> = {
  ok: { background: 'rgba(31,217,117,0.1)', color: '#1fd975' },
  warn: { background: 'rgba(245,166,35,0.1)', color: '#f5a623' },
  info: { background: 'rgba(79,142,247,0.1)', color: '#4f8ef7' },
  teal: { background: 'rgba(0,229,176,0.1)', color: '#00e5b0' },
  violet: { background: 'rgba(183,148,255,0.1)', color: '#b794ff' },
  free: { background: 'rgba(31,217,117,0.08)', color: '#1fd975', border: '1px solid rgba(31,217,117,0.15)' },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function LearnPage() {
  // Tech tab state
  const [catFilter, setCatFilter] = useState('Todos');
  const [levelFilter, setLevelFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [activeResource, setActiveResource] = useState<{ course: Course; resource: Resource } | null>(null);
  const [iframeError, setIframeError] = useState(false);

  // Tab state
  const [tab, setTab] = useState<'tech' | 'missions'>('missions');

  // Missions v2 state
  const [missionView, setMissionView] = useState<'catalog' | 'detail' | 'tutorial'>('catalog');
  const [missionFilter, setMissionFilter] = useState('Todas');
  const [missionLevelFilter, setMissionLevelFilter] = useState('Todos');
  const [missionSearch, setMissionSearch] = useState('');
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'board' | 'related'>('overview');
  const [tutorialStep, setTutorialStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Record<string, number[]>>({});
  const [mobileStepOpen, setMobileStepOpen] = useState(false);

  // Cargar progreso desde Supabase
  useEffect(() => {
    fetch('/api/missions/progress').then(r => r.json()).then(data => {
      if (data && typeof data === 'object') setCompletedSteps(data);
    }).catch(() => {});
  }, []);

  // Iframe blocked domains
  const BLOCKED_DOMAINS = ['docs.anthropic.com','platform.openai.com','console.groq.com','huggingface.co','nextjs.org','supabase.com','docs.aws.amazon.com','figma.com','vercel.com','cloud.sap','learning.sap.com','community.sap.com','docs.github.com','github.com','cookbook.openai.com','totaltypescript.com'];
  const isBlocked = (url: string) => BLOCKED_DOMAINS.some(d => url.includes(d));

  // Tech tab filtering
  const filtered = COURSES.filter(c => {
    if (catFilter !== 'Todos' && c.category !== catFilter) return false;
    if (levelFilter !== 'Todos' && c.level !== levelFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.title.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q) || c.tags.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  // Mission filtering
  const filteredMissions = MISSIONS.filter(m => {
    if (missionFilter !== 'Todas' && !m.filters.includes(missionFilter)) return false;
    if (missionLevelFilter !== 'Todos' && m.level !== missionLevelFilter) return false;
    if (missionSearch) {
      const q = missionSearch.toLowerCase();
      return m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || m.tools.toLowerCase().includes(q);
    }
    return true;
  });

  // Mission helpers
  const openDetail = (m: Mission) => { setSelectedMission(m); setMissionView('detail'); setDetailTab('overview'); };
  const openTutorial = () => { setMissionView('tutorial'); setTutorialStep(0); };
  const backToCatalog = () => { setMissionView('catalog'); setSelectedMission(null); };
  const backToDetail = () => { setMissionView('detail'); };
  const toggleStepComplete = useCallback((missionId: string, step: number) => {
    setCompletedSteps(prev => {
      const current = prev[missionId] || [];
      const isCompleting = !current.includes(step);
      // Persistir en Supabase (fire and forget)
      fetch('/api/missions/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission_id: missionId, step_index: step, completed: isCompleting }),
      }).catch(() => {});
      return { ...prev, [missionId]: isCompleting ? [...current, step] : current.filter(s => s !== step) };
    });
  }, []);

  const missionLevelColor = (level: string) =>
    level === 'Beginner' ? '#1fd975' : level === 'Intermediate' ? '#f5a623' : '#b794ff';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 34px)', overflow: 'hidden' }}>
      {/* Breadcrumb */}
      <div className="m-breadcrumb" style={{ flexShrink: 0, background: 'rgba(15,22,35,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', height: 48, display: 'flex', alignItems: 'center', padding: '0 1.5rem', gap: 8 }}>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Intranet</span>
        <span style={{ color: '#2d3748' }}>/</span>
        <span className="m-breadcrumb-title" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>Discovery Center</span>
        <div style={{ display: 'flex', gap: 4, marginLeft: 16 }}>
          {[{ id: 'missions' as const, label: '🎓 Misiones' }, { id: 'tech' as const, label: 'Tecnología' }].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setActiveResource(null); }} style={{
              padding: '4px 12px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer',
              background: tab === t.id ? 'rgba(0,229,176,0.12)' : 'transparent',
              color: tab === t.id ? '#00e5b0' : '#64748b',
              border: tab === t.id ? '1px solid rgba(0,229,176,0.2)' : '1px solid rgba(255,255,255,0.04)',
            }}>{t.label}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '0.62rem', color: '#475569' }}>
          {tab === 'tech' ? `${COURSES.length} cursos · ${COURSES.reduce((s, c) => s + c.resources.length, 0)} recursos` : `${MISSIONS.length} misiones`}
        </span>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MISSIONS TAB v2 */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'missions' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* ─── VISTA 1: CATÁLOGO ─── */}
          {missionView === 'catalog' && (
            <div style={{ flex: 1, overflow: 'auto' }}>
              <div className="m-catalog-header" style={{ padding: '24px 32px 16px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>🎓 Misiones</h2>
                <input
                  value={missionSearch} onChange={e => setMissionSearch(e.target.value)}
                  placeholder="Buscar misión, tecnología, herramienta..."
                  style={{ flex: 1, minWidth: 250, background: '#161b28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#dce4f0', fontSize: 13, outline: 'none', fontFamily: "'Inter', system-ui" }}
                />
              </div>
              <div className="m-catalog-filters" style={{ display: 'flex', gap: 6, padding: '0 32px 16px', flexWrap: 'wrap' }}>
                {MISSION_FILTERS.map(f => (
                  <button key={f} onClick={() => setMissionFilter(f)} style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    background: missionFilter === f ? 'rgba(0,229,176,0.08)' : 'rgba(255,255,255,0.03)',
                    color: missionFilter === f ? '#00e5b0' : '#6b8099',
                    border: `1px solid ${missionFilter === f ? 'rgba(0,229,176,0.15)' : 'rgba(255,255,255,0.04)'}`,
                    transition: 'all 0.15s',
                  }}>{f}</button>
                ))}
                <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
                {['Todos', 'Beginner', 'Intermediate', 'Advanced'].map(lvl => {
                  const lc = lvl === 'Beginner' ? '#1fd975' : lvl === 'Intermediate' ? '#f5a623' : lvl === 'Advanced' ? '#b794ff' : '#6b8099';
                  return (
                    <button key={lvl} onClick={() => setMissionLevelFilter(lvl)} style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      background: missionLevelFilter === lvl ? `${lc}15` : 'rgba(255,255,255,0.03)',
                      color: missionLevelFilter === lvl ? lc : '#6b8099',
                      border: `1px solid ${missionLevelFilter === lvl ? `${lc}30` : 'rgba(255,255,255,0.04)'}`,
                      transition: 'all 0.15s',
                    }}>{lvl === 'Todos' ? 'Todos los niveles' : lvl}</button>
                  );
                })}
              </div>
              <div className="m-catalog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12, padding: '0 32px 32px' }}>
                {filteredMissions.map(m => (
                  <div key={m.id} onClick={() => openDetail(m)} style={{
                    background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12,
                    padding: 18, cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,176,0.15)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
                      {m.badges.map((b, i) => (
                        <span key={i} style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, ...badgeStyles[b.type] }}>{b.label}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#dce4f0', marginBottom: 6, lineHeight: 1.3 }}>{m.title}</div>
                    <div style={{ fontSize: 12, color: '#6b8099', lineHeight: 1.5, marginBottom: 10 }}>{m.description}</div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#2a3d58', marginBottom: (completedSteps[m.id]?.length || 0) > 0 ? 10 : 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>⏱ {m.duration}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>📚 {m.tutorialCount} tutoriales</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>🔧 {m.tools}</span>
                    </div>
                    {/* Barra de progreso */}
                    {(completedSteps[m.id]?.length || 0) > 0 && (() => {
                      const done = completedSteps[m.id]?.length || 0;
                      const total = LESSONS[m.id]?.length || m.tutorialCount;
                      const pct = Math.round((done / total) * 100);
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: pct === 100 ? '#1fd975' : '#00e5b0', transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize: 9, color: pct === 100 ? '#1fd975' : '#6b8099', fontWeight: 600, flexShrink: 0 }}>
                            {pct === 100 ? '✓ Completada' : `${done}/${total}`}
                          </span>
                        </div>
                      );
                    })()}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: m.gradient }} />
                  </div>
                ))}
                {filteredMissions.length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#475569', fontSize: 14 }}>Sin misiones encontradas</div>
                )}
              </div>
            </div>
          )}

          {/* ─── VISTA 2: MISSION DETAIL ─── */}
          {missionView === 'detail' && selectedMission && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Header */}
              <div className="m-detail-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <button onClick={backToCatalog} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 12px', color: '#6b8099', fontSize: 12, cursor: 'pointer' }}>← Catálogo</button>
                <span className="m-detail-title" style={{ fontSize: 18, fontWeight: 800, color: '#dce4f0', flex: 1 }}>{selectedMission.title}</span>
                <button onClick={openTutorial} style={{ padding: '8px 20px', borderRadius: 8, background: '#00e5b0', color: '#000', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}>Iniciar misión</button>
              </div>
              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                {(['overview', 'board', 'related'] as const).map(t => (
                  <button key={t} onClick={() => setDetailTab(t)} style={{
                    padding: '10px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'none',
                    color: detailTab === t ? '#00e5b0' : '#6b8099',
                    borderBottom: `2px solid ${detailTab === t ? '#00e5b0' : 'transparent'}`,
                    border: 'none', borderBottomWidth: 2, borderBottomStyle: 'solid',
                    borderBottomColor: detailTab === t ? '#00e5b0' : 'transparent',
                  }}>{t === 'overview' ? 'Overview' : t === 'board' ? 'Project Board' : 'Related Missions'}</button>
                ))}
              </div>
              {/* Content */}
              <div style={{ flex: 1, overflow: 'auto' }}>
                {/* Overview */}
                {detailTab === 'overview' && (
                  <div className="m-detail-overview" style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#dce4f0' }}>Caso de Uso</h3>
                      <p style={{ fontSize: 13, color: '#6b8099', lineHeight: 1.7, marginBottom: 16 }}>{selectedMission.overview.useCase}</p>
                      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#dce4f0', marginTop: 20 }}>El Desafío</h3>
                      <p style={{ fontSize: 13, color: '#6b8099', lineHeight: 1.7, marginBottom: 16 }}>{selectedMission.overview.challenge}</p>
                      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#dce4f0' }}>La Solución</h3>
                      <p style={{ fontSize: 13, color: '#6b8099', lineHeight: 1.7, marginBottom: 16 }}>{selectedMission.overview.solution}</p>
                      <FlowDiagram title="SOLUTION DIAGRAM" steps={selectedMission.overview.diagram.steps} colors={selectedMission.overview.diagram.colors} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ background: '#161b28', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#dce4f0' }}>Acerca de esta misión</div>
                        {[
                          { k: 'Duración', v: selectedMission.duration },
                          { k: 'Nivel', v: selectedMission.level, color: missionLevelColor(selectedMission.level) },
                          { k: 'Tutoriales', v: String(selectedMission.tutorialCount) },
                          { k: 'Herramientas', v: selectedMission.tools },
                          { k: 'Costo', v: selectedMission.overview.cost, color: '#1fd975' },
                          { k: 'Prerequisitos', v: selectedMission.overview.prerequisites },
                        ].map((row, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 11 }}>
                            <span style={{ color: '#6b8099' }}>{row.k}</span>
                            <span style={{ color: row.color || '#dce4f0', fontWeight: 600 }}>{row.v}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ background: '#161b28', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#dce4f0' }}>Lo que aprenderás</div>
                        <div style={{ fontSize: 11, color: '#6b8099', lineHeight: 1.8 }}>
                          {selectedMission.overview.learnings.map((l, i) => <div key={i}>✓ {l}</div>)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Board */}
                {detailTab === 'board' && (
                  <div className="m-detail-board" style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                    {selectedMission.board.map((col, ci) => (
                      <div key={ci} style={{ background: '#161b28', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14 }}>{col.icon}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#dce4f0' }}>{col.col}</span>
                          <span style={{ fontSize: 10, color: '#2a3d58', background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: 10 }}>{col.items.length}</span>
                        </div>
                        {col.items.map((item, ii) => (
                          <div key={ii} style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'background 0.15s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,176,0.02)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#dce4f0', marginBottom: 4 }}>{item.title}</div>
                            <div style={{ fontSize: 10, color: '#2a3d58', display: 'flex', gap: 8 }}>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: `${item.typeColor}15`, color: item.typeColor }}>{item.type}</span>
                              <span>{item.duration}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {/* Related */}
                {detailTab === 'related' && (
                  <div style={{ padding: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#dce4f0', marginBottom: 16 }}>Misiones relacionadas</h3>
                    <div className="m-related-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
                      {MISSIONS.filter(m => m.id !== selectedMission.id).slice(0, 3).map(m => (
                        <div key={m.id} onClick={() => openDetail(m)} style={{
                          background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,176,0.15)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#dce4f0', marginBottom: 4 }}>{m.title}</div>
                          <div style={{ fontSize: 11, color: '#6b8099', marginBottom: 8 }}>{m.description}</div>
                          <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#2a3d58' }}>
                            <span style={{ color: missionLevelColor(m.level) }}>{m.level}</span>
                            <span>⏱ {m.duration}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── VISTA 3: TUTORIAL ─── */}
          {missionView === 'tutorial' && selectedMission && (() => {
            const steps = LESSONS[selectedMission.id] || [{ title: 'Contenido en desarrollo', content: <p style={{ color: '#6b8099' }}>Pronto tendrá contenido.</p> }];
            const step = steps[tutorialStep] || steps[0];
            const isCompleted = (completedSteps[selectedMission.id] || []).includes(tutorialStep);
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Tutorial header */}
                <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <button onClick={backToDetail} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 12px', color: '#6b8099', fontSize: 12, cursor: 'pointer' }}>← Misión</button>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#dce4f0', flex: 1 }}>{step.title}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(31,217,117,0.1)', color: '#1fd975' }}>Tutorial</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${missionLevelColor(selectedMission.level)}15`, color: missionLevelColor(selectedMission.level) }}>{selectedMission.level}</span>
                  <button onClick={() => toggleStepComplete(selectedMission.id, tutorialStep)} style={{
                    marginLeft: 'auto', padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    border: `1px solid ${isCompleted ? 'rgba(31,217,117,0.4)' : 'rgba(31,217,117,0.2)'}`,
                    background: isCompleted ? 'rgba(31,217,117,0.15)' : 'rgba(31,217,117,0.08)',
                    color: '#1fd975',
                  }}>{isCompleted ? '✓ Completado' : '✓ Marcar como completado'}</button>
                </div>
                {/* Tutorial body */}
                <div className="m-tutorial-body" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                  {/* Sidebar toggle for mobile */}
                  <button className="m-tutorial-sidebar-toggle" onClick={() => setMobileStepOpen(!mobileStepOpen)} style={{
                    width: '100%', padding: '10px 16px', background: 'rgba(0,229,176,0.04)', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    color: '#00e5b0', fontSize: 12, fontWeight: 600, cursor: 'pointer', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span>Paso {tutorialStep + 1} de {steps.length}: {step.title}</span>
                    <span>{mobileStepOpen ? '▲' : '▼'}</span>
                  </button>
                  {/* Sidebar */}
                  <div className={`m-tutorial-sidebar${!mobileStepOpen ? ' collapsed' : ''}`} style={{ width: 260, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto' }}>
                    {steps.map((s, i) => {
                      const stepCompleted = (completedSteps[selectedMission.id] || []).includes(i);
                      const isActive = i === tutorialStep;
                      return (
                        <div key={i} className={`tut-step-item${isActive ? ' active' : ''}`} onClick={() => { setTutorialStep(i); setMobileStepOpen(false); }} style={{
                          padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.02)',
                          display: 'flex', gap: 10, alignItems: 'flex-start', transition: 'all 0.15s',
                          borderLeft: `3px solid ${isActive ? '#00e5b0' : 'transparent'}`,
                          background: isActive ? 'rgba(0,229,176,0.04)' : 'transparent',
                          opacity: stepCompleted && !isActive ? 0.6 : 1,
                        }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700, flexShrink: 0,
                            background: stepCompleted ? 'rgba(31,217,117,0.12)' : isActive ? 'rgba(0,229,176,0.12)' : 'rgba(255,255,255,0.04)',
                            color: stepCompleted ? '#1fd975' : isActive ? '#00e5b0' : '#6b8099',
                            border: `1px solid ${stepCompleted ? 'rgba(31,217,117,0.25)' : isActive ? 'rgba(0,229,176,0.25)' : 'rgba(255,255,255,0.08)'}`,
                          }}>{stepCompleted ? '✓' : i + 1}</div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: isActive ? '#dce4f0' : '#94a3b8', lineHeight: 1.4 }}>{s.title}</div>
                            <div style={{ fontSize: 9, color: '#2a3d58', marginTop: 2 }}>
                              {selectedMission.board.flatMap(c => c.items)[i]?.type || 'Tutorial'} · {selectedMission.board.flatMap(c => c.items)[i]?.duration || ''}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Content */}
                  <div className="m-tutorial-content" style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', maxWidth: 700 }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(0,229,176,0.1)', color: '#00e5b0' }}>Paso {tutorialStep + 1} de {steps.length}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(79,142,247,0.1)', color: '#4f8ef7' }}>
                        {selectedMission.board.flatMap(c => c.items)[tutorialStep]?.type || 'Tutorial'}
                      </span>
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#dce4f0', marginBottom: 16 }}>{step.title}</h2>
                    {step.content}
                    {/* Nav */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <button onClick={() => setTutorialStep(Math.max(0, tutorialStep - 1))} disabled={tutorialStep === 0} style={{
                        padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: tutorialStep === 0 ? 'default' : 'pointer',
                        background: 'rgba(255,255,255,0.04)', color: tutorialStep === 0 ? '#2a3d58' : '#6b8099', border: 'none',
                      }}>← Anterior</button>
                      {tutorialStep < steps.length - 1 ? (
                        <button onClick={() => setTutorialStep(tutorialStep + 1)} style={{
                          padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          background: 'rgba(0,229,176,0.1)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.15)',
                        }}>Siguiente: {steps[tutorialStep + 1]?.title} →</button>
                      ) : (
                        <button onClick={() => { toggleStepComplete(selectedMission.id, tutorialStep); backToDetail(); }} style={{
                          padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          background: '#1fd975', color: '#000', border: 'none',
                        }}>Completar misión ✓</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TECH TAB (preserved from v1) */}
      {/* ═══════════════════════════════════════════════════════ */}
      {tab === 'tech' && <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Course list */}
        <div style={{
          width: activeResource ? 360 : '100%', minWidth: activeResource ? 360 : undefined, flexShrink: 0,
          overflow: 'auto', padding: activeResource ? '1rem' : '1.5rem 2rem', transition: 'width 0.3s ease',
          borderRight: activeResource ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}>
          {!activeResource && (
            <div style={{ marginBottom: '1.25rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Discovery Center</h1>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '4px 0 0 0' }}>Aprende tecnología — IA, Cloud, SAP, Desarrollo, Diseño</p>
            </div>
          )}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar tecnología..." style={{
            width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
            padding: '8px 12px', color: '#f1f5f9', fontSize: '0.75rem', outline: 'none', fontFamily: "'Inter', system-ui", marginBottom: '0.75rem',
          }} />
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
          <div style={{ display: 'grid', gridTemplateColumns: activeResource ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.7rem' }}>
            {filtered.map(course => {
              const lc = levelColors[course.level];
              const isActive = activeResource?.course.id === course.id;
              return (
                <div key={course.id} style={{
                  background: isActive ? 'rgba(0,229,176,0.04)' : '#111827',
                  border: `1px solid ${isActive ? 'rgba(0,229,176,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 14, padding: activeResource ? '0.8rem' : '1.1rem', transition: 'all 0.15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: activeResource ? '1rem' : '1.3rem' }}>{course.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: activeResource ? '0.75rem' : '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>{course.title}</div>
                      <div style={{ fontSize: '0.6rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.subtitle}</div>
                    </div>
                    <span style={{ fontSize: '0.5rem', fontWeight: 700, padding: '2px 6px', borderRadius: 5, background: lc.bg, color: lc.text, border: `1px solid ${lc.border}`, flexShrink: 0 }}>{course.level}</span>
                  </div>
                  {!activeResource && (
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 10 }}>
                      {course.tags.map(t => (
                        <span key={t} style={{ fontSize: '0.52rem', padding: '1px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.03)', color: '#64748b', border: '1px solid rgba(255,255,255,0.05)' }}>{t}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {course.resources.map((res, i) => {
                      const ti = typeIcons[res.type];
                      const isResActive = activeResource?.resource.url === res.url;
                      return (
                        <button key={i} onClick={() => { setIframeError(false); setActiveResource({ course, resource: res }); }} style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                          background: isResActive ? 'rgba(0,229,176,0.08)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${isResActive ? 'rgba(0,229,176,0.2)' : 'rgba(255,255,255,0.04)'}`,
                          borderRadius: 8, cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all 0.15s',
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
          {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: '#475569', fontSize: '0.8rem' }}>Sin resultados</div>}
        </div>

        {/* Resource Preview (iframe) */}
        {activeResource && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0a0d14' }}>
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
                  fontSize: '0.6rem', padding: '3px 10px', borderRadius: 6, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', textDecoration: 'none', fontWeight: 600,
                }}>Abrir ↗</a>
                <button onClick={() => setActiveResource(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}>✕</button>
              </div>
            </div>
            {isBlocked(activeResource.resource.url) || iframeError ? (
              <iframe src={`/api/proxy?url=${encodeURIComponent(activeResource.resource.url)}`} style={{ flex: 1, border: 'none', background: '#fff' }} title={activeResource.resource.title} />
            ) : (
              <iframe src={activeResource.resource.url} style={{ flex: 1, border: 'none', background: '#fff' }} title={activeResource.resource.title}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms" onError={() => setIframeError(true)} />
            )}
          </div>
        )}
      </div>}

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .m-catalog-grid { grid-template-columns: 1fr !important; padding: 0 16px 24px !important; }
          .m-catalog-header { padding: 16px 16px 12px !important; }
          .m-catalog-header h2 { font-size: 16px !important; }
          .m-catalog-filters { padding: 0 16px 12px !important; overflow-x: auto; flex-wrap: nowrap !important; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
          .m-catalog-filters::-webkit-scrollbar { display: none; }
          .m-catalog-filters button { flex-shrink: 0; }
          .m-detail-overview { grid-template-columns: 1fr !important; }
          .m-detail-board { grid-template-columns: 1fr !important; }
          .m-detail-header { flex-wrap: wrap; gap: 8px !important; }
          .m-detail-header .m-detail-title { font-size: 15px !important; width: 100%; order: -1; }
          .m-tutorial-body { flex-direction: column !important; }
          .m-tutorial-sidebar { width: 100% !important; border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.06); max-height: none; overflow: visible; }
          .m-tutorial-sidebar.collapsed > .tut-step-item:not(.active) { display: none; }
          .m-tutorial-sidebar-toggle { display: flex !important; }
          .m-tutorial-content { padding: 16px !important; }
          .m-related-grid { grid-template-columns: 1fr !important; }
          .m-breadcrumb { padding: 0 1rem !important; }
          .m-breadcrumb .m-breadcrumb-title { font-size: 0.75rem !important; }
        }
        .m-tutorial-sidebar-toggle { display: none; }
      `}</style>
    </div>
  );
}
