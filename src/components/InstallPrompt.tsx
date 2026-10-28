import { EllipsisVertical, Maximize2, PlusSquare, Share, Smartphone, Zap } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/store';
import { LogoMark } from './Logo';
import { needsTour } from './Tour';
import { Button, Sheet } from './ui';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Chrome can fire this before React mounts, so catch it as soon as the module loads.
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as InstallEvent;
  listeners.forEach((l) => l());
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  listeners.forEach((l) => l());
});

const DISMISS_KEY = 'kova:install-dismissed';
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

export const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const ua = navigator.userAgent;
const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /android/i.test(ua);
const isPhone = isIOS || isAndroid;

function snoozed() {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISS_KEY) ?? 0) < SNOOZE_MS;
  } catch {
    return false;
  }
}

/** Nudges phone browser visitors to add Kova to their home screen, where it runs full screen like a native app. */
export function InstallPrompt() {
  const [open, setOpen] = useState(false);
  const [canPrompt, setCanPrompt] = useState(!!deferred);
  const { user } = useAuth();
  const { ready, profile } = useData();
  // Let newcomers sign up and take the welcome tour first; ask once they're settled in.
  const touring = !user || !ready || needsTour(profile);

  useEffect(() => {
    const sync = () => setCanPrompt(!!deferred);
    listeners.add(sync);
    if (!isPhone || isStandalone() || snoozed() || touring) return () => void listeners.delete(sync);
    const t = setTimeout(() => setOpen(true), 1200);
    return () => {
      clearTimeout(t);
      listeners.delete(sync);
    };
  }, [touring]);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode: it just shows again next visit */
    }
    setOpen(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    setCanPrompt(false);
    if (outcome === 'accepted') setOpen(false);
  };

  return (
    <Sheet open={open} onClose={dismiss} hideClose>
      <div className="flex flex-col items-center pt-2 text-center">
        <div className="rounded-[22px] shadow-[0_12px_40px_-8px_rgba(109,91,255,0.7)]">
          <LogoMark size={72} />
        </div>
        <h2 className="mt-5 font-display text-2xl font-bold">Add Kova to your Home Screen</h2>
        <p className="mt-2 max-w-xs text-sm text-muted">
          It opens full screen with no browser bars, right from your home screen, just like a real banking app.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        <Perk icon={<Maximize2 />} label="Full screen" />
        <Perk icon={<Smartphone />} label="On your home screen" />
        <Perk icon={<Zap />} label="Opens instantly" />
      </div>

      {canPrompt ? null : isIOS ? (
        <ol className="mt-6 space-y-3 rounded-2xl bg-surface-2 p-4 text-left text-sm">
          <Step n={1}>
            Tap <Share className="mx-0.5 inline size-4 -translate-y-px text-iris-500" /> <b>Share</b> in the browser toolbar
          </Step>
          <Step n={2}>
            Choose <PlusSquare className="mx-0.5 inline size-4 -translate-y-px text-iris-500" /> <b>Add to Home Screen</b>
          </Step>
          <Step n={3}>
            Tap <b>Add</b>, then open Kova from your home screen
          </Step>
          <Step n={4}>Sign in once in the app. It remembers you from then on</Step>
        </ol>
      ) : isAndroid ? (
        <ol className="mt-6 space-y-3 rounded-2xl bg-surface-2 p-4 text-left text-sm">
          <Step n={1}>
            Tap <EllipsisVertical className="inline size-4 -translate-y-px text-iris-500" /> in the browser toolbar
          </Step>
          <Step n={2}>
            Choose <b>Add to Home screen</b> or <b>Install app</b>
          </Step>
          <Step n={3}>Open Kova from your home screen</Step>
        </ol>
      ) : null}

      <div className="mt-6 space-y-2 pb-2">
        {canPrompt && (
          <Button size="lg" block onClick={install}>
            Add to Home Screen
          </Button>
        )}
        <Button size="lg" block variant={canPrompt ? 'ghost' : 'secondary'} onClick={dismiss}>
          {canPrompt ? 'Not now' : 'Got it'}
        </Button>
      </div>
    </Sheet>
  );
}

function Perk({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface-2 px-2 py-3.5 text-center">
      <span className="text-iris-500 [&>svg]:size-5">{icon}</span>
      <span className="text-xs leading-tight font-semibold">{label}</span>
    </div>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-iris-500 text-xs font-bold text-white">{n}</span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}
