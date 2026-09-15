import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireUser, isNextResponse } from '@/lib/session';

// Mirrors the gift catalog in src/app/page.tsx (GIFT_CATALOG) — keep the
// two in sync if gifts are ever added/changed/repriced.
const GIFT_CATALOG: Record<string, { name: string; coins: number }> = {
  rose: { name: 'Rose', coins: 10 },
  heart: { name: 'Heart', coins: 25 },
  kiss: { name: 'Kiss', coins: 40 },
  letter: { name: 'Love Letter', coins: 60 },
  bouquet: { name: 'Bouquet', coins: 120 },
  teddy: { name: 'Teddy Bear', coins: 180 },
  chocolate: { name: 'Chocolate Box', coins: 220 },
  spotlight: { name: 'Spotlight', coins: 300 },
  fireworks: { name: 'Fireworks', coins: 500 },
  ring: { name: 'Diamond Ring', coins: 700 },
  crown: { name: 'Crown', coins: 900 },
};

const PLATFORM_FEE_RATE = 0.3;
function coinsToDiamonds(coins: number) {
  return Math.max(0, Math.floor(coins * (1 - PLATFORM_FEE_RATE)));
}

// This route is the ONLY place coins/diamonds move for a gift. The Agora
// RTM broadcast the client sends afterwards is purely cosmetic (the
// on-screen gift animation for other viewers) — nobody's balance can be
// forged by faking an RTM message, because RTM never touches money.
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (isNextResponse(auth)) return auth;
    const userId = auth.userId;

    const body = await request.json().catch(() => ({}));
    const liveId = String(body.liveId || '');
    const giftId = String(body.giftId || '');
    const gift = GIFT_CATALOG[giftId];
    if (!liveId || !gift) {
      return NextResponse.json({ error: 'Unknown gift' }, { status: 400 });
    }

    const live = await db.liveStream.findUnique({ where: { id: liveId } });
    if (!live || live.status !== 'active') {
      return NextResponse.json({ error: 'Live stream not found' }, { status: 404 });
    }
    if (live.hostId === userId) {
      return NextResponse.json({ error: 'Cannot send a gift to your own stream' }, { status: 400 });
    }

    const sender = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
    const diamonds = coinsToDiamonds(gift.coins);

    // Atomic: check-and-decrement sender's coins, credit host's diamonds,
    // and log the gift, all in one transaction so a mid-way failure can't
    // leave coins deducted without diamonds credited (or vice versa).
    const result = await db.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet || wallet.coins < gift.coins) {
        throw new Error('INSUFFICIENT_COINS');
      }
      await tx.wallet.update({ where: { userId }, data: { coins: { decrement: gift.coins } } });
      await tx.wallet.upsert({
        where: { userId: live.hostId },
        create: { userId: live.hostId, coins: 0, diamonds, lifetimeEarned: diamonds },
        update: { diamonds: { increment: diamonds }, lifetimeEarned: { increment: diamonds } },
      });
      const giftRow = await tx.liveGift.create({
        data: {
          streamId: liveId,
          senderId: userId,
          senderName: sender?.name ?? 'Someone',
          giftName: gift.name,
          coins: gift.coins,
          diamonds,
        },
      });
      return giftRow;
    });

    return NextResponse.json({
      ok: true,
      giftId: result.id,
      giftName: gift.name,
      coins: gift.coins,
      diamonds,
      fromName: sender?.name ?? 'Someone',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_COINS') {
      return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 });
    }
    console.error('live/gift error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
