import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Loader2, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { planStats } from '../lib/finance';
import { methodLabel, useData } from '../lib/store';
import type { Plan } from '../lib/types';
import { cn, money, round2 } from '../lib/utils';
import { HoldButton, SuccessCheck } from './Celebration';
import { MethodIcon } from './Logos';
import { Button, Row, Sheet } from './ui';

export type PayMode = 'next' | 'custom' | 'payoff';

export function MethodPicker({ value, onChange }: { value?: string; onChange: (id: string) => void }) {
  const { methods } = useData();
  const [open, setOpen] = useState(false);
  const cur = methods.find((m) => m.id === value);
  return (
    <div className="rounded-2xl border border-line">
      <button type="button" onClick={() => methods.length > 1 && setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <MethodIcon method={cur} />
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted">Pay from</span>
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
  const { txns, pay, payoff } = useData();
  const stats = planStats(plan, txns);
  const [phase, setPhase] = useState<'form' | 'done'>('form');
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState('');
  const [methodId, setMethodId] = useState(plan.methodId);
  const [result, setResult] = useState<{ amount: number; settlesAt: number } | null>(null);
  const { defaultMethod } = useData();

  useEffect(() => {
    if (!mode) return;
    setPhase('form');
    setCustom('');
    setBusy(false);
    setMethodId(plan.methodId ?? defaultMethod?.id);
  }, [mode, plan.methodId, defaultMethod?.id]);

  const nextAmt = stats.nextDue?.amount ?? stats.remaining;
  const customN = Math.min(stats.remaining, round2(parseFloat(custom) || 0));
  const amount = mode === 'payoff' ? stats.payoffQuote : mode === 'next' ? nextAmt : customN;

  const run = async () => {
    setBusy(true);
    const delay = new Promise((r) => setTimeout(r, 1100));
    if (mode === 'payoff') {
      const [res] = await Promise.all([payoff(plan.id, methodId), delay]);
      onClose();
      onPaidOff({ amount: res.txn.amount, saved: res.saved });
      return;
    }
    const [res] = await Promise.all([pay(plan.id, amount, methodId), delay]);
    if (res.paidOff) {
      onClose();
      onPaidOff({ amount: res.txn.amount, saved: 0 });
      return;
    }
    setResult({ amount: res.txn.amount, settlesAt: res.txn.settlesAt });
    setBusy(false);
    setPhase('done');
  };

  const titles: Record<PayMode, string> = { next: 'Make a payment', custom: 'Pay a custom amount', payoff: 'Pay off in full' };

  return (
    <Sheet open={!!mode} onClose={busy ? () => {} : onClose} title={phase === 'form' && mode ? titles[mode] : ''} hideClose={busy}>
      <AnimatePresence mode="wait" initial={false}>
        {phase === 'form' && mode && (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-5">
            {mode === 'custom' ? (
              <div className="pt-2 text-center">
                <div className="flex items-center justify-center font-display text-5xl font-semibold">
                  <span className="text-faint">$</span>
                  <input
                    autoFocus
                    inputMode="decimal"
                    placeholder="0"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="tabular w-[6ch] bg-transparent text-center outline-none placeholder:text-faint"
                    style={{ width: `${Math.max(2, custom.length + 0.5)}ch` }}
                  />
                </div>
                <p className="mt-2 text-sm text-muted">{money(stats.remaining)} remaining</p>
                <div className="mt-4 flex justify-center gap-2">
                  {[
                    { l: 'Next due', v: nextAmt },
                    { l: 'Half', v: round2(stats.remaining / 2) },
                    { l: 'All', v: stats.remaining },
                  ].map((c) => (
                    <button key={c.l} onClick={() => setCustom(String(c.v))} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-iris-400 hover:text-ink">
                      {c.l} · {money(c.v, true)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pt-2 text-center">
                <p className="text-sm font-semibold text-muted">{mode === 'payoff' ? 'Payoff amount' : stats.nextDue?.overdue ? 'Past due' : 'Next installment'}</p>
                <p className="tabular mt-1 font-display text-5xl font-semibold">{money(amount)}</p>
                <p className="mt-2 text-sm text-muted">{plan.name}</p>
              </div>
            )}

            {mode === 'payoff' && (
              <div className="rounded-2xl bg-surface-2 px-4 py-1">
                <Row label="Remaining balance" value={money(stats.remaining)} />
                <Row label="Future interest waived" value={<span className="text-mint-600 dark:text-mint-400">−{money(stats.interestSaved)}</span>} />
                <Row label="You pay today" value={<span className="font-display">{money(stats.payoffQuote)}</span>} className="border-t border-line" />
              </div>
            )}

            <MethodPicker value={methodId} onChange={setMethodId} />

            {mode === 'payoff' ? (
              busy ? (
                <div className="grid h-14 place-items-center rounded-2xl bg-surface-2">
                  <Loader2 className="size-5 animate-spin text-iris-500" />
                </div>
              ) : (
                <HoldButton label={`Hold to pay ${money(amount)}`} onComplete={run} />
              )
            ) : (
              <Button size="lg" block disabled={amount < 1} loading={busy} onClick={run}>
                <Lock className="size-4" /> Pay {money(amount)}
              </Button>
            )}
            <p className="text-center text-xs text-faint">
              <span className="inline-flex items-center gap-1.5"><Lock className="size-3" /> Payments are encrypted and processed securely.</span>
            </p>
          </motion.div>
        )}

        {phase === 'done' && result && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-6 text-center">
            <SuccessCheck size={88} />
            <motion.h3 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-7 font-display text-2xl font-semibold">
              Payment submitted
            </motion.h3>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-2 text-muted">
              {money(result.amount)} toward {plan.name}.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-6 w-full rounded-2xl bg-surface-2 px-4 py-1 text-left">
              <Row label="New balance" value={money(planStats(plan, txns).remaining)} />
              <Row label="Status" value={<span className="text-amber-500 dark:text-amber-300">Pending</span>} />
            </motion.div>
            <Button size="lg" block className="mt-6" onClick={onClose}>
              Done
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}
