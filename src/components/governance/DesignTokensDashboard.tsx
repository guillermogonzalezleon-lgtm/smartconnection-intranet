'use client';

import { useEffect, useState, useCallback } from 'react';

interface DesignToken {
  id: string;
  nombre: string;
  categoria: 'color' | 'typography' | 'spacing' | 'radius' | 'shadow' | 'otros';
  valor: string;
  descripcion?: string;
}

const SEED_TOKENS: Omit<DesignToken, 'id'>[] = [
  // Colors
  { nombre: '--dark-bg',        categoria: 'color',      valor: '#0a0f1a',   descripcion: 'Fondo principal dark' },
  { nombre: '--dark-surface',   categoria: 'color',      valor: '#0f1629',   descripcion: 'Superficie de cards' },
  { nombre: '--dark-border',    categoria: 'color',      valor: 'rgba(255,255,255,0.06)', descripcion: 'Borde sutil' },
  { nombre: '--primary',        categoria: 'color',      valor: '#a78bfa',   descripcion: 'Color primario violeta' },
  { nombre: '--primary-light',  categoria: 'color',      valor: '#c4b5fd',   descripcion: 'Primario claro' },
  { nombre: '--accent-green',   categoria: 'color',      valor: '#22c55e',   descripcion: 'Verde éxito' },
  { nombre: '--accent-amber',   categoria: 'color',      valor: '#f59e0b',   descripcion: 'Ámbar advertencia' },
  { nombre: '--accent-red',     categoria: 'color',      valor: '#ef4444',   descripcion: 'Rojo error' },
  { nombre: '--text-primary',   categoria: 'color',      valor: '#f1f5f9',   descripcion: 'Texto principal' },
  { nombre: '--text-secondary', categoria: 'color',      valor: '#94a3b8',   descripcion: 'Texto secundario' },
  { nombre: '--text-muted',     categoria: 'color',      valor: '#475569',   descripcion: 'Texto muy tenue' },
  // Typography
  { nombre: 'text-xs',          categoria: 'typography', valor: '0.65rem',   descripcion: 'Extra small — labels' },
  { nombre: 'text-sm',          categoria: 'typography', valor: '0.75rem',   descripcion: 'Small — body secundario' },
  { nombre: 'text-base',        categoria: 'typography', valor: '0.875rem',  descripcion: 'Base — body principal' },
  { nombre: 'text-lg',          categoria: 'typography', valor: '1rem',      descripcion: 'Large — subtítulos' },
  { nombre: 'text-xl',          categoria: 'typography', valor: '1.25rem',   descripcion: 'XL — títulos sección' },
  { nombre: 'text-2xl',         categoria: 'typography', valor: '1.5rem',    descripcion: '2XL — títulos página' },
  // Spacing
  { nombre: 'space-1',          categoria: 'spacing',    valor: '4px',       descripcion: 'Espaciado mínimo' },
  { nombre: 'space-2',          categoria: 'spacing',    valor: '8px',       descripcion: 'Espaciado pequeño' },
  { nombre: 'space-3',          categoria: 'spacing',    valor: '12px',      descripcion: 'Espaciado base' },
  { nombre: 'space-4',          categoria: 'spacing',    valor: '16px',      descripcion: 'Espaciado estándar' },
  { nombre: 'space-6',          categoria: 'spacing',    valor: '24px',      descripcion: 'Espaciado grande' },
  { nombre: 'space-8',          categoria: 'spacing',    valor: '32px',      descripcion: 'Espaciado XL' },
  { nombre: 'space-12',         categoria: 'spacing',    valor: '48px',      descripcion: 'Espaciado 2XL' },
  // Radius
  { nombre: 'radius-sm',        categoria: 'radius',     valor: '6px',       descripcion: 'Borde redondeado pequeño' },
  { nombre: 'radius-md',        categoria: 'radius',     valor: '10px',      descripcion: 'Borde redondeado estándar' },
  { nombre: 'radius-lg',        categoria: 'radius',     valor: '14px',      descripcion: 'Borde redondeado grande' },
  { nombre: 'radius-xl',        categoria: 'radius',     valor: '20px',      descripcion: 'Borde redondeado XL' },
  { nombre: 'radius-full',      categoria: 'radius',     valor: '9999px',    descripcion: 'Borde completamente circular' },
];

function isColor(valor: string): boolean {
  return valor.startsWith('#') || valor.startsWith('rgb') || valor.startsWith('hsl');
}

