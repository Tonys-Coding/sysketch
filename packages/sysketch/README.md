# sysketch

<img alt="sysketch: your system, sketched" src="https://raw.githubusercontent.com/Tonys-Coding/sysketch/main/docs/brand/sysketch-logo.png" width="360">

**Describe your system in a few lines. Get a clean, hand-sketched architecture diagram** as SVG or PNG. Use it from the command line, from your own code, or through your AI assistant with [`sysketch-mcp`](https://www.npmjs.com/package/sysketch-mcp).

![A rate-limited API platform drawn by sysketch](https://raw.githubusercontent.com/Tonys-Coding/sysketch/main/docs/hero.png)

Requires Node.js 20 or newer.

## Command line

Describe your system in `diagram.yaml`:

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

Draw it, no install needed:

```bash
npx sysketch render diagram.yaml
```

Add `--png` for an image file or `--theme graphite` for another look. `npx sysketch icons` lists every icon and recognized name.

## In your code

```bash
npm install sysketch
```

```ts
import { render, renderToFile } from 'sysketch';

const svg = await render('edges: ["client > lb > api > db"]');
await renderToFile(specText, 'diagram.png', { theme: 'blueprint' });
```

The same spec always produces the same file.

## Features

- **Five themes:** hand-drawn `sketch` (default), `graphite`, `blueprint`, `midnight` and `classic`.
- **61 original icons** with 160+ everyday names (`redis`, `kafka`, `s3`, `lambda`...) and about 230 recognized products.
- **Readable layouts:** flows read left to right and long ones fold into rows; groups, labels, dashed and colored arrows, and a numbered step legend.
- **Official logos (optional):** import the AWS, Azure or Google Cloud icon pack, or install product logos, and they're drawn unmodified.
- **Helpful errors:** `unknown node "databse". Did you mean: database?`

## Learn more

- [Spec guide](https://github.com/Tonys-Coding/sysketch/blob/main/docs/spec.md): everything you can write in a diagram
- [Logos guide](https://github.com/Tonys-Coding/sysketch/blob/main/docs/logos.md)
- [Examples and themes](https://github.com/Tonys-Coding/sysketch#examples)
- [Benchmark](https://github.com/Tonys-Coding/sysketch/blob/main/docs/benchmark.md): 18x fewer AI tokens than having an AI write the SVG

MIT License. Fonts are SIL Open Font License (see `assets/`).
