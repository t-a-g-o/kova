import { motion } from 'motion/react';
import { CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { firebaseEnabled } from '../../lib/firebase';
import { Logo } from '../../components/Logo';
import { ProgressRing } from '../../components/ui';
import { LogoTile } from '../../components/Logos';

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

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="noise relative hidden overflow-hidden bg-[#0a0816] p-12 text-white lg:flex lg:flex-col">
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
      <main className="relative flex min-h-dvh flex-col overflow-hidden px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-8 sm:px-8">
        <div className="pointer-events-none absolute inset-0 lg:hidden">
          <div className="absolute -top-40 left-1/2 size-[480px] -translate-x-1/2 rounded-full bg-iris-500/25 blur-[110px]" />
        </div>
        <div className="relative flex items-center justify-between lg:justify-end">
          <Logo size={30} className="lg:hidden" animated />
          {!firebaseEnabled && (
            <span className="rounded-full border border-line bg-surface/70 px-3 py-1 text-xs font-semibold text-muted backdrop-blur">Demo mode</span>
          )}
        </div>
        <div className="relative mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">{children}</div>
        <p className="relative text-center text-xs text-faint">© {new Date().getFullYear()} Kova Financial. All rights reserved.</p>
      </main>
    </div>
  );
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
