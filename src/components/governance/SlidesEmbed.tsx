'use client';

import { useState } from 'react';

interface SlidesEmbedProps {
  fileId: string;
  title: string;
  driveUrl?: string;
}

export default function SlidesEmbed({ fileId, title, driveUrl }: SlidesEmbedProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const embedUrl = `https://docs.google.com/presentation/d/${fileId}/embed?start=false&loop=false&delayms=3000`;

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
          <span style={{ fontSize: '0.85rem' }}>📽️</span>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Google Slides</span>
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
              background: 'rgba(251,191,36,0.1)',
              border: '1px solid rgba(251,191,36,0.2)',
              color: '#fbbf24',
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
        <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
          }}>
            <div style={{ width: 48, height: 48, border: '2px solid rgba(251,191,36,0.2)', borderTopColor: '#fbbf24', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: '0.75rem', color: '#475569' }}>Cargando presentación...</span>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
          <span style={{ fontSize: '2rem' }}>📽️</span>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
            No se pudo cargar la presentación
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
                background: 'rgba(251,191,36,0.1)',
                border: '1px solid rgba(251,191,36,0.2)',
                color: '#fbbf24',
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

      {/* 16:9 responsive iframe */}
      <div style={{
        position: 'relative',
        width: '100%',
        paddingBottom: '56.25%',
        display: errored ? 'none' : 'block',
      }}>
        <iframe
          src={embedUrl}
          title={title}
          onLoad={() => setLoaded(true)}
          onError={() => { setLoaded(true); setErrored(true); }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
          allow="autoplay"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
        />
      </div>
    </div>
  );
}
