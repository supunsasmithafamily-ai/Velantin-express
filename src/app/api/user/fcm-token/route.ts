import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from '@/lib/firebase-repo';
import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import { isNextResponse, requireUser } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (isNextResponse(auth)) return auth;
    const body = await request.json();
    const { token } = body;
    if (!token || typeof token !== 'string') return NextResponse.json({ error: 'token is required' }, { status: 400 });
    await getFirebaseAdminFirestore().collection('users').doc(auth.userId).set({ fcmToken: token, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Save FCM token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (isNextResponse(auth)) return auth;
    await getFirebaseAdminFirestore().collection('users').doc(auth.userId).set({ fcmToken: null, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Clear FCM token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
