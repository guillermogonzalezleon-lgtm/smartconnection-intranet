'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function Sidebar({ user, role, 'aria-label': ariaLabel }: { user: string; role?: string; 'aria-label'?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('sc-theme') as 'dark' | 'light' | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('sc-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.body.style.background = '#f8fafc';
      document.body.style.color = '#0f172a';
    } else {
      document.body.style.background = '#0a0d14';
      document.body.style.color = '#f1f5f9';
    }
  }, [theme]);

  const handleLogout = () => {
    fetch('/api/auth', { method: 'DELETE' }).then(() => { window.location.href = '/'; });
  };

  const w = isMobile ? (mobileOpen ? 240 : 0) : (expanded ? 240 : 64);
  const showExpanded = isMobile ? mobileOpen : expanded;

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
    { href: '/dashboard/improvements', icon: 'bi-stars', label: 'Mejoras & UX', shortcut: '⌘6' },
    { href: '/dashboard/labs', icon: 'bi-rocket-takeoff', label: 'Labs', shortcut: '⌘7' },
  ];

  const infraItems = [
    { href: '/dashboard/deploy', icon: 'bi-rocket-takeoff', label: 'Deploy', iconColor: '#3b82f6' },
    { href: '/dashboard/aws', icon: 'bi-cloud', label: 'AWS Panel', iconColor: '#f97316' },
  ];

  const statusItems = [
    { label: 'Amplify', status: 'Live' },
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
      padding: showExpanded ? '8px 10px' : '10px 0',
      borderRadius: 8,
      color: active ? '#00e5b0' : hovered ? '#cbd5e1' : '#94a3b8',
      fontSize: '0.78rem',
      fontWeight: active ? 600 : 500,
      textDecoration: 'none',
      marginBottom: 2,
      justifyContent: showExpanded ? 'flex-start' : 'center',
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
    <>
    {/* Hamburger button - mobile only */}
    {isMobile && !mobileOpen && (
      <button
        onClick={() => setMobileOpen(true)}
        style={{
          position: 'fixed',
          top: 10,
          left: 10,
          zIndex: 110,
          background: '#111827',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          color: '#94a3b8',
          fontSize: '1.3rem',
          width: 40,
          height: 40,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="Abrir menu"
      >
        &#9776;
      </button>
    )}

    {/* Backdrop - mobile only */}
    {isMobile && mobileOpen && (
      <div
        onClick={() => setMobileOpen(false)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 99,
        }}
      />
    )}

    <aside
      role={role}
      aria-label={ariaLabel}
      onMouseEnter={() => !isMobile && setExpanded(true)}
      onMouseLeave={() => { if (!isMobile) { setExpanded(false); setHoveredItem(null); } }}
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
        boxShadow: (showExpanded || mobileOpen) ? '8px 0 40px rgba(0,0,0,0.6)' : 'none',
      }}
    >
      {/* Logo */}
      <div style={{ padding: showExpanded ? '1.25rem 1rem' : '1.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.06)', justifyContent: showExpanded ? 'flex-start' : 'center', transition: 'padding 0.25s' }}>
        <img src="/img/logo_smart.svg" alt="SC" style={{ height: 24, flexShrink: 0 }} />
        {showExpanded && <span style={{ background: '#00e5b0', color: '#0a0d14', fontSize: '0.5rem', fontWeight: 800, padding: '2px 6px', borderRadius: 999, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>INTRANET</span>}
      </div>

      {/* Command Search Trigger */}
      {showExpanded ? (
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
        {showExpanded && <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 8px', marginBottom: 6 }}>Principal</div>}
        {navItems.map(item => (
          <a
            key={item.href}
            href={item.href}
            style={navLinkStyle(item.href)}
            title={!showExpanded ? item.label : undefined}
            onMouseEnter={() => setHoveredItem(item.href)}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => isMobile && setMobileOpen(false)}
          >
            <i className={`bi ${item.icon}`} style={{ fontSize: '1.1rem', width: 22, textAlign: 'center', flexShrink: 0 }}></i>
            {showExpanded && (
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
        {showExpanded && <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 8px', marginBottom: 6 }}>Infra</div>}
        {infraItems.map(item => (
          <a
            key={item.href}
            href={item.href}
            style={navLinkStyle(item.href)}
            title={!showExpanded ? item.label : undefined}
            onMouseEnter={() => setHoveredItem(item.href)}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={() => isMobile && setMobileOpen(false)}
          >
            <i className={`bi ${item.icon}`} style={{ fontSize: '1.1rem', width: 22, textAlign: 'center', flexShrink: 0, color: isActive(item.href) ? '#00e5b0' : item.iconColor }}></i>
            {showExpanded && <span>{item.label}</span>}
          </a>
        ))}
      </div>

      {/* Status */}
      {showExpanded && (
        <div style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {statusItems.map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px', fontSize: '0.65rem', color: '#64748b' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', flexShrink: 0 }}></span>
              {s.label} <span style={{ marginLeft: 'auto', fontSize: '0.6rem' }}>{s.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Theme Toggle */}
      <div style={{ padding: showExpanded ? '6px 12px' : '6px 0', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: showExpanded ? 'flex-start' : 'center', gap: 8 }}>
        {showExpanded ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 2, width: '100%' }}>
            <button onClick={() => setTheme('dark')} style={{
              flex: 1, padding: '5px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: theme === 'dark' ? 'rgba(0,229,176,0.12)' : 'transparent',
              color: theme === 'dark' ? '#00e5b0' : '#475569',
              fontSize: '0.65rem', fontWeight: 600, fontFamily: "'Inter', system-ui",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              transition: 'all 0.15s',
            }}>
              <i className="bi bi-moon-stars-fill" style={{ fontSize: '0.7rem' }}></i> Oscuro
            </button>
            <button onClick={() => setTheme('light')} style={{
              flex: 1, padding: '5px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: theme === 'light' ? 'rgba(245,158,11,0.12)' : 'transparent',
              color: theme === 'light' ? '#f59e0b' : '#475569',
              fontSize: '0.65rem', fontWeight: 600, fontFamily: "'Inter', system-ui",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              transition: 'all 0.15s',
            }}>
              <i className="bi bi-sun-fill" style={{ fontSize: '0.7rem' }}></i> Claro
            </button>
          </div>
        ) : (
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 6,
            color: theme === 'dark' ? '#475569' : '#f59e0b', fontSize: '0.9rem',
            transition: 'color 0.15s',
          }} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
            <i className={theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill'}></i>
          </button>
        )}
      </div>

      {/* User */}
      <div style={{ padding: showExpanded ? '0.75rem' : '0.75rem 0', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, justifyContent: showExpanded ? 'flex-start' : 'center' }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,229,176,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#00e5b0', fontWeight: 700, flexShrink: 0 }}>
          {user.charAt(0).toUpperCase()}
        </div>
        {showExpanded && (
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
    </>
  );
}
