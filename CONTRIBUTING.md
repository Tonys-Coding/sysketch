# Contributing

Thanks for helping improve sysketch. Bug reports, diagrams that lay out badly, new icons and code are all welcome; please open an issue first for larger changes.

## Run from source

You need Node.js 20 or newer.

```bash
git clone https://github.com/Tonys-Coding/sysketch.git
cd sysketch
npm install
npm run build
```

The repository has two packages:

- `packages/sysketch`: the renderer, command line tool and library.
- `packages/mcp`: the MCP server for AI assistants.

Inside the repository, `.mcp.json` runs the local MCP build, so Claude Code uses your changes after `npm run build`.

## Checks

Run these before opening a pull request:

```bash
npm run lint && npm run typecheck
npm test            # unit tests and golden SVG files
npm run test:e2e    # visual tests (Playwright, macOS baselines)
```

If you change how diagrams look, regenerate the images and review them before committing:

```bash
node scripts/docs.mjs    # examples and README images (never includes brand logos)
```

## Other scripts

| Command                       | What it does                                                         |
| ----------------------------- | -------------------------------------------------------------------- |
| `npm run icons`               | Imports `icons-src/*.svg` and renders a preview sheet                |
| `node scripts/brand.mjs`      | Regenerates the logo set in `docs/brand/`                            |
| `node scripts/docs-logos.mjs` | Renders the AWS and Azure examples (needs those icon packs imported) |
| `node bench/run.mjs`          | Runs the token benchmark (needs the Claude Code CLI; costs ~$3-5)    |
| `node bench/report.mjs`       | Turns a benchmark run into `docs/benchmark.md`                       |

## Releases

1. Update the version in both `packages/*/package.json` (and the `sysketch` dependency of `sysketch-mcp`), `packages/mcp/server.json` and `CHANGELOG.md`.
2. Publish `sysketch` first, then `sysketch-mcp`:

   ```bash
   npm publish -w sysketch --access public
   npm publish -w sysketch-mcp --access public
   ```

   Or push a `vX.Y.Z` tag: `.github/workflows/release.yml` publishes both when the `NPM_TOKEN` secret is set.

3. Update the MCP registry entry: `cd packages/mcp && mcp-publisher publish`.

## Principle

The AI never writes SVG. It writes a small spec, and a deterministic pipeline (parse, validate, layout with ELK, themed SVG) draws it. The same spec always produces the same file, which keeps diffs readable and tests simple.
