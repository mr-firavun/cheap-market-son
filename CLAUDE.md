# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build       # Production build (run after every change)
npm run dev         # Dev server (do NOT start — handled by system)
npm run lint        # ESLint
npm run typecheck   # TypeScript type check without emitting
```

Always run `npm run build` after making changes to verify the project compiles cleanly.

## Architecture

Single-page React app with no router — navigation is managed by a `page` state string (`'home' | 'products' | 'dashboard' | 'auth' | 'admin'`) in `App.tsx`. The `navigate()` function updates this state and scrolls to top. All pages receive `onNavigate` as a prop.

### Auth flow

`AuthContext` (`src/context/AuthContext.tsx`) wraps the entire app and exposes `{ user, session, profile, loading, signUp, signIn, signOut, refreshProfile }`. It calls `supabase.auth.onAuthStateChange` and fetches the `profiles` row on every session change. Components access auth state via `useAuth()`. Admin access is gated by `profile.is_admin` boolean — there is no separate role system.

### Data layer

All Supabase types are defined in `src/lib/supabase.ts` alongside the singleton client. Always import types from there rather than redefining them.

Key tables:
- `profiles` — extends `auth.users`; holds `balance`, `referral_code`, `referred_by`, `is_admin`, `wallet_address`
- `products` — investment products with `price`, `profit_rate`, `duration_days`, `is_active`
- `investments` — links `user_id` + `product_id`; tracks `start_date`, `end_date`, `status`, `profit_amount`
- `transactions` — all money movements: `deposit | withdrawal | investment | profit | referral_bonus`
- `support_messages` — in-app chat; `sender` is `'user' | 'support'`
- `platform_settings` — key/value store for admin-configurable values (e.g. `deposit_address`, `social_whatsapp`)

RLS is enabled on every table. Admin queries bypass user-level RLS via a subquery check `EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)`.

### Pages

- `LandingPage` — public marketing page; reads `social_whatsapp` from `platform_settings` on mount to power the live-support WhatsApp button
- `AuthPage` — sign in / sign up; handles referral code via `?ref=` query param
- `ProductsPage` — public product catalog
- `DashboardPage` — authenticated user panel (balance, investments, withdrawals, referrals)
- `AdminPage` — admin-only; tabs for products, users, transactions, withdrawal approvals, support chat, and settings

### Components

- `Navbar` — always rendered; shows different links based on auth state and `profile.is_admin`
- `SupportChat` — floating chat widget for authenticated users; polls `support_messages`

## Key conventions

- Use `maybeSingle()` (not `single()`) for all single-row Supabase queries
- Platform settings are read/written via `platform_settings` table with `key/value` pairs; admin saves them with `upsert`
- All USDT amounts use `numeric(18,2)`; display with `Number(x).toFixed(2)`
- Images: logo is `/public/WhatsApp_Image_2026-04-24_at_13.50.32.jpeg`, displayed with `rounded-full object-cover`
- Styling: Tailwind only, dark theme (`bg-gray-950` base), amber (`amber-400/500`) as primary accent, emerald for success/positive values, red/rose for errors/negative values — no purple/indigo
