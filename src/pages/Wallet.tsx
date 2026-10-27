import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Building2, ChevronRight, CreditCard, Landmark, Lock, Plus, Search, ShieldCheck, Star, Trash2, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '../components/AppShell';
import { CARD_THEMES, CardVisual, detectBrand } from '../components/CardVisual';
import { SuccessCheck } from '../components/Celebration';
import { BankLogo, LogoTile } from '../components/Logos';
import { BANKS, bankByName } from '../lib/brands';
import { useToast } from '../components/Toast';
import { Badge, Button, Card, Empty, Input, Row, Segmented, Sheet } from '../components/ui';
import { methodIssue, methodLabel, useData, useNow } from '../lib/store';
import type { PaymentMethod } from '../lib/types';
import { cn, fmtDate } from '../lib/utils';

export function Wallet() {
  const { methods } = useData();
  const now = useNow(1000);
  const [addCard, setAddCard] = useState(false);
  const [addBank, setAddBank] = useState(false);
  const [sel, setSel] = useState<PaymentMethod | null>(null);
  const cards = methods.filter((m) => m.kind === 'card');
  const banks = methods.filter((m) => m.kind === 'bank');

  return (
    <div>
      <PageHeader title="Wallet" subtitle="Where your payments come from." />

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Bank accounts</h2>
          <Button size="sm" variant="secondary" onClick={() => setAddBank(true)}>
            <Plus className="size-4" /> Link bank
          </Button>
        </div>
        <Card className="p-2">
          {banks.length ? (
            banks.map((b, i) => {
              const verifying = !!b.verifiesAt && now < b.verifiesAt;
              return (
                <motion.button
                  key={b.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSel(b)}
                  className="flex w-full items-center gap-3.5 rounded-2xl px-3 py-3 text-left transition hover:bg-surface-2"
                >
                  <BankLogo name={b.institution} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{b.institution}</p>
                    <p className="truncate text-sm text-muted">
                      {b.nickname || (b.accountType === 'savings' ? 'Savings' : 'Checking')} ••{b.last4}
                    </p>
                  </div>
                  {verifying ? (
                    <Badge tone="pending" pulse>
                      Verifying
                    </Badge>
                  ) : b.isDefault ? (
                    <Badge tone="iris">Default</Badge>
                  ) : (
                    <Badge tone="success">Verified</Badge>
                  )}
                  <ChevronRight className="size-4 text-faint" />
                </motion.button>
              );
            })
          ) : (
            <Empty icon={<Landmark />} title="No banks linked" body="Link a bank account to pay with ACH transfer." action={<Button onClick={() => setAddBank(true)}>Link a bank</Button>} />
          )}
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Cards</h2>
          <Button size="sm" variant="secondary" onClick={() => setAddCard(true)}>
            <Plus className="size-4" /> Add card
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((c, i) => (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, y: 20, rotate: -2 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ delay: i * 0.07, type: 'spring', stiffness: 200, damping: 20 }}
              whileHover={{ y: -6, rotate: -1 }}
              onClick={() => setSel(c)}
              className="relative text-left"
            >
              <CardVisual brand={c.institution} last4={c.last4} holder={c.holder} expiry={c.expiry} theme={c.theme} issuer={c.issuer} label={c.nickname} />
              {c.isDefault && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-iris-500 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase shadow">Default</span>
              )}
            </motion.button>
          ))}
          <button
            onClick={() => setAddCard(true)}
            className="grid aspect-[1.586] place-items-center rounded-[22px] border-2 border-dashed border-line text-muted transition hover:border-iris-400 hover:text-iris-500"
          >
            <span className="flex flex-col items-center gap-2 text-sm font-semibold">
              <span className="grid size-11 place-items-center rounded-full bg-surface-2">
                <Plus className="size-5" />
              </span>
              Add a debit or credit card
            </span>
          </button>
        </div>
      </section>

      <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-faint">
        <ShieldCheck className="size-4" /> Kova stores only the last 4 digits of your accounts.
      </p>

      <AddCardSheet open={addCard} onClose={() => setAddCard(false)} />
      <LinkBankSheet open={addBank} onClose={() => setAddBank(false)} />
      <MethodSheet method={sel ? methods.find((m) => m.id === sel.id) ?? null : null} onClose={() => setSel(null)} />
    </div>
  );
}

