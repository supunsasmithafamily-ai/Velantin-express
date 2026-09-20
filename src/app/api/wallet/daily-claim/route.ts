import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import { getFirebaseWallet } from '@/lib/firebase-repo';
import { isNextResponse, requireUser } from '@/lib/session';

const BONUS = parseInt(process.env.DAILY_LOGIN_BONUS_COINS ?? '10', 10);
const INTERVAL = 24 * 60 * 60 * 1000;
const GRACE = 48 * 60 * 60 * 1000;

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (isNextResponse(auth)) return auth;
    const wallet = await getFirebaseWallet(auth.userId);
    if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    const last = asDate(wallet.lastDailyClaimAt);
    const available = !last || Date.now() - last.getTime() >= INTERVAL;
    return NextResponse.json({
      available,
      nextClaimAt: available || !last ? null : new Date(last.getTime() + INTERVAL).toISOString(),
      streak: Number(wallet.dailyStreak ?? 0),
      coinsOnClaim: BONUS,
    });
  } catch (error) {
    console.error('Daily claim status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (isNextResponse(auth)) return auth;
    const firestore = getFirebaseAdminFirestore();
    const result = await firestore.runTransaction(async (tx) => {
      const ref = firestore.collection('wallets').doc(auth.userId);
      const snap = await tx.get(ref);
      if (!snap.exists) return { missing: true } as const;
      const wallet = snap.data() ?? {};
      const last = asDate(wallet.lastDailyClaimAt);
      const now = Date.now();
      if (last && now - last.getTime() < INTERVAL) {
        return { already: true, nextClaimAt: new Date(last.getTime() + INTERVAL).toISOString() } as const;
      }
      const streak = last && now - last.getTime() <= GRACE ? Number(wallet.dailyStreak ?? 0) + 1 : 1;
      const coins = Number(wallet.coins ?? 0) + BONUS;
      tx.set(ref, {
        coins,
        lifetimeEarned: Number(wallet.lifetimeEarned ?? 0) + BONUS,
        lastDailyClaimAt: FieldValue.serverTimestamp(),
        dailyStreak: streak,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      tx.set(firestore.collection('transactions').doc(), {
        userId: auth.userId,
        type: 'daily_claim',
        coins: BONUS,
        createdAt: FieldValue.serverTimestamp(),
      });
      return { coins, streak, already: false } as const;
    });
    if ('missing' in result) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    if ('already' in result && result.already) {
      return NextResponse.json({ error: 'Already claimed today', nextClaimAt: result.nextClaimAt }, { status: 429 });
    }
    return NextResponse.json({
      ok: true,
      coinsAwarded: BONUS,
      coins: result.coins,
      streak: result.streak,
      nextClaimAt: new Date(Date.now() + INTERVAL).toISOString(),
    });
  } catch (error) {
    console.error('Daily claim error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
