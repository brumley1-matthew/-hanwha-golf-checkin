# Hanwha Power Golf Check-In

The application preserves the production Hanwha Power and Ms. Rina’s House of Blessings branding, cash-only package flyer, existing Supabase roster, and purchase records. The production application and assets were recovered from the live website because the previous GitHub main branch lacked its PIN and purchase features.

## Development

Use Node.js 22.12+ (Node 24 also works). Run `npm ci`, then `npm run dev`. Run `npm run build` for a production build. Vercel uses the committed Vite configuration and publishes `dist`. `public/config.js` supplies the public Supabase URL and publishable key; never use a service-role key in browser code.

Volunteer PIN sign-in uses the existing Supabase `volunteer-pin-login` Edge Function. The PIN is checked by the server and is not embedded in application code. Volunteer sessions use Supabase authentication and existing database policies. Signing out is local to the current device.

Search matches golfer or team names, ignores case and surrounding whitespace, and combines with the attendance filter. Both the check-in list and Teams tab provide **Check In All**. The action updates only unchecked members of that team with one database update; it does not overwrite prior check-in timestamps or purchase fields. Already-complete teams disable the button. Individual check-in and undo remain available.

Mulligan $10, Putting Contest $5, Solo Package $20, and Supreme Team $80 controls retain their production behavior. Solo and Supreme include mulligan and putting selections; Supreme applies automatically to every team member. Existing independent purchases are retained when a package is removed. The flyer retains raffle ticket pricing and package quantities. CSV export includes attendance and purchases.

Realtime subscriptions listen to both `golf_players` and `golf_teams`, refresh after writes and when returning to a visible tab, and fall back to a 30-second refresh when realtime is unavailable. Supabase must have both tables enabled in its Realtime publication and appropriate authenticated read/update policies. Existing remote configuration is preserved; do not run legacy SQL scripts blindly because they describe an older email-login workflow and do not include all purchase permissions.

## Validation

Run `npx playwright install chromium`, then `npm test` with the dev server running. In an environment with system Chromium, use `CHROMIUM_PATH=/usr/bin/chromium npm test`. `TEST_BASE_URL` can target a deployed site. Browser tests intercept Supabase traffic and use an isolated 96-player, 24-team fixture; they never modify production data. They exercise PIN submission, search/filtering, team and individual attendance, timestamp/purchase preservation, failure handling, Solo/Supreme selections, realtime messages, branding assets, CSV download, and sign-out.

Production read-only validation found **93 golfers and 24 teams**. The user requested preserving that current roster. The app displays actual counts and never seeds, deletes, resets, or invents roster entries. Production purchase controls should not be exercised against real golfers merely to test them; use isolated fixtures.
