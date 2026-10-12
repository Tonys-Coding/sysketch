# sysketch

[![npm: sysketch](https://img.shields.io/npm/v/sysketch?label=sysketch)](https://www.npmjs.com/package/sysketch) [![npm: sysketch-mcp](https://img.shields.io/npm/v/sysketch-mcp?label=sysketch-mcp)](https://www.npmjs.com/package/sysketch-mcp) [![CI](https://github.com/Tonys-Coding/sysketch/actions/workflows/ci.yml/badge.svg)](https://github.com/Tonys-Coding/sysketch/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**Polished system design diagrams from a few lines of YAML.** Your AI writes a tiny spec; a deterministic renderer draws the diagram. The AI never writes SVG, so a diagram costs tens of tokens instead of thousands, and every diagram comes out in the same clean style.

![Rate-limited API platform](examples/rate-limited-api.svg)

That diagram is this spec (618 characters):

```yaml
title: Rate-Limited API Platform
nodes:
  dev: user | Developer
  app: mobile | Mobile App
  web: browser | Web App
  limiter: rate-limiter | Rate Limiter
  gw: api-gateway | API Gateway
  counters: redis | Redis Counters
  api1: server | API Server 1
  api2: server | API Server 2
  jobs: worker | Job Worker
groups:
  Clients: [dev, app, web]
  Edge: [limiter, gw, counters]
  Services: [api1, api2, jobs]
edges:
  - dev > limiter | API key
  - app > limiter | HTTPS
  - web > limiter
  - limiter > counters | INCR
  - limiter > gw | allowed
  - gw > api1
  - gw > api2
  - api1 > jobs | async task
  - api2 > db
  - jobs > db
```

## Why sysketch

Asking an AI to draw a diagram usually means it writes the whole SVG: every coordinate, path and color, every time. sysketch moves all of that into a renderer.

Measured with Claude Code (Sonnet) on the same "URL shortener" request:

|                   | Output tokens | Edit ("add a notification service") |
| ----------------- | ------------- | ----------------------------------- |
| AI writes raw SVG | **10,538**    | Rewrites the whole file again       |
| AI uses sysketch  | **846**       | Two one-line edits, ~1,100 tokens   |

- **Cheap:** icons, layout, arrows and styling cost zero AI tokens.
- **Consistent:** same spec in, byte-identical SVG out. Every diagram matches.
- **Editable:** the spec is the source of truth. Change one line, re-render.
- **Portable:** text is drawn as vector paths, so diagrams look identical in browsers, GitHub, Notion, Figma, slides and PNG.
- **Forgiving:** short, fixable errors like `unknown node "databse". Did you mean: database?`

## Quick start

No install needed (Node 20+). Write a spec:

```yaml
# diagram.yaml
title: URL Shortener
groups:
  Backend: [api, cache, db]
edges:
  - client > lb | POST /shorten
  - lb > api
  - api > cache
  - api > db
```

Render it:

```bash
npx sysketch render diagram.yaml -o diagram.svg
```

More options:

```bash
npx sysketch render diagram.yaml --png --scale 2       # high-res PNG
npx sysketch render diagram.yaml --theme sketch        # pick a theme
npx sysketch icons                                     # list icons + aliases
```

Or install it as a dependency: `npm install sysketch` (see [library usage](#how-it-works)).

## Use it from Claude Code, Claude Desktop or Cursor (MCP)

sysketch ships an MCP server, [`sysketch-mcp`](https://www.npmjs.com/package/sysketch-mcp), so your AI can draw diagrams directly.

**Claude Code:**

```bash
claude mcp add sysketch -- npx -y sysketch-mcp
```

**Claude Desktop, Cursor and other MCP clients** (add to the MCP config):

```json
{
  "mcpServers": {
    "sysketch": { "command": "npx", "args": ["-y", "sysketch-mcp"] }
  }
}
```

Then just ask: _"Use sysketch to diagram a ride-sharing system, as a PNG."_ The AI writes a short spec, the server writes the files, and only a one-line summary comes back into the conversation:

```
wrote diagrams/ride-sharing.png (4564x984, 8 nodes, 10 edges, 259.8 KB); spec: diagrams/ride-sharing.yaml
```

The spec is saved next to the diagram, so follow-up edits are one-line changes. Tools: `render_diagram` (`spec` or `file`, optional `out` as .svg/.png, `theme`, `preview`) and `list_icons`. The tool definitions add about 360 tokens per session.

## Spec reference

| Key         | Meaning                                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| `title`     | Optional heading                                                                                            |
| `nodes`     | `id: icon` or `id: icon \| Label`. Optional: an icon name or alias used in an edge creates the node for you |
| `groups`    | `Label: [node ids]` draws a labeled container                                                               |
| `edges`     | `a > b`, `a > b > c`, `a > b \| label` (the label goes on the last hop)                                     |
| `theme`     | `graphite` (default), `blueprint`, `midnight`, `classic`, `sketch`                                          |
| `steps`     | `false` hides the numbered step badges (default: numbered in edge order)                                    |
| `direction` | `right` (default) or `down`                                                                                 |

The smallest useful spec is one line, because aliases create nodes automatically:

```yaml
edges: ['client > lb > api > db']
```

Aliases include `client`, `lb`, `api`, `db`, `redis`, `kafka`, `s3`, `postgres`, `lambda`, `k8s` and many more; run `npx sysketch icons` for the full list.

## Themes

| Graphite (default)                    | Blueprint                               | Midnight                              | Classic                             | Sketch                            |
| ------------------------------------- | --------------------------------------- | ------------------------------------- | ----------------------------------- | --------------------------------- |
| ![graphite](docs/themes/graphite.svg) | ![blueprint](docs/themes/blueprint.svg) | ![midnight](docs/themes/midnight.svg) | ![classic](docs/themes/classic.svg) | ![sketch](docs/themes/sketch.svg) |

Themes are pure data (colors, fonts, card style, shadows, texture), so adding one never touches the renderer. The sketch theme redraws everything hand-made with rough.js.

## Icons

A complete set of **61 original isometric icons**, recolored automatically for every theme and covering clients, edge, compute, data, messaging, security, observability, AI and infrastructure. More than 160 aliases (`redis`, `kafka`, `s3`, `lambda`, `k8s`...) map onto them.

![Icon gallery](docs/icons-gallery.png)

Full list: [docs/icon-checklist.md](docs/icon-checklist.md). Want to draw or restyle icons? The style guide and a ready-to-use AI prompt are in [docs/isometric/GUIDE.md](docs/isometric/GUIDE.md). Drop an SVG into `icons-src/` and run `npm run icons`; it validates the file, converts it, and renders a preview of every icon in every theme.

## More examples

**Cloud-Native Platform** in the sketch theme ([spec](examples/cloud-platform.yaml)):

![Cloud-native platform, sketch theme](docs/showcase/cloud-platform-sketch.svg)

**Smart Commerce Platform** in the midnight theme, with search, recommendations, an AI assistant, payments and an observability pipeline ([spec](examples/smart-commerce.yaml)):

![Smart commerce platform, midnight theme](docs/showcase/smart-commerce-midnight.svg)

**Secure Data Platform** in the blueprint theme ([spec](examples/secure-data-platform.yaml)):

![Secure data platform, blueprint theme](docs/showcase/secure-data-platform-blueprint.svg)

## How it works

```
YAML/JSON spec -> validate (Zod) -> normalize (aliases, labels, steps)
              -> layout (ELK, each independent flow laid out separately)
              -> themed SVG (icons, text as paths) -> optional PNG (resvg)
```

Every stage is a pure function: no randomness, no clock, no browser. That makes output byte-identical across runs, which keeps diffs clean and tests simple.

As a library:

```ts
import { render, renderToFile } from 'sysketch';

const svg = await render('edges: ["client > lb > api > db"]', { theme: 'blueprint' });
await renderToFile(specText, 'diagram.png', { scale: 2 });
```

## Development

```bash
git clone https://github.com/Tonys-Coding/sysketch.git
cd sysketch
npm install
npm run build
npm test             # unit + golden SVG tests
npm run test:e2e     # Playwright visual regression
npm run lint && npm run typecheck
npm run icons        # import icons-src/*.svg and render a preview sheet
```

Packages: `packages/sysketch` (renderer, CLI, library) and `packages/mcp` (MCP server). Inside the repo, `.mcp.json` runs the local MCP build. Releases are published by pushing a `vX.Y.Z` tag (see `.github/workflows/release.yml`).

## Roadmap

- Node subtitles, dashed "response" arrows, colored arrows, step legend
- Web playground with live preview

## Credits

Icons and palettes are original. Fonts: Inter, JetBrains Mono, Nunito and Patrick Hand (all SIL Open Font License, see `packages/sysketch/assets/`). Layout by [ELK](https://github.com/kieler/elkjs), PNG export by [resvg](https://github.com/yisibl/resvg-js), sketch style by [rough.js](https://roughjs.com).

License: MIT
