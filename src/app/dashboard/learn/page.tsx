'use client';
import { useState } from 'react';

interface Lesson {
  title: string;
  duration: string;
}

interface Course {
  id: string;
  emoji: string;
  title: string;
  category: string;
  level: 'Básico' | 'Intermedio' | 'Avanzado';
  duration: string;
  description: string;
  lessons: Lesson[];
  extensionId?: string; // links to Labs extension
}

const CATEGORIES = ['Todos', 'IA', 'Desarrollo', 'Cloud', 'SAP', 'Diseño', 'Datos', 'Negocio'];
const LEVELS = ['Todos', 'Básico', 'Intermedio', 'Avanzado'];

const COURSES: Course[] = [
  // IA
  {
    id: 'ia-agents', emoji: '🐾', title: 'Agentes IA con Hoku', category: 'IA',
    level: 'Básico', duration: '20 min',
    description: 'Aprende a usar Hoku, el agente fusión que combina 12 modelos IA en paralelo para obtener la mejor respuesta.',
    lessons: [
      { title: 'Qué es Hoku y cómo funciona la fusión', duration: '5 min' },
      { title: 'Ejecutar tu primer prompt multi-agente', duration: '5 min' },
      { title: 'Modos: Chat, Code, SAP, Deploy', duration: '5 min' },
      { title: 'ML: Cómo Hoku aprende de tus interacciones', duration: '5 min' },
    ],
    extensionId: 'anthropic',
  },
  {
    id: 'ia-prompts', emoji: '✨', title: 'Prompting efectivo para desarrollo', category: 'IA',
    level: 'Intermedio', duration: '25 min',
    description: 'Técnicas de prompting para obtener código funcional, arquitectura, y documentación de agentes IA.',
    lessons: [
      { title: 'Anatomía de un buen prompt de código', duration: '5 min' },
      { title: 'Chain-of-thought para debugging', duration: '5 min' },
      { title: 'Prompts para SAP BTP y S/4HANA', duration: '8 min' },
      { title: 'Generación de tests automáticos', duration: '7 min' },
    ],
  },
  {
    id: 'ia-ml', emoji: '🧠', title: 'Machine Learning con Supabase', category: 'IA',
    level: 'Avanzado', duration: '30 min',
    description: 'Implementa sistemas de aprendizaje continuo usando Supabase como base de conocimiento con full-text search.',
    lessons: [
      { title: 'Diseñar tablas para ML (knowledge base)', duration: '8 min' },
      { title: 'Full-text search con tsvector en PostgreSQL', duration: '7 min' },
      { title: 'Feedback loops: quality_score y reinforcement', duration: '8 min' },
      { title: 'Conectar ML con agentes multi-modelo', duration: '7 min' },
    ],
    extensionId: 'supabase',
  },
  // Desarrollo
  {
    id: 'dev-nextjs', emoji: '⚡', title: 'Next.js 16 + App Router', category: 'Desarrollo',
    level: 'Intermedio', duration: '35 min',
    description: 'Domina Next.js 16 con App Router, Server Components, y streaming — el stack de la intranet.',
    lessons: [
      { title: 'App Router vs Pages Router', duration: '5 min' },
      { title: 'Server Components y Client Components', duration: '8 min' },
      { title: 'Streaming SSE con ReadableStream', duration: '10 min' },
      { title: 'API Routes y middleware', duration: '7 min' },
      { title: 'Deploy en AWS Amplify', duration: '5 min' },
    ],
  },
  {
    id: 'dev-tailwind', emoji: '🎨', title: 'Tailwind CSS v4 + Dark Mode', category: 'Diseño',
    level: 'Básico', duration: '20 min',
    description: 'Diseña interfaces dark mode profesionales con Tailwind v4 y CSS custom properties.',
    lessons: [
      { title: 'Setup Tailwind v4 en Next.js', duration: '5 min' },
      { title: 'Dark mode con CSS variables', duration: '5 min' },
      { title: 'Componentes reutilizables con inline styles', duration: '5 min' },
      { title: 'Responsive y animaciones', duration: '5 min' },
    ],
  },
  {
    id: 'dev-api', emoji: '🔌', title: 'APIs REST + Streaming', category: 'Desarrollo',
    level: 'Intermedio', duration: '25 min',
    description: 'Construye APIs con streaming real-time (SSE), integración multi-proveedor, y manejo de errores.',
    lessons: [
      { title: 'Server-Sent Events (SSE) desde cero', duration: '8 min' },
      { title: 'Integrar OpenAI, Groq, Anthropic en una API', duration: '7 min' },
      { title: 'AbortController y timeouts', duration: '5 min' },
      { title: 'Rate limiting y retry con backoff', duration: '5 min' },
    ],
  },
  // Cloud
  {
    id: 'cloud-aws', emoji: '☁️', title: 'AWS para developers', category: 'Cloud',
    level: 'Intermedio', duration: '30 min',
    description: 'S3, CloudFront, Amplify, Bedrock, Route 53 — todo lo que usa SmartConnection en AWS.',
    lessons: [
      { title: 'S3 + CloudFront para static hosting', duration: '8 min' },
      { title: 'AWS Amplify: deploy automático Next.js', duration: '7 min' },
      { title: 'Bedrock: Claude en AWS', duration: '8 min' },
      { title: 'CDN invalidation y health checks', duration: '7 min' },
    ],
    extensionId: 'aws-amplify',
  },
  {
    id: 'cloud-supabase', emoji: '⚡', title: 'Supabase: PostgreSQL moderno', category: 'Datos',
    level: 'Básico', duration: '25 min',
    description: 'Base de datos, auth, storage, realtime — todo en uno con Supabase.',
    lessons: [
      { title: 'Setup y tablas con RLS', duration: '7 min' },
      { title: 'Queries desde Next.js API Routes', duration: '6 min' },
      { title: 'Realtime subscriptions', duration: '6 min' },
      { title: 'Full-text search en español', duration: '6 min' },
    ],
    extensionId: 'supabase',
  },
  // SAP
  {
    id: 'sap-btp', emoji: '🔷', title: 'SAP BTP para consultores', category: 'SAP',
    level: 'Avanzado', duration: '40 min',
    description: 'Business Technology Platform: extensiones, integración, y desarrollo cloud en el ecosistema SAP.',
    lessons: [
      { title: 'Arquitectura BTP: subaccounts y spaces', duration: '8 min' },
      { title: 'SAP Integration Suite: A2A y B2B', duration: '10 min' },
      { title: 'SAP Build: apps low-code', duration: '10 min' },
      { title: 'Datasphere + Analytics Cloud', duration: '12 min' },
    ],
    extensionId: 'sap-btp',
  },
  // Negocio
  {
    id: 'biz-leads', emoji: '🎯', title: 'CRM y gestión de leads', category: 'Negocio',
    level: 'Básico', duration: '15 min',
    description: 'Gestiona leads, conversiones, y pipeline de ventas con la intranet de SmartConnection.',
    lessons: [
      { title: 'Crear y clasificar leads', duration: '5 min' },
      { title: 'Vincular leads con proyectos', duration: '5 min' },
      { title: 'Métricas de conversión', duration: '5 min' },
    ],
  },
  {
    id: 'biz-deploy', emoji: '🚀', title: 'Pipeline de deploy profesional', category: 'Desarrollo',
    level: 'Intermedio', duration: '20 min',
    description: 'Pipeline de 7 pasos con validación IA, stress test, y health checks antes de ir a producción.',
    lessons: [
      { title: 'Build y verificación pre-deploy', duration: '5 min' },
      { title: 'Tests IA con Hoku (12 agentes)', duration: '5 min' },
      { title: 'Health checks y stress testing', duration: '5 min' },
      { title: 'Rollback y recovery', duration: '5 min' },
    ],
  },
  {
    id: 'design-ux', emoji: '🖌️', title: 'UX para intranets corporativas', category: 'Diseño',
    level: 'Básico', duration: '20 min',
    description: 'Principios de diseño para dashboards, dark mode, y experiencia de usuario en herramientas internas.',
    lessons: [
      { title: 'Dark mode profesional: paleta y contraste', duration: '5 min' },
      { title: 'KPI cards y data visualization', duration: '5 min' },
      { title: 'Navegación: sidebar, command bar, shortcuts', duration: '5 min' },
      { title: 'Loading states y feedback visual', duration: '5 min' },
    ],
  },
];

