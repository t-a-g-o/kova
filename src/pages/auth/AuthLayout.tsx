import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { firebaseEnabled } from '../../lib/firebase';

/**
 * A full-height app screen: top bar, scrolling content, and actions pinned to the bottom
 * where thumbs reach. On larger screens it sits in a phone-sized frame.
 */
export function AuthLayout({ children, footer, back, title }: { children: ReactNode; footer?: ReactNode; back?: string; title?: string }) {
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
            {!firebaseEnabled && (
              <span className="rounded-full border border-line bg-surface/70 px-2.5 py-1 text-[11px] font-semibold text-muted backdrop-blur">Demo</span>
            )}
          </div>
        </header>

        <main className="no-scrollbar relative flex-1 overflow-y-auto overscroll-contain px-6 pb-6">{children}</main>

        {footer && <footer className="relative shrink-0 space-y-3 border-t border-line bg-bg/80 px-6 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur-xl">{footer}</footer>}
      </div>
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
