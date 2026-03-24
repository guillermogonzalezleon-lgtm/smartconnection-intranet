'use client';

// Visual diagrams for lessons — replaces images with CSS/SVG visuals

const S = {
  wrap: { background: '#0a0e18', border: '1px solid rgba(0,229,176,0.12)', borderRadius: 14, padding: 20, margin: '16px 0' } as React.CSSProperties,
  title: { fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 12 },
  row: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const },
  box: (color: string) => ({ padding: '8px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: `1px solid ${color}30`, background: `${color}10`, color, whiteSpace: 'nowrap' as const }),
  arrow: { color: '#2a3d58', fontSize: 16 } as React.CSSProperties,
  flow: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const, marginBottom: 8 },
};

export function FlowDiagram({ title, steps, colors }: { title: string; steps: string[]; colors?: string[] }) {
  const c = colors || ['#00e5b0', '#4f8ef7', '#f5a623', '#b794ff', '#1fd975', '#f04747'];
  return (
    <div style={S.wrap}>
      <div style={S.title}>{title}</div>
      <div style={S.flow}>
        {steps.map((s, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={S.box(c[i % c.length])}>{s}</span>
            {i < steps.length - 1 && <span style={S.arrow}>→</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ArchDiagram({ title, layers }: { title: string; layers: { label: string; items: { name: string; color: string }[] }[] }) {
  return (
    <div style={S.wrap}>
      <div style={S.title}>{title}</div>
      {layers.map((layer, i) => (
        <div key={i} style={{ marginBottom: i < layers.length - 1 ? 12 : 0 }}>
          <div style={{ fontSize: 10, color: '#6b8099', marginBottom: 6, fontWeight: 600 }}>{layer.label}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {layer.items.map((item, j) => (
              <span key={j} style={S.box(item.color)}>{item.name}</span>
            ))}
          </div>
          {i < layers.length - 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0', color: '#2a3d58', fontSize: 12 }}>↓</div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ComparisonDiagram({ title, items }: { title: string; items: { name: string; color: string; pros: string[]; speed: string; cost: string }[] }) {
  return (
    <div style={S.wrap}>
      <div style={S.title}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, 1fr)`, gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ background: `${item.color}08`, border: `1px solid ${item.color}20`, borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: item.color, marginBottom: 6 }}>{item.name}</div>
            <div style={{ fontSize: 10, color: '#6b8099', marginBottom: 4 }}>⚡ {item.speed} · 💰 {item.cost}</div>
            {item.pros.map((p, j) => (
              <div key={j} style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>• {p}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableDiagram({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return (
    <div style={S.wrap}>
      <div style={S.title}>{title}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>{headers.map((h, i) => <th key={i} style={{ textAlign: 'left', padding: '6px 10px', fontSize: 10, color: '#6b8099', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 700 }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>{row.map((cell, j) => <td key={j} style={{ padding: '6px 10px', fontSize: 11, color: '#d1d5db', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SchemaDiagram({ title, tables }: { title: string; tables: { name: string; color: string; fields: string[] }[] }) {
  return (
    <div style={S.wrap}>
      <div style={S.title}>{title}</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {tables.map((t, i) => (
          <div key={i} style={{ background: `${t.color}06`, border: `1px solid ${t.color}20`, borderRadius: 8, padding: 10, minWidth: 140 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: t.color, marginBottom: 6, paddingBottom: 4, borderBottom: `1px solid ${t.color}20` }}>{t.name}</div>
            {t.fields.map((f, j) => (
              <div key={j} style={{ fontSize: 10, color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.8 }}>{f}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
