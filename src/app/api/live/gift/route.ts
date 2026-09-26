import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from '@/lib/firebase-repo';
import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import { isNextResponse, requireUser } from '@/lib/session';
import { canAccessFirebaseLiveStream } from '@/lib/firebase-repo';
import { recordGiftMoment } from '@/lib/creator-features';

const GIFT_CATALOG: Record<string, { name: string; coins: number }> = {
  rose: { name: 'Rose', coins: 10 }, heart: { name: 'Heart', coins: 25 }, kiss: { name: 'Kiss', coins: 40 }, letter: { name: 'Love Letter', coins: 60 }, bouquet: { name: 'Bouquet', coins: 120 }, teddy: { name: 'Teddy Bear', coins: 180 }, chocolate: { name: 'Chocolate Box', coins: 220 }, spotlight: { name: 'Spotlight', coins: 300 }, fireworks: { name: 'Fireworks', coins: 500 }, ring: { name: 'Diamond Ring', coins: 700 }, crown: { name: 'Crown', coins: 900 },
};
const PLATFORM_FEE_RATE = 0.3;
const coinsToDiamonds = (coins: number) => Math.max(0, Math.floor(coins * (1 - PLATFORM_FEE_RATE)));

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (isNextResponse(auth)) return auth;
    const body = await request.json().catch(() => ({}));
    const liveId = String(body.liveId || '');
    const giftId = String(body.giftId || '');
    const gift = GIFT_CATALOG[giftId];
    if (!liveId || !gift) return NextResponse.json({ error: 'Unknown gift' }, { status: 400 });
    const access = await canAccessFirebaseLiveStream(auth.userId, liveId);
    if (!access.allowed) {
      if (access.reason === 'payment_required') return NextResponse.json({ error: 'Unlock this private room before sending gifts', code: access.reason }, { status: 402 });
      if (access.reason === 'subscription_required') return NextResponse.json({ error: 'Subscribe to this creator before sending gifts', code: access.reason }, { status: 403 });
      return NextResponse.json({ error: 'Live stream not found' }, { status: 404 });
    }
    const firestore = getFirebaseAdminFirestore();
    const streamSnapshot = await firestore.collection('liveStreams').doc(liveId).get();
    if (!streamSnapshot.exists || streamSnapshot.data()?.status !== 'active') return NextResponse.json({ error: 'Live stream not found' }, { status: 404 });
    const hostId = String(streamSnapshot.data()?.hostId ?? '');
    if (hostId === auth.userId) return NextResponse.json({ error: 'Cannot send a gift to your own stream' }, { status: 400 });
    const diamonds = coinsToDiamonds(gift.coins);
    const giftRecordId = randomUUID();
    let fromName = 'Someone';
    await firestore.runTransaction(async (transaction) => {
      const streamRef = firestore.collection('liveStreams').doc(liveId);
      const senderRef = firestore.collection('users').doc(auth.userId);
      const senderWalletRef = firestore.collection('wallets').doc(auth.userId);
      const hostWalletRef = firestore.collection('wallets').doc(hostId);
      const [live, sender, senderWallet, hostWallet] = await Promise.all([
        transaction.get(streamRef), transaction.get(senderRef), transaction.get(senderWalletRef), transaction.get(hostWalletRef),
      ]);
      if (!live.exists || live.data()?.status !== 'active') throw new Error('LIVE_NOT_FOUND');
      if (!senderWallet.exists || Number(senderWallet.data()?.coins ?? 0) < gift.coins) throw new Error('INSUFFICIENT_COINS');
      fromName = String(sender.data()?.name ?? 'Someone');
      transaction.update(senderWalletRef, { coins: FieldValue.increment(-gift.coins), updatedAt: FieldValue.serverTimestamp() });
      if (hostWallet.exists) {
        transaction.update(hostWalletRef, { diamonds: FieldValue.increment(diamonds), lifetimeEarned: FieldValue.increment(diamonds), updatedAt: FieldValue.serverTimestamp() });
      } else {
        transaction.set(hostWalletRef, { userId: hostId, coins: 0, diamonds, lifetimeEarned: diamonds, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      }
      transaction.set(firestore.collection('liveGifts').doc(giftRecordId), { id: giftRecordId, streamId: liveId, senderId: auth.userId, senderName: fromName, giftName: gift.name, coins: gift.coins, diamonds, createdAt: FieldValue.serverTimestamp() });
    });
    await recordGiftMoment({ liveId, streamId: liveId, senderId: auth.userId, senderName: fromName, hostId, giftName: gift.name, coins: gift.coins, diamonds });
    return NextResponse.json({ ok: true, giftId: giftRecordId, giftName: gift.name, coins: gift.coins, diamonds, fromName });
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_COINS') return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 });
    if (error instanceof Error && error.message === 'LIVE_NOT_FOUND') return NextResponse.json({ error: 'Live stream not found' }, { status: 404 });
    console.error('live/gift error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
