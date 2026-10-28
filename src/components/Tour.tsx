import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  CreditCard,
  FlaskConical,
  Gem,
  Home,
  Layers,
  Pencil,
  ReceiptText,
  Sparkles,
  SplitSquareHorizontal,
  Trophy,
  Wallet,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMediaQuery } from '../lib/hooks';
import { useData } from '../lib/store';
import type { Plan, Profile } from '../lib/types';
import { DAY, cn } from '../lib/utils';
import { confettiBurst } from './Celebration';
import { LogoMark } from './Logo';
import { Button, Toggle } from './ui';

/** Brand-new accounts get the tour once; older accounts and anyone who finished or skipped it don't. */
export const needsTour = (p: Profile) => !p.touredAt && Date.now() - p.memberSince < DAY;

type Ctx = { plan?: Plan; editing: boolean; setEditing: (v: boolean) => void };

interface Step {
  id: string;
  icon: LucideIcon;
  title: string;
  body: string | ((c: Ctx) => string);
  route?: (c: Ctx) => string;
  /** data-tour ids to spotlight, first visible one wins. None means a centered card. */
  target?: string[];
  needsPlan?: boolean;
  /** Keeps the Demo controls sheet open on the Account page. */
  demo?: boolean;
  /** Lets the user click the spotlighted element. */
  interactive?: boolean;
  /** Auto-advances once this turns true. */
  done?: (c: Ctx) => boolean;
  extra?: (c: Ctx) => ReactNode;
}

const planRoute = (c: Ctx) => (c.plan ? `/plans/${c.plan.id}` : '/plans');

