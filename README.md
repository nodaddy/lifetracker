# LTrack

Personal life tracker built with Next.js and Supabase. Track financial life, daily routine, and professional growth from one dashboard.

## Stack

- Next.js (App Router)
- Supabase (PostgreSQL, Auth, RLS)
- Tailwind CSS
- PWA-ready (installable on mobile)

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Add your Supabase project URL and anon key to `.env.local` (Supabase → Project Settings → API).

4. Run the SQL in `supabase/schema.sql` in the Supabase SQL editor.

5. Enable phone auth in Supabase (Authentication → Providers → Phone).

6. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — run production build
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript check

## Project structure

- `src/app` — routes and API handlers
- `src/components` — UI components
- `src/lib/supabase` — Supabase client helpers
- `supabase/schema.sql` — database schema, RLS, triggers

## Security

- Keep secrets in `.env.local` only (never commit this file).
- Only `NEXT_PUBLIC_*` variables are exposed to the browser; use the Supabase **anon** key there, not the service role key.
- Row Level Security policies in `supabase/schema.sql` scope all data to the signed-in user.
