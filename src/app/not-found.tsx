export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0d14', fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>404</div>
        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#475569', marginTop: 8 }}>Página no encontrada</div>
        <a href="/dashboard" style={{
          display: 'inline-block', marginTop: 20,
          background: 'linear-gradient(135deg, #00e5b0, #00c49a)',
          color: '#0a0d14', padding: '10px 24px', borderRadius: 10,
          fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none',
        }}>
          Ir al Dashboard
        </a>
      </div>
    </div>
  );
}
