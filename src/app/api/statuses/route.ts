import { NextRequest, NextResponse } from 'next/server';
import { createFirebaseStatus, getFirebaseUserRecord, listFirebaseStatuses } from '@/lib/firebase-repo';
import { isNextResponse, requireUser } from '@/lib/session';

export async function GET() {
  try { return NextResponse.json(await listFirebaseStatuses()); }
  catch (error) { console.error('Fetch statuses error:', error); return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request); if (isNextResponse(auth)) return auth;
    const { text, imageUrl } = await request.json();
    if (typeof text !== 'string' || text.trim().length === 0) return NextResponse.json({ error: 'text must not be empty' }, { status: 400 });
    if (imageUrl !== undefined && imageUrl !== null && typeof imageUrl !== 'string') return NextResponse.json({ error: 'imageUrl must be a string' }, { status: 400 });
    const record = await getFirebaseUserRecord(auth.userId);
    if (!record?.user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const status = await createFirebaseStatus({ userId: auth.userId, userName: record.user.name, text: text.trim().slice(0, 300), imageUrl: imageUrl || null });
    return NextResponse.json(status, { status: 201 });
  } catch (error) { console.error('Create status error:', error); return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}
