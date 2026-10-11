# icons-src

Your original icon drawings live here, one SVG per icon, named after the checklist (`database.svg`, `api-gateway.svg`).

Keeping an old version? Name it `name-old.svg`, `name.bak.svg` or `_name.svg` and the importer skips it.

After adding or changing icons, run:

```bash
npm run icons
```

That validates and converts them, rebuilds sysketch, and writes a preview of every icon in every theme to `_preview.png` (not committed). Full rules: `docs/icon-checklist.md`.
