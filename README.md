# sysketch

Turn a ~40-token spec into a polished system design diagram. **The LLM never writes SVG**; a deterministic renderer does.

![URL shortener](examples/url-shortener.svg)

```yaml
title: URL Shortener
groups:
  Backend: [api, cache, db]
edges:
  - client > lb | POST /shorten
  - lb > api
  - api > cache
  - api > db
```

That is 138 characters (about 40 tokens). Drawing the same diagram as raw SVG by hand takes roughly 5,000 characters (about 1,500 tokens), and a richer one takes much more. Estimates, see `baseline/`.

## Why

- **Cheap:** icons, layout, arrows and styling cost zero LLM tokens.
- **Consistent:** same spec, byte-identical SVG, same look every time.
- **Editable:** the spec is the source of truth. Change one line, re-render.
- **Portable:** text is converted to paths, so it looks identical in browsers, slides, Notion, Figma and PNG.

## Use

```bash
npx sysketch render examples/url-shortener.yaml -o out.svg
npx sysketch render examples/url-shortener.yaml --png --scale 2 --theme blueprint
npx sysketch icons
```

### With Claude Code, Claude Desktop, Cursor (MCP)

```bash
claude mcp add sysketch -- npx -y sysketch-mcp
```

Claude Desktop / Cursor config:

```json
{ "mcpServers": { "sysketch": { "command": "npx", "args": ["-y", "sysketch-mcp"] } } }
```

Then just ask: _"Diagram a URL shortener with sysketch."_ The model writes a short spec, the server writes `diagrams/url-shortener.svg`, and only a one-line summary comes back:

```
wrote diagrams/url-shortener.svg (1190x444, 5 nodes, 4 edges, 61.9 KB)
```

Tools: `render_diagram` (`spec` or `file`, optional `out` .svg/.png, `theme`, `preview`) and `list_icons`. The tool definitions cost about 360 tokens per session; a typical call is about 100 tokens. `preview: true` returns a PNG for the model to look at, which costs more, so it is off by default.

(Not published to npm yet. Inside this repo, `.mcp.json` runs the local build.)

```ts
import { render } from 'sysketch';
const svg = await render('edges:\n  - client > lb > api > db');
```

## Spec

| Key         | Meaning                                                                           |
| ----------- | --------------------------------------------------------------------------------- |
| `title`     | Optional heading                                                                  |
| `nodes`     | `id: icon` or `id: icon \| Label`. Optional: icon names/aliases auto-create nodes |
| `groups`    | `Label: [node ids]` draws a labeled container                                     |
| `edges`     | `a > b`, `a > b > c`, `a > b \| label` (label goes on the last hop)               |
| `theme`     | `graphite` (default), `blueprint`, `midnight`, `classic`                          |
| `steps`     | `false` to hide the numbered step badges (default: numbered in edge order)        |
| `direction` | `right` (default) or `down`                                                       |

Icons: user, server, database, cache, queue, load-balancer, api-gateway, cdn, storage, cloud, plus aliases (`client`, `lb`, `db`, `redis`, `kafka`, `s3`...).

## Themes

| Graphite (default)                    | Blueprint                               | Midnight                              | Classic                             |
| ------------------------------------- | --------------------------------------- | ------------------------------------- | ----------------------------------- |
| ![graphite](docs/themes/graphite.svg) | ![blueprint](docs/themes/blueprint.svg) | ![midnight](docs/themes/midnight.svg) | ![classic](docs/themes/classic.svg) |

Errors are short and fixable, e.g. `unknown node "databse". Did you mean: database?`

## Status

Early development. Renderer, themes, PNG export and MCP server work; the icon set is being expanded. See `.claudememory/progress.md`.

Icons and palette are original. The look is inspired by flat educational system design diagrams, with no third-party artwork. Fonts: Inter, JetBrains Mono and Nunito (all SIL OFL, see `packages/sysketch/assets/`).

License: MIT
