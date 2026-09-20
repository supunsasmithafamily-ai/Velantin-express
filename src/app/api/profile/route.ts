import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseProfile, upsertFirebaseProfile } from '@/lib/firebase-repo';
import { isNextResponse, requireUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    let userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      const auth = await requireUser(request);
      if (isNextResponse(auth)) return auth;
      userId = auth.userId;
    }
    const profile = await getFirebaseProfile(userId);
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (isNextResponse(auth)) return auth;
    const userId = auth.userId;
    const body = await request.json();
    const { bio, birthday, city, gender, avatarUrl } = body;
    if (gender && !['male', 'female', 'other'].includes(gender)) {
      return NextResponse.json({ error: 'Invalid gender' }, { status: 400 });
    }
    let birthdayDate: Date | undefined;
    if (birthday) {
      birthdayDate = new Date(birthday);
      if (Number.isNaN(birthdayDate.getTime())) return NextResponse.json({ error: 'Invalid birthday' }, { status: 400 });
    }
    const profile = await upsertFirebaseProfile(userId, {
      ...(bio !== undefined && { bio: bio.trim().slice(0, 300) }),
      ...(birthdayDate && { birthday: birthdayDate }),
      ...(city !== undefined && { city: city.trim().slice(0, 100) }),
      ...(gender && { gender }),
      ...(avatarUrl !== undefined && { avatarUrl }),
    });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    let age: number | null = null;
    if (profile.birthday) {
      const today = new Date();
      const birth = new Date(profile.birthday);
      age = today.getFullYear() - birth.getFullYear();
      const monthDelta = today.getMonth() - birth.getMonth();
      if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age--;
    }
    return NextResponse.json({ profile: {
      id: profile.id,
      userId: profile.userId,
      avatarUrl: profile.avatarUrl ?? null,
      bio: profile.bio ?? null,
      birthday: profile.birthday ?? null,
      city: profile.city ?? null,
      gender: profile.gender ?? null,
      age,
    } });
  } catch (error) {
    console.error('Profile PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
