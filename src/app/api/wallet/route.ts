import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseWallet } from '@/lib/firebase-repo';
import { isNextResponse, requireUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (isNextResponse(auth)) return auth;
    const wallet = await getFirebaseWallet(auth.userId);
    if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    return NextResponse.json({ coins: wallet.coins, diamonds: wallet.diamonds, lifetimeEarned: wallet.lifetimeEarned });
  } catch (error) {
    console.error('Wallet fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
