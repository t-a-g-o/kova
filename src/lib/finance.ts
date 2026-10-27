import type { Plan, PlanType, Txn, TxnStatus } from './types';
import { DAY, addMonths, round2, startOfDay } from './utils';

export interface Installment {
  index: number;
  dueDate: number;
  amount: number;
  kind: 'down' | 'installment';
}

export type InstallmentStatus = 'paid' | 'processing' | 'overdue' | 'due' | 'upcoming';

export const txnStatus = (t: Txn, now = Date.now()): TxnStatus =>
  t.failed ? 'failed' : now < t.settlesAt ? 'pending' : 'completed';

export const isPaymentTxn = (t: Txn) => t.type === 'payment' || t.type === 'payoff';

export function quote(price: number, type: PlanType, installments: number, apr: number, downPayment: number) {
  if (type === 'pay4') {
    const each = round2(price / 4);
    return { perInstallment: each, lastInstallment: round2(price - each * 3), total: round2(price), interest: 0, financed: price, down: each };
  }
  const financed = Math.max(0, price - downPayment);
  const r = apr / 100 / 12;
  const pmt = r > 0 ? (financed * r) / (1 - Math.pow(1 + r, -installments)) : financed / installments;
  const per = round2(pmt);
  const totalFinanced = round2(pmt * installments);
  return {
    perInstallment: per,
    lastInstallment: round2(totalFinanced - per * (installments - 1)),
    total: round2(totalFinanced + downPayment),
    interest: round2(totalFinanced - financed),
    financed,
    down: downPayment,
  };
}

export function buildSchedule(plan: Plan): Installment[] {
  const out: Installment[] = [];
  if (plan.type === 'pay4') {
    const each = round2(plan.price / 4);
    for (let i = 0; i < 4; i++) {
      out.push({
        index: i,
        dueDate: plan.startDate + i * 14 * DAY,
        amount: i === 3 ? round2(plan.price - each * 3) : each,
        kind: i === 0 ? 'down' : 'installment',
      });
    }
    return out;
  }
  const q = quote(plan.price, 'monthly', plan.installments, plan.apr, plan.downPayment);
  if (plan.downPayment > 0) out.push({ index: 0, dueDate: plan.startDate, amount: round2(plan.downPayment), kind: 'down' });
  for (let i = 0; i < plan.installments; i++) {
    out.push({
      index: out.length,
      dueDate: addMonths(plan.startDate, i + 1),
      amount: i === plan.installments - 1 ? q.lastInstallment : q.perInstallment,
      kind: 'installment',
    });
  }
  return out;
}

export interface PlanStats {
  schedule: (Installment & { status: InstallmentStatus })[];
  scheduleTotal: number;
  paid: number;
  pending: number;
  /** When the latest in-flight payment posts; null if nothing is processing. */
  pendingUntil: number | null;
  remaining: number;
  progress: number;
  installmentsPaid: number;
  nextDue: { index: number; dueDate: number; amount: number; overdue: boolean } | null;
  interest: number;
  payoffQuote: number;
  interestSaved: number;
  payments: Txn[];
}

export function planStats(plan: Plan, txns: Txn[], now = Date.now()): PlanStats {
  const schedule = buildSchedule(plan);
  const scheduleTotal = round2(schedule.reduce((s, i) => s + i.amount, 0));
  const payments = txns
    .filter((t) => t.planId === plan.id && isPaymentTxn(t) && !t.failed)
    .sort((a, b) => b.createdAt - a.createdAt);
  const paid = round2(payments.reduce((s, t) => s + t.amount, 0));
  const inFlight = payments.filter((t) => txnStatus(t, now) === 'pending');
  const pending = round2(inFlight.reduce((s, t) => s + t.amount, 0));
  const pendingUntil = inFlight.length ? Math.max(...inFlight.map((t) => t.settlesAt)) : null;
  const settled = paid - pending;
  const isPaid = plan.status === 'paid';
  const today = startOfDay(now);

  let cum = 0;
  let nextDue: PlanStats['nextDue'] = null;
  let installmentsPaid = 0;
  const withStatus = schedule.map((inst) => {
    cum = round2(cum + inst.amount);
    let status: InstallmentStatus;
    if (isPaid || paid >= cum - 0.005) {
      const done = isPaid ? pending < 0.005 : settled >= cum - 0.005;
      status = done ? 'paid' : 'processing';
      installmentsPaid++;
    } else if (!nextDue) {
      const overdue = startOfDay(inst.dueDate) < today;
      nextDue = { index: inst.index, dueDate: inst.dueDate, amount: round2(cum - paid), overdue };
      status = overdue ? 'overdue' : 'due';
    } else {
      status = startOfDay(inst.dueDate) < today ? 'overdue' : 'upcoming';
    }
    return { ...inst, status };
  });

  const remaining = isPaid ? 0 : Math.max(0, round2(scheduleTotal - paid));
  const interest = round2(scheduleTotal - plan.price);
  const financedTotal = scheduleTotal - (plan.type === 'monthly' ? plan.downPayment : 0);
  const interestRemaining = interest > 0 && financedTotal > 0 ? round2(interest * Math.min(1, remaining / financedTotal)) : 0;

  return {
    schedule: withStatus,
    scheduleTotal,
    paid,
    pending,
    pendingUntil,
    remaining,
    progress: isPaid ? 1 : scheduleTotal > 0 ? Math.min(1, paid / scheduleTotal) : 0,
    installmentsPaid,
    nextDue,
    interest,
    payoffQuote: round2(Math.max(0, remaining - interestRemaining)),
    interestSaved: interestRemaining,
    payments,
  };
}

export const planLabel = (p: Pick<Plan, 'type' | 'installments'>) =>
  p.type === 'pay4' ? 'Pay in 4 · every 2 weeks' : `${p.installments} monthly payments`;
