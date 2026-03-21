import { NextResponse } from 'next/server';
import { trackEvent } from '@/lib/analytics';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await trackEvent({
      event: body.event,
      page: body.page,
      source: body.source,
      medium: body.medium,
      campaign: body.campaign,
      term: body.term,
      content: body.content,
      referrer: body.referrer,
      lang: body.lang,
      userAgent: request.headers.get('user-agent') || undefined,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false });
  }
}
