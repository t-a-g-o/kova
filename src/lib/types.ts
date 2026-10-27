export type PlanType = 'pay4' | 'monthly';

export type Category =
  | 'fashion'
  | 'sneakers'
  | 'jewelry'
  | 'watches'
  | 'tech'
  | 'art'
  | 'auto'
  | 'home'
  | 'travel'
  | 'other';

export interface Plan {
  id: string;
  name: string;
  merchant: string;
  category: Category;
  /** Brand id from the brand registry, used for the logo. */
  brand?: string;
  /** @deprecated kept for older saved plans */
  emoji?: string;
  /** Uploaded photo (data URL) or remote image URL. */
  imageUrl?: string;
  /** Purchase price before financing. */
  price: number;
  /** Paid at checkout (monthly plans only — pay-in-4's first installment is the down payment). */
  downPayment: number;
  /** Annual percentage rate, e.g. 15.99. */
  apr: number;
  type: PlanType;
  /** Number of financed installments (excludes down payment). */
  installments: number;
  /** Purchase date, epoch ms. */
  startDate: number;
  createdAt: number;
  status: 'active' | 'paid';
  paidOffAt?: number;
  autopay: boolean;
  methodId?: string;
  orderNumber: string;
  notes?: string;
}

export type TxnType = 'payment' | 'payoff' | 'purchase' | 'refund';

export interface Txn {
  id: string;
  planId?: string;
  type: TxnType;
  amount: number;
  description: string;
  methodId?: string;
  methodLabel?: string;
  createdAt: number;
  /** Shows as pending until this moment, then completed. */
  settlesAt: number;
  failed?: boolean;
  auto?: boolean;
  confirmation: string;
}

export type TxnStatus = 'pending' | 'completed' | 'failed';

export interface PaymentMethod {
  id: string;
  kind: 'bank' | 'card';
  /** Bank name or card network. */
  institution: string;
  nickname: string;
  last4: string;
  holder?: string;
  expiry?: string;
  accountType?: 'checking' | 'savings';
  routingLast4?: string;
  theme?: string;
  /** Card issuer (bank name). */
  issuer?: string;
  isDefault: boolean;
  createdAt: number;
  /** Banks show "verifying" until this moment. */
  verifiesAt?: number;
}

export type ThemePref = 'system' | 'light' | 'dark';

export interface Profile {
  displayName: string;
  email: string;
  /** How long new payments stay pending. */
  pendingSeconds: number;
  spendingPower: number;
  memberSince: number;
  theme: ThemePref;
  notifications?: NotificationPrefs;
}

export interface NotificationPrefs {
  /** Email a reminder a few days before each due date. */
  reminders: boolean;
  /** Email a receipt when a payment posts. */
  receipts: boolean;
  /** Offers and product news. */
  offers: boolean;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}
