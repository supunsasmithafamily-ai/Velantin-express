import { NextRequest, NextResponse } from 'next/server';
import { listFirebaseCashouts } from '@/lib/firebase-repo';
import { isNextResponse, requireUser } from '@/lib/session';
export async function GET(request: NextRequest) { try { const auth = await requireUser(request); if (isNextResponse(auth)) return auth; return NextResponse.json(await listFirebaseCashouts(auth.userId)); } catch (error) { console.error('Cashout my requests error:', error); return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); } }
