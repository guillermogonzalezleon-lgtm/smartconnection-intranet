'use client';
import { useEffect, useState } from 'react';

type Lead = Record<string, unknown>;

const ESTADO_OPTIONS = ['nuevo', 'contactado', 'en_progreso', 'cerrado', 'perdido'];

const COLUMN_MAP: Record<string, string> = {
  Fecha: 'created_at',
  Nombre: 'nombre',
  Email: 'email',
  Servicio: 'servicio',
  Estado: 'estado',
  Mensaje: 'mensaje',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchLeads = () => {
    fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'query', table: 'leads', order: 'created_at.desc', limit: 100 }) })
      .then(r => r.json()).then(d => { if (d.data) setLeads(d.data); }).catch(() => {});
  };

  useEffect(() => { fetchLeads(); }, []);

  const filtered = leads.filter(l => {
    if (!filter) return true;
    const s = filter.toLowerCase();
    return ((l.nombre as string) || '').toLowerCase().includes(s) || ((l.email as string) || '').toLowerCase().includes(s);
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = (a[sortBy] as string) || '';
    const bv = (b[sortBy] as string) || '';
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleSort = (col: string) => {
    const key = COLUMN_MAP[col];
    if (sortBy === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const openEdit = (l: Lead) => {
    setEditLead(l);
    setForm({
      nombre: (l.nombre as string) || '',
      empresa: (l.empresa as string) || '',
      email: (l.email as string) || '',
      telefono: (l.telefono as string) || '',
      servicio: (l.servicio as string) || '',
      estado: (l.estado as string) || 'nuevo',
      mensaje: (l.mensaje as string) || '',
    });
    setConfirmDelete(false);
  };

  const handleSave = async () => {
    if (!editLead) return;
    setSaving(true);
    try {
      await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_lead', leadId: editLead.id, updates: form }),
      });
      setEditLead(null);
      fetchLeads();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!editLead) return;
    setSaving(true);
    try {
      await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_lead', leadId: editLead.id }),
      });
      setEditLead(null);
      fetchLeads();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const estadoStyle = (e: string) => {
    if (e === 'nuevo') return { bg: 'rgba(0,229,176,0.1)', color: '#00e5b0' };
    if (e === 'contactado') return { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' };
    if (e === 'en_progreso') return { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' };
    if (e === 'cerrado') return { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' };
    if (e === 'perdido') return { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' };
    return { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' };
  };

  const sortIndicator = (col: string) => {
    const key = COLUMN_MAP[col];
    if (sortBy !== key) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  const exportCSV = () => {
    const headers = ['Nombre', 'Empresa', 'Email', 'Teléfono', 'Servicio', 'Estado', 'Fecha'];
    const rows = leads.map(l => [l.nombre, l.empresa, l.email, l.telefono, l.servicio, l.estado, l.created_at].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '8px 12px',
    color: '#f1f5f9',
    fontSize: '0.8rem',
    width: '100%',
    outline: 'none',
    fontFamily: "'Inter', system-ui",
  };

  return (
    <>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(17,24,39,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', height: 56, display: 'flex', alignItems: 'center', padding: '0 2rem', fontSize: '0.85rem', color: '#94a3b8' }}>
        Intranet <span style={{ margin: '0 8px', color: '#475569' }}>/</span> <span style={{ color: '#fff', fontWeight: 600 }}>Leads & CRM</span>
      </div>
      <div style={{ padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Buscar por nombre o email..." style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 14px', color: '#fff', fontSize: '0.8rem', width: 300, outline: 'none', fontFamily: "'Inter', system-ui" }} />
          <button onClick={exportCSV} style={{ background: 'rgba(0,229,176,0.1)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.2)', borderRadius: 8, padding: '8px 16px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', system-ui", whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
            Exportar CSV
          </button>
        </div>
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ textAlign: 'left' }}>
              {['Fecha', 'Nombre', 'Email', 'Servicio', 'Estado', 'Mensaje'].map(h => (
                <th key={h} onClick={() => handleSort(h)} style={{ padding: '10px 14px', fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', userSelect: 'none' }}>
                  {h}{sortIndicator(h)}
                </th>
              ))}
            </tr></thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: '0.8rem' }}>Sin leads todavía</td></tr>
              ) : sorted.map((l, i) => {
                const es = estadoStyle(l.estado as string);
                return (
                  <tr key={i} onClick={() => openEdit(l)} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '8px 14px', fontSize: '0.75rem', color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>{l.created_at ? new Date(l.created_at as string).toLocaleDateString('es-CL') : '—'}</td>
                    <td style={{ padding: '8px 14px', fontSize: '0.8rem', color: '#f1f5f9', fontWeight: 600 }}>{l.nombre as string}</td>
                    <td style={{ padding: '8px 14px', fontSize: '0.78rem', color: '#94a3b8' }}>{l.email as string}</td>
                    <td style={{ padding: '8px 14px', fontSize: '0.75rem', color: '#94a3b8' }}>{(l.servicio as string) || '—'}</td>
                    <td style={{ padding: '8px 14px' }}><span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: es.bg, color: es.color }}>{(l.estado as string) || 'nuevo'}</span></td>
                    <td style={{ padding: '8px 14px', fontSize: '0.75rem', color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(l.mensaje as string) || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de edición */}
      {editLead && (
        <div onClick={() => setEditLead(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '1.5rem', width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: '1rem', fontWeight: 700 }}>Editar Lead</h3>
              <button onClick={() => setEditLead(null)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'nombre', label: 'Nombre' },
                { key: 'empresa', label: 'Empresa' },
                { key: 'email', label: 'Email' },
                { key: 'telefono', label: 'Teléfono' },
                { key: 'servicio', label: 'Servicio' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 4, display: 'block' }}>{f.label}</label>
                  <input value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle} />
                </div>
              ))}

              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 4, display: 'block' }}>Estado</label>
                <select value={form.estado || 'nuevo'} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))} style={{ ...inputStyle, appearance: 'auto' as React.CSSProperties['appearance'] }}>
                  {ESTADO_OPTIONS.map(o => <option key={o} value={o} style={{ background: '#1e293b' }}>{o}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 4, display: 'block' }}>Mensaje</label>
                <textarea value={form.mensaje || ''} onChange={e => setForm(p => ({ ...p, mensaje: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, gap: 10 }}>
              <div>
                {!confirmDelete ? (
                  <button onClick={() => setConfirmDelete(true)} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 16px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}>
                    Eliminar
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>¿Seguro?</span>
                    <button onClick={handleDelete} disabled={saving} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.5 : 1 }}>
                      Sí, eliminar
                    </button>
                    <button onClick={() => setConfirmDelete(false)} style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', fontSize: '0.78rem', cursor: 'pointer' }}>
                      No
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditLead(null)} style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 16px', fontSize: '0.78rem', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving} style={{ background: '#00e5b0', color: '#0f172a', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700, opacity: saving ? 0.5 : 1 }}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
