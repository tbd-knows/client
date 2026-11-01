# TBD client

One plain TypeScript/Vite Join TBD page in `apps/web/`. The Python API owns admission and User creation. [Approved design](https://github.com/tbd-knows/server/blob/main/docs/user-service/design.md), [client runbook and evidence](docs/user-service.md).

From `apps/web/`, using Node 22.23.3/npm 10.9.8:

```bash
npm ci
cp .env.example .env.local
# Fill the three public values before starting/building.
npm run dev
```

Open `http://localhost:5173/join` using a founder-issued invitation. Loading the page only scrubs the fragment and displays the button. Verification happens on explicit click.

```bash
npm run check
npm run build
npx playwright install chromium webkit
npm test
```

Tests build the production bundle with fake public configuration and intercept Auth/API HTTP calls. No real email, tokens, or user data are used. The tests require browser binaries; nothing is deployed by these commands.

Vercel uses the existing `client` project in `robel-kebedes-projects`, root **`apps/web`**, Vite, `npm ci`, `npm run build`, output `dist`. The app's `vercel.json` serves `/join` and sets no-store/no-referrer headers. No privileged environment values belong in this static application.

Both repositories remain on their implementation branches for review/integration. The client production URL and deployed verification remain TBD-16 work. No mobile, login/dashboard, profile UI, or frontend framework is included.
