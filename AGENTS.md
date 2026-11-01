# Implementation rules

- Read `docs/user-service.md`, its canonical server design, and the assigned Linear issue before editing.
- HARD YAGNI: one Vite TypeScript join page in `apps/web/`; no React/Next.js, UI kit, monorepo tooling, or mobile scaffolding is needed for one button.
- Keep business logic and all privileged credentials in the Python server. Browser code never creates database records directly.
- Verify on explicit Join only. Do not auto-consume email tokens on page load. Preserve retry behavior without persistent browser sessions.
- Use fake data, pinned packages, and a committed npm lockfile. Never commit invitation links, real contacts, secrets, or screenshots of private email.
- Markdown belongs in `docs/`. All diagrams are editable Excalidraw files; link to the canonical server drawing rather than duplicate it.
