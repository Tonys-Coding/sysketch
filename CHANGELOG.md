# Changelog

## Unreleased

**sysketch**

- Layout follows the spec order even with loops: edges that close a cycle (responses like `api ..> client`, callbacks, `chat > gateway`) are laid out as return arrows instead of reordering the whole flow. Dashed edges that don't close a loop (`kafka ..> ledger`) keep pointing forward.
- Specs without `direction` switch to top-down when left-to-right would be too wide to read.
- Tighter spacing between columns and around arrow labels (diagrams about 8% narrower).
- SVG files are 4-6x smaller: each glyph is defined once and reused, instead of drawing every letter as its own path. Rendering is unchanged.

**sysketch-mcp**

- Tool guide asks the model to leave `direction` out unless the user wants one.

**Repository**

- Token benchmark: `bench/` runs 5 prompts plus edits through headless Claude Code with and without sysketch; results in `docs/benchmark.md` (18x fewer output tokens to create a diagram).
- `scripts/docs.mjs` regenerates every README image without brand logos.

## 0.3.0

**sysketch**

- Official brand logos, drawn unedited. sysketch ships none: install them from the official source with `sysketch logos install simple-icons` (~3,400 marks, npm integrity-checked), import the AWS, Azure or Google Cloud icon pack zip with `sysketch logos import <pack.zip>` (source and file names detected automatically), or point a spec at a company folder with `logos: ./brand`. Files are fingerprinted when installed and checked before drawing; edited files are refused.
- About 230 product names (`sendgrid`, `auth0`, `aks`, `cloudflare`, `bigquery`...) are recognized without logos and fall back to a fitting icon, so specs render everywhere; `brand/icon` (e.g. `acme/queue`) covers anything else.
- `sysketch logos find|info|lock|remove`, `render --logos <folder>` and `--no-logos`; library options `logos`, `logoDirs`, `baseDir`, `logoHome`.
- PNG sizes in the render summary are rounded.

**sysketch-mcp**

- Tool guide mentions logos and product names; `list_icons` takes `logos=` to search installed logos. Tool definitions are about 450 tokens per session (up from about 390). Requires sysketch ^0.3.0.

## 0.2.0

**sysketch**

- Node subtitles: `api: server | API Server | stateless, 3 replicas` (or `sub:` in the object form).
- Dashed arrows with `a ..> b` for responses and async calls, or `[dashed]`.
- Colored arrows with a trailing `[red]`, `[green, dashed]`, ... (10 palette colors plus synonyms); the step badge takes the arrow's color. Object form: `color:`, `dashed:`.
- `legend: true` draws a numbered Steps panel under the diagram (two columns for longer flows); `note:` on an edge overrides its legend text.
- Return edges (e.g. `api ..> client`) no longer flip the main flow: layout follows the order nodes first appear in the edges.
- Values containing `: ` (like `title: URL Shortener: Read Path`) are auto-quoted instead of failing to parse.

**sysketch-mcp**

- Tool guide covers subtitles, dashed and colored arrows, and legends (about 30 more tokens per session). Requires sysketch ^0.2.0.

## 0.1.0 (first release)

**sysketch**

- YAML/JSON spec to SVG and PNG: nodes, groups, edge chains (`a > b > c`), edge labels, numbered steps, `right`/`down` layouts.
- Automatic layout with ELK; independent flows are laid out separately and stacked.
- Five themes: `graphite` (default), `blueprint`, `midnight`, `classic`, `sketch` (hand-drawn, rough.js).
- 61 original isometric icons with 160+ aliases; text drawn as paths so output looks identical everywhere.
- Deterministic output, short LLM-friendly error messages, CLI (`sysketch render`, `sysketch icons`) and library API (`render`, `renderToFile`, `svgToPng`).

**sysketch-mcp**

- MCP server with `render_diagram` and `list_icons`. Writes files and returns a one-line summary; saves the spec next to the diagram for cheap edits.
