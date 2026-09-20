import { NextRequest, NextResponse } from 'next/server';
import { firebaseSignIn } from '@/lib/firebase-auth-rest';
import { getFirebaseUserRecord } from '@/lib/firebase-repo';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password) return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });

    const auth = await firebaseSignIn(email, password);
    const record = await getFirebaseUserRecord(auth.localId);
    if (!record?.user) return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    return NextResponse.json({
      user: { id: auth.localId, name: record.user.name, email: record.user.email, role: record.user.role },
      token: auth.idToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid email or password';
    const status = message === 'Invalid email or password' ? 401 : 500;
    console.error('Firebase login error:', error);
    return NextResponse.json({ error: status === 401 ? message : 'Authentication service error' }, { status });
  }
}
