import { AnimatePresence, animate, motion, useMotionValue, useTransform, type HTMLMotionProps } from 'motion/react';
import { Eye, EyeOff, Loader2, X } from 'lucide-react';
import { forwardRef, useEffect, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn, money } from '../../lib/utils';
import { useMediaQuery } from '../../lib/hooks';

/* ---------- Button ---------- */

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'mint' | 'outline' | 'light';
type BtnSize = 'sm' | 'md' | 'lg';

const variants: Record<BtnVariant, string> = {
  primary:
    'bg-iris-600 text-white shadow-sm hover:bg-iris-700',
  secondary: 'bg-surface-2 text-ink hover:bg-line',
  ghost: 'text-muted hover:text-ink hover:bg-surface-2',
  danger: 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/15',
  mint: 'bg-ink text-bg hover:opacity-90',
  outline: 'border border-line text-ink hover:bg-surface-2',
  light: 'bg-white text-[#0e0b1f] hover:bg-white/90',
};
const sizes: Record<BtnSize, string> = {
  sm: 'h-9 px-3.5 text-sm rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-5 text-[15px] rounded-xl gap-2',
};

export interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: BtnVariant;
  size?: BtnSize;
  loading?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, block, className, children, disabled, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex select-none items-center justify-center font-semibold whitespace-nowrap transition-[background,box-shadow,filter,color] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {loading ? (
          <motion.span key="l" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center">
            <Loader2 className="size-5 animate-spin" />
          </motion.span>
        ) : (
          <motion.span key="c" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center gap-[inherit]">
            {children as ReactNode}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
});

/* ---------- Inputs ---------- */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
  hint?: string;
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, icon, error, hint, suffix, className, type, id, ...rest },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  const [show, setShow] = useState(false);
  const isPw = type === 'password';
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-muted">
          {label}
        </label>
      )}
      <motion.div
        animate={error ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.35 }}
        className={cn(
          'group flex h-11 items-center gap-2.5 rounded-xl border bg-surface px-3.5 transition-all duration-200',
          'focus-within:border-iris-500 focus-within:shadow-[0_0_0_3px_rgba(109,91,255,.12)]',
          error ? 'border-rose-500/70' : 'border-line',
        )}
      >
        {icon && <span className="text-faint transition-colors group-focus-within:text-iris-500 [&>svg]:size-[18px]">{icon}</span>}
        <input
          ref={ref}
          id={inputId}
          type={isPw && show ? 'text' : type}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
          {...rest}
        />
        {isPw && (
          <button type="button" tabIndex={-1} onClick={() => setShow((s) => !s)} className="text-faint hover:text-ink">
            {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        )}
        {suffix}
      </motion.div>
      <AnimatePresence initial={false}>
        {(error || hint) && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={cn('overflow-hidden pt-1.5 text-[13px]', error ? 'text-rose-500' : 'text-faint')}
          >
            {error || hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
});

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300', checked ? 'bg-iris-500' : 'bg-faint/40')}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 600, damping: 35 }}
        className={cn('absolute top-1 size-5 rounded-full bg-white shadow-md', checked ? 'right-1' : 'left-1')}
      />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn('flex rounded-2xl bg-surface-2 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn('relative flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors', value === o.value ? 'text-ink' : 'text-muted hover:text-ink')}
        >
          {value === o.value && (
            <motion.span layoutId={id} transition={{ type: 'spring', stiffness: 500, damping: 38 }} className="absolute inset-0 rounded-xl bg-surface shadow-sm" />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------- Display ---------- */

export function Card({ className, children, ...rest }: HTMLMotionProps<'div'>) {
  return (
    <motion.div className={cn('rounded-2xl border border-line bg-surface', className)} {...rest}>
      {children}
    </motion.div>
  );
}

type Tone = 'pending' | 'success' | 'danger' | 'neutral' | 'iris';
const tones: Record<Tone, string> = {
  pending: 'bg-amber-400/12 text-amber-500 dark:text-amber-300',
  success: 'bg-mint-400/12 text-mint-600 dark:text-mint-400',
  danger: 'bg-rose-500/12 text-rose-500',
  neutral: 'bg-surface-2 text-muted',
  iris: 'bg-iris-500/12 text-iris-600 dark:text-iris-300',
};

export function Badge({ tone = 'neutral', children, pulse, className }: { tone?: Tone; children: ReactNode; pulse?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap', tones[tone], className)}>
      {pulse && (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}

export function AnimatedNumber({ value, format = (n) => money(n), className, duration = 1 }: { value: number; format?: (n: number) => string; className?: string; duration?: number }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    const c = animate(mv, value, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [value, duration, mv]);
  return <motion.span className={cn('tabular', className)}>{text}</motion.span>;
}

export function ProgressRing({
  value,
  size = 120,
  stroke = 10,
  children,
  className,
  trackClass = 'stroke-line',
  gradientId,
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  className?: string;
  trackClass?: string;
  gradientId?: string;
}) {
  const auto = useId().replace(/:/g, '');
  const gid = gradientId ?? `ring-${auto}`;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b7bff" />
            <stop offset="100%" stopColor="#3ee6b0" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={trackClass} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - Math.max(0.0001, value)) }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-surface-2', className)}>
      <motion.div
        className="h-full rounded-full bg-iris-500"
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(2, value * 100)}%` }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

export function Empty({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-iris-500/10 text-iris-500 [&>svg]:size-7">{icon}</div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-shimmer rounded-2xl bg-[linear-gradient(90deg,var(--surface-2)_25%,var(--line)_50%,var(--surface-2)_75%)] bg-[length:200%_100%]', className)} />;
}

/* ---------- Sheet (bottom sheet on mobile, modal on desktop) ---------- */

export function Sheet({
  open,
  onClose,
  title,
  children,
  wide,
  hideClose,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  hideClose?: boolean;
}) {
  const desktop = useMediaQuery('(min-width: 640px)');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col overflow-hidden border border-line bg-surface shadow-2xl',
              'rounded-t-[28px] sm:rounded-2xl',
              wide ? 'sm:max-w-xl' : 'sm:max-w-md',
            )}
            initial={desktop ? { opacity: 0, scale: 0.94, y: 12 } : { y: '100%' }}
            animate={desktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={desktop ? { opacity: 0, scale: 0.96, y: 8 } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            drag={desktop ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => (i.offset.y > 120 || i.velocity.y > 600) && onClose()}
          >
            {!desktop && <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-faint/40" />}
            {(title || !hideClose) && (
              <div className="flex shrink-0 items-center justify-between gap-4 px-6 pt-4 pb-2 sm:pt-6">
                <div className="font-display text-lg font-bold">{title}</div>
                {!hideClose && (
                  <button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-surface-2 text-muted transition hover:text-ink" aria-label="Close">
                    <X className="size-4" />
                  </button>
                )}
              </div>
            )}
            <div className="overflow-y-auto overscroll-contain px-6 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]" onPointerDown={(e) => e.stopPropagation()}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Row({ label, value, className }: { label: ReactNode; value: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-2.5 text-sm', className)}>
      <span className="text-muted">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
