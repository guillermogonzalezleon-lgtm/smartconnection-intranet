'use client';

import { usePathname, useRouter } from 'next/navigation';

const TABS = [
  { key: 'all', label: 'Todos', href: '/dashboard/governance' },
  { key: 'templates', label: 'Templates', href: '/dashboard/governance?category=template' },
  { key: 'guidelines', label: 'Guidelines', href: '/dashboard/governance?category=guideline' },
  { key: 'standards', label: 'Standards', href: '/dashboard/governance?category=standard' },
];

function Breadcrumbs({ pathname }: { pathname: string }) {
  const segments = pathname.replace('/dashboard/governance', '').split('/').filter(Boolean);
  const crumbs = [{ label: 'Governance', href: '/dashboard/governance' }];

  if (segments.length > 0) {
    const category = segments[0];
    const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
    crumbs.push({ label: categoryLabel, href: `/dashboard/governance?category=${category.replace(/s$/, '')}` });
  }
  if (segments.length > 1) {
    const slug = decodeURIComponent(segments[1]).replace(/-/g, ' ');
    const docLabel = slug.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    crumbs.push({ label: docLabel, href: pathname });
  }

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#64748b' }}>
      {crumbs.map((c, i) => (
        <span key={c.href} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <span style={{ color: '#475569' }}>/</span>}
          {i < crumbs.length - 1 ? (
            <a href={c.href} style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#00e5b0')}
              onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
            >{c.label}</a>
          ) : (
            <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export default function GovernanceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isIndex = pathname === '/dashboard/governance';

  const activeTab = (() => {
    if (!isIndex) return null;
    return 'all';
  })();

  return (
    <div style={{
      padding: '1.5rem 2rem',
      fontFamily: "'Inter', system-ui, sans-serif",
      animation: 'fadeInUp 0.2s ease-out',
      minHeight: '100vh',
    }}>
      <Breadcrumbs pathname={pathname ?? '/dashboard/governance'} />

      {isIndex && (
        <div style={{
          display: 'flex',
          gap: 2,
          marginTop: 16,
          marginBottom: 24,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          paddingBottom: 0,
        }}>
          {TABS.map(tab => {
            const isActive = tab.key === 'all'
              ? !pathname.includes('?')
              : false;
            return (
              <a
                key={tab.key}
                href={tab.href}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  color: isActive ? '#00e5b0' : '#94a3b8',
                  textDecoration: 'none',
                  borderBottom: isActive ? '2px solid #00e5b0' : '2px solid transparent',
                  transition: 'all 0.15s ease',
                  marginBottom: -1,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#cbd5e1'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#94a3b8'; }}
              >
                {tab.label}
              </a>
            );
          })}
        </div>
      )}

      {children}

      <style>{`
        [data-theme="light"] .gov-layout { color: #0f172a; }
      `}</style>
    </div>
  );
}
