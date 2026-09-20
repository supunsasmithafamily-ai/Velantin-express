import { NextRequest, NextResponse } from 'next/server';
import { firebaseSignUp } from '@/lib/firebase-auth-rest';
import { createFirebaseUserRecord } from '@/lib/firebase-repo';

const isAdminEmail = (email: string) => (process.env.ADMIN_EMAILS ?? '').split(',').map(value => value.trim().toLowerCase()).includes(email);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!name || name.length > 32) return NextResponse.json({ error: 'Name is required and must be 1-32 characters' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });

    const auth = await firebaseSignUp(email, password);
    const role = isAdminEmail(email) ? 'admin' : 'user';
    await createFirebaseUserRecord({ id: auth.localId, name, email, role });
    return NextResponse.json({ user: { id: auth.localId, name, email, role }, token: auth.idToken }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    console.error('Firebase register error:', error);
    if (message === 'Email already registered') return NextResponse.json({ error: message }, { status: 409 });
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
