# Changelog

## Unreleased

- **`annotate` render option:** tags nodes and arrows in the SVG (`sk-node`, `sk-edge` with `data-from`/`data-to`, and an invisible `sk-route` path per arrow) so web pages can animate or step through a diagram. Off by default; normal output is unchanged.
- **Showcase site:** uses the full screen width with full-width sections, a large live diagram in the hero, and example diagrams side by side with their descriptions. Request packets travel each arrow in flow order (sequence diagrams play their messages in turn); a button pauses the motion, and it starts paused for people who turn on "reduce motion".
- **Hosted server, anonymous usage counts (optional):** with an Upstash Redis database connected, it counts per day the diagrams drawn and failed, diagram types, the sending app, connecting MCP clients, and an estimate of distinct users (daily-salted hashes kept only in a HyperLogLog). No specs, IPs or user ids are stored; counts expire after 400 days. The owner reads them at `/stats` (password `STATS_KEY`) or `/stats.json`; `/health` reports whether counting is on. Privacy policy updated.
- GitHub Actions updated to the Node 24 versions (checkout v7, setup-node v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5).

## 0.5.0

**sysketch 0.5.0**

- **Sequence diagrams:** `type: sequence` draws the same arrows as a timeline: parts across the top, dashed lifelines, one row per message, replies with `..>`, steps a part does itself with `a > a`, and group boxes around participants.
- **Nested groups:** a group can list other groups by name (`VPC: [Public Subnet, Private Subnet]`) for cloud networks, clusters and namespaces. Inner groups get a slightly deeper fill. Sibling groups that point at each other keep the main flow's direction.
- **More arrows:** `a <> b` two-way (`<..>` dashed), `a => b` thick for the hot path, `a -- b` a plain line, and `thick` in `[...]`. `<->`, `-->` and `==>` are accepted too. The legend shows each style.
- Examples: `login-sequence` and `aws-network`.

**sysketch-mcp 0.5.0**

- The tool guide covers sequence diagrams, nested groups and the new arrows (about 30 more tokens per session). Requires sysketch ^0.5.0.
- `server.json` lists the hosted server (`https://sysketch.vercel.app/mcp`) next to the npm package.

**Hosted server**

- Same new features. Tools carry `title` plus `readOnlyHint`, `destructiveHint` and `openWorldHint` for the Claude and ChatGPT directories. Privacy policy and terms pages, and `/.well-known/` verification files for ChatGPT and Glama, served from environment variables.

## Hosted server update

- The in-chat viewer pans by dragging at any zoom, including Fit, and zooms out to half the fitted size as well as in. Pinch or Ctrl/Cmd + scroll zooms around the cursor.
- ChatGPT picks the tool more readily and stops drawing a second image: the tool now has a title, a clearer first line ("use for any system design, architecture, data-flow or infrastructure diagram"), read-only annotations, server instructions, and a result that says the diagram is already shown.

## sysketch 0.4.4, hosted server

**Hosted server (sysketch.vercel.app)**

