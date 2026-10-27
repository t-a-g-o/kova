import { Car, Footprints, Frame, Gem, Laptop, Package, Plane, ShoppingBag, Sofa, Watch, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { brandById, logoUrl } from '../lib/brands';
import type { Category, Plan } from '../lib/types';
import { cn } from '../lib/utils';

export const CATEGORIES: { value: Category; label: string; icon: LucideIcon }[] = [
  { value: 'watches', label: 'Watches', icon: Watch },
  { value: 'jewelry', label: 'Jewelry', icon: Gem },
  { value: 'fashion', label: 'Bags & fashion', icon: ShoppingBag },
  { value: 'sneakers', label: 'Shoes', icon: Footprints },
  { value: 'tech', label: 'Tech', icon: Laptop },
  { value: 'art', label: 'Art', icon: Frame },
  { value: 'auto', label: 'Auto', icon: Car },
  { value: 'home', label: 'Home', icon: Sofa },
  { value: 'travel', label: 'Travel', icon: Plane },
  { value: 'other', label: 'Other', icon: Package },
];

export const catMeta = (c: Category) => CATEGORIES.find((x) => x.value === c) ?? CATEGORIES[CATEGORIES.length - 1];

type ThumbPlan = Pick<Plan, 'imageUrl' | 'category' | 'name'> & { brand?: string };

/**
 * Product artwork: the user's photo, else the brand's mark, else a category icon.
 */
export function PlanThumb({ plan, size = 48, className }: { plan: ThumbPlan; size?: number; className?: string }) {
  const [photoBroken, setPhotoBroken] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);
  const brand = brandById(plan.brand);
  const radius = { borderRadius: Math.round(size * 0.28) };
  const box = cn('relative grid shrink-0 place-items-center overflow-hidden', className);

  if (plan.imageUrl && !photoBroken) {
    return (
      <div className={cn(box, 'bg-white')} style={{ width: size, height: size, ...radius }}>
        <img src={plan.imageUrl} alt={plan.name} onError={() => setPhotoBroken(true)} className="absolute inset-0 size-full object-cover" />
      </div>
    );
  }

  if (brand && !logoBroken) {
    return (
      <div className={cn(box, 'bg-white ring-1 ring-black/5')} style={{ width: size, height: size, ...radius }}>
        <img
          src={logoUrl(brand.domain, size > 64 ? 256 : 128)}
          alt={brand.name}
          referrerPolicy="no-referrer"
          onError={() => setLogoBroken(true)}
          onLoad={(e) => e.currentTarget.naturalWidth <= 16 && setLogoBroken(true)}
          className="object-contain"
          style={{ width: size * 0.56, height: size * 0.56 }}
        />
      </div>
    );
  }

  const Icon = catMeta(plan.category).icon;
  return (
    <div
      className={cn(box, 'bg-surface-2 text-muted ring-1 ring-line')}
      style={{ width: size, height: size, ...radius }}
    >
      <Icon strokeWidth={1.6} style={{ width: size * 0.44, height: size * 0.44 }} />
    </div>
  );
}
