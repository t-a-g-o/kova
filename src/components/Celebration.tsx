import confetti from 'canvas-confetti';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react';
import { Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Plan } from '../lib/types';
import { cn, money, vibrate } from '../lib/utils';
import { AnimatedNumber, Button } from './ui';
import { PlanThumb } from './PlanThumb';

const COLORS = ['#8b7bff', '#6d5bff', '#3ee6b0', '#ffffff', '#ffd166'];

export function confettiBurst(intensity: 'small' | 'big' = 'small') {
  if (intensity === 'small') {
    confetti({ particleCount: 70, spread: 75, startVelocity: 38, origin: { y: 0.65 }, colors: COLORS, zIndex: 80, scalar: 0.9 });
    return;
  }
  const end = Date.now() + 2200;
  confetti({ particleCount: 160, spread: 100, startVelocity: 55, origin: { y: 0.55 }, colors: COLORS, zIndex: 80 });
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: COLORS, zIndex: 80 });
    confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: COLORS, zIndex: 80 });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  setTimeout(() => confetti({ particleCount: 80, spread: 360, startVelocity: 30, ticks: 120, origin: { y: 0.4 }, colors: COLORS, shapes: ['star'], zIndex: 80, scalar: 1.2 }), 600);
}

export function SuccessCheck({ size = 96, delay = 0 }: { size?: number; delay?: number }) {
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border-2 border-mint-400"
          initial={{ scale: 0.6, opacity: 0.8 }}
          animate={{ scale: 2.1, opacity: 0 }}
          transition={{ duration: 1.1, delay: delay + 0.25 + i * 0.25, ease: 'easeOut' }}
        />
      ))}
      <motion.div
        className="absolute inset-0 rounded-full bg-mint-400 shadow-[0_0_60px_-5px_rgba(62,230,176,.8)]"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14, delay }}
      />
      <svg viewBox="0 0 52 52" className="relative" style={{ width: size * 0.5, height: size * 0.5 }}>
        <motion.path
          d="M14 27 l8 8 l16 -18"
          fill="none"
          stroke="#04140e"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, delay: delay + 0.3, ease: 'easeOut' }}
        />
      </svg>
    </div>
  );
}

/** Press and hold to confirm — fills up, then fires. */
export function HoldButton({ label, onComplete, duration = 1500, disabled, className }: { label: string; onComplete: () => void; duration?: number; disabled?: boolean; className?: string }) {
  const p = useMotionValue(0);
  const width = useTransform(p, (v) => `${v * 100}%`);
  const [holding, setHolding] = useState(false);
  const ctrl = useRef<ReturnType<typeof animate> | null>(null);
  const ticks = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (ticks.current) clearInterval(ticks.current);
    setHolding(false);
    if (p.get() < 1) {
      ctrl.current?.stop();
      ctrl.current = animate(p, 0, { duration: 0.35, ease: 'easeOut' });
    }
  };
  const start = () => {
    if (disabled) return;
    setHolding(true);
    vibrate(10);
    ticks.current = setInterval(() => vibrate(6), 180);
    ctrl.current?.stop();
    ctrl.current = animate(p, 1, {
      duration: (duration / 1000) * (1 - p.get()),
      ease: 'linear',
      onComplete: () => {
        if (ticks.current) clearInterval(ticks.current);
        vibrate([20, 30, 40]);
        setHolding(false);
        onComplete();
        setTimeout(() => p.set(0), 600);
      },
    });
  };

  useEffect(() => () => void (ticks.current && clearInterval(ticks.current)), []);

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      animate={{ scale: holding ? 0.98 : 1 }}
      className={cn(
        'relative h-14 w-full touch-none overflow-hidden rounded-2xl bg-surface-2 font-semibold text-ink select-none disabled:opacity-50',
        className,
      )}
    >
      <motion.span className="absolute inset-y-0 left-0 bg-gradient-to-r from-iris-500 to-mint-400" style={{ width }} />
      <span className={cn('relative flex items-center justify-center gap-2 transition-colors', holding && 'text-white')}>
        <Lock className="size-4" />
        {holding ? 'Keep holding…' : label}
      </span>
    </motion.button>
  );
}

export function Celebration({
  open,
  plan,
  amount,
  saved,
  paymentsMade,
  onClose,
}: {
  open: boolean;
  plan?: Plan;
  amount: number;
  saved: number;
  paymentsMade: number;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    vibrate([40, 60, 40, 60, 120]);
    const t = setTimeout(() => confettiBurst('big'), 350);
    return () => clearTimeout(t);
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && plan && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-[#07060d]/95 p-6 text-white backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
        >
          <motion.div
            className="pointer-events-none absolute size-[640px] rounded-full bg-[radial-gradient(circle,rgba(109,91,255,.45),transparent_65%)]"
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          />
          <div className="relative flex w-full max-w-sm flex-col items-center text-center">
            <div className="relative">
              <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}>
                <PlanThumb plan={plan} size={112} className="rounded-[32px] shadow-2xl ring-4 ring-white/10" />
              </motion.div>
              <div className="absolute -right-5 -bottom-5">
                <SuccessCheck size={56} delay={0.55} />
              </div>
              <motion.div
                className="absolute -top-5 -left-14 rounded-lg border-[3px] border-mint-400 px-2.5 py-0.5 font-display text-sm font-extrabold tracking-[0.2em] text-mint-400"
                initial={{ scale: 3, opacity: 0, rotate: -30 }}
                animate={{ scale: 1, opacity: 1, rotate: -14 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 1.1 }}
              >
                PAID
              </motion.div>
            </div>

            <motion.p className="mt-10 text-sm font-semibold tracking-[0.25em] text-mint-400 uppercase" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
              Paid in full
            </motion.p>
            <motion.h2 className="mt-2 font-display text-3xl font-extrabold" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
              It’s officially yours.
            </motion.h2>
            <motion.p className="mt-2 text-white/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
              {plan.name} from {plan.merchant} has no balance left.
            </motion.p>

            <motion.div className="mt-7 font-display text-5xl font-extrabold" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.05, type: 'spring' }}>
              <AnimatedNumber value={plan.price} duration={1.8} />
            </motion.div>

            <motion.div className="mt-7 grid w-full grid-cols-3 gap-2" initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.08, delayChildren: 1.3 } } }}>
              {[
                { k: 'Final payment', v: money(amount) },
                { k: 'Payments', v: String(paymentsMade) },
                { k: 'Interest saved', v: money(saved) },
              ].map((s) => (
                <motion.div key={s.k} variants={{ h: { opacity: 0, y: 12 }, s: { opacity: 1, y: 0 } }} className="rounded-2xl border border-white/10 bg-white/5 px-2 py-3">
                  <div className="tabular text-[15px] font-bold">{s.v}</div>
                  <div className="mt-0.5 text-[11px] text-white/50">{s.k}</div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div className="mt-8 w-full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.7 }}>
              <Button variant="light" size="lg" block onClick={onClose}>
                Done
              </Button>
              <button onClick={() => confettiBurst('big')} className="mt-3 text-sm font-semibold text-white/50 transition hover:text-white">
                Celebrate again
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
