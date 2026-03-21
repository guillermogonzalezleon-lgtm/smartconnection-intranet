'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Sidebar({ user }: { user: string }) {
  const [expanded, setExpanded] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const pathname = usePathname();

  const handleLogout = () => {
    fetch('/api/auth', { method: 'DELETE' }).then(() => { window.location.href = '/'; });
  };

  const w = expanded ? 240 : 64;

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const navItems = [
    { href: '/dashboard', icon: 'bi-grid-1x2', label: 'Dashboard', shortcut: '⌘1' },
    { href: '/dashboard/agents', icon: 'bi-robot', label: 'Agentes IA', shortcut: '⌘2' },
    { href: '/dashboard/leads', icon: 'bi-people', label: 'Leads & CRM', shortcut: '⌘3' },
    { href: '/dashboard/analytics', icon: 'bi-graph-up', label: 'Analytics', shortcut: '⌘4' },
    { href: '/dashboard/projects', icon: 'bi-kanban', label: 'Proyectos', shortcut: '⌘5' },
    { href: '/dashboard/ux-agent', icon: 'bi-lightning-charge', label: 'Agente UX', shortcut: '⌘6' },
    { href: '/dashboard/labs', icon: 'bi-rocket-takeoff', label: 'Labs', shortcut: '⌘7' },
  ];

  const infraItems = [
    { href: '/dashboard/aws', icon: 'bi-cloud', label: 'AWS Panel', iconColor: '#f97316' },
  ];

  const statusItems = [
    { label: 'Vercel', status: 'Live' },
    { label: 'AWS', status: 'Active' },
    { label: 'Supabase', status: 'Connected' },
  ];

  const navLinkStyle = (href: string): React.CSSProperties => {
    const active = isActive(href);
    const hovered = hoveredItem === href;
    return {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: expanded ? '8px 10px' : '10px 0',
      borderRadius: 8,
      color: active ? '#00e5b0' : hovered ? '#cbd5e1' : '#94a3b8',
      fontSize: '0.78rem',
      fontWeight: active ? 600 : 500,
      textDecoration: 'none',
      marginBottom: 2,
      justifyContent: expanded ? 'flex-start' : 'center',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      position: 'relative',
      borderLeft: active ? '2px solid #00e5b0' : '2px solid transparent',
      background: active
        ? 'rgba(0, 229, 176, 0.08)'
        : hovered
          ? 'rgba(255, 255, 255, 0.04)'
          : 'transparent',
      transition: 'all 0.15s ease',
    };
  };

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => { setExpanded(false); setHoveredItem(null); }}
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
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
        overflow: 'hidden',
        boxShadow: expanded ? '8px 0 40px rgba(0,0,0,0.6)' : 'none',
      }}
    >
      {/* Logo */}
      <div style={{ padding: expanded ? '1.25rem 1rem' : '1.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.06)', justifyContent: expanded ? 'flex-start' : 'center', transition: 'padding 0.25s' }}>
        <img src="/img/logo_smart.svg" alt="SC" style={{ height: 24, flexShrink: 0 }} />
        {expanded && <span style={{ background: '#00e5b0', color: '#0a0d14', fontSize: '0.5rem', fontWeight: 800, padding: '2px 6px', borderRadius: 999, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>INTRANET</span>}
      </div>

      {/* Command Search Trigger */}
      {expanded ? (
        <div style={{ padding: '0.75rem 0.75rem 0' }}>
          <button
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              color: '#64748b',
              fontSize: '0.72rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: 'inherit',
            }}
          >
            <i className="bi bi-search" style={{ fontSize: '0.8rem', flexShrink: 0 }}></i>
            <span style={{ flex: 1, textAlign: 'left' }}>Buscar...</span>
            <kbd style={{
              fontSize: '0.6rem',
              padding: '1px 5px',
              borderRadius: 4,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#475569',
              fontFamily: 'inherit',
              lineHeight: 1.6,
            }}>⌘K</kbd>
          </button>
        </div>
      ) : (
        <div style={{ padding: '0.75rem 0.5rem 0', display: 'flex', justifyContent: 'center' }}>
          <button style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            color: '#64748b',
            padding: '8px 0',
            width: 40,
            cursor: 'pointer',
            fontSize: '0.85rem',
            transition: 'all 0.15s ease',
          }}>
            <i className="bi bi-search"></i>
          </button>
        </div>
      )}

      {/* Nav */}
      <div style={{ padding: '0.75rem 0.5rem', flex: 1 }}>
        {expanded && <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 8px', marginBottom: 6 }}>Principal</div>}
        {navItems.map(item => (
          <a
            key={item.href}
            href={item.href}
            style={navLinkStyle(item.href)}
            title={!expanded ? item.label : undefined}
            onMouseEnter={() => setHoveredItem(item.href)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <i className={`bi ${item.icon}`} style={{ fontSize: '1.1rem', width: 22, textAlign: 'center', flexShrink: 0 }}></i>
            {expanded && (
              <>
                <span style={{ flex: 1 }}>{item.label}</span>
                <kbd style={{
                  fontSize: '0.55rem',
                  padding: '1px 4px',
                  borderRadius: 3,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: '#475569',
                  fontFamily: 'inherit',
                  opacity: hoveredItem === item.href || isActive(item.href) ? 1 : 0,
                  transition: 'opacity 0.15s ease',
                }}>{item.shortcut}</kbd>
              </>
            )}
          </a>
        ))}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 0' }}></div>
        {expanded && <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 8px', marginBottom: 6 }}>Infra</div>}
        {infraItems.map(item => (
          <a
            key={item.href}
            href={item.href}
            style={navLinkStyle(item.href)}
            title={!expanded ? item.label : undefined}
            onMouseEnter={() => setHoveredItem(item.href)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <i className={`bi ${item.icon}`} style={{ fontSize: '1.1rem', width: 22, textAlign: 'center', flexShrink: 0, color: isActive(item.href) ? '#00e5b0' : item.iconColor }}></i>
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
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4, fontSize: '0.9rem', transition: 'color 0.15s ease' }} title="Cerrar sesion">
              <i className="bi bi-box-arrow-right"></i>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
