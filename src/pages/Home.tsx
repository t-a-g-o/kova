import { motion } from 'motion/react';
import { ArrowRight, ArrowUpRight, CalendarDays, CreditCard, Layers, Wallet } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlanThumb } from '../components/PlanThumb';
import { TxnRow, TxnSheet } from '../components/Txn';
import { AnimatedNumber, Badge, Button, Card, Empty, Segmented, Skeleton } from '../components/ui';
import { planStats, type PlanStats } from '../lib/finance';
import { useData, useNow } from '../lib/store';
import type { Plan, Txn } from '../lib/types';
import { DAY, cn, fmtShort, money, relativeDay } from '../lib/utils';

const fade = (i = 0) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] as const },
});

export function Home() {
  const { plans, txns, methods, profile, ready } = useData();
  const nav = useNavigate();
  const now = useNow(1000);
  const [openTxn, setOpenTxn] = useState<Txn | null>(null);
  const [tab, setTab] = useState<'active' | 'paid'>('active');

  const rows = useMemo(() => plans.map((p) => ({ plan: p, s: planStats(p, txns, now) })), [plans, txns, now]);
  const active = rows.filter((r) => r.plan.status === 'active');
  const paidOff = rows.filter((r) => r.plan.status === 'paid');

  const upcoming = useMemo(
    () =>
      active
        .flatMap(({ plan, s }) => s.schedule.filter((i) => i.status === 'due' || i.status === 'overdue' || i.status === 'upcoming').map((inst) => ({ plan, inst })))
        .sort((a, b) => a.inst.dueDate - b.inst.dueDate),
    [active],
  );

  // One row per plan: the installment that's actually next, not every future one.
  const nextUp = useMemo(
    () =>
      active
        .filter(({ s }) => s.nextDue)
        .map(({ plan, s }) => ({ plan, due: s.nextDue!, processing: s.pending > 0 }))
        .sort((a, b) => a.due.dueDate - b.due.dueDate),
    [active],
  );

  const totals = useMemo(() => {
    const balance = active.reduce((sum, r) => sum + r.s.remaining, 0);
    const paid = rows.reduce((sum, r) => sum + r.s.paid, 0);
    const next30 = upcoming.filter((u) => u.inst.dueDate <= now + 30 * DAY);
    return { balance, paid, due30: next30.reduce((sum, u) => sum + u.inst.amount, 0), due30Count: next30.length };
  }, [active, rows, upcoming, now]);

  const available = Math.max(0, profile.spendingPower - totals.balance);
  const overdue = upcoming.filter(({ inst }) => inst.status === 'overdue');
  const autoPayCount = active.filter(({ plan }) => plan.autopay).length;
  const next = nextUp[0];
  const payable = nextUp.find((n) => !n.processing);
  const first = (profile.displayName || '').split(' ')[0];
  const isNew = now - profile.memberSince < DAY && plans.length <= 1;

  if (!ready) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div>
      <motion.div {...fade()} className="mb-7 flex flex-wrap items-end justify-between gap-4 lg:mb-8">
        <div>
          <p className="text-sm text-muted">{(isNew ? 'Welcome' : 'Welcome back') + (first ? `, ${first}` : '')}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Account overview</h1>
          <p className="mt-2 text-sm text-muted">Your balances, payments, and plans in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => nav('/activity')}>View activity <ArrowUpRight className="size-4" /></Button>
          {payable && <Button onClick={() => nav(`/plans/${payable.plan.id}`, { state: { pay: 'next' } })}>Make a payment</Button>}
        </div>
      </motion.div>

      <motion.div {...fade(1)} data-tour="summary" className="mb-6 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <section className="relative overflow-hidden rounded-2xl bg-[#18243c] p-6 text-white sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-300">Total outstanding balance</p>
            <Wallet className="size-5 text-slate-400" aria-hidden="true" />
          </div>
          <p className="tabular mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            <AnimatedNumber value={totals.balance} duration={0.9} />
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-white/10 px-3 py-1.5">{active.length} active plan{active.length === 1 ? '' : 's'}</span>
            {overdue.length > 0 && <span className="rounded-full bg-rose-400/15 px-3 py-1.5 text-rose-200">{overdue.length} past-due payment{overdue.length === 1 ? '' : 's'}</span>}
          </div>
          <div className="mt-7 flex items-center justify-between gap-4 border-t border-white/15 pt-4">
            <div>
              <p className="text-xs text-slate-300">Available spending power</p>
              <p className="tabular mt-1 text-xl font-semibold">{money(available)}</p>
            </div>
            <div className="w-32 text-right">
              <p className="text-xs text-slate-300">{money(profile.spendingPower, true)} limit</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-indigo-300" style={{ width: `${Math.min(100, available / Math.max(1, profile.spendingPower) * 100)}%` }} />
              </div>
            </div>
          </div>
        </section>
        <Card className="grid grid-cols-2 divide-x divide-line">
          <Metric label="Due in next 30 days">
            <CalendarDays className="mb-5 size-5 text-muted" aria-hidden="true" />
            <p className="tabular text-2xl font-semibold tracking-tight sm:text-3xl"><AnimatedNumber value={totals.due30} duration={0.9} /></p>
            <p className="mt-2 text-xs text-muted">{totals.due30Count} scheduled payment{totals.due30Count === 1 ? '' : 's'}</p>
            {overdue.length > 0 && <p className="mt-2 text-xs text-rose-500">Includes past-due payments</p>}
          </Metric>
          <Metric label="Paid to date">
            <Layers className="mb-5 size-5 text-muted" aria-hidden="true" />
            <p className="tabular text-2xl font-semibold tracking-tight sm:text-3xl"><AnimatedNumber value={totals.paid} duration={0.9} /></p>
            <p className="mt-2 text-xs text-muted">{paidOff.length} plan{paidOff.length === 1 ? '' : 's'} paid off</p>
          </Metric>
          <div className="col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2/40 px-5 py-4">
            <div>
              <p className="text-sm font-medium">Automatic payments</p>
              <p className="mt-1 text-xs text-muted">{active.length ? `Enabled for ${autoPayCount} of ${active.length} active plans` : 'Manage payment methods in your wallet'}</p>
            </div>
            <Link to={active.length ? '/plans' : '/wallet'} className="inline-flex items-center gap-1 text-sm font-medium text-iris-500 hover:underline">Manage <ArrowRight className="size-4" /></Link>
          </div>
        </Card>
      </motion.div>

      {plans.length === 0 ? (
        <Card data-tour="home-empty">
          <Empty
            icon={<Layers />}
            title="No active plans"
            body={`You have ${money(profile.spendingPower, true)} in spending power. When you check out with Kova, your payment plans show up here.`}
            action={
              methods.length === 0 ? (
                <Button onClick={() => nav('/wallet')}>
                  <CreditCard className="size-4" /> Add a payment method
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {methods.length === 0 && (
            <motion.div {...fade(0)}>
              <Card className="flex flex-wrap items-center gap-4 border-amber-400/30 bg-amber-400/5 px-5 py-4">
                <span className="grid size-10 place-items-center rounded-xl bg-amber-400/15 text-amber-500 dark:text-amber-300">
                  <CreditCard className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Add a payment method</p>
                  <p className="text-sm text-muted">Link a bank or card so you can make payments and use AutoPay.</p>
                </div>
                <Button size="sm" onClick={() => nav('/wallet')}>
                  Add method
                </Button>
              </Card>
            </motion.div>
          )}
          {next && (
            <motion.div {...fade(2)} data-tour="next-payment">
              <Card className={cn("flex flex-wrap items-center gap-4 border-l-4 px-5 py-5", next.due.overdue ? "border-l-rose-500" : "border-l-iris-500")}>
                <PlanThumb plan={next.plan} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted">{next.due.overdue ? 'Past due' : 'Next payment'}</p>
                  <p className="truncate font-medium">{next.plan.name}</p>
                  <p className={cn('text-sm', next.due.overdue ? 'text-rose-500' : 'text-muted')}>
                    Due {fmtShort(next.due.dueDate)}
                    {next.plan.autopay ? ' · AutoPay on' : ''}
                  </p>
                </div>
                <div className="flex w-full items-center justify-between gap-4 border-t border-line pt-3 sm:w-auto sm:border-0 sm:pt-0">
                  <span className="tabular text-lg font-semibold">{money(next.due.amount)}</span>
                  {next.processing ? (
                    <Badge tone="pending" pulse>
                      Processing
                    </Badge>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => nav(`/plans/${next.plan.id}`, { state: { pay: 'next' } })}>
                      Pay now
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-6">
              <motion.div {...fade(3)}>
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                    <div><h2 className="font-semibold">Your financing</h2><p className="mt-1 hidden text-xs text-muted sm:block">Balances and repayment progress</p></div>
                    <Segmented
                      value={tab}
                      onChange={setTab}
                      className="w-52 p-0.5 [&_button]:py-1 [&_button]:text-xs"
                      options={[
                        { value: 'active', label: `Active · ${active.length}` },
                        { value: 'paid', label: `Paid off · ${paidOff.length}` },
                      ]}
                    />
                  </div>
                  <PlansTable rows={tab === 'active' ? active : paidOff} />
                  <Link to="/plans" className="flex items-center justify-center gap-1.5 border-t border-line py-3 text-sm font-medium text-muted transition hover:text-ink">
                    View all plans <ArrowRight className="size-4" />
                  </Link>
                </Card>
              </motion.div>

              <motion.div {...fade(4)}>
                <ScheduleChart items={upcoming} now={now} />
              </motion.div>
            </div>

            <div className="min-w-0 space-y-6">
              <motion.div {...fade(5)}>
                <Card>
                  <div className="border-b border-line px-5 py-3.5">
                    <h2 className="font-semibold">Payment calendar</h2><p className="mt-1 text-xs text-muted">Next installment for each plan</p>
                  </div>
                  {nextUp.length ? (
                    <ul className="divide-y divide-line">
                      {nextUp.slice(0, 5).map(({ plan, due, processing }) => (
                        <li key={plan.id}>
                          <Link to={`/plans/${plan.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-surface-2">
                            <PlanThumb plan={plan} size={32} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{plan.name}</p>
                              <p className={cn('text-xs', due.overdue ? 'text-rose-500' : 'text-muted')}>
                                {due.overdue ? 'Past due' : relativeDay(due.dueDate, now)}
                                {processing ? ' · Last payment still processing' : plan.autopay ? ' · AutoPay' : ''}
                              </p>
                            </div>
                            <span className="tabular text-sm font-medium">{money(due.amount)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-5 py-6 text-sm text-muted">No upcoming payments.</p>
                  )}
                </Card>
              </motion.div>

              <motion.div {...fade(6)}>
                <Card>
                  <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                    <h2 className="font-semibold">Recent activity</h2>
                    <Link to="/activity" className="text-sm font-medium text-iris-500 hover:text-iris-400">
                      View all
                    </Link>
                  </div>
                  {txns.length ? (
                    <div className="px-2 py-1.5">
                      {txns.slice(0, 5).map((t) => (
                        <TxnRow key={t.id} txn={t} now={now} onClick={() => setOpenTxn(t)} />
                      ))}
                    </div>
                  ) : (
                    <p className="px-5 py-6 text-sm text-muted">Your payments will show up here.</p>
                  )}
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      )}
      <TxnSheet txn={openTxn} onClose={() => setOpenTxn(null)} />
    </div>
  );
}

function Metric({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 p-5 sm:p-6', className)}>
      <p className="mb-2 text-[13px] font-medium text-muted">{label}</p>
      {children}
    </div>
  );
}

function PlansTable({ rows }: { rows: { plan: Plan; s: PlanStats }[] }) {
  if (!rows.length) return <p className="px-5 py-8 text-center text-sm text-muted">Nothing here yet.</p>;
  return (
    <div>
      <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)] gap-4 px-5 pt-3 pb-2 text-xs font-medium text-faint md:grid">
        <span>Financing plan</span>
        <span>Progress</span>
        <span>Next payment</span>
        <span className="text-right">Balance</span>
      </div>
      <ul className="divide-y divide-line">
        {rows.map(({ plan, s }) => {
          const paid = plan.status === 'paid';
          return (
            <li key={plan.id}>
              <Link
                to={`/plans/${plan.id}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 px-5 py-3.5 transition hover:bg-surface-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <PlanThumb plan={plan} size={40} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{plan.name}</p>
                    <p className="truncate text-xs text-muted">{plan.merchant} · {plan.apr === 0 ? '0% APR' : `${plan.apr}% APR`}</p>
                  </div>
                </div>
                <div className="col-span-2 row-start-2 md:col-span-1 md:row-start-auto">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div className={cn('h-full rounded-full', paid ? 'bg-mint-500' : 'bg-iris-500')} style={{ width: `${Math.max(2, s.progress * 100)}%` }} />
                    </div>
                    <span className="tabular w-10 text-right text-xs text-muted">{Math.round(s.progress * 100)}%</span>
                  </div>
                  <p className="mt-1 text-xs text-faint">
                    {s.installmentsPaid} of {s.schedule.length} payments
                  </p>
                </div>
                <div className="hidden text-sm md:block">
                  {paid ? (
                    <Badge tone="success">Paid off</Badge>
                  ) : s.nextDue ? (
                    <>
                      <p className={cn('tabular font-medium', s.nextDue.overdue && 'text-rose-500')}>{money(s.nextDue.amount)}</p>
                      <p className="text-xs text-muted">{s.nextDue.overdue ? 'Past due' : fmtShort(s.nextDue.dueDate)}</p>
                    </>
                  ) : (
                    '—'
                  )}
                </div>
                <div className="col-start-2 row-start-1 text-right md:col-start-auto md:row-start-auto">
                  <p className="tabular text-sm font-semibold">{money(paid ? s.paid : s.remaining)}</p>
                  <p className="text-xs text-muted">{paid ? 'paid' : 'remaining'}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Scheduled payments by month — single series, so no legend; hover for the value. */
function ScheduleChart({ items, now }: { items: { plan: Plan; inst: { dueDate: number; amount: number } }[]; now: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const months = useMemo(() => {
    const d = new Date(now);
    return Array.from({ length: 6 }, (_, i) => {
      const startM = new Date(d.getFullYear(), d.getMonth() + i, 1).getTime();
      const endM = new Date(d.getFullYear(), d.getMonth() + i + 1, 1).getTime();
      const inMonth = items.filter((x) => x.inst.dueDate >= startM && x.inst.dueDate < endM);
      return {
        label: new Date(startM).toLocaleDateString('en-US', { month: 'short' }),
        full: new Date(startM).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        total: inMonth.reduce((s, x) => s + x.inst.amount, 0),
        count: inMonth.length,
      };
    });
  }, [items, now]);
  const max = Math.max(1, ...months.map((m) => m.total));
  const sixTotal = months.reduce((s, m) => s + m.total, 0);

  return (
    <Card className="p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">Scheduled payments</h2>
          <p className="text-sm text-muted">Next 6 months</p>
        </div>
        <div className="text-right">
          <p className="tabular text-lg font-semibold">{money(sixTotal)}</p>
          <p className="text-xs text-muted">total scheduled</p>
        </div>
      </div>
      <div className="flex h-40 items-end gap-3 border-b border-line bg-[linear-gradient(to_top,var(--line)_1px,transparent_1px)] bg-[size:100%_25%] sm:gap-5" role="list" aria-label="Scheduled payments by month">
        {months.map((m, i) => (
          <div
            key={m.label + i}
            role="listitem"
            aria-label={`${m.full}: ${money(m.total)}`}
            className="relative flex h-full flex-1 cursor-default items-end"
            tabIndex={0}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={() => setHover((h) => (h === i ? null : i))}
          >
            <motion.div
              className={cn('mx-auto w-full max-w-11 rounded-t-[4px] transition-colors', hover === null || hover === i ? 'bg-iris-500' : 'bg-iris-500/35')}
              initial={{ height: 0 }}
              animate={{ height: `${m.total > 0 ? Math.max(3, (m.total / max) * 100) : 0}%` }}
              transition={{ duration: 0.7, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            />
            {hover === i && (
              <div
                className={cn(
                  'pointer-events-none absolute bottom-full z-10 mb-2 rounded-lg border border-line bg-surface px-3 py-2 text-left whitespace-nowrap shadow-lg',
                  i === 0 ? 'left-0' : i === months.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2',
                )}
              >
                <p className="text-xs text-muted">{m.full}</p>
                <p className="tabular text-sm font-semibold">{money(m.total)}</p>
                <p className="text-xs text-muted">
                  {m.count} payment{m.count === 1 ? '' : 's'}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3 sm:gap-5">
        {months.map((m, i) => (
          <span key={i} className={cn('flex-1 text-center text-xs', i === 0 ? 'font-medium text-ink' : 'text-muted')}>
            {m.label}
          </span>
        ))}
      </div>
    </Card>
  );
}
