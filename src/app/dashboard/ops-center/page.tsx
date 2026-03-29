'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

interface ActivityEvent {
  id: string;
  type: 'kaizen' | 'andon' | 'deploy' | 'agent' | 'fix';
  agent: string;
  message: string;
  timestamp: string;
  color: string;
}

interface KaizenAudit {
  id: string;
  audit_number: number;
  score_global: string;
  total_bytes: number;
  total_tokens: number;
  total_files: number;
  criticals: string[];
  improvements: string[];
  positives: string[];
  top_actions: string[];
  scores_by_area: Record<string, string>;
  fixes_applied: number;
  source: string;
  created_at: string;
}

interface AndonSignal {
  id: string;
  project: string;
  area: string;
  status: 'green' | 'yellow' | 'red';
  score: string;
  detail: string;
  last_checked: string;
}

interface OodaDecision {
  id: string;
  title: string;
  observe: string;
  orient: string;
  decide: string;
  act: string;
  result: string;
  project: string;
  agent: string;
  status: string;
  created_at: string;
}

const SCORE_COLORS: Record<string, string> = {
  A: '#22c55e', B: '#00e5b0', C: '#f59e0b', D: '#f97316', F: '#ef4444',
};
const STATUS_COLORS: Record<string, string> = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444' };
const STATUS_ICONS: Record<string, string> = { green: '●', yellow: '▲', red: '■' };

// ═══ CLAUDE CODE TOOLKIT — ~55 features/commands ═══
type ToolStatus = 'adopted' | 'available' | 'pending' | 'unavailable';
type ToolCategory = 'session' | 'model' | 'navigation' | 'memory' | 'git' | 'automation' | 'mcp' | 'voice' | 'testing' | 'agent' | 'security' | 'plugins';
type ToolAgent = 'hoku' | 'panchita' | 'camilita' | 'arielito' | 'sergito' | 'all' | 'guillermo';

