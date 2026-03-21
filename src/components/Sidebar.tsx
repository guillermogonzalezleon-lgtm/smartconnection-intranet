'use client';

export default function Sidebar({ user }: { user: string }) {
  const handleLogout = () => {
    fetch('/api/auth', { method: 'DELETE' }).then(() => { window.location.href = '/'; });
  };

  return (
    <aside style={{ width: 240, background: '#111827', borderRight: '1px solid rgba(255,255,255,0.06)', position: 'fixed', top: 0, left: 0, bottom: 0, display: 'flex', flexDirection: 'column', zIndex: 100, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Logo */}
      <div style={{ padding: '1.25rem 1rem', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <img src="/img/logo_smart.svg" alt="SC" style={{ height: 28 }} />
        <span style={{ background: '#00e5b0', color: '#0a0d14', fontSize: '0.55rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, letterSpacing: '0.05em' }}>INTRANET</span>
      </div>

      {/* Nav Principal */}
      <div style={{ padding: '1rem 0.75rem' }}>
        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 0.5rem', marginBottom: 8 }}>Principal</div>
        {[
          { href: '/dashboard', icon: 'bi-grid-1x2', label: 'Dashboard' },
          { href: '/dashboard/agents', icon: 'bi-robot', label: 'Agentes IA' },
          { href: '/dashboard/leads', icon: 'bi-people', label: 'Leads & CRM' },
          { href: '/dashboard/analytics', icon: 'bi-graph-up', label: 'Analytics' },
        ].map(item => (
          <a key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 6, color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500, textDecoration: 'none', marginBottom: 2 }}>
            <i className={`bi ${item.icon}`} style={{ fontSize: '1rem', width: 20, textAlign: 'center' }}></i>
            {item.label}
          </a>
        ))}
      </div>

      {/* Infraestructura */}
      <div style={{ padding: '0 0.75rem' }}>
        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 0.5rem', marginBottom: 8 }}>Infraestructura</div>
        <a href="/dashboard/aws" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 6, color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500, textDecoration: 'none' }}>
          <i className="bi bi-cloud" style={{ fontSize: '1rem', width: 20, textAlign: 'center', color: '#f97316' }}></i>
          AWS Panel
        </a>
      </div>

      {/* Status */}
      <div style={{ padding: '0.75rem', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {['Vercel Live', 'AWS Active', 'Supabase Connected', 'CloudFront Online'].map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', fontSize: '0.7rem', color: '#94a3b8' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', flexShrink: 0 }}></span>
            {s}
          </div>
        ))}
      </div>

      {/* User */}
      <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,229,176,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: '#00e5b0', fontWeight: 700 }}>
          {user.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.split('@')[0]}</div>
          <div style={{ fontSize: '0.6rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user}</div>
        </div>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4, fontSize: '1rem' }} title="Cerrar sesión">
          <i className="bi bi-box-arrow-right"></i>
        </button>
      </div>
    </aside>
  );
}
