import { NextRequest, NextResponse } from 'next/server';
import { listFirebaseCashouts } from '@/lib/firebase-repo';
import { isNextResponse, requireAdmin } from '@/lib/session';
export async function GET(request: NextRequest) { try { const auth = await requireAdmin(request); if (isNextResponse(auth)) return auth; return NextResponse.json(await listFirebaseCashouts()); } catch (error) { console.error('Admin cashout list error:', error); return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); } }
