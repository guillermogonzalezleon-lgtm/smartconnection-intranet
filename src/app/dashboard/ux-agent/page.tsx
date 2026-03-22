'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// UX Agent fusionado con Improvements — redirigir
export default function UXAgentRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/improvements'); }, [router]);
  return null;
}
