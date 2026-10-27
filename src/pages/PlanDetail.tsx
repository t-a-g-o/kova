import { motion } from 'motion/react';
import { ArrowLeft, Check, Clock, Pencil, Trash2, Trophy, Zap } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Celebration } from '../components/Celebration';
import { MethodPicker, PaySheet, type PayMode } from '../components/PaySheet';
import { PlanThumb } from '../components/PlanThumb';
import { PhotoButton } from '../components/NewPlanSheet';
import { useToast } from '../components/Toast';
import { TxnRow, TxnSheet } from '../components/Txn';
import { AnimatedNumber, Badge, Button, Card, Empty, Input, ProgressRing, Row, Sheet, Toggle } from '../components/ui';
import { installmentLabel, planLabel, planStats, type InstallmentStatus } from '../lib/finance';
import { methodIssue, useData, useNow } from '../lib/store';
import type { Txn } from '../lib/types';
import { cn, countdown, fmtDate, fmtShort, money } from '../lib/utils';

const instStyle: Record<InstallmentStatus, { label: string; cls: string }> = {
  paid: { label: 'Paid', cls: 'bg-mint-400 text-[#04140e]' },
  processing: { label: 'Processing', cls: 'bg-amber-400/20 text-amber-500 dark:text-amber-300' },
  overdue: { label: 'Past due', cls: 'bg-rose-500/15 text-rose-500' },
  due: { label: 'Up next', cls: 'bg-iris-500 text-white' },
  upcoming: { label: 'Upcoming', cls: 'bg-surface-2 text-faint' },
};

