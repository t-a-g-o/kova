import { motion } from 'motion/react';
import { CheckCircle2, ChevronLeft, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { firebaseEnabled } from '../../lib/firebase';
import { Logo } from '../../components/Logo';
import { LogoTile } from '../../components/Logos';
import { ProgressRing } from '../../components/ui';

const DESKTOP = '(min-width: 1024px)';

function useDesktop() {
  const [desktop, setDesktop] = useState(() => matchMedia(DESKTOP).matches);
  useEffect(() => {
    const mq = matchMedia(DESKTOP);
    const sync = () => setDesktop(mq.matches);
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return desktop;
}

function Blobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-32 -left-24 size-[420px] animate-float rounded-full bg-iris-500/40 blur-[100px]" />
      <div className="absolute top-1/3 -right-32 size-[380px] animate-float rounded-full bg-mint-400/25 blur-[110px] [animation-delay:-3s]" />
      <div className="absolute -bottom-40 left-1/4 size-[420px] animate-float rounded-full bg-fuchsia-500/20 blur-[120px] [animation-delay:-6s]" />
    </div>
  );
}

function ShowcaseCard() {
  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <motion.div
        initial={{ opacity: 0, y: 40, rotate: -4 }}
        animate={{ opacity: 1, y: 0, rotate: -4 }}
        transition={{ delay: 0.3, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-center gap-4">
          <LogoTile domain="rolex.com" name="Rolex" size={56} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white">Submariner Date</p>
            <p className="text-sm text-white/50">18 of 24 payments</p>
          </div>
          <ProgressRing value={0.75} size={56} stroke={6} trackClass="stroke-white/10">
            <span className="text-xs font-bold text-white">75%</span>
          </ProgressRing>
        </div>
        <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
          <span className="text-sm text-white/60">Next payment</span>
          <span className="font-semibold text-white">$607.42 · Nov 14</span>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 30, x: 30 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ delay: 0.7, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="absolute -right-6 -bottom-14 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#121027]/90 px-4 py-3 shadow-2xl backdrop-blur-xl"
      >
        <CheckCircle2 className="size-6 text-mint-400" />
        <div>
          <p className="text-sm font-semibold text-white">Paid in full</p>
          <p className="text-xs text-white/50">Cartier Love Bracelet · $7,350.00</p>
        </div>
      </motion.div>
    </div>
  );
}

function DemoBadge() {
  if (firebaseEnabled) return null;
  return <span className="rounded-full border border-line bg-surface/70 px-2.5 py-1 text-[11px] font-semibold text-muted backdrop-blur">Demo</span>;
}

type LayoutProps = { children: ReactNode; footer?: ReactNode; back?: string; title?: string };

/** Desktop: brand panel on the left, the form in a centered column on the right with its actions inline. */
function DesktopAuth({ children, footer, back, title }: LayoutProps) {
  return (
    <div className="grid min-h-dvh grid-cols-[1.05fr_1fr]">
      <aside className="noise relative flex flex-col overflow-hidden bg-[#0a0816] p-12 text-white">
        <Blobs />
        <Logo size={34} className="relative text-white" />
        <div className="relative my-auto">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-md font-display text-5xl leading-[1.05] font-extrabold"
          >
            Own it now. <span className="text-gradient">Pay it your way.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-5 max-w-sm text-lg text-white/60">
            Split big purchases into simple payments. No surprises, no hidden fees.
          </motion.p>
          <div className="mt-16">
            <ShowcaseCard />
          </div>
        </div>
        <div className="relative flex gap-6 text-sm text-white/50">
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4" /> 256-bit encryption
          </span>
          <span className="flex items-center gap-2">
            <Sparkles className="size-4" /> No hidden fees
          </span>
        </div>
      </aside>
      <main className="relative flex min-h-dvh flex-col px-8 py-6">
        <div className="flex h-10 items-center justify-between">
          {back ? (
            <Link to={back} className="-ml-2 flex items-center gap-1 rounded-full px-2 py-1.5 text-sm font-semibold text-muted transition hover:bg-surface-2 hover:text-ink">
              <ChevronLeft className="size-4" /> Back
            </Link>
          ) : (
            <span />
          )}
          <DemoBadge />
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          {title && <p className="mb-2 text-sm font-semibold text-muted">{title}</p>}
          {children}
          {footer && <div className="mt-8 space-y-3">{footer}</div>}
        </div>
        <p className="text-center text-xs text-faint">© {new Date().getFullYear()} Kova Financial. All rights reserved.</p>
      </main>
    </div>
  );
}

/**
 * Phones and tablets: a full-height app screen with a top bar, scrolling content, and actions
 * pinned to the bottom where thumbs reach. Tablets get it in a phone-sized frame.
 */
function MobileAuth({ children, footer, back, title }: LayoutProps) {
  return (
    <div className="min-h-dvh bg-bg select-none [&_input]:select-text sm:grid sm:place-items-center sm:bg-surface-2 sm:p-6">
      <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-bg sm:h-[min(860px,calc(100dvh-3rem))] sm:w-[400px] sm:rounded-[44px] sm:border sm:border-line sm:shadow-2xl">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-44 left-1/2 size-[440px] -translate-x-1/2 rounded-full bg-iris-500/25 blur-[100px]" />
        </div>

        <header className="relative grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center px-3 pt-safe box-content">
          <div>
            {back && (
              <Link to={back} aria-label="Back" className="grid size-10 place-items-center rounded-full text-ink transition active:scale-90 active:bg-surface-2">
                <ChevronLeft className="size-6" />
              </Link>
            )}
          </div>
          <p className="text-[15px] font-semibold">{title}</p>
          <div className="flex justify-end pr-1">
            <DemoBadge />
          </div>
        </header>

        <main className="no-scrollbar relative flex-1 overflow-y-auto overscroll-contain px-6 pb-6">{children}</main>

        {footer && <footer className="relative shrink-0 space-y-3 border-t border-line bg-bg/80 px-6 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur-xl">{footer}</footer>}
      </div>
    </div>
  );
}

export function AuthLayout(props: LayoutProps) {
  return useDesktop() ? <DesktopAuth {...props} /> : <MobileAuth {...props} />;
}

export const authStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
export const authItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
