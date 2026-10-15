# sysketch hosted MCP server

The sysketch MCP server as a web service, for AI apps that can't run programs on your computer: ChatGPT and Claude on the web, desktop and phone. Users paste one URL and can ask for diagrams. Not published to npm.

## How it works

- **MCP endpoint:** `POST /mcp` (Streamable HTTP, stateless, no sign-in).
- **Tools:**
  - `render_diagram(spec, theme?, preview?)` returns PNG and SVG links plus a small preview image (about 1k tokens).
  - `list_icons` lists the icon names; `logos` searches the product logos.
- **In-chat viewer ([MCP Apps](https://github.com/modelcontextprotocol/ext-apps)):** hosts that support it (Claude, ChatGPT, VS Code, Goose) show the diagram in the chat with zoom, pan, fullscreen and PNG/SVG downloads. The page is `ui://sysketch/viewer.html`, built from `viewer/` into one HTML file (`npm run build`). It gets the links through `structuredContent`, which stays out of the model's context, and may only load images from this server. Other hosts get the preview and links as before.
- **Diagram links:** `/d/<code>.png`, `.svg` and `.yaml`, where `<code>` is the spec itself, compressed. Nothing is stored, so links keep working and can be shared, and the CDN caches each one.
- **Limits:**
  - 20,000-character specs, 120 nodes, 300 edges, PNGs up to 4,000 px;
  - 60 requests per minute per IP on each server instance;
  - 30 s per request.
- **Product logos from Simple Icons.** The build installs the latest Simple Icons release (`npm run logos`, checked the same way as `sysketch logos install`), so a logo a brand asked Simple Icons to remove disappears on the next deploy. Logos are drawn unaltered and only inside diagrams, under nominative fair use (naming the actual product in an architecture diagram). Specs can't name logo folders (`logos: ./folder`), and `logos: false` turns logos off. The AWS, Azure and Google Cloud packs and company logos stay features of the local `sysketch-mcp`.
- **Removing a logo:** add its Simple Icons slug to [`blocked-logos.txt`](blocked-logos.txt) and push; the next deploy leaves it out.
- **Landing page:** `/` explains how to connect and shows the server URL.

A render takes about 0.1 to 0.4 s of CPU, so Vercel's free Hobby plan (4 CPU-hours a month) covers roughly 40,000 renders. Repeat views of a link come from the CDN.

## Deploy to Vercel (free)

1. Sign up at [vercel.com](https://vercel.com) with your GitHub account. The Hobby plan is free and needs no card.
2. Choose **Add New → Project** and import the `sysketch` repository.
3. Set **Root Directory** to `packages/hosted`. Leave the framework as **Other** and the build settings empty, since `vercel.json` provides them.
4. Click **Deploy**. When it finishes, open `https://<your-project>.vercel.app/health`; it should show `{"ok":true,...}`.

Every push to `main` redeploys automatically.

Optional:

- **Custom domain:** add it under **Settings → Domains**, then set the environment variable `SYSKETCH_PUBLIC_URL` (for example `https://mcp.sysketch.dev`) so diagram links use it.
- **Rate limiting:** add a rule under **Firewall** for stronger, cross-instance limits.

The Hobby plan is for non-commercial use. If you start charging, move to Vercel Pro, or run `npm start` on any host that runs Node (Render, Fly.io, Google Cloud Run).

## Connect

- **Claude:** Settings → Connectors → Add custom connector → paste `https://<your-project>.vercel.app/mcp`.
- **ChatGPT:** Settings → Apps & Connectors → Advanced → turn on Developer mode, then create a connector with the same URL and no authentication.

## Develop

```bash
npm run build -w sysketch && npm run build -w sysketch-hosted
npm run logos -w sysketch-hosted # optional: product logos (downloads Simple Icons)
npm start -w sysketch-hosted     # http://localhost:3000, MCP at /mcp
npm test -w sysketch-hosted
```

The same `handle(request)` function from `src/app.ts` runs on Vercel (`api/index.js`) and in the local Node server (`src/serve.ts`).
