'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error);
  }, [error]);

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '2rem',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{
        background: '#111827',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 20,
        padding: '3rem',
        maxWidth: 480,
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'rgba(239,68,68,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          fontSize: '1.8rem',
          color: '#ef4444',
        }}>
          <i className="bi bi-exclamation-triangle"></i>
        </div>

        <h2 style={{
          fontSize: '1.2rem',
          fontWeight: 800,
          color: '#f1f5f9',
          marginBottom: '0.5rem',
        }}>
          Algo salió mal
        </h2>

        <p style={{
          fontSize: '0.82rem',
          color: '#94a3b8',
          lineHeight: 1.6,
          marginBottom: '1.5rem',
        }}>
          {error.message || 'Ocurrió un error inesperado al cargar esta sección.'}
        </p>

        {error.digest && (
          <div style={{
            fontSize: '0.65rem',
            fontFamily: "'JetBrains Mono', monospace",
            color: '#475569',
            background: '#0a0d14',
            padding: '0.5rem 1rem',
            borderRadius: 8,
            marginBottom: '1.5rem',
          }}>
            Error ID: {error.digest}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={() => unstable_retry()}
            style={{
              padding: '0.6rem 1.5rem',
              borderRadius: 10,
              border: '1px solid rgba(0,229,176,0.3)',
              background: 'rgba(0,229,176,0.1)',
              color: '#00e5b0',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: "'Inter', system-ui",
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <i className="bi bi-arrow-clockwise"></i> Reintentar
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            style={{
              padding: '0.6rem 1.5rem',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              color: '#94a3b8',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: "'Inter', system-ui",
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <i className="bi bi-house"></i> Ir al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
