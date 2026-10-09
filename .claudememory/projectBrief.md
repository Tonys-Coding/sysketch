# Project Brief

> Source of truth for _why_ this project exists. Read first, every session.
> Origin: planning chat on claude.ai (2026-10-09), distilled here.

## One-liner

An open-source toolkit that turns a tiny declarative diagram spec (~200 tokens) into a polished, ByteByteGo-_inspired_ system design SVG/PNG, with zero LLM tokens spent on drawing. Ships as a library, CLI, and MCP server so any AI client can call `render_diagram(spec)`.

(Working name: **TBD** — pick before first public commit. Check npm + GitHub name availability.)

## The Pain Point (what we are actually solving)

1. **Cost.** When an LLM writes raw SVG it pays output tokens for every coordinate, path, gradient and repeated icon. Styled system-design diagrams are the worst case: the same cylinder/server/queue is redrawn in full every time. A single diagram can cost thousands of tokens.
2. **Inconsistency.** Even after paying, each generation looks different: icon shapes, spacing, colors, arrow style drift between runs and between diagrams in the same article/deck.
3. **Hard to iterate.** Changing one node means regenerating (and re-paying for) the whole SVG; there is no editable source of truth.
4. **No good "educational" look off the shelf.** Mermaid / D2 / Excalidraw / draw.io / Eraser exist, but (unverified, must confirm with a GitHub search) none pair a flat, colorful, polished educational style with a spec format designed for cheap LLM authoring.

## The Core Idea

**The LLM never writes SVG.** Split the job:

1. LLM emits a small declarative spec (YAML/JSON, 20–40 lines).
2. A deterministic pipeline renders it: `spec -> validate -> ELK layout -> themed SVG (-> PNG)`.

Result: ~10-20x fewer tokens, identical style every time, diagrams are diffable/editable text.

## Quality Bar & Efficiency Mandate (from the owner, 2026-10-09)

The owner's real struggle: wants AI to produce ByteByteGo-quality system design charts, flows, and designs **without burning half their usage in one go**. So two equal requirements:

- **Quality:** looks and reads like ByteByteGo (flat, colorful, rounded, numbered steps, generous whitespace, large legible labels). Readability beats density.
- **Efficiency:** total tokens across the _whole loop_ matter, not just the spec. Levers:
  1. Tiny spec (edge chains, inferred labels, icon by name).
  2. **MCP/CLI returns a file path + a one-line summary, never the SVG text** (SVG in context re-creates the cost).
  3. **Keep the MCP tool schema tiny** (tool definitions are loaded into context every session). Few tools, short descriptions.
  4. Edits as small diffs: spec lives in a file, Claude edits 1-2 lines and re-renders; never resend the whole spec.
  5. Short, actionable errors (no stack traces, no schema dumps).
  6. Ship a ~300-token "how to write a spec" cheat sheet (skill/resource), not long docs.
  7. Visual QA via Playwright screenshots happens in our dev loop, not in the user's runtime loop.

## Goals

- G1: A URL-shortener-sized diagram renders in < 1s, looks genuinely good, from a spec under ~300 tokens.
- G2: One-line install and a 30-second "wow" (README hero image + copy-paste example).
- G3: First-class MCP server so Claude Code / Claude Desktop / Cursor can render diagrams directly.
- G4: Consistent theming via design tokens; ship 2+ themes (light, dark).
- G5: Be a credible portfolio piece even if it never goes viral.

## Non-Goals (for now)

- Not a general-purpose diagramming app (no freeform canvas, no arbitrary shapes).
- Not a ByteByteGo clone. No copied assets, fonts, palette, or layouts. "Inspired by the flat educational look" only.
- No hosted SaaS, accounts, or backend in v1.
- No LLM calls inside the tool itself (the point is that the _caller's_ LLM stays cheap).

## Hard Constraints

- **Legal/IP:** all icons original (we generate and curate our own), own palette, own font choice with a permissive license. Never reproduce ByteByteGo artwork.
- **Determinism:** same spec in -> byte-identical SVG out (matters for tests, snapshots, caching, git diffs).
- **Token budget is a product feature:** every schema decision is judged by "does this make the LLM's job shorter and less error-prone?"

## Success Signals

- Spec for the reference diagram <= ~250 tokens (measure it, put the number in the README).
- Raw-SVG-by-LLM baseline vs. spec approach comparison table in README (tokens + cost).
- Works end-to-end from Claude Code via MCP with no manual steps.
- Stars/issues are a bonus, not the metric. Distribution plan lives in `progress.md`.
