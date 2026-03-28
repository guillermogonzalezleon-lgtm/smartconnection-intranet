'use client';
import { useState, useEffect, useCallback } from 'react';

interface AndonSignal {
  id: string;
  project: string;
  area: string;
  status: 'green' | 'yellow' | 'red';
  score: string;
  detail: string;
  last_checked: string;
}

const SCORE_COLORS: Record<string, string> = {
  A: '#22c55e', B: '#00e5b0', C: '#f59e0b', D: '#f97316', F: '#ef4444',
};
const STATUS_COLORS: Record<string, string> = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444' };
const STATUS_ICONS: Record<string, string> = { green: '●', yellow: '▲', red: '■' };

export default function OpsCenterPage() {
  const [andon, setAndon] = useState<AndonSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const runHealthCheck = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/ops-center/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: 'arielito' }),
      });
      if (res.ok) {
        showToast('Health check completado');
        load();
      } else {
        showToast('Error ejecutando health check');
      }
    } catch { showToast('Error de conexión'); }
    setRunning(false);
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/ops-center?section=andon');
      if (res.ok) {
        const data = await res.json();
        setAndon(data.andon || []);
      }
    } catch (err) { console.error('Error cargando Andon:', err); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Agrupar por proyecto
  const byProject: Record<string, AndonSignal[]> = {};
  andon.forEach(s => {
    if (!byProject[s.project]) byProject[s.project] = [];
    byProject[s.project].push(s);
  });

  const projectStatus = (signals: AndonSignal[]) => {
    if (signals.some(s => s.status === 'red')) return 'red';
    if (signals.some(s => s.status === 'yellow')) return 'yellow';
    return 'green';
  };

  const globalStatus = () => {
    if (andon.length === 0) return null;
    if (andon.some(s => s.status === 'red')) return { label: 'ALERTA', color: '#ef4444', icon: '■' };
    if (andon.some(s => s.status === 'yellow')) return { label: 'DEGRADADO', color: '#f59e0b', icon: '▲' };
    return { label: 'OPERATIVO', color: '#22c55e', icon: '●' };
  };

  const global = globalStatus();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 34px)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        flexShrink: 0, background: 'rgba(15,22,35,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ height: 48, display: 'flex', alignItems: 'center', padding: '0 1.5rem', fontSize: '0.82rem' }}>
          <span style={{ color: '#fff', fontWeight: 700 }}>Andon Board</span>
          {global && (
            <span style={{
              marginLeft: 12, fontSize: '0.65rem', fontWeight: 700, padding: '3px 12px', borderRadius: 10,
              background: `${global.color}15`, color: global.color,
            }}>{global.icon} {global.label}</span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={runHealthCheck} disabled={running} style={{
              padding: '5px 14px', borderRadius: 8, border: 'none',
              cursor: running ? 'wait' : 'pointer',
              background: running ? 'rgba(0,229,176,0.15)' : 'rgba(0,229,176,0.08)',
              color: '#00e5b0', fontSize: '0.7rem', fontWeight: 700,
            }}>{running ? 'Checando...' : '▶ Health Check'}</button>
            <button onClick={load} style={{
              padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: '0.7rem', fontWeight: 600,
            }}>↻</button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>Cargando...</div>
        ) : Object.keys(byProject).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🚦</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>Andon Board</div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>
              Estado en tiempo real de los proyectos en producción.
              Ejecuta un health check para ver el semáforo.
            </div>
            <button onClick={runHealthCheck} disabled={running} style={{
              marginTop: 24, padding: '10px 28px', borderRadius: 10,
              border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #00e5b0, #0ea5e9)',
              color: '#fff', fontWeight: 700, fontSize: '0.85rem',
            }}>{running ? 'Ejecutando...' : 'Ejecutar primer health check'}</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {Object.entries(byProject).map(([project, signals]) => {
              const pStatus = projectStatus(signals);
              return (
                <div key={project} style={{
                  borderRadius: 14, padding: '20px 22px',
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${STATUS_COLORS[pStatus]}25`,
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
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{s.detail}</span>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, color: SCORE_COLORS[s.score] || '#64748b',
                        background: `${SCORE_COLORS[s.score] || '#64748b'}15`, padding: '1px 8px', borderRadius: 6,
                      }}>{s.score}</span>
                    </div>
                  ))}
                  <div style={{ fontSize: '0.6rem', color: '#475569', marginTop: 8 }}>
                    Último check: {signals[0]?.last_checked ? new Date(signals[0].last_checked).toLocaleString('es-CL') : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 60, right: 20, padding: '10px 20px', borderRadius: 10,
          background: 'rgba(15,22,35,0.95)', border: '1px solid rgba(0,229,176,0.2)',
          color: '#00e5b0', fontSize: '0.78rem', fontWeight: 600,
          backdropFilter: 'blur(12px)', zIndex: 200,
        }} role="status">{toast}</div>
      )}
    </div>
  );
}
