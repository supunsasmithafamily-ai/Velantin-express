import { NextRequest, NextResponse } from 'next/server';
import { ensureReferral, completeReferral } from '@/lib/creator-features';
import { getFirebaseUserRecord } from '@/lib/firebase-repo';
import { isNextResponse, requireUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (isNextResponse(auth)) return auth;
  try {
    const record = await getFirebaseUserRecord(auth.userId);
    return NextResponse.json({ referral: await ensureReferral(auth.userId, String(record?.user?.name ?? 'creator')) });
  } catch (error) { console.error('referrals/get error:', error); return NextResponse.json({ error: 'Could not load referrals' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (isNextResponse(auth)) return auth;
  try {
    const body = await request.json().catch(() => ({}));
    const code = String(body.code ?? '').trim();
    if (!code) return NextResponse.json({ error: 'Referral code is required' }, { status: 400 });
    return NextResponse.json({ result: await completeReferral(code, auth.userId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'REFERRAL_NOT_FOUND') return NextResponse.json({ error: 'Referral code not found' }, { status: 404 });
    if (message === 'SELF_REFERRAL') return NextResponse.json({ error: 'You cannot use your own referral code' }, { status: 400 });
    console.error('referrals/complete error:', error); return NextResponse.json({ error: 'Could not complete referral' }, { status: 500 });
  }
}
