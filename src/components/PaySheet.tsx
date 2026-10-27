import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, ArrowLeft, Check, ChevronDown, Clock, Copy, Loader2, Lock, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { planStats } from '../lib/finance';
import { PaymentError, methodIssue, methodLabel, useData, useNow } from '../lib/store';
import type { PaymentMethod, Plan } from '../lib/types';
import { cn, countdown, fmtDate, fmtTime, money, round2 } from '../lib/utils';
import { HoldButton, SuccessCheck } from './Celebration';
import { MethodIcon } from './Logos';
import { Button, Row, Sheet } from './ui';

export type PayMode = 'next' | 'custom' | 'payoff';
type Step = 'amount' | 'method' | 'review' | 'done';

const postsIn = (secs: number, now: number) => {
  if (secs < 90) return 'Within a minute';
  if (secs < 3600) return `Within ${Math.round(secs / 60)} minutes`;
  if (secs < 86_400) return `Within ${Math.round(secs / 3600)} hour${secs < 5400 ? '' : 's'}`;
  return fmtDate(now + secs * 1000);
};

const methodKind = (m: PaymentMethod) => (m.kind === 'bank' ? `Bank transfer · ${m.accountType === 'savings' ? 'Savings' : 'Checking'}` : `${m.institution} card`);

