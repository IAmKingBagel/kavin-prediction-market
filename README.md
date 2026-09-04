# Admissions Market

Friend-group prediction market for college admissions. Next.js 14 + Supabase.

## Setup

### 1. Create a free Supabase project

1. Go to [https://supabase.com](https://supabase.com) and sign in (GitHub is fine).
2. **New project** → pick an org, name it e.g. `admissions-market`, choose a DB password (save it), region close to you.
3. Wait until the project is ready.

### 2. Run the SQL

1. In the Supabase dashboard: **SQL Editor** → **New query**.
2. Paste everything from `supabase/schema.sql` → **Run**.
3. New query → paste everything from `supabase/seed.sql` → **Run**.

### 3. API keys → `.env.local`

1. Supabase → **Project Settings** → **API**.
2. Copy **Project URL** and the **service_role** key (secret — server only, never expose in the browser).
3. In this folder, copy the example env file:

```bash
cp .env.local.example .env.local
```

4. Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your_service_role_key
ADMIN_PIN=pick-your-own-private-pin
```

Use a PIN only you know (not something from old versions of this app).

### 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel (free)

1. Push this repo to GitHub (create a repo, then `git remote add origin …` and `git push -u origin main`).
2. Go to [https://vercel.com](https://vercel.com) → **Sign up with GitHub** (first time: authorize Vercel).
3. **Add New… → Project** → import the GitHub repo.
4. Framework preset should be **Next.js**. Root directory: leave default if the Next app is the repo root; if the app lives in `admissions-market/`, set Root Directory to that folder.
5. **Environment Variables** — add the same three as `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PIN`
6. Deploy. After it's live, open the URL and join with a test name, place a bet, then unlock admin with your PIN and resolve a school to verify payouts.

## Admin

Enter your `ADMIN_PIN` in the Admin section at the bottom of the page (stored in session for that browser tab session). Unlocks resolve buttons, college add/edit/remove, and real names on bets/leaderboard.
