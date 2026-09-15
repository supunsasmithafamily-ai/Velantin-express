import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser, isNextResponse } from '@/lib/session';

// Starting a live stream is now a plain DB write (no WebSocket round trip).
// The Agora RTC channel itself is joined separately by the client using
// this stream's id as the channel name — this route just records the
// stream's existence so other users can discover it via /api/live/list.
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (isNextResponse(auth)) return auth;
    const userId = auth.userId;

    // If this user already has an active stream (e.g. they refreshed the
    // page mid-live), reuse it instead of creating a duplicate.
    const existing = await db.liveStream.findFirst({
      where: { hostId: userId, status: 'active' },
    });
    if (existing) {
      const host = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
      return NextResponse.json({ id: existing.id, title: existing.title, hostId: userId, host: host?.name ?? 'Host' });
    }

    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : undefined;

    const user = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const stream = await db.liveStream.create({
      data: { hostId: userId, title: title ?? `${user.name} live`, status: 'active' },
    });

    return NextResponse.json({ id: stream.id, title: stream.title, hostId: userId, host: user.name });
  } catch (error) {
    console.error('live/start error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
