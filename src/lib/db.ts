import { collection, deleteDoc, doc, getDocs, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase';
import type { PaymentMethod, Plan, Profile, Txn } from './types';

/**
 * Storage layout (same shape locally and in Firestore):
 *   users/{uid}                 -> Profile
 *   users/{uid}/plans/{id}      -> Plan
 *   users/{uid}/txns/{id}       -> Txn
 *   users/{uid}/methods/{id}    -> PaymentMethod
 */

export type Coll = 'plans' | 'txns' | 'methods';
type CollType = { plans: Plan; txns: Txn; methods: PaymentMethod };

export interface Snapshot {
  plans: Plan[];
  txns: Txn[];
  methods: PaymentMethod[];
  profile: Partial<Profile> | null;
}

export interface DataAPI {
  subscribe(uid: string, cb: (patch: Partial<Snapshot>) => void): () => void;
  put<C extends Coll>(uid: string, coll: C, item: CollType[C]): Promise<void>;
  remove(uid: string, coll: Coll, id: string): Promise<void>;
  putMany(uid: string, items: { coll: Coll; item: Plan | Txn | PaymentMethod }[]): Promise<void>;
  removeMany(uid: string, items: { coll: Coll; id: string }[]): Promise<void>;
  saveProfile(uid: string, p: Partial<Profile>): Promise<void>;
  wipe(uid: string): Promise<void>;
}

/* ---------- Local (demo) ---------- */

interface LocalTree {
  plans: Record<string, Plan>;
  txns: Record<string, Txn>;
  methods: Record<string, PaymentMethod>;
  profile: Partial<Profile> | null;
}

const key = (uid: string) => `kova:data:${uid}`;
const empty = (): LocalTree => ({ plans: {}, txns: {}, methods: {}, profile: null });
const read = (uid: string): LocalTree => {
  try {
    return { ...empty(), ...JSON.parse(localStorage.getItem(key(uid)) || 'null') };
  } catch {
    return empty();
  }
};
const subs = new Map<string, Set<(p: Partial<Snapshot>) => void>>();
const snap = (t: LocalTree): Snapshot => ({
  plans: Object.values(t.plans),
  txns: Object.values(t.txns),
  methods: Object.values(t.methods),
  profile: t.profile,
});
const write = (uid: string, t: LocalTree) => {
  localStorage.setItem(key(uid), JSON.stringify(t));
  subs.get(uid)?.forEach((cb) => cb(snap(t)));
};
const mutate = async (uid: string, fn: (t: LocalTree) => void) => {
  const t = read(uid);
  fn(t);
  write(uid, t);
};

const localApi: DataAPI = {
  subscribe(uid, cb) {
    if (!subs.has(uid)) subs.set(uid, new Set());
    subs.get(uid)!.add(cb);
    cb(snap(read(uid)));
    const onStorage = (e: StorageEvent) => e.key === key(uid) && cb(snap(read(uid)));
    window.addEventListener('storage', onStorage);
    return () => {
      subs.get(uid)?.delete(cb);
      window.removeEventListener('storage', onStorage);
    };
  },
  put: (uid, coll, item) => mutate(uid, (t) => void ((t[coll] as Record<string, typeof item>)[item.id] = item)),
  remove: (uid, coll, id) => mutate(uid, (t) => void delete t[coll][id]),
  putMany: (uid, items) =>
    mutate(uid, (t) => items.forEach(({ coll, item }) => ((t[coll] as Record<string, typeof item>)[item.id] = item))),
  removeMany: (uid, items) => mutate(uid, (t) => items.forEach(({ coll, id }) => delete t[coll][id])),
  saveProfile: (uid, p) => mutate(uid, (t) => void (t.profile = { ...t.profile, ...p })),
  wipe: (uid) => mutate(uid, (t) => Object.assign(t, { ...empty(), profile: t.profile })),
};

/* ---------- Firestore ---------- */

const userDoc = (uid: string) => doc(db!, 'users', uid);
const itemDoc = (uid: string, coll: Coll, id: string) => doc(db!, 'users', uid, coll, id);

const remoteApi: DataAPI = {
  subscribe(uid, cb) {
    const unsubs = [
      onSnapshot(collection(db!, 'users', uid, 'plans'), (s) => cb({ plans: s.docs.map((d) => d.data() as Plan) })),
      onSnapshot(collection(db!, 'users', uid, 'txns'), (s) => cb({ txns: s.docs.map((d) => d.data() as Txn) })),
      onSnapshot(collection(db!, 'users', uid, 'methods'), (s) =>
        cb({ methods: s.docs.map((d) => d.data() as PaymentMethod) }),
      ),
      onSnapshot(userDoc(uid), (s) => cb({ profile: (s.data() as Partial<Profile>) ?? null })),
    ];
    return () => unsubs.forEach((u) => u());
  },
  put: (uid, coll, item) => setDoc(itemDoc(uid, coll, item.id), item),
  remove: (uid, coll, id) => deleteDoc(itemDoc(uid, coll, id)),
  async putMany(uid, items) {
    for (let i = 0; i < items.length; i += 400) {
      const b = writeBatch(db!);
      items.slice(i, i + 400).forEach(({ coll, item }) => b.set(itemDoc(uid, coll, item.id), item));
      await b.commit();
    }
  },
  async removeMany(uid, items) {
    for (let i = 0; i < items.length; i += 400) {
      const b = writeBatch(db!);
      items.slice(i, i + 400).forEach(({ coll, id }) => b.delete(itemDoc(uid, coll, id)));
      await b.commit();
    }
  },
  saveProfile: (uid, p) => setDoc(userDoc(uid), p, { merge: true }),
  async wipe(uid) {
    const all: { coll: Coll; id: string }[] = [];
    for (const coll of ['plans', 'txns', 'methods'] as Coll[]) {
      const s = await getDocs(collection(db!, 'users', uid, coll));
      s.forEach((d) => all.push({ coll, id: d.id }));
    }
    await remoteApi.removeMany(uid, all);
  },
};

export const dataApi: DataAPI = firebaseEnabled ? remoteApi : localApi;
