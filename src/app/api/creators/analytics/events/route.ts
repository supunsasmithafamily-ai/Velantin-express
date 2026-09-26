import { NextRequest, NextResponse } from 'next/server';
import { isNextResponse, requireUser } from '@/lib/session';
import { recordCreatorEvent } from '@/lib/creator-features';

const ALLOWED = new Set(['viewer_join', 'viewer_leave', 'viewer_peak', 'subscription']);

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (isNextResponse(auth)) return auth;
  try {
    const body = await request.json().catch(() => ({}));
    const eventId = String(body.eventId ?? '').trim();
    const type = String(body.type ?? '').trim();
    if (!eventId || eventId.length > 128 || !ALLOWED.has(type)) return NextResponse.json({ error: 'eventId and supported event type are required' }, { status: 400 });
    const event: Record<string, unknown> = { type };
    for (const key of ['liveId', 'watchTimeSeconds', 'peakDelta', 'coins']) {
      if (body[key] !== undefined) event[key] = key === 'liveId' ? String(body[key]) : Number(body[key]);
    }
    await recordCreatorEvent(auth.userId, eventId, event);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('creator analytics event error:', error);
    return NextResponse.json({ error: 'Could not record analytics event' }, { status: 500 });
  }
}
