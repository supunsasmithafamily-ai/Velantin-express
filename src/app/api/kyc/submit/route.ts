import { NextRequest, NextResponse } from 'next/server';
import { upsertFirebaseKyc } from '@/lib/firebase-repo';
import { isNextResponse, requireUser } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (isNextResponse(auth)) return auth;
    const { selfieUrl, nicFrontUrl, nicBackUrl } = await request.json();
    if (!selfieUrl) return NextResponse.json({ error: 'selfieUrl is required' }, { status: 400 });
    const submission = await upsertFirebaseKyc(auth.userId, { selfieUrl, nicFrontUrl: nicFrontUrl ?? null, nicBackUrl: nicBackUrl ?? null, status: 'pending', reviewedBy: null, reviewedAt: null });
    return NextResponse.json({ ok: true, status: submission?.status });
  } catch (error) { console.error('KYC submit error:', error); return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}