function MethodSheet({ method, onClose }: { method: PaymentMethod | null; onClose: () => void }) {
  const { setDefaultMethod, removeMethod, plans, methods } = useData();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setConfirm(false), [method?.id]);
  const usedBy = plans.filter((p) => p.methodId === method?.id && p.status === 'active').length;
  const others = methods.filter((m) => m.id !== method?.id);
  const replacement = others.find((m) => m.isDefault) ?? others[0];
  // Removal needs another method that can make payments right away.
  const canRemove = others.some((m) => !methodIssue(m));
  return (
    <Sheet open={!!method} onClose={onClose} title={method ? methodLabel(method) : ''}>
      {method && (
        <div className="space-y-5">
          {method.kind === 'card' ? (
            <CardVisual brand={method.institution} last4={method.last4} holder={method.holder} expiry={method.expiry} theme={method.theme} issuer={method.issuer} label={method.nickname} />
          ) : (
            <div className="flex items-center gap-4 rounded-2xl bg-surface-2 p-5">
              <BankLogo name={method.institution} size={56} />
              <div>
                <p className="font-display text-lg font-bold">{method.institution}</p>
                <p className="text-sm text-muted">
                  {method.accountType === 'savings' ? 'Savings' : 'Checking'} ••{method.last4}
                </p>
              </div>
            </div>
          )}
          <div className="divide-y divide-line">
            <Row label="Nickname" value={method.nickname || '—'} />
            {method.kind === 'bank' && <Row label="Routing" value={`•••••${method.routingLast4 ?? '••••'}`} />}
            {method.kind === 'card' && method.issuer && <Row label="Issuer" value={method.issuer} />}
            {method.kind === 'card' && <Row label="Network" value={method.institution} />}
            {method.kind === 'card' && <Row label="Expires" value={method.expiry} />}
            <Row label="Added" value={fmtDate(method.createdAt)} />
            <Row label="Used by" value={`${usedBy} active plan${usedBy === 1 ? '' : 's'}`} />
          </div>
          {!method.isDefault && (
            <Button
              variant="secondary"
              size="lg"
              block
              onClick={async () => {
                await setDefaultMethod(method.id);
                toast({ tone: 'success', title: 'Default payment method updated' });
              }}
            >
              <Star className="size-4" /> Make default
            </Button>
          )}
          <AnimatePresence mode="wait" initial={false}>
            {!canRemove ? (
              <motion.div key="n" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <Button variant="danger" size="lg" block disabled>
                  <Trash2 className="size-4" /> Remove
                </Button>
                <p className="text-center text-xs text-muted">
                  {others.length ? 'Your other payment methods aren’t ready to use yet. ' : 'This is your only payment method. '}
                  Add another one before removing it.
                </p>
              </motion.div>
            ) : confirm ? (
              <motion.div key="c" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                {usedBy > 0 && (
                  <p className="rounded-xl bg-amber-400/10 px-3 py-2.5 text-sm text-amber-600 dark:text-amber-300">
                    {usedBy} active plan{usedBy === 1 ? ' pays' : 's pay'} from this method.{' '}
                    {replacement && `${usedBy === 1 ? 'It' : 'They'}’ll switch to ${methodLabel(replacement)}.`}
                  </p>
                )}
                <div className="flex gap-3">
                <Button variant="secondary" size="lg" block onClick={() => setConfirm(false)}>
                  Keep
                </Button>
                <Button
                  variant="danger"
                  size="lg"
                  block
                  onClick={async () => {
                    try {
                      await removeMethod(method.id);
                      toast({ title: 'Payment method removed' });
                      onClose();
                    } catch (e) {
                      toast({ tone: 'error', title: (e as Error).message });
                    }
                  }}
                >
                  Remove
                </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Button variant="danger" size="lg" block onClick={() => setConfirm(true)}>
                  <Trash2 className="size-4" /> Remove
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Sheet>
  );
}

const fmtCard = (v: string, amex: boolean) => {
  const d = v.replace(/\D/g, '').slice(0, amex ? 15 : 16);
  return amex ? d.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' ')) : d.replace(/(\d{4})(?=\d)/g, '$1 ');
};

const ISSUERS = BANKS.filter((b) => b.issuer);

/** Luhn checksum — catches typos in card numbers before they reach a processor. */
const luhn = (digits: string) => {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = +digits[digits.length - 1 - i];
    if (i % 2) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
    sum += d;
  }
  return digits.length >= 13 && sum % 10 === 0;
};

