import { NextRequest, NextResponse } from 'next/server';
import { listFirebaseKyc } from '@/lib/firebase-repo';
import { isNextResponse, requireAdmin } from '@/lib/session';

export async function GET(request: NextRequest) {
  try { const auth = await requireAdmin(request); if (isNextResponse(auth)) return auth; return NextResponse.json(await listFirebaseKyc()); }
  catch (error) { console.error('Admin KYC list error:', error); return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}
