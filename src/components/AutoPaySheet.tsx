import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ArrowLeft, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { planStats } from '../lib/finance';
import { methodIssue, methodLabel, useData, useNow } from '../lib/store';
import type { Plan } from '../lib/types';
import { fmtDate, money } from '../lib/utils';
import { MethodIcon } from './Logos';
import { MethodList } from './PaySheet';
import { useToast } from './Toast';
import { Button, Row, Sheet } from './ui';

type Step = 'manage' | 'method' | 'review' | 'off';

/**
 * AutoPay changes move money on their own later, so each one is an explicit, confirmed authorization:
 * turning it on, switching the account it draws from, or turning it off.
 */
export function AutoPaySheet({ plan, open, onClose }: { plan: Plan; open: boolean; onClose: () => void }) {
  const { txns, methods, updatePlan } = useData();
  const toast = useToast();
  const nav = useNavigate();
  const now = useNow(1000);
  const s = planStats(plan, txns, now);
  const current = methods.find((m) => m.id === plan.methodId);
  const [step, setStep] = useState<Step>('manage');
  const [methodId, setMethodId] = useState<string | undefined>();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(plan.autopay ? 'manage' : 'method');
    setMethodId(current && !methodIssue(current) ? current.id : undefined);
    setAgreed(false);
    setBusy(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const method = methods.find((m) => m.id === methodId);
  const next = s.nextDue;
  const remainingCount = s.schedule.filter((i) => i.status !== 'paid' && i.status !== 'processing').length;

  const save = async (patch: Partial<Plan>, title: string) => {
    setBusy(true);
    await Promise.all([updatePlan(plan.id, patch), new Promise((r) => setTimeout(r, 700))]);
    setBusy(false);
    toast({ tone: 'success', title });
    onClose();
  };

  const back: Step | null = step === 'review' ? 'method' : step === 'method' && plan.autopay ? 'manage' : step === 'off' ? 'manage' : null;
  const titles: Record<Step, string> = {
    manage: 'AutoPay',
    method: plan.autopay ? 'Change AutoPay account' : 'Set up AutoPay',
    review: 'Authorize AutoPay',
    off: 'Turn off AutoPay?',
  };

  return (
    <Sheet
      open={open}
      onClose={busy ? () => {} : onClose}
      hideClose={busy}
      title={
        <div className="flex items-center gap-2">
          {back && (
            <button onClick={() => !busy && (setAgreed(false), setStep(back))} className="-ml-2 grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink" aria-label="Back">
              <ArrowLeft className="size-4" />
            </button>
          )}
          {titles[step]}
        </div>
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-5">
          {step === 'manage' && (
            <>
              <div className="flex items-center gap-3 rounded-2xl bg-iris-500/10 px-4 py-3.5">
                <Zap className="size-5 shrink-0 text-iris-500" />
                <p className="text-sm">
                  AutoPay is <span className="font-semibold">on</span>. Each installment is charged automatically on its due date.
                </p>
              </div>
              <div className="divide-y divide-line rounded-2xl border border-line px-4">
                <Row
                  label="Pays from"
                  value={
                    <span className="inline-flex items-center gap-2">
                      <MethodIcon method={current} size={22} />
                      {methodLabel(current)}
                    </span>
                  }
                />
                {next && <Row label="Next charge" value={`${money(next.amount)} on ${fmtDate(next.dueDate)}`} />}
                <Row label="Payments remaining" value={remainingCount} />
              </div>
              <div className="space-y-2">
                <Button variant="secondary" size="lg" block onClick={() => setStep('method')}>
                  Change payment account
                </Button>
                <Button variant="danger" size="lg" block onClick={() => setStep('off')}>
                  Turn off AutoPay
                </Button>
              </div>
            </>
          )}

          {step === 'method' && (
            <>
              <p className="text-sm text-muted">Choose the account AutoPay will charge for {plan.name}.</p>
              <MethodList value={methodId} onChange={setMethodId} now={now} onAdd={() => (onClose(), nav('/wallet'))} />
              <Button size="lg" block disabled={!method || !!methodIssue(method, now) || (plan.autopay && method.id === plan.methodId)} onClick={() => setStep('review')}>
                Continue
              </Button>
            </>
          )}

          {step === 'review' && method && (
            <>
              <div className="divide-y divide-line rounded-2xl border border-line px-4">
                <Row label="Plan" value={<span className="block max-w-[200px] truncate">{plan.name}</span>} />
                <Row
                  label="Charge to"
                  value={
                    <span className="inline-flex items-center gap-2">
                      <MethodIcon method={method} size={22} />
                      {methodLabel(method)}
                    </span>
                  }
                />
                {next && <Row label="First automatic charge" value={`${money(next.amount)} on ${fmtDate(next.dueDate)}`} />}
                <Row label="Payments covered" value={`${remainingCount} remaining`} />
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-2 p-4 text-xs leading-relaxed text-muted">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-iris-500" />
                <span>
                  I authorize Kova to {method.kind === 'bank' ? 'debit' : 'charge'} {methodLabel(method)} for each scheduled payment on {plan.name} on its due date until the plan is paid off or I
                  turn AutoPay off. I can cancel at any time before a payment is processed.
                </span>
              </label>
              <Button
                size="lg"
                block
                disabled={!agreed}
                loading={busy}
                onClick={() =>
                  save({ autopay: true, methodId: method.id }, plan.autopay ? `AutoPay now charges ${methodLabel(method)}` : 'AutoPay turned on')
                }
              >
                {plan.autopay ? 'Confirm change' : 'Turn on AutoPay'}
              </Button>
            </>
          )}

          {step === 'off' && (
            <>
              <div className="flex gap-3 rounded-2xl bg-amber-400/10 p-4 text-sm">
                <AlertTriangle className="size-5 shrink-0 text-amber-500 dark:text-amber-300" />
                <p className="text-muted">
                  You’ll need to pay each installment yourself by its due date.
                  {next && (
                    <>
                      {' '}
                      Your next payment of <span className="font-semibold text-ink">{money(next.amount)}</span> is due <span className="font-semibold text-ink">{fmtDate(next.dueDate)}</span>.
                    </>
                  )}{' '}
                  Late payments can affect your spending power.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" size="lg" block disabled={busy} onClick={() => setStep('manage')}>
                  Keep AutoPay
                </Button>
                <Button variant="danger" size="lg" block loading={busy} onClick={() => save({ autopay: false }, 'AutoPay turned off')}>
                  Turn off
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </Sheet>
  );
}
