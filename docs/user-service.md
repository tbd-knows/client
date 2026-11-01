# Join TBD client

[The canonical server design](https://github.com/tbd-knows/server/blob/main/docs/user-service/design.md) is the source of truth; the [editable drawing](https://github.com/tbd-knows/server/blob/main/docs/user-service/architecture.excalidraw) remains approved. **Technical verification complete; founder implementation review pending.** Both premature implementation merges were reverted. Fresh PRs from `review/user-service-founders` await Robel Bruk and Robel Kebede review and explicit merge approval.

Work: [TBD-15](https://linear.app/apt-knows/issue/TBD-15), [TBD-16](https://linear.app/apt-knows/issue/TBD-16). Existing technical evidence is preserved. The live client remains at `fea2a07898e0a1289eff23746ef907e6710806a4`, deployment `dpl_G6Zbyvd9nnLJkT7AAb6PcBfLt7zc`. Vercel's Ignored Build Step is temporarily `exit 0` while main is reverted; revisit after both founders approve the implementation and deployment plan. Agent acceptance does not authorize merging.

## Runtime contract

The static `/join` page has one button and ready/working/success/error states. It captures the fragment in memory and scrubs the visible URL before importing the application. It performs no Auth verification or private account fetch on GET/initialization. Malformed, missing or nonallowlisted token types show founder-resend guidance.

An explicit click calls the bundled Supabase SDK's `verifyOtp` with `token_hash` and type `invite` or `email`. Persistent storage, automatic URL detection and refresh are disabled. The short-lived SDK client is disposed after verification; only the access token and expiry remain in the page closure. The browser never writes database records directly.

The page calls `POST /v1/join` with the bearer token, no signup data, no cookies, and no referrer. Success requires an OK JSON response with a User UUID. It then clears the retained session and displays “You're in TBD.” It makes no claims about Messaging, Agent, or purchasing.

A network failure, timeout, malformed success response, rate limit, or server failure offers Retry using the same in-memory access token. It never re-verifies a consumed OTP on that retry. A pending operation disables duplicate clicks. Expired sessions and 401 responses require founder resend; other admission/conflict/request failures ask the founder for help. Page reload loses the session and the scrubbed fragment, so recovery requires resend. No session is stored in cookies, localStorage or sessionStorage. No analytics, third-party scripts, token logging, or persistent browser login is added.

No backend contract change is proposed.

## Local and build setup

Use Node 22 (tested 22.23.3) and npm (tested 10.9.8). Packages are pinned exactly in `apps/web/package.json`; commit `apps/web/package-lock.json`. There is no root JS package or monorepo tooling.

From `apps/web`:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Fill only public values in `.env.local`:

- `VITE_API_URL`: Python API origin, locally `http://localhost:8000`.
- `VITE_SUPABASE_URL`: intended Supabase project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: public publishable key, never a secret/service-role key.

Vite reads this app directory's environment files. Root `.env.example` is a reference only. Configure public values **before build**; they are compiled into the bundle. Missing values show an unavailable-configuration message. Use fake/mocked Auth for previews unless explicitly configured for the live project. The production API must allowlist the exact join origin via CORS.

```bash
npm run check
npm run build
npm run preview
npx playwright install chromium webkit
npm test
```

Playwright starts its own local preview after a production build, supplying fake Auth/API origins and key. It refuses to reuse an existing preview. All external calls are intercepted; no live Supabase project or email recipient is used. Browser traces/videos/screenshots are disabled to avoid recording future private invitation data. Tests use fake fixtures only. `npm test` requires the two browser binaries above.

## Deployment preparation

Use the **existing** Vercel `client` project in `robel-kebedes-projects`; inspect settings before any changes. Set Root Directory to `apps/web` (project setting, not a `vercel.json` field), framework Vite, Node 22, install `npm ci`, build `npm run build`, output `dist`. `apps/web/vercel.json` supplies `/join` → `/index.html` and no-store/no-referrer/nosniff response headers.

No Vercel secret values are needed by the static page. Set the three public environment values for the intended deployment target. Backend URL, Supabase templates, CORS, and production Site URL must agree; these are coordinated TBD-16 steps. The verified production join URL is **https://client-pi-five-28.vercel.app/join**. Deployment metadata confirms reviewed commit **2c5ebe0fa33d929a85cc74d47807199c162aac7a** on `robiemelaku/tbd-15-join-page`, deployment `dpl_4umzXBnL2yQFKQAjksSZaFuJEMJJ` (READY, production). Neither an automatic preview attempt nor a local build establishes deployed acceptance.

## Verification evidence

Latest full browser run: **38 passed, zero skipped** (19 scenarios in each of Chromium and WebKit). `npm ci`, `npm run check`, `npm run build` (also run by the test harness), and npm dependency audit pass with zero reported vulnerabilities. A mobile viewport preview was also inspected using fake fixtures. These local tests are separate from the accepted live delivery and deployed proof below. Chromium and WebKit tests exercise explicit invitation/recovery verification, passive GET/fragment scrubbing, duplicate-click guard, API/network/malformed-response failures, same-session retry, invalid/expired/used links, denied admission, reload recovery, expiry without refresh, success cleanup, no persistent storage, and no referrer. These are browser tests against the real bundled SDK with fake HTTP responses; they do not prove deployed Auth, SMTP, or inbox delivery.

Agent technical checks, production deployment, inbox delivery, and both live join/recovery flows passed; founder implementation review remains pending. Correct raw-MIME fragment links target the reviewed page. Exactly one business and one individual User match approved details and original Auth IDs. The remaining default subject text is a nonblocking configuration difference. Never publish contacts, tokens, credentials or private email screenshots.

## Verified Vercel setup and production checkpoint

Followed <https://vercel.com/get-started.md>. Global CLI 65.9.0 is authenticated as `robelk1738`; existing global Vercel plugin/guidance is enabled. Shared OAuth MCP `https://mcp.vercel.com` is configured via Codex's user-wide configuration and authenticated; documentation search and `list_teams` succeeded. The temporary local app-server tool helper can call this direct connection with `TBD_MCP_SERVER=vercel`; no model turn or credential extraction is involved. CLI project operations now work. Old bundled connector 404 responses are superseded by this working access path, not evidence that a new project is needed.

Verified and configured **existing** project `prj_bjfGLoc1nxSWc9rdnZ7CDX7HLSXX`, `robel-kebedes-projects/client`: root `apps/web`, Node 22.x, Vite, npm ci, npm run build, dist. Only the three public VITE variables were set for production. No replacement project or repository was created. Root was linked only after global setup and explicit existing-project verification. Generated local OIDC files remain ignored; no credentials were committed.

The production alias serves the exact reviewed client commit. Deployed bundle verification confirms the actual backend URL <https://tbd-user-api.onrender.com> and intended Supabase URL. Chromium and WebKit live checks passed:

- `/join` returns 200 and shows the button, with no Auth verification or User creation on initial load.
- Fragment is scrubbed; no persistent browser session/cookies.
- Explicit click on a synthetic invalid hash calls real Supabase exactly once, gets 403, displays recovery guidance, and makes no application User-creation request.
- Response headers include no-store, no-referrer and nosniff.

Backend used: accepted live commit `a9045c8d4ef369188581c35d2fe21004aa80590f`. No backend changes or prior acceptance reruns were required for Vercel setup.

## Reconciled live acceptance

Business initial invite: passive GET made no verification/User request; explicit Join verified Auth then hit the controlled API failure. Reload required founder resend. The confirmed identity's type=email recovery link completed joining. Individual confirmed-email recovery: controlled first-API 503, same-page Retry, exactly one OTP verification and two Join API attempts, successful join, no persistent session. Hosted SQL confirmed exactly one User of each type, approved details and original Auth identity preserved. Both flows are accepted.

During final reconciliation, both consumed real recovery links were reopened against production: explicit click caused one Auth request returning 403, clear expired/used guidance, zero User POSTs. Malformed links and deliberately expired Auth responses are additionally covered by the accepted Chromium/WebKit suite. No accepted join was reset or rerun.

The canonical [full acceptance matrix](https://github.com/tbd-knows/server/blob/review/user-service-founders/docs/user-service/implementation-status.md#reconciled-acceptance-matrix) names every case, evidence layer, and exact hosted-only limits. A confirmed but unapproved identity now has direct FastAPI/SDK/real-database 403/no-User proof; tampering, concurrency, lost committed-response recovery and uncertain email-send injection retain their accepted controlled evidence. Do not claim every injected failure was reproduced against hosted Auth.

Raw MIME has the correct /join fragment destinations for invite and email types. Subjects remain `You've been invited` / `Your sign-in link` despite saved `Join TBD` subjects: **nonblocking configuration difference**. No template-body correction or SMTP re-entry is currently needed. Founder implementation review remains pending. The previous claim of founder merge authorization was incorrect. Both main branches are reverted; fresh PRs contain the complete implementation and await both Robel Bruk and Robel Kebede. Preserve existing hosted records; no additional fault injection or account reset is authorized.

## Supabase Dashboard ready-to-paste batch

Project: `tbd-v1` (`xclftpnjwrmakooaaxik`). Use this production origin only with the reviewed client deployment. No password or personal recipient record belongs in this batch.

## Authentication → URL Configuration

Site URL:

```text
https://client-pi-five-28.vercel.app
```

Redirect URLs — add exactly these two entries (no wildcard):

```text
https://client-pi-five-28.vercel.app/join
http://localhost:5173/join
```

## Authentication → Sign In / Providers

- Allow new users to sign up: **OFF** (already verified; preserve).
- Email provider: **ON**.
- Confirm email: **ON**.
- Unused identity providers: **OFF**.

## Authentication → Email Templates → Invite user

Subject:

```text
Join TBD
```

Body (replace the entire template with this HTML):

```html
<h2>Join TBD</h2>
<p>You have been invited to join TBD.</p>
<p><a href="https://client-pi-five-28.vercel.app/join#token_hash={{ .TokenHash }}&amp;type=invite">Join TBD</a></p>
<p>Opening this link shows a button. Press Join TBD on the page to verify your email and join.</p>
```

## Authentication → Email Templates → Magic Link

Subject:

```text
Join TBD
```

Body (replace the entire template with this HTML):

```html
<h2>Join TBD</h2>
<p>Use this link to finish joining TBD.</p>
<p><a href="https://client-pi-five-28.vercel.app/join#token_hash={{ .TokenHash }}&amp;type=email">Join TBD</a></p>
<p>Opening this link shows a button. Press Join TBD on the page to verify your email and join.</p>
```

Do not use `{{ .ConfirmationURL }}` in either template. The fragment hash must reach the page without verifying on GET.

## SMTP and tracking

Keep the founder-saved Gmail SMTP configuration unchanged: smtp.gmail.com, 587/STARTTLS, sender name TBD, and the already entered credentials. No password re-entry or sharing is needed. Keep link/click tracking disabled; do not wrap/rewrite the two links above.

## Coordinated service configuration

These are already set on the backend; no re-entry is requested:

```text
JOIN_SITE_URL=https://client-pi-five-28.vercel.app
ALLOWED_WEB_ORIGINS=http://localhost:5173,https://client-pi-five-28.vercel.app
```

Client production environment:

```text
VITE_API_URL=https://tbd-user-api.onrender.com
VITE_SUPABASE_URL=https://xclftpnjwrmakooaaxik.supabase.co
```

The browser publishable key is set separately through Vercel as public configuration. No secret key belongs in the client.

After saving, confirm the two template types and URL settings are saved. SMTP entry alone is not delivery proof. Do not send invitations until the canonical /join URL is verified to serve the reviewed client.
