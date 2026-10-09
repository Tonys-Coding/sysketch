# System Patterns

> Planned structure. Update to match reality once code exists.

## Codebase Structure (target)

```
/
├─ .claudememory/            # this memory bank
├─ CLAUDE.md                 # points Claude Code at the memory bank
├─ packages/
│  ├─ sysketch/            # core lib + CLI (merged; was core/ + cli/)
│  │  ├─ src/schema/         # zod schemas + inferred types
│  │  ├─ src/parse/          # text -> unknown
│  │  ├─ src/normalize/      # defaults, label inference, icon resolution
│  │  ├─ src/layout/         # elk adapter (graph in, positioned graph out)
│  │  ├─ src/render/         # svg builders: node, edge, badge, group, canvas
│  │  ├─ src/themes/         # theme token objects (light, dark, ...)
│  │  ├─ src/icons/          # one file per icon + registry/index
│  │  └─ test/               # unit + golden SVG snapshot tests
│  └─ mcp/                 # later (Phase 3)
├─ apps/web/                 # later
├─ examples/                 # *.yaml specs + rendered *.svg (README hero lives here)
└─ docs/                     # spec reference, icon gallery, theming guide
```

## Design Decisions

- **Spec-first, not SVG-first.** The spec schema is the product's public API. Breaking it is a major version.
- **Pure pipeline stages.** parse -> validate -> normalize -> layout -> render. No stage reads globals or the clock.
- **Theme = data.** Renderer reads tokens (colors, radius, stroke, font, spacing). Adding a theme never touches render code.
- **Icons = data.** Each icon is `{ name, aliases, viewBox, paths/shapes }`; renderer inlines them (`<symbol>` + `<use>` when repeated to keep file size down).
- **Errors are for LLMs.** Validation messages state the problem, the valid options, and a suggested fix. Include "did you mean" for icon names and ids.
- **Aliases for forgiving input.** `db`, `database`, `postgres` -> same icon. Small synonyms table beats model retries.
- **Same core everywhere.** CLI, MCP, and web all call `core`; no logic duplicated.

## Critical Rules

- Never let the renderer depend on DOM/browser APIs (must run in Node, workers, and browser).
- Output must be deterministic: sort by stable keys, no random ids (derive ids from content hash or node ids).
- Do not copy or trace ByteByteGo (or any third-party) artwork. Icons are original.
- Every new icon/theme/spec feature ships with a golden snapshot test and an entry in `examples/`.
- Keep the spec minimal: before adding a field, ask "can it be inferred?" If yes, infer it.
- Validate all external input (CLI files, MCP tool args) with the Zod schema; never trust the caller.

## Conventions

- Files: `kebab-case.ts`; types `PascalCase`; functions `camelCase`.
- No default exports in `core`.
- Tests colocated under `test/`, named `*.test.ts`; snapshots committed.
- Conventional Commits (`feat:`, `fix:`, `docs:` ...).
