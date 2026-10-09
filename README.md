# sysketch

Turn a ~40-token spec into a polished, flat, colorful system design diagram. **The LLM never writes SVG**; a deterministic renderer does.

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
npx sysketch icons
```

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
| `steps`     | `false` to hide the numbered step badges (default: numbered in edge order)        |
| `direction` | `right` (default) or `down`                                                       |

Icons: user, server, database, cache, queue, load-balancer, api-gateway, cdn, storage, cloud, plus aliases (`client`, `lb`, `db`, `redis`, `kafka`, `s3`...).

Errors are short and fixable, e.g. `unknown node "databse". Did you mean: database?`

## Status

Early development (Phase 1). MCP server, PNG export and more icons/themes are next. See `.claudememory/progress.md`.

Icons and palette are original. The look is inspired by flat educational system design diagrams, with no third-party artwork. Font: Nunito (SIL OFL, see `packages/sysketch/assets/`).

License: MIT
