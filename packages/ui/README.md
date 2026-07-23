# @harmon/ui

Harmon's design-system component library — dumb, presentational React components, documented and developed in Storybook. No business logic, no data fetching: components only ever receive data via props.

## Layout choice

Storybook lives *inside* this package (`packages/ui/.storybook`) rather than as a separate `apps/storybook`. Rationale: these atomic components are meant to be imported directly by screen-level components in Phase 2 and eventually by `apps/web` in Phase 3 (`IMPLEMENTACAO.md §10.1a` closing note) — keeping Storybook next to the components it documents means there's one package to depend on, one `package.json`, one place components and their stories can drift apart from (they can't, since they're siblings).

## Design tokens

`src/tokens/harmon-tokens.css` is a **copy** of `brand/tokens/harmon-tokens.css` from the private `docs`/`brand` repo. This workspace will eventually live in its own public repo with no access to that private repo, so the token file is vendored here rather than imported by relative path across the repo boundary.

This copy is **not** kept in sync automatically. If the source token file changes (new color, an AA contrast fix, a new spacing step), someone has to manually re-copy it into `src/tokens/harmon-tokens.css` and re-check every component that hardcodes a hex value the tokens file doesn't cover (see the "token gaps" flagged in the Sprint 1′ report — e.g. the danger button's hover shade, `#9E4438`, has no `--hm-clay-700` token yet). There is no build-time check that would catch a silent drift; this is a real gap worth a follow-up ticket.

## Commands

- `npm run storybook` — dev server with hot reload (light/dark theme toggle in the toolbar).
- `npm run build-storybook` — static build to `storybook-static/`, used as the Sprint 1′ exit gate (US-1.9): must succeed with zero dependency on `core`, Prisma, or any external service.
