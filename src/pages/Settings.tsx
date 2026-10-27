import {
  Bell,
  BadgeCheck,
  ChevronRight,
  Clock,
  Cloud,
  CreditCard,
  Download,
  FlaskConical,
  HardDrive,
  KeyRound,
  LogOut,
  Mail,
  Moon,
  Palette,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  User,
  Wand2,
  Zap,
} from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, PageHeader, useUI } from '../components/AppShell';
import { MethodIcon } from '../components/Logos';
import { useToast } from '../components/Toast';
import { Badge, Button, Card, Input, Segmented, Sheet, Toggle } from '../components/ui';
import { useAuth } from '../lib/auth';
import { planStats } from '../lib/finance';
import { firebaseEnabled } from '../lib/firebase';
import { methodLabel, useData } from '../lib/store';
import type { NotificationPrefs, ThemePref } from '../lib/types';
import { cn, fmtDate, money } from '../lib/utils';

const PENDING = [
  { s: 0, l: 'Instant' },
  { s: 30, l: '30 sec' },
  { s: 120, l: '2 min' },
  { s: 600, l: '10 min' },
  { s: 3600, l: '1 hour' },
  { s: 86400, l: '1 day' },
  { s: 259200, l: '3 days' },
];

const DEFAULT_NOTIFS: NotificationPrefs = { reminders: true, receipts: true, offers: false };

