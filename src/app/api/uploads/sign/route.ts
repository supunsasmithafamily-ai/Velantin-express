import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminStorage } from '@/lib/firebase-admin';
import { requireUser, isNextResponse } from '@/lib/session';

const VALID_KINDS = ['avatar', 'kyc_selfie', 'kyc_nic_front', 'kyc_nic_back', 'status'] as const;
type UploadKind = typeof VALID_KINDS[number];

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (isNextResponse(auth)) return auth;
    const body = await request.json().catch(() => ({}));
    const kind = body.kind as string;
    const contentType = typeof body.contentType === 'string' && body.contentType.startsWith('image/') ? body.contentType : 'image/jpeg';
    if (!VALID_KINDS.includes(kind as UploadKind)) {
      return NextResponse.json({ error: `kind must be one of: ${VALID_KINDS.join(', ')}` }, { status: 400 });
    }

    const bucket = getFirebaseAdminStorage().bucket();
    const path = `velantin/${kind}/${auth.userId}/${randomUUID()}.jpg`;
    const file = bucket.file(path);
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType,
    });
    const [downloadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    return NextResponse.json({ uploadUrl, downloadUrl, path, contentType });
  } catch (error) {
    console.error('Firebase Storage sign error:', error);
    return NextResponse.json({ error: 'Firebase Storage is not configured' }, { status: 502 });
  }
}
