# Progress & Roadmap

_Last updated: 2026-10-09_

## What Is Working

- [x] Idea validated in planning chat; core architecture decided (spec -> deterministic render, LLM never writes SVG).
- [x] Memory bank created.
- [x] `package.json` (private workspace root), Playwright 1.64.0 + Chromium installed, `playwright.config.ts`, smoke test passing (`npm run test:e2e`), `.gitignore`.
- [x] Monorepo scaffold: lint, typecheck, vitest, tsup build, Playwright, CI workflow all pass locally.
- [ ] Renderer (Phase 1) not started.

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

- [ ] Spec v0 schema (Zod) + LLM-friendly errors.
- [ ] 10 starter icons, hand-curated.
- [ ] Light theme as tokens.
- [ ] Pipeline: parse -> normalize -> ELK layout -> SVG (groups, numbered step badges, edge labels, arrowheads).
- [ ] Golden test + `examples/url-shortener.yaml` + rendered SVG.
- **Exit criteria:** reference diagram looks good enough to be the README hero image.

### Phase 2 — CLI + PNG (≈ 1 day)

- [ ] `render` command (file/stdin -> svg/png), `--theme`, `--scale`.
- [ ] resvg PNG export with embedded font.
- [ ] `npx` works with zero config.

### Phase 3 — MCP server (≈ 1 day) — the distribution hook

- [ ] Tools: `render_diagram(spec, format, theme)`, `list_icons()`, `get_spec_schema()`.
- [ ] Return SVG text and/or saved file path; image content for PNG.
- [ ] Verify end-to-end from Claude Code (`claude mcp add`) and Claude Desktop.
- [ ] Include a short "how to write a spec" prompt/resource so models get it right first try.

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
| 2026-10-09 | MCP/CLI return file path + short summary, never SVG text                                                                      | Prevents re-creating the token cost we are eliminating                                                                                                                     |

## Open Questions

1. Project name? Shortlist (all free on npm as of 2026-10-09; GitHub/domain NOT checked): `sysketch` (leading pick), `archsmith`, `stencilo`, `boxflow`, `tinyarch`, `sketchspec`. Taken on npm: archdraw, specdraw, blueprintr, drawbridge, blocksmith.
2. ~~YAML vs DSL~~ Decided: JSON model + YAML front-end + edge-chain shorthand (see decisions).
3. ~~Text paths vs font~~ Decided: paths (see decisions).
4. Edge style: orthogonal vs curved as default? (Lean orthogonal with rounded corners; verify visually with Playwright screenshots.)
5. Is the web playground in v1 or post-launch? (Lean post-launch; MCP + CLI first.)
