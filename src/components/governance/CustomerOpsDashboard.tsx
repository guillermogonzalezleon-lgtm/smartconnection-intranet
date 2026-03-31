'use client';

import { useEffect, useState, useCallback } from 'react';

interface Ticket {
  id: string;
  cliente: string;
  severidad: 'critica' | 'alta' | 'media' | 'baja';
  canal: 'whatsapp' | 'email' | 'chat' | 'telefono';
  status: 'abierto' | 'en_progreso' | 'resuelto' | 'cerrado';
  sla_hours?: number;
  resolucion_hours?: number;
  descripcion?: string;
  created_at?: string;
}

const SEVERIDAD_CFG: Record<string, { label: string; color: string }> = {
  critica: { label: 'Crítica', color: '#ef4444' },
  alta:    { label: 'Alta',    color: '#f97316' },
  media:   { label: 'Media',   color: '#f59e0b' },
  baja:    { label: 'Baja',    color: '#94a3b8' },
};

const CANAL_CFG: Record<string, { label: string; color: string }> = {
  whatsapp: { label: 'WhatsApp', color: '#22c55e' },
  email:    { label: 'Email',    color: '#60a5fa' },
  chat:     { label: 'Chat',     color: '#a78bfa' },
  telefono: { label: 'Teléfono', color: '#f59e0b' },
};

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  abierto:     { label: 'Abierto',     color: '#ef4444' },
  en_progreso: { label: 'En progreso', color: '#f59e0b' },
  resuelto:    { label: 'Resuelto',    color: '#22c55e' },
  cerrado:     { label: 'Cerrado',     color: '#475569' },
};

const SEED_TICKETS = [
  { cliente: 'TechCorp Chile',  severidad: 'alta',    canal: 'email',    status: 'resuelto',    sla_hours: 4,  resolucion_hours: 2.5, descripcion: 'Error al generar reporte mensual' },
  { cliente: 'Retail Express',  severidad: 'media',   canal: 'whatsapp', status: 'abierto',     sla_hours: 8,  resolucion_hours: null, descripcion: 'Duda sobre acceso de nuevos usuarios' },
  { cliente: 'LogiSmart',       severidad: 'critica', canal: 'email',    status: 'en_progreso', sla_hours: 1,  resolucion_hours: null, descripcion: 'Sistema no responde en horario pico' },
  { cliente: 'FoodService Pro', severidad: 'baja',    canal: 'chat',     status: 'cerrado',     sla_hours: 24, resolucion_hours: 18,   descripcion: 'Solicitud de cambio de contraseña' },
  { cliente: 'EduTech',         severidad: 'media',   canal: 'email',    status: 'resuelto',    sla_hours: 8,  resolucion_hours: 6,    descripcion: 'Problema de sincronización de datos' },
];

