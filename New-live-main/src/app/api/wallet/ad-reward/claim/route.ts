import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser, isNextResponse, verifyAdRewardToken } from '@/lib/session';

const AD_REWARD_COINS = parseInt(process.env.AD_REWARD_COINS ?? '5', 10);
const AD_REWARD_COOLDOWN_MINUTES = parseInt(process.env.AD_REWARD_COOLDOWN_MINUTES ?? '30', 10);

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (isNextResponse(auth)) return auth;
    const userId = auth.userId;

    const body = await request.json();
    const { token } = body;
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    const valid = await verifyAdRewardToken(token, userId);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid or expired ad session' }, { status: 400 });
    }

    const wallet = await db.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Re-check cooldown at claim time too (not just at start) — closes the
    // window where two "start" calls could each be followed by a "claim".
    if (wallet.lastAdRewardAt) {
      const cooldownMs = AD_REWARD_COOLDOWN_MINUTES * 60 * 1000;
      const elapsed = Date.now() - wallet.lastAdRewardAt.getTime();
      if (elapsed < cooldownMs) {
        return NextResponse.json({ error: 'Ad reward on cooldown' }, { status: 429 });
      }
    }

    const updated = await db.wallet.update({
      where: { userId },
      data: {
        coins: { increment: AD_REWARD_COINS },
        lastAdRewardAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, coinsAwarded: AD_REWARD_COINS, coins: updated.coins });
  } catch (error) {
    console.error('Ad reward claim error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
