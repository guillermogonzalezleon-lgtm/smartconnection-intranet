import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/LoginForm';

export default async function Home() {
  const session = await getSession();
  if (session.valid) redirect('/dashboard');
  return <LoginForm />;
}
