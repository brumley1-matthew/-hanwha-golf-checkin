# Hanwha Power Golf Check-In

Responsive website for the October 17, 2026 event, using existing `public.golf_teams` and `public.golf_players` tables.

## 1. Secure your Supabase project

1. In Supabase SQL Editor, run `security.sql`. If its last statement says the table is already a member of publication `supabase_realtime`, that statement can be skipped; the security changes preceding it already committed.
2. In **Authentication → Providers → Email**, enable Email/password sign-in. Turn **Allow new users to sign up** OFF (or disable public sign-ups in Authentication settings). Use the dashboard **Authentication → Users → Add user** to create each volunteer with a unique email and temporary password. Ask them to change passwords after first login; configure password recovery email/redirect settings as needed.
3. Approve each volunteer after their account exists. Find their user UUID in **Authentication → Users**, then run in SQL Editor (replace the UUID):

```sql
INSERT INTO public.approved_volunteers (user_id, approved)
VALUES ('REPLACE_WITH_VOLUNTEER_USER_UUID', true)
ON CONFLICT (user_id) DO UPDATE SET approved = EXCLUDED.approved;
```

To revoke access:

```sql
UPDATE public.approved_volunteers SET approved = false
WHERE user_id = 'REPLACE_WITH_VOLUNTEER_USER_UUID';
```

**Important:** only project administrators should edit the approved_volunteers table. Do not grant browser users INSERT or UPDATE on it.

## 2. Run locally

Install Node.js 20+ and run:

```bash
npm install
cp .env.example .env
```

Fill `.env` with your **Supabase Project URL** and **publishable key** from Supabase → Project Settings → API Keys. Never put secret/service_role keys in the frontend.

```bash
npm run dev
```

Open the URL printed by Vite, then log in with an approved volunteer account.

## 3. Publish to Vercel

1. Create a private GitHub repository, add the files from this project, and push it. Do **not** commit `.env`.
2. Go to https://vercel.com/new → Import your repository.
3. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
4. Under **Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` with the same values as your local `.env`.
5. Deploy. Share the HTTPS URL only with approved volunteers.
6. Test with two devices/accounts. Check in a golfer on one device and verify the other updates. Test Undo and CSV export. If realtime is blocked, refreshing the page retrieves saved attendance.

## 4. Before event day

- Check that all 24 teams have 4 golfers and 96 golfer names are correct.
- Create volunteer accounts and approve them before arriving at the course.
- Test Wi-Fi/cellular connectivity, logins, concurrent check-ins, and CSV export.
- Bring a printed roster as an offline fallback. This website needs internet access.
- Avoid sharing passwords; each volunteer uses their own login.

## Notes

- This application does not edit golfer names or team assignments. Those can be maintained by a Supabase administrator in Table Editor.
- Approved volunteers can see the entire roster and modify check-in state, but cannot change golfer names or teams through the browser database role.
- Database `checked_in_at` records a timestamp when checking in. Undo clears it.
- A logged-in volunteer whose approval is revoked will lose database access on subsequent requests; existing on-screen data may remain visible until logout or refresh. Log out shared devices.
