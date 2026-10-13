# Icons

sysketch includes **61 original isometric icons**, covering clients, networking, compute, data, messaging, security, observability, AI and infrastructure. Each icon adapts its colors to the theme, and more than 160 everyday names (`redis`, `kafka`, `s3`, `lambda`, `k8s`...) map onto them.

![The sysketch icon set](icons-gallery.png)

## Finding the right name

```bash
npx sysketch icons
```

This lists every icon with the names that select it, followed by about 230 product names (`sendgrid`, `auth0`, `aks`...) and the icon each one uses. Your AI assistant can look these up itself.

If no icon fits, write `name/icon` in your diagram, for example `acme/queue`, or install [official logos](logos.md).

## Drawing or restyling icons

The icons are original artwork stored as SVG files in [`icons-src/`](../icons-src). To add or change one:

1. Read the [style guide](isometric/GUIDE.md), which also has a ready-to-use prompt for AI image tools.
2. Save the SVG in `icons-src/` with the icon's name, for example `icons-src/cache.svg`.
3. Run `npm run icons`. It checks the file, converts it and renders a preview of every icon in every theme.

The full checklist, with the status of every icon, is in [icon-checklist.md](icon-checklist.md).
