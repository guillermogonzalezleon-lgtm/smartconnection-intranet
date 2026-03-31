'use client';

import { useEffect, useState, useCallback } from 'react';

interface InfraCost {
  id: string;
  servicio: string;
  categoria: 'aws' | 'vercel' | 'supabase' | 'otros';
  mes: string;
  costo_usd: number;
  notas?: string;
}

const CATEGORIA_CFG: Record<string, { label: string; color: string }> = {
  aws:      { label: 'AWS',      color: '#f59e0b' },
  vercel:   { label: 'Vercel',   color: '#f1f5f9' },
  supabase: { label: 'Supabase', color: '#22c55e' },
  otros:    { label: 'Otros',    color: '#94a3b8' },
};

const SEED_COSTS = [
  { servicio: 'AWS Amplify',    categoria: 'aws',      mes: '2026-03', costo_usd: 5.00,  notas: 'Intranet + InfoPet' },
  { servicio: 'AWS S3',         categoria: 'aws',      mes: '2026-03', costo_usd: 2.00,  notas: 'Marketing assets' },
  { servicio: 'AWS CloudFront', categoria: 'aws',      mes: '2026-03', costo_usd: 3.00,  notas: 'CDN Marketing' },
  { servicio: 'AWS Route 53',   categoria: 'aws',      mes: '2026-03', costo_usd: 0.50,  notas: 'DNS smconnection.cl' },
  { servicio: 'Vercel',         categoria: 'vercel',   mes: '2026-03', costo_usd: 0.00,  notas: 'Free tier — VOY + Marketing' },
  { servicio: 'Supabase',       categoria: 'supabase', mes: '2026-03', costo_usd: 0.00,  notas: 'Free tier — 2 proyectos' },
];

function formatUSD(v: number): string {
  return v === 0 ? 'Gratis' : `$${v.toFixed(2)}`;
}

export default function InfraCostsDashboard() {
  const [costs, setCosts] = useState<InfraCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [activeMes, setActiveMes] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/governance/infra-costs');
      if (!res.ok) throw new Error('Error');
      const data = await res.json();
      setCosts(data.costs || []);
    } catch {
      setCosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Seleccionar mes más reciente por defecto
  useEffect(() => {
    if (costs.length > 0 && !activeMes) {
      const meses = [...new Set(costs.map(c => c.mes))].sort((a, b) => b.localeCompare(a));
      setActiveMes(meses[0]);
    }
  }, [costs, activeMes]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await fetch('/api/governance/infra-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(SEED_COSTS),
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
        <div style={{ width: 32, height: 32, border: '2px solid rgba(245,158,11,0.3)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: '0.8rem' }}>Cargando costos de infra...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isEmpty = costs.length === 0;
  const meses = [...new Set(costs.map(c => c.mes))].sort((a, b) => b.localeCompare(a));
  const mesCosts = activeMes ? costs.filter(c => c.mes === activeMes) : costs;
  const totalMes = mesCosts.reduce((s, c) => s + (c.costo_usd || 0), 0);
  const maxCost = Math.max(...mesCosts.map(c => c.costo_usd), 1);

  // Agrupar por categoría
  const porCategoria = Object.keys(CATEGORIA_CFG).map(cat => ({
    cat,
    total: mesCosts.filter(c => c.categoria === cat).reduce((s, c) => s + c.costo_usd, 0),
  })).filter(x => x.total > 0);

  const sorted = [...mesCosts].sort((a, b) => b.costo_usd - a.costo_usd);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Costos de Infraestructura</h2>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
            {isEmpty ? 'Sin registros — carga datos de ejemplo' : `${costs.length} registro${costs.length !== 1 ? 's' : ''} de costos`}
          </p>
        </div>
        {isEmpty && (
          <button
            onClick={handleSeed}
            disabled={seeding}
            style={{ padding: '8px 18px', borderRadius: 8, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', color: '#fcd34d', fontSize: '0.75rem', fontWeight: 600, cursor: seeding ? 'wait' : 'pointer', opacity: seeding ? 0.7 : 1 }}
          >
            {seeding ? 'Cargando...' : '+ Cargar costos ejemplo'}
          </button>
        )}
      </div>

      {/* Estado vacío */}
      {isEmpty && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 16, padding: '64px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '2.5rem' }}>💰</span>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Sin costos registrados</h3>
          <p style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: 380, lineHeight: 1.6, margin: 0 }}>
            No hay registros de costos de infraestructura. Carga datos de ejemplo para ver el desglose mensual.
          </p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            style={{ marginTop: 8, padding: '10px 24px', borderRadius: 10, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: '#fcd34d', fontSize: '0.8rem', fontWeight: 600, cursor: seeding ? 'wait' : 'pointer' }}
          >
            {seeding ? 'Cargando datos...' : 'Cargar costos de ejemplo'}
          </button>
        </div>
      )}

      {!isEmpty && (
        <>
          {/* Selector de mes */}
          {meses.length > 1 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {meses.map(m => (
                <button
                  key={m}
                  onClick={() => setActiveMes(m)}
                  style={{
                    padding: '5px 14px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                    border: '1px solid', borderColor: activeMes === m ? '#f59e0b' : 'rgba(255,255,255,0.08)',
                    background: activeMes === m ? 'rgba(245,158,11,0.15)' : 'transparent',
                    color: activeMes === m ? '#fcd34d' : '#64748b',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {/* Total mensual */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #f59e0b, transparent)' }} />
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Total {activeMes || 'mes'}</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fcd34d', lineHeight: 1 }}>${totalMes.toFixed(2)}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 4 }}>USD / mes</div>
            </div>
            {porCategoria.map(({ cat, total }) => {
              const cfg = CATEGORIA_CFG[cat] || { label: cat, color: '#94a3b8' };
              return (
                <div key={cat} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 20px', backdropFilter: 'blur(8px)' }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{cfg.label}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: cfg.color }}>{total === 0 ? 'Gratis' : `$${total.toFixed(2)}`}</div>
                </div>
              );
            })}
          </div>

          {/* Barras horizontales por servicio */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '20px 24px', backdropFilter: 'blur(8px)' }}>
            <h3 style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 18px' }}>Desglose por servicio</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sorted.map(cost => {
                const catCfg = CATEGORIA_CFG[cost.categoria] || { label: cost.categoria, color: '#94a3b8' };
                const barPct = totalMes > 0 ? (cost.costo_usd / maxCost) * 100 : 0;
                return (
                  <div key={cost.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: '0 0 140px', fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cost.servicio}
                    </div>
                    <div style={{ flex: 1, height: 26, background: 'rgba(255,255,255,0.04)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                      {cost.costo_usd > 0 ? (
                        <div style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0,
                          width: `${barPct}%`,
                          background: `linear-gradient(90deg, ${catCfg.color}cc, ${catCfg.color}55)`,
                          borderRadius: 6, minWidth: 4, transition: 'width 0.5s ease',
                        }} />
                      ) : null}
                      <div style={{ position: 'absolute', left: 10, top: 0, bottom: 0, display: 'flex', alignItems: 'center', fontSize: '0.62rem', fontWeight: 500, color: cost.costo_usd > 0 ? '#f1f5f9' : '#475569', zIndex: 1 }}>
                        {cost.notas || ''}
                      </div>
                    </div>
                    <div style={{ flex: '0 0 60px', fontSize: '0.72rem', fontWeight: 700, color: catCfg.color, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {formatUSD(cost.costo_usd)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