interface ClaudeTool {
  name: string;
  command: string;
  category: ToolCategory;
  status: ToolStatus;
  agent: ToolAgent;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

const CLAUDE_TOOLS: ClaudeTool[] = [
  // Session & Context
  { name: 'Compact', command: '/compact', category: 'session', status: 'adopted', agent: 'all', description: 'Compactar contexto reteniendo info clave', impact: 'high' },
  { name: 'Clear', command: '/clear', category: 'session', status: 'adopted', agent: 'all', description: 'Limpiar conversación completa', impact: 'medium' },
  { name: 'Fork', command: '/fork', category: 'session', status: 'available', agent: 'sergito', description: 'Copiar conversación en branch para experimentar', impact: 'high' },
  { name: 'Rewind', command: '/rewind', category: 'session', status: 'available', agent: 'hoku', description: 'Deshacer cambios de código y conversación', impact: 'high' },
  { name: 'Resume', command: 'claude --resume', category: 'session', status: 'adopted', agent: 'all', description: 'Retomar sesión anterior', impact: 'medium' },
  { name: 'Bare Mode', command: '--bare', category: 'session', status: 'available', agent: 'hoku', description: 'Modo mínimo para scripts sin hooks ni plugins', impact: 'low' },

  // Model & Performance
  { name: 'Model Switch', command: '/model', category: 'model', status: 'adopted', agent: 'all', description: 'Cambiar modelo (Opus/Sonnet/Haiku)', impact: 'high' },
  { name: 'Fast Mode', command: '/fast', category: 'model', status: 'adopted', agent: 'all', description: 'Toggle salida rápida (mismo modelo)', impact: 'medium' },
  { name: '1M Context', command: 'Opus 4.6 1M', category: 'model', status: 'adopted', agent: 'all', description: 'Ventana de 1M tokens para codebases grandes', impact: 'high' },

  // Memory
  { name: 'Auto Memory', command: 'auto-memory', category: 'memory', status: 'adopted', agent: 'arielito', description: 'Memorias persistentes entre sesiones', impact: 'high' },
  { name: 'Memory Directory', command: 'autoMemoryDirectory', category: 'memory', status: 'available', agent: 'arielito', description: 'Directorio custom para memorias', impact: 'medium' },
  { name: 'Dream', command: '/dream', category: 'memory', status: 'pending', agent: 'arielito', description: 'Consolidación automática de memorias (Auto-Dream)', impact: 'high' },
  { name: 'Auto-Dream', command: 'auto-dream', category: 'memory', status: 'pending', agent: 'arielito', description: 'Limpieza de memorias entre sesiones', impact: 'high' },

  // Navigation & Files
  { name: 'Read', command: 'Read', category: 'navigation', status: 'adopted', agent: 'all', description: 'Leer archivos del filesystem', impact: 'high' },
  { name: 'Edit', command: 'Edit', category: 'navigation', status: 'adopted', agent: 'hoku', description: 'Editar archivos con reemplazo exacto', impact: 'high' },
  { name: 'Write', command: 'Write', category: 'navigation', status: 'adopted', agent: 'hoku', description: 'Crear archivos nuevos', impact: 'high' },
  { name: 'Glob', command: 'Glob', category: 'navigation', status: 'adopted', agent: 'all', description: 'Buscar archivos por patrón', impact: 'medium' },
  { name: 'Grep', command: 'Grep', category: 'navigation', status: 'adopted', agent: 'all', description: 'Buscar contenido en archivos', impact: 'medium' },
  { name: 'Notebook Edit', command: 'NotebookEdit', category: 'navigation', status: 'available', agent: 'hoku', description: 'Editar notebooks Jupyter', impact: 'low' },

  // Git & GitHub
  { name: 'Git Status', command: 'git status', category: 'git', status: 'adopted', agent: 'hoku', description: 'Ver estado del repositorio', impact: 'high' },
  { name: 'Git Commit', command: '/commit', category: 'git', status: 'adopted', agent: 'hoku', description: 'Commit con mensaje descriptivo', impact: 'high' },
  { name: 'PR Create', command: 'gh pr create', category: 'git', status: 'adopted', agent: 'hoku', description: 'Crear pull request', impact: 'high' },
  { name: 'GitHub App', command: '/install-github-app', category: 'git', status: 'available', agent: 'hoku', description: 'Claude participa en PRs via GitHub Actions', impact: 'medium' },

  // Automation & Hooks
  { name: 'PreToolUse Hook', command: 'hooks.PreToolUse', category: 'automation', status: 'adopted', agent: 'arielito', description: 'Bloquear acciones antes de ejecutar (Poka-Yoke)', impact: 'high' },
  { name: 'PostToolUse Hook', command: 'hooks.PostToolUse', category: 'automation', status: 'available', agent: 'hoku', description: 'Ejecutar checks después de herramientas', impact: 'medium' },
  { name: 'Stop Hook', command: 'hooks.Stop', category: 'automation', status: 'adopted', agent: 'all', description: 'Notificación al completar tarea', impact: 'medium' },
  { name: 'Notification Hook', command: 'hooks.Notification', category: 'automation', status: 'adopted', agent: 'all', description: 'Alerta macOS al necesitar atención', impact: 'medium' },
  { name: 'SessionStart Hook', command: 'hooks.SessionStart', category: 'automation', status: 'available', agent: 'all', description: 'Inyectar contexto al iniciar sesión', impact: 'medium' },
  { name: 'PostCompact Hook', command: 'hooks.PostCompact', category: 'automation', status: 'available', agent: 'all', description: 'Acción después de compactar contexto', impact: 'low' },
  { name: 'FileChanged Hook', command: 'hooks.FileChanged', category: 'automation', status: 'available', agent: 'hoku', description: 'Reaccionar cuando un archivo cambia', impact: 'medium' },
  { name: 'HTTP Hooks', command: 'hooks.http', category: 'automation', status: 'available', agent: 'hoku', description: 'Webhooks a servicios externos', impact: 'medium' },
  { name: 'Prompt Hooks', command: 'hooks.prompt', category: 'automation', status: 'available', agent: 'arielito', description: 'Evaluación LLM como hook', impact: 'medium' },
  { name: 'Loop', command: '/loop', category: 'automation', status: 'available', agent: 'camilita', description: 'Ejecutar tarea en intervalo recurrente', impact: 'high' },
  { name: 'Batch', command: '/batch', category: 'automation', status: 'available', agent: 'hoku', description: 'Paralelizar tareas en worktrees aislados', impact: 'high' },
  { name: 'Remote Triggers', command: 'RemoteTrigger', category: 'automation', status: 'adopted', agent: 'arielito', description: 'Tareas programadas (Kaizen, Ops Center, Monitor)', impact: 'high' },
  { name: 'Cron Schedule', command: '/schedule', category: 'automation', status: 'adopted', agent: 'arielito', description: 'Crear triggers con schedule cron', impact: 'high' },

  // Voice & Input
  { name: 'Voice Mode', command: '/voice', category: 'voice', status: 'available', agent: 'guillermo', description: 'Push-to-talk con spacebar', impact: 'medium' },
  { name: 'Dictation', command: 'dictation', category: 'voice', status: 'available', agent: 'guillermo', description: 'Dictar instrucciones por voz', impact: 'medium' },

  // Agent & Skills
  { name: 'Skill Hoku', command: '/hoku', category: 'agent', status: 'adopted', agent: 'hoku', description: 'Invocar agente producción full-stack', impact: 'high' },
  { name: 'Skill Panchita', command: '/panchita', category: 'agent', status: 'adopted', agent: 'panchita', description: 'Invocar agente arquitecta y diseñadora', impact: 'high' },
  { name: 'Skill Camilita', command: '/camilita', category: 'agent', status: 'adopted', agent: 'camilita', description: 'Invocar agente QA policía', impact: 'high' },
  { name: 'Skill Arielito', command: '/arielito', category: 'agent', status: 'adopted', agent: 'arielito', description: 'Invocar agente auditor técnico', impact: 'high' },
  { name: 'Skill Sergito', command: '/sergito', category: 'agent', status: 'adopted', agent: 'sergito', description: 'Invocar agente pensador divergente', impact: 'high' },
  { name: 'Subagent Explore', command: 'Agent(Explore)', category: 'agent', status: 'adopted', agent: 'all', description: 'Subagente para explorar codebases', impact: 'medium' },
  { name: 'Subagent Plan', command: 'Agent(Plan)', category: 'agent', status: 'adopted', agent: 'panchita', description: 'Subagente para planificar implementación', impact: 'medium' },
  { name: 'Simplify', command: '/simplify', category: 'agent', status: 'available', agent: 'arielito', description: 'Review de código: reuso, calidad, eficiencia', impact: 'medium' },
  { name: 'Debug', command: '/debug', category: 'agent', status: 'available', agent: 'hoku', description: 'Skill de debugging asistido', impact: 'medium' },
  { name: 'Claude API', command: '/claude-api', category: 'agent', status: 'available', agent: 'hoku', description: 'Construir apps con Claude API/SDK', impact: 'medium' },

  // MCP & Plugins
  { name: 'Chrome Control', command: 'mcp:chrome', category: 'mcp', status: 'adopted', agent: 'camilita', description: 'Automatizar Chrome (scraping, testing)', impact: 'high' },
  { name: 'Mac Control', command: 'mcp:osascript', category: 'mcp', status: 'adopted', agent: 'all', description: 'Controlar macOS via AppleScript', impact: 'medium' },
  { name: 'Figma', command: 'mcp:figma', category: 'mcp', status: 'adopted', agent: 'panchita', description: 'Acceso a diseños de Figma', impact: 'medium' },
  { name: 'PDF Tools', command: 'mcp:pdf', category: 'mcp', status: 'adopted', agent: 'all', description: 'Llenar, analizar y extraer PDFs', impact: 'medium' },
  { name: 'Plugin Marketplace', command: '/plugin', category: 'plugins', status: 'available', agent: 'all', description: 'Marketplace de plugins Claude Code', impact: 'medium' },
  { name: 'Dispatch', command: 'Dispatch', category: 'plugins', status: 'unavailable', agent: 'guillermo', description: 'Control remoto desde móvil (bug #40415)', impact: 'high' },
  { name: 'Computer Use', command: 'computer-use', category: 'plugins', status: 'adopted', agent: 'camilita', description: 'Claude controla pantalla, clicks, navegación', impact: 'high' },

  // Security
  { name: 'Permission Allow', command: 'permissions.allow', category: 'security', status: 'adopted', agent: 'all', description: 'Whitelist de herramientas automáticas', impact: 'high' },
  { name: 'Channels Relay', command: '--channels', category: 'security', status: 'available', agent: 'guillermo', description: 'Relay de permisos al celular', impact: 'medium' },
];

const CATEGORY_LABELS: Record<ToolCategory, { label: string; icon: string }> = {
  session: { label: 'Sesión', icon: '💬' },
  model: { label: 'Modelo', icon: '🧠' },
  navigation: { label: 'Archivos', icon: '📁' },
  memory: { label: 'Memoria', icon: '💾' },
  git: { label: 'Git & GitHub', icon: '🔀' },
  automation: { label: 'Automatización', icon: '⚙️' },
  voice: { label: 'Voz', icon: '🎤' },
  agent: { label: 'Agentes & Skills', icon: '🤖' },
  mcp: { label: 'MCP Servers', icon: '🔌' },
  plugins: { label: 'Plugins', icon: '🧩' },
  testing: { label: 'Testing', icon: '🧪' },
  security: { label: 'Seguridad', icon: '🔒' },
};

const STATUS_LABELS: Record<ToolStatus, { label: string; color: string; icon: string }> = {
  adopted: { label: 'Adoptado', color: '#22c55e', icon: '✅' },
  available: { label: 'Disponible', color: '#3b82f6', icon: '🔵' },
  pending: { label: 'Pendiente', color: '#f59e0b', icon: '⏳' },
  unavailable: { label: 'No disponible', color: '#ef4444', icon: '🔴' },
};

const AGENT_LABELS: Record<ToolAgent, { label: string; color: string; icon: string }> = {
  hoku: { label: 'Hoku', color: '#ff6b6b', icon: '🐾' },
  panchita: { label: 'Panchita', color: '#d97706', icon: '🐕' },
  camilita: { label: 'Camilita', color: '#ec4899', icon: '👩' },
  arielito: { label: 'Arielito', color: '#3b82f6', icon: '🔍' },
  sergito: { label: 'Sergito', color: '#a855f7', icon: '⚡' },
  all: { label: 'Todos', color: '#00e5b0', icon: '👥' },
  guillermo: { label: 'Guillermo', color: '#94a3b8', icon: '👤' },
};

const TEAM = [
  {
    agent: 'Panchita', icon: '🐕', color: '#d97706',
    role: 'Arquitecta & Diseñadora', breed: 'Kiltro café claro',
    desc: 'Investigación, análisis funcional, diseño y handoff. Nunca implementa código de producción.',
    methods: ['Design Thinking', 'Jobs to Be Done', 'Wardley Mapping'],
    delivers: ['Benchmark competitivo', 'User stories', 'Maqueta HTML', 'Modelo de datos', 'Contratos API'],
    handoff: 'Hoku',
  },
  {
    agent: 'Hoku', icon: '🐾', color: '#ff6b6b',
    role: 'Producción Full-Stack', breed: 'Westie blanco',
    desc: 'Recibe handoff de Panchita. Implementa, testea, code review propio y deploya.',
    methods: ['Poka-Yoke', 'Jidoka', 'Canary Deploy'],
    delivers: ['Código producción', 'Tests', 'Deploy con health check', 'Performance >90 Lighthouse'],
    handoff: 'Camilita + Arielito',
  },
  {
    agent: 'Camilita', icon: '👩', color: '#ec4899',
    role: 'QA Policía', breed: 'Humana',
    desc: 'Testea como usuario real que NO sabe programar. Reporta bugs, confusiones y fricciones.',
    methods: ['Shift Left', 'Chaos Engineering', 'Exploratory Testing'],
    delivers: ['Bugs con severidad', 'Test por personas', 'Regresión acumulativa', 'Validación specs'],
    handoff: 'Hoku (bugs) + Panchita (UX)',
  },
  {
    agent: 'Arielito', icon: '🔍', color: '#3b82f6',
    role: 'Auditor Principal Engineer', breed: 'Humano',
    desc: 'Mira por debajo del capó: código, arquitectura, seguridad, rendimiento, dependencias.',
    methods: ['Kaizen', 'Andon', 'OODA', 'Gemba', 'Six Sigma'],
    delivers: ['Scoring A-F', 'Deuda técnica cuantificada', 'Top 3 acciones', 'Señales Andon'],
    handoff: 'Hoku (fixes) + Panchita (specs)',
  },
  {
    agent: 'Sergito', icon: '⚡', color: '#a855f7',
    role: 'Pensador Divergente', breed: 'Humano',
    desc: 'Conecta dominios que nadie relacionaría. Propone cosas que suenan absurdas hasta que dejan de sonar absurdas.',
    methods: ['TRIZ', 'SCAMPER', 'First Principles', 'Blue Ocean'],
    delivers: ['Reframe del problema', 'Ideas divergentes', 'Supuestos cuestionados', 'Visión futuro'],
    handoff: 'Panchita (evalúa viabilidad)',
  },
];

export default function OpsCenterPage() {
  const [tab, setTab] = useState<'andon' | 'kaizen' | 'ooda' | 'methods' | 'toolkit'>('andon');
  const [kaizen, setKaizen] = useState<KaizenAudit[]>([]);
  const [andon, setAndon] = useState<AndonSignal[]>([]);
  const [ooda, setOoda] = useState<OodaDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOoda, setExpandedOoda] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Toolkit filters
  const [tkCategory, setTkCategory] = useState<ToolCategory | 'all'>('all');
  const [tkStatus, setTkStatus] = useState<ToolStatus | 'all'>('all');
  const [tkAgent, setTkAgent] = useState<ToolAgent | 'all'>('all');
  const [tkSearch, setTkSearch] = useState('');
  // Live feed & interactivity
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);
  const [showFeed, setShowFeed] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const runAgent = async (agent: string) => {
    setRunning(agent);
    try {
      const res = await fetch('/api/ops-center/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent }),
      });
      if (res.ok) {
        showToast(`${agent === 'all' ? 'Todos los agentes' : agent} ejecutado`);
        load();
      } else {
        showToast('Error ejecutando auditoría');
      }
    } catch { showToast('Error de conexión'); }
    setRunning(null);
  };

  const sendEmail = async () => {
    setSendingEmail(true);
    try {
      const res = await fetch('/api/ops-center/email', { method: 'POST' });
      if (res.ok) showToast('Reporte enviado a guillermo.gonzalez@smconnection.cl');
      else showToast('Error enviando email');
    } catch { showToast('Error de conexión'); }
    setSendingEmail(false);
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/ops-center?section=all');
      if (res.ok) {
        const data = await res.json();
        setKaizen(data.kaizen || []);
        setAndon(data.andon || []);
        setOoda(data.ooda || []);
      }
    } catch (err) { console.error('Error cargando Ops Center:', err); }
    setLoading(false);
  }, []);

  // Build activity feed from data
  const buildFeed = useCallback((k: KaizenAudit[], a: AndonSignal[], o: OodaDecision[]) => {
    const events: ActivityEvent[] = [];
    k.slice(0, 5).forEach(audit => {
      events.push({
        id: `k-${audit.id}`, type: 'kaizen', agent: 'Arielito',
        message: `Kaizen #${audit.audit_number} — Score ${audit.score_global} — ${audit.fixes_applied} fixes`,
        timestamp: audit.created_at, color: '#3b82f6',
      });
    });
    a.filter(s => s.status === 'red').forEach(signal => {
      events.push({
        id: `a-${signal.id}`, type: 'andon', agent: 'Sistema',
        message: `🔴 ${signal.project}/${signal.area}: ${signal.detail}`,
        timestamp: signal.last_checked, color: '#ef4444',
      });
    });
    a.filter(s => s.status === 'yellow').forEach(signal => {
      events.push({
        id: `ay-${signal.id}`, type: 'andon', agent: 'Sistema',
        message: `🟡 ${signal.project}/${signal.area}: ${signal.detail}`,
        timestamp: signal.last_checked, color: '#f59e0b',
      });
    });
    o.slice(0, 3).forEach(d => {
      events.push({
        id: `o-${d.id}`, type: 'agent', agent: d.agent || 'Equipo',
        message: `OODA: ${d.title}`,
        timestamp: d.created_at, color: '#a855f7',
      });
    });
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setActivity(events.slice(0, 15));
  }, []);

  // Resolve andon signal
  const resolveAndon = async (signal: AndonSignal) => {
    setResolving(signal.id);
    try {
      await fetch('/api/ops-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'andon_update',
          project: signal.project,
          area: signal.area,
          status: 'green',
          score: 'A',
          detail: `Resuelto manualmente — ${new Date().toLocaleString('es-CL')}`,
        }),
      });
      showToast(`${signal.project}/${signal.area} marcado como resuelto`);
      load();
    } catch { showToast('Error resolviendo señal'); }
    setResolving(null);
  };

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30s
  useEffect(() => {
    pollRef.current = setInterval(load, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  // Update feed when data changes
  useEffect(() => { buildFeed(kaizen, andon, ooda); }, [kaizen, andon, ooda, buildFeed]);

  const scoreColor = (s: string) => SCORE_COLORS[s] || '#64748b';

  // ═══ Agrupar andon por proyecto ═══
  const andonByProject: Record<string, AndonSignal[]> = {};
  andon.forEach(s => {
    if (!andonByProject[s.project]) andonByProject[s.project] = [];
    andonByProject[s.project].push(s);
  });

  const projectStatus = (signals: AndonSignal[]) => {
    if (signals.some(s => s.status === 'red')) return 'red';
    if (signals.some(s => s.status === 'yellow')) return 'yellow';
    return 'green';
  };

  const tabs = [
    { id: 'andon' as const, label: 'Andon Board', icon: '🚦' },
    { id: 'kaizen' as const, label: 'Kaizen', icon: '📊' },
    { id: 'ooda' as const, label: 'OODA Log', icon: '🔄' },
    { id: 'methods' as const, label: 'Equipo', icon: '🧠' },
    { id: 'toolkit' as const, label: 'Toolkit', icon: '🛠️' },
  ];

  // Toolkit computed
  const filteredTools = CLAUDE_TOOLS.filter(t => {
    if (tkCategory !== 'all' && t.category !== tkCategory) return false;
    if (tkStatus !== 'all' && t.status !== tkStatus) return false;
    if (tkAgent !== 'all' && t.agent !== tkAgent) return false;
    if (tkSearch && !t.name.toLowerCase().includes(tkSearch.toLowerCase()) && !t.command.toLowerCase().includes(tkSearch.toLowerCase()) && !t.description.toLowerCase().includes(tkSearch.toLowerCase())) return false;
    return true;
  });
  const adoptedCount = CLAUDE_TOOLS.filter(t => t.status === 'adopted').length;
  const availableCount = CLAUDE_TOOLS.filter(t => t.status === 'available').length;
  const pendingCount = CLAUDE_TOOLS.filter(t => t.status === 'pending').length;
  const unavailableCount = CLAUDE_TOOLS.filter(t => t.status === 'unavailable').length;
  const adoptionRate = Math.round((adoptedCount / CLAUDE_TOOLS.length) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 34px)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        flexShrink: 0, background: 'rgba(15,22,35,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ height: 48, display: 'flex', alignItems: 'center', padding: '0 1.5rem', fontSize: '0.82rem', color: '#94a3b8' }}>
          <span style={{ color: '#fff', fontWeight: 700 }}>Ops Center</span>
          <span style={{ margin: '0 10px', color: '#334155' }}>—</span>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Kaizen + Andon + OODA + Metodologías</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {/* Run per agent */}
            {TEAM.map(m => (
              <button key={m.agent} onClick={() => runAgent(m.agent.toLowerCase())} disabled={running !== null}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', cursor: running ? 'wait' : 'pointer',
                  background: running === m.agent.toLowerCase() ? `${m.color}25` : 'rgba(255,255,255,0.04)',
                  color: running === m.agent.toLowerCase() ? m.color : '#64748b',
                  fontSize: '0.65rem', fontWeight: 700, transition: 'all 0.15s',
                  opacity: running && running !== m.agent.toLowerCase() ? 0.4 : 1,
                }} title={`Ejecutar ${m.agent}`}>
                {running === m.agent.toLowerCase() ? '...' : m.icon}
              </button>
            ))}
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', margin: '0 2px', alignSelf: 'center' }} />
            {/* Run ALL */}
            <button onClick={() => runAgent('all')} disabled={running !== null}
              style={{
                padding: '4px 12px', borderRadius: 6, border: 'none', cursor: running ? 'wait' : 'pointer',
                background: running === 'all' ? 'rgba(0,229,176,0.15)' : 'rgba(0,229,176,0.08)',
                color: '#00e5b0', fontSize: '0.65rem', fontWeight: 700,
                opacity: running && running !== 'all' ? 0.4 : 1,
              }}>
              {running === 'all' ? 'Ejecutando...' : '▶ Todos'}
            </button>
            {/* Email */}
            <button onClick={sendEmail} disabled={sendingEmail}
              style={{
                padding: '4px 12px', borderRadius: 6, border: 'none', cursor: sendingEmail ? 'wait' : 'pointer',
                background: 'rgba(139,92,246,0.08)', color: '#a78bfa',
                fontSize: '0.65rem', fontWeight: 700,
              }}>
              {sendingEmail ? 'Enviando...' : '✉ Email'}
            </button>
            {/* Refresh */}
            <button onClick={load} style={{
              padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: '0.65rem', fontWeight: 600,
            }}>↻</button>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '0 1.5rem 8px' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: tab === t.id ? 'rgba(0,229,176,0.12)' : 'rgba(255,255,255,0.03)',
              color: tab === t.id ? '#00e5b0' : '#64748b',
              fontWeight: 600, fontSize: '0.75rem', transition: 'all 0.15s',
              borderWidth: 1, borderStyle: 'solid',
              borderColor: tab === t.id ? 'rgba(0,229,176,0.25)' : 'transparent',
            }}>{t.icon} {t.label}</button>
          ))}
        </div>
      </div>

      {/* Content + Feed sidebar */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>Cargando Ops Center...</div>
        ) : (
          <>
            {/* ═══ ANDON BOARD ═══ */}
            {tab === 'andon' && (
              <div>
                {Object.keys(andonByProject).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>🚦</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>Andon Board</div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
                      Señales visuales de estado por proyecto y area.
                      Se actualiza automaticamente con cada Kaizen de Arielito.
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 16 }}>
                      Proximo Kaizen automatico: cada 3 dias a las 9am Chile
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                    {Object.entries(andonByProject).map(([project, signals]) => {
                      const pStatus = projectStatus(signals);
                      return (
                        <div key={project} style={{
                          borderRadius: 14, padding: '20px 22px',
                          background: 'rgba(255,255,255,0.02)',
                          border: `1px solid ${STATUS_COLORS[pStatus]}25`,
                          transition: 'all 0.3s',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                            <span style={{ fontSize: '1.2rem', color: STATUS_COLORS[pStatus] }}>{STATUS_ICONS[pStatus]}</span>
                            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>{project}</span>
                            <span style={{
                              marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 700, padding: '2px 10px', borderRadius: 10,
                              background: `${STATUS_COLORS[pStatus]}15`, color: STATUS_COLORS[pStatus],
                            }}>{pStatus.toUpperCase()}</span>
                          </div>
                          {signals.map(s => (
                            <div key={s.id} style={{
                              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 4,
                              borderRadius: 8, background: 'rgba(255,255,255,0.02)',
                            }}>
                              <span style={{ color: STATUS_COLORS[s.status], fontSize: '0.7rem' }}>{STATUS_ICONS[s.status]}</span>
                              <span style={{ fontSize: '0.78rem', color: '#cbd5e1', flex: 1 }}>{s.area}</span>
                              <span style={{ fontSize: '0.6rem', color: '#475569', marginRight: 4 }}>{s.detail}</span>
                              <span style={{
                                fontSize: '0.65rem', fontWeight: 700, color: scoreColor(s.score),
                                background: `${scoreColor(s.score)}15`, padding: '1px 8px', borderRadius: 6,
                              }}>{s.score}</span>
                              {s.status !== 'green' && (
                                <button onClick={(e) => { e.stopPropagation(); resolveAndon(s); }}
                                  disabled={resolving === s.id}
                                  style={{
                                    padding: '2px 8px', borderRadius: 5, border: 'none', cursor: resolving === s.id ? 'wait' : 'pointer',
                                    background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                                    fontSize: '0.6rem', fontWeight: 700, transition: 'all 0.15s',
                                  }}>
                                  {resolving === s.id ? '...' : '✓ Resolver'}
                                </button>
                              )}
                            </div>
                          ))}
                          <div style={{ fontSize: '0.6rem', color: '#475569', marginTop: 8 }}>
                            Ultimo check: {new Date(signals[0]?.last_checked).toLocaleDateString('es-CL')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ═══ KAIZEN DASHBOARD ═══ */}
            {tab === 'kaizen' && (
              <div>
                {kaizen.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>📊</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>Kaizen Dashboard</div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
                      Historial de auditorias del sistema. Arielito ejecuta un Kaizen automatico
                      cada 3 dias, auditando CLAUDE.md, agentes y memorias.
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Latest audit hero */}
                    {kaizen[0] && (() => {
                      const latest = kaizen[0];
                      return (
                        <div style={{
                          borderRadius: 16, padding: '24px 28px', marginBottom: 20,
                          background: `linear-gradient(135deg, ${scoreColor(latest.score_global)}08, rgba(255,255,255,0.02))`,
                          border: `1px solid ${scoreColor(latest.score_global)}20`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <span style={{
                              fontSize: '2rem', fontWeight: 900, color: scoreColor(latest.score_global),
                              textShadow: `0 0 30px ${scoreColor(latest.score_global)}40`,
                            }}>{latest.score_global}</span>
                            <div>
                              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>
                                Kaizen #{latest.audit_number}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                {new Date(latest.created_at).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                {' · '}{latest.source}
                              </div>
                            </div>
                            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                {(latest.total_bytes / 1024).toFixed(1)} KB · ~{latest.total_tokens.toLocaleString()} tokens · {latest.total_files} archivos
                              </div>
                              <div style={{ fontSize: '0.65rem', color: '#22c55e', marginTop: 2 }}>
                                {latest.fixes_applied} fixes aplicados
                              </div>
                            </div>
                          </div>

                          {/* Scores by area */}
                          {Object.keys(latest.scores_by_area || {}).length > 0 && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                              {Object.entries(latest.scores_by_area).map(([area, score]) => (
                                <span key={area} style={{
                                  padding: '4px 12px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 600,
                                  background: `${scoreColor(score)}12`, color: scoreColor(score),
                                  border: `1px solid ${scoreColor(score)}20`,
                                }}>{area}: {score}</span>
                              ))}
                            </div>
                          )}

                          {/* Top actions */}
                          {(latest.top_actions || []).length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>Top acciones</div>
                              {latest.top_actions.map((a, i) => (
                                <div key={i} style={{ fontSize: '0.78rem', color: '#cbd5e1', padding: '4px 0', display: 'flex', gap: 8 }}>
                                  <span style={{ color: '#00e5b0', fontWeight: 700 }}>{i + 1}.</span> {a}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Score Trend */}
                    {kaizen.length > 1 && (
                      <div style={{
                        marginBottom: 20, padding: '16px 20px', borderRadius: 12,
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                      }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: 12 }}>Tendencia de Score</div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
                          {[...kaizen].reverse().slice(-12).map((k, i) => {
                            const scoreValue: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, F: 1 };
                            const h = ((scoreValue[k.score_global] || 1) / 5) * 100;
                            return (
                              <div key={k.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontSize: '0.55rem', color: scoreColor(k.score_global), fontWeight: 700 }}>{k.score_global}</span>
                                <div style={{
                                  width: '100%', height: `${h}%`, minHeight: 8, borderRadius: 4,
                                  background: `linear-gradient(180deg, ${scoreColor(k.score_global)}, ${scoreColor(k.score_global)}40)`,
                                  transition: 'height 0.5s ease',
                                }} title={`#${k.audit_number} — ${new Date(k.created_at).toLocaleDateString('es-CL')}`} />
                                <span style={{ fontSize: '0.5rem', color: '#475569' }}>#{k.audit_number}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                          <span style={{ fontSize: '0.6rem', color: '#475569' }}>
                            {(() => {
                              const scores: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, F: 1 };
                              const recent = kaizen.slice(0, 3).reduce((s, k) => s + (scores[k.score_global] || 0), 0) / Math.min(3, kaizen.length);
                              const older = kaizen.slice(3, 6).reduce((s, k) => s + (scores[k.score_global] || 0), 0) / Math.min(3, kaizen.slice(3, 6).length || 1);
                              if (recent > older) return '📈 Mejorando';
                              if (recent < older) return '📉 Deteriorando';
                              return '📊 Estable';
                            })()}
                          </span>
                          <span style={{ fontSize: '0.6rem', color: '#475569' }}>{kaizen.length} auditorías total</span>
                        </div>
                      </div>
                    )}

                    {/* History */}
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>Historial</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {kaizen.slice(1).map(k => (
                        <div key={k.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                          borderRadius: 10, background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.04)',
                        }}>
                          <span style={{
                            fontSize: '1.1rem', fontWeight: 800, color: scoreColor(k.score_global), width: 30,
                          }}>{k.score_global}</span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0' }}>#{k.audit_number}</span>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', flex: 1 }}>
                            {new Date(k.created_at).toLocaleDateString('es-CL')} · {k.source}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#475569' }}>
                            {(k.total_bytes / 1024).toFixed(1)} KB · {k.fixes_applied} fixes
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ OODA LOG ═══ */}
            {tab === 'ooda' && (
              <div>
                {ooda.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔄</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>OODA Decision Log</div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
                      Observe → Orient → Decide → Act. Registro de decisiones tecnicas
                      con contexto completo para aprender de cada una.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ooda.map(d => (
                      <div key={d.id} onClick={() => setExpandedOoda(expandedOoda === d.id ? null : d.id)} style={{
                        borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
                        background: expandedOoda === d.id ? 'rgba(0,229,176,0.04)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${expandedOoda === d.id ? 'rgba(0,229,176,0.15)' : 'rgba(255,255,255,0.04)'}`,
                        transition: 'all 0.2s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0', flex: 1 }}>{d.title}</span>
                          {d.project && <span style={{ fontSize: '0.6rem', color: '#64748b', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 6 }}>{d.project}</span>}
                          {d.agent && <span style={{ fontSize: '0.6rem', color: '#00e5b0', background: 'rgba(0,229,176,0.08)', padding: '2px 8px', borderRadius: 6 }}>{d.agent}</span>}
                          <span style={{ fontSize: '0.6rem', color: '#475569' }}>
                            {new Date(d.created_at).toLocaleDateString('es-CL')}
                          </span>
                          <span style={{ color: '#64748b', fontSize: '0.7rem' }}>{expandedOoda === d.id ? '▼' : '▶'}</span>
                        </div>
                        {expandedOoda === d.id && (
                          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {[
                              { label: 'Observe', value: d.observe, color: '#3b82f6' },
                              { label: 'Orient', value: d.orient, color: '#8b5cf6' },
                              { label: 'Decide', value: d.decide, color: '#f59e0b' },
                              { label: 'Act', value: d.act, color: '#22c55e' },
                            ].map(step => (
                              <div key={step.label} style={{
                                padding: '10px 12px', borderRadius: 8,
                                background: `${step.color}08`, borderLeft: `3px solid ${step.color}`,
                              }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: step.color, marginBottom: 4 }}>{step.label}</div>
                                <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.5 }}>{step.value || '—'}</div>
                              </div>
                            ))}
                            {d.result && (
                              <div style={{
                                gridColumn: '1 / -1', padding: '10px 12px', borderRadius: 8,
                                background: 'rgba(34,197,94,0.06)', borderLeft: '3px solid #22c55e',
                              }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#22c55e', marginBottom: 4 }}>Resultado</div>
                                <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.5 }}>{d.result}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ EQUIPO SMART CONNECTION ═══ */}
            {tab === 'methods' && (
              <div>
                {/* Flujo del equipo */}
                <div style={{
                  textAlign: 'center', marginBottom: 28, padding: '20px 24px', borderRadius: 14,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>
                    Flujo del Equipo Smart Connection
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    flexWrap: 'wrap', fontSize: '0.78rem', fontWeight: 600,
                  }}>
                    <span style={{ color: '#d97706' }}>🐕 Panchita</span>
                    <span style={{ color: '#475569' }}>diseña →</span>
                    <span style={{ color: '#ff6b6b' }}>🐾 Hoku</span>
                    <span style={{ color: '#475569' }}>implementa →</span>
                    <span style={{ color: '#ec4899' }}>👩 Camilita</span>
                    <span style={{ color: '#475569' }}>testea +</span>
                    <span style={{ color: '#3b82f6' }}>🔍 Arielito</span>
                    <span style={{ color: '#475569' }}>audita</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 8 }}>
                    ⚡ Sergito salta entre todos con ideas divergentes y reframing
                  </div>
                </div>

                {/* Cards del equipo */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                  {TEAM.map(m => (
                    <div key={m.agent} style={{
                      borderRadius: 14, overflow: 'hidden',
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid ${m.color}20`,
                      transition: 'all 0.3s',
                    }}>
                      {/* Card header */}
                      <div style={{
                        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
                        background: `${m.color}08`, borderBottom: `1px solid ${m.color}15`,
                      }}>
                        <span style={{ fontSize: '1.8rem' }}>{m.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '1rem', fontWeight: 700, color: m.color }}>{m.agent}</span>
                            <span style={{
                              fontSize: '0.55rem', fontWeight: 600, padding: '2px 8px', borderRadius: 8,
                              background: `${m.color}12`, color: m.color,
                            }}>{m.breed}</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', marginTop: 2 }}>{m.role}</div>
                        </div>
                      </div>

                      {/* Card body */}
                      <div style={{ padding: '14px 20px' }}>
                        {/* Descripción */}
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: 14 }}>
                          {m.desc}
                        </div>

                        {/* Metodologías */}
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                            Metodologías
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {m.methods.map(method => (
                              <span key={method} style={{
                                padding: '3px 10px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 600,
                                background: `${m.color}10`, color: m.color,
                                border: `1px solid ${m.color}20`,
                              }}>{method}</span>
                            ))}
                          </div>
                        </div>

                        {/* Entregables */}
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                            Entrega
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {m.delivers.map(d => (
                              <span key={d} style={{
                                padding: '3px 8px', borderRadius: 6, fontSize: '0.65rem',
                                background: 'rgba(255,255,255,0.04)', color: '#cbd5e1',
                              }}>{d}</span>
                            ))}
                          </div>
                        </div>

                        {/* Handoff */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: '0.65rem', color: '#64748b', paddingTop: 8,
                          borderTop: '1px solid rgba(255,255,255,0.04)',
                        }}>
                          <span style={{ fontWeight: 600 }}>Handoff →</span>
                          <span style={{ color: '#94a3b8' }}>{m.handoff}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* ═══ TOOLKIT — Claude Code Features ═══ */}
            {tab === 'toolkit' && (
              <div>
                {/* Stats bar */}
                <div style={{
                  display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap',
                }}>
                  {[
                    { label: 'Total', value: CLAUDE_TOOLS.length, color: '#94a3b8' },
                    { label: 'Adoptados', value: adoptedCount, color: '#22c55e' },
                    { label: 'Disponibles', value: availableCount, color: '#3b82f6' },
                    { label: 'Pendientes', value: pendingCount, color: '#f59e0b' },
                    { label: 'No disponible', value: unavailableCount, color: '#ef4444' },
                  ].map(s => (
                    <div key={s.label} style={{
                      padding: '12px 18px', borderRadius: 12, flex: '1 1 120px',
                      background: `${s.color}08`, border: `1px solid ${s.color}20`,
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>{s.label}</div>
                    </div>
                  ))}
                  <div style={{
                    padding: '12px 18px', borderRadius: 12, flex: '1 1 120px',
                    background: 'linear-gradient(135deg, rgba(0,229,176,0.08), rgba(59,130,246,0.08))',
                    border: '1px solid rgba(0,229,176,0.2)', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#00e5b0' }}>{adoptionRate}%</div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>Adopción</div>
                  </div>
                </div>

                {/* Filters */}
                <div style={{
                  display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center',
                }}>
                  {/* Search */}
                  <input
                    type="text" placeholder="Buscar comando..."
                    value={tkSearch} onChange={e => setTkSearch(e.target.value)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', fontSize: '0.75rem',
                      outline: 'none', width: 200,
                    }}
                  />

                  {/* Category filter */}
                  <select value={tkCategory} onChange={e => setTkCategory(e.target.value as ToolCategory | 'all')} style={{
                    padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', fontSize: '0.72rem', cursor: 'pointer',
                  }}>
                    <option value="all">Todas las categorías</option>
                    {(Object.entries(CATEGORY_LABELS) as [ToolCategory, { label: string; icon: string }][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>

                  {/* Status filter */}
                  <select value={tkStatus} onChange={e => setTkStatus(e.target.value as ToolStatus | 'all')} style={{
                    padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', fontSize: '0.72rem', cursor: 'pointer',
                  }}>
                    <option value="all">Todos los estados</option>
                    {(Object.entries(STATUS_LABELS) as [ToolStatus, { label: string; color: string; icon: string }][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>

                  {/* Agent filter */}
                  <select value={tkAgent} onChange={e => setTkAgent(e.target.value as ToolAgent | 'all')} style={{
                    padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', fontSize: '0.72rem', cursor: 'pointer',
                  }}>
                    <option value="all">Todos los agentes</option>
                    {(Object.entries(AGENT_LABELS) as [ToolAgent, { label: string; color: string; icon: string }][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>

                  <span style={{ fontSize: '0.68rem', color: '#475569', marginLeft: 'auto' }}>
                    {filteredTools.length} de {CLAUDE_TOOLS.length} comandos
                  </span>
                </div>

                {/* Tools grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {filteredTools.map(t => {
                    const catInfo = CATEGORY_LABELS[t.category];
                    const statusInfo = STATUS_LABELS[t.status];
                    const agentInfo = AGENT_LABELS[t.agent];
                    return (
                      <div key={t.command} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                        borderRadius: 10, background: 'rgba(255,255,255,0.02)',
                        border: `1px solid ${statusInfo.color}15`,
                        transition: 'all 0.15s',
                      }}>
                        {/* Status icon */}
                        <span style={{ fontSize: '0.75rem', width: 20, textAlign: 'center' }}>{statusInfo.icon}</span>

                        {/* Command */}
                        <code style={{
                          fontSize: '0.72rem', fontWeight: 700, color: '#00e5b0',
                          background: 'rgba(0,229,176,0.08)', padding: '2px 8px', borderRadius: 6,
                          fontFamily: 'monospace', minWidth: 140, display: 'inline-block',
                        }}>{t.command}</code>

                        {/* Name & Description */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0' }}>{t.name}</span>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 8 }}>{t.description}</span>
                        </div>

                        {/* Category badge */}
                        <span style={{
                          fontSize: '0.6rem', padding: '2px 8px', borderRadius: 6,
                          background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}>{catInfo.icon} {catInfo.label}</span>

                        {/* Agent badge */}
                        <span style={{
                          fontSize: '0.6rem', padding: '2px 8px', borderRadius: 6,
                          background: `${agentInfo.color}12`, color: agentInfo.color, fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}>{agentInfo.icon} {agentInfo.label}</span>

                        {/* Impact */}
                        <span style={{
                          fontSize: '0.55rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                          background: t.impact === 'high' ? 'rgba(239,68,68,0.1)' : t.impact === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(100,116,139,0.1)',
                          color: t.impact === 'high' ? '#ef4444' : t.impact === 'medium' ? '#f59e0b' : '#64748b',
                          textTransform: 'uppercase',
                        }}>{t.impact}</span>
                      </div>
                    );
                  })}
                </div>

                {filteredTools.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#475569', fontSize: '0.82rem' }}>
                    No se encontraron comandos con esos filtros
                  </div>
                )}
              </div>
            )}

          </>
        )}
      </div>

      {/* Live Feed Sidebar */}
      {showFeed && (
        <div ref={feedRef} style={{
          width: 280, flexShrink: 0, overflowY: 'auto',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(10,16,28,0.5)', padding: '16px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0' }}>Live Feed</span>
            <span style={{
              marginLeft: 8, width: 6, height: 6, borderRadius: '50%', background: '#22c55e',
              animation: 'pulse 2s infinite',
            }} />
            <span style={{ fontSize: '0.6rem', color: '#475569', marginLeft: 6 }}>30s</span>
            <button onClick={() => setShowFeed(false)} style={{
              marginLeft: 'auto', background: 'none', border: 'none', color: '#475569',
              cursor: 'pointer', fontSize: '0.7rem',
            }}>✕</button>
          </div>
          {activity.length === 0 ? (
            <div style={{ fontSize: '0.72rem', color: '#475569', textAlign: 'center', padding: '20px 0' }}>
              Sin actividad reciente
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activity.map(evt => (
                <div key={evt.id} style={{
                  padding: '8px 10px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.02)',
                  borderLeft: `3px solid ${evt.color}`,
                  transition: 'all 0.3s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: evt.color }}>{evt.agent}</span>
                    <span style={{ fontSize: '0.55rem', color: '#475569', marginLeft: 'auto' }}>
                      {(() => {
                        const diff = Date.now() - new Date(evt.timestamp).getTime();
                        const mins = Math.floor(diff / 60000);
                        if (mins < 1) return 'ahora';
                        if (mins < 60) return `hace ${mins}m`;
                        const hrs = Math.floor(mins / 60);
                        if (hrs < 24) return `hace ${hrs}h`;
                        return `hace ${Math.floor(hrs / 24)}d`;
                      })()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.4 }}>{evt.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>

      {/* Feed toggle (when hidden) */}
      {!showFeed && (
        <button onClick={() => setShowFeed(true)} style={{
          position: 'fixed', right: 16, top: '50%', transform: 'translateY(-50%)',
          padding: '8px 6px', borderRadius: '8px 0 0 8px', border: 'none',
          background: 'rgba(15,22,35,0.95)', color: '#00e5b0', cursor: 'pointer',
          fontSize: '0.7rem', fontWeight: 700, writingMode: 'vertical-rl',
          borderLeft: '1px solid rgba(0,229,176,0.2)',
        }}>📡 Feed</button>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 60, right: 20, padding: '10px 20px', borderRadius: 10,
          background: 'rgba(15,22,35,0.95)', border: '1px solid rgba(0,229,176,0.2)',
          color: '#00e5b0', fontSize: '0.78rem', fontWeight: 600,
          backdropFilter: 'blur(12px)', zIndex: 200,
          animation: 'fadeInUp 0.3s ease-out',
        }} role="status">{toast}</div>
      )}
    </div>
  );
}
