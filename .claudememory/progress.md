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

## Icon batch 4 (2026-10-11)

- Owner redrew cluster (26 -> 11 shapes), dns (17 -> 8), function (now a lambda on a base, no longer a gear), service (20 -> 16; still reads laptop+wrench). New: auth, cache, data-lake, database, file, key-value, token, vault, warehouse. 25/61 drawn, all pass.
- Owner keeps old versions as `name-old.svg`; importer now skips backups (`-old.svg`, `.bak.svg`, leading `_`) and reports them. Documented in icons-src/README.md and the checklist.
- Metrics: all centered (cx 23-25); baselines 43.5-46 except `cache` (bottom at 38.5, floats).
- New example `examples/secure-data-platform.yaml` (data + security icons). Making web > idp and web > api parallel (instead of a JWT chain) cut width 3,463 -> 2,605px.

## Public README + push (2026-10-11)

- README rewritten as a showcase: hero `examples/rate-limited-api.svg` + its spec, measured token table (846 vs 10,538 output tokens), from-source quick start (`npx sysketch` works in the workspace after `npm install && npm run build`), MCP setup with absolute path, spec reference, themes table, icon gallery (`docs/icons-gallery.png`, regenerate when icons change), more examples (`docs/showcase/`), how it works, roadmap.
- CLI help now lists themes dynamically (was missing `sketch`).
- Removed a local machine path from `.claudememory/techContext.md` before pushing (repo is public). Keep tracked files free of local paths/emails.
- Pushed all local commits to origin/main.

## Icon batch 5 (2026-10-11)
- 14 new icons (nosql, search, storage, queue, email, metrics, logs, alert, payment, location, recommendation, ml-model, llm, cloud): 39/61 drawn. Notes: llm one stroke 3.4 and floats (bottom 41.1); payment one stroke 1.6; email off-center (cx 21.3); logs~search and metrics~alert look alike at small size; cloud reads as monitor+cloud.
- New example examples/smart-commerce.yaml (+ midnight render in docs/showcase). README counts, gallery and examples updated. Pushed.

## Icon batch 6 (2026-10-12)
- 14 new icons (desktop, vm, webhook, chat, video, image, dashboard, tracing, graph-db, stream-processor, registry, ci-cd, repo, iot): 53/61 drawn, no duplicates.
- Stroke check now ignores intentional details: zero-length round-cap dot paths, circles r<=3, solid shapes (fill == stroke). Owner uses dots for chat typing dots and repo commit nodes. Remaining real notes: tracing 4.6 path, thin 1.6 lines in iot/payment.
- Placement: graph-db floats (bottom 37), chat 40.6, iot 41.5. Style notes: webhook is flat 2D (not isometric); tracing reads like location (map + pin). Slate-hue icons (vm, registry, ci-cd, repo, iot, cloud) look dim in dark themes: consider reassigning hues.
- New example examples/connected-platform.yaml (3 independent flows). Not yet pushed; README gallery still shows 39.

## Icon batch 7 (2026-10-12)
- Owner regenerated webhook (now isometric) and added pubsub, stream, notification, analytics, vector-db, etl, time-series: 60/61 drawn. `config` still missing.
- Per owner request: graph-db shifted down 7px by wrapping the art in `<g transform="translate(0 7)">` (original kept as graph-db-old.svg); tracing redrawn by Claude as an upright isometric trace panel with three indented span bars + connectors (old kept as tracing-old.svg). Two earlier tracing attempts (spans on a tile) did not read as a waterfall.
- Notes: pubsub is flat 2D (not isometric); vector-db floats/off-center (bottom 37.8, cx 20.1); notification slightly left (cx 20.9).
- New example examples/event-analytics.yaml. README gallery regenerated (60 icons) and counts updated. Not pushed yet.

## Icon set complete (2026-10-12)
- 61/61 drawn: owner added config and an isometric pubsub (its hub connectors are mostly hidden behind the discs; left as is).
- Position pass: audited all 61 (targets: bottom 42.5-46.6, center 24 +/- 1.5, 1.5px edge clearance). Fixed 11 by wrapping the art in a translate group: vector-db, cache, chat, llm, iot, stream, analytics, storage (down/up) and email, notification, logs (centered). Art untouched. iot and payment: one 1.6 detail stroke each -> 2. Re-audit: none off.
- Backups moved to icons-src/archive/ (importer reads only top-level files).
- README: icon section describes the complete set (61 icons, 160+ aliases); roadmap item removed. Checklist legend updated. Gallery regenerated.

