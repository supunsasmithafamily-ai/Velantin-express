import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser, isNextResponse, createAdRewardToken } from '@/lib/session';

const AD_REWARD_COOLDOWN_MINUTES = parseInt(process.env.AD_REWARD_COOLDOWN_MINUTES ?? '30', 10);

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (isNextResponse(auth)) return auth;
    const userId = auth.userId;

    const wallet = await db.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    if (wallet.lastAdRewardAt) {
      const cooldownMs = AD_REWARD_COOLDOWN_MINUTES * 60 * 1000;
      const elapsed = Date.now() - wallet.lastAdRewardAt.getTime();
      if (elapsed < cooldownMs) {
        const nextAvailableAt = new Date(wallet.lastAdRewardAt.getTime() + cooldownMs);
        return NextResponse.json(
          { error: 'Ad reward on cooldown', nextAvailableAt: nextAvailableAt.toISOString() },
          { status: 429 },
        );
      }
    }

    const token = await createAdRewardToken(userId);
    return NextResponse.json({ token });
  } catch (error) {
    console.error('Ad reward start error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
