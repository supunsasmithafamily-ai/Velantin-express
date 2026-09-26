import { NextResponse } from 'next/server';
import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const firestore = getFirebaseAdminFirestore();
    const snapshot = await firestore.collection('liveReplays').get();
    const replays = await Promise.all(snapshot.docs.map(async doc => {
      const replay = doc.data();
      const [moments, clips] = await Promise.all([
        firestore.collection('liveMoments').where('liveId', '==', doc.id).get(),
        firestore.collection('liveClips').where('liveId', '==', doc.id).get(),
      ]);
      return {
        id: doc.id,
        title: String(replay.title ?? 'Live replay'),
        views: Number(replay.views ?? 0),
        durationSeconds: Number(replay.durationSeconds ?? 0),
        videoUrl: typeof replay.videoUrl === 'string' ? replay.videoUrl : undefined,
        moments: moments.size,
        clips: clips.size,
        createdAt: replay.createdAt ?? null,
      };
    }));
    replays.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
    return NextResponse.json({ replays });
  } catch (error) {
    console.error('live/replays error:', error);
    return NextResponse.json({ error: 'Could not load replays' }, { status: 500 });
  }
}
