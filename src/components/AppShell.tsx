import { AnimatePresence, motion } from 'motion/react';
import { CreditCard, Home, Layers, ReceiptText, Settings } from 'lucide-react';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useOutlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { planStats, txnStatus } from '../lib/finance';
import { useData, useNow } from '../lib/store';
import { cn, initials, money } from '../lib/utils';
import { Logo } from './Logo';
import { NewPlanSheet } from './NewPlanSheet';
import { TourProvider } from './Tour';
import { useToast } from './Toast';

const NAV = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/plans', label: 'Plans', icon: Layers },
  { to: '/activity', label: 'Activity', icon: ReceiptText },
  { to: '/wallet', label: 'Wallet', icon: CreditCard },
  { to: '/settings', label: 'Account', icon: Settings },
];

const UICtx = createContext<{ openNewPlan: () => void }>({ openNewPlan: () => {} });
export const useUI = () => useContext(UICtx);

export function Avatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-full bg-iris-600 font-semibold text-white', className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

/** Fires toasts as pending payments post and banks finish verifying. */
function SettleWatcher() {
  const { txns, methods } = useData();
  const toast = useToast();
  const now = useNow(2000);
  const seen = useRef<Map<string, string> | null>(null);

  useEffect(() => {
    const cur = new Map<string, string>();
    txns.forEach((t) => cur.set(t.id, txnStatus(t, now)));
    methods.forEach((m) => m.verifiesAt && cur.set(m.id, now < m.verifiesAt ? 'pending' : 'completed'));
    if (seen.current) {
      for (const t of txns) {
        if (seen.current.get(t.id) === 'pending' && cur.get(t.id) === 'completed' && t.type !== 'purchase') {
          toast({ tone: 'success', title: `${money(t.amount)} payment posted`, body: t.description });
        }
      }
      for (const m of methods) {
        if (seen.current.get(m.id) === 'pending' && cur.get(m.id) === 'completed') {
          toast({ tone: 'success', title: `${m.institution} ••${m.last4} verified`, body: 'Your account is ready for payments.' });
        }
      }
    }
    seen.current = cur;
  }, [now, txns, methods, toast]);
  return null;
}

function Sidebar() {
  const { user } = useAuth();
  const { plans, txns, profile } = useData();
  const owed = plans.reduce((s, p) => s + planStats(p, txns).remaining, 0);
  const available = Math.max(0, profile.spendingPower - owed);
  return (
    <aside className="sticky top-0 hidden h-dvh w-[268px] shrink-0 flex-col border-r border-line bg-surface/60 px-4 py-6 backdrop-blur-xl lg:flex">
      <Logo size={32} className="px-3" />
      <nav className="mt-8 flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className="relative" data-tour={`nav-${label.toLowerCase()}`}>
            {({ isActive }) => (
              <span className={cn('relative flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors', isActive ? 'text-ink' : 'text-muted hover:text-ink')}>
                {isActive && <motion.span layoutId="side-active" className="absolute inset-0 rounded-xl bg-surface-2" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <Icon className={cn('relative size-5', isActive && 'text-iris-500')} />
                <span className="relative">{label}</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto space-y-3">
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs font-medium text-muted">Spending power</p>
          <p className="tabular mt-1 font-display text-xl font-bold">{money(available, true)}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-iris-500" style={{ width: `${Math.min(100, (available / Math.max(1, profile.spendingPower)) * 100)}%` }} />
          </div>
        </div>
        <NavLink to="/settings" className="flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-surface-2">
          <Avatar name={profile.displayName || user?.displayName || ''} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{profile.displayName || user?.displayName}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
        </NavLink>
      </div>
    </aside>
  );
}

function MobileTabs() {
  // Settings lives behind the avatar in the top bar.
  const items = NAV.slice(0, 4);
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/85 backdrop-blur-2xl lg:hidden">
      <div className="mx-auto flex h-[68px] max-w-lg items-center justify-around px-2">
        {items.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className="flex-1" data-tour={`nav-${n.label.toLowerCase()}`}>
              {({ isActive }) => (
                <span className={cn('relative flex flex-col items-center gap-1 py-1 text-[11px] font-semibold transition-colors', isActive ? 'text-ink' : 'text-faint')}>
                  <motion.span animate={{ y: isActive ? -1 : 0, scale: isActive ? 1.08 : 1 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
                    <n.icon className={cn('size-[22px]', isActive && 'text-iris-500')} strokeWidth={isActive ? 2.4 : 2} />
                  </motion.span>
                  {n.label}
                  {isActive && <motion.span layoutId="tab-dot" className="absolute -top-2 h-1 w-6 rounded-full bg-iris-500" />}
                </span>
              )}
            </NavLink>
        ))}
      </div>
    </nav>
  );
}

function MobileTop() {
  const { user } = useAuth();
  const { profile } = useData();
  return (
    <header className="pt-safe sticky top-0 z-30 border-b border-transparent bg-bg/80 backdrop-blur-xl lg:hidden">
      <div className="flex h-14 items-center justify-between px-5">
        <Logo size={26} />
        <NavLink to="/settings" aria-label="Settings" data-tour="nav-account">
          <Avatar name={profile.displayName || user?.displayName || ''} size={34} />
        </NavLink>
      </div>
    </header>
  );
}

export function AppShell() {
  const [newOpen, setNewOpen] = useState(false);
  const loc = useLocation();
  const outlet = useOutlet();
  const openNewPlan = () => setNewOpen(true);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [loc.pathname]);

  return (
    <UICtx.Provider value={{ openNewPlan }}>
      <TourProvider onAddPlan={openNewPlan}>
      <div className="flex min-h-dvh">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <MobileTop />
          <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-32 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={loc.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                {outlet}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <MobileTabs />
      </div>
      <NewPlanSheet open={newOpen} onClose={() => setNewOpen(false)} />
      <SettleWatcher />
      </TourProvider>
    </UICtx.Provider>
  );
}

export function PageHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 lg:mb-8">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
