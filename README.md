# Hanwha Power Golf Check-In — setup

## 1. Secure the existing database

Run `schema.sql` in Supabase **SQL Editor**. It preserves all existing teams and golfers, replaces the three broad policies from the earlier instructions, and limits golfer updates to `checked_in` and `checked_in_at` columns. IMPORTANT: If you have created other permissive policies for these tables, inspect and remove them before launch; PostgreSQL permissive policies combine with OR.

Add approved volunteers in the SQL Editor (change the email):

```sql
insert into public.golf_volunteers (email)
values ('you@yourcompany.com'), ('helper@yourcompany.com')
on conflict (email) do nothing;
```

To review policies:

```sql
select tablename, policyname, roles, cmd from pg_policies
where schemaname='public' and tablename in ('golf_teams','golf_players','golf_volunteers');
```

## 2. Enable email sign-in

Supabase Dashboard > Authentication > Providers > Email. Enable Email and email OTP / magic links. **Turn off "Allow new users to sign up"** to restrict account creation. Create each volunteer's account in Authentication > Users > Add user (send invite or create a confirmed account). The app uses `shouldCreateUser: false`, so an account must exist before sign-in. Supabase's default email sending limits may require configuring custom SMTP for more users.

## 3. Set up redirect URLs

In Authentication > URL Configuration, add your final website URL (for example `https://your-project.vercel.app`) to **Redirect URLs** and set **Site URL** to the same. During local testing, you may also add `http://localhost:8000` to redirect URLs.

## 4. Connect the website

Copy `config.example.js` to `config.js`. In Supabase Dashboard > Project Settings > API Keys (or Connect), copy the **Project URL** and **publishable** key. Replace placeholders. Do not use the service_role or secret key. `config.js` is public browser configuration; security depends on RLS, not secrecy of this key.

## 5. Test locally

From this directory run `python3 -m http.server 8000` and open `http://localhost:8000`. Email login requires the user to exist in Authentication and in `golf_volunteers`.

## 6. Deploy on Vercel

Create a private GitHub repository containing `index.html`, `config.js`, and `README.md` (and optionally `schema.sql`), then in Vercel click **Add New > Project > Import Git Repository**. Framework preset: **Other**; no build command; output directory: root. Deploy. Then configure the deployed URL in Supabase Authentication > URL Configuration and test the login link on a phone and a computer. **Avoid putting `schema.sql` in a public repository** if you want to minimize operational details being exposed.

## 7. Event-day test

Sign in on two devices using separate approved volunteer accounts. Check in one test golfer on device A and confirm device B updates. Undo the check-in. Confirm CSV export. Keep a paper backup in case the venue loses internet connectivity.

### Limitations

This starter app supports check-in and attendance export, not roster edits or team reassignment. It requires internet access. Realtime event subscriptions are backed by database RLS. Supabase free plan limits and default email rate limits apply. Team data is only reloaded when the roster is loaded, not on team-name edits (which are disabled in this app).
