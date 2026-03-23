export default function DashboardLoading() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: '#0a0d14',
      minHeight: '100vh',
    }}>
      {/* Topbar skeleton */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(17,24,39,0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: '0 2rem',
        gap: '0.5rem',
      }}>
        <div style={{ width: 60, height: 14, borderRadius: 4, background: '#1e293b', animation: 'shimmer 1.5s infinite' }} />
        <div style={{ width: 8, height: 14, borderRadius: 2, background: '#1e293b' }} />
        <div style={{ width: 90, height: 14, borderRadius: 4, background: '#1e293b', animation: 'shimmer 1.5s infinite' }} />
      </div>

      <div style={{ padding: '1.5rem 2rem' }}>
        {/* Welcome skeleton */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ width: 280, height: 28, borderRadius: 8, background: '#1e293b', marginBottom: 8, animation: 'shimmer 1.5s infinite' }} />
          <div style={{ width: 200, height: 14, borderRadius: 4, background: '#1e293b', animation: 'shimmer 1.5s infinite' }} />
        </div>

        {/* KPI skeleton grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              padding: '1.25rem',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: '#1e293b', marginBottom: 10, animation: 'shimmer 1.5s infinite' }} />
              <div style={{ width: '50%', height: 28, borderRadius: 6, background: '#1e293b', animation: 'shimmer 1.5s infinite' }} />
              <div style={{ width: '70%', height: 12, borderRadius: 4, background: '#1e293b', marginTop: 8, animation: 'shimmer 1.5s infinite' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: '#1e293b' }} />
            </div>
          ))}
        </div>

        {/* Quick actions skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{
              background: '#111827',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14,
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#1e293b', animation: 'shimmer 1.5s infinite' }} />
              <div style={{ width: '60%', height: 14, borderRadius: 4, background: '#1e293b', animation: 'shimmer 1.5s infinite' }} />
            </div>
          ))}
        </div>

        {/* Content skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '0.75rem' }}>
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, height: 360 }}>
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 120, height: 14, borderRadius: 4, background: '#1e293b', animation: 'shimmer 1.5s infinite' }} />
            </div>
          </div>
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, height: 360 }}>
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 100, height: 14, borderRadius: 4, background: '#1e293b', animation: 'shimmer 1.5s infinite' }} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
