import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, firebaseEnabled } from './firebase';
import type { AppUser } from './types';
import { uid } from './utils';

/* ---------- Local demo backend (used until Firebase keys are added) ---------- */

class AuthError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

const USERS_KEY = 'kova:users';
const SESSION_KEY = 'kova:session';
type LocalUser = AppUser & { pw: string };

const readUsers = (): Record<string, LocalUser> => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  } catch {
    return {};
  }
};
const writeUsers = (u: Record<string, LocalUser>) => localStorage.setItem(USERS_KEY, JSON.stringify(u));

async function hash(pw: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('kova:' + pw));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const localListeners = new Set<(u: AppUser | null) => void>();

const localCurrent = (): AppUser | null => {
  const id = localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  const found = Object.values(readUsers()).find((u) => u.uid === id);
  if (!found) return null;
  const { pw: _pw, ...user } = found;
  return user;
};
const emitLocal = () => localListeners.forEach((l) => l(localCurrent()));

const local = {
  async signIn(email: string, pw: string) {
    await wait(700);
    const u = readUsers()[email.toLowerCase()];
    if (!u || u.pw !== (await hash(pw))) throw new AuthError('auth/invalid-credential');
    localStorage.setItem(SESSION_KEY, u.uid);
    emitLocal();
  },
  async signUp(name: string, email: string, pw: string) {
    await wait(900);
    const users = readUsers();
    const key = email.toLowerCase();
    if (users[key]) throw new AuthError('auth/email-already-in-use');
    users[key] = { uid: uid('u_'), email: key, displayName: name, pw: await hash(pw) };
    writeUsers(users);
    localStorage.setItem(SESSION_KEY, users[key].uid);
    emitLocal();
  },
  async google() {
    await wait(800);
    const users = readUsers();
    const key = 'demo@kova.app';
    if (!users[key]) users[key] = { uid: uid('u_'), email: key, displayName: 'Kova Member', pw: '' };
    writeUsers(users);
    localStorage.setItem(SESSION_KEY, users[key].uid);
    emitLocal();
  },
  async reset(email: string) {
    await wait(800);
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new AuthError('auth/invalid-email');
  },
  async signOut() {
    localStorage.removeItem(SESSION_KEY);
    emitLocal();
  },
  async rename(name: string) {
    const users = readUsers();
    const cur = localCurrent();
    if (!cur) return;
    users[cur.email].displayName = name;
    writeUsers(users);
    emitLocal();
  },
};

/* ---------- Firebase backend ---------- */

const toAppUser = (u: User): AppUser => ({
  uid: u.uid,
  email: u.email ?? '',
  displayName: u.displayName ?? u.email?.split('@')[0] ?? 'Member',
  photoURL: u.photoURL ?? undefined,
});

const remote = {
  async signIn(email: string, pw: string) {
    await signInWithEmailAndPassword(auth!, email, pw);
  },
  async signUp(name: string, email: string, pw: string) {
    const cred = await createUserWithEmailAndPassword(auth!, email, pw);
    await updateProfile(cred.user, { displayName: name });
  },
  async google() {
    await signInWithPopup(auth!, new GoogleAuthProvider());
  },
  async reset(email: string) {
    await sendPasswordResetEmail(auth!, email);
  },
  async signOut() {
    await fbSignOut(auth!);
  },
  async rename(name: string) {
    if (auth?.currentUser) await updateProfile(auth.currentUser, { displayName: name });
  },
};

const backend = firebaseEnabled ? remote : local;

/* ---------- Context ---------- */

interface AuthCtx {
  user: AppUser | null;
  loading: boolean;
  signIn: typeof backend.signIn;
  signUp: typeof backend.signUp;
  google: typeof backend.google;
  reset: typeof backend.reset;
  signOut: typeof backend.signOut;
  rename: typeof backend.rename;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (firebaseEnabled) {
      return onAuthStateChanged(auth!, (u) => {
        setUser(u ? toAppUser(u) : null);
        setLoading(false);
      });
    }
    const l = (u: AppUser | null) => setUser(u);
    localListeners.add(l);
    setUser(localCurrent());
    setLoading(false);
    return () => {
      localListeners.delete(l);
    };
  }, []);

  const rename = async (name: string) => {
    await backend.rename(name);
    setUser((u) => (u ? { ...u, displayName: name } : u));
  };

  return <Ctx.Provider value={{ user, loading, ...backend, rename }}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
};

export function authMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'That email and password don’t match our records.',
    'auth/wrong-password': 'That email and password don’t match our records.',
    'auth/user-not-found': 'We couldn’t find an account with that email.',
    'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'Choose a stronger password (at least 8 characters).',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
    'auth/popup-closed-by-user': 'Google sign-in was closed before finishing.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[code] ?? 'Something went wrong. Please try again.';
}
