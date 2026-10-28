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
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMediaQuery } from '../lib/hooks';
import { useData, usePlayful } from '../lib/store';
import type { Plan, Profile } from '../lib/types';
import { DAY, cn } from '../lib/utils';
import { confettiBurst } from './Celebration';
import { LogoMark } from './Logo';
import { Button, Toggle } from './ui';

/** Brand-new accounts get the tour once; older accounts and anyone who finished or skipped it don't. */
export const needsTour = (p: Profile) => !p.touredAt && Date.now() - p.memberSince < DAY;

type Ctx = { plan?: Plan; editing: boolean; setEditing: (v: boolean) => void; playful: boolean };

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
  /** Straight-laced wording used when Playful text is off. */
  pro?: { title?: string; body?: string | ((c: Ctx) => string) };
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
    pro: { body: 'Head to Plans to see everything you’re paying off, plus the plans you’ve already paid in full.' },
  },
  {
    id: 'plans',
    icon: Gem,
    route: () => '/plans',
    target: ['plans-grid'],
    title: 'Your collection',
    pro: { title: 'Your plans' },
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
    pro: { body: (c) => `This is ${c.plan?.name ?? 'a plan'}. Pay the next installment, choose a custom amount, or pay off the full balance at once.` },
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
    pro: { title: 'Demo controls', body: 'At the bottom of Account you’ll find Demo controls, where you can add plans and change how your account behaves.' },
  },
  {
    id: 'demo-add',
    icon: Gem,
    route: () => '/settings',
    target: ['demo-add'],
    demo: true,
    title: 'Add anything you want',
    body: 'Add a plan for any purchase you can dream up: the watch, the bag, the car. You can even backdate it so it looks like you’ve been paying for months.',
    pro: { title: 'Add a plan', body: 'Add a plan for any purchase, with its own price, term and APR. Backdate it and past payments fill in automatically.' },
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
    pro: { title: 'Edit your plans' },
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
    pro: { title: 'Processing and limits' },
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
  const { ready, profile, plans, methods, updateProfile, loadSample, clearSample } = useData();
  const nav = useNavigate();
  const loc = useLocation();
  const [phase, setPhase] = useState<Phase>('off');
  const [index, setIndex] = useState(0);
  const autoStarted = useRef(false);

  const playful = usePlayful();
  const plan = plans.find((p) => p.status === 'active') ?? plans[0];
  const ctx: Ctx = useMemo(
    () => ({ plan, editing: !!profile.demoEditing, setEditing: (v) => void updateProfile({ demoEditing: v }), playful }),
    [plan, profile.demoEditing, updateProfile, playful],
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
    void clearSample();
  }, [updateProfile, clearSample]);

  // Sample data only lives for the tour; tidy up after one that was closed midway.
  const leftovers = plans.some((p) => p.sample) || methods.some((m) => m.sample);
  useEffect(() => {
    if (ready && phase === 'off' && leftovers && !needsTour(profile)) void clearSample();
  }, [ready, phase, leftovers, profile, clearSample]);

  const start = useCallback(() => {
    setIndex(0);
    setPhase('intro');
  }, []);

  // Empty accounts get sample plans so the tour has something to show; they're removed when it ends.
  const begin = async () => {
    setIndex(0);
    if (!plans.length) {
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
            <Intro key="intro" playful={playful} name={profile.displayName} loading={phase === 'loading'} onStart={begin} onSkip={finish} />
          )}
          {step && <Spotlight key="spot" step={step} index={index} total={steps.length} ctx={ctx} onNext={next} onBack={back} onSkip={finish} />}
          {phase === 'outro' && (
            <Outro
              key="outro"
              playful={playful}
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

const PITCH = {
  playful: [
    { icon: Gem, title: 'Pick anything', body: 'The watch, the bag, the car. If you want it, it can be a plan.' },
    { icon: SplitSquareHorizontal, title: 'Split it up', body: 'Pay in 4 every two weeks, or monthly for up to 4 years.' },
    { icon: Trophy, title: 'Pay it off', body: 'Make payments, set AutoPay, and celebrate when it’s yours.' },
  ],
  pro: [
    { icon: Layers, title: 'Every purchase, one place', body: 'Each purchase becomes a plan with a clear schedule and balance.' },
    { icon: SplitSquareHorizontal, title: 'Flexible terms', body: 'Pay in 4 every two weeks, or monthly for up to 48 months.' },
    { icon: Zap, title: 'Pay your way', body: 'Pay early with no penalty, or set up AutoPay and never miss a due date.' },
  ],
};

function Intro({ playful, name, loading, onStart, onSkip }: { playful: boolean; name: string; loading: boolean; onStart: () => void; onSkip: () => void }) {
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
        {playful
          ? 'Kova is a playground for big purchases. Nothing here is real money, so go as big as you like.'
          : 'Kova splits your purchases into simple, predictable payments. Here’s a quick look at how it works.'}
      </motion.p>

      <div className="mt-7 space-y-3">
        {PITCH[playful ? 'playful' : 'pro'].map((p, i) => (
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

      <motion.div {...rise(1)} className="mt-7 space-y-2">
        <Button variant="light" size="lg" block loading={loading} onClick={onStart}>
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
  { icon: FlaskConical, label: 'Demo controls', body: 'Build & edit your larp', pro: 'Add & edit plans' },
];

function Outro({ playful, name, onAddPlan, onDone }: { playful: boolean; name: string; onAddPlan: () => void; onDone: () => void }) {
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
        {playful ? 'Here’s your cheat sheet. Now go buy something ridiculous.' : 'Here’s a quick recap. You can replay this tour anytime from Account.'}
      </motion.p>
      <div className="mt-7 grid grid-cols-2 gap-3">
        {RECAP.map((r, i) => (
          <motion.div key={r.label} {...rise(0.35 + i * 0.08)} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl">
            <r.icon className="size-5 text-iris-300" />
            <p className="mt-3 text-sm font-semibold">{r.label}</p>
            <p className="text-xs text-white/50">{(!playful && r.pro) || r.body}</p>
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

/** The element that scrolls `el`, or null when it sits in something pinned (tab bar, a sheet that fits). */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 1) return p;
    if (cs.position === 'fixed') return null;
  }
  return document.scrollingElement as HTMLElement;
}

type Tracked = { id: string; box: Box | null; vp: { w: number; h: number }; dockTop: boolean };

/**
 * Waits for the step's target to stop moving (page transitions, sheets sliding in), scrolls it into the
 * part of the screen the card won't cover in one instant jump, then follows it every frame. Scrolling
 * smoothly while a springy highlight chases the target is what made it bounce up and down.
 */
function useTargetBox(step: Step, mobile: boolean, cardH: RefObject<number>) {
  const [t, setT] = useState<Tracked>({ id: '', box: null, vp: { w: innerWidth, h: innerHeight }, dockTop: false });

  useEffect(() => {
    let raf = 0;
    let stage: 'seek' | 'scrolled' | 'live' = 'seek';
    let prev: Box | null = null;
    let stable = 0;
    let dockTop = false;
    let last: Tracked | null = null;
    const t0 = performance.now();

    const publish = (box: Box | null) => {
      const vp = { w: innerWidth, h: innerHeight };
      if (last && sameBox(box, last.box) && last.vp.w === vp.w && last.vp.h === vp.h) return;
      setT((last = { id: step.id, box, vp, dockTop }));
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const el = findTarget(step.target);
      const vh = innerHeight;
      if (!el) {
        prev = null;
        stable = 0;
        if (performance.now() - t0 > 2500) publish(null);
        return;
      }
      const r = el.getBoundingClientRect();
      const b = { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
      stable = prev && sameBox(b, prev) ? stable + 1 : 0;
      prev = b;

      if (stage === 'seek' && (stable >= 6 || performance.now() - t0 > 2000)) {
        stage = 'live';
        const sp = scrollParent(el);
        if (sp) {
          // Mobile: keep it below the top bar and above the docked card. Desktop: just on screen.
          const top = mobile ? 72 : 24;
          const bottom = mobile ? vh - (cardH.current ?? 240) - 32 : vh - 24;
          const fits = b.h <= bottom - top;
          const ok = fits ? b.y >= top && b.y + b.h <= bottom : b.y >= top && b.y <= top + 80;
          if (!ok) {
            const before = sp.scrollTop;
            sp.scrollTop = before + (b.y - top);
            if (Math.abs(sp.scrollTop - before) > 1) {
              stage = 'scrolled';
              stable = 0;
              prev = null;
            }
          }
        }
      } else if (stage === 'scrolled' && stable >= 2) stage = 'live';

      if (stage === 'live') {
        // Pick the card's end of the screen once per step so it never flips while tracking.
        if (!docked) {
          docked = true;
          const h = cardH.current ?? 240;
          dockTop = mobile && b.y + b.h > vh - h - 24 && b.y > h + 40;
        }
        publish(b);
      }
    };
    let docked = false;
    tick();
    return () => cancelAnimationFrame(raf);
  }, [step, mobile, cardH]);

  return t;
}

function placeCard(box: Box | null, card: { w: number; h: number }, vp: { w: number; h: number }, mobile: boolean, dockTop: boolean) {
  const clampX = (x: number) => Math.min(Math.max(EDGE, x), vp.w - card.w - EDGE);
  const clampY = (y: number) => Math.min(Math.max(EDGE, y), vp.h - card.h - EDGE);
  if (mobile) return { left: EDGE, top: dockTop ? 48 : vp.h - card.h - 28 };
  if (!box) return { left: (vp.w - card.w) / 2, top: (vp.h - card.h) / 2 };
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
  const cardRef = useRef<HTMLDivElement>(null);
  const cardH = useRef(240);
  const [card, setCard] = useState({ w: 340, h: 220 });
  const { id: trackedId, box, vp, dockTop } = useTargetBox(step, mobile, cardH);
  // Glide to each new target once, then stick to it exactly while the page scrolls.
  const [landed, setLanded] = useState('');
  const glide = landed !== trackedId;
  useEffect(() => {
    const t = setTimeout(() => setLanded(trackedId), 700);
    return () => clearTimeout(t);
  }, [trackedId]);
  const isDone = !!step.done?.(ctx);
  const wasDone = useRef(isDone);
  const [cheer, setCheer] = useState(false);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      cardH.current = el.offsetHeight;
      setCard({ w: el.offsetWidth, h: el.offsetHeight });
    });
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

  const pos = placeCard(box, card, vp, mobile, dockTop);
  const hole = box ?? { x: vp.w / 2, y: vp.h / 2, w: 0, h: 0 };
  const spring = glide ? ({ type: 'spring', stiffness: 260, damping: 32 } as const) : { duration: 0 };
  const words = ctx.playful ? step : { ...step, ...step.pro };
  const body = typeof words.body === 'function' ? words.body(ctx) : words.body;
  const title = words.title;
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
        aria-label={title}
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
            <h2 className="mt-3 font-display text-lg leading-snug font-bold">{cheer ? 'Nice, editing unlocked.' : title}</h2>
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
