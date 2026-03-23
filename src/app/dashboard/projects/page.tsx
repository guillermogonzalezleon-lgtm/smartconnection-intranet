'use client';
import { useEffect, useState } from 'react';

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  progress: number;
  owner: string;
  members: string[];
  tags: string[];
  category: string;
  created_at: string;
  updated_at: string;
  due_date: string;
}

const COLUMNS = [
  { key: 'backlog', label: 'Backlog', color: '#475569' },
  { key: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { key: 'done', label: 'Done', color: '#22c55e' },
];

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function avatarColor(name: string) {
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#06b6d4', '#ef4444'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function progressColor(p: number) {
  if (p >= 80) return '#22c55e';
  if (p >= 50) return '#3b82f6';
  if (p >= 25) return '#f59e0b';
  return '#ef4444';
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [modalStatus, setModalStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', priority: 'medium', category: '', owner: 'Guillermo', tags: '', due_date: '', status: 'backlog', lead_id: '' });
  const [view, setView] = useState<'kanban' | 'table' | 'timeline'>('kanban');
  const [availableLeads, setAvailableLeads] = useState<Record<string, unknown>[]>([]);
  const [tasks, setTasks] = useState<Record<string, any[]>>({});  // project_id -> tasks[]
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [sprints, setSprints] = useState<any[]>([]);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'query', table: 'projects', order: 'created_at.desc', limit: 100 }),
    })
      .then(r => r.json())
      .then(d => { if (d.data) setProjects(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
    // Cargar leads disponibles
    fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'query', table: 'leads', order: 'created_at.desc', limit: 200 }),
    })
      .then(r => r.json())
      .then(d => { if (d.data) setAvailableLeads(d.data); })
      .catch(() => {});

    // Cargar sprints
    fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'query', table: 'sprints', order: 'start_date.asc', limit: 20 })
    }).then(r => r.json()).then(d => { if (d.data) setSprints(d.data); }).catch(() => {});

    // Cargar todas las tareas
    fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'query', table: 'project_tasks', order: 'created_at.asc', limit: 200 })
    }).then(r => r.json()).then(d => {
      if (d.data) {
        const grouped: Record<string, any[]> = {};
        for (const t of d.data) {
          if (!grouped[t.project_id]) grouped[t.project_id] = [];
          grouped[t.project_id].push(t);
        }
        setTasks(grouped);
      }
    }).catch(() => {});
  }, []);

  const categories = Array.from(new Set(projects.map(p => p.category).filter(Boolean)));

  const filtered = projects.filter(p => {
    if (filterPriority !== 'all' && p.priority !== filterPriority) return false;
    if (filterCategory !== 'all' && p.category !== filterCategory) return false;
    return true;
  });

  const grouped = COLUMNS.map(col => ({
    ...col,
    items: filtered.filter(p => p.status === col.key),
  }));

  const openModal = (p: Project) => {
    setSelectedProject(p);
    setModalStatus(p.status);
  };

  const closeModal = () => {
    setSelectedProject(null);
    setModalStatus('');
    setEditMode(false);
    setConfirmDelete(false);
  };

  const api = (payload: Record<string, unknown>) =>
    fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json());

  const resetForm = () => setForm({ name: '', description: '', priority: 'medium', category: '', owner: 'Guillermo', tags: '', due_date: '', status: 'backlog', lead_id: '' });

  const createProject = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await api({
        action: 'create_project',
        project: { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean), members: [form.owner], lead_id: form.lead_id || null },
      });
      if (res.success && res.data?.[0]) setProjects(prev => [res.data[0], ...prev]);
      setShowCreate(false);
      resetForm();
    } catch {}
    setSaving(false);
  };

  const editProject = async () => {
    if (!selectedProject || !form.name.trim()) return;
    setSaving(true);
    try {
      await api({
        action: 'edit_project',
        projectId: selectedProject.id,
        updates: { name: form.name, description: form.description, priority: form.priority, category: form.category, owner: form.owner, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean), due_date: form.due_date || null, lead_id: form.lead_id || null },
      });
      setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, name: form.name, description: form.description, priority: form.priority, category: form.category, owner: form.owner, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean), due_date: form.due_date } : p));
      setEditMode(false);
    } catch {}
    setSaving(false);
  };

  const deleteProject = async () => {
    if (!selectedProject) return;
    setSaving(true);
    try {
      await api({ action: 'delete_project', projectId: selectedProject.id });
      setProjects(prev => prev.filter(p => p.id !== selectedProject.id));
      closeModal();
    } catch {}
    setSaving(false);
  };

  const startEdit = () => {
    if (!selectedProject) return;
    setForm({
      name: selectedProject.name, description: selectedProject.description,
      priority: selectedProject.priority, category: selectedProject.category,
      owner: selectedProject.owner, tags: (selectedProject.tags || []).join(', '),
      due_date: selectedProject.due_date?.split('T')[0] || '', status: selectedProject.status,
      lead_id: (selectedProject as unknown as Record<string, unknown>).lead_id as string || '',
    });
    setEditMode(true);
  };

  const inputStyle: React.CSSProperties = { width: '100%', background: '#0a0d14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: '0.8rem', fontFamily: "'Inter', system-ui, sans-serif", outline: 'none' };
  const labelStyle: React.CSSProperties = { fontSize: '0.65rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6, display: 'block' };

  const updateProjectStatus = async (projectId: string, newStatus: string) => {
    const previousProjects = [...projects];
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
    // Persist to Supabase via PATCH
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_project', projectId, status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Error al actualizar');
    } catch (err) {
      setProjects(previousProjects);
      alert(`Error al mover proyecto: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const addTask = async (projectId: string) => {
    if (!newTask.trim()) return;
    await fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_task', project_id: projectId, title: newTask.trim() })
    });
    setNewTask('');
    // Reload tasks
    const d = await fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'query', table: 'project_tasks', filter: `project_id=eq.${projectId}`, order: 'created_at.asc' })
    }).then(r => r.json());
    if (d.data) setTasks(prev => ({ ...prev, [projectId]: d.data }));
  };

  const toggleTask = async (taskId: string, projectId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    await fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_task', taskId, status: newStatus })
    });
    setTasks(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).map(t => t.id === taskId ? { ...t, status: newStatus } : t)
    }));
  };

  const selectStyle = (active: boolean): React.CSSProperties => ({
    background: active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: '6px 12px',
    color: '#e2e8f0',
    fontSize: '0.75rem',
    cursor: 'pointer',
    outline: 'none',
    fontFamily: "'Inter', system-ui, sans-serif",
  });

  return (
    <>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,13,20,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)', height: 56, display: 'flex', alignItems: 'center', padding: '0 2rem', fontSize: '0.85rem', color: '#94a3b8' }}>
        Intranet <span style={{ margin: '0 8px', color: '#475569' }}>/</span> <span style={{ color: '#fff', fontWeight: 600 }}>Proyectos</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <button onClick={() => setView('kanban')} style={{ padding: '5px 12px', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', background: view === 'kanban' ? 'rgba(0,229,176,0.12)' : 'transparent', color: view === 'kanban' ? '#00e5b0' : '#64748b', border: 'none' }}>☰ Kanban</button>
            <button onClick={() => setView('table')} style={{ padding: '5px 12px', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', background: view === 'table' ? 'rgba(0,229,176,0.12)' : 'transparent', color: view === 'table' ? '#00e5b0' : '#64748b', border: 'none' }}>▤ Tabla</button>
            <button onClick={() => setView('timeline')} style={{ padding: '5px 12px', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', background: view === 'timeline' ? 'rgba(0,229,176,0.12)' : 'transparent', color: view === 'timeline' ? '#00e5b0' : '#64748b', border: 'none' }}>📊 Timeline</button>
          </div>
          <button onClick={() => { resetForm(); setShowCreate(true); }} style={{ background: 'linear-gradient(135deg, #00e5b0 0%, #00c49a 100%)', border: 'none', borderRadius: 8, padding: '6px 16px', color: '#0a0d14', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="bi bi-plus-lg" style={{ fontSize: '0.8rem' }}></i> Nuevo
          </button>
        </div>
      </div>

      <div style={{ padding: '1.25rem 2rem', minHeight: 'calc(100vh - 56px)', background: '#0a0d14' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prioridad</span>
            {['all', 'high', 'medium', 'low'].map(p => (
              <button key={p} onClick={() => setFilterPriority(p)} style={{
                ...selectStyle(filterPriority === p),
                ...(p !== 'all' && filterPriority === p ? { borderColor: PRIORITY_COLORS[p], color: PRIORITY_COLORS[p] } : {}),
              }}>
                {p === 'all' ? 'Todas' : PRIORITY_LABELS[p]}
              </button>
            ))}
          </div>
          {categories.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 16 }}>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categoría</span>
              <button onClick={() => setFilterCategory('all')} style={selectStyle(filterCategory === 'all')}>Todas</button>
              {categories.map(c => (
                <button key={c} onClick={() => setFilterCategory(c)} style={selectStyle(filterCategory === c)}>{c}</button>
              ))}
            </div>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#475569' }}>{filtered.length} proyecto{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, color: '#475569', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div role="status" aria-label="Cargando" style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#00e5b0', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Cargando proyectos...
            </div>
          </div>
        ) : view === 'timeline' ? (
          /* Timeline View — Gantt */
          <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
            {/* Month headers */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ width: 200, flexShrink: 0, padding: '10px 14px', fontSize: '0.6rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Proyecto</div>
              <div style={{ flex: 1, display: 'flex' }}>
                {['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map(m => (
                  <div key={m} style={{ flex: 1, textAlign: 'center', fontSize: '0.6rem', color: '#2a3d58', padding: '10px 0', borderLeft: '1px solid rgba(255,255,255,0.03)', fontFamily: "'JetBrains Mono', monospace" }}>{m}</div>
                ))}
              </div>
            </div>
            {/* Project rows */}
            {filtered.map(p => {
              const col = COLUMNS.find(c => c.key === p.status);
              const pc = PRIORITY_COLORS[p.priority] || '#64748b';
              // Calculate bar position from dates
              const startMonth = p.created_at ? new Date(p.created_at).getMonth() : 2; // Mar=2
              const endMonth = p.due_date ? new Date(p.due_date).getMonth() : startMonth + 3;
              const totalMonths = 10; // Mar-Dic
              const leftPct = Math.max(0, ((startMonth - 2) / totalMonths) * 100);
              const widthPct = Math.max(8, ((endMonth - startMonth + 1) / totalMonths) * 100);
              const barColor = p.status === 'done' ? '#1fd975' : col?.color || '#4f8ef7';
              // Today marker
              const todayMonth = new Date().getMonth();
              const todayPct = ((todayMonth - 2 + new Date().getDate() / 30) / totalMonths) * 100;

              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', minHeight: 44, borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,176,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ width: 200, flexShrink: 0, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: pc, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{p.name}</div>
                      <div style={{ fontSize: '0.55rem', color: '#475569' }}>{p.owner || '—'}</div>
                    </div>
                  </div>
                  <div style={{ flex: 1, position: 'relative', height: 28, display: 'flex' }}>
                    {/* Grid lines */}
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} style={{ position: 'absolute', left: `${(i / 10) * 100}%`, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.02)' }} />
                    ))}
                    {/* Today line */}
                    <div style={{ position: 'absolute', left: `${todayPct}%`, top: 0, bottom: 0, width: 2, background: '#ef4444', zIndex: 2 }} />
                    {/* Bar */}
                    <div style={{
                      position: 'absolute', left: `${leftPct}%`, width: `${widthPct}%`,
                      height: 20, top: 4, borderRadius: 6,
                      background: `linear-gradient(90deg, ${barColor}, ${barColor}aa)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.55rem', fontWeight: 700, color: 'rgba(0,0,0,0.7)',
                      transition: 'all 0.2s', cursor: 'pointer',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'scaleY(1.3)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'scaleY(1)')}>
                      {p.progress || 0}%
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: '0.8rem' }}>Sin proyectos</div>}
          </div>
        ) : view === 'table' ? (
          /* Table View — estilo Monday */
          <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {['Proyecto', 'Status', 'Prioridad', 'Owner', 'Progreso', 'Due Date', 'Tareas', 'Categoría'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const col = COLUMNS.find(c => c.key === p.status);
                  const pc = PRIORITY_COLORS[p.priority] || '#64748b';
                  return (
                    <tr key={p.id} onClick={() => { setSelectedProject(p); setShowCreate(true); setEditMode(true); setForm({ name: p.name, description: p.description, priority: p.priority, category: p.category, owner: p.owner, tags: (p.tags || []).join(', '), due_date: p.due_date?.split('T')[0] || '', status: p.status, lead_id: (p as unknown as Record<string, unknown>).lead_id as string || '' }); }} style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,176,0.03)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9' }}>{p.name}</div>
                        <div style={{ fontSize: '0.62rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 250 }}>{p.description}</div>
                      </td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: `${col?.color || '#475569'}18`, color: col?.color || '#475569', display: 'inline-block' }}>{col?.label || p.status}</span>
                      </td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: `${pc}18`, color: pc }}>{PRIORITY_LABELS[p.priority] || p.priority}</span>
                      </td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: avatarColor(p.owner || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', color: '#fff', fontWeight: 700 }}>{getInitials(p.owner || 'NA')}</div>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{p.owner || '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${p.progress || 0}%`, background: progressColor(p.progress || 0), borderRadius: 3, transition: 'width 0.4s' }} />
                          </div>
                          <span style={{ fontSize: '0.62rem', fontWeight: 700, color: progressColor(p.progress || 0), minWidth: 28 }}>{p.progress || 0}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.68rem', color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>
                        {p.due_date ? new Date(p.due_date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        {(tasks[p.id]?.length || 0) > 0 ? (
                          <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                            {tasks[p.id].filter((t: any) => t.status === 'done').length}/{tasks[p.id].length}
                          </span>
                        ) : <span style={{ fontSize: '0.62rem', color: '#2a3d58' }}>&mdash;</span>}
                      </td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        {p.category && <span style={{ fontSize: '0.58rem', padding: '2px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.04)', color: '#94a3b8' }}>{p.category}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: '0.8rem' }}>Sin proyectos</div>}
          </div>
        ) : (
          /* Kanban Board */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'flex-start' }}>
            {grouped.map(col => (
              <div key={col.key}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropTarget(col.key); }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(e) => { e.preventDefault(); if (draggedId) { updateProjectStatus(draggedId, col.key); setDraggedId(null); setDropTarget(null); } }}
                style={{ background: dropTarget === col.key ? 'rgba(0,229,176,0.04)' : 'rgba(255,255,255,0.02)', border: dropTarget === col.key ? '2px dashed rgba(0,229,176,0.3)' : '2px dashed transparent', borderRadius: 14, borderTop: `3px solid ${col.color}`, minHeight: 400 }}>
                {/* Column Header */}
                <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, boxShadow: `0 0 8px ${col.color}50` }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.01em' }}>{col.label}</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#475569', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 999 }}>{col.items.length}</span>
                </div>

                {/* Cards */}
                <div style={{ padding: '10px 10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {col.items.length === 0 && (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: '#334155', fontSize: '0.75rem' }}>Sin proyectos</div>
                  )}
                  {col.items.map(project => (
                    <div
                      key={project.id}
                      draggable
                      onDragStart={(e) => { setDraggedId(project.id); e.dataTransfer.effectAllowed = 'move'; }}
                      onDragEnd={() => { setDraggedId(null); setDropTarget(null); }}
                      onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                      onDoubleClick={() => openModal(project)}
                      onMouseEnter={() => setHoveredCard(project.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        background: '#111827',
                        borderRadius: 10,
                        padding: '14px 14px 12px',
                        cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.06)',
                        transition: 'all 0.2s ease',
                        opacity: draggedId === project.id ? 0.4 : (hoveredCard === project.id ? 0.85 : 1),
                        transform: hoveredCard === project.id ? 'translateY(-1px)' : 'none',
                        boxShadow: hoveredCard === project.id ? '0 8px 24px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                      }}
                    >
                      {/* Priority + Name */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                        <span style={{
                          fontSize: '0.55rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: `${PRIORITY_COLORS[project.priority] || '#475569'}18`,
                          color: PRIORITY_COLORS[project.priority] || '#475569',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          flexShrink: 0,
                          marginTop: 2,
                        }}>
                          {PRIORITY_LABELS[project.priority] || project.priority}
                        </span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9', lineHeight: 1.3 }}>{project.name}</span>
                          {(tasks[project.id]?.length || 0) > 0 && (
                            <span style={{ fontSize: '0.55rem', color: '#475569', display: 'block', marginTop: 2 }}>
                              {tasks[project.id].filter((t: any) => t.status === 'done').length}/{tasks[project.id].length} tareas
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {project.description && (
                        <p style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 10px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {project.description}
                        </p>
                      )}

                      {/* Progress */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.6rem', color: '#475569', fontWeight: 600 }}>Progreso</span>
                          <span style={{ fontSize: '0.6rem', color: progressColor(project.progress || 0), fontWeight: 700 }}>{project.progress || 0}%</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${project.progress || 0}%`, background: `linear-gradient(90deg, ${progressColor(project.progress || 0)}90, ${progressColor(project.progress || 0)})`, borderRadius: 999, transition: 'width 0.5s ease' }} />
                        </div>
                      </div>

                      {/* Tags */}
                      {project.tags && project.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                          {project.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} style={{ fontSize: '0.55rem', padding: '2px 7px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontWeight: 500 }}>{tag}</span>
                          ))}
                          {project.tags.length > 3 && (
                            <span style={{ fontSize: '0.55rem', padding: '2px 7px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', color: '#64748b', fontWeight: 500 }}>+{project.tags.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Footer: owner + members */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Owner */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: avatarColor(project.owner || '?'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', color: '#fff', fontWeight: 700 }}>
                            {getInitials(project.owner || '?')}
                          </div>
                          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{project.owner}</span>
                        </div>

                        {/* Members */}
                        {project.members && project.members.length > 0 && (
                          <div style={{ display: 'flex' }}>
                            {project.members.slice(0, 4).map((m, i) => (
                              <div key={i} title={m} style={{
                                width: 22, height: 22, borderRadius: '50%',
                                background: avatarColor(m),
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.45rem', color: '#fff', fontWeight: 700,
                                border: '2px solid #111827',
                                marginLeft: i === 0 ? 0 : -6,
                                zIndex: project.members.length - i,
                                position: 'relative',
                              }}>
                                {getInitials(m)}
                              </div>
                            ))}
                            {project.members.length > 4 && (
                              <div style={{
                                width: 22, height: 22, borderRadius: '50%',
                                background: 'rgba(255,255,255,0.08)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.45rem', color: '#94a3b8', fontWeight: 700,
                                border: '2px solid #111827',
                                marginLeft: -6,
                                position: 'relative',
                              }}>
                                +{project.members.length - 4}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Sub-tasks */}
                      {expandedProject === project.id && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          {(tasks[project.id] || []).map((t: any) => (
                            <div key={t.id} onClick={(e) => { e.stopPropagation(); toggleTask(t.id, project.id, t.status); }}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', cursor: 'pointer', fontSize: '0.68rem', color: t.status === 'done' ? '#475569' : '#94a3b8', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>
                              <span style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${t.status === 'done' ? '#22c55e' : 'rgba(255,255,255,0.15)'}`, background: t.status === 'done' ? 'rgba(34,197,94,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', color: '#22c55e', flexShrink: 0 }}>
                                {t.status === 'done' && '\u2713'}
                              </span>
                              {t.title}
                            </div>
                          ))}
                          <div style={{ display: 'flex', gap: 4, marginTop: 4 }} onClick={e => e.stopPropagation()}>
                            <input value={newTask} onChange={e => setNewTask(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && addTask(project.id)}
                              placeholder="+ Agregar tarea..."
                              style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, padding: '3px 6px', color: '#94a3b8', fontSize: '0.62rem', outline: 'none' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedProject && (
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#111827', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', width: '100%', maxWidth: 600, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                    background: `${PRIORITY_COLORS[selectedProject.priority] || '#475569'}18`,
                    color: PRIORITY_COLORS[selectedProject.priority] || '#475569',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    {PRIORITY_LABELS[selectedProject.priority] || selectedProject.priority}
                  </span>
                  {selectedProject.category && (
                    <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                      {selectedProject.category}
                    </span>
                  )}
                </div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3 }}>{selectedProject.name}</h2>
              </div>
              <button onClick={closeModal} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', fontSize: '1rem', flexShrink: 0 }}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px' }}>
              {/* Description */}
              {selectedProject.description && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Descripción</div>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.65, margin: 0 }}>{selectedProject.description}</p>
                </div>
              )}

              {/* Status Selector */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Estado</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {COLUMNS.map(col => (
                    <button key={col.key} onClick={() => { setModalStatus(col.key); if (selectedProject) updateProjectStatus(selectedProject.id, col.key); }} style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                      border: modalStatus === col.key ? `1px solid ${col.color}` : '1px solid rgba(255,255,255,0.08)',
                      background: modalStatus === col.key ? `${col.color}18` : 'rgba(255,255,255,0.03)',
                      color: modalStatus === col.key ? col.color : '#64748b',
                      transition: 'all 0.15s ease',
                    }}>
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress Large */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Progreso</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: progressColor(selectedProject.progress || 0) }}>{selectedProject.progress || 0}%</span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${selectedProject.progress || 0}%`, background: `linear-gradient(90deg, ${progressColor(selectedProject.progress || 0)}80, ${progressColor(selectedProject.progress || 0)})`, borderRadius: 999, transition: 'width 0.5s ease' }} />
                </div>
              </div>

              {/* Owner & Members */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Responsable</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor(selectedProject.owner || '?'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#fff', fontWeight: 700 }}>
                      {getInitials(selectedProject.owner || '?')}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: 500 }}>{selectedProject.owner}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Miembros</div>
                  {selectedProject.members && selectedProject.members.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {selectedProject.members.map((m, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: avatarColor(m), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', color: '#fff', fontWeight: 700 }}>
                            {getInitials(m)}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{m}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#334155' }}>Sin miembros</span>
                  )}
                </div>
              </div>

              {/* Tags */}
              {selectedProject.tags && selectedProject.tags.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Tags</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {selectedProject.tags.map((tag, i) => (
                      <span key={i} style={{ fontSize: '0.68rem', padding: '3px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontWeight: 500, border: '1px solid rgba(255,255,255,0.06)' }}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Timeline</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Creado', date: selectedProject.created_at },
                    { label: 'Actualizado', date: selectedProject.updated_at },
                    { label: 'Fecha límite', date: selectedProject.due_date },
                  ].map(t => (
                    <div key={t.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontSize: '0.58rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{t.label}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}>
                        {t.date ? new Date(t.date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
                <button onClick={startEdit} style={{ flex: 1, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6', padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <i className="bi bi-pencil"></i> Editar
                </button>
                <button onClick={() => setConfirmDelete(true)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '10px 16px', borderRadius: 10, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="bi bi-trash3"></i>
                </button>
              </div>

              {/* Confirm delete */}
              {confirmDelete && (
                <div style={{ marginTop: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600 }}>¿Eliminar este proyecto?</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setConfirmDelete(false)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', padding: '6px 14px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>Cancelar</button>
                    <button onClick={deleteProject} disabled={saving} style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>{saving ? 'Eliminando...' : 'Sí, eliminar'}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Create / Edit Modal ═══ */}
      {(showCreate || editMode) && (
        <div onClick={() => { setShowCreate(false); setEditMode(false); }} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#111827', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', width: '100%', maxWidth: 520, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f1f5f9' }}>{editMode ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h2>
              <button onClick={() => { setShowCreate(false); setEditMode(false); }} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', fontSize: '1rem' }}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Nombre *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre del proyecto" style={{ ...inputStyle, borderColor: form.name.trim() === '' ? '#ef4444' : 'rgba(255,255,255,0.1)' }} />
                {form.name.trim() === '' && <span style={{ fontSize: '0.68rem', color: '#ef4444', marginTop: 4, display: 'block' }}>Nombre requerido</span>}
              </div>
              <div>
                <label style={labelStyle}>Descripción</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción breve" rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Prioridad</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={inputStyle}>
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Categoría</label>
                  <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="ej: SAP, Web, IA" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Responsable</label>
                  <input value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Fecha límite</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Tags (separados por coma)</label>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="SAP, BTP, Next.js" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Lead asociado</label>
                <select value={form.lead_id} onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))} style={inputStyle}>
                  <option value="">Sin lead asociado</option>
                  {availableLeads.map((lead) => (
                    <option key={lead.id as string} value={lead.id as string}>
                      {(lead.name as string) || (lead.email as string) || (lead.company as string) || (lead.id as string)}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={() => { setShowCreate(false); setEditMode(false); }} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', padding: '10px 20px', borderRadius: 10, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'Inter', system-ui" }}>
                  Cancelar
                </button>
                <button onClick={editMode ? editProject : createProject} disabled={saving || !form.name.trim()} style={{ background: saving ? '#1a2235' : 'linear-gradient(135deg, #00e5b0, #00c49a)', color: saving ? '#94a3b8' : '#0a0d14', border: 'none', padding: '10px 24px', borderRadius: 10, fontWeight: 700, fontSize: '0.78rem', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Inter', system-ui" }}>
                  {saving ? 'Guardando...' : editMode ? 'Guardar cambios' : 'Crear proyecto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spinner animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