/** Stable, human-readable account number derived from the user id. */
const accountNumber = (uid: string) => {
  let h = 0;
  for (const c of uid) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const n = String(h).padStart(10, '0').slice(-10);
  return `KV ${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
};

function Section({ icon, title, description, children }: { icon: ReactNode; title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted [&>svg]:size-4">{icon}</span>
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted">{description}</p>}
        </div>
      </div>
      <div className="divide-y divide-line">{children}</div>
    </Card>
  );
}

/** One labeled setting: label + optional hint on the left, value or control on the right. */
function Item({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3.5 sm:px-6', className)}>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function Settings() {
  const { user, signOut, reset } = useAuth();
  const { profile, updateProfile, plans, txns, methods, defaultMethod } = useData();
  const toast = useToast();
  const [demoOpen, setDemoOpen] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);

  const notifs = { ...DEFAULT_NOTIFS, ...profile.notifications };
  const setNotif = (k: keyof NotificationPrefs, v: boolean) => void updateProfile({ notifications: { ...notifs, [k]: v } });

  const active = plans.filter((p) => p.status === 'active');
  const outstanding = active.reduce((s, p) => s + planStats(p, txns).remaining, 0);
  const available = Math.max(0, profile.spendingPower - outstanding);
  const autopayCount = active.filter((p) => p.autopay).length;
  const displayName = profile.displayName || user?.displayName || '';

  return (
    <div>
      <PageHeader title="Account" subtitle="Manage your profile, security and preferences." />

      {/* Account overview */}
      <Card className="mb-6 overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <Avatar name={displayName} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-xl font-semibold tracking-tight">{displayName}</p>
              <Badge tone="success">
                <BadgeCheck className="size-3.5" /> Verified
              </Badge>
            </div>
            <p className="truncate text-sm text-muted">{user?.email}</p>
            <p className="mt-1 font-mono text-xs text-faint">{user ? accountNumber(user.uid) : ''}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
          {[
            { l: 'Spending power', v: money(available, true) },
            { l: 'Active plans', v: String(active.length) },
            { l: 'Member since', v: fmtDate(profile.memberSince, { month: 'short', year: 'numeric' }) },
          ].map((s) => (
            <div key={s.l} className="px-4 py-3.5 sm:px-6">
              <p className="text-xs text-muted">{s.l}</p>
              <p className="tabular mt-0.5 truncate font-semibold">{s.v}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Section icon={<User />} title="Personal information">
            <Item label="Name" hint={displayName}>
              <Button variant="secondary" size="sm" onClick={() => setNameOpen(true)}>
                <Pencil className="size-3.5" /> Edit
              </Button>
            </Item>
            <Item label="Email" hint={user?.email}>
              <Badge tone="success">Verified</Badge>
            </Item>
            <Item label="Account number" hint={<span className="font-mono">{user ? accountNumber(user.uid) : ''}</span>} />
          </Section>

          <Section icon={<CreditCard />} title="Payments" description="How your plans get paid.">
            <Link to="/wallet" className="block transition hover:bg-surface-2">
              <Item label="Default payment method" hint={defaultMethod ? methodLabel(defaultMethod) : 'None added yet'}>
                <span className="flex items-center gap-2">
                  {defaultMethod && <MethodIcon method={defaultMethod} size={28} />}
                  <ChevronRight className="size-4 text-faint" />
                </span>
              </Item>
            </Link>
            <Item label="AutoPay" hint={active.length ? `On for ${autopayCount} of ${active.length} active plan${active.length === 1 ? '' : 's'}` : 'No active plans'}>
              <Zap className={cn('size-4', autopayCount ? 'text-iris-500' : 'text-faint')} />
            </Item>
            <Item label="Linked accounts" hint={`${methods.length} payment method${methods.length === 1 ? '' : 's'}`}>
              <Link to="/wallet" className="text-sm font-medium text-iris-500 hover:text-iris-400">
                Manage
              </Link>
            </Item>
          </Section>

          <Section icon={<Palette />} title="Appearance">
            <div className="px-5 py-4 sm:px-6">
              <Segmented<ThemePref>
                value={profile.theme}
                onChange={(t) => void updateProfile({ theme: t })}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: <span className="inline-flex items-center gap-1.5"><Moon className="size-3.5" /> Dark</span> },
                  { value: 'system', label: 'System' },
                ]}
              />
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <Section icon={<ShieldCheck />} title="Sign-in & security">
            <Item label="Password" hint="We’ll email you a secure link to set a new one.">
              <Button
                variant="secondary"
                size="sm"
                loading={sendingReset}
                onClick={async () => {
                  if (!user?.email) return;
                  setSendingReset(true);
                  try {
                    await reset(user.email);
                    toast({ tone: 'success', title: 'Reset link sent', body: `Check ${user.email}.` });
                  } catch {
                    toast({ tone: 'error', title: 'Couldn’t send the reset link', body: 'Please try again in a moment.' });
                  } finally {
                    setSendingReset(false);
                  }
                }}
              >
                <KeyRound className="size-3.5" /> Change
              </Button>
            </Item>
            <Item label="Signed in as" hint={user?.email}>
              <Button variant="ghost" size="sm" onClick={() => void signOut()}>
                <LogOut className="size-3.5" /> Sign out
              </Button>
            </Item>
          </Section>

          <Section icon={<Bell />} title="Notifications" description={`Sent to ${user?.email ?? 'your email'}.`}>
            <Item label="Payment reminders" hint="A heads-up 3 days before each due date.">
              <Toggle checked={notifs.reminders} onChange={(v) => setNotif('reminders', v)} label="Payment reminders" />
            </Item>
            <Item label="Payment receipts" hint="A receipt every time a payment posts.">
              <Toggle checked={notifs.receipts} onChange={(v) => setNotif('receipts', v)} label="Payment receipts" />
            </Item>
            <Item label="Offers & updates" hint="New features and occasional promotions.">
              <Toggle checked={notifs.offers} onChange={(v) => setNotif('offers', v)} label="Offers and updates" />
            </Item>
          </Section>

          <Section icon={<Mail />} title="Your data">
            <Item label="Download your data" hint="Plans, payments and payment methods as a JSON file.">
              <Button variant="secondary" size="sm" onClick={() => exportData({ profile, plans, txns, methods })}>
                <Download className="size-3.5" /> Download
              </Button>
            </Item>
          </Section>
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 border-t border-line pt-6 text-center">
        <p className="text-xs text-faint">Kova Financial · Version 1.0</p>
        <button onClick={() => setDemoOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-faint transition hover:bg-surface-2 hover:text-muted">
          <FlaskConical className="size-3.5" /> Demo controls
        </button>
      </div>

      <EditName open={nameOpen} onClose={() => setNameOpen(false)} current={displayName} />
      <DemoControls open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}

function exportData(data: object) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `kova-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function EditName({ open, onClose, current }: { open: boolean; onClose: () => void; current: string }) {
  const { rename } = useAuth();
  const { updateProfile } = useData();
  const toast = useToast();
  const [name, setName] = useState(current);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setName(current);
  }, [open, current]);

  const trimmed = name.trim();

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed || trimmed === current) return;
    setBusy(true);
    try {
      await Promise.all([rename(trimmed), updateProfile({ displayName: trimmed })]);
      toast({ tone: 'success', title: 'Name updated' });
      onClose();
    } catch {
      toast({ tone: 'error', title: 'Couldn’t update your name', body: 'Please try again in a moment.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Edit name">
      <form onSubmit={save} className="space-y-5">
        <Input label="Full name" autoComplete="name" icon={<User />} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus />
        <Button type="submit" size="lg" block loading={busy} disabled={!trimmed || trimmed === current}>
          Save
        </Button>
      </form>
    </Sheet>
  );
}

/** Sandbox tools that a real lender wouldn't expose: kept out of the way behind a small link. */
function DemoControls({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, updateProfile, plans, txns, loadSample, resetData } = useData();
  const { openNewPlan } = useUI();
  const toast = useToast();
  const [power, setPower] = useState(String(profile.spendingPower));
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState('');

  useEffect(() => setPower(String(profile.spendingPower)), [profile.spendingPower, open]);
  useEffect(() => setConfirmReset(false), [open]);

  return (
    <Sheet open={open} onClose={onClose} title="Demo controls">
      <div className="space-y-6">
        <div className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3">
          {firebaseEnabled ? <Cloud className="size-5 text-mint-500" /> : <HardDrive className="size-5 text-amber-400" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{firebaseEnabled ? 'Synced with Firebase' : 'Demo mode'}</p>
            <p className="text-xs text-muted">{firebaseEnabled ? 'Your data syncs across devices.' : 'Data is saved in this browser only. Add Firebase keys to sync.'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              onClose();
              setTimeout(openNewPlan, 200);
            }}
          >
            <Plus className="size-4" /> Add a plan
          </Button>
          <Button
            variant="secondary"
            loading={busy === 'sample'}
            onClick={async () => {
              setBusy('sample');
              await loadSample();
              setBusy('');
              toast({ tone: 'success', title: 'Sample data added' });
            }}
          >
            <Wand2 className="size-4" /> Sample data
          </Button>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-line px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Pencil className="size-4 text-muted" /> Allow editing plans
            </p>
            <p className="text-xs text-muted">Shows edit, photo and delete on each plan.</p>
          </div>
          <Toggle checked={!!profile.demoEditing} onChange={(v) => void updateProfile({ demoEditing: v })} label="Allow editing plans" />
        </div>

        <div>
          <p className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <Clock className="size-4 text-muted" /> Payment processing time
          </p>
          <p className="mb-3 text-xs text-muted">How long new payments stay pending before they post.</p>
          <div className="grid grid-cols-4 gap-2">
            {PENDING.map((p) => (
              <button
                key={p.s}
                onClick={() => void updateProfile({ pendingSeconds: p.s })}
                className={cn(
                  'rounded-xl border py-2 text-xs font-semibold transition',
                  profile.pendingSeconds === p.s ? 'border-iris-500 bg-iris-500 text-white' : 'border-line hover:border-iris-400',
                )}
              >
                {p.l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-muted" /> Spending power limit
          </p>
          <div className="flex items-start gap-3">
            <Input
              inputMode="numeric"
              icon={<span className="text-[15px] font-bold">$</span>}
              value={power}
              onChange={(e) => setPower(e.target.value.replace(/\D/g, ''))}
              className="min-w-0 flex-1"
              hint={`Currently ${money(profile.spendingPower, true)}`}
            />
            <Button
              variant="secondary"
              disabled={!power || +power === profile.spendingPower}
              onClick={async () => {
                await updateProfile({ spendingPower: +power });
                toast({ tone: 'success', title: 'Spending power updated' });
              }}
            >
              Save
            </Button>
          </div>
        </div>

        <div className="border-t border-line pt-5">
          {confirmReset ? (
            <div className="space-y-3">
              <p className="text-sm text-muted">This deletes all plans, transactions, and payment methods on this account. Your login and settings stay.</p>
              <div className="flex gap-3">
                <Button variant="secondary" block onClick={() => setConfirmReset(false)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  block
                  loading={busy === 'reset'}
                  onClick={async () => {
                    setBusy('reset');
                    await resetData();
                    setBusy('');
                    setConfirmReset(false);
                    toast({ title: 'Account data reset' });
                  }}
                >
                  Reset everything
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" block onClick={() => setConfirmReset(true)}>
              <RotateCcw className="size-4" /> Reset all plans & activity
            </Button>
          )}
          <p className="mt-3 text-center text-xs text-faint">
            {plans.length} plans · {txns.length} transactions
          </p>
        </div>
      </div>
    </Sheet>
  );
}
