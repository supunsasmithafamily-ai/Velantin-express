import { randomUUID } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';

type Relationship = { userId: string; creatorId: string; following: boolean; favorite: boolean; notify: boolean; createdAt?: unknown; updatedAt?: unknown; [key: string]: unknown };
const db = () => getFirebaseAdminFirestore();
const now = () => FieldValue.serverTimestamp();

export type RelationshipAction = 'follow' | 'unfollow' | 'favorite' | 'unfavorite' | 'notify' | 'unnotify';

export async function updateCreatorRelationship(userId: string, creatorId: string, action: RelationshipAction) {
  if (userId === creatorId) throw new Error('CANNOT_FOLLOW_SELF');
  const firestore = db();
  const relationshipRef = firestore.collection('creatorRelationships').doc(`${userId}_${creatorId}`);
  const creatorRef = firestore.collection('users').doc(creatorId);
  const field = action.startsWith('un') ? action.slice(2) : action;
  const value = !action.startsWith('un');
  let result: Relationship | null = null;
  await firestore.runTransaction(async transaction => {
    const [creator, existing] = await Promise.all([transaction.get(creatorRef), transaction.get(relationshipRef)]);
    if (!creator.exists) throw new Error('CREATOR_NOT_FOUND');
    const current = (existing.data() ?? { userId, creatorId, following: false, favorite: false, notify: false, createdAt: now() }) as Relationship;
    const next = { ...current, userId, creatorId, [field]: value, updatedAt: now() } as Relationship;
    transaction.set(relationshipRef, next, { merge: true });
    result = next;
  });
  return result;
}

export async function listCreatorRelationships(userId: string) {
  const snapshots = await db().collection('creatorRelationships').where('userId', '==', userId).get();
  return Promise.all(snapshots.docs.map(async snapshot => {
    const row = snapshot.data();
    const creatorId = String(row.creatorId ?? '');
    const [user, profile] = await Promise.all([db().collection('users').doc(creatorId).get(), db().collection('profiles').doc(creatorId).get()]);
    return { id: snapshot.id, ...row, creatorId, creatorName: String(user.data()?.name ?? 'Creator'), avatarUrl: profile.data()?.avatarUrl ?? null };
  }));
}

