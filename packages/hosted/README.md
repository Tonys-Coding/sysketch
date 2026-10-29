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
- **Product logos and cloud icons.** The build (`npm run logos`) installs:
  - the latest Simple Icons release, checked the same way as `sysketch logos install`, so a logo a brand asked Simple Icons to remove disappears on the next deploy;
  - OpenAI's Blossom mark (for `openai` and `chatgpt`) from [OpenAI's brand page](https://openai.com/brand/), used under its brand guidelines: unaltered, with its built-in clear space, only for nodes that are OpenAI services;
  - the official AWS, Azure and Google Cloud (core and legacy) architecture icon packs, which the providers publish for architecture diagrams: the exact files pinned in [`logo-packs.json`](logo-packs.json), checked against their sha256 and imported unaltered. A pack that can't be downloaded or doesn't match is skipped with a warning in the build log; `/health` lists the sources that made it. When a provider publishes a new pack, put its URL and sha256 in `logo-packs.json`.

  Logos are drawn unaltered and only inside diagrams. Specs can't name logo folders (`logos: ./folder`), and `logos: false` turns logos off. Company logos stay a feature of the local `sysketch-mcp`. Google's download links don't change between releases, so when Google updates a pack the checksum stops matching and the build skips it with a warning until `logo-packs.json` is updated.

- **Removing a logo:** add its Simple Icons slug to [`blocked-logos.txt`](blocked-logos.txt) and push; the next deploy leaves it out.
- **Landing page:** `/` explains how to connect and shows the server URL. [`/privacy.html`](public/privacy.html) and [`/terms.html`](public/terms.html) are the legal pages app directories ask for.
- **Anonymous usage counts (optional):** with an Upstash Redis database connected, the server counts diagrams drawn and failed per day, diagram types, the app that sent each one, the MCP clients that connect, and an estimate of distinct users per day (a hash salted with a daily random value that is deleted after two days, kept only inside a HyperLogLog). No specs, IP addresses or user ids are stored; counts expire after 400 days. You see them at `/stats` (see [Usage counts](#usage-counts)). See [`src/usage.ts`](src/usage.ts).
- **Directory verification:** set `OPENAI_APPS_CHALLENGE` (ChatGPT) or `GLAMA_JSON` (Glama) in Vercel's environment variables and redeploy; the server returns them at `/.well-known/openai-apps-challenge` and `/.well-known/glama.json`.

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

## Usage counts

1. In your Vercel project, open **Storage → Create Database**, pick **Upstash for Redis** (Marketplace), choose the **Free** plan and connect it to this project. Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you. (Vercel's **Redis** integration works too: it adds `REDIS_URL`. So does a database made on upstash.com: set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.)
2. Under **Settings → Environment Variables**, add `STATS_KEY` with a long random password (for example from `openssl rand -base64 24`).
3. **Deployments → Redeploy**. `/health` now shows `"counting": true`.
4. Open `https://<your-project>.vercel.app/stats`. The browser asks for a name and password: any name, and your `STATS_KEY`. `/stats.json` returns the same data as JSON.

Each diagram costs about 12 Redis commands, so the free tier covers far more than the Hobby plan's render budget. Without these variables nothing is counted and `/stats` doesn't exist.

How to read it: **Drawn** is the number to watch; every one is a person asking an AI chat for a diagram. **Sources** estimates distinct people per day; it's closest for ChatGPT, which sends an anonymous id (possibly one per conversation, so it can overcount people who start many chats), while requests through Claude come from Anthropic's servers, so there it undercounts. Your own tests count too.

## Connect

- **Claude:** Settings → Connectors → Add custom connector → paste `https://<your-project>.vercel.app/mcp`.
- **ChatGPT:** Settings → Apps & Connectors → Advanced → turn on Developer mode, then create a connector with the same URL and no authentication.

## Develop

```bash
npm run build -w sysketch && npm run build -w sysketch-hosted
npm run logos -w sysketch-hosted # optional: Simple Icons + AWS, Azure and Google Cloud packs
npm start -w sysketch-hosted     # http://localhost:3000, MCP at /mcp
npm test -w sysketch-hosted
```

The same `handle(request)` function from `src/app.ts` runs on Vercel (`api/index.js`) and in the local Node server (`src/serve.ts`).
