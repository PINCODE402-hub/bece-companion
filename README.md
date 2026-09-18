# BECE Companion — App Scaffold (Phase 4: Auth)

This is a working Vite + React + TypeScript app wired to Supabase Auth: register, login,
logout, forgot/reset password, persistent session, and a profile page (display name +
password change). It type-checks and builds cleanly (`npm run typecheck`, `npm run build`
both verified). Later phases (admin dashboard, past questions, quizzes, mock exams,
progress, offline sync) build on top of this same project — nothing here gets thrown away.

## 1. Create the Supabase project

1. Go to supabase.com → New project.
2. Once it's up, open the **SQL Editor** and run `schema.sql` (from the other file I sent
   you) top to bottom. That creates every table, RLS policy, trigger, and the
   `question-images` storage bucket, and seeds the 8 subjects.
3. Open **Project Settings → API** and copy the **Project URL** and **anon public key**.

## 2. Configure the app

```bash
cp .env.example .env.local
```
Paste your Project URL and anon key into `.env.local`. This file is already git-ignored —
never commit it.

## 3. Run it locally

```bash
npm install
npm run dev
```
Open the printed localhost URL. Register an account — a matching row appears automatically
in `profiles` (via the `handle_new_user` trigger), with `role = 'student'`.

## 4. Make yourself an admin (one-time, manual, by design)

In the Supabase SQL Editor:
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```
This is deliberately not something the app UI can do — see `ARCHITECTURE.md` §4 for why.

## 5. Deploy

Any static host works since this is a pure client-side Vite build (`npm run build` → `dist/`).
Suggested: **Vercel**
1. Push this project to a GitHub repo.
2. Import the repo in Vercel → framework preset "Vite" (auto-detected).
3. Add the two env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in
   Vercel → Project → Settings → Environment Variables.
4. Deploy. Future pushes to `main` auto-deploy — this is what makes "edit from your phone"
   realistic later (edit on GitHub mobile or Codespaces → push → live).

One extra step for Supabase's password-reset email to work in production: in Supabase →
**Authentication → URL Configuration**, add your deployed URL (e.g.
`https://your-app.vercel.app`) to the Redirect URLs allow-list — the reset link the code
builds (`${window.location.origin}/reset-password`) needs to be on that list or Supabase
will reject the redirect.

## What's in here vs. what's next

**Working now:** register, login, logout, forgot password, reset password, session
persistence across refreshes, profile view/edit, route protection (`/` and `/profile`
require login), an `isAdmin` flag already wired up for when the admin dashboard lands.

**Not yet built** (Phases 5–12 from `ARCHITECTURE.md`): admin dashboard & importer, the
actual Year → Subject → Paper → Question browsing UI, quizzes/mock exams reading from
Supabase instead of a static bank, progress/XP/streaks, bookmarks, mistake review, offline
cache + sync. The `HomePage` currently just shows your live XP/level/streak (0/1/0 for a
new account) as proof the profile round-trip works end to end.

## Project layout

```
src/
  auth/        AuthContext (session + all auth actions), route guard, login/register/
               forgot/reset pages, shared auth layout + validation helpers
  pages/       HomePage, ProfilePage (student-facing pages start accumulating here)
  lib/         supabaseClient.ts
  types/       database.ts — hand-written types mirroring schema.sql; regenerate with
               `supabase gen types typescript` once convenient
  components/  shared UI (FullPageSpinner so far)
  styles/      global.css — same design tokens as the original BECE-Companion.html
```