## npm release prep (2026-10-12)
- Both packages at 0.1.0 with keywords, author (Tonys-Coding), homepage, bugs, repository.directory, exports incl. ./package.json, prepublishOnly (build + typecheck + test). sysketch-mcp depends on sysketch ^0.1.0.
- VERSION now read from package.json at build time (import attributes); smoke test compares them.
- npm-facing READMEs in each package use absolute raw.githubusercontent image URLs (docs/hero.png, docs/icons-gallery.png) because npm cannot resolve repo-relative paths. LICENSE copied into each package. CHANGELOG.md added.
- npm pkg fix normalized bin paths (./dist/cli.js -> dist/cli.js); without it npm warned it would drop the bin.
- Verified: npm pack -> clean install of both tarballs -> CLI, library and MCP stdio all work; fonts load from the installed package.
- .github/workflows/release.yml: publishes both on v* tags with provenance; needs repo secret NPM_TOKEN.
- First publish must be done by the owner (npm login + 2FA cannot be done by Claude).

## Published to npm (2026-10-12)
- sysketch@0.1.0 and sysketch-mcp@0.1.0 are live (maintainer npm user: tony-salty101). The owner published via npm staged publishing: npm first creates a public `0.0.0-stage` placeholder for a new name, the real version appears after approval (sysketch-mcp lagged a few minutes behind).
- Verified from the registry in clean folders: `npx sysketch` (render svg/png/sketch, icons), `npm install sysketch` library (VERSION 0.1.0, 61 icons), `npx -y sysketch-mcp` over stdio (server 0.1.0, both tools, PNG render).
- README: npm/CI/license badges; Quick start is now `npx sysketch` (no clone); MCP setup is `claude mcp add sysketch -- npx -y sysketch-mcp` / npx config; from-source steps moved to Development; publish item removed from roadmap.
- Local npm is 11.6.2 (no `npm stage`); staging commands need npm >= 11.15 (npm 12 requires Node >= 24.15).
- Future releases: bump both versions, push a vX.Y.Z tag; release.yml needs repo secret NPM_TOKEN (if the account enforces staged publishing, CI publishes will also need approval).

## 0.2.0 diagram features (2026-10-12, not yet published)
- Spec: node subtitle (3rd `|` segment or `sub:`), dashed hops `a ..> b` (and `[dashed]`), trailing `[color, dashed]` attrs (EDGE_COLORS: blue green amber red violet teal pink sky orange slate + yellow/purple/cyan/gray/grey), edge object `color/dashed/note`, top-level `legend: true`.
- Render: subtitles in theme edge font + muted color (SUB = 12px, 16px line, max 170px); colored edges use hue.a (hue.m in sketch) and color their step badge (badge text = theme.bg, or badgeText in sketch); dashes via stroke-dasharray (sketch.path takes an `extra` attr). src/legend.ts draws the Steps panel (1 or 2 columns, arrows drawn as vectors because the bundled latin font subsets lack U+2192).
- Layout: node order = first appearance in edges; groups/root children sorted by it; `elk.layered.cycleBreaking.strategy: GREEDY_MODEL_ORDER` so return edges do not flip the flow. (Plain MODEL_ORDER reversed non-cycle edges and broke web-scale; do not use it.) Existing goldens unchanged.
- Parser: on YAML failure, retries with `key: value` lines whose value contains ": " auto-quoted (list items are left alone because `- a > b : label` is a supported shorthand).
- MCP guide updated (~392 tokens of tool definitions). Both packages bumped to 0.2.0; sysketch-mcp depends on ^0.2.0. Tests: 52 core + 6 mcp.

