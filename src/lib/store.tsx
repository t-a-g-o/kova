import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './auth';
import { dataApi, type Coll, type Snapshot } from './db';
import { buildSchedule, installmentLabel, planStats } from './finance';
import type { PaymentMethod, Plan, Profile, ThemePref, Txn } from './types';
import { DAY, addMonths, confirmationCode, money, orderNumber, round2, uid } from './utils';

export type PlanInput = Omit<Plan, 'id' | 'createdAt' | 'status' | 'orderNumber'>;
export type MethodInput = Omit<PaymentMethod, 'id' | 'createdAt' | 'isDefault'>;

const DEFAULT_PROFILE: Omit<Profile, 'displayName' | 'email' | 'memberSince'> = {
  pendingSeconds: 120,
  spendingPower: 50000,
  theme: 'dark',
};

export const methodLabel = (m?: PaymentMethod) => (m ? `${m.institution} ••${m.last4}` : 'No payment method');

/** Why a method can't be charged right now, or null if it's good to use. */
export function methodIssue(m: PaymentMethod, now = Date.now()): string | null {
  if (m.verifiesAt && now < m.verifiesAt) return 'Verifying';
  if (m.kind === 'card' && m.expiry) {
    const [mm, yy] = m.expiry.split('/').map(Number);
    if (mm && yy !== undefined && new Date(2000 + yy, mm, 1).getTime() <= now) return 'Expired';
  }
  return null;
}

export class PaymentError extends Error {}

interface DataCtx {
  ready: boolean;
  plans: Plan[];
  txns: Txn[];
  methods: PaymentMethod[];
  profile: Profile;
  defaultMethod?: PaymentMethod;
  /** Spending power left after every active plan's outstanding balance. */
  available: number;
  addPlan(input: PlanInput, backfill: boolean): Promise<Plan>;
  updatePlan(id: string, patch: Partial<Plan>): Promise<void>;
  deletePlan(id: string): Promise<void>;
  pay(planId: string, amount: number, methodId?: string): Promise<{ txn: Txn; paidOff: boolean }>;
  payoff(planId: string, methodId?: string): Promise<{ txn: Txn; saved: number }>;
  addMethod(input: MethodInput): Promise<PaymentMethod>;
  removeMethod(id: string): Promise<void>;
  setDefaultMethod(id: string): Promise<void>;
  updateProfile(patch: Partial<Profile>): Promise<void>;
  loadSample(): Promise<void>;
  resetData(): Promise<void>;
}

const Ctx = createContext<DataCtx | null>(null);

export function applyTheme(t: ThemePref) {
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0B0B0D' : '#F7F7F8');
  try {
    localStorage.setItem('kova:theme', t);
  } catch {
    /* ignore */
  }
}

