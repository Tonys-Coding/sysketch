# Progress & Roadmap

_Last updated: 2026-10-09_

## What Is Working

- [x] Idea validated in planning chat; core architecture decided (spec -> deterministic render, LLM never writes SVG).
- [x] Memory bank created.
- [x] `package.json` (private workspace root), Playwright 1.64.0 + Chromium installed, `playwright.config.ts`, smoke test passing (`npm run test:e2e`), `.gitignore`.
- [x] Monorepo scaffold: lint, typecheck, vitest, tsup build, Playwright, CI workflow all pass locally.
- [x] Phase 1 renderer working end to end (see Phase 1 checklist). Not yet pushed.
- [x] Theme variants: graphite (default), blueprint, midnight, classic.
- [ ] Owner drawing icons per `docs/icon-checklist.md`; convert from `icons-src/` when they arrive.
- [x] Phase 2 (PNG/CLI) and Phase 3 (MCP server) built and tested (2026-10-09). Not published to npm.

## What's Broken / Risks / Tech Debt

- [ ] Competitive landscape unverified (need real GitHub + npm search).
- [ ] Project name undecided.
- [ ] Font + icon licensing approach undecided.
- [ ] Text measurement strategy undecided (heuristic vs font metrics).

## Plan

### Phase 0 — Setup & validation (≈ 0.5 day)

- [x] Search GitHub/npm for existing spec-to-diagram tools in this style; record gaps below.
- [x] Pick name: **sysketch** (npm `sysketch`, `sysketch-mcp`, `sysketch-core` free on 2026-10-09).
- [x] `git init`, origin = https://github.com/Tonys-Coding/sysketch.git (empty remote, NOT pushed yet), npm workspaces, TS strict, vitest, eslint/prettier, CI skeleton, MIT license.
- [x] **Baseline measurement (estimate):** have Claude draw the URL-shortener diagram as raw SVG; record output tokens + cost. This number is the README's headline claim.

### Phase 1 — MVP renderer (weekend)

- [x] Spec v0 schema (Zod) + LLM-friendly errors.
- [x] 10 starter icons, hand-curated.
- [x] Light theme as tokens.
- [x] Pipeline: parse -> normalize -> ELK layout -> SVG (groups, numbered step badges, edge labels, arrowheads).
- [x] Golden test + `examples/url-shortener.yaml` + rendered SVG.
- **Exit criteria:** reference diagram looks good enough to be the README hero image. MET (first pass); polish list below.

### Phase 2 — CLI + PNG (≈ 1 day)

- [x] `render` command (file/stdin -> svg/png), `--theme`, `--scale`, `--png`.
- [x] resvg PNG export (no font needed: text is already paths). Shadows, patterns, clip paths render correctly.
- [x] `npx` works with zero config (verified by installing packed tarballs in a temp dir).

### Phase 3 — MCP server (≈ 1 day) — the distribution hook

- [x] Tools: `render_diagram(spec|file, out, theme, preview)`, `list_icons()`. Dropped `get_spec_schema`: a ~5-line syntax guide lives in the tool description instead.
- [x] Returns only a one-line summary + path. PNG preview image only when `preview: true`.
- [x] Verified over real stdio with the MCP SDK client. `.mcp.json` in repo for dogfooding.
- [ ] Verify inside an actual Claude Code session (needs session restart to load `.mcp.json`) and Claude Desktop.
- [x] Spec cheat sheet in the `render_diagram` description (definitions total ~1,275 chars, ~360 tokens; test enforces < 2,000 chars).

### Phase 4 — Polish & launch (≈ 1 week)

- [ ] README: hero image, token-cost comparison table, 30-second quickstart, MCP install snippet.
- [ ] Expand icons to ~40–60; add dark theme (+ one more).
- [ ] Web playground (React + CodeMirror + live preview, deployed static).
- [ ] Gallery of 8–10 classic designs (URL shortener, news feed, chat, rate limiter, CDN, etc.).
- [ ] Launch: Show HN, r/programming, r/ClaudeAI, X, MCP directories/awesome-lists, short demo video/GIF.

### Phase 5 — Sustain

- [ ] Triage issues weekly; take icon/theme requests as the main community contribution path.
- [ ] Contribution guide for adding icons + themes.
- [ ] Keep deps current; spec versioning policy.

## Landscape Findings

_(fill in after Phase 0 search)_

## Decisions Log

