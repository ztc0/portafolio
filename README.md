# Professional portfolio prototype

This repository contains a **technical prototype**, not a completed MVP or a deployed site. The root `/` serves the English professional page without JavaScript. With JavaScript, browsers whose primary preferred language is Spanish (`es` or `es-*`) navigate to `/es/`; other languages remain on the English root. The explicit `/en/` and `/es/` pages are available directly without JavaScript and do not redirect. Professional records remain subject to review; the current contact placeholder is not a verified contact channel.

## Local development

Use the Node and pnpm versions specified in `package.json` and `.nvmrc`, then install dependencies with `corepack pnpm install --frozen-lockfile` in your own checkout.

- `corepack pnpm dev` — local development server; open the printed local URL at `/` (or `/en/` and `/es/` directly)
- `corepack pnpm build` — type check and static build
- `corepack pnpm test:unit` — unit tests
- `corepack pnpm test:e2e` — browser tests (requires Playwright browsers)
- `corepack pnpm quality` — type, lint, formatting and unit checks

## License

The included source is licensed under [GPL-3.0-only](LICENSE). No external asset license or grant is implied.
