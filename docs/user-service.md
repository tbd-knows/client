# Join TBD client

[The canonical server design](https://github.com/tbd-knows/server/blob/main/docs/user-service/design.md) is the source of truth. The backend implementation is reviewed at `2bb8c5103d30a48199f506770672bda8957d5e6e` on [server PR #2](https://github.com/tbd-knows/server/pull/2), still unmerged by founder instruction. Use [that reviewed branch's design](https://github.com/tbd-knows/server/blob/robiemelaku/tbd-14-user-service/docs/user-service/design.md) and [editable drawing](https://github.com/tbd-knows/server/blob/robiemelaku/tbd-14-user-service/docs/user-service/architecture.excalidraw) until coordinated release. The planning PRs are merged and approved; no planning review is pending.

Work: [TBD-15](https://linear.app/apt-knows/issue/TBD-15). Client branch: `robiemelaku/tbd-15-join-page`. TBD-15 remains In Progress pending review. All client rounds use this one branch/PR; backend fixes stay on its existing branch. After client review, TBD-16 verifies deployments from these branches. Merge both only after complete service acceptance.

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

No Vercel secret values are needed by the static page. Set the three public environment values for the intended deployment target. Backend URL, Supabase templates, CORS, and production Site URL must agree; these are coordinated TBD-16 steps. The verified production URL is **not available yet**. Neither an automatic preview attempt nor a local build establishes deployed acceptance.

## Verification evidence

Latest full browser run: **38 passed, zero skipped** (19 scenarios in each of Chromium and WebKit). `npm ci`, `npm run check`, `npm run build` (also run by the test harness), and npm dependency audit pass with zero reported vulnerabilities. A mobile viewport preview was also inspected using fake fixtures. No live delivery or deployment proof is claimed. Chromium and WebKit tests exercise explicit invitation/recovery verification, passive GET/fragment scrubbing, duplicate-click guard, API/network/malformed-response failures, same-session retry, invalid/expired/used links, denied admission, reload recovery, expiry without refresh, success cleanup, no persistent storage, and no referrer. These are browser tests against the real bundled SDK with fake HTTP responses; they do not prove deployed Auth, SMTP, or inbox delivery.

Remaining: client review, then TBD-16 configuration and real end-to-end acceptance. Gmail SMTP and Vercel verification have not blocked local implementation. The founder must enter a Google App Password directly in Supabase and explicitly authorize the real test recipient before delivery proof. Never publish that personal sender address, credentials, invitation links, or private email screenshots.
