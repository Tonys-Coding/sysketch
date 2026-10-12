# sysketch

**Polished system design diagrams from a few lines of YAML.** Your AI (or you) writes a tiny spec; a deterministic renderer draws the SVG or PNG. Icons, layout, arrows and styling cost zero AI tokens.

![Rate-limited API platform rendered by sysketch](https://raw.githubusercontent.com/Tonys-Coding/sysketch/main/docs/hero.png)

## Install

```bash
npm install sysketch          # library
npx sysketch --help           # or use the CLI without installing
```

Requires Node 20+.

## CLI

```bash
npx sysketch render diagram.yaml -o diagram.svg
npx sysketch render diagram.yaml --png --scale 2 --theme blueprint
npx sysketch icons            # list icon names and aliases
```

`diagram.yaml`:

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

## Library

```ts
import { render, renderToFile } from 'sysketch';

const svg = await render('edges: ["client > lb > api > db"]', { theme: 'blueprint' });
await renderToFile(specText, 'diagram.png', { scale: 2 });
```

## Spec

| Key         | Meaning                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------- |
| `title`     | Optional heading                                                                                    |
| `nodes`     | `id: icon` or `id: icon \| Label`. Optional: an icon name or alias used in an edge creates the node |
| `groups`    | `Label: [node ids]` draws a labeled container                                                       |
| `edges`     | `a > b`, `a > b > c`, `a > b \| label` (the label goes on the last hop)                             |
| `theme`     | `graphite` (default), `blueprint`, `midnight`, `classic`, `sketch`                                  |
| `steps`     | `false` hides the numbered step badges                                                              |
| `direction` | `right` (default) or `down`                                                                         |

61 original isometric icons with 160+ aliases (`redis`, `kafka`, `s3`, `postgres`, `lambda`, `k8s`...). Errors are short and fixable: `unknown node "databse". Did you mean: database?`

![Icon gallery](https://raw.githubusercontent.com/Tonys-Coding/sysketch/main/docs/icons-gallery.png)

## Use it from Claude, Cursor and other AI tools

Install the MCP server, [`sysketch-mcp`](https://www.npmjs.com/package/sysketch-mcp):

```bash
claude mcp add sysketch -- npx -y sysketch-mcp
```

More examples, themes and docs: **[github.com/Tonys-Coding/sysketch](https://github.com/Tonys-Coding/sysketch)**

License: MIT. Fonts are SIL Open Font License (see `assets/`).
