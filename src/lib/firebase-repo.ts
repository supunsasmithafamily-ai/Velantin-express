import { randomUUID } from 'crypto';
import { FieldValue, type DocumentReference, type Transaction } from 'firebase-admin/firestore';
import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import { getSubscriptionPlan, type SubscriptionPlanId } from '@/lib/monetization';

export type FirestoreUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type FirebaseProfile = {
  id: string;
  userId: string;
  avatarUrl?: string | null;
  bio?: string | null;
  birthday?: Date | string | null;
  city?: string | null;
  gender?: string | null;
  [key: string]: unknown;
};

export type FirebaseWallet = {
  coins: number;
  diamonds: number;
  lifetimeEarned: number;
  [key: string]: unknown;
};

export type FirebaseLiveStream = {
  id: string;
  hostId: string;
  title: string;
  status: string;
  accessType?: 'public' | 'paid' | 'subscribers';
  entryPriceCoins?: number;
  createdAt?: Date | string | null;
  endedAt?: Date | string | null;
  [key: string]: unknown;
};

function userRef(userId: string) {
  return getFirebaseAdminFirestore().collection('users').doc(userId);
}

export function normalizeFirestoreData<T extends Record<string, unknown>>(data: T | undefined): T | null {
  if (!data) return null;
  const out = { ...data } as Record<string, unknown>;
  for (const [key, value] of Object.entries(out)) {
    if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
      out[key] = (value as { toDate: () => Date }).toDate();
    }
  }
  return out as T;
}

export async function createFirebaseUserRecord(params: { id: string; name: string; email: string; role?: string }) {
  const firestore = getFirebaseAdminFirestore();
  const now = FieldValue.serverTimestamp();
  const batch = firestore.batch();
  batch.set(userRef(params.id), { id: params.id, name: params.name, email: params.email, role: params.role ?? 'user', createdAt: now, updatedAt: now });
  batch.set(firestore.collection('profiles').doc(params.id), { id: randomUUID(), userId: params.id, createdAt: now, updatedAt: now });
  batch.set(firestore.collection('wallets').doc(params.id), { userId: params.id, coins: 0, diamonds: 0, lifetimeEarned: 0, createdAt: now, updatedAt: now });
  batch.set(firestore.collection('kycSubmissions').doc(params.id), { userId: params.id, status: 'none', createdAt: now, updatedAt: now });
  await batch.commit();
}

export async function getFirebaseUserRecord(userId: string) {
  const firestore = getFirebaseAdminFirestore();
  const [userSnap, profileSnap, walletSnap, kycSnap] = await Promise.all([
    userRef(userId).get(),
    firestore.collection('profiles').doc(userId).get(),
    firestore.collection('wallets').doc(userId).get(),
    firestore.collection('kycSubmissions').doc(userId).get(),
  ]);
  if (!userSnap.exists) return null;
  return {
    user: normalizeFirestoreData(userSnap.data() as FirestoreUser),
    profile: normalizeFirestoreData(profileSnap.data() as Record<string, unknown> | undefined),
    wallet: normalizeFirestoreData(walletSnap.data() as Record<string, unknown> | undefined),
    kyc: normalizeFirestoreData(kycSnap.data() as Record<string, unknown> | undefined),
  };
}

export async function getFirebaseUserRole(userId: string) {
  const snap = await userRef(userId).get();
  return snap.exists ? String(snap.data()?.role ?? 'user') : null;
}

export async function getFirebaseProfile(userId: string): Promise<FirebaseProfile | null> {
  const snapshot = await getFirebaseAdminFirestore().collection('profiles').doc(userId).get();
  if (!snapshot.exists) return null;
  const profile = normalizeFirestoreData(snapshot.data() as Record<string, unknown> | undefined) ?? {};
  return { ...profile, id: String(profile.id ?? snapshot.id), userId: String(profile.userId ?? userId) } as FirebaseProfile;
}

