import { motion } from 'motion/react';
import { useId } from 'react';
import { cn } from '../lib/utils';

export function LogoMark({ size = 36, className, animated }: { size?: number; className?: string; animated?: boolean }) {
  const gid = `kova-g-${useId().replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8B7BFF" />
          <stop offset="1" stopColor="#5B45F5" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="128" fill={`url(#${gid})`} />
      <circle cx="256" cy="256" r="128" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="44" />
      <motion.path
        d="M256 128 A128 128 0 1 1 128 256"
        fill="none"
        stroke="#fff"
        strokeWidth="44"
        strokeLinecap="round"
        initial={animated ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      />
      <motion.circle
        cx="256"
        cy="256"
        r="34"
        fill="#3EE6B0"
        initial={animated ? { scale: 0 } : false}
        animate={{ scale: 1 }}
        style={{ transformOrigin: '256px 256px' }}
        transition={{ type: 'spring', stiffness: 400, damping: 14, delay: 1 }}
      />
    </svg>
  );
}

export function Logo({ size = 32, className, animated, wordClass }: { size?: number; className?: string; animated?: boolean; wordClass?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} animated={animated} />
      <span className={cn('font-extrabold tracking-tight [font-family:var(--font-brand)]', wordClass)} style={{ fontSize: size * 0.72 }}>
        kova
      </span>
    </span>
  );
}
