'use client';

import { useEffect, useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AreaScore {
  area: string;
  score: string;
  priority: string | null;
  debt_hours: number | null;
  risk: number | null;
  consequence: string | null;
  audit_date: string | null;
}

interface ProjectAudit {
  project: string;
  global_score: string;
  areas: AreaScore[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROJECTS = ['Intranet', 'Marketing', 'VOY', 'InfoPet', 'Marketplace'];
const AREAS = ['Arquitectura', 'API Contracts', 'Seguridad', 'Performance', 'DX', 'Observabilidad'];

const SCORE_COLORS: Record<string, string> = {
  A: '#22c55e',
  B: '#4ade80',
  C: '#f59e0b',
  D: '#f97316',
  F: '#ef4444',
};

const SCORE_BG: Record<string, string> = {
  A: 'rgba(34,197,94,0.15)',
  B: 'rgba(74,222,128,0.12)',
  C: 'rgba(245,158,11,0.15)',
  D: 'rgba(249,115,22,0.15)',
  F: 'rgba(239,68,68,0.15)',
};

const PRIORITY_LABEL: Record<string, string> = {
  P1: 'Bloqueante',
  P2: 'Importante',
  P3: 'Mejora',
  P4: 'Nice to have',
};

const SEED_DATA = [
  // Intranet
  { project: 'Intranet', area: 'Arquitectura',   score: 'B', priority: 'P4', debt_hours: 5,  risk: 2, consequence: 'Refactor menor pendiente' },
  { project: 'Intranet', area: 'API Contracts',  score: 'B', priority: 'P4', debt_hours: 5,  risk: 2, consequence: 'Algunos contratos sin documentar' },
  { project: 'Intranet', area: 'Seguridad',      score: 'C', priority: 'P3', debt_hours: 10, risk: 3, consequence: 'Headers de seguridad incompletos' },
  { project: 'Intranet', area: 'Performance',    score: 'A', priority: 'P4', debt_hours: 2,  risk: 1, consequence: 'Lighthouse >90 en todas las páginas' },
  { project: 'Intranet', area: 'DX',             score: 'B', priority: 'P4', debt_hours: 5,  risk: 2, consequence: 'CI/CD podría mejorarse' },
  { project: 'Intranet', area: 'Observabilidad', score: 'C', priority: 'P3', debt_hours: 10, risk: 3, consequence: 'Sin alertas de costo IA' },
  // Marketing
  { project: 'Marketing', area: 'Arquitectura',   score: 'C', priority: 'P3', debt_hours: 10, risk: 3, consequence: 'Componentes sin estructura modular' },
  { project: 'Marketing', area: 'API Contracts',  score: 'D', priority: 'P2', debt_hours: 20, risk: 4, consequence: 'APIs sin versionar, romperán en 3 meses' },
  { project: 'Marketing', area: 'Seguridad',      score: 'D', priority: 'P2', debt_hours: 20, risk: 4, consequence: 'CSP ausente, headers críticos faltantes' },
  { project: 'Marketing', area: 'Performance',    score: 'B', priority: 'P4', debt_hours: 5,  risk: 2, consequence: 'Imágenes sin optimizar en blog' },
  { project: 'Marketing', area: 'DX',             score: 'C', priority: 'P3', debt_hours: 10, risk: 3, consequence: 'Sin lint estricto en CI' },
  { project: 'Marketing', area: 'Observabilidad', score: 'F', priority: 'P1', debt_hours: 40, risk: 5, consequence: 'Sin uptime monitoring, incidentes invisibles' },
  // VOY
  { project: 'VOY', area: 'Arquitectura',   score: 'D', priority: 'P2', debt_hours: 20, risk: 4, consequence: 'Vanilla JS sin modularidad, difícil escalar' },
  { project: 'VOY', area: 'API Contracts',  score: 'F', priority: 'P1', debt_hours: 40, risk: 5, consequence: 'Sin contratos — cualquier cambio en Airtable rompe todo' },
  { project: 'VOY', area: 'Seguridad',      score: 'D', priority: 'P2', debt_hours: 20, risk: 4, consequence: 'Tokens Airtable expuestos en cliente' },
  { project: 'VOY', area: 'Performance',    score: 'C', priority: 'P3', debt_hours: 10, risk: 3, consequence: 'Bundle sin optimizar, carga lenta en móvil' },
  { project: 'VOY', area: 'DX',             score: 'D', priority: 'P2', debt_hours: 20, risk: 4, consequence: 'Sin TypeScript, bugs en producción silenciosos' },
  { project: 'VOY', area: 'Observabilidad', score: 'F', priority: 'P1', debt_hours: 40, risk: 5, consequence: 'Sin logs, sin métricas, errores invisibles' },
  // InfoPet
  { project: 'InfoPet', area: 'Arquitectura',   score: 'C', priority: 'P3', debt_hours: 10, risk: 3, consequence: 'Lógica de negocio mezclada con UI' },
  { project: 'InfoPet', area: 'API Contracts',  score: 'C', priority: 'P3', debt_hours: 10, risk: 3, consequence: 'Bsale y Jumpseller sin validación de schema' },
  { project: 'InfoPet', area: 'Seguridad',      score: 'C', priority: 'P3', debt_hours: 10, risk: 3, consequence: 'Webhooks sin verificación de firma' },
  { project: 'InfoPet', area: 'Performance',    score: 'C', priority: 'P3', debt_hours: 10, risk: 3, consequence: 'Sincronización de inventario bloquea UI' },
  { project: 'InfoPet', area: 'DX',             score: 'D', priority: 'P2', debt_hours: 20, risk: 4, consequence: 'Sin tests, regresiones frecuentes' },
  { project: 'InfoPet', area: 'Observabilidad', score: 'D', priority: 'P2', debt_hours: 20, risk: 4, consequence: 'Fallos de sync Bsale no alertan' },
  // Marketplace
  { project: 'Marketplace', area: 'Arquitectura',   score: 'D', priority: 'P2', debt_hours: 20, risk: 4, consequence: 'Monolito sin separación frontend/backend' },
  { project: 'Marketplace', area: 'API Contracts',  score: 'D', priority: 'P2', debt_hours: 20, risk: 4, consequence: 'MeLi API sin abstracción, cambios rompen todo' },
  { project: 'Marketplace', area: 'Seguridad',      score: 'D', priority: 'P2', debt_hours: 20, risk: 4, consequence: 'Rate limiting ausente, riesgo de ban MeLi' },
  { project: 'Marketplace', area: 'Performance',    score: 'D', priority: 'P2', debt_hours: 20, risk: 4, consequence: 'Scraping Helium 10 sin cache, lento y caro' },
  { project: 'Marketplace', area: 'DX',             score: 'F', priority: 'P1', debt_hours: 40, risk: 5, consequence: 'Sin CI/CD, deploys manuales con errores' },
  { project: 'Marketplace', area: 'Observabilidad', score: 'F', priority: 'P1', debt_hours: 40, risk: 5, consequence: 'Sin ningún monitoreo, downtime invisible' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreLabel(s: string) {
  return s === 'F' ? 'Crítico' : s === 'D' ? 'Malo' : s === 'C' ? 'Regular' : s === 'B' ? 'Bueno' : 'Excelente';
}

function trafficLight(s: string) {
  if (s === 'A' || s === 'B') return '#22c55e';
  if (s === 'C') return '#f59e0b';
  return '#ef4444';
}

function getArea(project: ProjectAudit, areaName: string): AreaScore | undefined {
  return project.areas.find(a => a.area === areaName);
}

function totalDebt(project: ProjectAudit): number {
  return project.areas.reduce((acc, a) => acc + (a.debt_hours || 0), 0);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBadge({ score, size = 'md' }: { score: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: { fontSize: '0.65rem', padding: '2px 6px', minWidth: 22 }, md: { fontSize: '0.72rem', padding: '3px 8px', minWidth: 26 }, lg: { fontSize: '0.9rem', padding: '4px 12px', minWidth: 32 } };
  const s = sizes[size];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      fontFamily: 'monospace',
      borderRadius: 6,
      background: SCORE_BG[score] || SCORE_BG.F,
      color: SCORE_COLORS[score] || SCORE_COLORS.F,
      border: `1px solid ${SCORE_COLORS[score] || SCORE_COLORS.F}33`,
      ...s,
    }}>
      {score}
    </span>
  );
}

function RiskDots({ risk }: { risk: number }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: i <= risk
            ? risk >= 4 ? '#ef4444' : risk === 3 ? '#f59e0b' : '#22c55e'
            : 'rgba(255,255,255,0.08)',
        }} />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AuditDashboard() {
  const [projects, setProjects] = useState<ProjectAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/governance/audit');
      if (!res.ok) throw new Error('Error al cargar');
      const data = await res.json();
      setProjects(data.projects || []);
      setEmpty(data.empty || data.projects?.length === 0);
    } catch {
      setEmpty(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSeed() {
    setSeeding(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const promises = SEED_DATA.map(row =>
        fetch('/api/governance/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...row, audit_date: today }),
        })
      );
      await Promise.all(promises);
      await load();
    } catch {
      // silencioso
    } finally {
      setSeeding(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: '#475569' }}>
        <div style={{ width: 32, height: 32, border: '2px solid rgba(167,139,250,0.3)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: '0.8rem' }}>Cargando Audit Report...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (empty) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>📊</div>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', margin: '0 0 8px' }}>Sin datos de auditoría</h3>
        <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 24px', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
          No hay scores registrados. Genera datos de ejemplo para explorar el dashboard.
        </p>
        <button
          onClick={handleSeed}
          disabled={seeding}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', borderRadius: 8,
            background: seeding ? 'rgba(167,139,250,0.1)' : 'rgba(167,139,250,0.2)',
            border: '1px solid rgba(167,139,250,0.4)',
            color: seeding ? '#64748b' : '#c4b5fd',
            fontSize: '0.8rem', fontWeight: 600,
            cursor: seeding ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {seeding ? (
            <><span style={{ width: 14, height: 14, border: '2px solid rgba(167,139,250,0.3)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />Generando...</>
          ) : (
            <><span>🧪</span>Generar auditoría de ejemplo</>
          )}
        </button>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Ordenar proyectos por score global (peor primero)
  const scoreOrder: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, F: 4 };
  const sorted = [...projects].sort((a, b) => (scoreOrder[b.global_score] || 0) - (scoreOrder[a.global_score] || 0));

  // Todas las áreas con deuda, ordenadas por prioridad
  const allDebt = projects.flatMap(p =>
    p.areas
      .filter(a => (a.debt_hours || 0) > 0)
      .map(a => ({ ...a, project: p.project }))
  ).sort((a, b) => {
    const pOrder: Record<string, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };
    return (pOrder[a.priority || 'P4'] || 3) - (pOrder[b.priority || 'P4'] || 3);
  });

  const maxDebt = Math.max(...allDebt.map(d => d.debt_hours || 0), 1);

  const selectedData = selectedProject ? projects.find(p => p.project === selectedProject) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Semáforo por proyecto ─────────────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>
          Estado por proyecto
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {sorted.map(p => {
            const color = trafficLight(p.global_score);
            const isSelected = selectedProject === p.project;
            return (
              <button
                key={p.project}
                onClick={() => setSelectedProject(isSelected ? null : p.project)}
                style={{
                  background: isSelected ? `${SCORE_BG[p.global_score]}` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isSelected ? SCORE_COLORS[p.global_score] + '55' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 12,
                  padding: '16px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: color,
                    boxShadow: `0 0 8px ${color}`,
                    display: 'inline-block',
                  }} />
                  <ScoreBadge score={p.global_score} size="lg" />
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>{p.project}</div>
                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{scoreLabel(p.global_score)}</div>
                <div style={{ fontSize: '0.62rem', color: '#475569', marginTop: 6 }}>
                  {totalDebt(p)}h deuda · {p.areas.filter(a => a.priority === 'P1').length} críticas
                </div>
              </button>
            );
          })}
        </div>
        {selectedProject && (
          <p style={{ fontSize: '0.65rem', color: '#64748b', margin: '8px 0 0', textAlign: 'right' }}>
            Haz click en el proyecto para ver detalles en la matriz
          </p>
        )}
      </section>

      {/* ── Matriz proyecto x área ───────────────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>
          Matriz de scores
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: '#475569', fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(255,255,255,0.06)', minWidth: 110 }}>
                  Proyecto
                </th>
                {AREAS.map(a => (
                  <th key={a} style={{ textAlign: 'center', padding: '8px 8px', color: '#475569', fontWeight: 600, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid rgba(255,255,255,0.06)', minWidth: 90 }}>
                    {a}
                  </th>
                ))}
                <th style={{ textAlign: 'center', padding: '8px 8px', color: '#475569', fontWeight: 600, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid rgba(255,255,255,0.06)', minWidth: 70 }}>
                  Global
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, idx) => {
                const isSelected = selectedProject === p.project;
                return (
                  <tr
                    key={p.project}
                    style={{
                      background: isSelected ? 'rgba(167,139,250,0.05)' : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onClick={() => setSelectedProject(isSelected ? null : p.project)}
                  >
                    <td style={{ padding: '10px 12px', color: '#e2e8f0', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.04)', whiteSpace: 'nowrap' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: trafficLight(p.global_score), display: 'inline-block', marginRight: 7, boxShadow: `0 0 5px ${trafficLight(p.global_score)}` }} />
                      {p.project}
                    </td>
                    {AREAS.map(areaName => {
                      const area = getArea(p, areaName);
                      return (
                        <td key={areaName} style={{ textAlign: 'center', padding: '10px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          {area ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                              <ScoreBadge score={area.score} size="sm" />
                              {area.priority && (
                                <span style={{
                                  fontSize: '0.55rem', fontWeight: 600,
                                  color: area.priority === 'P1' ? '#ef4444' : area.priority === 'P2' ? '#f97316' : area.priority === 'P3' ? '#f59e0b' : '#64748b',
                                }}>
                                  {area.priority}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#334155', fontSize: '0.65rem' }}>—</span>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'center', padding: '10px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <ScoreBadge score={p.global_score} size="md" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Detalle de proyecto seleccionado ─────────────────────────────────── */}
      {selectedData && (
        <section>
          <h2 style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>
            Detalle — {selectedData.project}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {selectedData.areas.map(area => (
              <div key={area.area} style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${SCORE_COLORS[area.score] || SCORE_COLORS.F}22`,
                borderLeft: `3px solid ${SCORE_COLORS[area.score] || SCORE_COLORS.F}`,
                borderRadius: 10,
                padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0' }}>{area.area}</span>
                  <ScoreBadge score={area.score} size="sm" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  {area.priority && (
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                      background: area.priority === 'P1' ? 'rgba(239,68,68,0.15)' : area.priority === 'P2' ? 'rgba(249,115,22,0.15)' : area.priority === 'P3' ? 'rgba(245,158,11,0.15)' : 'rgba(100,116,139,0.15)',
                      color: area.priority === 'P1' ? '#ef4444' : area.priority === 'P2' ? '#f97316' : area.priority === 'P3' ? '#f59e0b' : '#64748b',
                    }}>
                      {area.priority} · {PRIORITY_LABEL[area.priority] || area.priority}
                    </span>
                  )}
                  {area.risk != null && <RiskDots risk={area.risk} />}
                </div>
                {area.consequence && (
                  <p style={{ fontSize: '0.68rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>{area.consequence}</p>
                )}
                {area.debt_hours != null && (
                  <div style={{ marginTop: 8, fontSize: '0.62rem', color: '#64748b' }}>
                    {area.debt_hours}h estimadas de deuda
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Deuda técnica — barras ───────────────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>
          Deuda técnica por área (horas)
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allDebt.slice(0, 12).map((d, i) => {
            const pct = ((d.debt_hours || 0) / maxDebt) * 100;
            const color = SCORE_COLORS[d.score] || SCORE_COLORS.F;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: '0 0 140px', fontSize: '0.68rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 500, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>{d.project}</span>
                  <span style={{ color: '#64748b', flexShrink: 0 }}>{d.area.length > 10 ? d.area.slice(0, 9) + '…' : d.area}</span>
                </div>
                <div style={{ flex: 1, height: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: `linear-gradient(90deg, ${color}33, ${color}66)`,
                    borderRight: `2px solid ${color}`,
                    borderRadius: 4,
                    transition: 'width 0.4s ease',
                    display: 'flex', alignItems: 'center',
                  }} />
                </div>
                <div style={{ flex: '0 0 50px', textAlign: 'right', fontSize: '0.68rem', fontWeight: 600, color }}>
                  {d.debt_hours}h
                </div>
                {d.priority && (
                  <div style={{
                    flex: '0 0 28px', fontSize: '0.6rem', fontWeight: 700,
                    color: d.priority === 'P1' ? '#ef4444' : d.priority === 'P2' ? '#f97316' : d.priority === 'P3' ? '#f59e0b' : '#64748b',
                  }}>
                    {d.priority}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {allDebt.length > 12 && (
          <p style={{ fontSize: '0.65rem', color: '#475569', margin: '10px 0 0', textAlign: 'right' }}>
            +{allDebt.length - 12} áreas más
          </p>
        )}
      </section>

      {/* ── Risk heatmap ─────────────────────────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>
          Risk heatmap (1-5)
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '0.7rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 12px', color: '#475569', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.06)', minWidth: 110 }} />
                {AREAS.map(a => (
                  <th key={a} style={{ textAlign: 'center', padding: '6px 10px', color: '#475569', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid rgba(255,255,255,0.06)', minWidth: 80 }}>
                    {a.replace(' ', '\u200B')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, idx) => (
                <tr key={p.project} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <td style={{ padding: '8px 12px', color: '#94a3b8', fontWeight: 500, borderBottom: '1px solid rgba(255,255,255,0.04)', whiteSpace: 'nowrap', fontSize: '0.72rem' }}>
                    {p.project}
                  </td>
                  {AREAS.map(areaName => {
                    const area = getArea(p, areaName);
                    const risk = area?.risk ?? 0;
                    const alpha = risk > 0 ? 0.1 + risk * 0.14 : 0;
                    const riskColor = risk >= 4 ? `rgba(239,68,68,${alpha})` : risk === 3 ? `rgba(245,158,11,${alpha})` : risk > 0 ? `rgba(34,197,94,${alpha})` : 'transparent';
                    const textColor = risk >= 4 ? '#ef4444' : risk === 3 ? '#f59e0b' : risk > 0 ? '#4ade80' : '#334155';
                    return (
                      <td key={areaName} style={{
                        textAlign: 'center', padding: '8px 10px',
                        background: riskColor,
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        color: textColor,
                        fontWeight: risk >= 4 ? 700 : 500,
                        fontSize: '0.78rem',
                        transition: 'background 0.15s',
                      }}>
                        {risk > 0 ? risk : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Leyenda */}
        <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Bajo (1-2)', color: '#4ade80' },
            { label: 'Medio (3)', color: '#f59e0b' },
            { label: 'Alto (4-5)', color: '#ef4444' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.62rem', color: '#64748b' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: item.color + '44', border: `1px solid ${item.color}55`, display: 'inline-block' }} />
              {item.label}
            </div>
          ))}
        </div>
      </section>

      <style>{`
        @media (max-width: 640px) {
          table { font-size: 0.65rem; }
        }
      `}</style>
    </div>
  );
}
