type AuthResponse = { idToken: string; localId: string; email: string; displayName?: string };

type AuthError = { error?: { message?: string } };

function getApiKey() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error('NEXT_PUBLIC_FIREBASE_API_KEY is not configured.');
  return apiKey;
}

async function callFirebaseAuth(endpoint: string, email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=${encodeURIComponent(getApiKey())}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const body = await response.json() as AuthResponse & AuthError;
  if (!response.ok || !body.idToken || !body.localId) {
    const code = body.error?.message;
    if (code === 'EMAIL_EXISTS') throw new Error('Email already registered');
    if (code === 'INVALID_PASSWORD' || code === 'EMAIL_NOT_FOUND' || code === 'INVALID_LOGIN_CREDENTIALS') throw new Error('Invalid email or password');
    throw new Error(code ?? 'Firebase Authentication failed');
  }
  return body;
}

export function firebaseSignUp(email: string, password: string) {
  return callFirebaseAuth('signUp', email, password);
}

export function firebaseSignIn(email: string, password: string) {
  return callFirebaseAuth('signInWithPassword', email, password);
}
