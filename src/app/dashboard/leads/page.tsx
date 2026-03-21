'use client';
import { useEffect, useState } from 'react';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Record<string, unknown>[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'query', table: 'leads', order: 'created_at.desc', limit: 100 }) })
      .then(r => r.json()).then(d => { if (d.data) setLeads(d.data); }).catch(() => {});
  }, []);

  const filtered = leads.filter(l => {
    if (!filter) return true;
    const s = filter.toLowerCase();
    return ((l.nombre as string) || '').toLowerCase().includes(s) || ((l.email as string) || '').toLowerCase().includes(s);
  });

  const estadoStyle = (e: string) => {
    if (e === 'nuevo') return { bg: 'rgba(0,229,176,0.1)', color: '#00e5b0' };
    if (e === 'contactado') return { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' };
    return { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' };
  };

  return (
    <>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(17,24,39,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', height: 56, display: 'flex', alignItems: 'center', padding: '0 2rem', fontSize: '0.85rem', color: '#94a3b8' }}>
        Intranet <span style={{ margin: '0 8px', color: '#475569' }}>/</span> <span style={{ color: '#fff', fontWeight: 600 }}>Leads & CRM</span>
      </div>
      <div style={{ padding: '1.5rem 2rem' }}>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Buscar por nombre o email..." style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 14px', color: '#fff', fontSize: '0.8rem', width: 300, marginBottom: 16, outline: 'none', fontFamily: "'Inter', system-ui" }} />
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ textAlign: 'left' }}>
              {['Fecha', 'Nombre', 'Email', 'Servicio', 'Estado', 'Mensaje'].map(h => (
                <th key={h} style={{ padding: '10px 14px', fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: '0.8rem' }}>Sin leads todavía</td></tr>
              ) : filtered.map((l, i) => {
                const es = estadoStyle(l.estado as string);
                return (
                  <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
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
    </>
  );
}
