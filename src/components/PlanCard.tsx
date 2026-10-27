import { motion } from 'motion/react';
import { ChevronRight, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { planStats } from '../lib/finance';
import type { Plan, Txn } from '../lib/types';
import { cn, fmtShort, money, relativeDay } from '../lib/utils';
import { PlanThumb } from './PlanThumb';
import { Badge, ProgressBar } from './ui';

export function PlanCard({ plan, txns, index = 0 }: { plan: Plan; txns: Txn[]; index?: number }) {
  const s = planStats(plan, txns);
  const paid = plan.status === 'paid';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
    >
      <Link
        to={`/plans/${plan.id}`}
        className="group block rounded-2xl border border-line bg-surface p-5 transition-shadow hover:border-faint/40"
      >
        <div className="flex items-start gap-4">
          <PlanThumb plan={plan} size={52} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{plan.name}</p>
            <p className="truncate text-sm text-muted">{plan.merchant}</p>
          </div>
          {paid ? (
            <Badge tone="success">
              <Trophy className="size-3" /> Paid off
            </Badge>
          ) : s.nextDue?.overdue ? (
            <Badge tone="danger">Past due</Badge>
          ) : s.pending > 0 ? (
            <Badge tone="pending" pulse>
              Processing
            </Badge>
          ) : (
            <ChevronRight className="size-5 text-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
          )}
        </div>
        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold text-muted">{paid ? 'Total paid' : 'Remaining'}</p>
            <p className="tabular font-display text-2xl font-bold">{money(paid ? s.paid : s.remaining)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-muted">{paid ? 'Paid off' : 'Next payment'}</p>
            <p className={cn('tabular text-sm font-semibold', s.nextDue?.overdue && 'text-rose-500')}>
              {paid ? fmtShort(plan.paidOffAt ?? Date.now()) : s.nextDue ? `${money(s.nextDue.amount)} · ${relativeDay(s.nextDue.dueDate)}` : '—'}
            </p>
          </div>
        </div>
        <ProgressBar value={s.progress} className="mt-4" />
        <p className="mt-2 text-xs text-muted">
          {s.installmentsPaid} of {s.schedule.length} payments · {Math.round(s.progress * 100)}%
        </p>
      </Link>
    </motion.div>
  );
}
