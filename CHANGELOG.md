# Changelog

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
