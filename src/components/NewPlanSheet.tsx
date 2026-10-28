import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, CalendarDays, Camera, Check, Link2, Percent, Search, Sparkles, Store, Tag, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { brandById, brandForName, type Brand } from '../lib/brands';
import { brandsMatching, parseProductLink, searchCatalog, type CatalogHit } from '../lib/catalog';
import { buildSchedule, quote } from '../lib/finance';
import { methodIssue, methodLabel, useData, usePlayful } from '../lib/store';
import type { Category, Plan, PlanType } from '../lib/types';
import { cn, fmtDate, fmtShort, money, round2 } from '../lib/utils';
import { SuccessCheck } from './Celebration';
import { LogoTile, MethodIcon } from './Logos';
import { CATEGORIES, PlanThumb } from './PlanThumb';
import { Button, Input, Row, Sheet, Toggle } from './ui';

type Step = 'item' | 'plan' | 'timing' | 'review' | 'approving' | 'approved';
const ORDER: Step[] = ['item', 'plan', 'timing', 'review'];
const TERMS = [3, 6, 12, 18, 24, 36, 48];

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const parseDate = (s: string) => {
  if (s === todayStr()) return Date.now();
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12).getTime();
};
const num = (s: string) => Math.max(0, parseFloat(s.replace(/[^0-9.]/g, '')) || 0);
const looksLikeUrl = (s: string) => /^(https?:\/\/)?[\w-]+(\.[\w-]+)+\/\S*/i.test(s.trim());

/** Downscales a photo so it fits comfortably inside a Firestore document. */
export function resizeImage(file: File, max = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function PhotoButton({ onPhoto, label = 'Add photo', className }: { onPhoto: (dataUrl: string) => void; label?: string; className?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) onPhoto(await resizeImage(f));
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={cn('inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-iris-400 hover:text-ink', className)}
      >
        <Camera className="size-3.5" /> {label}
      </button>
    </>
  );
}

