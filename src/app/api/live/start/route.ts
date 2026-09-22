import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from '@/lib/firebase-repo';
import { findActiveFirebaseLiveStream } from '@/lib/firebase-repo';
import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import { isNextResponse, requireUser } from '@/lib/session';
import { isValidPrivateRoomPrice } from '@/lib/monetization';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (isNextResponse(auth)) return auth;
    const userId = auth.userId;
    const firestore = getFirebaseAdminFirestore();
    const existing = await findActiveFirebaseLiveStream(userId);
    const userSnapshot = await firestore.collection('users').doc(userId).get();
    const userName = String(userSnapshot.data()?.name ?? 'Host');
    if (existing) return NextResponse.json({ id: existing.id, title: existing.title, hostId: userId, host: userName, accessType: existing.accessType ?? 'public', entryPriceCoins: Number(existing.entryPriceCoins ?? 0) });
    if (!userSnapshot.exists) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : `${userName} live`;
    const accessType = body.accessType === 'paid' || body.accessType === 'subscribers' ? body.accessType : 'public';
    const entryPriceCoins = accessType === 'paid' ? Number(body.entryPriceCoins) : 0;
    if (accessType === 'paid' && !isValidPrivateRoomPrice(entryPriceCoins)) {
      return NextResponse.json({ error: 'Paid rooms must cost between 25 and 10,000 whole coins.' }, { status: 400 });
    }
    const id = randomUUID();
    await firestore.collection('liveStreams').doc(id).set({ id, hostId: userId, title, status: 'active', accessType, entryPriceCoins, createdAt: FieldValue.serverTimestamp(), endedAt: null });
    return NextResponse.json({ id, title, hostId: userId, host: userName, accessType, entryPriceCoins });
  } catch (error) {
    console.error('live/start error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