const STEPS: Step[] = [
  {
    id: 'overview',
    icon: Home,
    route: () => '/',
    target: ['summary', 'home-empty'],
    title: 'Your money, at a glance',
    body: 'Total balance, what’s due in the next 30 days, what you’ve paid, and how much spending power you have left. It all updates live as you pay.',
  },
  {
    id: 'next',
    icon: Clock,
    route: () => '/',
    target: ['next-payment'],
    needsPlan: true,
    title: 'What’s due next',
    body: 'Your next installment always sits up top. Tap Pay now and it’s handled.',
  },
  {
    id: 'nav',
    icon: Layers,
    route: () => '/',
    target: ['nav-plans'],
    title: 'Every purchase is a plan',
    body: 'Head to Plans to see everything you’re paying off, plus the trophies you’ve already cleared.',
  },
  {
    id: 'plans',
    icon: Gem,
    route: () => '/plans',
    target: ['plans-grid'],
    title: 'Your collection',
    body: 'Each card is one purchase, with its progress ring and next due date. Tap any card to open it.',
  },
  {
    id: 'pay',
    icon: Zap,
    route: planRoute,
    target: ['plan-pay', 'plan-hero'],
    needsPlan: true,
    title: 'Pay it your way',
    body: (c) => `This is ${c.plan?.name ?? 'a plan'}. Pay the next installment, pick a custom amount, or hold to pay it all off at once. There’s confetti for that last one.`,
  },
  {
    id: 'schedule',
    icon: SplitSquareHorizontal,
    route: planRoute,
    target: ['plan-schedule'],
    needsPlan: true,
    title: 'The whole timeline',
    body: 'Every installment, past and future. Paid ones get checked off, and the next one is highlighted.',
  },
  {
    id: 'autopay',
    icon: Sparkles,
    route: planRoute,
    target: ['plan-autopay', 'plan-details'],
    needsPlan: true,
    title: 'Set it and forget it',
    body: 'Turn on AutoPay and Kova pays each installment on its due date from the account you pick.',
  },
  {
    id: 'activity',
    icon: ReceiptText,
    route: () => '/activity',
    target: ['activity-list'],
    title: 'Receipts for everything',
    body: 'Every payment shows up here. New ones stay pending for a bit, then post, just like a real bank. Tap one for its receipt.',
  },
  {
    id: 'wallet',
    icon: Wallet,
    route: () => '/wallet',
    target: ['wallet-banks'],
    title: 'Where payments come from',
    body: 'Link a bank or add a card. Kova only ever asks for the last 4 digits, never a full number.',
  },
  {
    id: 'demo-link',
    icon: FlaskConical,
    route: () => '/settings',
    target: ['demo-link'],
    title: 'Behind the curtain',
    body: 'Down at the bottom of Account is the best part: Demo controls. This is where you build your larp.',
  },
  {
    id: 'demo-add',
    icon: Gem,
    route: () => '/settings',
    target: ['demo-add'],
    demo: true,
    title: 'Add anything you want',
    body: 'Add a plan for any purchase you can dream up: the watch, the bag, the car. You can even backdate it so it looks like you’ve been paying for months. Sample data fills things in instantly.',
  },
  {
    id: 'demo-edit',
    icon: Pencil,
    route: () => '/settings',
    target: ['demo-edit'],
    demo: true,
    interactive: true,
    done: (c) => c.editing,
    title: 'Edit your larp',
    body: (c) =>
      c.editing
        ? 'Editing is on. Every plan now has Edit, Photo and Delete buttons.'
        : 'Flip this switch to unlock editing. Then you can change any plan’s price, APR, dates or merchant, add a photo, or delete it.',
    extra: (c) =>
      !c.editing && (
        <label className="mt-3 flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm font-semibold transition hover:border-iris-400">
          <span className="flex items-center gap-2">
            <Pencil className="size-4 text-iris-500" /> Turn it on for me
          </span>
          <Toggle checked={false} onChange={() => c.setEditing(true)} label="Allow editing plans" />
        </label>
      ),
  },
  {
    id: 'demo-tune',
    icon: Clock,
    route: () => '/settings',
    target: ['demo-tuning'],
    demo: true,
    title: 'Tune the simulation',
    body: 'Choose how long payments stay pending, from instant to three days, and set your own spending power limit.',
  },
  {
    id: 'edit-plan',
    icon: Pencil,
    route: planRoute,
    target: ['plan-details'],
    needsPlan: true,
    title: 'Make it yours',
    body: (c) =>
      c.editing
        ? 'Look: an Edit button. Change the price, APR, term or purchase date, and the schedule rebuilds itself. Tap the photo badge on the thumbnail to add your own picture.'
        : 'Once editing is on in Demo controls, an Edit button shows up here. Change the price, APR, term or date, and the schedule rebuilds itself.',
  },
];

interface TourCtx {
  start: () => void;
  /** True while a tour step needs the Demo controls sheet open. */
  demoOpen: boolean;
}

const TourContext = createContext<TourCtx>({ start: () => {}, demoOpen: false });
export const useTour = () => useContext(TourContext);

type Phase = 'off' | 'intro' | 'loading' | 'steps' | 'outro';

