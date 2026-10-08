# Professional portfolio prototype

This repository contains a **technical prototype**, not a completed MVP or a deployed site. The English and Spanish professional pages are available directly at `/en/` and `/es/` without JavaScript. The root route is not implemented yet. Professional records, including canonical contact details, remain subject to review; a contact placeholder is not a verified contact channel.

## Local development

Use the Node and pnpm versions specified in `package.json` and `.nvmrc`, then install dependencies with `corepack pnpm install --frozen-lockfile` in your own checkout.

- `corepack pnpm dev` — local development server
- `corepack pnpm build` — type check and static build
- `corepack pnpm test:unit` — unit tests
- `corepack pnpm test:e2e` — browser tests (requires Playwright browsers)
- `corepack pnpm quality` — type, lint, formatting and unit checks

## License

The included source is licensed under [GPL-3.0-only](LICENSE). No external asset license or grant is implied.
