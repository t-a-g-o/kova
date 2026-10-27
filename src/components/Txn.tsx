import { motion } from 'motion/react';
import { ArrowDownLeft, Check, Copy, PartyPopper, ShoppingBag, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { txnStatus } from '../lib/finance';
import { useData, useNow } from '../lib/store';
import type { Txn, TxnStatus } from '../lib/types';
import { cn, fmtDate, fmtTime, money } from '../lib/utils';
import { PlanThumb } from './PlanThumb';
import { Badge, Row, Sheet } from './ui';

export function StatusBadge({ status }: { status: TxnStatus }) {
  if (status === 'pending')
    return (
      <Badge tone="pending" pulse>
        Pending
      </Badge>
    );
  if (status === 'failed') return <Badge tone="danger">Failed</Badge>;
  return <Badge tone="success">Completed</Badge>;
}

const txnIcon = (t: Txn) => {
  if (t.type === 'purchase') return <ShoppingBag className="size-[18px]" />;
  if (t.type === 'payoff') return <PartyPopper className="size-[18px]" />;
  if (t.auto) return <Zap className="size-[18px]" />;
  return <ArrowDownLeft className="size-[18px]" />;
};

const txnTitle = (t: Txn) =>
  t.type === 'purchase' ? 'Purchase financed' : t.type === 'payoff' ? 'Paid in full' : t.auto ? 'AutoPay payment' : 'Payment';

export function TxnRow({ txn, onClick, showPlan = true, now }: { txn: Txn; onClick: () => void; showPlan?: boolean; now: number }) {
  const { plans } = useData();
  const plan = plans.find((p) => p.id === txn.planId);
  const status = txnStatus(txn, now);
  const isPayment = txn.type !== 'purchase';
  return (
    <motion.button
      layout="position"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface-2"
    >
      <div className="relative">
        {plan && showPlan ? (
          <PlanThumb plan={plan} size={38} />
        ) : (
          <div className="grid size-[38px] place-items-center rounded-xl bg-surface-2 text-muted">{txnIcon(txn)}</div>
        )}
        {plan && showPlan && (
          <span
            className={cn(
              'absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full ring-2 ring-surface [&>svg]:size-2.5',
              txn.type === 'payoff' ? 'bg-mint-400 text-[#04140e]' : isPayment ? 'bg-iris-500 text-white' : 'bg-surface-2 text-muted',
            )}
          >
            {txnIcon(txn)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{showPlan && plan ? plan.name : txnTitle(txn)}</p>
        <p className="truncate text-xs text-muted">
          {showPlan && plan ? txnTitle(txn) : fmtDate(txn.createdAt)} · {status === 'pending' ? 'Processing' : fmtTime(txn.createdAt)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={cn('tabular text-sm font-medium', isPayment ? 'text-ink' : 'text-muted')}>
          {isPayment ? '−' : ''}
          {money(txn.amount)}
        </span>
        {status !== 'completed' ? (
          <StatusBadge status={status} />
        ) : (
          <span className="text-xs text-faint">{isPayment && txn.methodId ? txn.methodLabel : 'Completed'}</span>
        )}
      </div>
    </motion.button>
  );
}

export function TxnSheet({ txn, onClose }: { txn: Txn | null; onClose: () => void }) {
  const { plans } = useData();
  const now = useNow(1000);
  const [copied, setCopied] = useState(false);
  const plan = plans.find((p) => p.id === txn?.planId);
  const status = txn ? txnStatus(txn, now) : 'completed';

  const steps = txn
    ? [
        { label: 'Initiated', at: txn.createdAt, done: true },
        { label: 'Processing', at: txn.createdAt + 1500, done: true },
        { label: status === 'pending' ? 'Posting' : 'Posted', at: txn.settlesAt, done: status === 'completed' },
      ]
    : [];

  return (
    <Sheet open={!!txn} onClose={onClose} title="Transaction details">
      {txn && (
        <div className="pb-2">
          <div className="flex flex-col items-center pt-2 pb-6 text-center">
            {plan ? <PlanThumb plan={plan} size={64} /> : <div className="grid size-16 place-items-center rounded-2xl bg-surface-2">{txnIcon(txn)}</div>}
            <p className="mt-4 text-sm font-semibold text-muted">{txnTitle(txn)}</p>
            <p className="tabular mt-1 font-display text-4xl font-semibold">{money(txn.amount)}</p>
            <div className="mt-3">
              <StatusBadge status={status} />
            </div>
          </div>

          <div className="mb-5 rounded-2xl bg-surface-2 p-4">
            {steps.map((s, i) => (
              <div key={s.label + i} className="relative flex gap-3 pb-4 last:pb-0">
                {i < steps.length - 1 && <span className={cn('absolute top-6 left-[11px] h-[calc(100%-20px)] w-0.5', steps[i + 1].done ? 'bg-mint-400' : 'bg-line')} />}
                <span
                  className={cn(
                    'relative z-10 grid size-6 shrink-0 place-items-center rounded-full',
                    s.done ? 'bg-mint-400 text-[#04140e]' : 'bg-amber-400/20 text-amber-400',
                  )}
                >
                  {s.done ? <Check className="size-3.5" strokeWidth={3} /> : <span className="size-2 animate-pulse rounded-full bg-current" />}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-semibold">{s.label}</p>
                  <p className="text-xs text-muted">
                    {s.done || i < 2 ? `${fmtDate(s.at)} · ${fmtTime(s.at)}` : 'In progress'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="divide-y divide-line">
            {plan && <Row label="Item" value={<Link to={`/plans/${plan.id}`} onClick={onClose} className="text-iris-500 hover:underline">{plan.name}</Link>} />}
            {plan && <Row label="Merchant" value={plan.merchant} />}
            {txn.type !== 'purchase' && <Row label="Paid from" value={txn.methodId ? txn.methodLabel : '—'} />}
            {txn.auto && <Row label="Type" value="AutoPay" />}
            {plan && <Row label="Order" value={<span className="font-mono text-[13px]">{plan.orderNumber}</span>} />}
            <Row
              label="Confirmation"
              value={
                <button
                  className="inline-flex items-center gap-1.5 font-mono text-[13px]"
                  onClick={() => {
                    void navigator.clipboard?.writeText(txn.confirmation);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {txn.confirmation} {copied ? <Check className="size-3.5 text-mint-500" /> : <Copy className="size-3.5 text-faint" />}
                </button>
              }
            />
          </div>
        </div>
      )}
    </Sheet>
  );
}
