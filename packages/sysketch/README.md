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

| Key         | Meaning                                                                                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`     | Optional heading                                                                                                                                                  |
| `nodes`     | `id: icon`, `id: icon \| Label` or `id: icon \| Label \| subtitle`. Optional: an icon name or alias used in an edge creates the node                              |
| `groups`    | `Label: [node ids]` draws a labeled container                                                                                                                     |
| `edges`     | `a > b`, `a > b > c`, `a > b \| label` (label on the last hop). `a ..> b` is dashed (responses, async); a trailing `[red]` or `[green, dashed]` colors the arrows |
| `theme`     | `graphite` (default), `blueprint`, `midnight`, `classic`, `sketch`                                                                                                |
| `steps`     | `false` hides the numbered step badges                                                                                                                            |
| `legend`    | `true` adds a numbered list of the steps under the diagram                                                                                                        |
| `logos`     | `./folder` adds your own logo files; `false` turns brand logos off                                                                                                |
| `direction` | `right` or `down`; leave it out to let sysketch pick the more readable shape                                                                                      |

New in 0.2.0: node subtitles, dashed (`..>`) and colored (`[red]`) arrows, and `legend: true`:

![Subtitles, colored and dashed arrows, step legend](https://raw.githubusercontent.com/Tonys-Coding/sysketch/main/docs/features-v2.png)

61 original isometric icons with 160+ aliases (`redis`, `kafka`, `s3`, `postgres`, `lambda`, `k8s`...). Errors are short and fixable: `unknown node "databse". Did you mean: database?`

![Icon gallery](https://raw.githubusercontent.com/Tonys-Coding/sysketch/main/docs/icons-gallery.png)

## Official brand logos

sysketch ships no logos, but draws official ones you install, unedited (original file, even scaling, fingerprint-checked). They live in `~/.sysketch/logos`:

```bash
npx sysketch logos install simple-icons             # ~3,400 brand marks, integrity-checked
npx sysketch logos import ~/Downloads/<pack>.zip    # AWS, Azure or Google Cloud icon pack
```

Download the cloud packs from [AWS](https://aws.amazon.com/architecture/icons/), [Azure](https://learn.microsoft.com/en-us/azure/architecture/icons/) or [Google Cloud](https://cloud.google.com/icons). Then `stripe`, `s3`, `cosmosdb` or `bigquery` in a spec show the official logo. Without logos, about 230 product names (`sendgrid`, `auth0`, `aks`...) fall back to a fitting icon; `acme/queue` covers anything else. Check each brand's guidelines with `npx sysketch logos info <name>`.

## Use it from Claude, Cursor and other AI tools

Install the MCP server, [`sysketch-mcp`](https://www.npmjs.com/package/sysketch-mcp):

```bash
claude mcp add sysketch -- npx -y sysketch-mcp
```

More examples, themes and docs: **[github.com/Tonys-Coding/sysketch](https://github.com/Tonys-Coding/sysketch)**

License: MIT. Fonts are SIL Open Font License (see `assets/`).
