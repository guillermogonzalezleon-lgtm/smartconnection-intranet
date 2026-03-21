import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.valid) redirect('/');

  return (
    <div className="flex min-h-screen" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Sidebar user={session.user || 'Admin'} />
      <main className="flex-1 ml-[240px] min-h-screen flex flex-col" style={{ background: '#0a0d14' }}>
        {children}
      </main>
    </div>
  );
}
