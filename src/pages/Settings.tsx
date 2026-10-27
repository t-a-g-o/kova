import { Clock, Cloud, Database, Download, HardDrive, LogOut, Moon, Palette, RotateCcw, Sparkles, User, Wand2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Avatar, PageHeader } from '../components/AppShell';
import { useToast } from '../components/Toast';
import { Button, Card, Input, Segmented, Sheet } from '../components/ui';
import { useAuth } from '../lib/auth';
import { firebaseEnabled } from '../lib/firebase';
import { useData } from '../lib/store';
import type { ThemePref } from '../lib/types';
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

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2.5 font-display font-bold">
        <span className="grid size-8 place-items-center rounded-xl bg-iris-500/10 text-iris-500 [&>svg]:size-4">{icon}</span>
        {title}
      </h2>
      {children}
    </Card>
  );
}

export function Settings() {
  const { user, signOut, rename } = useAuth();
  const { profile, updateProfile, plans, txns, methods, loadSample, resetData } = useData();
  const toast = useToast();
  const [name, setName] = useState(profile.displayName);
  const [power, setPower] = useState(String(profile.spendingPower));
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState('');

  useEffect(() => setName(profile.displayName), [profile.displayName]);
  useEffect(() => setPower(String(profile.spendingPower)), [profile.spendingPower]);

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ profile, plans, txns, methods }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kova-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <PageHeader title="Settings" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Section icon={<User />} title="Profile">
            <div className="mb-5 flex items-center gap-4">
              <Avatar name={profile.displayName || user?.displayName || ''} size={60} />
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-bold">{profile.displayName}</p>
                <p className="truncate text-sm text-muted">{user?.email}</p>
                <p className="text-xs text-faint">Member since {fmtDate(profile.memberSince, { month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            <div className="flex items-end gap-3">
              <Input label="Display name" value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1" />
              <Button
                variant="secondary"
                disabled={!name.trim() || name === profile.displayName}
                onClick={async () => {
                  await Promise.all([updateProfile({ displayName: name.trim() }), rename(name.trim())]);
                  toast({ tone: 'success', title: 'Name updated' });
                }}
              >
                Save
              </Button>
            </div>
          </Section>

          <Section icon={<Palette />} title="Appearance">
            <Segmented<ThemePref>
              value={profile.theme}
              onChange={(t) => void updateProfile({ theme: t })}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: <span className="inline-flex items-center gap-1.5"><Moon className="size-3.5" /> Dark</span> },
                { value: 'system', label: 'System' },
              ]}
            />
          </Section>

          <Section icon={<Sparkles />} title="Account limits">
            <div className="flex items-end gap-3">
              <Input
                label="Spending power"
                inputMode="numeric"
                icon={<span className="text-[15px] font-bold">$</span>}
                value={power}
                onChange={(e) => setPower(e.target.value.replace(/\D/g, ''))}
                className="min-w-0 flex-1"
                hint={`Currently ${money(profile.spendingPower, true)}`}
              />
              <Button
                variant="secondary"
                className="mb-6"
                disabled={!power || +power === profile.spendingPower}
                onClick={async () => {
                  await updateProfile({ spendingPower: +power });
                  toast({ tone: 'success', title: 'Spending power updated' });
                }}
              >
                Save
              </Button>
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <Section icon={<Clock />} title="Payment processing time">
            <p className="mb-3 text-sm text-muted">How long new payments stay pending before they post.</p>
            <div className="grid grid-cols-4 gap-2">
              {PENDING.map((p) => (
                <button
                  key={p.s}
                  onClick={() => void updateProfile({ pendingSeconds: p.s })}
                  className={cn(
                    'rounded-xl border py-2.5 text-sm font-semibold transition',
                    profile.pendingSeconds === p.s ? 'border-iris-500 bg-iris-500 text-white' : 'border-line hover:border-iris-400',
                  )}
                >
                  {p.l}
                </button>
              ))}
            </div>
          </Section>

          <Section icon={<Database />} title="Data">
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3">
              {firebaseEnabled ? <Cloud className="size-5 text-mint-500" /> : <HardDrive className="size-5 text-amber-400" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{firebaseEnabled ? 'Synced with Firebase' : 'Demo mode'}</p>
                <p className="text-xs text-muted">{firebaseEnabled ? 'Your data syncs across devices.' : 'Data is saved in this browser only. Add Firebase keys to sync.'}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                <Wand2 className="size-4" /> Load sample data
              </Button>
              <Button variant="secondary" onClick={exportData}>
                <Download className="size-4" /> Export JSON
              </Button>
              <Button variant="danger" className="sm:col-span-2" onClick={() => setConfirmReset(true)}>
                <RotateCcw className="size-4" /> Reset all plans & activity
              </Button>
            </div>
          </Section>

          <Button variant="outline" size="lg" block onClick={() => void signOut()}>
            <LogOut className="size-4" /> Sign out
          </Button>
          <p className="text-center text-xs text-faint">Kova v1.0 · {plans.length} plans · {txns.length} transactions</p>
        </div>
      </div>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset everything?">
        <p className="text-muted">This deletes all plans, transactions, and payment methods on this account. Your login and settings stay.</p>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" size="lg" block onClick={() => setConfirmReset(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="lg"
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
            Reset
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