/** ABA routing checksum (weights 3-7-1). */
const validRouting = (r: string) =>
  /^\d{9}$/.test(r) && [...r].reduce((sum, d, i) => sum + +d * [3, 7, 1][i % 3], 0) % 10 === 0;

function AddCardSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addMethod, profile, methods } = useData();
  const toast = useToast();
  const [issuer, setIssuer] = useState('Chase');
  const [label, setLabel] = useState('');
  const [num, setNum] = useState('');
  const [holder, setHolder] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [theme, setTheme] = useState('sapphire');
  const [flip, setFlip] = useState(false);
  const [phase, setPhase] = useState<'form' | 'done'>('form');
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIssuer('Chase');
    setLabel('');
    setNum('');
    setHolder(profile.displayName);
    setExp('');
    setCvc('');
    setTheme('sapphire');
    setFlip(false);
    setPhase('form');
    setSaving(false);
    setTouched(false);
  }, [open, profile.displayName]);

  const brand = detectBrand(num);
  const digits = num.replace(/\D/g, '');
  const duplicate = methods.some((m) => m.kind === 'card' && m.institution === brand && m.last4 === digits.slice(-4));
  const validNum = luhn(digits) && !duplicate;
  const [mm, yy] = exp.split('/');
  const expFormat = /^\d{2}\/\d{2}$/.test(exp) && +mm >= 1 && +mm <= 12;
  // A card is good through the last day of its expiry month.
  const expired = expFormat && new Date(2000 + +yy, +mm, 1).getTime() <= Date.now();
  const validExp = expFormat && !expired;
  const validCvc = cvc.length >= (brand === 'Amex' ? 4 : 3);

  const pickIssuer = (name: string) => {
    setIssuer(name);
    const t = bankByName(name)?.cardTheme;
    if (t) setTheme(t);
  };

  const save = async () => {
    setTouched(true);
    if (!validNum || !validExp || !validCvc || !holder.trim()) return;
    setSaving(true);
    await Promise.all([
      addMethod({
        kind: 'card',
        institution: brand,
        issuer,
        nickname: label.trim() || CARD_THEMES[theme].name,
        last4: digits.slice(-4),
        holder: holder.trim(),
        expiry: `${mm}/${yy}`,
        theme,
      }),
      new Promise((r) => setTimeout(r, 900)),
    ]);
    setSaving(false);
    setPhase('done');
    toast({ tone: 'success', title: `${issuer} card ending in ${digits.slice(-4)} added` });
  };

  return (
    <Sheet open={open} onClose={saving ? () => {} : onClose} title={phase === 'form' ? 'Add a card' : ''} hideClose={saving}>
      <AnimatePresence mode="wait" initial={false}>
        {phase === 'form' ? (
          <motion.div key="f" exit={{ opacity: 0 }} className="space-y-4">
            <CardVisual brand={brand} number={num} holder={holder} expiry={exp} theme={theme} issuer={issuer} label={label} flipped={flip} cvc={cvc} />
            <div>
              <p className="mb-2 text-[13px] font-semibold text-muted">Issuer</p>
              <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 pb-1">
                {ISSUERS.map((b) => (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => pickIssuer(b.name)}
                    className={cn(
                      'flex shrink-0 items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-1.5 text-sm font-semibold transition',
                      issuer === b.name ? 'border-iris-500 bg-iris-500/10' : 'border-line text-muted hover:text-ink',
                    )}
                  >
                    <LogoTile domain={b.domain} name={b.name} color={b.color} size={24} radius={0.5} /> {b.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-semibold text-muted">Finish</p>
              <div className="no-scrollbar -mx-6 flex gap-2.5 overflow-x-auto px-6 pt-1 pb-2">
                {Object.entries(CARD_THEMES).map(([key, t]) => (
                  <button key={key} type="button" onClick={() => setTheme(key)} className="flex shrink-0 flex-col items-center gap-1.5">
                    <span className={cn('h-9 w-14 rounded-md ring-offset-2 ring-offset-surface transition', t.bg, theme === key ? 'ring-2 ring-iris-500' : 'ring-1 ring-line')} />
                    <span className={cn('text-[11px] font-semibold', theme === key ? 'text-ink' : 'text-faint')}>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="Card number"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 5678 9012 3456"
              icon={<CreditCard />}
              value={num}
              onChange={(e) => setNum(fmtCard(e.target.value, /^3[47]/.test(e.target.value.replace(/\D/g, ''))))}
              onFocus={() => setFlip(false)}
              error={touched && !validNum ? (duplicate ? 'This card is already in your wallet.' : 'Check your card number.') : undefined}
            />
            <Input
              label="Name on card"
              autoComplete="cc-name"
              icon={<User />}
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              onFocus={() => setFlip(false)}
              error={touched && !holder.trim() ? 'Enter the cardholder name.' : undefined}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Expiry"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                value={exp}
                onFocus={() => setFlip(false)}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setExp(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
                }}
                error={touched && !validExp ? (expired ? 'Card expired' : 'MM/YY') : undefined}
              />
              <Input
                label="CVC"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="123"
                value={cvc}
                onFocus={() => setFlip(true)}
                onBlur={() => setFlip(false)}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                error={touched && !validCvc ? 'Required' : undefined}
              />
            </div>
            <Input label="Card name (optional)" placeholder="e.g. Sapphire Reserve" value={label} onChange={(e) => setLabel(e.target.value)} onFocus={() => setFlip(false)} />
            <Button size="lg" block loading={saving} onClick={save}>
              <Lock className="size-4" /> Add card
            </Button>
            <p className="text-center text-xs text-faint">Your full card number and CVC are never stored.</p>
          </motion.div>
        ) : (
          <motion.div key="d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-8 text-center">
            <SuccessCheck size={76} />
            <h3 className="mt-6 font-display text-2xl font-semibold">Card added</h3>
            <p className="mt-1 text-muted">
              {issuer} {brand} ending in {digits.slice(-4)} is ready to use.
            </p>
            <Button size="lg" block className="mt-7" onClick={onClose}>
              Done
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

function LinkBankSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addMethod } = useData();
  const [phase, setPhase] = useState<'pick' | 'details' | 'done'>('pick');
  const [q, setQ] = useState('');
  const [bank, setBank] = useState('');
  const [type, setType] = useState<'checking' | 'savings'>('checking');
  const [routing, setRouting] = useState('');
  const [acct, setAcct] = useState('');
  const [nick, setNick] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPhase('pick');
    setQ('');
    setBank('');
    setType('checking');
    setRouting('');
    setAcct('');
    setNick('');
    setTouched(false);
    setSaving(false);
  }, [open]);

  const results = BANKS.filter((b) => b.name.toLowerCase().includes(q.toLowerCase()));
  const pick = (name: string) => {
    setBank(name);
    setPhase('details');
  };

  const connect = async () => {
    setTouched(true);
    if (!validRouting(routing) || acct.length < 4) return;
    setSaving(true);
    await Promise.all([
      addMethod({ kind: 'bank', institution: bank, nickname: nick.trim() || (type === 'checking' ? 'Checking' : 'Savings'), last4: acct.slice(-4), routingLast4: routing.slice(-4), accountType: type }),
      new Promise((r) => setTimeout(r, 1200)),
    ]);
    setSaving(false);
    setPhase('done');
  };

  return (
    <Sheet open={open} onClose={saving ? () => {} : onClose} title={phase === 'pick' ? 'Link a bank' : phase === 'details' ? bank : ''} hideClose={saving}>
      <AnimatePresence mode="wait" initial={false}>
        {phase === 'pick' && (
          <motion.div key="p" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <Input placeholder="Search for your bank" icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="grid grid-cols-3 gap-2.5">
              {results.slice(0, q ? 30 : 12).map((b) => (
                <motion.button
                  key={b.name}
                  layout
                  whileTap={{ scale: 0.95 }}
                  onClick={() => pick(b.name)}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-line px-2 py-3.5 text-center transition hover:border-iris-400"
                >
                  <BankLogo name={b.name} size={40} />
                  <span className="text-xs leading-tight font-semibold">{b.name}</span>
                </motion.button>
              ))}
            </div>
            {q && !results.some((r) => r.name.toLowerCase() === q.toLowerCase()) && (
              <button onClick={() => pick(q.trim())} className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-3 text-left text-sm transition hover:border-iris-400">
                <Building2 className="size-5 text-muted" />
                <span>
                  Use <span className="font-semibold">“{q.trim()}”</span>
                </span>
              </button>
            )}
            <p className="flex items-center justify-center gap-2 pt-1 text-xs text-faint">
              <Lock className="size-3.5" /> Bank-level encryption
            </p>
          </motion.div>
        )}

        {phase === 'details' && (
          <motion.div key="d" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
            <div className="flex items-center gap-3">
              <BankLogo name={bank} size={48} />
              <p className="text-sm text-muted">Enter the account you want payments drawn from.</p>
            </div>
            <Segmented value={type} onChange={setType} options={[{ value: 'checking', label: 'Checking' }, { value: 'savings', label: 'Savings' }]} />
            <Input
              label="Routing number"
              inputMode="numeric"
              placeholder="9 digits"
              value={routing}
              onChange={(e) => setRouting(e.target.value.replace(/\D/g, '').slice(0, 9))}
              error={touched && !validRouting(routing) ? (routing.length !== 9 ? 'Routing numbers are 9 digits.' : 'Check your routing number.') : undefined}
            />
            <Input
              label="Account number"
              inputMode="numeric"
              type="password"
              placeholder="Account number"
              value={acct}
              onChange={(e) => setAcct(e.target.value.replace(/\D/g, '').slice(0, 17))}
              error={touched && acct.length < 4 ? 'Enter your account number.' : undefined}
            />
            <Input label="Nickname (optional)" placeholder="e.g. Main checking" value={nick} onChange={(e) => setNick(e.target.value)} />
            <div className="flex gap-3">
              <Button variant="secondary" size="lg" onClick={() => setPhase('pick')} aria-label="Back" disabled={saving}>
                <ArrowLeft className="size-5" />
              </Button>
              <Button size="lg" block loading={saving} onClick={connect}>
                <Lock className="size-4" /> Link account
              </Button>
            </div>
          </motion.div>
        )}

        {phase === 'done' && (
          <motion.div key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-8 text-center">
            <SuccessCheck size={76} />
            <h3 className="mt-6 font-display text-2xl font-semibold">Account linked</h3>
            <p className="mt-1 text-muted">
              {bank} ••{acct.slice(-4)} will be ready to use once it’s verified.
            </p>
            <Button size="lg" block className="mt-7" onClick={onClose}>
              Done
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}
