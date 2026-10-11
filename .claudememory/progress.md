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
- [x] Verified with real headless Claude Code runs (2026-10-09), see "MCP field test" below.
- [ ] Claude Desktop check.
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

| Date       | Decision                                                                                                                                                           | Why                                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-09 | LLM emits spec, deterministic renderer draws                                                                                                                       | Removes per-diagram SVG token cost + inconsistency                                                                                                                         |
| 2026-10-09 | elkjs for layout (dagre fallback)                                                                                                                                  | Handles nested groups + edge routing; don't write own                                                                                                                      |
| 2026-10-09 | Original icons/palette, not ByteByteGo assets                                                                                                                      | IP safety + distinct identity                                                                                                                                              |
| 2026-10-09 | MCP server is a first-class deliverable                                                                                                                            | Distribution hook + core use case                                                                                                                                          |
| 2026-10-09 | TS + npm workspaces + Zod + resvg                                                                                                                                  | Runs in Node/browser; no headless browser needed                                                                                                                           |
| 2026-10-09 | Playwright installed for visual QA + future playground e2e                                                                                                         | Owner request; lets us screenshot and judge diagram quality                                                                                                                |
| 2026-10-09 | Spec: JSON canonical model, YAML front-end, `a > b > c` edge-chain shorthand; full custom DSL deferred                                                             | Most of the DSL's token savings with none of the parser/LLM-error risk. Revisit only if measured tokens justify it                                                         |
| 2026-10-09 | Text rendered as paths by default, via real font metrics                                                                                                           | Pixel-identical everywhere (slides, Notion, Figma, Slack, PNG), exact label fitting, solves measurement risk. File size doesn't cost LLM tokens because tools return paths |
| 2026-10-09 | Packages: `packages/sysketch` (core lib + CLI, bin `sysketch`) and later `packages/mcp` (`sysketch-mcp`). Core and CLI merged                                      | One install, `npx sysketch`; fewer packages to version                                                                                                                     |
| 2026-10-09 | `ignoreDeprecations: "6.0"` in tsconfig.base (TS 6 + tsup dts)                                                                                                     | tsup injects deprecated baseUrl; revisit when tsup fixes it                                                                                                                |
| 2026-10-09 | Theme system: fonts, backdrop, card style (outline/bar), shadow, hues all data; themes midnight/graphite/blueprint added                                           | Owner wants corporate + techy custom look; zero per-diagram token cost                                                                                                     |
| 2026-10-09 | No third-party logos in core; optional user-supplied brand icons later                                                                                             | Trademark rules vary per brand                                                                                                                                             |
| 2026-10-09 | `renderToFile` shared by CLI and MCP; `src/api.ts` holds render APIs (avoids index/files import cycle)                                                             | No duplicated logic                                                                                                                                                        |
| 2026-10-09 | MCP default output: `file` spec -> sibling .svg; inline spec -> `diagrams/<title-slug>.svg`                                                                        | Predictable paths; edits re-render in place                                                                                                                                |
| 2026-10-09 | Root build order is explicit (sysketch then sysketch-mcp); CI runs build before typecheck/test                                                                     | mcp imports sysketch's dist types                                                                                                                                          |
| 2026-10-09 | Icon catalog with fallbacks + `npm run icons` import pipeline                                                                                                      | Owner adds icons one at a time; specs can use any catalog name today                                                                                                       |
| 2026-10-09 | MCP saves inline specs as `<out>.yaml`                                                                                                                             | Enables one-line edits instead of resending specs                                                                                                                          |
| 2026-10-09 | `sketch` theme: rough.js (seeded per shape, deterministic) + Patrick Hand font; ink outlines, crayon hachure icon fills                                            | Owner's own drawing was hand-drawn style; renderer adds the look so icon files stay clean vectors                                                                          |
| 2026-10-09 | Traced bitmaps (VTracer etc.) are not usable as icons                                                                                                              | 1.2 MB, 3,457 paths, 1,986 colors; can't be recolored per theme                                                                                                            |
| 2026-10-10 | 4th icon color slot {S} (#FFFF00, shade) + per-hue `l`/`s` surfaces; dark themes get lit tops (mix m->a), sketch gets darker crayon shade                          | 3-slot palette inverted isometric lighting in dark themes and made sketch right faces solid black                                                                          |
| 2026-10-11 | Layout splits a diagram into connected components (edges + shared groups) and lays each out separately, stacked vertically (or side by side for `direction: down`) | ELK with INCLUDE_CHILDREN shares layers across unrelated flows, leaving big empty gaps (cloud-platform showcase 3,467px -> 2,653px)                                        |
| 2026-10-09 | MCP/CLI return file path + short summary, never SVG text                                                                                                           | Prevents re-creating the token cost we are eliminating                                                                                                                     |

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

- [x] Edges kept away from card corners (`elk.spacing.portsSurrounding` 22px).
- [x] Labeled hops reserve 18px each side of the pill; group nodes now get the same spacing options (ELK does not inherit them); more row spacing in `direction: down`.
- [ ] Optional soft drop shadow on cards, subtle group tints per hue, bigger title.
- [x] Dark themes, PNG export, `direction: down` checked (examples/microservices).
- [ ] More icons: catalog of 61 defined with fallbacks; owner drawing art.
- [ ] Bundle fonts for browser use (currently reads font from disk via node:fs).
- [ ] Tool should write files and return only a path + summary (MCP phase).

## Phase 2-3 Notes (2026-10-09)

- Measured overhead: tool definitions ~1,275 chars (~360 tokens/session); one render call (args + result) ~324 chars (~90 tokens).
- Known low-severity advisory: esbuild (via tsup), Windows dev-server only, dev dependency. `npm audit fix` does not resolve it; revisit when tsup updates.
- Playwright snapshots are darwin-only, so CI does not run e2e yet (would need linux baselines).

## Icon pipeline (2026-10-09)

- `src/icons.ts` holds META for all 61 checklist icons (label, hue, aliases, fallback). Undrawn icons borrow fallback art but keep their own label/hue (`phone` -> mobile -> user art).
- Owner's SVGs go in `icons-src/<name>.svg`; `npm run icons` validates and converts them (`src/icon-import.ts`) into `src/icons.generated.ts` and renders `icons-src/_preview.png` (gitignored) in all themes.
- Converter rules: square viewBox (auto-scaled to 48), colors only #0000FF/#00FF00/#FF0000/none mapped to {A}/{M}/{L}, no text/images/gradients/filters/masks/use/style, Figma frame clipPath stripped, stroke-width warning outside 1.75-3.25.

## MCP field test (2026-10-09, headless Claude Code 2.1.286, model sonnet)

| Run                                       | Output tokens | Cost (USD, from CLI) | Notes                                                                          |
| ----------------------------------------- | ------------- | -------------------- | ------------------------------------------------------------------------------ |
| sysketch: URL shortener                   | 846           | 0.158                | Model set `preview: true` itself (image cost); first run also paid cache write |
| sysketch: ride-sharing PNG, blueprint     | 859           | 0.093                | Called `list_icons` once; correct icons; feedback loop rendered fine           |
| sysketch: edit (add notification service) | 1,118         | 0.100                | Glob + Read spec, two one-line Edits, re-render with `file=`                   |
| Raw SVG baseline: URL shortener           | 10,538        | 0.224                | 11.8 KB hand-written SVG; visually rich                                        |

- Output tokens ~12x lower with sysketch. Dollar cost per small diagram is ~1.4-2.4x lower because fixed session context (~15-35k cached tokens) dominates; the gap widens with bigger diagrams and every edit (raw SVG edits re-emit the whole file).
- Fixes from the test: inline specs are now saved next to the output (`spec: diagrams/x.yaml` in the reply) so edits work; replies use cwd-relative paths; `preview` description says "only when the user asks".
- Feature gaps the raw baseline showed (backlog, cheap in spec tokens): node sublabel/description line, dashed "response" edges, colored edges, step legend, subtitle.
- `list_icons` returns 61 lines (~1k tokens) per fresh session when the model calls it; consider a `query` filter.

## Sketch theme + first owner icon (2026-10-09)

- Owner's first icon: `icons-src/user.svg` (clean redraw by Claude of the owner's crayon drawing). Their original traced file was moved to `.shots/old/user_icon.svg` (gitignored).
- `src/sketch.ts`: rough.js generator, seed = FNV hash of a per-shape key; `sketchIcon()` re-draws icon elements (rect/circle/ellipse/path/line/polygon/polyline, inherits g attrs). Fills equal to highlight or accent stay solid; mid fills are hachured.
- Icon style directions sample: `docs/icon-styles.png` (duotone line, offset print, solid glyph, app tile, isometric 3D). Owner to pick one; all fit the 3-color system.