## Official brand logos (2026-10-12, shipping in 0.2.0, not yet published)
- Decision: sysketch ships NO logos (trademark redistribution risk). Users install on their own machine: `sysketch logos install simple-icons` (npm registry tarball, sha512 integrity-checked, 3,466 marks as of 16.35.0; AWS/Azure/OpenAI removed from Simple Icons at the brands' request), `sysketch logos import <folder|pack.zip> [--as name]` (fflate unzip; detects aws/azure/gcp packs), or `logos: ./folder` in a spec (`logos lock` writes logos.lock.json fingerprints).
- Vendor packs (verified against real file listings, read via zip central directory only): AWS `Architecture-Service-Icons_*/Arch_<Cat>/64/Arch_Amazon-Simple-Storage-Service_64.svg` (~1,014 names incl. Res_ icons), Azure `Azure_Public_Service_Icons/Icons/<cat>/10121-icon-service-Azure-Cosmos-DB.svg` (~634), GCP core `Unique Icons/Cloud Run/SVG/CloudRun-512-color-rgb.svg` (19; title from the folder above SVG/PNG). nameLogoFile strips lead digits/arch/res/icon/service and trailing sizes (only real sizes, so Route-53 survives; also @5x), light/dark/color/rgb; skips __MACOSX, dotfiles, category, group and general icons; score prefers svg > png, 64/512 > 48 > 32, light over dark, Arch over Res. Vendor-prefix aliases (Amazon-EC2 -> ec2; "cloud" only if >= 5 chars left). BRAND_ALIASES maps everyday names (s3, sqs, eks, aks, cosmosdb, gcs, kafka...) to one or more candidate names.
- Download pages: AWS https://aws.amazon.com/architecture/icons/ (Icon-package_07312026 ~14 MB), Azure https://learn.microsoft.com/en-us/azure/architecture/icons/ (Azure_Public_Service_Icons_V24.zip ~1 MB, click-through terms), GCP https://cloud.google.com/icons (core-products-icons.zip, category-icons.zip).
- src/products.ts: PRODUCTS (~236 names -> [catalog icon, label]) so product names render without logos; CATALOG_BRANDS lists catalog aliases that are real products (others like db, api, vault, batch, waf are generic and never get logos).
- Originality: sha256 recorded at install, re-checked before drawing (refuses edited files); `<image href="data:...">` with original bytes, preserveAspectRatio meet, neutral tile (white, or #1E293B for light brand colors); never themed/roughened. Only change: Simple Icons marks get `fill="<official hex>"`.
- Resolver: project folders, then installed sources alphabetically, simple-icons last; `search()` matches names, aliases and titles (CLI `logos find`, MCP `list_icons logos=`).
- src/errors.ts holds SysketchError. Tests isolate SYSKETCH_HOME via vitest setup files and playwright.config.ts. Tool definitions ~1,600 chars (~450 tokens). Tests: 71 core + 7 mcp + 3 playwright.
- 2026-10-12: owner put the three vendor zips in the repo root (untracked); `*.zip` added to .gitignore. Imported into ~/.sysketch/logos: aws 719, azure 634, gcp 19, plus simple-icons 3466. Multi-cloud test render (.shots/multicloud-*.png, spec .shots/multicloud.yaml) confirmed real AWS/Azure/GCP icons draw correctly. Render summary now rounds PNG sizes.
- 2026-10-12: discovered sysketch@0.2.0 and sysketch-mcp@0.2.0 were already published (17:46 UTC, gitHead 77cef79, pre-logos). Logos therefore ship as 0.3.0: both packages bumped, sysketch-mcp depends on ^0.3.0, CHANGELOG split (0.2.0 = what was published). Gotcha: `npm version` across workspaces while mcp still required ^0.2.0 pulled sysketch@0.2.0 from the registry into packages/mcp/node_modules and shadowed the workspace link (mcp typecheck failed); `npm prune` removed it.
- 2026-10-12: sysketch@0.3.0 and sysketch-mcp@0.3.0 published (gitHead b43cad6; latest tag; took a few minutes to appear after the 202 "being processed" response). Verified from the registry in a clean folder with an isolated SYSKETCH_HOME: CLI help 0.3.0; product fallbacks without logos; `logos install simple-icons` (3466), `logos import` of the Azure (634) and AWS (719) zips; `logos find`/`info`; render drew 4 logos with SendGrid falling back; library VERSION 0.3.0 + search; edited Simple Icons file refused (fingerprint); sysketch-mcp over stdio: server 0.3.0, tools 1607 chars, list_icons logos= search, PNG render with logos.

## Token benchmark (2026-10-12, uncommitted)
- bench/prompts.json (5 prompts + 1 edit each), bench/run.mjs (headless Claude Code `-p --output-format json`, model sonnet = claude-sonnet-5-5; CLAUDE_BIN env; runs in os.tmpdir() so no CLAUDE.md leaks in — the first smoke run inside the repo picked up this repo's CLAUDE.md; results copied to bench/.runs/<stamp>/, gitignored), bench/report.mjs (docs/benchmark.md + docs/benchmark/*.png, screenshotted in Chromium because hand-written SVGs use CSS variables that resvg renders black).
- Run 2026-10-12T23-32-37-927Z: create output tokens 4,851 vs 77,518 (16x), edits 7,062 vs 28,919 (4.1x), cost $0.95 vs $2.44 (2.6x), time ~2 vs ~12 min. All 20 runs ok. Total spend incl. two smoke runs ~$5.
- Honest findings: Sonnet's hand-written SVGs look very good (dense, readable, light theme). sysketch drafts are wide and sparse (aspect up to 4.3:1), small text when scaled, long parallel edges; chat flow put Chat Service leftmost because return edges (`notif ..> clients`, `cdn ..> clients`) created cycles that GREEDY_MODEL_ORDER broke badly. sysketch SVGs are 300-725 KB (text as paths) vs ~10 KB.
- Plan: fix layout (own DFS back-edge detection by first appearance, dashed return edges never drive layering; wrap/aspect control for wide diagrams), shrink SVG paths, then re-run only the sysketch half before publishing the benchmark.

## Layout + size fixes after the benchmark (2026-10-12, uncommitted)
- layout.ts `feedbackEdges(model, rank)`: DFS over solid edges in first-appearance order marks edges that close a cycle; then each dashed edge is marked only if it would close a cycle (reachability). Marked edges go to ELK reversed and their route points are reversed back, so `notif ..> clients` loops back while `kafka ..> ledger` still points forward. Fixed the chat benchmark (Chat Service was leftmost).
- Auto direction: Model.autoDirection when the spec has no `direction` (CLI/API direction clears it). If width/height > 2.4, also lay out top-down and keep the shape closer to 1.6 (log distance). Pure long chains stay right (both shapes bad); long-label chains go down.
- ELK `elk.layered.wrapping.strategy` (SINGLE/MULTI_EDGE) works with INCLUDE_CHILDREN but was rejected: wrap-around edges cross the whole diagram and leave holes.
- Spacing: PILL_GAP 18 -> 12, nodeNodeBetweenLayers 70 -> 56 (down 84 -> 72): ~8% narrower.
- text.ts `GlyphSheet`: glyph shapes in font units defined once in <defs> (`t<font>-<glyph>`), placed with `<use xlink:href x>` inside a translate/scale group; root svg has xmlns:xlink. Pixel check vs full-precision inline paths: 0.06% channels differ (edge AA only). Files 4-6x smaller (video-streaming 725 KB -> 125 KB graphite; sketch theme still 200-340 KB from rough.js).
- scripts/docs.mjs regenerates examples/*.svg (goldens), docs/themes, docs/showcase, docs/hero.png, docs/features-v2.png with an empty SYSKETCH_HOME (no brand logos in repo images). Playwright snapshots updated.
- MCP guide: "direction (omit: auto-fit; right|down only if asked)". bench/run.mjs `--modes`; bench/report.mjs merges several run dirs (later wins) and notes dates.

## Row folding + 0.4.0 prep (2026-10-13)
- src/fold.ts `foldRows(layout, k)`: ELK is unable to do it (SEPARATE_CHILDREN leaves cross-row edges unrouted; INCLUDE_CHILDREN ignores per-row direction), so the finished single-row layout is cut in channels between merged node/group x-extents, parts are stacked, and crossing edges get connectors: right margin lane -> horizontal lane in the gap -> left margin lane -> into the row. Pills of crossing edges move onto their gap lane.
- Guards: cut channels must have <= 2 crossing edges (MAX_CROSSING), rows must be balanced (shortest >= 40% of longest by box extent), only single-component `right` layouts wider than 2.4:1; k = 2..4, keep the shape closest to 1.6. Then auto-direction may still pick top-down if better.
- Bug fixed during development: cuts in wide (label-filled) channels pushed connectors off the left edge; row extents now include route points and the left lane is pinned to the margin.
- Effect: rate-limited-api (hero) 2350x648 -> 1241x1120, event-analytics folds, web-scale/payments stay wide (only lopsided folds possible), video-streaming edit 5:1 -> 2.3:1.
- Both packages 0.4.0 (mcp depends on ^0.4.0, set together with `npm pkg set` to avoid the registry-copy gotcha). Tests: 77 core + 7 mcp + 3 playwright.
- 2026-10-13: MCP registry metadata added (packages/mcp/server.json validated against the 2025-12-11 schema; package.json mcpName "io.github.Tonys-Coding/sysketch", case-sensitive, must match the GitHub login). Launch kit drafted in .shots/launch/ (gitignored): LAUNCH.md (order, registry commands, directories, Show HN, r/ClaudeAI, r/mcp, r/SideProject, X, LinkedIn, FAQ) and launch-card.png. Nothing posted or submitted; owner publishes 0.4.0 and posts.
- 2026-10-13: default theme is now `sketch` (themes order: sketch, graphite, blueprint, midnight, classic); goldens/README/hero/features images regenerated; showcase now cloud-platform-graphite + blueprint + midnight (old *-sketch showcase files removed). Logo showcase: docs/logos/{aws-serverless,azure-events}.{yaml,svg}, rendered by scripts/docs-logos.mjs from ONLY the aws + azure packs (copied into a temp home). Rationale: Azure terms allow copy/distribute/display in architecture diagrams and documentation; AWS allows use in architecture diagrams; Google Cloud pack has no stated terms/license file, Simple Icons brands carry per-brand trademark rules, so neither is showcased. README caption credits the packs and states no affiliation. Launch card switched to paper style with the sketch hero; aws-official-icons.png added as an optional second image with a required caption.
- 2026-10-13: font + logo prototypes (nothing committed): .shots/proto/ (font-sheet.png, font-closeups.png, logo-sheet.png, card-shantell.png, card-mali.png; scripts fontproto/logoproto/cardproto.mjs; fonts downloaded via `npm pack @fontsource/<name>` into the scratchpad, copied into assets only while rendering). Candidates: Shantell Sans (recommended: most readable, marker feel, 300-800), Mali (rounder), Kalam; Caveat/Architects Daughter too thin small. Logo concepts: Flow (3 crayon boxes + arrows, "sy" ink + "sketch" orange, scribble underline; recommended), S-path, Sticky note, Crayon wordmark, Badge, Marker box. Waiting for the owner's pick.
- 2026-10-13: brand applied. Sketch theme font is now Shantell Sans (title 800, label 600, edge 500, group/badge 700; woffs + OFL in assets; @fontsource/shantell-sans devDep; Patrick Hand removed). Logo = S-path mark (three hachured nodes pink/yellow/blue on a rough "s" curve) + Shantell Sans 800 wordmark + "your system, sketched" (500; was "system design, sketched"), generated by scripts/brand.mjs into docs/brand/ (logo, logo-dark, wordmark, icon svg; logo/icon-512/social-preview png), text converted to paths. README header uses <picture> light/dark; npm READMEs show the PNG. All images regenerated; launch card rebuilt (.shots/launch/card.mjs). npm package now ~496 kB packed (fonts). eslint ignores .shots/**.
- 2026-10-13: social-preview line is now "Describe your system. Get the diagram." (was the 18x token line; the launch card keeps the 18x headline).
- 2026-10-13: README rewritten for all audiences (logo header, one-line pitch, hero, Why, Get started with AI assistant (Claude Code command + MCP JSON) or command line, short spec table, themes strip, 2x2 examples grid, optional AWS/Azure icons, benchmark table, More links, credits). Detail moved to docs/spec.md (full spec guide incl. CLI reference), docs/logos.md (logo sources, names, originality, responsible use, commands), docs/icons.md (gallery moved off the README; adding icons), CONTRIBUTING.md (source setup, checks, scripts, release steps incl. mcp-publisher). npm READMEs rewritten to match.
- 2026-10-13: logo showcase is now a mix: docs/logos/mixed.{yaml,svg} (made-up Acme company logo in docs/logos/brand/acme.svg via `logos: ./brand`, Simple Icons marks with recorded open licenses only: Apache Kafka/Spark/Flink/Airflow/Cassandra Apache-2.0, OpenTelemetry CC-BY-4.0; sysketch icons for the rest incl. PostgreSQL by name). PostgreSQL logo needs permission; CNCF (Kubernetes/Prometheus) logos fall under the LF trademark policy, so excluded. scripts/docs-logos.mjs builds a temp home with only those (licenses verified against the installed index) plus aws/azure, and fails on any other logo source. README: "Official logos (optional)" with the mix, smaller "AWS, Azure and Google Cloud" subsection (AWS image at 640px). Bug fixed: logo folder sources were labeled with their absolute path, which leaked into SVG <title>s; now basename (test added).
- 2026-10-13: npm publish 404 = expired npm login (`npm whoami` 401). Owner must `npm login`, then publish. Social preview uploaded by the owner.

## 0.4.0 verified + 0.4.1 security patch (2026-10-13)
- 0.4.0 of both packages verified from the registry (gitHead 0ec78b8): CLI help, sketch default, row folding, PNG, library VERSION/themes, MCP stdio render. Tarballs contain only dist/assets/README/LICENSE/package.json; no local paths, emails or sourcemaps.
- Security review: npm audit 0 prod vulns; only dev esbuild GHSA-g7r4-m6w7-qqqr (Windows dev server) -> root `overrides.esbuild ^0.28.2`, now 0 total. `npm audit signatures`: 276 verified signatures, 76 attestations. No secrets in tree or history; one early commit has the old local working-folder path in .claudememory: low risk, history not rewritten. `.DS_Store` existed briefly in 2 early commits.
- Fixed (0.4.1): MCP `file`/`out` confined to the project folder (realpath, symlinks), file exts .yaml/.yml/.json, out .svg/.png, saved spec never overwrites a non-spec YAML (must contain a top-level `edges:` line), spec logo folders confined via new sysketch `logoRoot` option (realpath both sides; macOS /tmp is a symlink). Installer: tarball must be https://registry.npmjs.org, sha512 required, --version validated, slugs /^[a-z0-9]+$/. Tests prove each (fail without the fix).
- Reviewed and fine: SVG output escapes all user text (title/desc/aria/logo titles) and embeds logos as <image> data URIs (no script); yaml lib caps aliases; Maps/entries avoid prototype pollution; zip import keys are normalized alnum names.
- Cleanup: removed baseline/, docs/icon-styles.png, docs/features-v2.png, docs/showcase/cloud-platform-graphite.svg, unused textPathData. CI `permissions: contents: read`; .gitignore adds .npmrc, .env*, *.tgz; SECURITY.md added. Tests: 79 core + 10 mcp + 3 e2e.
- 2026-10-13: sysketch@0.4.1 published (tarball briefly 404 at the CDN because an early request cached the miss). sysketch-mcp@0.4.1 never appeared (publish didn't complete or awaits staged approval); superseded by 0.4.2: MCP picks its folder from `--dir`, $SYSKETCH_DIR, else cwd, falling back to ~/sysketch when the client starts it in `/` (Claude Desktop on macOS, per the MCP docs), and reports `~/...` full paths whenever the folder differs from cwd. 11 mcp tests.
- 2026-10-13: verified from the registry: sysketch@0.4.1 (CLI, PNG, library, logoRoot enforced, installer refuses foreign host) and sysketch-mcp@0.4.1 (stdio render; out outside project and .sh refused; nothing written). Tarballs clean. sysketch-mcp 0.4.2 (desktop-app folder fix) committed, not yet published.

## External AI test (Google Antigravity) + 0.4.2/0.4.3 (2026-10-13)
- Owner tested sysketch-mcp in Antigravity: tools used unprompted; error recovery fine (invented "Quantum Message Bus" became a declared node); theme redraw fine; checkout came out top-down and well sized. Issues found: big diagrams stayed very wide (video 5:1, Uber, 20-service e-commerce) and models number labels themselves ("1. Authenticate"), duplicating/contradicting badges. "sendgrid" showed Azure's "SendGrid Accounts" icon: the model searched list_icons logos= and used `sendgridaccounts` (legit Azure icon, not SendGrid's brand).
- Specs reconstructed from the screenshots' legends in .shots/agtest/ (video.yaml, ecom.yaml).
- Fixes (sysketch 0.4.2): fold.ts needs cols >= k (was 2k; groups merge into single column groups), MAX_CROSSING 4 (was 2), FOLD_MIN_WIDTH 1800 in layout.ts so small diagrams never fold. video 4374x837 -> 1464x1679 (3 rows), ecom 5092 wide -> 3128x2493, web-scale example 2301x648 -> 1321x1209. model.ts strips STEP_PREFIX (/^(step)? N[.):-] /i) from labels unless steps:false.
- sysketch-mcp 0.4.2 (published by owner from 9947d31): desktop-app folder fix, verified from npm (started in /, saved to ~/sysketch with ~ path). 0.4.3: guide line "Arrows are numbered automatically in the order listed; don't number labels", server reports its own package.json version (was core VERSION), depends on ^0.4.2. Tests 80 core + 12 mcp + 3 e2e.
- 2026-10-13: verified from npm: sysketch@0.4.2 (video/ecom fold sizes match, label step numbers stripped, '2xx' kept) and sysketch-mcp@0.4.3 (reports 0.4.3, ~/sysketch fallback from /). Tarballs clean.

## Hosted MCP server (2026-10-13, committed, not deployed)
- packages/hosted (sysketch-hosted 0.1.0, private): src/app.ts `handle(Request)` (web-standard; routes POST /mcp via WebStandardStreamableHTTPServerTransport stateless + enableJsonResponse, GET /d/<code>.(png|svg|yaml)?theme=, /health; CORS *; 60 req/min/IP per instance; 256 KB bodies), src/server.ts (render_diagram(spec, theme?, preview? default true, 800 px) -> PNG/SVG links + preview image; list_icons), src/diagram.ts (encode/decode with inflate maxOutputLength, limits 20k chars/120 nodes/300 edges/4000 px PNG, logos: false always), src/serve.ts (Node server, landing + /brand svgs), api/index.js (Vercel web handlers via fromRewrite), public/index.html (landing: URL + copy, Claude/ChatGPT steps, privacy), vercel.json (install/build at repo root, outputDirectory public, rewrites /mcp,/health,/d/:file -> /api?route=..., maxDuration 30).
- Host choice: Vercel Hobby (4 active CPU-h/month ~ 40k renders at 0.1-0.4 s; non-commercial only). Cloudflare Workers free: 10 ms CPU + 3 MB cap, no. Render free sleeps; Fly has no free tier; Cloud Run free needs billing.
- Verified: 14 tests (in-process SDK client over StreamableHTTPClientTransport with fetch=handle); local server with real HTTP client (ecom 20 nodes 213 ms, PNG link 239 ms); `vercel build` (CLI 63.1.2, fake .vercel/project.json, no login) in a clean scratch copy: fonts + resvg traced, 11 MB function; workspace symlink is in filePathMap (recreated at deploy); invoking the built function directly worked for both rewritten (/api?route=) and original URLs. Unknown whether Vercel passes the original or rewritten URL; fromRewrite handles both. `vercel dev` needs login (not done).
- Next: owner deploys (Root Directory packages/hosted), checks /health, connects Claude/ChatGPT; then add `remotes` (streamable-http URL) to packages/mcp/server.json and README section once the URL is live.
- 2026-10-13: first deploy (https://sysketch.vercel.app) returned FUNCTION_INVOCATION_FAILED on every path, even `/`: Vercel's zero-config Node server detection (June 2026) treats `src/server.ts` (or `server.ts`) as a server entry and routes everything to it. Renamed to src/mcp.ts and set `"framework": null` in vercel.json. Never name a hosted file server.ts. Local `vercel build` with a fake project.json did not reproduce the detection.