export function PlanDetail() {
  const { id } = useParams();
  const loc = useLocation();
  const nav = useNavigate();
  const toast = useToast();
  const { plans, txns, methods, updatePlan, deletePlan, ready } = useData();
  const now = useNow(1000);
  const plan = plans.find((p) => p.id === id);
  const [mode, setMode] = useState<PayMode | null>(null);
  const [celebrate, setCelebrate] = useState<{ amount: number; saved: number } | null>(null);
  const [openTxn, setOpenTxn] = useState<Txn | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const want = (loc.state as { pay?: PayMode } | null)?.pay;
    if (want && plan?.status === 'active') {
      if (planStats(plan, txns).pending > 0) toast({ tone: 'pending', title: 'A payment is already processing', body: 'You can pay again once it posts.' });
      else setMode(want);
      nav(loc.pathname, { replace: true, state: null });
    }
  }, [loc.state, plan, txns, toast, nav, loc.pathname]);

  if (!plan) {
    return ready ? (
      <Card>
        <Empty icon={<ArrowLeft />} title="Plan not found" body="It may have been deleted." action={<Button onClick={() => nav('/plans')}>Back to plans</Button>} />
      </Card>
    ) : null;
  }

  const s = planStats(plan, txns, now);
  const paid = plan.status === 'paid';
  const planTxns = txns.filter((t) => t.planId === plan.id);
  const schedule = showAll ? s.schedule : s.schedule.slice(0, 8);
  const autopayMethod = methods.find((m) => m.id === plan.methodId) ?? methods.find((m) => m.isDefault);
  const autopayIssue = !autopayMethod ? 'Add a payment method' : methodIssue(autopayMethod, now);

  return (
    <div>
      <Link to="/plans" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-ink">
        <ArrowLeft className="size-4" /> Plans
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Card className="relative overflow-hidden p-6 sm:p-8">
            {paid && <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-mint-400/15 blur-[80px]" />}
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative w-fit">
                <PlanThumb plan={plan} size={88} />
                <PhotoButton
                  label={plan.imageUrl ? 'Edit' : 'Photo'}
                  className="absolute -right-2 -bottom-2 border-surface bg-surface px-2 py-1 shadow-md"
                  onPhoto={(img) => {
                    void updatePlan(plan.id, { imageUrl: img });
                    toast({ tone: 'success', title: 'Photo updated' });
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {paid ? (
                    <Badge tone="success">
                      <Trophy className="size-3" /> Paid in full
                    </Badge>
                  ) : s.nextDue?.overdue ? (
                    <Badge tone="danger">Past due</Badge>
                  ) : (
                    <Badge tone="iris">Active</Badge>
                  )}
                  {s.pending > 0 && (
                    <Badge tone="pending" pulse>
                      {money(s.pending)} processing
                    </Badge>
                  )}
                </div>
                <h1 className="mt-2 font-display text-2xl leading-tight font-semibold sm:text-3xl">{plan.name}</h1>
                <p className="text-muted">
                  {plan.merchant} · {planLabel(plan)}
                </p>
              </div>
              <ProgressRing value={s.progress} size={112} stroke={10} className="self-center">
                <div className="text-center">
                  <p className="font-display text-2xl font-semibold">{Math.round(s.progress * 100)}%</p>
                  <p className="-mt-0.5 text-[11px] text-muted">paid</p>
                </div>
              </ProgressRing>
            </div>

            <div className="relative mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label={paid ? 'Total paid' : 'Remaining'} value={<AnimatedNumber value={paid ? s.paid : s.remaining} />} big />
              <Stat label="Paid so far" value={<AnimatedNumber value={s.paid} />} />
              <Stat
                label={paid ? 'Paid off on' : 'Next payment'}
                value={paid ? fmtShort(plan.paidOffAt ?? now) : s.nextDue ? `${fmtShort(s.nextDue.dueDate)}` : '—'}
                className="col-span-2 sm:col-span-1"
                sub={!paid && s.nextDue ? money(s.nextDue.amount) : undefined}
              />
            </div>

            {!paid && s.pendingUntil && (
              <div className="relative mt-7 flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3.5">
                <Clock className="size-5 shrink-0 text-amber-500 dark:text-amber-300" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{money(s.pending)} payment processing</p>
                  <p className="text-xs text-muted">You can make another payment once it posts · about {countdown(s.pendingUntil - now)}</p>
                </div>
              </div>
            )}

            {!paid && !s.pendingUntil && (
              <div className="relative mt-7 grid gap-3 sm:grid-cols-3">
                <Button size="lg" onClick={() => setMode('next')} className="sm:col-span-1">
                  Pay {money(s.nextDue?.amount ?? s.remaining)}
                </Button>
                <Button size="lg" variant="secondary" onClick={() => setMode('custom')}>
                  Other amount
                </Button>
                <Button size="lg" variant="mint" onClick={() => setMode('payoff')}>
                  Pay off · {money(s.payoffQuote, true)}
                </Button>
              </div>
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Payment schedule</h2>
              <span className="text-sm text-muted">
                {s.installmentsPaid}/{s.schedule.length} paid
              </span>
            </div>
            <div className="relative">
              {schedule.map((inst, i) => {
                const st = instStyle[inst.status];
                return (
                  <motion.div
                    key={inst.index}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i, 10) * 0.03 }}
                    className="relative flex items-center gap-4 py-2.5"
                  >
                    {i < schedule.length - 1 && <span className={cn('absolute top-9 left-[13px] h-[calc(100%-22px)] w-0.5', inst.status === 'paid' ? 'bg-mint-400/60' : 'bg-line')} />}
                    <span className={cn('relative z-10 grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold', st.cls)}>
                      {inst.status === 'paid' ? <Check className="size-3.5" strokeWidth={3} /> : inst.status === 'processing' ? <Clock className="size-3.5" /> : inst.kind === 'down' && plan.type === 'monthly' ? 'D' : inst.index + (plan.type === 'monthly' && plan.downPayment > 0 ? 0 : 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{installmentLabel(plan, inst)}</p>
                      <p className="text-xs text-muted">{fmtDate(inst.dueDate)}</p>
                    </div>
                    <span className={cn('hidden rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline', inst.status === 'upcoming' ? 'text-faint' : '', inst.status === 'overdue' && 'text-rose-500', inst.status === 'due' && 'text-iris-500')}>
                      {st.label}
                    </span>
                    <span className={cn('tabular w-24 text-right text-sm font-semibold', inst.status === 'paid' && 'text-muted line-through decoration-mint-400/60')}>{money(inst.amount)}</span>
                  </motion.div>
                );
              })}
            </div>
            {s.schedule.length > 8 && (
              <button onClick={() => setShowAll((v) => !v)} className="mt-3 w-full rounded-2xl py-2.5 text-sm font-semibold text-iris-500 transition hover:bg-surface-2">
                {showAll ? 'Show less' : `Show all ${s.schedule.length} payments`}
              </button>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-display font-bold">Details</h2>
              <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 text-sm font-semibold text-iris-500">
                <Pencil className="size-3.5" /> Edit
              </button>
            </div>
            <div className="divide-y divide-line">
              <Row label="Purchase price" value={money(plan.price)} />
              {plan.downPayment > 0 && <Row label="Down payment" value={money(plan.downPayment)} />}
              <Row label="APR" value={`${plan.apr}%`} />
              <Row label="Interest" value={money(s.interest)} />
              <Row label="Total of payments" value={money(s.scheduleTotal)} />
              <Row label="Purchased" value={fmtDate(plan.startDate)} />
              <Row label="Order" value={<span className="font-mono text-[13px]">{plan.orderNumber}</span>} />
            </div>
          </Card>

          {!paid && (
            <Card className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-iris-500/10 text-iris-500">
                  <Zap className="size-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">AutoPay</p>
                  <p className="text-xs text-muted">{plan.autopay ? 'Payments are made on each due date' : 'Off — pay manually'}</p>
                </div>
                <Toggle
                  checked={plan.autopay}
                  onChange={(v) => {
                    if (v && !methods.length) {
                      toast({ tone: 'error', title: 'Add a payment method first', body: 'AutoPay needs a bank or card to pay from.' });
                      return;
                    }
                    void updatePlan(plan.id, { autopay: v, methodId: plan.methodId ?? autopayMethod?.id });
                    toast({ tone: 'success', title: v ? 'AutoPay turned on' : 'AutoPay turned off' });
                  }}
                  label="AutoPay"
                />
              </div>
              {methods.length > 0 ? (
                <MethodPicker label="AutoPay from" value={autopayMethod?.id} onChange={(mid) => void updatePlan(plan.id, { methodId: mid })} />
              ) : (
                <Link to="/wallet" className="block rounded-2xl border border-dashed border-line px-4 py-3 text-sm font-semibold text-muted transition hover:border-iris-400 hover:text-ink">
                  + Add a bank or card
                </Link>
              )}
              {plan.autopay && autopayIssue && (
                <p className="rounded-xl bg-amber-400/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-300">
                  AutoPay is paused: {autopayIssue === 'Expired' ? 'this card has expired. Choose another method.' : autopayIssue === 'Verifying' ? 'this bank is still verifying.' : 'add a payment method to resume.'}
                </p>
              )}
            </Card>
          )}

          <Card className="p-5">
            <h2 className="mb-2 font-display font-bold">Activity</h2>
            <div className="-mx-2">
              {planTxns.length ? (
                planTxns.map((t) => <TxnRow key={t.id} txn={t} now={now} showPlan={false} onClick={() => setOpenTxn(t)} />)
              ) : (
                <p className="px-2 py-3 text-sm text-muted">No activity yet.</p>
              )}
            </div>
          </Card>

          <button onClick={() => setConfirmDelete(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-rose-500 transition hover:bg-rose-500/10">
            <Trash2 className="size-4" /> Delete plan
          </button>
        </div>
      </div>

      <PaySheet plan={plan} mode={mode} onClose={() => setMode(null)} onPaidOff={(info) => setTimeout(() => setCelebrate(info), 250)} />
      <Celebration
        open={!!celebrate}
        plan={plan}
        amount={celebrate?.amount ?? 0}
        saved={celebrate?.saved ?? 0}
        paymentsMade={s.payments.length}
        onClose={() => setCelebrate(null)}
      />
      <TxnSheet txn={openTxn} onClose={() => setOpenTxn(null)} />
      <EditPlanSheet open={editOpen} onClose={() => setEditOpen(false)} planId={plan.id} />
      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this plan?">
        <p className="text-muted">This removes {plan.name} and all of its payment history. This can’t be undone.</p>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" block size="lg" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            block
            size="lg"
            onClick={async () => {
              await deletePlan(plan.id);
              toast({ title: 'Plan deleted' });
              nav('/plans');
            }}
          >
            Delete
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function Stat({ label, value, sub, big, className }: { label: string; value: ReactNode; sub?: string; big?: boolean; className?: string }) {
  return (
    <div className={cn('rounded-2xl bg-surface-2 px-4 py-3.5', className)}>
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className={cn('tabular mt-0.5 font-display font-bold', big ? 'text-xl sm:text-2xl' : 'text-lg')}>{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

function EditPlanSheet({ open, onClose, planId }: { open: boolean; onClose: () => void; planId: string }) {
  const { plans, updatePlan } = useData();
  const toast = useToast();
  const plan = plans.find((p) => p.id === planId)!;
  const [name, setName] = useState(plan.name);
  const [merchant, setMerchant] = useState(plan.merchant);
  const [imageUrl, setImageUrl] = useState(plan.imageUrl ?? '');
  useEffect(() => {
    if (open) {
      setName(plan.name);
      setMerchant(plan.merchant);
      setImageUrl(plan.imageUrl ?? '');
    }
  }, [open, plan.name, plan.merchant, plan.imageUrl]);
  return (
    <Sheet open={open} onClose={onClose} title="Edit plan">
      <div className="space-y-4">
        <Input label="Item" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Store" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
        <div className="flex items-center gap-3">
          <PlanThumb plan={{ ...plan, imageUrl: imageUrl || undefined }} size={56} />
          <PhotoButton onPhoto={setImageUrl} label={imageUrl ? 'Change photo' : 'Add photo'} />
          {imageUrl && (
            <button type="button" onClick={() => setImageUrl('')} className="text-xs font-semibold text-faint hover:text-ink">
              Remove
            </button>
          )}
        </div>
        <Button
          size="lg"
          block
          disabled={!name.trim() || !merchant.trim()}
          onClick={async () => {
            await updatePlan(planId, { name: name.trim(), merchant: merchant.trim(), imageUrl: imageUrl.trim() || undefined });
            toast({ tone: 'success', title: 'Plan updated' });
            onClose();
          }}
        >
          Save changes
        </Button>
      </div>
    </Sheet>
  );
}
