import { AnimatePresence, motion } from 'motion/react';
import { Layers, Search } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '../components/AppShell';
import { PlanCard } from '../components/PlanCard';
import { Card, Empty, Segmented } from '../components/ui';
import { planStats } from '../lib/finance';
import { useData } from '../lib/store';
import { money } from '../lib/utils';

type Filter = 'active' | 'paid' | 'all';

export function Plans() {
  const { plans, txns } = useData();
  const [filter, setFilter] = useState<Filter>('active');
  const [q, setQ] = useState('');

  const shown = plans.filter(
    (p) =>
      (filter === 'all' || p.status === filter) &&
      (!q || `${p.name} ${p.merchant}`.toLowerCase().includes(q.toLowerCase())),
  );
  const stats = plans.map((p) => planStats(p, txns));
  const owed = stats.reduce((s, x) => s + x.remaining, 0);
  const paid = stats.reduce((s, x) => s + x.paid, 0);

  return (
    <div>
      <PageHeader
        title="Plans"
        subtitle={`${money(owed)} remaining · ${money(paid)} paid to date`}
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Segmented
          value={filter}
          onChange={setFilter}
          className="sm:w-80"
          options={[
            { value: 'active', label: `Active (${plans.filter((p) => p.status === 'active').length})` },
            { value: 'paid', label: 'Paid off' },
            { value: 'all', label: 'All' },
          ]}
        />
        <div className="flex h-11 shrink-0 items-center sm:flex-1 gap-2 rounded-2xl border border-line bg-surface px-3.5 focus-within:border-iris-500 sm:max-w-xs sm:ml-auto">
          <Search className="size-4 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search plans" className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-faint" />
        </div>
      </div>
      <AnimatePresence mode="popLayout">
        {shown.length ? (
          <motion.div key={filter} data-tour="plans-grid" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((p, i) => (
              <PlanCard key={p.id} plan={p} txns={txns} index={i} />
            ))}
          </motion.div>
        ) : (
          <Card key="empty" data-tour="plans-grid">
            <Empty
              icon={<Layers />}
              title={q ? 'No matches' : filter === 'paid' ? 'Nothing paid off yet' : 'No active plans'}
              body={q ? 'Try a different search.' : filter === 'paid' ? 'When you finish a plan, it’ll live here forever.' : 'Plans you start at checkout with Kova will show up here.'}
            />
          </Card>
        )}
      </AnimatePresence>
    </div>
  );
}
