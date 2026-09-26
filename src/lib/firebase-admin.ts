import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import { getStorage, type Storage } from 'firebase-admin/storage';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminFirestore: Firestore | null = null;
let adminMessaging: Messaging | null = null;
let adminStorage: Storage | null = null;

function getAdminApp(): App {
  if (adminApp) return adminApp;
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.');
  }
  adminApp = getApps()[0] ?? initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
  return adminApp;
}

export function getFirebaseAdminAuth(): Auth {
  adminAuth ??= getAuth(getAdminApp());
  return adminAuth;
}

export function getFirebaseAdminFirestore(): Firestore {
  adminFirestore ??= getFirestore(getAdminApp());
  return adminFirestore;
}

export function getFirebaseAdminMessaging(): Messaging {
  adminMessaging ??= getMessaging(getAdminApp());
  return adminMessaging;
}

export function getFirebaseAdminStorage(): Storage {
  adminStorage ??= getStorage(getAdminApp());
  return adminStorage;
}

export async function verifyFirebaseIdToken(token: string) {
  return getFirebaseAdminAuth().verifyIdToken(token);
}

export function firebaseTimestamp(value: Date = new Date()) {
  return value;
}
