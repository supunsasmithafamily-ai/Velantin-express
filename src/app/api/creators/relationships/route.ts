import { NextRequest, NextResponse } from 'next/server';
import { isNextResponse, requireUser } from '@/lib/session';
import { listCreatorRelationships, updateCreatorRelationship, type RelationshipAction } from '@/lib/creator-features';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (isNextResponse(auth)) return auth;
  try { return NextResponse.json({ relationships: await listCreatorRelationships(auth.userId) }); }
  catch (error) { console.error('relationships/list error:', error); return NextResponse.json({ error: 'Could not load creator relationships' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (isNextResponse(auth)) return auth;
  try {
    const body = await request.json().catch(() => ({}));
    const creatorId = String(body.creatorId ?? '');
    const action = String(body.action ?? '') as RelationshipAction;
    if (!creatorId || !['follow', 'unfollow', 'favorite', 'unfavorite', 'notify', 'unnotify'].includes(action)) return NextResponse.json({ error: 'creatorId and valid action are required' }, { status: 400 });
    return NextResponse.json({ relationship: await updateCreatorRelationship(auth.userId, creatorId, action) });
  } catch (error) {
    if (error instanceof Error && error.message === 'CANNOT_FOLLOW_SELF') return NextResponse.json({ error: 'You cannot follow yourself' }, { status: 400 });
    console.error('relationships/update error:', error); return NextResponse.json({ error: 'Could not update creator relationship' }, { status: 500 });
  }
}
