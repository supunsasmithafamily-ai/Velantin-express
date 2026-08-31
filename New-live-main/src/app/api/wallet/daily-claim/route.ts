import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser, isNextResponse } from '@/lib/session';

const DAILY_BONUS_COINS = parseInt(process.env.DAILY_LOGIN_BONUS_COINS ?? '10', 10);
const CLAIM_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (isNextResponse(auth)) return auth;
    const userId = auth.userId;

    const wallet = await db.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const now = new Date();
    if (wallet.lastDailyClaimAt) {
      const elapsed = now.getTime() - wallet.lastDailyClaimAt.getTime();
      if (elapsed < CLAIM_INTERVAL_MS) {
        const nextClaimAt = new Date(wallet.lastDailyClaimAt.getTime() + CLAIM_INTERVAL_MS);
        return NextResponse.json(
          { error: 'Already claimed today', nextClaimAt: nextClaimAt.toISOString() },
          { status: 429 },
        );
      }
    }

    const updated = await db.wallet.update({
      where: { userId },
      data: {
        coins: { increment: DAILY_BONUS_COINS },
        lastDailyClaimAt: now,
      },
    });

    return NextResponse.json({
      ok: true,
      coinsAwarded: DAILY_BONUS_COINS,
      coins: updated.coins,
      nextClaimAt: new Date(now.getTime() + CLAIM_INTERVAL_MS).toISOString(),
    });
  } catch (error) {
    console.error('Daily claim error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
