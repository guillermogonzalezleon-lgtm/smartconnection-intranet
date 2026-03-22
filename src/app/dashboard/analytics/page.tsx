'use client';
import { useEffect, useState, useCallback } from 'react';

type Period = 'today' | '7d' | '30d' | 'all';

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))]);

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Record<string, unknown>[]>([]);
  const [leadsCount, setLeadsCount] = useState(0);
  const [meetingsCount, setMeetingsCount] = useState(0);
  const [period, setPeriod] = useState<Period>('30d');
  const [hoveredKpi, setHoveredKpi] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pagesSortBy, setPagesSortBy] = useState<'page' | 'count'>('count');
  const [pagesSortDir, setPagesSortDir] = useState<'asc' | 'desc'>('desc');
  const [sourcesSortBy, setSourcesSortBy] = useState<'name' | 'count'>('count');
  const [sourcesSortDir, setSourcesSortDir] = useState<'asc' | 'desc'>('desc');

  const api = useCallback(
    (p: Record<string, unknown>) =>
      fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      }).then((r) => r.json()),
    []
  );

  useEffect(() => {
    setLoading(true);
    setError(false);
    withTimeout(
      Promise.all([
        api({ action: 'query', table: 'analytics', order: 'created_at.desc', limit: 2000 }).then((d) => {
          if (d.data) setAnalytics(d.data);
        }),
        api({ action: 'query', table: 'leads', limit: 1000 }).then((d) => {
          if (d.data) setLeadsCount(d.data.length);
        }),
        api({ action: 'query', table: 'reuniones', limit: 1000 }).then((d) => {
          if (d.data) setMeetingsCount(d.data.length);
        }),
      ]),
      10000
    )
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [api]);

  // Date helpers
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  // Filtered analytics based on period
  const filtered = analytics.filter((e) => {
    const ca = e.created_at as string;
    if (!ca) return false;
    if (period === 'today') return ca.startsWith(todayStr);
    if (period === '7d') return ca >= weekAgo;
    if (period === '30d') return ca >= monthAgo;
    return true;
  });

  // KPI counts
  const visitasHoy = analytics.filter((e) => e.created_at && (e.created_at as string).startsWith(todayStr)).length;
  const visitasSemana = analytics.filter((e) => e.created_at && (e.created_at as string) >= weekAgo).length;
  const visitas30d = analytics.filter((e) => e.created_at && (e.created_at as string) >= monthAgo).length;
  const conversionPct = analytics.length > 0 ? ((leadsCount / analytics.length) * 100).toFixed(1) : '0.0';

  // Sources
  const sources: Record<string, number> = {};
  filtered.forEach((e) => {
    const s = (e.source as string) || 'direct';
    sources[s] = (sources[s] || 0) + 1;
  });
  const sortedSources = Object.entries(sources).sort((a, b) => b[1] - a[1]);
  const displaySources = [...sortedSources].sort((a, b) => {
    if (sourcesSortBy === 'name') return sourcesSortDir === 'asc' ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0]);
    return sourcesSortDir === 'asc' ? a[1] - b[1] : b[1] - a[1];
  });
  const maxSource = sortedSources[0]?.[1] || 1;
  const totalSourceHits = sortedSources.reduce((sum, [, c]) => sum + c, 0);

  // Pages
  const pages: Record<string, number> = {};
  filtered.forEach((e) => {
    const p = (e.page as string) || '/';
    pages[p] = (pages[p] || 0) + 1;
  });
  const sortedPages = Object.entries(pages).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const displayPages = [...sortedPages].sort((a, b) => {
    if (pagesSortBy === 'page') return pagesSortDir === 'asc' ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0]);
    return pagesSortDir === 'asc' ? a[1] - b[1] : b[1] - a[1];
  });

  const togglePagesSort = (col: 'page' | 'count') => {
    if (pagesSortBy === col) setPagesSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setPagesSortBy(col); setPagesSortDir(col === 'count' ? 'desc' : 'asc'); }
  };
  const toggleSourcesSort = (col: 'name' | 'count') => {
    if (sourcesSortBy === col) setSourcesSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSourcesSortBy(col); setSourcesSortDir(col === 'count' ? 'desc' : 'asc'); }
  };
  const sortArrow = (active: boolean, dir: 'asc' | 'desc') => active ? (dir === 'asc' ? ' ▲' : ' ▼') : '';

  // Devices
  const mobileCount = filtered.filter((e) => {
    const ua = (e.user_agent as string) || '';
    return /mobile/i.test(ua);
  }).length;
  const desktopCount = filtered.length - mobileCount;
  const mobilePercent = filtered.length > 0 ? Math.round((mobileCount / filtered.length) * 100) : 0;
  const desktopPercent = filtered.length > 0 ? 100 - mobilePercent : 0;

  // Source icons map
  const sourceIcon = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes('google')) return 'bi-google';
    if (n.includes('facebook') || n.includes('fb')) return 'bi-facebook';
    if (n.includes('instagram')) return 'bi-instagram';
    if (n.includes('twitter') || n.includes('x.com')) return 'bi-twitter-x';
    if (n.includes('linkedin')) return 'bi-linkedin';
    if (n.includes('whatsapp')) return 'bi-whatsapp';
    if (n === 'direct') return 'bi-cursor';
    if (n.includes('email') || n.includes('mail')) return 'bi-envelope';
    return 'bi-link-45deg';
  };

  // Source color map
  const sourceColor = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes('google')) return '#4285F4';
    if (n.includes('facebook') || n.includes('fb')) return '#1877F2';
    if (n.includes('instagram')) return '#E4405F';
    if (n.includes('linkedin')) return '#0A66C2';
    if (n.includes('whatsapp')) return '#25D366';
    if (n === 'direct') return '#00e5b0';
    return '#00e5b0';
  };

  const kpis = [
    { value: visitasHoy, label: 'Visitas hoy', color: '#00e5b0', icon: 'bi-eye' },
    { value: visitasSemana, label: 'Visitas 7d', color: '#3b82f6', icon: 'bi-calendar-week' },
    { value: visitas30d, label: 'Visitas 30d', color: '#06b6d4', icon: 'bi-calendar-month' },
    { value: leadsCount, label: 'Leads totales', color: '#f59e0b', icon: 'bi-people' },
    { value: meetingsCount, label: 'Reuniones', color: '#8b5cf6', icon: 'bi-camera-video' },
    { value: conversionPct + '%', label: 'Conversión', color: '#ef4444', icon: 'bi-graph-up-arrow' },
  ];

  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: 'Hoy' },
    { key: '7d', label: '7d' },
    { key: '30d', label: '30d' },
    { key: 'all', label: 'Todo' },
  ];

  const EmptyState = ({ icon, text }: { icon: string; text: string }) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1rem',
        color: '#334155',
      }}
    >
      <i className={icon} style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.5 }} />
      <span style={{ fontSize: '0.82rem' }}>{text}</span>
    </div>
  );

  return (
    <>
      {/* Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(10,13,20,0.92)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
        }}
      >
        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
          Intranet <span style={{ margin: '0 8px', color: '#475569' }}>/</span>{' '}
          <span style={{ color: '#fff', fontWeight: 600 }}>Analytics</span>
        </div>
        {/* Period filters + Export */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button
            onClick={() => {
              const rows: string[] = ['Sección,Clave,Valor'];
              // Pageviews
              sortedPages.forEach(([page, count]) => rows.push(`Páginas,"${page}",${count}`));
              // Sources
              sortedSources.forEach(([name, count]) => rows.push(`Fuente,"${name}",${count}`));
              // Devices
              rows.push(`Dispositivos,Desktop,${desktopCount}`);
              rows.push(`Dispositivos,Mobile,${mobileCount}`);
              // KPIs
              rows.push(`KPI,Visitas hoy,${visitasHoy}`);
              rows.push(`KPI,Visitas 7d,${visitasSemana}`);
              rows.push(`KPI,Visitas 30d,${visitas30d}`);
              rows.push(`KPI,Leads totales,${leadsCount}`);
              rows.push(`KPI,Reuniones,${meetingsCount}`);
              rows.push(`KPI,Conversión,${conversionPct}%`);
              const csv = rows.join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'analytics.csv'; a.click();
              URL.revokeObjectURL(url);
            }}
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              color: '#94a3b8',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              letterSpacing: '0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginRight: 8,
            }}
          >
            <i className="bi bi-download" /> Exportar CSV
          </button>
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: period === p.key ? '1px solid #00e5b0' : '1px solid rgba(255,255,255,0.08)',
                background: period === p.key ? 'rgba(0,229,176,0.12)' : 'rgba(255,255,255,0.03)',
                color: period === p.key ? '#00e5b0' : '#94a3b8',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                letterSpacing: '0.02em',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ padding: '1.5rem 2rem', maxWidth: 1400, margin: '0 auto' }}>
        {/* Loading overlay */}
        {loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '2rem',
              color: '#64748b',
              fontSize: '0.85rem',
            }}
          >
            <div role="status" aria-label="Cargando">
              <i className="bi bi-arrow-repeat" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            Cargando datos...
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '2rem',
              color: '#ef4444',
              fontSize: '0.85rem',
            }}
          >
            <i className="bi bi-exclamation-triangle" />
            Error cargando datos
          </div>
        )}

        {/* KPI Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '0.75rem',
            marginBottom: '1.5rem',
          }}
        >
          {kpis.map((k, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredKpi(i)}
              onMouseLeave={() => setHoveredKpi(null)}
              style={{
                background: hoveredKpi === i ? '#141b2b' : '#111827',
                border: hoveredKpi === i ? `1px solid ${k.color}40` : '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: '1.25rem 1rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: hoveredKpi === i ? `0 0 24px ${k.color}18, 0 0 48px ${k.color}08` : 'none',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Top accent line */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: `linear-gradient(90deg, ${k.color}, ${k.color}44)`,
                  borderRadius: '14px 14px 0 0',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <i
                  className={`bi ${k.icon}`}
                  style={{
                    fontSize: '1.1rem',
                    color: k.color,
                    opacity: 0.7,
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 900,
                  color: '#f8fafc',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                {k.value}
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: '#64748b',
                  marginTop: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 500,
                }}
              >
                {k.label}
              </div>
            </div>
          ))}
        </div>

        {/* Main grid: Sources + Pages */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {/* Traffic Sources */}
          <div
            style={{
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16,
              padding: '1.5rem',
            }}
          >
            <h3
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#f1f5f9',
              }}
            >
              <i className="bi bi-diagram-3" style={{ color: '#00e5b0' }} /> Fuentes de tráfico
            </h3>
            {sortedSources.length === 0 ? (
              <EmptyState icon="bi-diagram-3" text="Sin datos de tráfico en este período" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                  <div style={{ width: 28, flexShrink: 0 }} />
                  <span
                    onClick={() => toggleSourcesSort('name')}
                    style={{ fontSize: '0.68rem', color: sourcesSortBy === 'name' ? '#00e5b0' : '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: 70, cursor: 'pointer', userSelect: 'none' }}
                  >
                    Fuente{sortArrow(sourcesSortBy === 'name', sourcesSortDir)}
                  </span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: 50, textAlign: 'right' }}>%</span>
                  <span
                    onClick={() => toggleSourcesSort('count')}
                    style={{ fontSize: '0.68rem', color: sourcesSortBy === 'count' ? '#00e5b0' : '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: 30, textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                  >
                    Hits{sortArrow(sourcesSortBy === 'count', sourcesSortDir)}
                  </span>
                </div>
                {displaySources.slice(0, 8).map(([name, count]) => {
                  const pct = totalSourceHits > 0 ? ((count / totalSourceHits) * 100).toFixed(1) : '0';
                  const barColor = sourceColor(name);
                  return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: `${barColor}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <i
                          className={`bi ${sourceIcon(name)}`}
                          style={{ fontSize: '0.8rem', color: barColor }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          color: '#cbd5e1',
                          minWidth: 70,
                          fontWeight: 500,
                        }}
                      >
                        {name}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: 10,
                          background: 'rgba(255,255,255,0.04)',
                          borderRadius: 5,
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${(count / maxSource) * 100}%`,
                            background: `linear-gradient(90deg, ${barColor}, ${barColor}99)`,
                            borderRadius: 5,
                            transition: 'width 0.6s ease',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: '#94a3b8',
                          minWidth: 50,
                          textAlign: 'right',
                          fontWeight: 600,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {pct}%
                      </span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          color: '#475569',
                          minWidth: 30,
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Pages */}
          <div
            style={{
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 16,
              padding: '1.5rem',
            }}
          >
            <h3
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#f1f5f9',
              }}
            >
              <i className="bi bi-file-earmark-text" style={{ color: '#00e5b0' }} /> Páginas más visitadas
            </h3>
            {sortedPages.length === 0 ? (
              <EmptyState icon="bi-file-earmark-text" text="Sin datos de páginas en este período" />
            ) : (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: '0 2px',
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '8px 12px',
                        fontSize: '0.68rem',
                        color: '#475569',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      #
                    </th>
                    <th
                      onClick={() => togglePagesSort('page')}
                      style={{
                        textAlign: 'left',
                        padding: '8px 12px',
                        fontSize: '0.68rem',
                        color: pagesSortBy === 'page' ? '#00e5b0' : '#475569',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      Página{sortArrow(pagesSortBy === 'page', pagesSortDir)}
                    </th>
                    <th
                      onClick={() => togglePagesSort('count')}
                      style={{
                        textAlign: 'right',
                        padding: '8px 12px',
                        fontSize: '0.68rem',
                        color: pagesSortBy === 'count' ? '#00e5b0' : '#475569',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      Visitas{sortArrow(pagesSortBy === 'count', pagesSortDir)}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayPages.map(([page, count], idx) => (
                    <tr key={page}>
                      <td
                        style={{
                          padding: '10px 12px',
                          fontSize: '0.78rem',
                          color: idx < 3 ? '#00e5b0' : '#475569',
                          fontWeight: idx < 3 ? 700 : 500,
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        #{idx + 1}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          fontSize: '0.78rem',
                          color: '#cbd5e1',
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          fontFamily: 'monospace',
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {page}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          fontSize: '0.78rem',
                          color: '#94a3b8',
                          textAlign: 'right',
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          fontWeight: 600,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Devices section */}
        <div
          style={{
            background: '#111827',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: '1.5rem',
          }}
        >
          <h3
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#f1f5f9',
            }}
          >
            <i className="bi bi-phone" style={{ color: '#00e5b0' }} /> Dispositivos
          </h3>
          {filtered.length === 0 ? (
            <EmptyState icon="bi-phone" text="Sin datos de dispositivos en este período" />
          ) : (
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              {/* Bars */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Desktop */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: 'rgba(59,130,246,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <i className="bi bi-laptop" style={{ fontSize: '1.1rem', color: '#3b82f6' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 500 }}>
                        Desktop
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
                        {desktopPercent}% ({desktopCount})
                      </span>
                    </div>
                    <div
                      style={{
                        height: 10,
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: 5,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${desktopPercent}%`,
                          background: 'linear-gradient(90deg, #3b82f6, #3b82f699)',
                          borderRadius: 5,
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>
                {/* Mobile */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: 'rgba(0,229,176,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <i className="bi bi-phone" style={{ fontSize: '1.1rem', color: '#00e5b0' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 500 }}>
                        Mobile
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
                        {mobilePercent}% ({mobileCount})
                      </span>
                    </div>
                    <div
                      style={{
                        height: 10,
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: 5,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${mobilePercent}%`,
                          background: 'linear-gradient(90deg, #00e5b0, #00e5b099)',
                          borderRadius: 5,
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              {/* Summary stat */}
              <div
                style={{
                  textAlign: 'center',
                  padding: '1rem 2rem',
                  borderLeft: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div
                  style={{
                    fontSize: '2.2rem',
                    fontWeight: 900,
                    color: '#f8fafc',
                    lineHeight: 1,
                  }}
                >
                  {filtered.length}
                </div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: '#64748b',
                    marginTop: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Total visitas
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spin animation for loading */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