export function NewPlanSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addPlan, methods, defaultMethod, available } = useData();
  const nav = useNavigate();
  const [step, setStep] = useState<Step>('item');
  const [dir, setDir] = useState(1);
  const [touched, setTouched] = useState(false);

  const [query, setQuery] = useState('');
  const [source, setSource] = useState<string | null>(null);
  const [brandId, setBrandId] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [merchant, setMerchant] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<Category>('watches');
  const [imageUrl, setImageUrl] = useState('');
  const [type, setType] = useState<PlanType>('monthly');
  const [term, setTerm] = useState(12);
  const [apr, setApr] = useState('0');
  const [down, setDown] = useState('');
  const [start, setStart] = useState(todayStr());
  const [backfill, setBackfill] = useState(true);
  const [autopay, setAutopay] = useState(true);
  const [methodId, setMethodId] = useState<string | undefined>();
  const [agreed, setAgreed] = useState(false);
  const playful = usePlayful();
  const [failed, setFailed] = useState<string | null>(null);
  const [created, setCreated] = useState<Plan | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep('item');
    setTouched(false);
    setQuery('');
    setSource(null);
    setBrandId(undefined);
    setName('');
    setMerchant('');
    setPrice('');
    setCategory('watches');
    setImageUrl('');
    setType('monthly');
    setTerm(12);
    setApr('0');
    setDown('');
    setStart(todayStr());
    setBackfill(true);
    setAutopay(true);
    setAgreed(false);
    setFailed(null);
    setCreated(null);
  }, [open]);

  const usableIds = methods.filter((m) => methodIssue(m) !== 'Expired').map((m) => m.id);
  const firstUsable = usableIds.includes(defaultMethod?.id ?? '') ? defaultMethod?.id : usableIds[0];
  useEffect(() => setMethodId(firstUsable), [firstUsable, open]);
  // AutoPay can't run without somewhere to pull money from.
  const autopayOn = autopay && !!methodId;

  const isLink = looksLikeUrl(query);
  const hits = useMemo(() => (isLink ? [] : searchCatalog(query, 6)), [query, isLink]);
  const brandHits = useMemo(() => (isLink ? [] : brandsMatching(query).slice(0, 3)), [query, isLink]);
  const link = useMemo(() => (isLink ? parseProductLink(query) : null), [query, isLink]);

  const applyHit = (h: CatalogHit, via: string) => {
    setBrandId(h.brand.id);
    setName(h.item.ref ? `${h.item.name} ${h.item.ref}`.replace(/\s+/g, ' ') : h.item.name);
    setMerchant(h.brand.store ?? h.brand.name);
    setPrice(String(h.item.price));
    setCategory(h.item.category ?? h.brand.category);
    setSource(via);
    setQuery('');
    setTouched(false);
  };
  const applyBrand = (b: Brand) => {
    setBrandId(b.id);
    setMerchant(b.store ?? b.name);
    setCategory(b.category);
    setSource(`${b.name}`);
    setQuery('');
  };
  const applyLink = () => {
    if (!link) return;
    if (link.match) {
      applyHit(link.match, link.host);
      if (link.store) setMerchant(link.store.name);
      return;
    }
    if (link.brand) {
      setBrandId(link.brand.id);
      setMerchant(link.brand.store ?? link.brand.name);
      setCategory(link.brand.category);
    } else {
      setMerchant(link.host.split('.').slice(-2, -1)[0].replace(/^\w/, (c) => c.toUpperCase()));
    }
    if (link.name) setName(link.name);
    setSource(link.host);
    setQuery('');
  };

  const priceN = num(price);
  const downN = Math.min(num(down), priceN * 0.9);
  const aprN = Math.min(99, num(apr));
  const resolvedBrand = brandId ?? brandForName(merchant)?.id;
  const draft: Plan = useMemo(
    () => ({
      id: 'draft',
      name: name.trim() || 'Your item',
      merchant: merchant.trim() || 'Store',
      category,
      brand: resolvedBrand,
      imageUrl: imageUrl.trim() || undefined,
      price: round2(priceN),
      downPayment: type === 'monthly' ? round2(downN) : 0,
      apr: type === 'monthly' ? aprN : 0,
      type,
      installments: type === 'pay4' ? 4 : term,
      startDate: parseDate(start),
      createdAt: Date.now(),
      status: 'active',
      autopay: autopayOn,
      methodId,
      orderNumber: '',
    }),
    [name, merchant, category, resolvedBrand, imageUrl, priceN, downN, aprN, type, term, start, autopayOn, methodId],
  );
  const q = quote(draft.price, type, draft.installments, draft.apr, draft.downPayment);
  const schedule = useMemo(() => buildSchedule(draft), [draft]);
  const past = schedule.filter((i) => i.dueDate < Date.now() - 10 * 60_000);
  const pastTotal = past.reduce((s, i) => s + i.amount, 0);
  // What this plan adds to the outstanding balance once created (past and checkout payments excluded).
  const paidAtStart = schedule
    .filter((i) => i.dueDate <= Date.now() && (backfill || i.dueDate - draft.startDate < 5 * 60_000))
    .reduce((s, i) => s + i.amount, 0);
  const needed = round2(Math.max(0, q.total - paidAtStart));
  const overLimit = needed > available + 0.005;
  // A purchase made today with a down payment (or Pay in 4's first installment) has to be charged somewhere.
  const dueToday = round2(
    schedule.filter((i) => i.dueDate - draft.startDate < 5 * 60_000 && Date.now() - i.dueDate < 10 * 60_000).reduce((s, i) => s + i.amount, 0),
  );
  const needsMethod = dueToday > 0 && !methodId;

  const go = (s: Step) => {
    setDir(ORDER.indexOf(s) >= ORDER.indexOf(step) ? 1 : -1);
    setStep(s);
  };

  const itemValid = name.trim() && merchant.trim() && priceN >= 50;

  const submit = async () => {
    setDir(1);
    setStep('approving');
    setFailed(null);
    const { id: _id, createdAt: _c, status: _s, orderNumber: _o, ...input } = draft;
    try {
      const [plan] = await Promise.all([addPlan(input, backfill), new Promise((r) => setTimeout(r, 1400))]);
      setCreated(plan);
      setStep('approved');
    } catch (e) {
      setFailed(e instanceof Error ? e.message : 'We couldn’t create this plan. Please try again.');
      setStep('review');
    }
  };

  const nextAfterCreate = schedule.find((i) => i.dueDate > Date.now() + 10 * 60_000);
  const idx = ORDER.indexOf(step);
  const title = idx >= 0 ? ['What are you buying?', 'Choose your plan', 'Timing & payment', 'Review'][idx] : '';
  const showResults = query.trim().length > 0;

  return (
    <Sheet open={open} onClose={onClose} title={title} wide hideClose={step === 'approving'}>
      {idx >= 0 && (
        <div className="mb-5 flex gap-1.5">
          {ORDER.map((s, i) => (
            <div key={s} className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
              <motion.div className="h-full bg-iris-500" initial={false} animate={{ width: i <= idx ? '100%' : '0%' }} transition={{ duration: 0.4 }} />
            </div>
          ))}
        </div>
      )}
      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: dir * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -40 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === 'item' && (
            <div className="space-y-4">
              <div className="relative">
                <Input
                  placeholder="Search Rolex, Birkin, Love bracelet… or paste a link"
                  icon={isLink ? <Link2 /> : <Search />}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  suffix={
                    query && (
                      <button type="button" onClick={() => setQuery('')} className="text-faint hover:text-ink" aria-label="Clear">
                        <X className="size-4" />
                      </button>
                    )
                  }
                />
                <AnimatePresence>
                  {showResults && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="mt-2 overflow-hidden rounded-2xl border border-line bg-surface"
                    >
                      {link ? (
                        <button type="button" onClick={applyLink} className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-surface-2">
                          {link.brand ? <LogoTile domain={link.brand.domain} name={link.brand.name} size={40} /> : <LogoTile domain={link.host} name={link.host} size={40} />}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{link.match ? link.match.item.name : link.name ?? 'Product link'}</p>
                            <p className="truncate text-xs text-muted">
                              {link.brand?.name ?? link.host}
                              {link.store && link.store.id !== link.brand?.id ? ` via ${link.store.name}` : ''}
                              {link.match ? ` · ${money(link.match.item.price, true)}` : ' · add the price you paid'}
                            </p>
                          </div>
                          <span className="rounded-full bg-iris-500 px-3 py-1 text-xs font-bold text-white">Import</span>
                        </button>
                      ) : hits.length || brandHits.length ? (
                        <div className="max-h-72 overflow-y-auto py-1">
                          {brandHits.map((b) => (
                            <button key={b.id} type="button" onClick={() => applyBrand(b)} className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-surface-2">
                              <LogoTile domain={b.domain} name={b.name} color={b.color} size={36} />
                              <span className="flex-1 text-sm">
                                Shop at <span className="font-semibold">{b.name}</span>
                              </span>
                              <ArrowRight className="size-4 text-faint" />
                            </button>
                          ))}
                          {hits.map((h) => (
                            <button
                              key={h.brand.id + h.item.name}
                              type="button"
                              onClick={() => applyHit(h, 'Kova catalog')}
                              className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-surface-2"
                            >
                              <LogoTile domain={h.brand.domain} name={h.brand.name} color={h.brand.color} size={36} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold">{h.item.name}</p>
                                <p className="truncate text-xs text-muted">
                                  {h.brand.name}
                                  {h.item.ref && ` · ${h.item.ref}`}
                                </p>
                              </div>
                              <span className="tabular text-sm font-semibold">{money(h.item.price, true)}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="px-4 py-3 text-sm text-muted">No catalog match. Enter the details below.</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-4 rounded-2xl bg-surface-2 p-4">
                <PlanThumb plan={draft} size={72} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{draft.name}</p>
                  <p className="truncate text-sm text-muted">{draft.merchant}</p>
                  <p className="tabular font-display text-lg font-bold">{money(priceN)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <PhotoButton onPhoto={setImageUrl} label={imageUrl ? 'Change' : 'Photo'} />
                  {imageUrl && (
                    <button type="button" onClick={() => setImageUrl('')} className="text-xs font-semibold text-faint hover:text-ink">
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <AnimatePresence>
                {source && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="-mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <Sparkles className="size-3.5 text-iris-500" /> Filled in from {source}. Prices are estimated retail, so adjust to what you paid.
                  </motion.p>
                )}
              </AnimatePresence>

              <Input label="Item" placeholder="e.g. Cuban link chain, 14k" icon={<Tag />} value={name} onChange={(e) => setName(e.target.value)} error={touched && !name.trim() ? 'Name your item.' : undefined} />
              <Input
                label="Store"
                placeholder="Where you bought it"
                icon={brandById(resolvedBrand) ? <span className="block size-[18px] overflow-hidden rounded"><LogoTile domain={brandById(resolvedBrand)!.domain} name={merchant} size={18} radius={0.2} /></span> : <Store />}
                value={merchant}
                onChange={(e) => {
                  setMerchant(e.target.value);
                  setBrandId(undefined);
                }}
                error={touched && !merchant.trim() ? 'Add the store name.' : undefined}
              />
              <Input
                label="Price"
                inputMode="decimal"
                placeholder="0.00"
                icon={<span className="text-[15px] font-bold">$</span>}
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, ''))}
                error={touched && priceN < 50 ? 'Plans start at $50.' : undefined}
              />
              <div>
                <p className="mb-2 text-[13px] font-semibold text-muted">Category</p>
                <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 pb-1">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className={cn(
                        'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition',
                        category === c.value ? 'border-iris-500 bg-iris-500/10 text-ink' : 'border-line text-muted hover:text-ink',
                      )}
                    >
                      <c.icon className="size-4" /> {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                block
                size="lg"
                onClick={() => {
                  setTouched(true);
                  if (itemValid) go('plan');
                }}
              >
                Continue <ArrowRight className="size-5" />
              </Button>
            </div>
          )}

          {step === 'plan' && (
            <div className="space-y-3">
              <PlanOption
                selected={type === 'pay4'}
                onClick={() => setType('pay4')}
                title={`4 payments of ${money(quote(priceN, 'pay4', 4, 0, 0).perInstallment)}`}
                sub="Every 2 weeks · first payment today"
                badge="0% APR"
              />
              <PlanOption
                selected={type === 'monthly'}
                onClick={() => setType('monthly')}
                title={`${money(quote(priceN, 'monthly', term, aprN, downN).perInstallment)}/mo for ${term} months`}
                sub={aprN > 0 ? `${aprN}% APR · ${money(quote(priceN, 'monthly', term, aprN, downN).interest)} interest` : '0% APR · no interest'}
                badge="Monthly"
              />
              <AnimatePresence initial={false}>
                {type === 'monthly' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="space-y-4 pt-2">
                      <div>
                        <p className="mb-2 text-[13px] font-semibold text-muted">Term</p>
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                          {TERMS.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setTerm(t)}
                              className={cn('rounded-xl border py-2.5 text-sm font-bold transition', term === t ? 'border-iris-500 bg-iris-500 text-white' : 'border-line hover:border-iris-400')}
                            >
                              {t}
                              <span className="block text-[10px] font-semibold opacity-70">mo</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input label="APR" inputMode="decimal" icon={<Percent />} value={apr} onChange={(e) => setApr(e.target.value.replace(/[^0-9.]/g, ''))} />
                        <Input label="Down payment" inputMode="decimal" placeholder="0" icon={<span className="text-[15px] font-bold">$</span>} value={down} onChange={(e) => setDown(e.target.value.replace(/[^0-9.]/g, ''))} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="rounded-2xl bg-surface-2 px-4 py-1">
                <Row label="Purchase price" value={money(priceN)} />
                <Row label="Interest" value={money(q.interest)} />
                <Row label="Total of payments" value={<span className="font-display">{money(q.total)}</span>} className="border-t border-line" />
              </div>
              <SpendingPower needed={needed} available={available} />
              <div className="flex gap-3 pt-1">
                <Button variant="secondary" size="lg" onClick={() => go('item')} aria-label="Back">
                  <ArrowLeft className="size-5" />
                </Button>
                <Button size="lg" block disabled={overLimit} onClick={() => go('timing')}>
                  Continue <ArrowRight className="size-5" />
                </Button>
              </div>
            </div>
          )}

          {step === 'timing' && (
            <div className="space-y-4">
              <Input
                label="Purchase date"
                type="date"
                max={todayStr()}
                icon={<CalendarDays />}
                value={start}
                onChange={(e) => setStart(e.target.value || todayStr())}
                hint="Bought it a while ago? Backdate it and Kova builds your payment history."
              />
              <ToggleRow
                title="Record past payments"
                body={past.length ? `${past.length} payment${past.length > 1 ? 's' : ''} (${money(pastTotal)}) will be marked as paid.` : 'Nothing due before today.'}
                checked={backfill}
                onChange={setBackfill}
              />
              <ToggleRow
                title="AutoPay"
                body={methodId ? 'Pay each installment automatically on its due date.' : 'Add a bank or card in Wallet to turn on AutoPay.'}
                checked={autopayOn}
                onChange={(v) => methodId && setAutopay(v)}
              />
              <div>
                <p className="mb-2 text-[13px] font-semibold text-muted">Pay with</p>
                {methods.length ? (
                  <div className="space-y-2">
                    {methods.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        disabled={!usableIds.includes(m.id)}
                        onClick={() => setMethodId(m.id)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
                          methodId === m.id ? 'border-iris-500 bg-iris-500/5' : 'border-line hover:border-iris-400',
                        )}
                      >
                        <MethodIcon method={m} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{methodLabel(m)}</span>
                          <span className="block text-xs text-muted">{usableIds.includes(m.id) ? m.nickname : 'Expired'}</span>
                        </span>
                        <span className={cn('grid size-5 place-items-center rounded-full border-2 transition', methodId === m.id ? 'border-iris-500 bg-iris-500 text-white' : 'border-line')}>
                          {methodId === m.id && <Check className="size-3" strokeWidth={3.5} />}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className={cn('rounded-2xl px-4 py-3 text-sm', needsMethod ? 'bg-rose-500/10 text-rose-500' : 'bg-surface-2 text-muted')}>
                    {needsMethod
                      ? `${money(dueToday)} is due today. Add a bank or card in Wallet before confirming this plan.`
                      : 'No payment methods yet. You can still create the plan and pay manually once you add a bank or card in Wallet.'}
                  </p>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="secondary" size="lg" onClick={() => go('plan')} aria-label="Back">
                  <ArrowLeft className="size-5" />
                </Button>
                <Button size="lg" block disabled={needsMethod} onClick={() => go('review')}>
                  Review <ArrowRight className="size-5" />
                </Button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <PlanThumb plan={draft} size={60} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{draft.name}</p>
                  <p className="text-sm text-muted">{draft.merchant}</p>
                </div>
                <p className="tabular ml-auto font-display text-lg font-bold">{money(draft.price)}</p>
              </div>
              <div className="rounded-2xl bg-surface-2 px-4 py-1">
                <Row label="Plan" value={type === 'pay4' ? 'Pay in 4' : `${term} months`} />
                <Row label="Each payment" value={money(q.perInstallment)} />
                {draft.downPayment > 0 && <Row label="Down payment" value={money(draft.downPayment)} />}
                <Row label="First payment" value={schedule[0] ? (schedule[0].dueDate <= Date.now() + 60_000 ? 'Today' : fmtDate(schedule[0].dueDate)) : '—'} />
                <Row label="AutoPay" value={autopayOn ? `On · ${methodLabel(methods.find((m) => m.id === methodId))}` : 'Off'} />
              </div>
              {/* Truth in Lending-style box: the four numbers an installment loan shows up front. */}
              <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-line sm:grid-cols-4">
                {[
                  { l: 'APR', v: `${draft.apr.toFixed(2)}%`, h: 'Yearly cost of credit' },
                  { l: 'Finance charge', v: money(q.interest), h: 'Interest you’ll pay' },
                  { l: 'Amount financed', v: money(q.financed), h: 'Credit provided' },
                  { l: 'Total of payments', v: money(q.total), h: 'Paid when complete' },
                ].map((c, i) => (
                  <div key={c.l} className={cn('p-3', i % 2 === 1 && 'border-l border-line', i >= 2 && 'border-t border-line sm:border-t-0', i === 2 && 'sm:border-l')}>
                    <p className="text-[11px] font-semibold tracking-wide text-faint uppercase">{c.l}</p>
                    <p className="tabular mt-0.5 font-display font-bold">{c.v}</p>
                    <p className="text-[11px] text-muted">{c.h}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-2 text-[13px] font-semibold text-muted">Schedule</p>
                <div className="space-y-1.5">
                  {schedule.slice(0, 4).map((i) => (
                    <div key={i.index} className="flex items-center justify-between px-1 text-sm">
                      <span className="flex items-center gap-2.5 text-muted">
                        <span className={cn('size-2 rounded-full', backfill && past.includes(i) ? 'bg-mint-400' : 'bg-faint/50')} />
                        {i.kind === 'down' ? 'Due today' : fmtShort(i.dueDate)}
                      </span>
                      <span className="tabular font-semibold">{money(i.amount)}</span>
                    </div>
                  ))}
                  {schedule.length > 4 && <p className="px-1 text-xs text-faint">+ {schedule.length - 4} more payments</p>}
                </div>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-2 p-4 text-xs leading-relaxed text-muted">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-iris-500" />
                {playful ? (
                  <span>
                    I agree to admire the payment schedule above without paying a single real cent
                    {autopayOn
                      ? `, and to let AutoPay pretend to charge ${methodLabel(methods.find((m) => m.id === methodId))} on each due date. It can’t actually take my money, no matter how hard it tries.`
                      : '.'}
                  </span>
                ) : (
                  <span>
                    I agree to the payment schedule above and the Kova Loan Agreement, including the Truth in Lending disclosures
                    {autopayOn
                      ? `. I authorize Kova to automatically charge ${methodLabel(methods.find((m) => m.id === methodId))} for each installment on its due date until this plan is paid in full or I turn off AutoPay.`
                      : '. I understand that payments not made by their due date may limit my ability to use Kova.'}
                  </span>
                )}
              </label>
              {failed && (
                <p role="alert" className="rounded-xl bg-rose-500/10 px-3 py-2.5 text-sm text-rose-500">
                  {failed}
                </p>
              )}
              <div className="flex gap-3">
                <Button variant="secondary" size="lg" onClick={() => go('timing')} aria-label="Back">
                  <ArrowLeft className="size-5" />
                </Button>
                <Button size="lg" block disabled={!agreed || overLimit} onClick={submit}>
                  Confirm plan
                </Button>
              </div>
            </div>
          )}

          {step === 'approving' && (
            <div className="flex flex-col items-center py-16 text-center">
              <motion.span className="size-12 rounded-full border-[3px] border-iris-500/20 border-t-iris-500" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} />
              <p className="mt-6 font-semibold">Confirming your plan…</p>
              <p className="mt-1 text-sm text-muted">This only takes a few seconds.</p>
            </div>
          )}

          {step === 'approved' && created && (
            <div className="flex flex-col items-center py-6 text-center">
              <SuccessCheck size={80} />
              <motion.h3 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-7 font-display text-2xl font-semibold">
                You’re all set
              </motion.h3>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="mt-2 text-muted">
                Your plan for {created.name} is active.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="mt-6 w-full rounded-2xl bg-surface-2 px-4 py-1 text-left">
                <Row label="Order" value={<span className="font-mono text-[13px]">{created.orderNumber}</span>} />
                <Row label="Each payment" value={money(q.perInstallment)} />
                {nextAfterCreate && <Row label="Next payment due" value={fmtDate(nextAfterCreate.dueDate)} />}
                <Row label="AutoPay" value={created.autopay ? 'On' : 'Off'} />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="mt-6 w-full">
                <Button
                  size="lg"
                  block
                  onClick={() => {
                    onClose();
                    nav(`/plans/${created.id}`);
                  }}
                >
                  View plan
                </Button>
              </motion.div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Sheet>
  );
}

function PlanOption({ selected, onClick, title, sub, badge }: { selected: boolean; onClick: () => void; title: string; sub: string; badge: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('relative flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition', selected ? 'border-iris-500 bg-iris-500/5' : 'border-line hover:border-iris-400/60')}
    >
      <span className={cn('grid size-6 shrink-0 place-items-center rounded-full border-2 transition', selected ? 'border-iris-500 bg-iris-500 text-white' : 'border-line')}>
        {selected && <Check className="size-3.5" strokeWidth={3.5} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="tabular block font-display font-bold">{title}</span>
        <span className="block text-sm text-muted">{sub}</span>
      </span>
      <span className="rounded-full bg-mint-400/15 px-2.5 py-1 text-xs font-bold text-mint-600 dark:text-mint-400">{badge}</span>
    </button>
  );
}

function SpendingPower({ needed, available }: { needed: number; available: number }) {
  const over = needed > available + 0.005;
  return (
    <div className={cn('rounded-2xl border px-4 py-3 text-sm', over ? 'border-rose-500/30 bg-rose-500/10' : 'border-line')}>
      <div className="flex items-center justify-between gap-3">
        <span className={over ? 'font-semibold text-rose-500' : 'text-muted'}>{over ? 'Over your spending power' : 'Spending power after this plan'}</span>
        <span className="tabular font-semibold">{money(over ? available : available - needed)}</span>
      </div>
      {over && (
        <p className="mt-1 text-xs text-muted">
          This plan needs {money(needed)} and you have {money(available)} available. Try a down payment or a lower price, or pay down another plan first.
        </p>
      )}
    </div>
  );
}

function ToggleRow({ title, body, checked, onChange }: { title: string; body: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted">{body}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  );
}