export async function upsertFirebaseProfile(userId: string, values: Record<string, unknown>) {
  const firestore = getFirebaseAdminFirestore();
  const profileRef = firestore.collection('profiles').doc(userId);
  const existing = await profileRef.get();
  const existingData = existing.data();
  const id = typeof existingData?.id === 'string' ? existingData.id : randomUUID();
  await profileRef.set({
    ...values,
    id,
    userId,
    ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return getFirebaseProfile(userId);
}

export async function listFirebaseUsers(limit = 200) {
  const firestore = getFirebaseAdminFirestore();
  const users = await firestore.collection('users').orderBy('createdAt', 'desc').limit(limit).get();
  return Promise.all(users.docs.map(async (userSnapshot) => {
    const user = normalizeFirestoreData(userSnapshot.data() as Record<string, unknown> | undefined) ?? {};
    const profileSnapshot = await firestore.collection('profiles').doc(userSnapshot.id).get();
    const profile = normalizeFirestoreData(profileSnapshot.data() as Record<string, unknown> | undefined);
    return {
      id: String(user.id ?? userSnapshot.id),
      name: String(user.name ?? ''),
      avatarUrl: profile?.avatarUrl ?? null,
      city: profile?.city ?? null,
    };
  }));
}

export async function getFirebaseWallet(userId: string): Promise<FirebaseWallet | null> {
  const snapshot = await getFirebaseAdminFirestore().collection('wallets').doc(userId).get();
  if (!snapshot.exists) return null;
  const wallet = normalizeFirestoreData(snapshot.data() as Record<string, unknown> | undefined);
  if (!wallet) return null;
  return {
    ...wallet,
    coins: Number(wallet.coins ?? 0),
    diamonds: Number(wallet.diamonds ?? 0),
    lifetimeEarned: Number(wallet.lifetimeEarned ?? 0),
  } as FirebaseWallet;
}

function streamFromSnapshot(snapshot: FirebaseLiveStreamSnapshot): FirebaseLiveStream {
  const stream = normalizeFirestoreData(snapshot.data() as Record<string, unknown> | undefined) ?? {};
  return {
    ...stream,
    id: String(stream.id ?? snapshot.id),
    hostId: String(stream.hostId ?? ''),
    title: String(stream.title ?? ''),
    status: String(stream.status ?? ''),
  } as FirebaseLiveStream;
}

type FirebaseLiveStreamSnapshot = {
  id: string;
  data: () => Record<string, unknown> | undefined;
};

export async function getFirebaseLiveStream(streamId: string) {
  const snapshot = await getFirebaseAdminFirestore().collection('liveStreams').doc(streamId).get();
  if (!snapshot.exists) return null;
  return streamFromSnapshot(snapshot);
}

export async function findActiveFirebaseLiveStream(hostId: string) {
  const snapshots = await getFirebaseAdminFirestore().collection('liveStreams').where('hostId', '==', hostId).get();
  const streams = snapshots.docs
    .map((snapshot) => streamFromSnapshot(snapshot))
    .filter((stream) => stream.status === 'active')
    .sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt));
  return streams[0] ?? null;
}

export async function listActiveFirebaseLiveStreams(cutoff: Date) {
  const snapshots = await getFirebaseAdminFirestore().collection('liveStreams').where('status', '==', 'active').get();
  return snapshots.docs
    .map((snapshot) => streamFromSnapshot(snapshot))
    .filter((stream) => dateValue(stream.createdAt) > cutoff.getTime())
    .sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt))
    .slice(0, 50);
}

export async function getFirebaseSubscription(subscriberId: string, creatorId: string) {
  const id = `${subscriberId}_${creatorId}`;
  const snapshot = await getFirebaseAdminFirestore().collection('subscriptions').doc(id).get();
  return snapshot.exists ? recordFromSnapshot(snapshot) : null;
}

