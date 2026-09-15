import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Polled every few seconds from the client (replaces the old WebSocket
// "presence"-driven live list). Streams older than 6h with no explicit
// end are treated as stale (crashed host, etc.) and filtered out here
// rather than shown as a ghost "live" tile forever.
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

export async function GET() {
  try {
    const cutoff = new Date(Date.now() - STALE_AFTER_MS);
    const streams = await db.liveStream.findMany({
      where: { status: 'active', createdAt: { gt: cutoff } },
      orderBy: { createdAt: 'desc' },
      include: { host: { select: { name: true } } },
      take: 50,
    });

    const lives = streams.map(s => ({
      id: s.id,
      hostId: s.hostId,
      host: s.host.name,
      title: s.title,
      viewers: 0, // live viewer counts come from the Agora RTC channel client-side, not tracked server-side
    }));

    return NextResponse.json({ lives });
  } catch (error) {
    console.error('live/list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