/** Compact dropdown, used for the plan's AutoPay method. */
export function MethodPicker({ value, onChange, label = 'Pay from' }: { value?: string; onChange: (id: string) => void; label?: string }) {
  const { methods } = useData();
  const [open, setOpen] = useState(false);
  const cur = methods.find((m) => m.id === value);
  return (
    <div className="rounded-2xl border border-line">
      <button type="button" onClick={() => methods.length > 1 && setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <MethodIcon method={cur} />
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted">{label}</span>
          <span className="block truncate text-sm font-semibold">{methodLabel(cur)}</span>
        </span>
        {methods.length > 1 && <ChevronDown className={cn('size-4 text-muted transition', open && 'rotate-180')} />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="space-y-1 border-t border-line p-2">
              {methods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onChange(m.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition hover:bg-surface-2"
                >
                  <MethodIcon method={m} size={28} />
                  <span className="flex-1 font-semibold">{methodLabel(m)}</span>
                  {m.id === value && <Check className="size-4 text-iris-500" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Full list of methods as radio options. Unusable ones are shown but disabled. */
function MethodList({ value, onChange, now, onAdd }: { value?: string; onChange: (id: string) => void; now: number; onAdd: () => void }) {
  const { methods } = useData();
  return (
    <div role="radiogroup" aria-label="Payment method" className="space-y-2">
      {methods.map((m) => {
        const issue = methodIssue(m, now);
        const selected = m.id === value;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={!!issue}
            onClick={() => onChange(m.id)}
            className={cn(
              'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition',
              selected ? 'border-iris-500 bg-iris-500/5 ring-1 ring-iris-500' : 'border-line hover:bg-surface-2',
              issue && 'cursor-not-allowed opacity-50 hover:bg-transparent',
            )}
          >
            <MethodIcon method={m} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {methodLabel(m)}
                {m.isDefault && <span className="ml-2 text-xs font-medium text-muted">Default</span>}
              </span>
              <span className="block truncate text-xs text-muted">
                {issue === 'Verifying' && m.verifiesAt ? `Verifying · ready in ${countdown(m.verifiesAt - now)}` : issue ?? methodKind(m)}
              </span>
            </span>
            <span className={cn('grid size-5 shrink-0 place-items-center rounded-full border-2', selected ? 'border-iris-500 bg-iris-500' : 'border-line')}>
              {selected && <span className="size-2 rounded-full bg-white" />}
            </span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onAdd}
        className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-3 text-left text-sm font-semibold text-muted transition hover:border-iris-400 hover:text-ink"
      >
        <span className="grid size-9 place-items-center rounded-xl bg-surface-2">
          <Plus className="size-4" />
        </span>
        Add a bank or card
      </button>
    </div>
  );
}

export function PaySheet({
  plan,
  mode,
  onClose,
  onPaidOff,
}: {
  plan: Plan;
  mode: PayMode | null;
  onClose: () => void;
  onPaidOff: (info: { amount: number; saved: number }) => void;
}) {
  const { txns, methods, profile, pay, payoff } = useData();
  const nav = useNavigate();
  const now = useNow(1000);
  const stats = planStats(plan, txns, now);
  const [step, setStep] = useState<Step>('amount');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const [methodId, setMethodId] = useState<string | undefined>();
  const [agreed, setAgreed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<{ amount: number; settlesAt: number; confirmation: string; method: string; balance: number } | null>(null);

  useEffect(() => {
    if (!mode) return;
    setStep(mode === 'custom' ? 'amount' : 'method');
    setCustom('');
    setBusy(false);
    setError(null);
    setAgreed(false);
    setResult(null);
    // Nothing is preselected — the payer picks where the money comes from.
    setMethodId(undefined);
  }, [mode]);

  const nextAmt = stats.nextDue?.amount ?? stats.remaining;
  const customRaw = round2(parseFloat(custom) || 0);
  const minAmt = Math.min(1, stats.remaining);
  const customError = !custom ? null : customRaw > stats.remaining + 0.005 ? `You only owe ${money(stats.remaining)}.` : customRaw < minAmt ? `The minimum payment is ${money(minAmt)}.` : null;
  const amount = mode === 'payoff' ? stats.payoffQuote : mode === 'next' ? nextAmt : customRaw;
  const method = methods.find((m) => m.id === methodId);
  const methodOk = !!method && !methodIssue(method, now);
  const balanceAfter = mode === 'payoff' ? 0 : Math.max(0, round2(stats.remaining - amount));
  const processing = stats.pending > 0 && !busy && step !== 'done';

  const run = async () => {
    if (busy || !method) return;
    setBusy(true);
    setError(null);
    const delay = new Promise((r) => setTimeout(r, 1100));
    try {
      if (mode === 'payoff') {
        const [res] = await Promise.all([payoff(plan.id, method.id), delay]);
        onClose();
        onPaidOff({ amount: res.txn.amount, saved: res.saved });
        return;
      }
      const [res] = await Promise.all([pay(plan.id, amount, method.id), delay]);
      if (res.paidOff) {
        onClose();
        onPaidOff({ amount: res.txn.amount, saved: 0 });
        return;
      }
      setResult({ amount: res.txn.amount, settlesAt: res.txn.settlesAt, confirmation: res.txn.confirmation, method: methodLabel(method), balance: balanceAfter });
      setStep('done');
    } catch (e) {
      setError(e instanceof PaymentError ? e.message : 'Something went wrong. You haven’t been charged — please try again.');
    } finally {
      setBusy(false);
    }
  };

  const back = step === 'review' ? 'method' : step === 'method' && mode === 'custom' ? 'amount' : null;
  const stepNo = { amount: 1, method: mode === 'custom' ? 2 : 1, review: mode === 'custom' ? 3 : 2, done: 0 }[step];
  const stepCount = mode === 'custom' ? 3 : 2;
  const titles: Record<Exclude<Step, 'done'>, string> = { amount: 'Payment amount', method: 'Pay from', review: 'Review payment' };

  const title =
    step === 'done' || !mode ? (
      ''
    ) : (
      <div className="flex items-center gap-2">
        {back && (
          <button onClick={() => !busy && setStep(back)} className="-ml-2 grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink" aria-label="Back">
            <ArrowLeft className="size-4" />
          </button>
        )}
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-faint uppercase">
            Step {stepNo} of {stepCount}
          </p>
          <p className="leading-tight">{titles[step]}</p>
        </div>
      </div>
    );

  return (
    <Sheet open={!!mode} onClose={busy ? () => {} : onClose} title={title} hideClose={busy}>
      {processing ? (
        <div className="flex flex-col items-center py-6 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-amber-400/15 text-amber-500 dark:text-amber-300">
            <Clock className="size-6" />
          </span>
          <h3 className="mt-5 font-display text-xl font-semibold">A payment is processing</h3>
          <p className="mt-2 max-w-xs text-sm text-muted">
            {money(stats.pending)} toward {plan.name} is on its way. You can make another payment once it posts
            {stats.pendingUntil ? ` in about ${countdown(stats.pendingUntil - now)}` : ''}.
          </p>
          <Button size="lg" block className="mt-6" onClick={onClose}>
            Got it
          </Button>
        </div>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          {step === 'amount' && mode && (
            <motion.div key="amount" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-5">
              <div className="pt-2 text-center">
                <div className="flex items-center justify-center font-display text-5xl font-semibold">
                  <span className="text-faint">$</span>
                  <input
                    autoFocus
                    inputMode="decimal"
                    placeholder="0"
                    aria-label="Amount"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').replace(/(\.\d{2}).+/, '$1'))}
                    className="tabular bg-transparent text-center outline-none placeholder:text-faint"
                    style={{ width: `${Math.max(2, custom.length + 0.5)}ch` }}
                  />
                </div>
                <p className={cn('mt-2 text-sm', customError ? 'text-rose-500' : 'text-muted')}>{customError ?? `${money(stats.remaining)} remaining`}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {[
                    { l: 'Next due', v: nextAmt },
                    { l: 'Half', v: round2(stats.remaining / 2) },
                    { l: 'All', v: stats.remaining },
                  ].map((c) => (
                    <button key={c.l} onClick={() => setCustom(c.v.toFixed(2))} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-iris-400 hover:text-ink">
                      {c.l} · {money(c.v, true)}
                    </button>
                  ))}
                </div>
              </div>
              <Button size="lg" block disabled={!custom || !!customError} onClick={() => setStep('method')}>
                Continue
              </Button>
            </motion.div>
          )}

          {step === 'method' && mode && (
            <motion.div key="method" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-5">
              <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted">{mode === 'payoff' ? 'Payoff amount' : mode === 'custom' ? 'Payment amount' : stats.nextDue?.overdue ? 'Past due' : 'Next installment'}</p>
                  <p className="truncate text-sm font-semibold">{plan.name}</p>
                </div>
                <p className="tabular font-display text-xl font-semibold">{money(amount)}</p>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold">Choose a payment method</p>
                {methods.length === 0 && <p className="mb-3 text-sm text-muted">You don’t have any payment methods yet. Add one to continue.</p>}
                <MethodList value={methodId} onChange={setMethodId} now={now} onAdd={() => (onClose(), nav('/wallet'))} />
              </div>
              <Button size="lg" block disabled={!methodOk} onClick={() => setStep('review')}>
                Continue
              </Button>
            </motion.div>
          )}

          {step === 'review' && mode && method && (
            <motion.div key="review" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-5">
              <div className="pt-1 text-center">
                <p className="text-sm font-semibold text-muted">You’re paying</p>
                <p className="tabular mt-1 font-display text-5xl font-semibold">{money(amount)}</p>
              </div>

              <div className="divide-y divide-line rounded-2xl border border-line px-4">
                <Row
                  label="From"
                  value={
                    <span className="inline-flex items-center gap-2">
                      <MethodIcon method={method} size={22} />
                      {methodLabel(method)}
                    </span>
                  }
                />
                <Row label="To" value={<span className="block max-w-[200px] truncate">{plan.merchant} · {plan.name}</span>} />
                <Row label="Payment date" value={`Today, ${fmtDate(now)}`} />
                <Row label="Expected to post" value={postsIn(profile.pendingSeconds, now)} />
                <Row label="Fee" value="Free" />
                {mode === 'payoff' && <Row label="Interest waived" value={<span className="text-mint-600 dark:text-mint-400">−{money(stats.interestSaved)}</span>} />}
                <Row label="Balance after" value={money(balanceAfter)} />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-2 p-4 text-xs leading-relaxed text-muted">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-iris-500" />
                <span>
                  I authorize Kova to {method.kind === 'bank' ? 'debit' : 'charge'} {money(amount)} from {methodLabel(method)} today for order {plan.orderNumber}. Once submitted, this payment can’t be canceled.
                </span>
              </label>

              {error && (
                <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-500/10 px-3 py-2.5 text-sm text-rose-500">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
                </p>
              )}

              {busy ? (
                <div className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-surface-2 text-sm font-semibold text-muted">
                  <Loader2 className="size-5 animate-spin text-iris-500" /> Submitting payment…
                </div>
              ) : (
                <HoldButton label={`Hold to pay ${money(amount)}`} disabled={!agreed} onComplete={run} />
              )}
              <p className="text-center text-xs text-faint">
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="size-3" /> Payments are encrypted and processed securely.
                </span>
              </p>
            </motion.div>
          )}

          {step === 'done' && result && (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-6 text-center">
              <SuccessCheck size={88} />
              <motion.h3 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-7 font-display text-2xl font-semibold">
                Payment submitted
              </motion.h3>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-2 text-muted">
                {money(result.amount)} toward {plan.name}.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-6 w-full divide-y divide-line rounded-2xl bg-surface-2 px-4 text-left">
                <Row label="Paid from" value={result.method} />
                <Row label="New balance" value={money(result.balance)} />
                <Row label="Status" value={<span className="text-amber-500 dark:text-amber-300">Pending · posts by {fmtTime(result.settlesAt)}</span>} />
                <Row
                  label="Confirmation"
                  value={
                    <button
                      className="inline-flex items-center gap-1.5 font-mono text-[13px]"
                      onClick={() => {
                        void navigator.clipboard?.writeText(result.confirmation);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                    >
                      {result.confirmation} {copied ? <Check className="size-3.5 text-mint-500" /> : <Copy className="size-3.5 text-faint" />}
                    </button>
                  }
                />
              </motion.div>
              <Button size="lg" block className="mt-6" onClick={onClose}>
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </Sheet>
  );
}