export async function listFirebaseSubscriptions(subscriberId: string) {
  const snapshots = await getFirebaseAdminFirestore()
    .collection('subscriptions')
    .where('subscriberId', '==', subscriberId)
    .get();
  const now = Date.now();
  return Promise.all(snapshots.docs
    .map((snapshot) => recordFromSnapshot(snapshot))
    .filter((subscription) => subscription.status === 'active' && dateValue(subscription.expiresAt) > now)
    .sort((a, b) => dateValue(b.expiresAt) - dateValue(a.expiresAt))
    .map(async (subscription) => {
      const creatorSnapshot = await userRef(String(subscription.creatorId ?? '')).get();
      return {
        ...subscription,
        creatorName: String(creatorSnapshot.data()?.name ?? 'Creator'),
      };
    }));
}

export async function canAccessFirebaseLiveStream(userId: string, liveId: string) {
  const stream = await getFirebaseLiveStream(liveId);
  if (!stream || stream.status !== 'active') return { allowed: false as const, reason: 'not_found' as const, stream: null };
  if (stream.hostId === userId || stream.accessType === 'public') {
    return { allowed: true as const, reason: 'public' as const, stream };
  }
  if (stream.accessType === 'paid') {
    const access = await getFirebaseAdminFirestore().collection('liveRoomAccess').doc(`${liveId}_${userId}`).get();
    return access.exists
      ? { allowed: true as const, reason: 'paid' as const, stream }
      : { allowed: false as const, reason: 'payment_required' as const, stream };
  }
  if (stream.accessType === 'subscribers') {
    const subscription = await getFirebaseSubscription(userId, stream.hostId);
    const active = subscription?.status === 'active' && dateValue(subscription.expiresAt) > Date.now();
    return active
      ? { allowed: true as const, reason: 'subscriber' as const, stream }
      : { allowed: false as const, reason: 'subscription_required' as const, stream };
  }
  return { allowed: true as const, reason: 'public' as const, stream };
}

