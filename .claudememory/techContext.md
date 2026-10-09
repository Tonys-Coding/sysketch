# Technical Context

## Core Stack (proposed — items marked ? need a decision)

- **Language:** TypeScript, `strict: true`, ESM only.
- **Runtime:** Node >= 20 (dev machine has Node 24.13, npm 11; pnpm NOT installed).
- **Repo layout:** npm workspaces monorepo (no extra tooling needed; pnpm optional later ?).
- **Schema/validation:** Zod (single source for types + LLM-friendly errors + JSON Schema export for MCP tool definition).
- **Spec parsing:** `yaml` package (parses YAML and JSON).
- **Layout:** `elkjs` (nested groups, orthogonal edge routing). `dagre` is the fallback if ELK proves too heavy/slow.
- **Rendering:** hand-written deterministic SVG string builder (no DOM dependency, runs in Node and browser).
- **PNG export:** `@resvg/resvg-js` (no headless browser; embeds fonts reliably).
- **Build/test:** `tsup` (build), `vitest` (unit + snapshot tests), `eslint` + `prettier`.
- **Web/visual testing:** Playwright (`@playwright/test` 1.64.0 installed, Chromium downloaded). Config: `playwright.config.ts`, tests in `tests/e2e/`, run with `npm run test:e2e`. Use it to (a) screenshot rendered SVGs so we can eyeball ByteByteGo-level quality, (b) `toHaveScreenshot` visual regression on golden diagrams, (c) e2e-test the web playground later.
- **Text in SVG:** convert text to paths using real font metrics (`opentype.js` or `fontkit`). See decision log in `progress.md`.
- **Spec input:** canonical model is a JSON object (what MCP passes). YAML accepted as a human/CLI front-end. Edges support a chain shorthand string, e.g. `"client > lb > api"`.
- **MCP server:** official `@modelcontextprotocol/sdk` over stdio.
- **Web editor (phase 4):** React + Vite, CodeMirror for the spec, live SVG preview. Static site, host on GitHub Pages.

## Planned Packages

| Package                         | Responsibility                                                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `packages/sysketch`             | core (schema, parse, validate, layout, theme, icons, `renderSvg`) + CLI `sysketch render spec.yaml -o out.svg --png --theme dark` |
| `packages/mcp` (`sysketch-mcp`) | MCP server exposing `render_diagram`, `list_icons`, `get_spec_schema`                                                             |
| `apps/web`                      | playground/editor (later)                                                                                                         |

## Architecture & Data Flow

```
text (YAML/JSON)
  -> parse           (yaml)
  -> validate        (zod; LLM-readable errors)
  -> normalize       (fill default labels, resolve groups, assign sizes)
  -> layout          (elkjs: nodes+groups+edges -> x/y/width/height + edge polylines)
  -> render          (theme tokens + icon registry -> SVG string)
  -> [rasterize]     (resvg -> PNG)
```

Every stage is a pure function so each is unit-testable and the whole pipeline is deterministic.

## Known Technical Risks

1. **Text measurement without a browser.** ELK needs node sizes, which depend on label width. RESOLVED by decision: load the font with `opentype.js`/`fontkit`, measure real advance widths, and render the same glyphs as paths, so measured == drawn.
2. **ELK edge routing aesthetics.** Default routing can look busy. Budget time for tuning options (layer spacing, edge-node spacing, orthogonal routing, port constraints) and for placing step badges at a sensible point along the route.
3. **Font in SVG vs PNG.** DECIDED: text -> paths by default (see `progress.md` decisions). Mitigate lost accessibility with `<title>`/`<desc>`/aria-label on the root and nodes. Optional `--text=embed` mode (subset WOFF2 base64) can come later. PNG via resvg then needs no font at all.
4. **elkjs bundle size/perf** in the browser editor (use the web-worker build).
5. **Determinism:** avoid anything time/random-dependent; stable ordering of nodes/edges.

## Deployment / Distribution Strategy

- **npm:** publish `core`, `cli`, `mcp` under one scope (name TBD). `npx <name>` must work with zero config.
- **MCP:** document one-line install for Claude Code (`claude mcp add ...`) and Claude Desktop JSON config; list in MCP registries/awesome lists.
- **Web playground:** static deploy (GitHub Pages / Vercel). No backend, no DB, no auth.
- **CI:** GitHub Actions — lint, typecheck, test, build, release via changesets.
- **License:** MIT (confirm; icons and font licenses must be compatible).

## Dev Environment Notes

- Working dir: `/Users/tony/Downloads/My Projects/System Design Tool` (not a git repo yet — `git init` in phase 0).
- No database. No server. No secrets required for core.
