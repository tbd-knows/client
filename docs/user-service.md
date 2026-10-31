# Join TBD client handoff

[The server design](https://github.com/tbd-knows/server/blob/docs/user-service-v1/docs/user-service/design.md) is the implementation source. Use that branch until its planning PR is merged, then link to `main`. Do not maintain a second copy of the specification here.

Build one Vite TypeScript package in `apps/web/`, without a frontend framework or component library. Serve `/join` through the Vercel SPA fallback. Vercel project: `client` in the supplied team. The founder confirms it is created and the repo is imported. Verification is deferred until deployment is needed; it does not block planning.

The page has only ready, working, success, and recoverable/error states. Opening it must not verify a token or create an account. The recipient presses Join TBD; the page verifies the email token through Supabase and calls the Python API with the resulting bearer token. Retry the API using the same in-memory session after a network error. After successful joining, display confirmation without implying that Messaging or Agent already exists.

The invitation contains a token hash in the URL fragment. Read it into memory, scrub it from the URL, and disable persistent/automatic Supabase session handling. No analytics or third-party scripts. Use no-referrer/no-store headers. Configure only public API/Supabase URLs and the publishable key in the browser.

Do not add signup fields, a login page, a dashboard, a profile editor, a founder console, mobile folders, business logic, or database access. There are no server secrets in Vercel for this static page. Email template and SMTP configuration are documented with the backend setup; real secret values stay outside Git.

After implementation, this README documents the exact local/test/build commands and deployed URL. Acceptance criteria live on the linked Linear issue and in the canonical design.
