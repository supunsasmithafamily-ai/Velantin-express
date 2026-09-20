import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, getFirebaseLiveStream } from '@/lib/firebase-repo';
import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import { isNextResponse, requireUser } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (isNextResponse(auth)) return auth;
    const body = await request.json().catch(() => ({}));
    const liveId = String(body.liveId || '');
    if (!liveId) return NextResponse.json({ error: 'liveId is required' }, { status: 400 });
    const stream = await getFirebaseLiveStream(liveId);
    if (!stream) return NextResponse.json({ error: 'Live stream not found' }, { status: 404 });
    if (stream.hostId !== auth.userId) return NextResponse.json({ error: 'Only the host can end this stream' }, { status: 403 });
    await getFirebaseAdminFirestore().collection('liveStreams').doc(liveId).update({ status: 'ended', endedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('live/end error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
