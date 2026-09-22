import { NextRequest, NextResponse } from 'next/server';
import { listFirebaseSubscriptions, subscribeFirebaseToCreator } from '@/lib/firebase-repo';
import { SUBSCRIPTION_PLANS } from '@/lib/monetization';
import { isNextResponse, requireUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (isNextResponse(auth)) return auth;
    return NextResponse.json({ plans: SUBSCRIPTION_PLANS, subscriptions: await listFirebaseSubscriptions(auth.userId) });
  } catch (error) {
    console.error('subscriptions/list error:', error);
    return NextResponse.json({ error: 'Could not load subscriptions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (isNextResponse(auth)) return auth;
    const body = await request.json().catch(() => ({}));
    const creatorId = String(body.creatorId ?? '');
    const planId = String(body.planId ?? '') as Parameters<typeof subscribeFirebaseToCreator>[2];
    if (!creatorId || !planId) return NextResponse.json({ error: 'creatorId and planId are required' }, { status: 400 });
    const result = await subscribeFirebaseToCreator(auth.userId, creatorId, planId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'CANNOT_SUBSCRIBE_SELF') return NextResponse.json({ error: 'You cannot subscribe to yourself' }, { status: 400 });
    if (code === 'INVALID_SUBSCRIPTION_PLAN') return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 });
    if (code === 'CREATOR_NOT_FOUND') return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    if (code === 'INSUFFICIENT_COINS') return NextResponse.json({ error: 'Not enough coins. Buy a coin pack first.', code }, { status: 402 });
    if (code === 'WALLET_NOT_FOUND') return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    console.error('subscriptions/create error:', error);
    return NextResponse.json({ error: 'Could not activate subscription' }, { status: 500 });
  }
}
