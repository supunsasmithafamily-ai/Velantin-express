import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser, isNextResponse } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (isNextResponse(auth)) return auth;
    const userId = auth.userId;

    const body = await request.json().catch(() => ({}));
    const liveId = String(body.liveId || '');
    if (!liveId) return NextResponse.json({ error: 'liveId is required' }, { status: 400 });

    const stream = await db.liveStream.findUnique({ where: { id: liveId } });
    if (!stream) return NextResponse.json({ error: 'Live stream not found' }, { status: 404 });
    if (stream.hostId !== userId) return NextResponse.json({ error: 'Only the host can end this stream' }, { status: 403 });

    await db.liveStream.update({
      where: { id: liveId },
      data: { status: 'ended', endedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('live/end error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