/** Completed payment history for installments due before `until`, so backdated plans look lived-in. */
function backfillTxns(plan: Plan, until: number, methodLabelStr: string, methodId?: string): Txn[] {
  const out: Txn[] = [
    {
      id: uid('t_'),
      planId: plan.id,
      type: 'purchase',
      amount: plan.price,
      description: `${plan.merchant} · ${plan.name}`,
      createdAt: plan.startDate,
      settlesAt: plan.startDate + 60_000,
      confirmation: confirmationCode(),
    },
  ];
  for (const inst of buildSchedule(plan)) {
    if (inst.dueDate > until) break;
    const at = Math.min(until - 60_000, inst.dueDate + (inst.kind === 'down' ? 90_000 : (6 + Math.random() * 4) * 3_600_000));
    out.push({
      id: uid('t_'),
      planId: plan.id,
      type: 'payment',
      amount: inst.amount,
      description: `${installmentLabel(plan, inst)} · ${plan.name}`,
      methodId,
      methodLabel: methodLabelStr,
      createdAt: at,
      settlesAt: Math.min(at + DAY, until),
      auto: inst.kind !== 'down' && plan.autopay,
      confirmation: confirmationCode(),
    });
  }
  return out;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [snap, setSnap] = useState<Snapshot>({ plans: [], txns: [], methods: [], profile: null });
  const [loaded, setLoaded] = useState<Set<keyof Snapshot>>(new Set());
  const u = user?.uid;

  useEffect(() => {
    setSnap({ plans: [], txns: [], methods: [], profile: null });
    setLoaded(new Set());
    if (!u) return;
    return dataApi.subscribe(u, (patch) => {
      setSnap((s) => ({ ...s, ...patch }));
      setLoaded((l) => new Set([...l, ...(Object.keys(patch) as (keyof Snapshot)[])]));
    });
  }, [u]);

  const ready = loaded.size === 4;

  const profile: Profile = useMemo(
    () => ({
      ...DEFAULT_PROFILE,
      displayName: user?.displayName ?? '',
      email: user?.email ?? '',
      memberSince: Date.now(),
      ...(snap.profile ?? {}),
    }),
    [snap.profile, user],
  );

  // First login: persist a profile so "member since" sticks.
  useEffect(() => {
    if (ready && u && !snap.profile?.memberSince) {
      void dataApi.saveProfile(u, { ...DEFAULT_PROFILE, displayName: user!.displayName, email: user!.email, memberSince: Date.now() });
    }
  }, [ready, u, snap.profile, user]);

  useEffect(() => applyTheme(profile.theme), [profile.theme]);

  // Remembered per device so signed-out screens match the last account's choice.
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(PLAYFUL_KEY, profile.playful ? '1' : '0');
    } catch {
      /* private mode */
    }
  }, [ready, profile.playful]);

  const methods = useMemo(() => [...snap.methods].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.createdAt - b.createdAt), [snap.methods]);
  const plans = useMemo(() => [...snap.plans].sort((a, b) => b.createdAt - a.createdAt), [snap.plans]);
  const txns = useMemo(() => [...snap.txns].sort((a, b) => b.createdAt - a.createdAt), [snap.txns]);
  const defaultMethod = methods.find((m) => m.isDefault) ?? methods[0];
  const findMethod = useCallback((id?: string) => methods.find((m) => m.id === id) ?? defaultMethod, [methods, defaultMethod]);

  const pendingMs = profile.pendingSeconds * 1000;

  const outstanding = useMemo(
    () => round2(snap.plans.filter((p) => p.status === 'active').reduce((sum, p) => sum + planStats(p, snap.txns).remaining, 0)),
    [snap.plans, snap.txns],
  );
  const available = Math.max(0, round2(profile.spendingPower - outstanding));

  // Plans with a payment being submitted right now — blocks double-taps before the snapshot catches up.
  const inFlight = useRef(new Set<string>());

  /** Validates a manual payment: one at a time per plan, from a usable method. */
  const checkPayment = useCallback(
    (planId: string, methodId: string | undefined, now: number) => {
      const plan = snap.plans.find((p) => p.id === planId);
      if (!plan || plan.status !== 'active') throw new PaymentError('This plan is no longer active.');
      if (inFlight.current.has(planId)) throw new PaymentError('A payment is already being submitted.');
      const stats = planStats(plan, snap.txns, now);
      if (stats.pending > 0) throw new PaymentError('A payment for this plan is still processing. You can pay again once it posts.');
      const m = methods.find((x) => x.id === methodId);
      if (!m) throw new PaymentError('Choose a payment method.');
      const issue = methodIssue(m, now);
      if (issue) throw new PaymentError(`${methodLabel(m)} can’t be used right now (${issue.toLowerCase()}).`);
      return { plan, stats, m };
    },
    [snap.plans, snap.txns, methods],
  );

  const addPlan = useCallback<DataCtx['addPlan']>(
    async (input, backfill) => {
      const plan: Plan = { ...input, id: uid('p_'), createdAt: Date.now(), status: 'active', orderNumber: orderNumber() };
      const m = methods.find((x) => x.id === plan.methodId);
      if (!m) plan.autopay = false;
      const now = Date.now();
      let history = backfillTxns(plan, now, methodLabel(m), m?.id);
      if (!backfill) {
        // Only the purchase plus whatever was due at checkout.
        history = history.filter((t) => t.type === 'purchase' || t.createdAt - plan.startDate < 5 * 60_000);
      }
      if (!m && history.some((t) => t.type === 'payment' && t.createdAt === now)) {
        throw new PaymentError('A payment is due today. Add a payment method first.');
      }
      const adds = planStats(plan, history, now).remaining;
      if (adds > available + 0.005) {
        throw new PaymentError(`This plan needs ${money(adds)} of spending power and you have ${money(available)} available.`);
      }
      // Anything at checkout "today" should still look like it's processing.
      history = history.map((t) => (t.type === 'payment' && now - t.createdAt < 10 * 60_000 ? { ...t, createdAt: now, settlesAt: now + pendingMs } : t));
      await dataApi.putMany(u!, [{ coll: 'plans', item: plan }, ...history.map((item) => ({ coll: 'txns' as Coll, item }))]);
      return plan;
    },
    [u, methods, available, pendingMs],
  );

  const updatePlan = useCallback<DataCtx['updatePlan']>(
    async (id, patch) => {
      const p = snap.plans.find((x) => x.id === id);
      if (p) await dataApi.put(u!, 'plans', { ...p, ...patch });
    },
    [u, snap.plans],
  );

  const deletePlan = useCallback<DataCtx['deletePlan']>(
    async (id) => {
      await dataApi.removeMany(u!, [
        { coll: 'plans', id },
        ...snap.txns.filter((t) => t.planId === id).map((t) => ({ coll: 'txns' as Coll, id: t.id })),
      ]);
    },
    [u, snap.txns],
  );

  const pay = useCallback<DataCtx['pay']>(
    async (planId, amount, methodId) => {
      const now = Date.now();
      const { plan, stats, m } = checkPayment(planId, methodId, now);
      const amt = round2(Math.min(amount, stats.remaining));
      if (amt < Math.min(1, stats.remaining)) throw new PaymentError('Enter an amount of at least $1.00.');
      const txn: Txn = {
        id: uid('t_'),
        planId,
        type: 'payment',
        amount: amt,
        description: `Payment · ${plan.name}`,
        methodId: m?.id,
        methodLabel: methodLabel(m),
        createdAt: now,
        settlesAt: now + pendingMs,
        confirmation: confirmationCode(),
      };
      const paidOff = stats.remaining - amt < 0.01;
      inFlight.current.add(planId);
      try {
        await dataApi.putMany(u!, [
          { coll: 'txns', item: txn },
          ...(paidOff ? [{ coll: 'plans' as Coll, item: { ...plan, status: 'paid' as const, paidOffAt: now } }] : []),
        ]);
      } finally {
        inFlight.current.delete(planId);
      }
      return { txn, paidOff };
    },
    [u, checkPayment, pendingMs],
  );

  const payoff = useCallback<DataCtx['payoff']>(
    async (planId, methodId) => {
      const now = Date.now();
      const { plan, stats, m } = checkPayment(planId, methodId, now);
      const txn: Txn = {
        id: uid('t_'),
        planId,
        type: 'payoff',
        amount: stats.payoffQuote,
        description: `Paid in full · ${plan.name}`,
        methodId: m?.id,
        methodLabel: methodLabel(m),
        createdAt: now,
        settlesAt: now + pendingMs,
        confirmation: confirmationCode(),
      };
      inFlight.current.add(planId);
      try {
        await dataApi.putMany(u!, [
          { coll: 'txns', item: txn },
          { coll: 'plans', item: { ...plan, status: 'paid', paidOffAt: now } },
        ]);
      } finally {
        inFlight.current.delete(planId);
      }
      return { txn, saved: stats.interestSaved };
    },
    [u, checkPayment, pendingMs],
  );

  const addMethod = useCallback<DataCtx['addMethod']>(
    async (input) => {
      const m: PaymentMethod = {
        ...input,
        id: uid('m_'),
        createdAt: Date.now(),
        isDefault: snap.methods.length === 0,
        verifiesAt: input.kind === 'bank' ? Date.now() + Math.max(15_000, pendingMs) : undefined,
      };
      await dataApi.put(u!, 'methods', m);
      return m;
    },
    [u, snap.methods.length, pendingMs],
  );

  const removeMethod = useCallback<DataCtx['removeMethod']>(
    async (id) => {
      const rest = snap.methods.filter((m) => m.id !== id);
      // There must always be a method that can make a payment.
      if (!rest.some((m) => !methodIssue(m))) throw new PaymentError('Add another payment method before removing this one.');
      const wasDefault = snap.methods.find((m) => m.id === id)?.isDefault;
      const next = wasDefault ? rest[0] : rest.find((m) => m.isDefault) ?? rest[0];
      await dataApi.remove(u!, 'methods', id);
      // Plans paying from this method move to the (new) default.
      const moved = snap.plans
        .filter((p) => p.methodId === id && p.status === 'active')
        .map((p) => ({ coll: 'plans' as Coll, item: { ...p, methodId: next?.id } }));
      await dataApi.putMany(u!, [...(wasDefault && next ? [{ coll: 'methods' as Coll, item: { ...next, isDefault: true } }] : []), ...moved]);
    },
    [u, snap.methods, snap.plans],
  );

  const setDefaultMethod = useCallback<DataCtx['setDefaultMethod']>(
    async (id) => {
      await dataApi.putMany(
        u!,
        snap.methods.map((m) => ({ coll: 'methods' as Coll, item: { ...m, isDefault: m.id === id } })),
      );
    },
    [u, snap.methods],
  );

  const updateProfile = useCallback<DataCtx['updateProfile']>((patch) => dataApi.saveProfile(u!, patch), [u]);

  const resetData = useCallback(() => dataApi.wipe(u!), [u]);

  const loadSample = useCallback(async () => {
    const now = Date.now();
    const bank: PaymentMethod = {
      id: uid('m_'),
      kind: 'bank',
      institution: 'Chase',
      nickname: 'Total Checking',
      last4: '4821',
      routingLast4: '0021',
      accountType: 'checking',
      isDefault: !snap.methods.some((m) => m.isDefault),
      createdAt: now - 400 * DAY,
      verifiesAt: now - 399 * DAY,
    };
    const card: PaymentMethod = {
      id: uid('m_'),
      kind: 'card',
      institution: 'Visa',
      nickname: 'Sapphire Reserve',
      issuer: 'Chase',
      last4: '0192',
      holder: profile.displayName || 'Kova Member',
      expiry: '09/29',
      theme: 'sapphire',
      isDefault: false,
      createdAt: now - 300 * DAY,
    };
    const mk = (p: Omit<Plan, 'id' | 'createdAt' | 'status' | 'orderNumber' | 'methodId'>, extra: Partial<Plan> = {}): Plan => ({
      ...p,
      id: uid('p_'),
      createdAt: p.startDate,
      status: 'active',
      orderNumber: orderNumber(),
      methodId: bank.id,
      ...extra,
    });
    const watch = mk({
      name: 'Submariner Date 126610LN',
      merchant: 'Rolex Boutique',
      brand: 'rolex',
      category: 'watches',
      price: 14950,
      downPayment: 1500,
      apr: 9.99,
      type: 'monthly',
      installments: 24,
      startDate: addMonths(now, -7) - 2 * DAY,
      autopay: true,
    });
    const bag = mk({
      name: 'Speedy Bandoulière 25',
      merchant: 'Louis Vuitton',
      brand: 'lv',
      category: 'fashion',
      price: 2250,
      downPayment: 0,
      apr: 0,
      type: 'pay4',
      installments: 4,
      startDate: now - 20 * DAY,
      autopay: true,
    });
    const necklace = mk({
      name: 'Vintage Alhambra Necklace, 10 Motifs',
      merchant: 'Van Cleef & Arpels',
      brand: 'vca',
      category: 'jewelry',
      price: 13300,
      downPayment: 0,
      apr: 0,
      type: 'monthly',
      installments: 12,
      startDate: addMonths(now, -3) - 5 * DAY,
      autopay: false,
    });
    const paidOffAt = addMonths(now, -1);
    const bracelet = mk(
      {
        name: 'Love Bracelet, Yellow Gold',
        merchant: 'Cartier',
        brand: 'cartier',
        category: 'jewelry',
        price: 7350,
        downPayment: 0,
        apr: 0,
        type: 'monthly',
        installments: 6,
        startDate: addMonths(now, -5),
        autopay: true,
      },
      { status: 'paid', paidOffAt },
    );
    const label = methodLabel(bank);
    const txns: Txn[] = [
      ...backfillTxns(watch, now, label, bank.id),
      ...backfillTxns(bag, now, label, bank.id),
      ...backfillTxns(necklace, now, label, bank.id),
    ];
    const braceletHist = backfillTxns(bracelet, paidOffAt - DAY, label, bank.id);
    const braceletStats = planStats({ ...bracelet, status: 'active' }, braceletHist, paidOffAt);
    txns.push(...braceletHist, {
      id: uid('t_'),
      planId: bracelet.id,
      type: 'payoff',
      amount: braceletStats.payoffQuote,
      description: `Paid in full · ${bracelet.name}`,
      methodId: bank.id,
      methodLabel: label,
      createdAt: paidOffAt,
      settlesAt: paidOffAt + DAY,
      confirmation: confirmationCode(),
    });
    if (profile.spendingPower < 50000) await dataApi.saveProfile(u!, { spendingPower: 50000 });
    await dataApi.putMany(u!, [
      { coll: 'methods', item: bank },
      { coll: 'methods', item: card },
      ...[watch, bag, necklace, bracelet].map((item) => ({ coll: 'plans' as Coll, item })),
      ...txns.map((item) => ({ coll: 'txns' as Coll, item })),
    ]);
  }, [u, snap.methods, profile.displayName, profile.spendingPower]);

  // Autopay: when an installment comes due on a plan with autopay, pay it automatically.
  const autopayRan = useRef(new Set<string>());
  useEffect(() => {
    if (!ready || !u) return;
    const run = () => {
      const now = Date.now();
      const writes: { coll: Coll; item: Plan | Txn }[] = [];
      for (const plan of snap.plans) {
        if (plan.status !== 'active' || !plan.autopay || inFlight.current.has(plan.id)) continue;
        const stats = planStats(plan, snap.txns, now);
        if (stats.pending > 0) continue;
        const due = stats.nextDue;
        if (!due || due.dueDate > now || due.dueDate < plan.createdAt - DAY) continue;
        const id = `auto_${plan.id}_${due.index}`;
        if (autopayRan.current.has(id) || snap.txns.some((t) => t.id === id)) continue;
        const m = findMethod(plan.methodId);
        // No usable method: leave it due rather than inventing a funding source.
        if (!m || methodIssue(m, now)) continue;
        autopayRan.current.add(id);
        writes.push({
          coll: 'txns',
          item: {
            id,
            planId: plan.id,
            type: 'payment',
            amount: due.amount,
            description: `AutoPay · ${plan.name}`,
            methodId: m?.id,
            methodLabel: methodLabel(m),
            createdAt: now,
            settlesAt: now + pendingMs,
            auto: true,
            confirmation: confirmationCode(),
          },
        });
        if (stats.remaining - due.amount < 0.01) writes.push({ coll: 'plans', item: { ...plan, status: 'paid', paidOffAt: now } });
      }
      if (writes.length) void dataApi.putMany(u, writes);
    };
    run();
    const t = setInterval(run, 60_000);
    return () => clearInterval(t);
  }, [ready, u, snap.plans, snap.txns, findMethod, pendingMs]);

  const value: DataCtx = {
    ready,
    plans,
    txns,
    methods,
    profile,
    defaultMethod,
    available,
    addPlan,
    updatePlan,
    deletePlan,
    pay,
    payoff,
    addMethod,
    removeMethod,
    setDefaultMethod,
    updateProfile,
    loadSample,
    resetData,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const PLAYFUL_KEY = 'kova:playful';

/** Whether to use the jokey copy: the account's setting when signed in, else the last one used on this device. */
export function usePlayful() {
  const { user } = useAuth();
  const { profile, ready } = useData();
  if (user && ready) return !!profile.playful;
  try {
    return localStorage.getItem(PLAYFUL_KEY) === '1';
  } catch {
    return false;
  }
}

export const useData = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useData outside DataProvider');
  return c;
};

/** Re-renders on an interval so pending → completed transitions show up live. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
