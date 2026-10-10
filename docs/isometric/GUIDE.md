# Isometric Icon Guide (AI-assisted)

How to get an AI to draw the sysketch icon set in the isometric 3D style, and have every icon pass `npm run icons` on the first try.

Two working examples: [`examples/server.svg`](examples/server.svg) and [`examples/database.svg`](examples/database.svg). [`examples-in-themes.png`](examples-in-themes.png) shows how they look in all five themes.

## 1. Use a text AI, not an image generator

Ask **Claude (or another chat model) to write SVG code**. Image generators (Midjourney, DALL·E, etc.) output pictures. Tracing a picture produces thousands of paths and colors, which the pipeline rejects (that's what happened with `user_icon.svg`). Image tools are fine for **ideas only**.

Budget: one isometric icon is about 600–1,200 characters of SVG, roughly 300–500 output tokens. All 61 icons is about 25–30k tokens, one time.

## 2. The style

### The grid (2:1 isometric)

Every edge is one of three directions:

| Direction  | In SVG terms                                 |
| ---------- | -------------------------------------------- |
| Vertical   | x stays the same                             |
| Down-right | for every 2 px right, 1 px down (slope +1/2) |
| Up-right   | for every 2 px right, 1 px up (slope −1/2)   |

No other angles, except inside circles and ellipses.

- **Footprint:** a standard object sits on a diamond 32 wide and 16 tall: left corner `(8, y+8)`, top `(24, y)`, right `(40, y+8)`, bottom `(24, y+16)`.
- **Center line:** x = 24. Objects are centered on it.
- **Fit:** everything inside x 4–44, y 3–46. Bottom edge near y 43–46, so icons sit on the same baseline.
- **Circles in isometric** are ellipses twice as wide as tall (`rx = 2 × ry`), e.g. a cylinder top `rx="16" ry="8"`.

### Light and color (four slots + none)

Light comes from the top-left. Each face of a solid gets exactly one of these colors. The renderer swaps them for real colors in every theme.

| Color in your file | Use it for                                        | What themes do with it |
| ------------------ | ------------------------------------------------- | ---------------------- |
| `#FF0000`          | **Top faces** (lit), small light details          | Lightest tone          |
| `#00FF00`          | **Left faces** (front-left side)                  | Mid tone               |
| `#FFFF00`          | **Right faces** (front-right side, in shade)      | Darkest tone           |
| `#0000FF`          | **All outlines**, tiny dark details (dots, slots) | Accent / ink           |
| `none`             | Anything unfilled                                 | Transparent            |

### Lines and shapes

- Outlines: `stroke="#0000FF" stroke-width="2" stroke-linejoin="round"` on every face. Use `stroke-linecap="round"` on open lines.
- Each face is its own closed `<path>` (or `<ellipse>`/`<rect>`), with `fill` and `stroke` set on it directly.
- **Draw back to front** (painter's order): bottom and back pieces first, the top face last. Later shapes cover earlier ones.
- Details on a face (slots, LEDs, emblems) follow that face's slope and use `#0000FF` or `#FF0000`. Keep them 2 px or thicker.
- Keep it simple: one object or a small cluster (2–4 pieces), 3–12 faces total, a couple of details. It has to read at 32 px.
- Same stroke weight, footprint size and baseline across the whole set.

## 3. Technical requirements (checked automatically)

| Rule              | Detail                                                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| File              | `.svg`, named exactly as the icon (`load-balancer.svg`), saved in `icons-src/`                                              |
| Canvas            | `viewBox="0 0 48 48"` (square required)                                                                                     |
| Colors            | Only `#0000FF`, `#00FF00`, `#FF0000`, `#FFFF00`, `none`                                                                     |
| Not allowed       | `<text>`, `<image>`, gradients, `<filter>`, `<mask>`, `<pattern>`, `<use>`, `<symbol>`, `<style>`, `style="…"`, `class="…"` |
| Allowed elements  | `path`, `rect`, `circle`, `ellipse`, `line`, `polygon`, `polyline`, `g`                                                     |
| Stroke width      | 2 to 2.5 (warned outside 1.75 to 3.25)                                                                                      |
| Size              | Under ~8 KB                                                                                                                 |
| No opacity tricks | Don't use `opacity` for shading; use the four colors instead (they map to real shades per theme)                            |

## 4. The master prompt (copy everything in the box)

Paste this into a new chat once. Then ask for icons in batches (section 5).

````text
You are drawing icons for "sysketch", an open-source system-design diagram tool. Every icon is a hand-written SVG in an isometric 3D style. Output SVG code only.

STYLE
- 2:1 isometric. Every edge is vertical, slope +1/2 (2 right, 1 down) or slope -1/2 (2 right, 1 up). No other angles except in ellipses.
- Isometric circles are ellipses with rx = 2 * ry.
- Standard footprint: a diamond 32 wide x 16 tall, corners (8,y+8) (24,y) (40,y+8) (24,y+16). Center objects on x = 24.
- Everything inside x 4..44, y 3..46. Objects rest on a baseline near y 43..46.
- Light comes from the top-left: top faces lightest, left faces mid, right faces darkest.
- One object or a small cluster (2-4 pieces), 3-12 faces, a couple of details. Must read at 32 px.

COLORS (exactly these, nothing else)
- #FF0000 = top faces and small light details
- #00FF00 = left faces
- #FFFF00 = right faces
- #0000FF = all outlines and tiny dark details
- none = unfilled

TECHNICAL RULES
- <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
- Only path, rect, circle, ellipse, line, polygon, polyline, g.
- Put fill/stroke attributes directly on each shape. Never use style=, class=, <style>, text, images, gradients, filters, masks, patterns, use, symbol, or opacity.
- Every face: stroke="#0000FF" stroke-width="2" stroke-linejoin="round". Open lines also get stroke-linecap="round".
- Each face is its own closed shape. Draw back to front; the top face of each piece comes last.
- Details on a face follow that face's slope and are at least 2 px thick.
- Round coordinates to at most 1 decimal. Keep each file under 2,000 characters if possible.

REFERENCE 1: server (three stacked slabs)
<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M8 32L24 40V46L8 38Z" fill="#00FF00" stroke="#0000FF" stroke-width="2" stroke-linejoin="round"/>
<path d="M24 40L40 32V38L24 46Z" fill="#FFFF00" stroke="#0000FF" stroke-width="2" stroke-linejoin="round"/>
<path d="M24 24L40 32L24 40L8 32Z" fill="#FF0000" stroke="#0000FF" stroke-width="2" stroke-linejoin="round"/>
<path d="M8 23L24 31V37L8 29Z" fill="#00FF00" stroke="#0000FF" stroke-width="2" stroke-linejoin="round"/>
<path d="M24 31L40 23V29L24 37Z" fill="#FFFF00" stroke="#0000FF" stroke-width="2" stroke-linejoin="round"/>
<path d="M24 15L40 23L24 31L8 23Z" fill="#FF0000" stroke="#0000FF" stroke-width="2" stroke-linejoin="round"/>
<path d="M8 14L24 22V28L8 20Z" fill="#00FF00" stroke="#0000FF" stroke-width="2" stroke-linejoin="round"/>
<path d="M24 22L40 14V20L24 28Z" fill="#FFFF00" stroke="#0000FF" stroke-width="2" stroke-linejoin="round"/>
<path d="M24 6L40 14L24 22L8 14Z" fill="#FF0000" stroke="#0000FF" stroke-width="2" stroke-linejoin="round"/>
<path d="M12 18.5L16 20.5" stroke="#FF0000" stroke-width="2" stroke-linecap="round"/>
</svg>

REFERENCE 2: database (isometric cylinder)
<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M8 13V35C8 39.4 15.2 43 24 43V21C15.2 21 8 17.4 8 13Z" fill="#00FF00" stroke="#0000FF" stroke-width="2" stroke-linejoin="round"/>
<path d="M24 21C32.8 21 40 17.4 40 13V35C40 39.4 32.8 43 24 43Z" fill="#FFFF00" stroke="#0000FF" stroke-width="2" stroke-linejoin="round"/>
<path d="M8 24C8 28.4 15.2 32 24 32" stroke="#0000FF" stroke-width="2" stroke-linecap="round"/>
<path d="M24 32C32.8 32 40 28.4 40 24" stroke="#FF0000" stroke-width="2" stroke-linecap="round"/>
<ellipse cx="24" cy="13" rx="16" ry="8" fill="#FF0000" stroke="#0000FF" stroke-width="2"/>
</svg>

OUTPUT FORMAT
For each icon I ask for:
1. One line: the filename, e.g. `mobile.svg`.
2. One ```svg code block with the complete file.
No other commentary. Before answering, check each icon against every rule above (angles, colors, element types, draw order, size) and fix anything that fails.
Reply "ready" now and wait for my first batch.
````

## 5. Asking for a batch

Ask for 3–5 icons at a time; quality drops in big batches. Paste briefs from the table below:

```text
Draw these icons:
- mobile: a phone standing upright, screen on the left face, short home bar
- browser: an upright window panel with a title bar and three dots
- worker: a thick gear lying flat on its footprint
```

### Icon briefs (all 61)

**Clients & edge**

| Icon            | Isometric brief                                                             |
| --------------- | --------------------------------------------------------------------------- |
| `user`          | Person bust: sphere-like head (circle) on rounded shoulders block, centered |
| `mobile`        | Phone slab standing upright, screen on the left face, short home bar        |
| `browser`       | Upright window panel with a title bar and three dots                        |
| `desktop`       | Monitor panel on a small stand and base plate                               |
| `cdn`           | Globe (circle with latitude/longitude ellipses) on a small base tile        |
| `dns`           | Signpost with two direction plates pointing along the iso axes              |
| `load-balancer` | One cube on top with lines down to three small cubes in a row               |
| `api-gateway`   | Archway gate: two pillars and a lintel block                                |
| `firewall`      | Short brick wall segment (offset bricks on the left face)                   |
| `rate-limiter`  | Funnel (iso cone) above a small block, a few tokens on top                  |

**Compute**

| Icon        | Isometric brief                                                  |
| ----------- | ---------------------------------------------------------------- |
| `server`    | Three stacked slabs (reference 1)                                |
| `service`   | Single cube with a hexagon emblem on the top face                |
| `worker`    | Thick gear lying flat on its footprint                           |
| `function`  | Flat tile with a raised λ (lambda) shape on top                  |
| `container` | Shipping container: long box with vertical ribs on the left face |
| `cluster`   | Three small cubes on a shared base plate                         |
| `scheduler` | Clock puck (short cylinder) with hands drawn on the top ellipse  |
| `vm`        | Cube with a screen panel inset on the left face                  |

**Data**

| Icon          | Isometric brief                                          |
| ------------- | -------------------------------------------------------- |
| `database`    | Cylinder with one band (reference 2)                     |
| `nosql`       | Three document sheets stacked with small offsets         |
| `key-value`   | A key lying on top of a small block                      |
| `cache`       | Thick lightning-bolt prism standing on a tile            |
| `search`      | Magnifying glass (ellipse lens + handle) over a slab     |
| `storage`     | Bucket: cylinder narrower at the bottom                  |
| `file`        | Folder lying flat with a tab                             |
| `warehouse`   | Small building with a gable roof                         |
| `data-lake`   | Shallow basin with a wavy top surface                    |
| `time-series` | Cylinder with a small zigzag chart line on the left face |
| `graph-db`    | Three or four small spheres (circles) joined by rods     |
| `vector-db`   | Cylinder with three short arrows rising from the top     |

**Messaging**

| Icon           | Isometric brief                                 |
| -------------- | ----------------------------------------------- |
| `queue`        | Three small blocks in a row on a long base tile |
| `pubsub`       | Antenna mast on a base with two broadcast arcs  |
| `stream`       | Long conveyor belt segmented into partitions    |
| `notification` | Bell on a small base                            |
| `email`        | Envelope lying flat, flap lines on top face     |
| `webhook`      | Hook shape rising from a small block            |

**Security & identity**

| Icon    | Isometric brief                                              |
| ------- | ------------------------------------------------------------ |
| `auth`  | Padlock: block body with a shackle arc on top                |
| `token` | Key card (thin slab) standing at an angle with a chip detail |
| `vault` | Safe box with a round dial on the left face                  |

**Observability**

| Icon        | Isometric brief                                      |
| ----------- | ---------------------------------------------------- |
| `metrics`   | Three bars of different heights on a tile            |
| `logs`      | Tablet slab with three text lines on the top face    |
| `alert`     | Warning triangle prism with an exclamation detail    |
| `tracing`   | Tile with three staggered span bars joined by a line |
| `dashboard` | Panel with a 2×2 grid of tiles on the top face       |

**Feature services**

| Icon               | Isometric brief                                               |
| ------------------ | ------------------------------------------------------------- |
| `payment`          | Credit card lying flat with a coin (short cylinder) beside it |
| `chat`             | Two overlapping speech bubbles (slabs with a tail)            |
| `video`            | Tile with a raised play triangle                              |
| `image`            | Upright picture frame with a mountain and sun                 |
| `location`         | Map pin standing on a tile                                    |
| `recommendation`   | Star prism on a tile                                          |
| `analytics`        | Donut puck with one wedge raised                              |
| `ml-model`         | Three columns of small nodes on a tile (neural net)           |
| `llm`              | Cube with a four-point sparkle on the top face                |
| `etl`              | Funnel feeding into a box                                     |
| `stream-processor` | Gear sitting on a short conveyor                              |

**Infrastructure & dev**

| Icon       | Isometric brief                                                 |
| ---------- | --------------------------------------------------------------- |
| `cloud`    | Puffy cloud with a flat base (stacked rounded lobes)            |
| `config`   | Panel with two sliders and knobs                                |
| `registry` | Rolodex / address-book block with card tabs                     |
| `ci-cd`    | Infinity-loop track lying flat                                  |
| `repo`     | Tile with a branching rail (git graph): two dots split into two |
| `iot`      | Chip block with pins on two sides                               |

## 6. Check and fix

1. Save each block as `icons-src/<name>.svg`.
2. Run `npm run icons`. Fix anything marked ✗ (the message says what's wrong).
3. Open `icons-src/_preview.png` and check against this list:
   - [ ] Same size and baseline as `server`/`database`
   - [ ] Top lightest, left mid, right darkest, in every theme row
   - [ ] Reads clearly at small size; no hairline details
   - [ ] Edges follow the three isometric directions
   - [ ] Looks like it belongs to the same set as the others

Fix prompts that work well:

```text
<name>.svg: the right face uses #00FF00; right faces must be #FFFF00. Fix and resend the file only.
<name>.svg: it's too small; scale it to the standard 32x16 footprint centered on x=24, resting near y=44.
<name>.svg: the top face is drawn before the sides, so the sides cover it. Reorder back to front.
<name>.svg: too much detail. Keep the main shape and at most two details.
```

Keep your favorites as references: paste one or two of your own approved icons into the chat as "REFERENCE 3/4" so later batches match your set even more closely.