## Owner's first isometric icons (2026-10-10)

- `icons-src/{mobile,browser,worker}.svg` drawn by owner with Claude (AI-assisted per `docs/isometric/GUIDE.md`); all passed `npm run icons` with no warnings. `user.svg` is still the flat redraw and needs an isometric version.
- Files carry an Anthropic C2PA content-credentials manifest (~5.7 KB, no personal data); the converter strips `<metadata>`, so rendered output is unaffected. Kept in originals as provenance.
- Measured: the new icons fill the canvas like the placeholders (mobile 21x38, browser 28x38, worker gear 34x25). They look lighter next to the bold flat placeholders; resolves as the set becomes fully isometric. Flat objects (gear) read small: consider a low pedestal to add height.
- Fallback test rewritten to stay valid as icons get drawn. `.DS_Store` now gitignored (one had been committed; removed from the index).

## Icon batch 2 + showcase (2026-10-11)

- Owner added isometric `api-gateway`, `rate-limiter`, `server` (custom, not the guide example) and redrew `user` isometric. 7/61 drawn, all pass with no warnings.
- `npm run icons` now auto-syncs `docs/icon-checklist.md` (ticks `[x]` for drawn icons, rewrites the `**Progress:**` line). Checklist legend changed: `[x]` = drawn by owner.
- New example `examples/rate-limited-api.yaml` (618 chars) showcasing all 7 owner icons. Layout lesson: a side lookup (limiter > counters) placed at the end of a chain inside a group made the diagram 2,768px wide; modelling the limiter in front of the gateway (the realistic architecture) gave 2,350px and a cleaner flow. `direction: down` was worse (632x2355).

## Icon batch 3 + component layout (2026-10-11)

- Owner added isometric cdn, cluster, container, dns, firewall, function, load-balancer, scheduler, service (+ user tweaked). 16/61 drawn, all pass without warnings; consistent baseline (y1 43.5-46) and centering (cx 23-25.2).
- Design feedback given: `function` (gear + lever) collides visually with `worker` (gear); `service` reads ambiguous; `load-balancer` (stacked boxes) doesn't show one-to-many; dns/load-balancer/cluster/service/scheduler have 17-26 shapes (guide suggests 3-12 faces), which gets noisy at 56px, especially in the sketch theme.
- New example `examples/cloud-platform.yaml` (all 16 owner icons, two flows). `src/layout.ts`: `components()` + `shift()`; `layout()` stacks parts; `layoutOnce()` is the old single ELK pass. Tests: `test/layout.test.ts`.
