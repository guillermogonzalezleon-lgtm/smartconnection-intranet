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
  };

  const updateProjectStatus = (projectId: string, newStatus: string) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
    // Persist to Supabase via PATCH
    fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_project', projectId, status: newStatus }),
    }).catch(() => {});
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
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button style={{ background: 'linear-gradient(135deg, #00e5b0 0%, #00c49a 100%)', border: 'none', borderRadius: 8, padding: '6px 16px', color: '#0a0d14', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="bi bi-plus-lg" style={{ fontSize: '0.8rem' }}></i> Nuevo Proyecto
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
              <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#00e5b0', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Cargando proyectos...
            </div>
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
                      onClick={() => openModal(project)}
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
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9', lineHeight: 1.3, flex: 1 }}>{project.name}</span>
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
              <div style={{ marginBottom: 8 }}>
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
            </div>
          </div>
        </div>
      )}

      {/* Spinner animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
