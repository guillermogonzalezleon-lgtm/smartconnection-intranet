'use client';

import { useState } from 'react';

interface SheetViewerProps {
  fileId: string;
  title: string;
  driveUrl?: string;
}

export default function SheetViewer({ fileId, title, driveUrl }: SheetViewerProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const embedUrl = `https://docs.google.com/spreadsheets/d/${fileId}/preview`;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.85rem' }}>📊</span>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Google Sheets</span>
        </div>
        {driveUrl && (
          <a
            href={driveUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 12px',
              borderRadius: 6,
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.2)',
              color: '#4ade80',
              fontSize: '0.7rem',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            <i className="bi bi-box-arrow-up-right" style={{ fontSize: '0.65rem' }}></i>
            Abrir en Drive
          </a>
        )}
      </div>

      {/* Skeleton while loading */}
      {!loaded && !errored && (
        <div style={{ padding: 16 }}>
          {/* Header row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {[120, 160, 100, 140, 90].map((w, i) => (
              <div key={i} style={{ height: 28, width: w, borderRadius: 4, background: 'rgba(255,255,255,0.08)', animation: 'shimmer 1.4s ease-in-out infinite', animationDelay: `${i * 0.05}s` }} />
            ))}
          </div>
          {/* Data rows */}
          {[0, 1, 2, 3, 4].map(row => (
            <div key={row} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              {[120, 160, 100, 140, 90].map((w, i) => (
                <div key={i} style={{ height: 22, width: w, borderRadius: 4, background: 'rgba(255,255,255,0.04)', animation: 'shimmer 1.4s ease-in-out infinite', animationDelay: `${(row * 5 + i) * 0.04}s` }} />
              ))}
            </div>
          ))}
          <style>{`@keyframes shimmer { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }`}</style>
        </div>
      )}

      {/* Error state */}
      {errored && (
        <div style={{
          padding: '48px 32px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ fontSize: '2rem' }}>📊</span>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
            No se pudo cargar la hoja de cálculo
          </p>
          {driveUrl && (
            <a
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginTop: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 18px',
                borderRadius: 8,
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.2)',
                color: '#4ade80',
                fontSize: '0.78rem',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              <i className="bi bi-box-arrow-up-right" style={{ fontSize: '0.72rem' }}></i>
              Abrir en Drive
            </a>
          )}
        </div>
      )}

      {/* iframe */}
      <div style={{ position: 'relative', display: errored ? 'none' : 'block' }}>
        <iframe
          src={embedUrl}
          title={title}
          onLoad={() => setLoaded(true)}
          onError={() => { setLoaded(true); setErrored(true); }}
          style={{
            display: 'block',
            width: '100%',
            height: '520px',
            border: 'none',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
          allow="autoplay"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
    </div>
  );
}
