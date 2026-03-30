'use client';

import { useEffect, useState, useRef } from 'react';

interface TechRadarItem {
  id: string;
  name: string;
  ring: 'adopt' | 'trial' | 'assess' | 'hold';
  quadrant: 'frameworks' | 'languages' | 'platforms' | 'tools';
  description: string;
  moved: 'none' | 'up' | 'down';
}

const RING_CONFIG = {
  adopt: { color: '#22c55e', label: 'Adopt', radius: 0.22, textColor: '#86efac' },
  trial: { color: '#3b82f6', label: 'Trial', radius: 0.42, textColor: '#93c5fd' },
  assess: { color: '#f59e0b', label: 'Assess', radius: 0.63, textColor: '#fcd34d' },
  hold: { color: '#ef4444', label: 'Hold', radius: 0.84, textColor: '#fca5a5' },
};

const QUADRANT_CONFIG = {
  frameworks: { label: 'Frameworks', angle: [0, 90] },
  languages: { label: 'Languages', angle: [90, 180] },
  platforms: { label: 'Platforms', angle: [180, 270] },
  tools: { label: 'Tools', angle: [270, 360] },
};

const RING_ORDER: Array<'adopt' | 'trial' | 'assess' | 'hold'> = ['adopt', 'trial', 'assess', 'hold'];

// Deterministic position: seed based on id to avoid layout shift
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h ^= h << 13;
    h ^= h >> 17;
    h ^= h << 5;
    return ((h >>> 0) / 4294967296);
  };
}

