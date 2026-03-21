export default function AWSPage() {
  const cards = [
    { icon: 'bi-bucket', label: 'S3 Bucket', value: 'smartconnetion25', status: 'Operational', color: '#f97316' },
    { icon: 'bi-lightning-charge', label: 'CloudFront', value: 'E3O4YBX3RKHQUL', status: 'Deployed', color: '#f97316' },
    { icon: 'bi-globe', label: 'Dominio', value: 'www.smconnection.cl', status: 'Active', color: '#22c55e' },
    { icon: 'bi-geo-alt', label: 'Región', value: 'sa-east-1 + us-east-1', status: 'CDN Global', color: '#3b82f6' },
  ];

  return (
    <>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(17,24,39,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', height: 56, display: 'flex', alignItems: 'center', padding: '0 2rem', fontSize: '0.85rem', color: '#94a3b8' }}>
        Intranet <span style={{ margin: '0 8px', color: '#475569' }}>/</span> <span style={{ color: '#fff', fontWeight: 600 }}>AWS Panel</span>
      </div>
      <div style={{ padding: '1.5rem 2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {cards.map((c, i) => (
            <div key={i} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1.25rem', borderLeft: `3px solid ${c.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <i className={`bi ${c.icon}`} style={{ color: c.color }}></i>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{c.label}</span>
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>{c.value}</div>
              <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>● {c.status}</span>
            </div>
          ))}
        </div>

        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#f1f5f9' }}><i className="bi bi-cloud" style={{ color: '#f97316' }}></i> CloudFront Distribution</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.78rem' }}>
            <div><span style={{ color: '#64748b' }}>Distribution ID:</span> <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#94a3b8' }}>E3O4YBX3RKHQUL</span></div>
            <div><span style={{ color: '#64748b' }}>Domain:</span> <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#94a3b8' }}>d5bva36ud3xmb.cloudfront.net</span></div>
            <div><span style={{ color: '#64748b' }}>Aliases:</span> <span style={{ color: '#94a3b8' }}>smconnection.cl, www.smconnection.cl</span></div>
            <div><span style={{ color: '#64748b' }}>Status:</span> <span style={{ color: '#22c55e', fontWeight: 600 }}>● Deployed</span></div>
            <div><span style={{ color: '#64748b' }}>HTTP/3:</span> <span style={{ color: '#22c55e' }}>✓</span></div>
            <div><span style={{ color: '#64748b' }}>Compression:</span> <span style={{ color: '#22c55e' }}>✓</span></div>
          </div>
        </div>
      </div>
    </>
  );
}
