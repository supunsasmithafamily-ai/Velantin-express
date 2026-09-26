import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getReplay } from '@/lib/creator-features';
import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import { isNextResponse, requireUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  const liveId = request.nextUrl.searchParams.get('liveId');
  if (!liveId) return NextResponse.json({ error: 'liveId is required' }, { status: 400 });
  try { return NextResponse.json(await getReplay(liveId)); }
  catch (error) { console.error('live/replay get error:', error); return NextResponse.json({ error: 'Could not load replay' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (isNextResponse(auth)) return auth;
  try {
    const body = await request.json().catch(() => ({}));
    const liveId = String(body.liveId ?? '');
    const startSeconds = Math.max(0, Number(body.startSeconds ?? 0));
    const endSeconds = Math.max(startSeconds, Number(body.endSeconds ?? startSeconds + 30));
    if (!liveId) return NextResponse.json({ error: 'liveId is required' }, { status: 400 });
    const stream = await getFirebaseAdminFirestore().collection('liveStreams').doc(liveId).get();
    if (!stream.exists) return NextResponse.json({ error: 'Live stream not found' }, { status: 404 });
    if (String(stream.data()?.hostId ?? '') !== auth.userId) return NextResponse.json({ error: 'Only the host can create a clip' }, { status: 403 });
    const id = randomUUID();
    await getFirebaseAdminFirestore().collection('liveClips').doc(id).set({ id, liveId, hostId: auth.userId, title: String(body.title ?? 'Live moment'), startSeconds, endSeconds, createdAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ ok: true, clipId: id });
  } catch (error) { console.error('live/replay clip error:', error); return NextResponse.json({ error: 'Could not create clip' }, { status: 500 }); }
}
