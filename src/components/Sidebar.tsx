'use client';
import { useState } from 'react';

export default function Sidebar({ user }: { user: string }) {
  const [expanded, setExpanded] = useState(false);

  const handleLogout = () => {
    fetch('/api/auth', { method: 'DELETE' }).then(() => { window.location.href = '/'; });
  };

  const w = expanded ? 240 : 64;

  const navItems = [
    { href: '/dashboard', icon: 'bi-grid-1x2', label: 'Dashboard' },
    { href: '/dashboard/agents', icon: 'bi-robot', label: 'Agentes IA' },
    { href: '/dashboard/leads', icon: 'bi-people', label: 'Leads & CRM' },
    { href: '/dashboard/analytics', icon: 'bi-graph-up', label: 'Analytics' },
    { href: '/dashboard/projects', icon: 'bi-kanban', label: 'Proyectos' },
    { href: '/dashboard/ux-agent', icon: 'bi-lightning-charge', label: 'Agente UX' },
    { href: '/dashboard/labs', icon: 'bi-rocket-takeoff', label: 'Labs' },
  ];

  const infraItems = [
    { href: '/dashboard/aws', icon: 'bi-cloud', label: 'AWS Panel', iconColor: '#f97316' },
  ];

  const statusItems = [
    { label: 'Vercel', status: 'Live' },
    { label: 'AWS', status: 'Active' },
    { label: 'Supabase', status: 'Connected' },
  ];

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        width: w,
        minWidth: w,
        background: '#111827',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        fontFamily: "'Inter', system-ui, sans-serif",
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s',
        overflow: 'hidden',
        boxShadow: expanded ? '8px 0 30px rgba(0,0,0,0.5)' : 'none',
      }}
    >
      {/* Logo */}
      <div style={{ padding: expanded ? '1.25rem 1rem' : '1.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.06)', justifyContent: expanded ? 'flex-start' : 'center', transition: 'padding 0.25s' }}>
        <img src="/img/logo_smart.svg" alt="SC" style={{ height: 24, flexShrink: 0 }} />
        {expanded && <span style={{ background: '#00e5b0', color: '#0a0d14', fontSize: '0.5rem', fontWeight: 800, padding: '2px 6px', borderRadius: 999, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>INTRANET</span>}
      </div>

      {/* Nav */}
      <div style={{ padding: '0.75rem 0.5rem', flex: 1 }}>
        {expanded && <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 8px', marginBottom: 6 }}>Principal</div>}
        {navItems.map(item => (
          <a key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: expanded ? '8px 10px' : '10px 0', borderRadius: 8, color: '#94a3b8', fontSize: '0.78rem', fontWeight: 500, textDecoration: 'none', marginBottom: 2, justifyContent: expanded ? 'flex-start' : 'center', whiteSpace: 'nowrap', overflow: 'hidden' }} title={!expanded ? item.label : undefined}>
            <i className={`bi ${item.icon}`} style={{ fontSize: '1.1rem', width: 22, textAlign: 'center', flexShrink: 0 }}></i>
            {expanded && <span>{item.label}</span>}
          </a>
        ))}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 0' }}></div>
        {expanded && <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 8px', marginBottom: 6 }}>Infra</div>}
        {infraItems.map(item => (
          <a key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: expanded ? '8px 10px' : '10px 0', borderRadius: 8, color: '#94a3b8', fontSize: '0.78rem', fontWeight: 500, textDecoration: 'none', justifyContent: expanded ? 'flex-start' : 'center', whiteSpace: 'nowrap', overflow: 'hidden' }} title={!expanded ? item.label : undefined}>
            <i className={`bi ${item.icon}`} style={{ fontSize: '1.1rem', width: 22, textAlign: 'center', flexShrink: 0, color: item.iconColor }}></i>
            {expanded && <span>{item.label}</span>}
          </a>
        ))}
      </div>

      {/* Status */}
      {expanded && (
        <div style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {statusItems.map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px', fontSize: '0.65rem', color: '#64748b' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', flexShrink: 0 }}></span>
              {s.label} <span style={{ marginLeft: 'auto', fontSize: '0.6rem' }}>{s.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* User */}
      <div style={{ padding: expanded ? '0.75rem' : '0.75rem 0', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, justifyContent: expanded ? 'flex-start' : 'center' }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,229,176,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#00e5b0', fontWeight: 700, flexShrink: 0 }}>
          {user.charAt(0).toUpperCase()}
        </div>
        {expanded && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.split('@')[0]}</div>
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4, fontSize: '0.9rem' }} title="Cerrar sesión">
              <i className="bi bi-box-arrow-right"></i>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
