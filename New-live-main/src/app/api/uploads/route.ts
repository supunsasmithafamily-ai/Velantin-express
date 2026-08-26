import { NextRequest, NextResponse } from 'next/server';
import { requireUser, isNextResponse } from '@/lib/session';
import { uploadImageBuffer, type UploadKind } from '@/server/cloudinary';

const VALID_KINDS: UploadKind[] = ['avatar', 'kyc_selfie', 'kyc_nic_front', 'kyc_nic_back', 'status'];

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (isNextResponse(auth)) return auth;
    const userId = auth.userId;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const kind = formData.get('kind') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }
    if (!kind || !VALID_KINDS.includes(kind as UploadKind)) {
      return NextResponse.json(
        { error: `kind must be one of: ${VALID_KINDS.join(', ')}` },
        { status: 400 },
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only images are allowed' }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be under 8MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let result;
    try {
      result = await uploadImageBuffer(buffer, kind as UploadKind, userId);
    } catch (uploadError) {
      console.error('Cloudinary upload error:', uploadError);
      const message =
        uploadError instanceof Error ? uploadError.message : 'Upload failed';
      return NextResponse.json({ error: message }, { status: 502 });
    }

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
