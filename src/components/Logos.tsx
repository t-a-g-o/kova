import { Building2 } from 'lucide-react';
import { useState } from 'react';
import { bankByName, logoUrl } from '../lib/brands';
import type { PaymentMethod } from '../lib/types';
import { cn } from '../lib/utils';
import { CARD_THEMES } from './CardVisual';

/** A company logo on a white app-icon tile, falling back to a colored monogram. */
export function LogoTile({
  domain,
  name,
  color = '#6d5bff',
  size = 44,
  className,
  radius = 0.3,
}: {
  domain?: string;
  name: string;
  color?: string;
  size?: number;
  className?: string;
  radius?: number;
}) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size, borderRadius: size * radius };
  if (!domain || failed) {
    return (
      <span className={cn('grid shrink-0 place-items-center font-display font-bold text-white', className)} style={{ ...style, background: color, fontSize: size * 0.42 }}>
        {name.trim()[0]?.toUpperCase() ?? '•'}
      </span>
    );
  }
  return (
    <span className={cn('grid shrink-0 place-items-center overflow-hidden bg-white ring-1 ring-black/5', className)} style={style}>
      <img
        src={logoUrl(domain, size > 64 ? 256 : 128)}
        alt={name}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        onLoad={(e) => e.currentTarget.naturalWidth <= 16 && setFailed(true)}
        style={{ width: size * 0.62, height: size * 0.62 }}
        className="object-contain"
      />
    </span>
  );
}

export function BankLogo({ name, size = 44, className }: { name: string; size?: number; className?: string }) {
  const bank = bankByName(name);
  return <LogoTile domain={bank?.domain} name={name} color={bank?.color} size={size} className={className} />;
}

/** Card network marks drawn inline (no external assets). */
export function NetworkMark({ brand, light = true, height = 28 }: { brand: string; light?: boolean; height?: number }) {
  const ink = light ? '#ffffff' : '#1a1f71';
  switch (brand) {
    case 'Visa':
      return (
        <svg viewBox="0 0 120 40" height={height} aria-label="Visa">
          <text x="60" y="33" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontStyle="italic" fontSize="38" fill={ink} letterSpacing="-1">
            VISA
          </text>
        </svg>
      );
    case 'Mastercard':
      return (
        <svg viewBox="0 0 64 40" height={height} aria-label="Mastercard">
          <circle cx="24" cy="20" r="16" fill="#eb001b" />
          <circle cx="40" cy="20" r="16" fill="#f79e1b" />
          <path d="M32 7.1a16 16 0 0 1 0 25.8 16 16 0 0 1 0-25.8z" fill="#ff5f00" />
        </svg>
      );
    case 'Amex':
      return (
        <svg viewBox="0 0 64 40" height={height} aria-label="American Express">
          <rect width="64" height="40" rx="5" fill="#006fcf" />
          <text x="32" y="18" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="11" fill="#fff">
            AMERICAN
          </text>
          <text x="32" y="31" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="11" fill="#fff">
            EXPRESS
          </text>
        </svg>
      );
    case 'Discover':
      return (
        <svg viewBox="0 0 120 40" height={height} aria-label="Discover">
          <text x="2" y="28" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="22" fill={light ? '#fff' : '#231f20'}>
            DISC
          </text>
          <circle cx="68" cy="20.5" r="9" fill="#ff6000" />
          <text x="78" y="28" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="22" fill={light ? '#fff' : '#231f20'}>
            VER
          </text>
        </svg>
      );
    default:
      return <span className={cn('font-display text-sm font-bold', light ? 'text-white' : 'text-black')}>{brand}</span>;
  }
}

/** Compact icon for a payment method: bank logo, or a tiny card. */
export function MethodIcon({ method, size = 36 }: { method?: PaymentMethod; size?: number }) {
  if (!method) {
    return (
      <span className="grid shrink-0 place-items-center rounded-xl bg-surface-2 text-muted" style={{ width: size, height: size }}>
        <Building2 className="size-4" />
      </span>
    );
  }
  if (method.kind === 'bank') return <BankLogo name={method.institution} size={size} />;
  const theme = CARD_THEMES[method.theme ?? 'midnight'] ?? CARD_THEMES.midnight;
  return (
    <span className="grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <span className={cn('relative flex items-end justify-end overflow-hidden rounded-[5px] p-[3px] shadow-sm ring-1 ring-black/10', theme.bg)} style={{ width: size, height: size * 0.66 }}>
        <NetworkMark brand={method.institution} light={!theme.darkText} height={size * 0.26} />
      </span>
    </span>
  );
}
