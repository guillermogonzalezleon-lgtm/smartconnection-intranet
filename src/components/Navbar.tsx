'use client';
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      height: 56,
      background: 'rgba(17,24,39,0.9)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <Link href="/" style={{
        fontSize: '0.9rem',
        fontWeight: 800,
        color: '#00e5b0',
        textDecoration: 'none',
        letterSpacing: '-0.02em',
      }}>
        SM Connection
      </Link>
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <Link href="/dashboard" style={{ fontSize: '0.8rem', color: '#94a3b8', textDecoration: 'none', fontWeight: 500, transition: 'color 0.15s' }}>
          Dashboard
        </Link>
      </div>
    </nav>
  );
}