export function TourProvider({ children, onAddPlan }: { children: ReactNode; onAddPlan: () => void }) {
  const { ready, profile, plans, updateProfile, loadSample } = useData();
  const nav = useNavigate();
  const loc = useLocation();
  const [phase, setPhase] = useState<Phase>('off');
  const [index, setIndex] = useState(0);
  const autoStarted = useRef(false);

  const plan = plans.find((p) => p.status === 'active') ?? plans[0];
  const ctx: Ctx = useMemo(
    () => ({ plan, editing: !!profile.demoEditing, setEditing: (v) => void updateProfile({ demoEditing: v }) }),
    [plan, profile.demoEditing, updateProfile],
  );
  const steps = useMemo(() => STEPS.filter((s) => !s.needsPlan || plan), [plan]);
  const step = phase === 'steps' ? steps[Math.min(index, steps.length - 1)] : undefined;

  useEffect(() => {
    if (ready && !autoStarted.current && needsTour(profile)) {
      autoStarted.current = true;
      setPhase('intro');
    }
  }, [ready, profile]);

  // Sample data arrives through the live subscription, so wait for it before touring.
  useEffect(() => {
    if (phase !== 'loading') return;
    if (plans.length) return setPhase('steps');
    const t = setTimeout(() => setPhase('steps'), 4000);
    return () => clearTimeout(t);
  }, [phase, plans.length]);

  const route = step?.route?.(ctx);
  useEffect(() => {
    if (route && loc.pathname !== route) nav(route);
  }, [route, loc.pathname, nav]);

  const finish = useCallback(() => {
    setPhase('off');
    void updateProfile({ touredAt: Date.now() });
  }, [updateProfile]);

  const start = useCallback(() => {
    setIndex(0);
    setPhase('intro');
  }, []);

  const begin = async (sample: boolean) => {
    setIndex(0);
    if (sample) {
      setPhase('loading');
      await loadSample();
    } else setPhase('steps');
  };

  const next = () => (index >= steps.length - 1 ? setPhase('outro') : setIndex(index + 1));
  const back = () => setIndex(Math.max(0, index - 1));

  return (
    <TourContext.Provider value={{ start, demoOpen: !!step?.demo }}>
      {children}
      {createPortal(
        <AnimatePresence>
          {(phase === 'intro' || phase === 'loading') && (
            <Intro key="intro" name={profile.displayName} empty={!plans.length} loading={phase === 'loading'} onStart={begin} onSkip={finish} />
          )}
          {step && <Spotlight key="spot" step={step} index={index} total={steps.length} ctx={ctx} onNext={next} onBack={back} onSkip={finish} />}
          {phase === 'outro' && (
            <Outro
              key="outro"
              name={profile.displayName}
              onAddPlan={() => {
                finish();
                setTimeout(onAddPlan, 300);
              }}
              onDone={() => {
                finish();
                nav('/');
              }}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </TourContext.Provider>
  );
}

/* ---------- Intro & outro: full-screen scenes ---------- */

function Scene({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="noise fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-[#0a0816] text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 size-[420px] animate-float rounded-full bg-iris-500/40 blur-[100px]" />
        <div className="absolute top-1/3 -right-32 size-[380px] animate-float rounded-full bg-mint-400/25 blur-[110px] [animation-delay:-3s]" />
        <div className="absolute -bottom-40 left-1/4 size-[420px] animate-float rounded-full bg-fuchsia-500/20 blur-[120px] [animation-delay:-6s]" />
      </div>
      <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </motion.div>
  );
}

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
});

const PITCH = [
  { icon: Gem, title: 'Pick anything', body: 'The watch, the bag, the car. If you want it, it can be a plan.' },
  { icon: SplitSquareHorizontal, title: 'Split it up', body: 'Pay in 4 every two weeks, or monthly for up to 4 years.' },
  { icon: Trophy, title: 'Pay it off', body: 'Make payments, set AutoPay, and celebrate when it’s yours.' },
];

function Intro({ name, empty, loading, onStart, onSkip }: { name: string; empty: boolean; loading: boolean; onStart: (sample: boolean) => void; onSkip: () => void }) {
  const [sample, setSample] = useState(true);
  const first = name.split(' ')[0];
  return (
    <Scene>
      <motion.div {...rise(0)} className="mb-7 w-fit rounded-[26px] shadow-[0_16px_50px_-10px_rgba(109,91,255,0.75)]">
        <LogoMark size={76} animated />
      </motion.div>
      <motion.p {...rise(0.15)} className="text-sm font-semibold tracking-wide text-mint-300 uppercase">
        You’re in
      </motion.p>
      <motion.h1 {...rise(0.25)} className="mt-2 font-display text-[34px] leading-[1.05] font-extrabold">
        {first ? `Hey ${first}, welcome to ` : 'Welcome to '}
        <span className="text-gradient">Kova.</span>
      </motion.h1>
      <motion.p {...rise(0.35)} className="mt-3 text-[15px] text-white/60">
        Kova is a playground for big purchases. Nothing here is real money, so go as big as you like.
      </motion.p>

      <div className="mt-7 space-y-3">
        {PITCH.map((p, i) => (
          <motion.div key={p.title} {...rise(0.5 + i * 0.12)} className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 backdrop-blur-xl">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-iris-500/25 text-iris-200">
              <p.icon className="size-[18px]" />
            </span>
            <div>
              <p className="text-sm font-semibold">{p.title}</p>
              <p className="text-[13px] text-white/55">{p.body}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {empty && (
        <motion.label {...rise(0.9)} className="mt-5 flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-mint-400/25 bg-mint-400/[0.07] px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Start me off with sample plans</p>
            <p className="text-[13px] text-white/55">So the tour has something to show. You can reset it anytime.</p>
          </div>
          <Toggle checked={sample} onChange={setSample} label="Add sample plans" />
        </motion.label>
      )}

      <motion.div {...rise(1)} className="mt-7 space-y-2">
        <Button variant="light" size="lg" block loading={loading} onClick={() => onStart(empty && sample)}>
          Show me around <ArrowRight className="size-4" />
        </Button>
        <button onClick={onSkip} disabled={loading} className="w-full py-2.5 text-sm font-semibold text-white/50 transition hover:text-white">
          Skip, I’ll explore on my own
        </button>
        <p className="text-center text-xs text-white/35">Takes about a minute. Replay it anytime from Account.</p>
      </motion.div>
    </Scene>
  );
}

const RECAP = [
  { icon: Layers, label: 'Plans', body: 'Your purchases' },
  { icon: Zap, label: 'Pay', body: 'Now, custom, or payoff' },
  { icon: CreditCard, label: 'Wallet', body: 'Banks & cards' },
  { icon: FlaskConical, label: 'Demo controls', body: 'Build & edit your larp' },
];

function Outro({ name, onAddPlan, onDone }: { name: string; onAddPlan: () => void; onDone: () => void }) {
  const first = name.split(' ')[0];
  useEffect(() => {
    const t = setTimeout(() => confettiBurst('big'), 250);
    return () => clearTimeout(t);
  }, []);
  return (
    <Scene>
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14 }}
        className="mx-auto mb-7 grid size-20 place-items-center rounded-[28px] bg-mint-400 text-[#04140e] shadow-[0_16px_50px_-10px_rgba(62,230,176,0.7)]"
      >
        <Check className="size-10" strokeWidth={3} />
      </motion.div>
      <motion.h1 {...rise(0.15)} className="text-center font-display text-[34px] leading-[1.05] font-extrabold">
        You’re all set{first ? `, ${first}` : ''}.
      </motion.h1>
      <motion.p {...rise(0.25)} className="mt-3 text-center text-[15px] text-white/60">
        Here’s your cheat sheet. Now go buy something ridiculous.
      </motion.p>
      <div className="mt-7 grid grid-cols-2 gap-3">
        {RECAP.map((r, i) => (
          <motion.div key={r.label} {...rise(0.35 + i * 0.08)} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl">
            <r.icon className="size-5 text-iris-300" />
            <p className="mt-3 text-sm font-semibold">{r.label}</p>
            <p className="text-xs text-white/50">{r.body}</p>
          </motion.div>
        ))}
      </div>
      <motion.div {...rise(0.75)} className="mt-8 space-y-2">
        <Button variant="light" size="lg" block onClick={onAddPlan}>
          Add my first plan
        </Button>
        <button onClick={onDone} className="w-full py-2.5 text-sm font-semibold text-white/50 transition hover:text-white">
          Take me to my dashboard
        </button>
      </motion.div>
    </Scene>
  );
}

/* ---------- Spotlight steps ---------- */

type Box = { x: number; y: number; w: number; h: number };
const PAD = 8;
const GAP = 14;
const EDGE = 16;

function findTarget(ids?: string[]) {
  for (const id of ids ?? []) {
    for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return el;
    }
  }
  return null;
}

const sameBox = (a: Box | null, b: Box | null) =>
  a === b || (!!a && !!b && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.w - b.w) < 0.5 && Math.abs(a.h - b.h) < 0.5);

/** Follows the step's target every frame, so page transitions, sheets and scrolling all stay in sync. */
function useTargetBox(step: Step) {
  const [box, setBox] = useState<Box | null>(null);
  const [vp, setVp] = useState({ w: innerWidth, h: innerHeight });
  const scrolled = useRef<string | null>(null);

  useEffect(() => {
    let raf = 0;
    let last: Box | null = null;
    const tick = () => {
      const el = findTarget(step.target);
      let b: Box | null = null;
      if (el) {
        const r = el.getBoundingClientRect();
        b = { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
        if (scrolled.current !== step.id) {
          scrolled.current = step.id;
          const fixed = getComputedStyle(el).position === 'fixed' || !!el.closest('nav.fixed');
          if (!fixed && (r.top < 90 || r.bottom > innerHeight * 0.55)) {
            el.style.scrollMarginTop = '96px';
            el.scrollIntoView({ block: 'start', behavior: 'smooth' });
          }
        }
      }
      if (!sameBox(b, last)) setBox((last = b));
      setVp((v) => (v.w === innerWidth && v.h === innerHeight ? v : { w: innerWidth, h: innerHeight }));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [step]);

  return { box, vp };
}

function placeCard(box: Box | null, card: { w: number; h: number }, vp: { w: number; h: number }, mobile: boolean) {
  const clampX = (x: number) => Math.min(Math.max(EDGE, x), vp.w - card.w - EDGE);
  const clampY = (y: number) => Math.min(Math.max(EDGE, y), vp.h - card.h - EDGE);
  if (!box) return { left: (vp.w - card.w) / 2, top: (vp.h - card.h) / 2 };
  if (mobile) {
    // Docked to whichever end of the screen the target isn't in.
    const dockTop = box.y + box.h > vp.h - card.h - EDGE * 2 && box.y > card.h + EDGE * 2;
    return { left: EDGE, top: dockTop ? Math.max(EDGE, Math.min(box.y - GAP - card.h, EDGE + 40)) : vp.h - card.h - EDGE - 8 };
  }
  const cx = clampX(box.x + box.w / 2 - card.w / 2);
  const below = { left: cx, top: box.y + box.h + GAP };
  const above = { left: cx, top: box.y - GAP - card.h };
  const right = { left: box.x + box.w + GAP, top: clampY(box.y) };
  const left = { left: box.x - GAP - card.w, top: clampY(box.y) };
  const fitsV = (p: { top: number }) => p.top >= EDGE && p.top + card.h <= vp.h - EDGE;
  const fitsH = (p: { left: number }) => p.left >= EDGE && p.left + card.w <= vp.w - EDGE;
  const order = box.h > vp.h * 0.45 ? [right, left, below, above] : [below, above, right, left];
  const hit = order.find((p) => fitsV(p) && fitsH(p));
  return hit ?? { left: vp.w - card.w - 24, top: vp.h - card.h - 24 };
}

function Spotlight({ step, index, total, ctx, onNext, onBack, onSkip }: { step: Step; index: number; total: number; ctx: Ctx; onNext: () => void; onBack: () => void; onSkip: () => void }) {
  const mobile = !useMediaQuery('(min-width: 640px)');
  const { box, vp } = useTargetBox(step);
  const cardRef = useRef<HTMLDivElement>(null);
  const [card, setCard] = useState({ w: 340, h: 220 });
  const isDone = !!step.done?.(ctx);
  const wasDone = useRef(isDone);
  const [cheer, setCheer] = useState(false);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCard({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Celebrate when the user does the thing, then move on by themselves.
  useEffect(() => {
    wasDone.current = !!step.done?.(ctx);
    setCheer(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id]);
  useEffect(() => {
    if (!step.done || wasDone.current || !isDone) return;
    wasDone.current = true;
    setCheer(true);
    confettiBurst('small');
    const t = setTimeout(onNext, 1400);
    return () => clearTimeout(t);
  }, [isDone, step, onNext]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onBack();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onNext, onBack]);

  const pos = placeCard(box, card, vp, mobile);
  const hole = box ?? { x: vp.w / 2, y: vp.h / 2, w: 0, h: 0 };
  const spring = { type: 'spring', stiffness: 260, damping: 32 } as const;
  const body = typeof step.body === 'function' ? step.body(ctx) : step.body;
  const last = index === total - 1;

  return (
    <motion.div className="fixed inset-0 z-[70]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden>
        <defs>
          <mask id="tour-hole">
            <rect width="100%" height="100%" fill="white" />
            <motion.rect rx={18} fill="black" initial={false} animate={{ x: hole.x, y: hole.y, width: hole.w, height: hole.h }} transition={spring} />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(6,5,16,0.74)" mask="url(#tour-hole)" />
      </svg>

      {/* Click shields around (and, unless the step is hands-on, over) the spotlight. */}
      {box ? (
        <>
          <div className="absolute inset-x-0 top-0" style={{ height: Math.max(0, box.y) }} />
          <div className="absolute inset-x-0 bottom-0" style={{ top: box.y + box.h }} />
          <div className="absolute left-0" style={{ top: box.y, height: box.h, width: Math.max(0, box.x) }} />
          <div className="absolute right-0" style={{ top: box.y, height: box.h, left: box.x + box.w }} />
          {!step.interactive && <div className="absolute" style={{ top: box.y, left: box.x, width: box.w, height: box.h }} />}
        </>
      ) : (
        <div className="absolute inset-0" />
      )}

      {box && (
        <motion.div
          className="pointer-events-none absolute rounded-[18px] border-2 border-iris-400 shadow-[0_0_0_6px_rgba(109,91,255,0.18),0_0_40px_rgba(109,91,255,0.45)]"
          initial={false}
          animate={{ left: box.x, top: box.y, width: box.w, height: box.h }}
          transition={spring}
        >
          <motion.span
            className="absolute inset-0 rounded-[16px] border-2 border-iris-300"
            animate={{ opacity: [0.7, 0], scale: [1, 1.06] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
          />
        </motion.div>
      )}

      <motion.div
        ref={cardRef}
        role="dialog"
        aria-live="polite"
        aria-label={step.title}
        className={cn('absolute rounded-2xl border border-line bg-surface p-5 text-ink shadow-2xl', mobile ? 'w-[calc(100vw-32px)]' : 'w-[340px]')}
        initial={false}
        animate={{ left: pos.left, top: pos.top }}
        transition={spring}
      >
        <div className="flex items-center gap-2.5">
          <span className={cn('grid size-8 place-items-center rounded-lg transition-colors', cheer ? 'bg-mint-400 text-[#04140e]' : 'bg-iris-500/15 text-iris-500')}>
            {cheer ? <Check className="size-4" strokeWidth={3} /> : <step.icon className="size-4" />}
          </span>
          <span className="flex-1 text-xs font-semibold text-muted">
            {index + 1} of {total}
          </span>
          <button onClick={onSkip} aria-label="End tour" className="-mr-1.5 grid size-8 place-items-center rounded-full text-faint transition hover:bg-surface-2 hover:text-ink">
            <X className="size-4" />
          </button>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step.id + String(cheer)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            <h2 className="mt-3 font-display text-lg leading-snug font-bold">{cheer ? 'Nice, editing unlocked.' : step.title}</h2>
            <p className="mt-1 text-sm text-muted">{body}</p>
            {step.extra?.(ctx)}
          </motion.div>
        </AnimatePresence>
        <div className="mt-4 flex gap-1">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors duration-300', i <= index ? 'bg-iris-500' : 'bg-surface-2')} />
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          {index > 0 && (
            <Button variant="ghost" size="sm" onClick={onBack} aria-label="Previous step">
              <ArrowLeft className="size-4" /> Back
            </Button>
          )}
          <Button size="sm" className="ml-auto" onClick={onNext}>
            {last ? 'Finish' : step.interactive && !isDone ? 'Maybe later' : 'Next'} {!last && <ArrowRight className="size-4" />}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
