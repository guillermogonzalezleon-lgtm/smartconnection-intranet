import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import CommandBar from '@/components/CommandBar';
import GlobalTerminal from '@/components/GlobalTerminal';
import HokuChat from '@/components/HokuChat';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.valid) redirect('/');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Sidebar user={session.user || 'Admin'} role="navigation" aria-label="Sidebar" />
      <main role="main" aria-label="Dashboard content" style={{
        flex: 1,
        marginLeft: 64,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#0a0d14',
        transition: 'margin-left 0.25s',
        position: 'relative',
      }}>
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: 34,
          animation: 'fadeInUp 0.2s ease-out',
        }}>
          {children}
        </div>
        <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @media (max-width: 768px) {
            main { margin-left: 0 !important; }
          }
        `}</style>
      </main>
      <CommandBar />
      <GlobalTerminal />
      <HokuChat />
    </div>
  );
}
