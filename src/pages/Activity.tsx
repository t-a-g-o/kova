import { motion } from 'motion/react';
import { Clock, ReceiptText, Search, TrendingDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '../components/AppShell';
import { TxnRow, TxnSheet } from '../components/Txn';
import { AnimatedNumber, Card, Empty } from '../components/ui';
import { txnStatus } from '../lib/finance';
import { useData, useNow } from '../lib/store';
import type { Txn } from '../lib/types';
import { cn, relativeDay, startOfDay } from '../lib/utils';

type Filter = 'all' | 'pending' | 'payments' | 'purchases';
const FILTERS: { v: Filter; l: string }[] = [
  { v: 'all', l: 'All' },
  { v: 'pending', l: 'Pending' },
  { v: 'payments', l: 'Payments' },
  { v: 'purchases', l: 'Purchases' },
];

export function Activity() {
  const { txns, plans } = useData();
  const now = useNow(1000);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Txn | null>(null);

  const filtered = useMemo(
    () =>
      txns.filter((t) => {
        if (filter === 'pending' && txnStatus(t, now) !== 'pending') return false;
        if (filter === 'payments' && t.type === 'purchase') return false;
        if (filter === 'purchases' && t.type !== 'purchase') return false;
        if (q) {
          const plan = plans.find((p) => p.id === t.planId);
          const hay = `${t.description} ${plan?.name ?? ''} ${plan?.merchant ?? ''} ${t.confirmation}`.toLowerCase();
          if (!hay.includes(q.toLowerCase())) return false;
        }
        return true;
      }),
    [txns, plans, filter, q, now],
  );

  const groups = useMemo(() => {
    const m = new Map<number, Txn[]>();
    filtered.forEach((t) => {
      const d = startOfDay(t.createdAt);
      if (!m.has(d)) m.set(d, []);
      m.get(d)!.push(t);
    });
    return [...m.entries()];
  }, [filtered]);

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const paidThisMonth = txns.filter((t) => t.type !== 'purchase' && t.createdAt >= monthStart).reduce((s, t) => s + t.amount, 0);
  const pending = txns.filter((t) => txnStatus(t, now) === 'pending' && t.type !== 'purchase');
  const pendingAmt = pending.reduce((s, t) => s + t.amount, 0);

  return (
    <div>
      <PageHeader title="Activity" subtitle="Every payment, purchase and payoff." />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:max-w-lg">
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <TrendingDown className="size-3.5 text-mint-500" /> Paid this month
          </p>
          <p className="mt-1 font-display text-xl font-bold">
            <AnimatedNumber value={paidThisMonth} />
          </p>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Clock className="size-3.5 text-amber-400" /> Pending
          </p>
          <p className="mt-1 font-display text-xl font-bold">
            <AnimatedNumber value={pendingAmt} />
          </p>
          <p className="text-xs text-faint">{pending.length} payment{pending.length === 1 ? '' : 's'}</p>
        </Card>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {FILTERS.map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={cn('relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors', filter === f.v ? 'text-white' : 'text-muted hover:text-ink')}
            >
              {filter === f.v && <motion.span layoutId="act-filter" className="absolute inset-0 rounded-full bg-iris-500" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
              <span className="relative">
                {f.l}
                {f.v === 'pending' && pending.length > 0 && ` · ${pending.length}`}
              </span>
            </button>
          ))}
        </div>
        <div className="flex h-11 shrink-0 items-center sm:flex-1 gap-2 rounded-2xl border border-line bg-surface px-3.5 focus-within:border-iris-500 sm:ml-auto sm:max-w-xs">
          <Search className="size-4 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search activity" className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-faint" />
        </div>
      </div>

      <Card className="p-2 sm:p-4" data-tour="activity-list">
        {groups.length ? (
          groups.map(([day, list]) => (
            <div key={day} className="mb-2 last:mb-0">
              <p className="sticky top-14 z-10 bg-surface px-2 pt-3 pb-1 text-xs font-bold tracking-wide text-faint uppercase sm:px-3 lg:top-0">{relativeDay(day, now)}</p>
              {list.map((t) => (
                <TxnRow key={t.id} txn={t} now={now} onClick={() => setOpen(t)} />
              ))}
            </div>
          ))
        ) : (
          <Empty icon={<ReceiptText />} title="No activity" body={filter === 'pending' ? 'Nothing pending right now.' : 'Transactions will show up here.'} />
        )}
      </Card>
      <TxnSheet txn={open} onClose={() => setOpen(null)} />
    </div>
  );
}
