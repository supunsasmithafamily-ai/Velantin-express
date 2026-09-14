import { NextRequest, NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole, RtmTokenBuilder } from 'agora-token';
import { requireUser, isNextResponse } from '@/lib/session';

// Tokens are short-lived (1 hour) — the client re-requests a fresh one each
// time it joins a channel, so we never need to worry about long-term leaks.
const TOKEN_TTL_SECONDS = 60 * 60;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (isNextResponse(auth)) return auth;
    const userId = auth.userId;

    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;
    if (!appId || !appCertificate) {
      return NextResponse.json(
        { error: 'Agora is not configured. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE.' },
        { status: 502 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const channelName = String(body.channelName || '');
    if (!channelName) {
      return NextResponse.json({ error: 'channelName is required' }, { status: 400 });
    }
    // 'host' = broadcaster (going live), 'audience' = viewer (watching).
    const role = body.role === 'host' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    const now = Math.floor(Date.now() / 1000);
    const expireAt = now + TOKEN_TTL_SECONDS;

    // RTC token — for the video/audio channel itself. Agora identifies
    // participants in an RTC channel by a numeric uid; we derive a stable
    // one from the user's id so the same person always gets the same uid.
    const numericUid = stableUidFromUserId(userId);
    const rtcToken = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      numericUid,
      role,
      expireAt,
      expireAt,
    );

    // RTM token — for chat/gifts/presence messaging. RTM uses the raw
    // userId string (not the numeric uid) as the identity.
    const rtmToken = RtmTokenBuilder.buildToken(appId, appCertificate, userId, expireAt);

    return NextResponse.json({
      appId,
      rtcToken,
      rtmToken,
      uid: numericUid,
      channelName,
      expireAt,
    });
  } catch (error) {
    console.error('Agora token error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Agora RTC uids are 32-bit unsigned ints. User ids here are cuids
// (strings) — hash to a stable positive int so the same user always maps
// to the same uid across sessions (needed so e.g. reconnects work cleanly).
function stableUidFromUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  // Keep it within a safe positive range, avoid 0 (Agora treats 0 as "let
  // the server assign one", which we don't want here).
  return (hash % 2147483646) + 1;
}