function NpsGauge({ score }: { score: number }) {
  // score -100 a 100, semicírculo SVG
  const pct = (score + 100) / 200; // 0 a 1
  const r = 60;
  const cx = 80;
  const cy = 70;
  const startAngle = Math.PI; // 180deg
  const endAngle = 0;
  const angle = startAngle + pct * (endAngle - startAngle + 2 * Math.PI) % (2 * Math.PI);
  // semicírculo: de 180deg a 0deg (izq a der)
  const sweepAngle = pct * Math.PI;
  const x = cx + r * Math.cos(Math.PI - sweepAngle);
  const y = cy - r * Math.sin(sweepAngle);
  const color = score >= 50 ? '#22c55e' : score >= 0 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={160} height={80} viewBox="0 0 160 80" style={{ overflow: 'visible' }}>
        {/* Track */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={10}
          strokeLinecap="round"
        />
        {/* Fill */}
        {pct > 0 && (
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${sweepAngle > Math.PI / 2 ? 1 : 0} 1 ${x} ${y}`}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
          />
        )}
        {/* Score */}
        <text x={cx} y={cy - 6} textAnchor="middle" fill={color} fontSize={22} fontWeight={800} fontFamily="Inter, system-ui, sans-serif">{score}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#475569" fontSize={9} fontFamily="Inter, system-ui, sans-serif">NPS</text>
        {/* Labels */}
        <text x={cx - r - 4} y={cy + 14} textAnchor="end" fill="#475569" fontSize={8} fontFamily="Inter, system-ui, sans-serif">-100</text>
        <text x={cx + r + 4} y={cy + 14} textAnchor="start" fill="#475569" fontSize={8} fontFamily="Inter, system-ui, sans-serif">100</text>
      </svg>
    </div>
  );
}

export default function CustomerOpsDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterSeveridad, setFilterSeveridad] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      else if (filterSeveridad) params.set('severidad', filterSeveridad);
      const res = await fetch(`/api/governance/tickets${params.toString() ? '?' + params : ''}`);
      if (!res.ok) throw new Error('Error');
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterSeveridad]);

  useEffect(() => { load(); }, [load]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await fetch('/api/governance/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(SEED_TICKETS),
      });
      await load();
    } catch {
      // silent
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center', color: '#475569' }}>
        <div style={{ width: 32, height: 32, border: '2px solid rgba(34,197,94,0.3)', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: '0.8rem' }}>Cargando Customer Ops...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isEmpty = tickets.length === 0 && !filterStatus && !filterSeveridad;

  const abiertos   = tickets.filter(t => t.status === 'abierto').length;
  const resueltos  = tickets.filter(t => t.status === 'resuelto' || t.status === 'cerrado').length;
  const pendientes = tickets.filter(t => t.status === 'en_progreso').length;
  const conSla     = tickets.filter(t => t.sla_hours != null && t.resolucion_hours != null);
  const slaCumplido = conSla.length > 0
    ? Math.round((conSla.filter(t => t.resolucion_hours! <= t.sla_hours!).length / conSla.length) * 100)
    : 0;

  // NPS simulado basado en tickets resueltos vs totales
  const npsScore = tickets.length > 0 ? Math.round((resueltos / tickets.length) * 100) - 20 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Customer Ops</h2>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
            {isEmpty ? 'Sin tickets aún — carga datos de ejemplo' : `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''} en seguimiento`}
          </p>
        </div>
        {isEmpty && (
          <button
            onClick={handleSeed}
            disabled={seeding}
            style={{ padding: '8px 18px', borderRadius: 8, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', color: '#4ade80', fontSize: '0.75rem', fontWeight: 600, cursor: seeding ? 'wait' : 'pointer', opacity: seeding ? 0.7 : 1 }}
          >
            {seeding ? 'Cargando...' : '+ Cargar tickets ejemplo'}
          </button>
        )}
      </div>

      {/* Estado vacío */}
      {isEmpty && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 16, padding: '64px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '2.5rem' }}>🎧</span>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Sin tickets registrados</h3>
          <p style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: 380, lineHeight: 1.6, margin: 0 }}>
            El sistema de soporte está vacío. Carga datos de ejemplo para ver métricas de SLA y NPS.
          </p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            style={{ marginTop: 8, padding: '10px 24px', borderRadius: 10, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: '#4ade80', fontSize: '0.8rem', fontWeight: 600, cursor: seeding ? 'wait' : 'pointer' }}
          >
            {seeding ? 'Cargando datos...' : 'Cargar tickets de ejemplo'}
          </button>
        </div>
      )}

      {!isEmpty && (
        <>
          {/* KPI cards + NPS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, alignItems: 'start' }}>
            {[
              { label: 'Abiertos',   value: abiertos,   color: '#ef4444', icon: '🔴' },
              { label: 'Resueltos',  value: resueltos,  color: '#22c55e', icon: '🟢' },
              { label: 'En progreso',value: pendientes, color: '#f59e0b', icon: '🟡' },
              { label: 'SLA cumplido',value: `${slaCumplido}%`, color: slaCumplido >= 95 ? '#22c55e' : slaCumplido >= 80 ? '#f59e0b' : '#ef4444', icon: '📊' },
            ].map(card => (
              <div key={card.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 20px', backdropFilter: 'blur(8px)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${card.color}88, transparent)` }} />
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{card.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
              </div>
            ))}
            {/* NPS card */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 16px', backdropFilter: 'blur(8px)', gridColumn: 'span 2' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>NPS Score</div>
              <NpsGauge score={npsScore} />
            </div>
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer' }}
            >
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select
              value={filterSeveridad}
              onChange={e => setFilterSeveridad(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer' }}
            >
              <option value="">Toda severidad</option>
              {Object.entries(SEVERIDAD_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {(filterStatus || filterSeveridad) && (
              <button
                onClick={() => { setFilterStatus(''); setFilterSeveridad(''); }}
                style={{ padding: '4px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', fontSize: '0.68rem', cursor: 'pointer' }}
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Tabla */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden', backdropFilter: 'blur(8px)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {['Cliente', 'Severidad', 'Canal', 'Status', 'SLA (h)', 'Resolución (h)', 'Fecha'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.62rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket, idx) => {
                    const sevCfg = SEVERIDAD_CFG[ticket.severidad] || { label: ticket.severidad, color: '#94a3b8' };
                    const canalCfg = CANAL_CFG[ticket.canal] || { label: ticket.canal, color: '#94a3b8' };
                    const statusCfg = STATUS_CFG[ticket.status] || { label: ticket.status, color: '#94a3b8' };
                    const slaOk = ticket.resolucion_hours != null && ticket.sla_hours != null && ticket.resolucion_hours <= ticket.sla_hours;
                    return (
                      <tr
                        key={ticket.id}
                        style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.05)')}
                        onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)')}
                      >
                        <td style={{ padding: '10px 16px', color: '#e2e8f0', fontWeight: 500 }}>{ticket.cliente}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.62rem', fontWeight: 600, background: `${sevCfg.color}15`, color: sevCfg.color, border: `1px solid ${sevCfg.color}25` }}>{sevCfg.label}</span>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.62rem', fontWeight: 600, background: `${canalCfg.color}12`, color: canalCfg.color }}>{canalCfg.label}</span>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.62rem', fontWeight: 600, background: `${statusCfg.color}12`, color: statusCfg.color }}>{statusCfg.label}</span>
                        </td>
                        <td style={{ padding: '10px 16px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{ticket.sla_hours ?? '—'}</td>
                        <td style={{ padding: '10px 16px', fontVariantNumeric: 'tabular-nums' }}>
                          {ticket.resolucion_hours != null
                            ? <span style={{ color: slaOk ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{ticket.resolucion_hours}h</span>
                            : <span style={{ color: '#475569' }}>—</span>
                          }
                        </td>
                        <td style={{ padding: '10px 16px', color: '#475569', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                          {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style>{`@media (max-width: 640px) { table { min-width: 520px; } }`}</style>
    </div>
  );
}
