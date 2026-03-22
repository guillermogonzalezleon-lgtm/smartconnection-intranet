import { NextResponse } from 'next/server';
import { trackEvent } from '@/lib/analytics';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await trackEvent(
      body.page || '/',
      body.event || 'pageview',
      body.source || 'marketing',
      [body.medium, body.campaign, body.term].filter(Boolean).join(' | ') || undefined,
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false });
  }
}
