import { NextRequest, NextResponse } from 'next/server';
import { isNextResponse, requireUser } from '@/lib/session';
import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (isNextResponse(auth)) return auth;
  try {
    const range = request.nextUrl.searchParams.get('range') ?? 'weekly';
    const snap = await getFirebaseAdminFirestore().collection('creatorAnalytics').doc(auth.userId).get();
    const data = snap.exists ? snap.data() : {};
    return NextResponse.json({ range, report: { totalViewers: Number(data?.totalViewers ?? 0), peakViewers: Number(data?.peakViewers ?? 0), watchTimeSeconds: Number(data?.watchTimeSeconds ?? 0), giftCoins: Number(data?.giftCoins ?? 0), subscriptionCoins: Number(data?.subscriptionCoins ?? 0), referralCoins: Number(data?.referralCoins ?? 0), followerGrowth: Number(data?.followerGrowth ?? 0), updatedAt: data?.updatedAt ?? null } });
  } catch (error) { console.error('creator/analytics error:', error); return NextResponse.json({ error: 'Could not load analytics' }, { status: 500 }); }
}