function getBlipPosition(item: TechRadarItem, cx: number, cy: number, maxR: number) {
  const ring = RING_CONFIG[item.ring];
  const quad = QUADRANT_CONFIG[item.quadrant];
  const rng = seededRandom(item.id + item.name);

  const angleStart = quad.angle[0];
  const angleEnd = quad.angle[1];
  const angle = angleStart + rng() * (angleEnd - angleStart);
  const angleRad = (angle - 90) * (Math.PI / 180);

  const ringIdx = RING_ORDER.indexOf(item.ring);
  const innerR = ringIdx === 0 ? 0.03 : RING_CONFIG[RING_ORDER[ringIdx - 1]].radius + 0.03;
  const outerR = ring.radius - 0.03;
  const r = (innerR + rng() * (outerR - innerR)) * maxR;

  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

export default function TechRadarDashboard() {
  const [items, setItems] = useState<TechRadarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ item: TechRadarItem; x: number; y: number } | null>(null);
  const [activeRing, setActiveRing] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    fetch('/api/governance/tech-radar')
      .then(r => r.ok ? r.json() : Promise.reject('API error'))
      .then(data => {
        setItems(data.items ?? []);
      })
      .catch(() => setError('No se pudieron cargar los datos del Tech Radar'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: '#475569' }}>
        <div style={{
          width: 32, height: 32,
          border: '2px solid rgba(167,139,250,0.3)',
          borderTopColor: '#a78bfa',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 12px',
        }} />
        <p style={{ fontSize: '0.8rem' }}>Cargando Tech Radar...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: '#ef4444' }}>
        <p style={{ fontSize: '0.85rem' }}>{error}</p>
      </div>
    );
  }

  const SIZE = 560;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const maxR = SIZE / 2 - 16;

  const filteredItems = activeRing ? items.filter(i => i.ring === activeRing) : items;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* SVG Radar */}
      <div style={{ position: 'relative', width: '100%', maxWidth: SIZE, margin: '0 auto' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          aria-label="Tech Radar"
        >
          {/* Background */}
          <rect width={SIZE} height={SIZE} fill="transparent" />

          {/* Quadrant dividers */}
          <line x1={cx} y1={cy - maxR - 8} x2={cx} y2={cy + maxR + 8} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <line x1={cx - maxR - 8} y1={cy} x2={cx + maxR + 8} y2={cy} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />

          {/* Rings — from outermost to innermost so inner fills over outer */}
          {RING_ORDER.slice().reverse().map((ring) => {
            const cfg = RING_CONFIG[ring];
            return (
              <circle
                key={ring}
                cx={cx}
                cy={cy}
                r={cfg.radius * maxR}
                fill={`${cfg.color}0a`}
                stroke={cfg.color}
                strokeWidth={1}
                strokeOpacity={0.25}
              />
            );
          })}

          {/* Ring labels inside the ring at 45deg */}
          {RING_ORDER.map((ring, i) => {
            const cfg = RING_CONFIG[ring];
            const prevR = i === 0 ? 0 : RING_CONFIG[RING_ORDER[i - 1]].radius * maxR;
            const thisR = cfg.radius * maxR;
            const labelR = prevR + (thisR - prevR) * 0.5;
            const angleRad = -45 * (Math.PI / 180);
            const lx = cx + labelR * Math.cos(angleRad);
            const ly = cy + labelR * Math.sin(angleRad);
            return (
              <text
                key={ring}
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={cfg.color}
                fillOpacity={0.5}
                fontSize={10}
                fontWeight={600}
                fontFamily="Inter, system-ui, sans-serif"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {cfg.label.toUpperCase()}
              </text>
            );
          })}

          {/* Quadrant labels */}
          {(Object.entries(QUADRANT_CONFIG) as [keyof typeof QUADRANT_CONFIG, typeof QUADRANT_CONFIG[keyof typeof QUADRANT_CONFIG]][]).map(([key, quad]) => {
            const midAngle = (quad.angle[0] + quad.angle[1]) / 2;
            const rad = (midAngle - 90) * (Math.PI / 180);
            const labelR = maxR + 14;
            const lx = cx + labelR * Math.cos(rad);
            const ly = cy + labelR * Math.sin(rad);
            return (
              <text
                key={key}
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#94a3b8"
                fontSize={10}
                fontWeight={700}
                fontFamily="Inter, system-ui, sans-serif"
                letterSpacing="0.06em"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {quad.label.toUpperCase()}
              </text>
            );
          })}

          {/* Blips */}
          {filteredItems.map((item) => {
            const { x, y } = getBlipPosition(item, cx, cy, maxR);
            const ringCfg = RING_CONFIG[item.ring];
            const isHovered = tooltip?.item.id === item.id;
            const r = isHovered ? 7 : 5;

            return (
              <g
                key={item.id}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  const svgRect = svgRef.current?.getBoundingClientRect();
                  if (svgRect) {
                    setTooltip({ item, x: e.clientX - svgRect.left, y: e.clientY - svgRect.top });
                  }
                }}
                onMouseLeave={() => setTooltip(null)}
                role="img"
                aria-label={`${item.name} — ${item.ring}`}
              >
                {/* Glow */}
                {isHovered && (
                  <circle
                    cx={x}
                    cy={y}
                    r={12}
                    fill={ringCfg.color}
                    fillOpacity={0.12}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={ringCfg.color}
                  fillOpacity={isHovered ? 1 : 0.85}
                  stroke="rgba(0,0,0,0.3)"
                  strokeWidth={1}
                  style={{ transition: 'r 0.15s ease' }}
                />
                {/* Movement indicator */}
                {item.moved === 'up' && (
                  <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={6} fill="#fff" style={{ pointerEvents: 'none' }}>▲</text>
                )}
                {item.moved === 'down' && (
                  <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={6} fill="#fff" style={{ pointerEvents: 'none' }}>▼</text>
                )}
              </g>
            );
          })}

          {/* SVG Tooltip (rendered inside SVG for correct positioning) */}
          {tooltip && (() => {
            const { item, x: tx, y: ty } = tooltip;
            const ringCfg = RING_CONFIG[item.ring];
            const maxDesc = 42;
            const desc = item.description.length > maxDesc ? item.description.slice(0, maxDesc) + '…' : item.description;
            const boxW = 160;
            const boxH = 56;
            const pad = 10;
            let bx = tx + 12;
            let by = ty - boxH / 2;
            if (bx + boxW > SIZE - 4) bx = tx - boxW - 12;
            if (by < 4) by = 4;
            if (by + boxH > SIZE - 4) by = SIZE - boxH - 4;
            return (
              <g style={{ pointerEvents: 'none' }}>
                <rect x={bx} y={by} width={boxW} height={boxH} rx={8} fill="#1e293b" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                <text x={bx + pad} y={by + 18} fontSize={11} fontWeight={700} fill="#f1f5f9" fontFamily="Inter, system-ui, sans-serif">{item.name}</text>
                <rect x={bx + pad} y={by + 26} width={40} height={12} rx={4} fill={ringCfg.color} fillOpacity={0.2} />
                <text x={bx + pad + 4} y={by + 35} fontSize={8} fontWeight={600} fill={ringCfg.textColor} fontFamily="Inter, system-ui, sans-serif">{ringCfg.label.toUpperCase()}</text>
                <text x={bx + pad} y={by + 48} fontSize={8.5} fill="#94a3b8" fontFamily="Inter, system-ui, sans-serif">{desc}</text>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Legend + filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        <button
          onClick={() => setActiveRing(null)}
          style={{
            padding: '5px 14px',
            borderRadius: 20,
            border: '1px solid',
            borderColor: activeRing === null ? '#a78bfa' : 'rgba(255,255,255,0.1)',
            background: activeRing === null ? 'rgba(167,139,250,0.15)' : 'transparent',
            color: activeRing === null ? '#c4b5fd' : '#64748b',
            fontSize: '0.7rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          Todos ({items.length})
        </button>
        {RING_ORDER.map((ring) => {
          const cfg = RING_CONFIG[ring];
          const count = items.filter(i => i.ring === ring).length;
          const isActive = activeRing === ring;
          return (
            <button
              key={ring}
              onClick={() => setActiveRing(isActive ? null : ring)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 14px',
                borderRadius: 20,
                border: '1px solid',
                borderColor: isActive ? cfg.color : 'rgba(255,255,255,0.08)',
                background: isActive ? `${cfg.color}18` : 'transparent',
                color: isActive ? cfg.textColor : '#64748b',
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: cfg.color,
                boxShadow: isActive ? `0 0 6px ${cfg.color}` : 'none',
                flexShrink: 0,
              }} />
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Item list grouped by ring */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {RING_ORDER.filter(ring => !activeRing || activeRing === ring).map((ring) => {
          const ringItems = items.filter(i => i.ring === ring);
          if (ringItems.length === 0) return null;
          const cfg = RING_CONFIG[ring];
          return (
            <div key={ring}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: cfg.color,
                  boxShadow: `0 0 8px ${cfg.color}`,
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: cfg.textColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {cfg.label}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#475569', marginLeft: 4 }}>
                  — {ringItems.length} {ringItems.length === 1 ? 'tecnología' : 'tecnologías'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                {ringItems.map(item => (
                  <div
                    key={item.id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid ${cfg.color}22`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0' }}>{item.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        {item.moved !== 'none' && (
                          <span style={{ fontSize: '0.6rem', color: item.moved === 'up' ? '#22c55e' : '#ef4444' }}>
                            {item.moved === 'up' ? '▲' : '▼'}
                          </span>
                        )}
                        <span style={{
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: `${cfg.color}18`,
                          color: cfg.textColor,
                          fontSize: '0.6rem',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                        }}>
                          {item.quadrant}
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
