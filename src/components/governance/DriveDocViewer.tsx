'use client';

import { useEffect, useState } from 'react';

interface DriveDocViewerProps {
  fileId: string;
  title: string;
  driveUrl?: string;
}

interface DriveResponse {
  html?: string;
  metadata?: { id: string; name: string; mimeType: string; modifiedTime: string };
  error?: string;
}

export default function DriveDocViewer({ fileId, title, driveUrl }: DriveDocViewerProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileId) return;
    setLoading(true);
    setError(null);

    fetch(`/api/governance/drive/${fileId}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<DriveResponse>;
      })
      .then(data => {
        if (data.error) throw new Error(data.error);
        if (!data.html) throw new Error('Sin contenido');
        setHtml(data.html);
      })
      .catch(err => {
        setError(err.message || 'Error al cargar el documento');
      })
      .finally(() => setLoading(false));
  }, [fileId]);

  if (loading) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[100, 85, 90, 70, 95, 60, 80].map((w, i) => (
            <div
              key={i}
              style={{
                height: 14,
                width: `${w}%`,
                borderRadius: 6,
                background: 'rgba(255,255,255,0.06)',
                animation: 'shimmer 1.4s ease-in-out infinite',
                animationDelay: `${i * 0.07}s`,
              }}
            />
          ))}
          <div style={{ height: 14, width: '40%', borderRadius: 6, background: 'rgba(255,255,255,0.06)', animation: 'shimmer 1.4s ease-in-out infinite' }} />
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
          {[75, 88, 65, 92].map((w, i) => (
            <div key={i + 10} style={{ height: 13, width: `${w}%`, borderRadius: 6, background: 'rgba(255,255,255,0.05)', animation: 'shimmer 1.4s ease-in-out infinite', animationDelay: `${(i + 7) * 0.07}s` }} />
          ))}
        </div>
        <style>{`
          @keyframes shimmer {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  if (error || !html) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px dashed rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: '48px 32px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{ fontSize: '2rem' }}>📄</span>
        <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
          No se pudo cargar el documento
        </p>
        {error && (
          <p style={{ fontSize: '0.72rem', color: '#475569', margin: 0, fontFamily: 'monospace' }}>
            {error}
          </p>
        )}
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
              background: 'rgba(167,139,250,0.15)',
              border: '1px solid rgba(167,139,250,0.3)',
              color: '#c4b5fd',
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
    );
  }

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
          <span style={{ fontSize: '0.85rem' }}>📄</span>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Google Doc</span>
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
              background: 'rgba(167,139,250,0.1)',
              border: '1px solid rgba(167,139,250,0.2)',
              color: '#a78bfa',
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

      {/* Content */}
      <div
        style={{
          maxHeight: '70vh',
          overflowY: 'auto',
          padding: '24px 32px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.1) transparent',
        }}
      >
        <div
          className="drive-doc-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      <style>{`
        .drive-doc-content {
          background: transparent !important;
          color: #e2e8f0;
          font-size: 0.88rem;
          line-height: 1.7;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .drive-doc-content * {
          background: transparent !important;
          color: inherit;
        }
        .drive-doc-content body {
          background: transparent !important;
        }
        .drive-doc-content h1,
        .drive-doc-content h2,
        .drive-doc-content h3,
        .drive-doc-content h4,
        .drive-doc-content h5,
        .drive-doc-content h6 {
          color: #f1f5f9 !important;
          font-weight: 600;
          margin: 1.4em 0 0.5em;
          line-height: 1.3;
        }
        .drive-doc-content h1 { font-size: 1.4rem; }
        .drive-doc-content h2 { font-size: 1.15rem; }
        .drive-doc-content h3 { font-size: 1rem; }
        .drive-doc-content p {
          margin: 0 0 0.9em;
          color: #e2e8f0;
        }
        .drive-doc-content a {
          color: #a78bfa !important;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .drive-doc-content a:hover {
          color: #c4b5fd !important;
        }
        .drive-doc-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
          font-size: 0.82rem;
        }
        .drive-doc-content th,
        .drive-doc-content td {
          border: 1px solid rgba(255,255,255,0.1) !important;
          padding: 8px 12px;
          text-align: left;
          background: transparent !important;
        }
        .drive-doc-content th {
          background: rgba(255,255,255,0.04) !important;
          color: #f1f5f9 !important;
          font-weight: 600;
        }
        .drive-doc-content tr:nth-child(even) td {
          background: rgba(255,255,255,0.02) !important;
        }
        .drive-doc-content code,
        .drive-doc-content pre {
          background: rgba(255,255,255,0.05) !important;
          color: #c4b5fd !important;
          border-radius: 4px;
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 0.82em;
        }
        .drive-doc-content code {
          padding: 2px 6px;
        }
        .drive-doc-content pre {
          padding: 12px 16px;
          overflow-x: auto;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .drive-doc-content ul,
        .drive-doc-content ol {
          padding-left: 1.5em;
          margin: 0.6em 0 0.9em;
        }
        .drive-doc-content li {
          margin-bottom: 0.3em;
          color: #e2e8f0;
        }
        .drive-doc-content strong,
        .drive-doc-content b {
          color: #f1f5f9 !important;
          font-weight: 600;
        }
        .drive-doc-content em,
        .drive-doc-content i {
          color: #cbd5e1 !important;
        }
        .drive-doc-content hr {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.08);
          margin: 1.5em 0;
        }
        .drive-doc-content img {
          max-width: 100%;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .drive-doc-content blockquote {
          border-left: 3px solid rgba(167,139,250,0.5);
          padding-left: 1em;
          margin: 1em 0;
          color: #94a3b8 !important;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