const levelColors: Record<string, { bg: string; text: string }> = {
  'Básico': { bg: 'rgba(34,197,94,0.1)', text: '#22c55e' },
  'Intermedio': { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6' },
  'Avanzado': { bg: 'rgba(139,92,246,0.1)', text: '#8b5cf6' },
};

export default function LearnPage() {
  const [catFilter, setCatFilter] = useState('Todos');
  const [levelFilter, setLevelFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = COURSES.filter(c => {
    if (catFilter !== 'Todos' && c.category !== catFilter) return false;
    if (levelFilter !== 'Todos' && c.level !== levelFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
    }
    return true;
  });

  const totalLessons = COURSES.reduce((s, c) => s + c.lessons.length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 34px)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, background: 'rgba(15,22,35,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ height: 48, display: 'flex', alignItems: 'center', padding: '0 1.5rem', gap: 10 }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Intranet</span>
          <span style={{ color: '#2d3748' }}>/</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>Aprender</span>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem 2rem' }}>
        {/* Title */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Central de Aprendizaje</h1>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
            Guías para dominar la intranet SmartConnection — {COURSES.length} cursos · {totalLessons} lecciones
          </p>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '1rem' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cursos..."
            style={{
              width: '100%', maxWidth: 400, background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
              padding: '8px 14px', color: '#f1f5f9', fontSize: '0.8rem',
              outline: 'none', fontFamily: "'Inter', system-ui",
            }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)} style={{
              padding: '5px 12px', borderRadius: 8, fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer',
              background: catFilter === cat ? 'rgba(0,229,176,0.12)' : 'rgba(255,255,255,0.03)',
              color: catFilter === cat ? '#00e5b0' : '#94a3b8',
              border: catFilter === cat ? '1px solid rgba(0,229,176,0.2)' : '1px solid rgba(255,255,255,0.06)',
              fontFamily: "'Inter', system-ui",
            }}>{cat}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {LEVELS.map(lvl => (
            <button key={lvl} onClick={() => setLevelFilter(lvl)} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: '0.62rem', fontWeight: 600, cursor: 'pointer',
              background: levelFilter === lvl ? 'rgba(139,92,246,0.12)' : 'transparent',
              color: levelFilter === lvl ? '#a78bfa' : '#475569',
              border: levelFilter === lvl ? '1px solid rgba(139,92,246,0.2)' : '1px solid rgba(255,255,255,0.04)',
              fontFamily: "'Inter', system-ui",
            }}>{lvl}</button>
          ))}
        </div>

        {/* Course Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
          {filtered.map(course => {
            const lc = levelColors[course.level];
            const isExpanded = expanded === course.id;
            return (
              <div key={course.id} onClick={() => setExpanded(isExpanded ? null : course.id)}
                style={{
                  background: '#111827', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 14, padding: '1.25rem', cursor: 'pointer',
                  transition: 'all 0.2s',
                  borderColor: isExpanded ? 'rgba(0,229,176,0.2)' : 'rgba(255,255,255,0.06)',
                  transform: isExpanded ? 'translateY(-2px)' : 'none',
                  boxShadow: isExpanded ? '0 8px 24px rgba(0,0,0,0.3)' : 'none',
                }}>
                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: '1.3rem' }}>{course.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>{course.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.62rem', color: '#64748b' }}>
                      <span>{course.category}</span>
                      <span>·</span>
                      <span>{course.duration}</span>
                      <span>·</span>
                      <span>{course.lessons.length} lecciones</span>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.55rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                    background: lc.bg, color: lc.text,
                  }}>{course.level}</span>
                </div>

                {/* Description */}
                <p style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 10px 0' }}>
                  {course.description}
                </p>

                {/* Extension link */}
                {course.extensionId && (
                  <div style={{ fontSize: '0.6rem', color: '#475569', marginBottom: 8 }}>
                    🔌 Extensión: <a href="/dashboard/labs" style={{ color: '#3b82f6', textDecoration: 'none' }}>{course.extensionId}</a>
                  </div>
                )}

                {/* Expanded: Lessons */}
                {isExpanded && (
                  <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 10 }}>
                    {course.lessons.map((lesson, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                        borderBottom: i < course.lessons.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                      }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: '50%',
                          background: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.55rem', color: '#00e5b0', fontWeight: 700, flexShrink: 0,
                        }}>{i + 1}</span>
                        <span style={{ fontSize: '0.72rem', color: '#d1d5db', flex: 1 }}>{lesson.title}</span>
                        <span style={{ fontSize: '0.6rem', color: '#475569', flexShrink: 0 }}>{lesson.duration}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#475569', fontSize: '0.8rem' }}>
            No se encontraron cursos con esos filtros
          </div>
        )}
      </div>
    </div>
  );
}
