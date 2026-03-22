'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/config';

interface Step {
  title: string;
  description: string;
  action?: { label: string; href: string };
  duration: string;
}

interface Mission {
  id: string;
  emoji: string;
  title: string;
  category: string;
  level: 'Principiante' | 'Intermedio' | 'Avanzado';
  duration: string;
  description: string;
  tags: string[];
  steps: Step[];
  relatedPage: string;
  relatedExtension?: string;
}

const CATEGORIES = ['Todos', 'IA & Agentes', 'Desarrollo', 'Cloud & Deploy', 'CRM & Negocio', 'SAP', 'Diseño & UX'];

const MISSIONS: Mission[] = [
  // IA & Agentes
  {
    id: 'mission-hoku-first', emoji: '🐾', title: 'Tu primera conversación con Hoku',
    category: 'IA & Agentes', level: 'Principiante', duration: '5 min',
    description: 'Aprende a usar el chat flotante de Hoku que fusiona 12 agentes IA para darte la mejor respuesta.',
    tags: ['Hoku', 'Chat', 'Multi-agente'],
    relatedPage: '/dashboard', relatedExtension: 'anthropic',
    steps: [
      { title: 'Abrir el chat de Hoku', description: 'Haz clic en el botón 🐾 en la esquina inferior derecha de cualquier página del dashboard.', action: { label: 'Ir al Dashboard', href: '/dashboard' }, duration: '30s' },
      { title: 'Hacer una pregunta', description: 'Escribe algo como "¿Cuántos agentes hay activos?" — Hoku consultará datos reales de Supabase para responder.', duration: '1 min' },
      { title: 'Ver los agentes trabajando', description: 'Hoku ejecuta hasta 9 agentes en paralelo (Groq, Claude, DeepSeek, etc.) y sintetiza la mejor respuesta.', duration: '2 min' },
      { title: 'Dar feedback', description: 'Usa 👍/👎 en cada respuesta. Hoku aprende con ML — las respuestas con 👍 se priorizan en el futuro.', duration: '1 min' },
    ],
  },
  {
    id: 'mission-agents-workspace', emoji: '🤖', title: 'Ejecutar agentes desde el Workspace',
    category: 'IA & Agentes', level: 'Principiante', duration: '10 min',
    description: 'Usa el workspace de agentes para ejecutar Hoku, Groq, Claude o cualquiera de los 11 agentes en modos chat, code, SAP y deploy.',
    tags: ['Agentes', 'Workspace', 'Streaming'],
    relatedPage: '/dashboard/agents',
    steps: [
      { title: 'Ir al Workspace de Agentes', description: 'Navega a Agentes IA en el sidebar (⌘2).', action: { label: 'Abrir Agentes', href: '/dashboard/agents' }, duration: '30s' },
      { title: 'Seleccionar un agente', description: 'Haz clic en cualquier agente del panel izquierdo. Hoku (fusión) es el más potente.', duration: '1 min' },
      { title: 'Elegir un modo', description: 'Chat (conversación), Code (genera código), SAP (consultoría), Deploy (devops).', duration: '1 min' },
      { title: 'Ejecutar un prompt', description: 'Escribe tu tarea y presiona Enter. Verás el resultado en streaming en tiempo real.', duration: '3 min' },
      { title: 'Commitear código generado', description: 'Si el agente genera código, aparecerá el botón "Commit to GitHub" para deployar automáticamente.', duration: '3 min' },
    ],
  },
  {
    id: 'mission-ml-feedback', emoji: '🧠', title: 'Entrenar a Hoku con feedback',
    category: 'IA & Agentes', level: 'Intermedio', duration: '10 min',
    description: 'Hoku tiene un sistema ML que aprende de tus interacciones. Aprende cómo funciona y cómo mejorar sus respuestas.',
    tags: ['ML', 'Knowledge Base', 'Feedback'],
    relatedPage: '/dashboard', relatedExtension: 'supabase',
    steps: [
      { title: 'Conversar con Hoku sobre un tema técnico', description: 'Pregúntale algo específico de tu proyecto, como "¿Cómo integrar SAP BTP con Supabase?"', duration: '2 min' },
      { title: 'Evaluar la respuesta', description: 'Haz clic en 👍 si fue útil o 👎 si no. Esto ajusta el quality_score en la knowledge base.', duration: '1 min' },
      { title: 'Verificar el aprendizaje', description: 'Pregunta lo mismo de nuevo en unos minutos. Hoku usará el conocimiento almacenado para dar una respuesta mejorada.', duration: '3 min' },
      { title: 'Ver la knowledge base', description: 'En Supabase puedes ver la tabla hoku_knowledge con todos los conocimientos que Hoku ha acumulado.', duration: '2 min' },
    ],
  },
  // CRM & Negocio
  {
    id: 'mission-lead-to-project', emoji: '🎯', title: 'De lead a proyecto: flujo completo',
    category: 'CRM & Negocio', level: 'Principiante', duration: '8 min',
    description: 'Crea un lead, conviértelo en proyecto, y vincula todo para tener trazabilidad completa.',
    tags: ['Leads', 'Proyectos', 'CRM'],
    relatedPage: '/dashboard/leads',
    steps: [
      { title: 'Crear un lead', description: 'Ve a Leads & CRM (⌘3) → "Nuevo Lead". Llena nombre, empresa, servicio.', action: { label: 'Ir a Leads', href: '/dashboard/leads' }, duration: '2 min' },
      { title: 'Crear un proyecto vinculado', description: 'Ve a Proyectos (⌘5) → "Nuevo". En "Lead asociado" selecciona el lead que creaste.', action: { label: 'Ir a Proyectos', href: '/dashboard/projects' }, duration: '2 min' },
      { title: 'Mover en el Kanban', description: 'Arrastra el proyecto de "Backlog" a "In Progress". El estado se guarda en Supabase automáticamente.', duration: '1 min' },
      { title: 'Verificar en el Dashboard', description: 'Vuelve al Dashboard (⌘1) y verás los KPIs actualizados: leads, proyectos, deploy rate.', action: { label: 'Ver Dashboard', href: '/dashboard' }, duration: '2 min' },
    ],
  },
  // Cloud & Deploy
  {
    id: 'mission-deploy-pipeline', emoji: '🚀', title: 'Ejecutar un deploy completo',
    category: 'Cloud & Deploy', level: 'Intermedio', duration: '15 min',
    description: 'Ejecuta el pipeline de 7 pasos: Build, Tests IA, Push, Amplify, Health Check, Stress Test, y Live Preview.',
    tags: ['Deploy', 'Pipeline', 'AWS', 'Amplify'],
    relatedPage: '/dashboard/deploy', relatedExtension: 'aws-amplify',
    steps: [
      { title: 'Ir al Deploy Center', description: 'Navega a Deploy en la sección Infra del sidebar.', action: { label: 'Abrir Deploy', href: '/dashboard/deploy' }, duration: '30s' },
      { title: 'Revisar commits pendientes', description: 'El panel derecho muestra los últimos commits de GitHub. Verifica que tu cambio está listado.', duration: '2 min' },
      { title: 'Iniciar el pipeline', description: 'Haz clic en "Deploy" → se ejecutan 7 pasos automáticamente con logs en tiempo real.', duration: '1 min' },
      { title: 'Observar Tests IA', description: 'Hoku analiza el código con 12 agentes antes de deployar. Ve los resultados en el terminal.', duration: '3 min' },
      { title: 'Health Check y Stress Test', description: 'El pipeline verifica endpoints reales y hace 10 requests paralelos para asegurar estabilidad.', duration: '3 min' },
      { title: 'Ver Live Preview', description: 'Al completar, se abre un popup con el sitio deployado. Puedes navegar entre Dashboard, Mejoras, y Agentes.', duration: '2 min' },
    ],
  },
  {
    id: 'mission-aws-panel', emoji: '☁️', title: 'Monitorear AWS desde la intranet',
    category: 'Cloud & Deploy', level: 'Intermedio', duration: '8 min',
    description: 'Verifica S3, CloudFront, Amplify, y ejecuta invalidaciones CDN desde el AWS Panel.',
    tags: ['AWS', 'S3', 'CloudFront', 'Monitoring'],
    relatedPage: '/dashboard/aws', relatedExtension: 'aws-s3',
    steps: [
      { title: 'Abrir AWS Panel', description: 'Ve a AWS en la sección Infra del sidebar.', action: { label: 'Abrir AWS', href: '/dashboard/aws' }, duration: '30s' },
      { title: 'Verificar health checks', description: 'El panel hace ping real a smconnection.cl e intranet.smconnection.cl con latencia medida.', duration: '2 min' },
      { title: 'Ver métricas S3', description: 'Muestra objetos totales y tamaño del bucket en MB — datos reales de la API AWS.', duration: '2 min' },
      { title: 'Invalidar CDN', description: 'Haz clic en "Invalidar CDN" para limpiar el cache de CloudFront globalmente.', duration: '2 min' },
    ],
  },
  // Mejoras & UX
  {
    id: 'mission-improvement-cycle', emoji: '✨', title: 'Ciclo completo de mejora UX',
    category: 'Diseño & UX', level: 'Intermedio', duration: '12 min',
    description: 'Genera una mejora con Hoku, revísala, deplóyala, y verifica que está live — todo desde la intranet.',
    tags: ['Mejoras', 'UX', 'Deploy', 'Hoku'],
    relatedPage: '/dashboard/improvements',
    steps: [
      { title: 'Analizar con Hoku', description: 'Ve a Mejoras & UX (⌘6) → clic en "🐾 Análisis Hoku". Hoku fusiona 12 agentes para encontrar mejoras.', action: { label: 'Ir a Mejoras', href: '/dashboard/improvements' }, duration: '3 min' },
      { title: 'Revisar mejoras generadas', description: 'Las mejoras aparecen como tarjetas con estado "Borrador". Haz clic en "Ver" para expandir detalles.', duration: '2 min' },
      { title: 'Deployar una mejora', description: 'Haz clic en "🚀 Deploy" en cualquier mejora. Se commitea a GitHub y Amplify la deploya automáticamente.', duration: '3 min' },
      { title: 'Verificar en Live', description: 'Después del deploy, haz clic en "🔗 Live" para ver la mejora en producción.', duration: '2 min' },
    ],
  },
  // Extensiones
  {
    id: 'mission-extensions', emoji: '🔌', title: 'Instalar y usar extensiones',
    category: 'Desarrollo', level: 'Principiante', duration: '8 min',
    description: 'Explora las extensiones disponibles (130+), instala una, y úsala en una automatización.',
    tags: ['Extensiones', 'Labs', 'Integraciones'],
    relatedPage: '/dashboard/labs',
    steps: [
      { title: 'Explorar extensiones', description: 'Ve a Extensiones (⌘7). Verás las extensiones instaladas (✓) y disponibles.', action: { label: 'Abrir Extensiones', href: '/dashboard/labs' }, duration: '2 min' },
      { title: 'Buscar por categoría', description: 'Filtra por IA, SAP, Business, Cloud, etc. Usa la barra de búsqueda para encontrar rápido.', duration: '1 min' },
      { title: 'Ejecutar una automatización', description: 'Ve al tab "Automatizaciones" y ejecuta un flujo como "Client Onboarding" o "UX Analysis".', duration: '3 min' },
      { title: 'Ver el resultado', description: 'El flujo ejecuta Hoku y genera una mejora automáticamente en la sección Mejoras & UX.', duration: '2 min' },
    ],
  },
  // SAP
  {
    id: 'mission-sap-analysis', emoji: '🔷', title: 'Análisis SAP con agentes IA',
    category: 'SAP', level: 'Avanzado', duration: '15 min',
    description: 'Usa Hoku en modo SAP para generar arquitectura BTP, propuestas de integración, y estimaciones.',
    tags: ['SAP', 'BTP', 'Consultoría', 'Hoku'],
    relatedPage: '/dashboard/agents', relatedExtension: 'sap-btp',
    steps: [
      { title: 'Seleccionar modo SAP', description: 'En Agentes IA, selecciona Hoku y cambia el modo a "🏢 SAP".', action: { label: 'Abrir Agentes', href: '/dashboard/agents' }, duration: '1 min' },
      { title: 'Describir el caso de uso', description: 'Ejemplo: "Diseña la arquitectura de integración entre SAP S/4HANA y un portal web Next.js via BTP Integration Suite."', duration: '2 min' },
      { title: 'Revisar la respuesta multi-agente', description: 'Hoku ejecuta 9+ agentes en paralelo. Cada uno aporta desde su expertise (Groq=velocidad, Claude=código, Mistral=SAP).', duration: '5 min' },
      { title: 'Commitear la propuesta', description: 'Si generó código o documentación, usa "Commit to GitHub" para guardarlo en el repositorio.', duration: '3 min' },
      { title: 'Crear proyecto', description: 'Ve a Proyectos y crea un proyecto SAP vinculado al lead correspondiente.', action: { label: 'Crear Proyecto', href: '/dashboard/projects' }, duration: '2 min' },
    ],
  },
  // Analytics
  {
    id: 'mission-analytics', emoji: '📊', title: 'Interpretar métricas del dashboard',
    category: 'CRM & Negocio', level: 'Principiante', duration: '5 min',
    description: 'Entiende cada KPI del dashboard: agentes activos, leads, reuniones, deploy rate, tokens IA, y AWS status.',
    tags: ['Dashboard', 'KPIs', 'Métricas'],
    relatedPage: '/dashboard',
    steps: [
      { title: 'Revisar KPIs principales', description: 'El dashboard muestra 8 KPIs en tiempo real. Haz clic en cada uno para ver detalles.', action: { label: 'Ver Dashboard', href: '/dashboard' }, duration: '2 min' },
      { title: 'Entender Deploy Rate', description: 'Muestra el % de deploys exitosos. Verde >90%, amarillo >70%, rojo <70%.', duration: '1 min' },
      { title: 'Ver actividad de agentes', description: 'La tabla de agentes muestra estado (Activo/Standby), modelo, y tareas ejecutadas.', duration: '1 min' },
      { title: 'Live Feed', description: 'El panel derecho muestra logs en tiempo real de todos los agentes. Haz clic para expandir.', duration: '1 min' },
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
  const [levelFilter, setLevelFilter] = useState<string>('Todos');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean[]>>({});
  const [stats, setStats] = useState({ agents: 0, leads: 0, projects: 0 });
  const [preview, setPreview] = useState<{ url: string; title: string; missionId: string; stepIdx: number } | null>(null);

  // Load real stats from Supabase
  useEffect(() => {
    api({ action: 'list' }).then(d => { if (d.agents) setStats(s => ({ ...s, agents: d.agents.length })); }).catch(() => {});
    api({ action: 'query', table: 'leads', limit: 1 }).then(d => { if (d.data) setStats(s => ({ ...s, leads: d.data.length })); }).catch(() => {});
    api({ action: 'query', table: 'projects', limit: 1 }).then(d => { if (d.data) setStats(s => ({ ...s, projects: d.data.length })); }).catch(() => {});
    // Load progress from localStorage
    try {
      const saved = localStorage.getItem('learn-progress');
      if (saved) setCompletedSteps(JSON.parse(saved));
    } catch {}
  }, []);

  const toggleStep = (missionId: string, stepIdx: number) => {
    setCompletedSteps(prev => {
      const mission = prev[missionId] || Array(MISSIONS.find(m => m.id === missionId)!.steps.length).fill(false);
      const updated = [...mission];
      updated[stepIdx] = !updated[stepIdx];
      const next = { ...prev, [missionId]: updated };
      try { localStorage.setItem('learn-progress', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const getMissionProgress = (missionId: string): number => {
    const steps = completedSteps[missionId];
    if (!steps) return 0;
    const done = steps.filter(Boolean).length;
    const total = MISSIONS.find(m => m.id === missionId)?.steps.length || 1;
    return Math.round((done / total) * 100);
  };

  const filtered = MISSIONS.filter(m => {
    if (catFilter !== 'Todos' && m.category !== catFilter) return false;
    if (levelFilter !== 'Todos' && m.level !== levelFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || m.tags.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  const totalSteps = MISSIONS.reduce((s, m) => s + m.steps.length, 0);
  const totalCompleted = Object.values(completedSteps).flat().filter(Boolean).length;
  const completedMissions = MISSIONS.filter(m => getMissionProgress(m.id) === 100).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 34px)', overflow: 'hidden' }}>
      {/* Breadcrumb */}
      <div style={{ flexShrink: 0, background: 'rgba(15,22,35,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', height: 48, display: 'flex', alignItems: 'center', padding: '0 1.5rem', gap: 8 }}>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Intranet</span>
        <span style={{ color: '#2d3748' }}>/</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9' }}>Discovery Center</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '0.62rem', color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>
          {stats.agents} agentes · {stats.leads} leads · {stats.projects} proyectos
        </span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem 2rem' }}>
        {/* Hero */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f1f5f9', margin: 0, lineHeight: 1.3 }}>Discovery Center</h1>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '6px 0 0 0', lineHeight: 1.5 }}>
            Misiones guiadas para dominar la intranet SmartConnection — {MISSIONS.length} misiones · {totalSteps} pasos
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: '1.5rem', background: '#111827', borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f1f5f9' }}>Tu progreso</span>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{completedMissions}/{MISSIONS.length} misiones · {totalCompleted}/{totalSteps} pasos</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round((totalCompleted / totalSteps) * 100)}%`, background: 'linear-gradient(90deg, #00e5b0, #22c55e)', borderRadius: 999, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Search */}
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar misiones, tecnologías, funcionalidades..."
          style={{
            width: '100%', maxWidth: 500, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
            padding: '9px 14px', color: '#f1f5f9', fontSize: '0.8rem', outline: 'none',
            fontFamily: "'Inter', system-ui", marginBottom: '1rem',
          }}
        />

        {/* Category filters */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCatFilter(cat)} style={{
              padding: '5px 14px', borderRadius: 8, fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer',
              background: catFilter === cat ? 'rgba(0,229,176,0.12)' : 'rgba(255,255,255,0.03)',
              color: catFilter === cat ? '#00e5b0' : '#94a3b8',
              border: catFilter === cat ? '1px solid rgba(0,229,176,0.2)' : '1px solid rgba(255,255,255,0.06)',
              fontFamily: "'Inter', system-ui",
            }}>{cat}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {['Todos', 'Principiante', 'Intermedio', 'Avanzado'].map(lvl => (
            <button key={lvl} onClick={() => setLevelFilter(lvl)} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: '0.62rem', fontWeight: 600, cursor: 'pointer',
              background: levelFilter === lvl ? 'rgba(139,92,246,0.12)' : 'transparent',
              color: levelFilter === lvl ? '#a78bfa' : '#475569',
              border: levelFilter === lvl ? '1px solid rgba(139,92,246,0.2)' : '1px solid rgba(255,255,255,0.04)',
              fontFamily: "'Inter', system-ui",
            }}>{lvl}</button>
          ))}
        </div>

        {/* Mission Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '0.85rem' }}>
          {filtered.map(mission => {
            const lc = levelColors[mission.level];
            const isExpanded = expanded === mission.id;
            const progress = getMissionProgress(mission.id);
            const stepsCompleted = completedSteps[mission.id] || [];
            return (
              <div key={mission.id}
                style={{
                  background: '#111827', border: `1px solid ${isExpanded ? 'rgba(0,229,176,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 16, overflow: 'hidden', transition: 'all 0.2s',
                  transform: isExpanded ? 'translateY(-2px)' : 'none',
                  boxShadow: isExpanded ? '0 12px 32px rgba(0,0,0,0.3)' : 'none',
                }}>
                {/* Card header */}
                <div onClick={() => setExpanded(isExpanded ? null : mission.id)}
                  style={{ padding: '1.25rem', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: `${lc.bg}`, border: `1px solid ${lc.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
                    }}>{mission.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 3 }}>{mission.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.62rem', color: '#64748b', flexWrap: 'wrap' }}>
                        <span>{mission.category}</span>
                        <span style={{ color: '#334155' }}>·</span>
                        <span>{mission.duration}</span>
                        <span style={{ color: '#334155' }}>·</span>
                        <span>{mission.steps.length} pasos</span>
                        <span style={{
                          fontSize: '0.55rem', fontWeight: 700, padding: '1px 7px', borderRadius: 5,
                          background: lc.bg, color: lc.text, border: `1px solid ${lc.border}`,
                        }}>{mission.level}</span>
                      </div>
                    </div>
                    {progress > 0 && (
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: progress === 100 ? '#22c55e' : '#f59e0b', flexShrink: 0 }}>
                        {progress === 100 ? '✓' : `${progress}%`}
                      </div>
                    )}
                  </div>

                  <p style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{mission.description}</p>

                  {/* Tags */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 10 }}>
                    {mission.tags.map(tag => (
                      <span key={tag} style={{ fontSize: '0.55rem', padding: '2px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.06)' }}>{tag}</span>
                    ))}
                    {mission.relatedExtension && (
                      <span style={{ fontSize: '0.55rem', padding: '2px 8px', borderRadius: 5, background: 'rgba(59,130,246,0.08)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.15)' }}>🔌 {mission.relatedExtension}</span>
                    )}
                  </div>

                  {/* Progress bar mini */}
                  {progress > 0 && progress < 100 && (
                    <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 999, height: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress}%`, background: '#f59e0b', borderRadius: 999 }} />
                    </div>
                  )}
                </div>

                {/* Expanded: Steps */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 1.25rem 1.25rem' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pasos de la misión</div>
                    {mission.steps.map((step, i) => {
                      const isDone = stepsCompleted[i] || false;
                      return (
                        <div key={i} style={{
                          display: 'flex', gap: 10, padding: '10px 0',
                          borderBottom: i < mission.steps.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                          opacity: isDone ? 0.6 : 1,
                        }}>
                          <button onClick={() => toggleStep(mission.id, i)} style={{
                            width: 24, height: 24, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                            background: isDone ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                            border: `2px solid ${isDone ? '#22c55e' : 'rgba(255,255,255,0.1)'}`,
                            color: isDone ? '#22c55e' : '#475569',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.6rem', fontWeight: 700, transition: 'all 0.15s',
                          }}>
                            {isDone ? '✓' : i + 1}
                          </button>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isDone ? '#64748b' : '#e2e8f0', textDecoration: isDone ? 'line-through' : 'none', marginBottom: 2 }}>{step.title}</div>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.5 }}>{step.description}</div>
                            {step.action && !isDone && (
                              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                <button onClick={(e) => { e.stopPropagation(); setPreview({ url: step.action!.href, title: step.title, missionId: mission.id, stepIdx: i }); }} style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  fontSize: '0.62rem', fontWeight: 700, color: '#00e5b0',
                                  padding: '3px 10px', borderRadius: 6, background: 'rgba(0,229,176,0.08)',
                                  border: '1px solid rgba(0,229,176,0.15)', cursor: 'pointer',
                                }}>▶ {step.action!.label}</button>
                                <a href={step.action!.href} style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  fontSize: '0.62rem', fontWeight: 600, color: '#64748b',
                                  padding: '3px 10px', borderRadius: 6, textDecoration: 'none',
                                  border: '1px solid rgba(255,255,255,0.06)',
                                }}>Abrir ↗</a>
                              </div>
                            )}
                            {/* Inline Preview */}
                            {preview && preview.missionId === mission.id && preview.stepIdx === i && (
                              <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,229,176,0.2)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,229,176,0.04)', borderBottom: '1px solid rgba(0,229,176,0.1)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#f1f5f9' }}>{preview.title}</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.58rem', color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>{preview.url}</span>
                                    <button onClick={() => { toggleStep(mission.id, i); setPreview(null); }} style={{
                                      fontSize: '0.58rem', padding: '2px 8px', borderRadius: 5,
                                      background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)',
                                      cursor: 'pointer', fontWeight: 700,
                                    }}>✓ Completar</button>
                                    <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                                  </div>
                                </div>
                                <iframe src={preview.url} style={{ width: '100%', height: 400, border: 'none', background: '#0a0d14' }} title={preview.title} />
                              </div>
                            )}
                          </div>
                          <span style={{ fontSize: '0.6rem', color: '#475569', flexShrink: 0, marginTop: 2 }}>{step.duration}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#475569', fontSize: '0.8rem' }}>
            No se encontraron misiones con esos filtros
          </div>
        )}
      </div>
    </div>
  );
}
