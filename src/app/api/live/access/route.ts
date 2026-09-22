import { NextRequest, NextResponse } from 'next/server';
import { grantFirebaseLiveRoomAccess } from '@/lib/firebase-repo';
import { isNextResponse, requireUser } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (isNextResponse(auth)) return auth;
    const body = await request.json().catch(() => ({}));
    const liveId = String(body.liveId ?? '');
    if (!liveId) return NextResponse.json({ error: 'liveId is required' }, { status: 400 });
    const result = await grantFirebaseLiveRoomAccess(auth.userId, liveId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'ROOM_NOT_FOUND') return NextResponse.json({ error: 'Live room not found or already ended' }, { status: 404 });
    if (code === 'SUBSCRIPTION_REQUIRED') return NextResponse.json({ error: 'This room is for subscribers only', code }, { status: 403 });
    if (code === 'INSUFFICIENT_COINS') return NextResponse.json({ error: 'Not enough coins. Buy a coin pack first.', code }, { status: 402 });
    if (code === 'WALLET_NOT_FOUND') return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    console.error('live/access error:', error);
    return NextResponse.json({ error: 'Could not unlock this live room' }, { status: 500 });
  }
}
