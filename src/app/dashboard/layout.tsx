import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.valid) redirect('/');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Sidebar user={session.user || 'Admin'} />
      <main style={{ flex: 1, marginLeft: 64, minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0d14', transition: 'margin-left 0.25s' }}>
        {children}
      </main>
    </div>
  );
}
