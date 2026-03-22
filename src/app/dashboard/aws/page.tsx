'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function AWSRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/deploy'); }, [router]);
  return null;
}
