import { NextResponse } from 'next/server';
import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import { listActiveFirebaseLiveStreams } from '@/lib/firebase-repo';

const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

export async function GET() {
  try {
    const firestore = getFirebaseAdminFirestore();
    const streams = await listActiveFirebaseLiveStreams(new Date(Date.now() - STALE_AFTER_MS));
    const lives = await Promise.all(streams.map(async (stream) => {
      const hostSnapshot = await firestore.collection('users').doc(stream.hostId).get();
      return { id: stream.id, hostId: stream.hostId, host: String(hostSnapshot.data()?.name ?? 'Host'), title: stream.title, viewers: 0 };
    }));
    return NextResponse.json({ lives });
  } catch (error) {
    console.error('live/list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