- Diagrams open right in the chat in Claude, ChatGPT and other hosts that support [MCP Apps](https://github.com/modelcontextprotocol/ext-apps), with zoom, pan, fullscreen and PNG/SVG downloads. Other chats still get the preview and links.
- Product names (`stripe`, `kafka`, `postgres`...) show the product's logo from Simple Icons, unaltered and only inside diagrams. Each deploy installs the latest Simple Icons release; `blocked-logos.txt` removes a logo on request. `list_icons` can search the logos.

**sysketch 0.4.4**

- New render option `logoFolders: false` refuses logo folders named in a spec (`logos: ./folder`) while still using installed logos. It's for services that render specs from anyone.

## sysketch 0.4.3

Layout fixes from testing the hosted server in ChatGPT, Claude and Perplexity.

- People and apps (`user`, `mobile`, `browser`, `desktop` icons) start the flow even when the spec lists them last. Arrows into them from elsewhere (notifications, redirects) are drawn as replies. Before, a ride-sharing diagram written gateway-first put the rider and driver apps on the far right, with "Request ride" looping around the whole diagram.
- Arrows between folded rows drop straight down from the bottom of a node to the top of the next one when nothing is in the way, instead of always detouring through both side margins. They step around group titles, and labels stay on the canvas and clear of the margin lines.

## sysketch 0.4.2, sysketch-mcp 0.4.3

**sysketch 0.4.2**

- Big diagrams fold into rows more often: a cut may now cross up to four arrows, and a group can fill a row on its own. Diagrams narrower than 1800 px are never folded. In testing with another AI assistant, a 5:1 video pipeline became three readable rows and a 20-service e-commerce platform went from 5092 px wide to 3128 px.
- Leading step numbers that AI models write into labels ("1. Upload", "Step 2: Save") are removed, since sysketch numbers the arrows itself. `steps: false` keeps labels untouched.

**sysketch-mcp 0.4.3**

- The tool guide tells the model that arrows are numbered automatically, so it shouldn't number labels.
- The server reports its own version (it reported the core library's). Requires sysketch ^0.4.2.

## sysketch-mcp 0.4.2

- Works in desktop apps: when the client starts the server in `/` (Claude Desktop on macOS), diagrams are saved to `~/sysketch` instead of failing, and replies give the full path so you can find the file. Choose any folder with `--dir <path>` or `SYSKETCH_DIR`.

## 0.4.1 (security)

**sysketch-mcp**

- The server now stays inside the project folder it runs in. Tool arguments come from the AI model, which could be following instructions hidden in a document or web page, so: spec files (`file`) must be `.yaml`, `.yml` or `.json` and diagrams (`out`) must be `.svg` or `.png`, both inside the project (symlinks are followed); a saved spec never overwrites a YAML file that isn't a sysketch spec (e.g. `out: docker-compose.svg`); and logo folders named in a spec must be inside the project. Requires sysketch ^0.4.1.

**sysketch**

- New `logoRoot` option: logo folders named in a spec must be inside it (used by the MCP server).
- `logos install simple-icons` only downloads from `registry.npmjs.org` over HTTPS, requires a sha512 integrity hash, validates `--version`, and skips icon names that could point outside the logo folder.

**Repository**

- `SECURITY.md` with a private reporting channel; CI runs with read-only permissions; `.gitignore` covers `.npmrc`, `.env` and package tarballs; patched esbuild (dev-only advisory) through an override; unused files and code removed.

## 0.4.0

**sysketch**

- **The default theme is now `sketch`** (hand-drawn), the look the name promises. Add `theme: graphite` to a spec, or pass `--theme graphite`, to keep the previous default.
- The sketch theme uses **Shantell Sans** (bold titles, medium labels) instead of Patrick Hand: still handwritten, much easier to read at small sizes.
- Layout follows the spec order even with loops: edges that close a cycle (responses like `api ..> client`, callbacks, `chat > gateway`) are laid out as return arrows instead of reordering the whole flow. Dashed edges that don't close a loop (`kafka ..> ledger`) keep pointing forward.
- Long flows that would be too wide fold into rows that still read left to right: the diagram is cut only between columns where at most two arrows cross, and those arrows wrap through the margins. Folds that would leave a short, lopsided row are skipped.
- Specs without `direction` can also switch to top-down when that gives a more readable shape.
- Tighter spacing between columns and around arrow labels (diagrams about 8% narrower).
- Project logo folders (`logos: ./brand`) are labeled by folder name in the SVG, never by their full path on disk.
- SVG files are 4-6x smaller: each glyph is defined once and reused, instead of drawing every letter as its own path. Rendering is unchanged.

**sysketch-mcp**

- Tool guide asks the model to leave `direction` out unless the user wants one. Requires sysketch ^0.4.0.

**Repository**

- New logo (an "s" drawn as a three-node diagram, Shantell Sans wordmark, "your system, sketched") in `docs/brand/`, generated by `scripts/brand.mjs`, plus a GitHub social preview image.
- Token benchmark: `bench/` runs 5 prompts plus edits through headless Claude Code with and without sysketch; results in `docs/benchmark.md` (18x fewer output tokens to create a diagram).
- `scripts/docs.mjs` regenerates every README image without brand logos; `scripts/docs-logos.mjs` renders the logo showcase in `docs/logos/` (a mix of a made-up company logo, open-licensed product logos and sysketch icons, plus AWS and Azure examples from the vendors' own icon packs).

## 0.3.0

**sysketch**

- Official brand logos, drawn unedited. sysketch ships none: install them from the official source with `sysketch logos install simple-icons` (~3,400 marks, npm integrity-checked), import the AWS, Azure or Google Cloud icon pack zip with `sysketch logos import <pack.zip>` (source and file names detected automatically), or point a spec at a company folder with `logos: ./brand`. Files are fingerprinted when installed and checked before drawing; edited files are refused.
- About 230 product names (`sendgrid`, `auth0`, `aks`, `cloudflare`, `bigquery`...) are recognized without logos and fall back to a fitting icon, so specs render everywhere; `brand/icon` (e.g. `acme/queue`) covers anything else.
- `sysketch logos find|info|lock|remove`, `render --logos <folder>` and `--no-logos`; library options `logos`, `logoDirs`, `baseDir`, `logoHome`.
- PNG sizes in the render summary are rounded.

**sysketch-mcp**

- Tool guide mentions logos and product names; `list_icons` takes `logos=` to search installed logos. Tool definitions are about 450 tokens per session (up from about 390). Requires sysketch ^0.3.0.

## 0.2.0

**sysketch**

- Node subtitles: `api: server | API Server | stateless, 3 replicas` (or `sub:` in the object form).
- Dashed arrows with `a ..> b` for responses and async calls, or `[dashed]`.
- Colored arrows with a trailing `[red]`, `[green, dashed]`, ... (10 palette colors plus synonyms); the step badge takes the arrow's color. Object form: `color:`, `dashed:`.
- `legend: true` draws a numbered Steps panel under the diagram (two columns for longer flows); `note:` on an edge overrides its legend text.
- Return edges (e.g. `api ..> client`) no longer flip the main flow: layout follows the order nodes first appear in the edges.
- Values containing `: ` (like `title: URL Shortener: Read Path`) are auto-quoted instead of failing to parse.

**sysketch-mcp**

- Tool guide covers subtitles, dashed and colored arrows, and legends (about 30 more tokens per session). Requires sysketch ^0.2.0.

## 0.1.0 (first release)

**sysketch**

- YAML/JSON spec to SVG and PNG: nodes, groups, edge chains (`a > b > c`), edge labels, numbered steps, `right`/`down` layouts.
- Automatic layout with ELK; independent flows are laid out separately and stacked.
- Five themes: `graphite` (default), `blueprint`, `midnight`, `classic`, `sketch` (hand-drawn, rough.js).
- 61 original isometric icons with 160+ aliases; text drawn as paths so output looks identical everywhere.
- Deterministic output, short LLM-friendly error messages, CLI (`sysketch render`, `sysketch icons`) and library API (`render`, `renderToFile`, `svgToPng`).

**sysketch-mcp**

- MCP server with `render_diagram` and `list_icons`. Writes files and returns a one-line summary; saves the spec next to the diagram for cheap edits.
