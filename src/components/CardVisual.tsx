import { motion } from 'motion/react';
import { bankByName } from '../lib/brands';
import { cn } from '../lib/utils';
import { LogoTile, NetworkMark } from './Logos';

export interface CardTheme {
  name: string;
  bg: string;
  /** Light finishes use dark ink. */
  darkText?: boolean;
}

export const CARD_THEMES: Record<string, CardTheme> = {
  metal: { name: 'Black Metal', bg: 'bg-[repeating-linear-gradient(115deg,rgba(255,255,255,.035)_0_2px,transparent_2px_5px),linear-gradient(135deg,#3a3a3f_0%,#18181b_55%,#09090b_100%)]' },
  platinum: { name: 'Platinum', bg: 'bg-[linear-gradient(135deg,#f1f1f3_0%,#c9cad0_40%,#e9e9ec_60%,#a9abb3_100%)]', darkText: true },
  titanium: { name: 'Titanium', bg: 'bg-[linear-gradient(140deg,#ffffff_0%,#ecebe8_50%,#d9d7d2_100%)]', darkText: true },
  sapphire: { name: 'Sapphire', bg: 'bg-[linear-gradient(135deg,#1f4f9a_0%,#0f2c63_55%,#071736_100%)]' },
  midnight: { name: 'Midnight', bg: 'bg-[linear-gradient(135deg,#2a1f6e_0%,#14102e_60%,#0b0920_100%)]' },
  emerald: { name: 'Emerald', bg: 'bg-[linear-gradient(135deg,#1f7a5a_0%,#0c3f2f_60%,#062419_100%)]' },
  crimson: { name: 'Crimson', bg: 'bg-[linear-gradient(135deg,#c8102e_0%,#7a0a1d_60%,#3d0510_100%)]' },
  gold: { name: 'Gold', bg: 'bg-[linear-gradient(135deg,#f7e3a3_0%,#d4af5a_45%,#a87d2c_100%)]', darkText: true },
  rose: { name: 'Rose Gold', bg: 'bg-[linear-gradient(135deg,#f6d1c4_0%,#e3a593_50%,#b97563_100%)]', darkText: true },
  carbon: { name: 'Carbon', bg: 'bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,.07)_1px,transparent_0),linear-gradient(135deg,#26262b_0%,#0d0d10_100%)] bg-[length:6px_6px,100%_100%]' },
  holo: { name: 'Holographic', bg: 'bg-[conic-gradient(from_200deg_at_70%_30%,#c3b8ff,#8af3d0,#ffd1f0,#a8d8ff,#c3b8ff)]', darkText: true },
  aurora: { name: 'Kova Aurora', bg: 'bg-[linear-gradient(135deg,#6d5bff_0%,#4a34d6_45%,#18c994_120%)]' },
};

export const detectBrand = (num: string) => {
  const n = num.replace(/\D/g, '');
  if (/^3[47]/.test(n)) return 'Amex';
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
  if (/^6/.test(n)) return 'Discover';
  return 'Card';
};

export function CardVisual({
  brand,
  last4,
  number,
  holder,
  expiry,
  theme = 'midnight',
  issuer,
  label,
  flipped,
  cvc,
  className,
}: {
  brand: string;
  last4?: string;
  number?: string;
  holder?: string;
  expiry?: string;
  theme?: string;
  issuer?: string;
  label?: string;
  flipped?: boolean;
  cvc?: string;
  className?: string;
}) {
  const t = CARD_THEMES[theme] ?? CARD_THEMES.midnight;
  const bank = bankByName(issuer);
  const amex = brand === 'Amex';
  const raw = number ? (number.replace(/\D/g, '') + '•'.repeat(16)).slice(0, amex ? 15 : 16) : null;
  const display = raw
    ? amex
      ? `${raw.slice(0, 4)} ${raw.slice(4, 10)} ${raw.slice(10)}`
      : raw.replace(/(.{4})/g, '$1 ').trim()
    : amex
      ? `•••• •••••• •${last4 ?? '••••'}`
      : `•••• •••• •••• ${last4 ?? '••••'}`;
  const ink = t.darkText ? 'text-[#1c1c22]' : 'text-white';
  return (
    <div className={cn('aspect-[1.586] w-full [container-type:inline-size] [perspective:1200px]', className)}>
      <motion.div
        className="relative size-full [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 18 }}
      >
        <div className={cn('absolute inset-0 overflow-hidden rounded-[18px] p-[6%] shadow-[0_24px_44px_-20px_rgba(0,0,0,.65)] ring-1 ring-white/10 [backface-visibility:hidden]', t.bg, ink)}>
          {/* sheen */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_30%,rgba(255,255,255,.18)_45%,transparent_60%)]" />
          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                {bank ? <LogoTile domain={bank.domain} name={bank.name} color={bank.color} size={26} radius={0.25} /> : null}
                <span className="truncate text-[13px] font-semibold tracking-wide opacity-90">{bank?.name ?? 'Debit'}</span>
              </div>
              {label && <span className="shrink-0 text-[10px] font-semibold tracking-[0.18em] uppercase opacity-70">{label}</span>}
            </div>
            {/* EMV chip */}
            <div className="mt-[7%] h-[19%] w-[13%] rounded-[5px] bg-[linear-gradient(135deg,#f5e3a8,#c9a54c_50%,#efd58c)] p-[2px] shadow-inner">
              <div className="size-full rounded-[3px] border border-black/15 bg-[linear-gradient(90deg,transparent_45%,rgba(0,0,0,.15)_45%,rgba(0,0,0,.15)_55%,transparent_55%),linear-gradient(0deg,transparent_45%,rgba(0,0,0,.15)_45%,rgba(0,0,0,.15)_55%,transparent_55%)]" />
            </div>
            <p className="tabular mt-auto font-mono text-[clamp(13px,4.6cqw,19px)] tracking-[0.14em] [text-shadow:0_1px_1px_rgba(0,0,0,.25)]">{display}</p>
            <div className="mt-[4%] flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold tracking-wide uppercase">{holder || 'Your name'}</p>
                <p className="font-mono text-[11px] opacity-70">EXP {expiry || 'MM/YY'}</p>
              </div>
              <NetworkMark brand={brand} light={!t.darkText} height={26} />
            </div>
          </div>
        </div>
        <div className={cn('absolute inset-0 overflow-hidden rounded-[18px] [backface-visibility:hidden] [transform:rotateY(180deg)]', t.bg, ink)}>
          <div className="mt-[9%] h-[18%] bg-black/80" />
          <div className="mx-[6%] mt-[6%] flex items-center gap-3">
            <div className="h-9 flex-1 rounded bg-[repeating-linear-gradient(45deg,#f4f4f4_0_6px,#e6e6e6_6px_12px)]" />
            <div className="grid h-9 w-16 place-items-center rounded bg-white font-mono text-sm font-bold text-black italic">{cvc || '•••'}</div>
          </div>
          <p className="mx-[6%] mt-4 text-[10px] opacity-60">{bank ? `Issued by ${bank.name}.` : ''} Never share your security code.</p>
        </div>
      </motion.div>
    </div>
  );
}