| Date       | Decision                                                                                                                      | Why                                                                                                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-09 | LLM emits spec, deterministic renderer draws                                                                                  | Removes per-diagram SVG token cost + inconsistency                                                                                                                         |
| 2026-10-09 | elkjs for layout (dagre fallback)                                                                                             | Handles nested groups + edge routing; don't write own                                                                                                                      |
| 2026-10-09 | Original icons/palette, not ByteByteGo assets                                                                                 | IP safety + distinct identity                                                                                                                                              |
| 2026-10-09 | MCP server is a first-class deliverable                                                                                       | Distribution hook + core use case                                                                                                                                          |
| 2026-10-09 | TS + npm workspaces + Zod + resvg                                                                                             | Runs in Node/browser; no headless browser needed                                                                                                                           |
| 2026-10-09 | Playwright installed for visual QA + future playground e2e                                                                    | Owner request; lets us screenshot and judge diagram quality                                                                                                                |
| 2026-10-09 | Spec: JSON canonical model, YAML front-end, `a > b > c` edge-chain shorthand; full custom DSL deferred                        | Most of the DSL's token savings with none of the parser/LLM-error risk. Revisit only if measured tokens justify it                                                         |
| 2026-10-09 | Text rendered as paths by default, via real font metrics                                                                      | Pixel-identical everywhere (slides, Notion, Figma, Slack, PNG), exact label fitting, solves measurement risk. File size doesn't cost LLM tokens because tools return paths |
| 2026-10-09 | Packages: `packages/sysketch` (core lib + CLI, bin `sysketch`) and later `packages/mcp` (`sysketch-mcp`). Core and CLI merged | One install, `npx sysketch`; fewer packages to version                                                                                                                     |
| 2026-10-09 | `ignoreDeprecations: "6.0"` in tsconfig.base (TS 6 + tsup dts)                                                                | tsup injects deprecated baseUrl; revisit when tsup fixes it                                                                                                                |
| 2026-10-09 | Theme system: fonts, backdrop, card style (outline/bar), shadow, hues all data; themes midnight/graphite/blueprint added      | Owner wants corporate + techy custom look; zero per-diagram token cost                                                                                                     |
| 2026-10-09 | No third-party logos in core; optional user-supplied brand icons later                                                        | Trademark rules vary per brand                                                                                                                                             |
| 2026-10-09 | `renderToFile` shared by CLI and MCP; `src/api.ts` holds render APIs (avoids index/files import cycle)                        | No duplicated logic                                                                                                                                                        |
| 2026-10-09 | MCP default output: `file` spec -> sibling .svg; inline spec -> `diagrams/<title-slug>.svg`                                   | Predictable paths; edits re-render in place                                                                                                                                |
| 2026-10-09 | Root build order is explicit (sysketch then sysketch-mcp); CI runs build before typecheck/test                                | mcp imports sysketch's dist types                                                                                                                                          |
| 2026-10-09 | MCP/CLI return file path + short summary, never SVG text                                                                      | Prevents re-creating the token cost we are eliminating                                                                                                                     |

## Open Questions

1. Project name? Shortlist (all free on npm as of 2026-10-09; GitHub/domain NOT checked): `sysketch` (leading pick), `archsmith`, `stencilo`, `boxflow`, `tinyarch`, `sketchspec`. Taken on npm: archdraw, specdraw, blueprintr, drawbridge, blocksmith.
2. ~~YAML vs DSL~~ Decided: JSON model + YAML front-end + edge-chain shorthand (see decisions).
3. ~~Text paths vs font~~ Decided: paths (see decisions).
4. Edge style: orthogonal vs curved as default? (Lean orthogonal with rounded corners; verify visually with Playwright screenshots.)
5. Is the web playground in v1 or post-launch? (Lean post-launch; MCP + CLI first.)

## Phase 1 Notes (2026-10-09)

Built: `src/{model,icons,themes,text,layout,render,index,cli}.ts`; 16 unit/golden tests + 2 Playwright visual-regression tests; examples `url-shortener`, `web-scale` (SVG goldens committed in `examples/`). Dev helper `scripts/shot.mjs` screenshots an SVG for visual review.

- URL-shortener spec is **138 chars (~40 tokens)**; SVG output ~62 KB (18.6 KB gzipped) because text is paths.
- **YAML gotcha found:** unquoted `a > b : label` parses as a one-key map. Label separator is now `|` (`a > b | label`); the one-key-map form is still accepted as a fallback.
- Implicit nodes: icon names/aliases auto-create nodes with friendly labels (`lb` -> "Load Balancer"), so many specs need no `nodes:` block.
- ELK notes: `elk.json.edgeCoords/shapeCoords = ROOT` gives absolute coords; edge labels (`inline`) reserve room for the badge/label pill; hierarchy handling INCLUDE_CHILDREN routes edges across groups.
- opentype.js must stay on 1.3.x (2.0 throws on Nunito's GSUB table). `ignoreDeprecations` and `types:["node"]` needed in tsconfig for TS 6.

### Polish backlog (visual)

- [ ] Edges sometimes enter a node near a corner (e.g. worker -> db in web-scale); consider ports / centered attachment.
- [ ] Short hops with a label pill get cramped (cache -> db "miss"); enforce min gap for labeled edges.
- [ ] Optional soft drop shadow on cards, subtle group tints per hue, bigger title.
- [ ] More icons (target 40-60), dark theme, PNG export (resvg), `direction: down` visual check.
- [ ] Bundle fonts for browser use (currently reads font from disk via node:fs).
- [ ] Tool should write files and return only a path + summary (MCP phase).

## Phase 2-3 Notes (2026-10-09)

- Measured overhead: tool definitions ~1,275 chars (~360 tokens/session); one render call (args + result) ~324 chars (~90 tokens).
- Known low-severity advisory: esbuild (via tsup), Windows dev-server only, dev dependency. `npm audit fix` does not resolve it; revisit when tsup updates.
- Playwright snapshots are darwin-only, so CI does not run e2e yet (would need linux baselines).
