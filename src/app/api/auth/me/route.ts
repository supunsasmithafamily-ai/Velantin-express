import { NextRequest, NextResponse } from 'next/server';
import { requireUser, isNextResponse } from '@/lib/session';
import { getFirebaseUserRecord, listFirebaseSubscriptions } from '@/lib/firebase-repo';

function calculateAge(birthday: unknown) {
  if (!birthday) return null;
  const birth = new Date(String(birthday));
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const month = today.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (isNextResponse(auth)) return auth;
    const record = await getFirebaseUserRecord(auth.userId);
    if (!record?.user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
    return NextResponse.json({
      user: record.user,
      profile: record.profile ? { ...record.profile, age: calculateAge(record.profile.birthday) } : null,
      wallet: record.wallet,
      kyc: record.kyc,
      subscriptions: await listFirebaseSubscriptions(auth.userId),
    });
  } catch (error) {
    console.error('Firebase auth me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