export default function DesignTokensDashboard() {
  const [tokens, setTokens] = useState<DesignToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/governance/design-tokens');
      if (!res.ok) throw new Error('Error');
      const data = await res.json();
      setTokens(data.tokens || []);
    } catch {
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await fetch('/api/governance/design-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(SEED_TOKENS),
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
        <div style={{ width: 32, height: 32, border: '2px solid rgba(167,139,250,0.3)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: '0.8rem' }}>Cargando design tokens...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isEmpty = tokens.length === 0;
  const colors     = tokens.filter(t => t.categoria === 'color');
  const typography = tokens.filter(t => t.categoria === 'typography');
  const spacing    = tokens.filter(t => t.categoria === 'spacing');
  const radius     = tokens.filter(t => t.categoria === 'radius');
  const others     = tokens.filter(t => !['color', 'typography', 'spacing', 'radius'].includes(t.categoria));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>Design Tokens</h2>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
            {isEmpty ? 'Sin tokens — carga los de Panchita' : `${tokens.length} token${tokens.length !== 1 ? 's' : ''} registrados`}
          </p>
        </div>
        {isEmpty && (
          <button
            onClick={handleSeed}
            disabled={seeding}
            style={{ padding: '8px 18px', borderRadius: 8, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.35)', color: '#c4b5fd', fontSize: '0.75rem', fontWeight: 600, cursor: seeding ? 'wait' : 'pointer', opacity: seeding ? 0.7 : 1 }}
          >
            {seeding ? 'Cargando...' : '+ Cargar tokens Panchita'}
          </button>
        )}
      </div>

      {/* Estado vacío */}
      {isEmpty && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 16, padding: '64px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '2.5rem' }}>🎨</span>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Sin design tokens</h3>
          <p style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: 380, lineHeight: 1.6, margin: 0 }}>
            La biblioteca de tokens de diseño está vacía. Carga los tokens de Panchita para ver colores, tipografía, espaciado y radii.
          </p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            style={{ marginTop: 8, padding: '10px 24px', borderRadius: 10, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.4)', color: '#c4b5fd', fontSize: '0.8rem', fontWeight: 600, cursor: seeding ? 'wait' : 'pointer' }}
          >
            {seeding ? 'Cargando datos...' : 'Cargar tokens de Panchita'}
          </button>
        </div>
      )}

      {!isEmpty && (
        <>
          {/* COLORES */}
          {colors.length > 0 && (
            <section>
              <h3 style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>Colores</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                {colors.map(token => (
                  <div
                    key={token.id}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden', transition: 'transform 0.12s ease' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    {/* Swatch */}
                    <div style={{ height: 56, background: isColor(token.valor) ? token.valor : 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }} />
                    {/* Info */}
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 3, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{token.nombre}</div>
                      <div style={{ fontSize: '0.6rem', color: '#64748b', fontFamily: 'monospace', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{token.valor}</div>
                      {token.descripcion && <div style={{ fontSize: '0.58rem', color: '#475569', lineHeight: 1.3 }}>{token.descripcion}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TIPOGRAFÍA */}
          {typography.length > 0 && (
            <section>
              <h3 style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>Tipografía</h3>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
                {typography.map((token, idx) => (
                  <div
                    key={token.id}
                    style={{
                      padding: '14px 20px',
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 16,
                      borderBottom: idx < typography.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}
                  >
                    <span style={{ flex: '0 0 80px', fontSize: '0.62rem', fontWeight: 700, color: '#475569', fontFamily: 'monospace' }}>{token.nombre}</span>
                    <span style={{ flex: '0 0 60px', fontSize: '0.6rem', color: '#64748b', fontFamily: 'monospace' }}>{token.valor}</span>
                    <span style={{ color: '#e2e8f0', fontSize: token.valor, lineHeight: 1.2 }}>
                      El veloz zorro marrón
                    </span>
                    {token.descripcion && (
                      <span style={{ marginLeft: 'auto', fontSize: '0.62rem', color: '#475569', flexShrink: 0 }}>{token.descripcion}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SPACING */}
          {spacing.length > 0 && (
            <section>
              <h3 style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>Espaciado</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
                {spacing.map(token => {
                  const px = parseInt(token.valor, 10);
                  return (
                    <div key={token.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: Math.max(px, 4),
                        height: Math.max(px, 4),
                        maxWidth: 80,
                        maxHeight: 80,
                        background: 'rgba(167,139,250,0.2)',
                        border: '1px solid rgba(167,139,250,0.35)',
                        borderRadius: 4,
                      }} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#c4b5fd', fontFamily: 'monospace' }}>{token.nombre}</div>
                        <div style={{ fontSize: '0.58rem', color: '#64748b' }}>{token.valor}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* RADIUS */}
          {radius.length > 0 && (
            <section>
              <h3 style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>Border Radius</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
                {radius.map(token => (
                  <div key={token.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 64,
                      height: 64,
                      background: 'rgba(96,165,250,0.12)',
                      border: '2px solid rgba(96,165,250,0.35)',
                      borderRadius: token.valor === '9999px' ? '9999px' : token.valor,
                    }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#93c5fd', fontFamily: 'monospace' }}>{token.nombre}</div>
                      <div style={{ fontSize: '0.58rem', color: '#64748b' }}>{token.valor}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* OTROS */}
          {others.length > 0 && (
            <section>
              <h3 style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>Otros tokens</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {others.map(token => (
                  <div key={token.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#e2e8f0', fontFamily: 'monospace' }}>{token.nombre}</span>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontFamily: 'monospace' }}>{token.valor}</span>
                    </div>
                    {token.descripcion && <span style={{ fontSize: '0.65rem', color: '#475569' }}>{token.descripcion}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
