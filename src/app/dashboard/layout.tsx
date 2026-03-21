import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.valid) redirect('/');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Sidebar user={session.user || 'Admin'} />
      <main style={{
        flex: 1,
        marginLeft: 64,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#0a0d14',
        transition: 'margin-left 0.25s',
        position: 'relative',
      }}>
        {/* Noise texture overlay */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.035,
            pointerEvents: 'none',
            zIndex: 9999,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '256px 256px',
          }}
        />
        {/* Page content with fade-in */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeInUp 0.3s ease-out',
        }}>
          {children}
        </div>
        <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(6px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </main>
    </div>
  );
}
