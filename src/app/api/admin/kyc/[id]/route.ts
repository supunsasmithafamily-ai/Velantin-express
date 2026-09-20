import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseKycById, reviewFirebaseKyc } from '@/lib/firebase-repo';
import { isNextResponse, requireAdmin } from '@/lib/session';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(request); if (isNextResponse(auth)) return auth;
    const { id } = await params; const { action } = await request.json();
    if (!action || !['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
    const submission = await getFirebaseKycById(id);
    if (!submission) return NextResponse.json({ error: 'KYC submission not found' }, { status: 404 });
    if (submission.status !== 'pending') return NextResponse.json({ error: `Cannot review a submission with status: ${submission.status}` }, { status: 400 });
    const status = await reviewFirebaseKyc(id, action === 'approve' ? 'approved' : 'rejected', auth.userId);
    return NextResponse.json({ ok: true, status });
  } catch (error) { console.error('Admin KYC review error:', error); return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}