export async function ensureReferral(userId: string, name: string) {
  const ref = db().collection('referrals').doc(userId);
  const existing = await ref.get();
  if (existing.exists) return { id: ref.id, ...existing.data() };
  const code = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 8) || 'creator'}-${randomUUID().slice(0, 6)}`;
  const record = { id: ref.id, userId, code, successfulReferrals: 0, coinsEarned: 0, commissionCoins: 0, createdAt: now(), updatedAt: now() };
  await ref.create(record);
  return record;
}

export async function completeReferral(code: string, referredUserId: string) {
  const snapshot = await db().collection('referrals').where('code', '==', code).limit(1).get();
  if (snapshot.empty) throw new Error('REFERRAL_NOT_FOUND');
  const referralRef = snapshot.docs[0].ref;
  const ownerId = referralRef.id;
  if (ownerId === referredUserId) throw new Error('SELF_REFERRAL');
  const completionRef = db().collection('referralCompletions').doc(`${ownerId}_${referredUserId}`);
  const rewardCoins = Number(process.env.REFERRAL_REWARD_COINS ?? 56);
  let alreadyCompleted = false;
  await db().runTransaction(async transaction => {
    const [referral, completion, ownerWallet, referredUser] = await Promise.all([
      transaction.get(referralRef), transaction.get(completionRef), transaction.get(db().collection('wallets').doc(ownerId)), transaction.get(db().collection('users').doc(referredUserId)),
    ]);
    if (!referral.exists) throw new Error('REFERRAL_NOT_FOUND');
    if (!referredUser.exists) throw new Error('USER_NOT_FOUND');
    if (completion.exists) { alreadyCompleted = true; return; }
    const ownerWalletRef = db().collection('wallets').doc(ownerId);
    transaction.create(completionRef, { id: completionRef.id, ownerId, referredUserId, rewardCoins, createdAt: now() });
    transaction.update(referralRef, { successfulReferrals: FieldValue.increment(1), coinsEarned: FieldValue.increment(rewardCoins), updatedAt: now() });
    if (ownerWallet.exists) transaction.update(ownerWalletRef, { coins: FieldValue.increment(rewardCoins), updatedAt: now() });
    else transaction.create(ownerWalletRef, { userId: ownerId, coins: rewardCoins, diamonds: 0, lifetimeEarned: 0, createdAt: now(), updatedAt: now() });
    const transactionRef = db().collection('transactions').doc(randomUUID());
    transaction.create(transactionRef, { id: transactionRef.id, type: 'referral_reward', userId: ownerId, referredUserId, coins: rewardCoins, createdAt: now() });
  });
  return { alreadyCompleted, rewardCoins: alreadyCompleted ? 0 : rewardCoins };
}

export async function recordGiftMoment(params: { liveId: string; streamId: string; senderId: string; senderName: string; hostId: string; giftName: string; coins: number; diamonds: number }) {
  const firestore = db();
  const id = randomUUID();
  await firestore.runTransaction(async transaction => {
    transaction.create(firestore.collection('liveMoments').doc(id), { id, type: 'gift', ...params, createdAt: now() });
    transaction.set(firestore.collection('creatorAnalytics').doc(params.hostId), { userId: params.hostId, giftCoins: FieldValue.increment(params.coins), giftDiamonds: FieldValue.increment(params.diamonds), updatedAt: now() }, { merge: true });
  });
  return id;
}

export async function createReplay(liveId: string, hostId: string, title: string, durationSeconds = 0) {
  const ref = db().collection('liveReplays').doc(liveId);
  await ref.set({ id: liveId, liveId, hostId, title, status: 'processing', views: 0, durationSeconds, recordingProvider: 'agora-cloud-recording', createdAt: now(), updatedAt: now() }, { merge: true });
  return ref.id;
}

export async function getReplay(liveId: string) {
  const firestore = db();
  const [replay, moments, clips] = await Promise.all([
    firestore.collection('liveReplays').doc(liveId).get(),
    firestore.collection('liveMoments').where('liveId', '==', liveId).get(),
    firestore.collection('liveClips').where('liveId', '==', liveId).get(),
  ]);
  return { replay: replay.exists ? { id: replay.id, ...replay.data() } : null, moments: moments.docs.map(s => ({ id: s.id, ...s.data() })), clips: clips.docs.map(s => ({ id: s.id, ...s.data() })) };
}

export async function recordCreatorEvent(userId: string, eventId: string, event: Record<string, unknown>) {
  const firestore = db();
  const eventRef = firestore.collection('creatorAnalyticsEvents').doc(`${userId}_${eventId}`);
  const aggregateRef = firestore.collection('creatorAnalytics').doc(userId);
  await firestore.runTransaction(async transaction => {
    const existing = await transaction.get(eventRef);
    if (existing.exists) return;
    transaction.create(eventRef, { id: eventRef.id, userId, ...event, createdAt: now() });
    transaction.set(aggregateRef, { userId, updatedAt: now(), ...aggregateForEvent(event) }, { merge: true });
  });
}

function aggregateForEvent(event: Record<string, unknown>) {
  switch (event.type) {
    case 'viewer_join': return { totalViewers: FieldValue.increment(1), currentViewers: FieldValue.increment(1) };
    case 'viewer_leave': return { watchTimeSeconds: FieldValue.increment(Math.max(0, Number(event.watchTimeSeconds ?? 0))), currentViewers: FieldValue.increment(-1) };
    case 'viewer_peak': return { peakViewers: FieldValue.increment(Math.max(0, Number(event.peakDelta ?? 0))) };
    case 'subscription': return { subscriptionCoins: FieldValue.increment(Math.max(0, Number(event.coins ?? 0))) };
    default: return {};
  }
}
