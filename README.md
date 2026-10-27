# Kova

A buy-now-pay-later style app for tracking your purchases as payment plans. All of it is mock data: plans, payments, banks and cards are simulated, and no money moves.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

With no Firebase keys, Kova runs in **demo mode**. Accounts and data are saved in your browser's localStorage, so everything works right away.

## Connect Firebase

1. Create a project at https://console.firebase.google.com and add a **Web app**.
2. Copy `.env.example` to `.env.local` and paste in the config values.
3. **Authentication → Sign-in method**: enable **Email/Password** and **Google**.
4. **Firestore Database**: create a database, then deploy the included rules:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase use --add          # pick your project
   firebase deploy --only firestore:rules
   ```
5. Restart `npm run dev`. The "Demo mode" badge disappears, and data now syncs across devices.

Data layout: `users/{uid}` (profile), plus `plans`, `txns` and `methods` subcollections under it.

## Deploy (Firebase Hosting)

```bash
npm run build
firebase deploy --only hosting
```

On a phone, use **Add to Home Screen** and it opens full-screen like a native app.

## Features

- Email/password, Google, and password-reset auth flows
- Plans: Pay in 4 (biweekly) or monthly terms of 3–48 months with APR and a down payment. Purchase dates can be backdated, and past installments are added to history automatically
- Pay the next installment, a custom amount, or **hold to pay off in full** (confetti and celebration screen)
- Payments stay **pending** for a configurable time (Settings → Payment processing time), then post with a toast
- AutoPay pays installments on their due date
- Wallet: link banks (with a verifying period) and add cards with live card previews. Only the last 4 digits are stored
- Activity feed with filters, search, and receipts that show a status timeline and confirmation number
- Light and dark themes, sample data loader, JSON export, reset
