# Changelog

## 0.1.0 (first release)

**sysketch**

- YAML/JSON spec to SVG and PNG: nodes, groups, edge chains (`a > b > c`), edge labels, numbered steps, `right`/`down` layouts.
- Automatic layout with ELK; independent flows are laid out separately and stacked.
- Five themes: `graphite` (default), `blueprint`, `midnight`, `classic`, `sketch` (hand-drawn, rough.js).
- 61 original isometric icons with 160+ aliases; text drawn as paths so output looks identical everywhere.
- Deterministic output, short LLM-friendly error messages, CLI (`sysketch render`, `sysketch icons`) and library API (`render`, `renderToFile`, `svgToPng`).

**sysketch-mcp**

- MCP server with `render_diagram` and `list_icons`. Writes files and returns a one-line summary; saves the spec next to the diagram for cheap edits.