export async function grantFirebaseLiveRoomAccess(userId: string, liveId: string) {
  const firestore = getFirebaseAdminFirestore();
  return firestore.runTransaction(async (transaction) => {
    const streamRef = firestore.collection('liveStreams').doc(liveId);
    const walletRef = firestore.collection('wallets').doc(userId);
    const accessRef = firestore.collection('liveRoomAccess').doc(`${liveId}_${userId}`);
    const streamSnapshot = await transaction.get(streamRef);
    const walletSnapshot = await transaction.get(walletRef);
    const accessSnapshot = await transaction.get(accessRef);
    if (!streamSnapshot.exists || streamSnapshot.data()?.status !== 'active') throw new Error('ROOM_NOT_FOUND');
    const stream = streamFromSnapshot(streamSnapshot as unknown as FirebaseLiveStreamSnapshot);
    if (stream.hostId === userId || stream.accessType === 'public') return { alreadyGranted: true, priceCoins: 0 };
    if (stream.accessType !== 'paid') throw new Error('SUBSCRIPTION_REQUIRED');
    if (accessSnapshot.exists) return { alreadyGranted: true, priceCoins: Number(stream.entryPriceCoins ?? 0) };
    if (!walletSnapshot.exists) throw new Error('WALLET_NOT_FOUND');
    const wallet = normalizeFirestoreData(walletSnapshot.data() as FirestoreRecord) ?? {};
    const priceCoins = Number(stream.entryPriceCoins ?? 0);
    if (Number(wallet.coins ?? 0) < priceCoins) throw new Error('INSUFFICIENT_COINS');
    transaction.update(walletRef, {
      coins: Number(wallet.coins ?? 0) - priceCoins,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(accessRef, {
      id: accessRef.id,
      liveId,
      userId,
      hostId: stream.hostId,
      priceCoins,
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.set(firestore.collection('transactions').doc(newId()), {
      id: newId(), userId, type: 'private_room_entry', liveId, hostId: stream.hostId,
      coins: -priceCoins, createdAt: FieldValue.serverTimestamp(),
    });
    return { alreadyGranted: false, priceCoins };
  });
}

export async function subscribeFirebaseToCreator(subscriberId: string, creatorId: string, planId: SubscriptionPlanId) {
  if (subscriberId === creatorId) throw new Error('CANNOT_SUBSCRIBE_SELF');
  const plan = getSubscriptionPlan(planId);
  if (!plan) throw new Error('INVALID_SUBSCRIPTION_PLAN');
  const firestore = getFirebaseAdminFirestore();
  return firestore.runTransaction(async (transaction) => {
    const creatorRef = userRef(creatorId);
    const walletRef = firestore.collection('wallets').doc(subscriberId);
    const subscriptionRef = firestore.collection('subscriptions').doc(`${subscriberId}_${creatorId}`);
    const [creatorSnapshot, walletSnapshot, subscriptionSnapshot] = await Promise.all([
      transaction.get(creatorRef), transaction.get(walletRef), transaction.get(subscriptionRef),
    ]);
    if (!creatorSnapshot.exists) throw new Error('CREATOR_NOT_FOUND');
    if (!walletSnapshot.exists) throw new Error('WALLET_NOT_FOUND');
    const wallet = normalizeFirestoreData(walletSnapshot.data() as FirestoreRecord) ?? {};
    const priceCoins = plan.priceCoins;
    if (Number(wallet.coins ?? 0) < priceCoins) throw new Error('INSUFFICIENT_COINS');
    const existing = subscriptionSnapshot.exists ? recordFromSnapshot(subscriptionSnapshot) : null;
    const existingExpiry = existing ? dateValue(existing.expiresAt) : 0;
    const startsAt = Math.max(Date.now(), existingExpiry);
    const expiresAt = new Date(startsAt + plan.durationDays * 24 * 60 * 60 * 1000);
    transaction.update(walletRef, {
      coins: Number(wallet.coins ?? 0) - priceCoins,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(subscriptionRef, {
      id: subscriptionRef.id,
      subscriberId,
      creatorId,
      planId,
      priceCoins,
      status: 'active',
      startedAt: existingExpiry > Date.now() ? (existing?.startedAt ?? FieldValue.serverTimestamp()) : FieldValue.serverTimestamp(),
      expiresAt,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(firestore.collection('transactions').doc(newId()), {
      id: newId(), userId: subscriberId, type: 'creator_subscription', creatorId, planId,
      coins: -priceCoins, expiresAt, createdAt: FieldValue.serverTimestamp(),
    });
    return { planId, priceCoins, expiresAt };
  });
}

function dateValue(value: unknown) {
  if (value instanceof Date) return value.getTime();
  return typeof value === 'string' || typeof value === 'number' ? new Date(value).getTime() : 0;
}

export { FieldValue };

type FirestoreRecord = Record<string, unknown>;

function newId() {
  return randomUUID();
}

export function firestoreDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function recordFromSnapshot(snapshot: { id: string; data: () => FirestoreRecord | undefined }): FirestoreRecord {
  return { ...(normalizeFirestoreData(snapshot.data()) ?? {}), id: snapshot.data()?.id ?? snapshot.id };
}

export async function getFirebaseKycByUser(userId: string) {
  const firestore = getFirebaseAdminFirestore();
  const direct = await firestore.collection('kycSubmissions').doc(userId).get();
  if (direct.exists) return recordFromSnapshot(direct);
  const result = await firestore.collection('kycSubmissions').where('userId', '==', userId).limit(1).get();
  return result.empty ? null : recordFromSnapshot(result.docs[0]);
}

export async function getFirebaseKycById(id: string) {
  const firestore = getFirebaseAdminFirestore();
  const direct = await firestore.collection('kycSubmissions').doc(id).get();
  if (direct.exists) return recordFromSnapshot(direct);
  const result = await firestore.collection('kycSubmissions').where('id', '==', id).limit(1).get();
  return result.empty ? null : recordFromSnapshot(result.docs[0]);
}

export async function upsertFirebaseKyc(userId: string, values: FirestoreRecord) {
  const firestore = getFirebaseAdminFirestore();
  const ref = firestore.collection('kycSubmissions').doc(userId);
  const existing = await ref.get();
  await ref.set({
    ...values,
    id: existing.data()?.id ?? userId,
    userId,
    ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return getFirebaseKycByUser(userId);
}

export async function listFirebaseKyc() {
  const firestore = getFirebaseAdminFirestore();
  const snapshots = await firestore.collection('kycSubmissions').orderBy('createdAt', 'desc').get();
  return Promise.all(snapshots.docs.map(async (snapshot) => {
    const submission = recordFromSnapshot(snapshot);
    const userSnapshot = await userRef(String(submission.userId ?? '')).get();
    const user = normalizeFirestoreData(userSnapshot.data() as FirestoreRecord | undefined) ?? {};
    return {
      ...submission,
      user: { id: String(user.id ?? userSnapshot.id), name: String(user.name ?? ''), email: String(user.email ?? '') },
    };
  }));
}

export async function reviewFirebaseKyc(id: string, status: string, reviewedBy: string) {
  const firestore = getFirebaseAdminFirestore();
  return firestore.runTransaction(async (transaction) => {
    const found = await getKycReference(transaction, id);
    if (!found) return null;
    const current = recordFromSnapshot(found.snapshot);
    if (current.status !== 'pending') throw new Error(`Cannot review a submission with status: ${current.status}`);
    transaction.update(found.ref, { status, reviewedBy, reviewedAt: new Date(), updatedAt: FieldValue.serverTimestamp() });
    return status;
  });
}

async function getKycReference(transaction: Transaction, id: string): Promise<{ ref: DocumentReference; snapshot: { id: string; data: () => FirestoreRecord | undefined } } | null> {
  const firestore = getFirebaseAdminFirestore();
  const directRef = firestore.collection('kycSubmissions').doc(id);
  const direct = await transaction.get(directRef);
  if (direct.exists) return { ref: directRef, snapshot: direct };
  const query = firestore.collection('kycSubmissions').where('id', '==', id).limit(1);
  const result = await transaction.get(query);
  return result.empty ? null : { ref: result.docs[0].ref, snapshot: result.docs[0] };
}

export async function listFirebaseStatuses(limit = 50) {
  const result = await getFirebaseAdminFirestore().collection('statuses').orderBy('createdAt', 'desc').limit(limit).get();
  return result.docs.map((snapshot) => recordFromSnapshot(snapshot));
}

export async function createFirebaseStatus(values: FirestoreRecord) {
  const id = newId();
  const ref = getFirebaseAdminFirestore().collection('statuses').doc(id);
  await ref.set({ id, ...values, createdAt: FieldValue.serverTimestamp() });
  return recordFromSnapshot(await ref.get());
}

export async function updateFirebaseWalletInTransaction(
  transaction: Transaction,
  userId: string,
  changes: FirestoreRecord,
  transactionData?: FirestoreRecord,
) {
  const firestore = getFirebaseAdminFirestore();
  const ref = firestore.collection('wallets').doc(userId);
  const snapshot = await transaction.get(ref);
  if (!snapshot.exists) throw new Error('Wallet not found');
  const wallet = normalizeFirestoreData(snapshot.data() as FirestoreRecord) ?? {};
  const updated: FirestoreRecord = { ...wallet, ...changes, updatedAt: new Date() };
  transaction.set(ref, { ...changes, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  if (transactionData) {
    const transactionRef = firestore.collection('transactions').doc(newId());
    transaction.set(transactionRef, { id: transactionRef.id, userId, ...transactionData, createdAt: FieldValue.serverTimestamp() });
  }
  return { ...updated, coins: Number(updated.coins ?? 0), diamonds: Number(updated.diamonds ?? 0) };
}

export async function createCashoutAndDebit(userId: string, values: FirestoreRecord) {
  const firestore = getFirebaseAdminFirestore();
  return firestore.runTransaction(async (transaction) => {
    const walletRef = firestore.collection('wallets').doc(userId);
    const walletSnapshot = await transaction.get(walletRef);
    if (!walletSnapshot.exists) throw new Error('Wallet not found');
    const wallet = normalizeFirestoreData(walletSnapshot.data() as FirestoreRecord) ?? {};
    const diamonds = Number(values.diamonds ?? 0);
    if (Number(wallet.diamonds ?? 0) < diamonds) throw new Error('Insufficient diamonds');
    const id = newId();
    const cashoutRef = firestore.collection('cashoutRequests').doc(id);
    transaction.set(walletRef, { diamonds: Number(wallet.diamonds ?? 0) - diamonds, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(cashoutRef, { id, ...values, userId, createdAt: FieldValue.serverTimestamp() });
    transaction.set(firestore.collection('transactions').doc(newId()), { id: newId(), userId, type: 'cashout_debit', diamonds: -diamonds, cashoutId: id, createdAt: FieldValue.serverTimestamp() });
    return { id, ...values, userId, status: values.status ?? 'pending' };
  });
}

export async function listFirebaseCashouts(userId?: string) {
  const firestore = getFirebaseAdminFirestore();
  let query = firestore.collection('cashoutRequests').orderBy('createdAt', 'desc') as FirebaseFirestore.Query;
  if (userId) query = firestore.collection('cashoutRequests').where('userId', '==', userId).orderBy('createdAt', 'desc');
  const result = await query.get();
  return Promise.all(result.docs.map(async (snapshot) => {
    const cashout = recordFromSnapshot(snapshot);
    if (userId) return cashout;
    const userSnapshot = await userRef(String(cashout.userId ?? '')).get();
    const user = normalizeFirestoreData(userSnapshot.data() as FirestoreRecord | undefined) ?? {};
    return { ...cashout, user: { id: String(user.id ?? userSnapshot.id), name: String(user.name ?? ''), email: String(user.email ?? '') } };
  }));
}

export async function getFirebaseCashout(id: string) {
  const snapshot = await getFirebaseAdminFirestore().collection('cashoutRequests').doc(id).get();
  return snapshot.exists ? recordFromSnapshot(snapshot) : null;
}

export async function rejectFirebaseCashout(id: string, adminUserId: string) {
  const firestore = getFirebaseAdminFirestore();
  return firestore.runTransaction(async (transaction) => {
    const cashoutRef = firestore.collection('cashoutRequests').doc(id);
    const cashoutSnapshot = await transaction.get(cashoutRef);
    if (!cashoutSnapshot.exists) return null;
    const cashout = recordFromSnapshot(cashoutSnapshot);
    if (cashout.status !== 'pending') throw new Error(`Cannot reject a cashout with status: ${cashout.status}`);
    const userId = String(cashout.userId);
    const walletRef = firestore.collection('wallets').doc(userId);
    const walletSnapshot = await transaction.get(walletRef);
    if (!walletSnapshot.exists) throw new Error('Wallet not found');
    const diamonds = Number(cashout.diamonds ?? 0);
    const wallet = normalizeFirestoreData(walletSnapshot.data() as FirestoreRecord) ?? {};
    transaction.update(cashoutRef, { status: 'rejected', processedAt: new Date(), processedBy: adminUserId });
    transaction.set(walletRef, { diamonds: Number(wallet.diamonds ?? 0) + diamonds, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(firestore.collection('transactions').doc(newId()), { id: newId(), userId, type: 'cashout_refund', diamonds, cashoutId: id, createdAt: FieldValue.serverTimestamp() });
    return 'rejected';
  });
}

export async function finalizeFirebaseCashout(id: string, values: FirestoreRecord, refund: boolean, adminUserId: string) {
  const firestore = getFirebaseAdminFirestore();
  return firestore.runTransaction(async (transaction) => {
    const cashoutRef = firestore.collection('cashoutRequests').doc(id);
    const cashoutSnapshot = await transaction.get(cashoutRef);
    if (!cashoutSnapshot.exists) return null;
    const cashout = recordFromSnapshot(cashoutSnapshot);
    if (cashout.status !== 'pending') throw new Error(`Cannot update a cashout with status: ${cashout.status}`);
    transaction.update(cashoutRef, { ...values, processedAt: new Date(), processedBy: adminUserId });
    if (refund) {
      const userId = String(cashout.userId);
      const walletRef = firestore.collection('wallets').doc(userId);
      const walletSnapshot = await transaction.get(walletRef);
      if (!walletSnapshot.exists) throw new Error('Wallet not found');
      const wallet = normalizeFirestoreData(walletSnapshot.data() as FirestoreRecord) ?? {};
      const diamonds = Number(cashout.diamonds ?? 0);
      transaction.set(walletRef, { diamonds: Number(wallet.diamonds ?? 0) + diamonds, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(firestore.collection('transactions').doc(newId()), { id: newId(), userId, type: 'cashout_refund', diamonds, cashoutId: id, createdAt: FieldValue.serverTimestamp() });
    }
    return values.status;
  });
}

export async function createFirebaseCoinOrder(values: FirestoreRecord) {
  const id = newId();
  const ref = getFirebaseAdminFirestore().collection('coinOrders').doc(id);
  await ref.set({ id, ...values, createdAt: FieldValue.serverTimestamp() });
  return recordFromSnapshot(await ref.get());
}

export async function updateFirebaseCoinOrder(id: string, values: FirestoreRecord) {
  const ref = getFirebaseAdminFirestore().collection('coinOrders').doc(id);
  await ref.set(values, { merge: true });
  return recordFromSnapshot(await ref.get());
}

export async function getFirebaseCoinOrder(id: string) {
  const snapshot = await getFirebaseAdminFirestore().collection('coinOrders').doc(id).get();
  return snapshot.exists ? recordFromSnapshot(snapshot) : null;
}

export async function findFirebaseCoinOrderByProviderRef(providerRef: string) {
  const result = await getFirebaseAdminFirestore().collection('coinOrders').where('providerRef', '==', providerRef).limit(1).get();
  return result.empty ? null : recordFromSnapshot(result.docs[0]);
}

export async function payFirebaseCoinOrder(id: string) {
  const firestore = getFirebaseAdminFirestore();
  return firestore.runTransaction(async (transaction) => {
    const orderRef = firestore.collection('coinOrders').doc(id);
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) return null;
    const order = recordFromSnapshot(orderSnapshot);
    if (order.status === 'paid') return order;
    const userId = String(order.userId);
    const walletRef = firestore.collection('wallets').doc(userId);
    const walletSnapshot = await transaction.get(walletRef);
    if (!walletSnapshot.exists) throw new Error('Wallet not found');
    const wallet = normalizeFirestoreData(walletSnapshot.data() as FirestoreRecord) ?? {};
    const coins = Number(order.coins ?? 0);
    transaction.update(orderRef, { status: 'paid', paidAt: new Date() });
    transaction.set(walletRef, { coins: Number(wallet.coins ?? 0) + coins, lifetimeEarned: Number(wallet.lifetimeEarned ?? 0) + coins, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(firestore.collection('transactions').doc(newId()), { id: newId(), userId, type: 'coin_purchase', coins, orderId: id, createdAt: FieldValue.serverTimestamp() });
    return { ...order, status: 'paid' };
  });
}
