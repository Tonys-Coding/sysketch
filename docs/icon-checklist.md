# Icon Checklist

**Chosen style: isometric 3D.** See [isometric/GUIDE.md](isometric/GUIDE.md) for the style rules, a copy-paste AI prompt and per-icon briefs.

`[x]` = drawn (an isometric SVG in `icons-src/`). The boxes and totals below are updated automatically every time you run `npm run icons`. **The set is complete.** If you ever remove an icon's art, its name keeps working by borrowing a similar icon (e.g. `dns` falls back to `cloud`).

## Workflow (one icon at a time)

1. Draw the icon in Figma (or Illustrator/Inkscape) on a 48×48 frame with no frame fill.
2. Export it as **SVG** into `icons-src/`, named exactly as in this list: `icons-src/mobile.svg`, `icons-src/load-balancer.svg`.
3. Run `npm run icons`. It checks every file, converts the good ones, rebuilds, and writes a preview of all icons in every theme to `icons-src/_preview.png`.
4. Fix anything marked ✗ and run it again. Commit `icons-src/*.svg` plus the regenerated `packages/sysketch/src/icons.generated.ts`.

You can add icons in any order and in any number per batch. To keep an old version while redrawing, name it `name-old.svg` (or `name.bak.svg`, `_name.svg`); backups are skipped. Keep your source files in `icons-src/`: they are the originals, and re-running the command rebuilds everything from them.

## File requirements (checked automatically for every icon)

| Requirement                                                                                                                              | Why                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| File type **`.svg`** (plain SVG, not PNG/PDF/AI)                                                                                         | Vector art stays sharp at any size and can be recolored per theme           |
| File name = icon name from this list, lowercase (`api-gateway.svg`)                                                                      | That's how the icon is matched; unknown names are rejected                  |
| **Square** canvas, ideally `viewBox="0 0 48 48"`                                                                                         | Other square sizes (e.g. 24×24 Lucide icons) are scaled automatically       |
| Colors only `#0000FF` (outline), `#00FF00` (fill / left face), `#FF0000` (highlight / top face), `#FFFF00` (shade / right face), or none | Each theme swaps them for its own colors                                    |
| No text, images, gradients, filters, masks, patterns, `<use>` or `<style>`                                                               | They don't recolor or render consistently everywhere                        |
| Presentation attributes (`fill="…"`), not `style="…"` or CSS classes                                                                     | Figma does this by default; in Illustrator choose "Presentation Attributes" |
| Stroke width about 2.5 at 48px (warned outside 1.75 to 3.25)                                                                             | Keeps the set visually consistent                                           |
| Under ~8 KB                                                                                                                              | Simple icons read better at small sizes; you get a warning if it's large    |

Figma's automatic frame clip path (`clip-path` + `<defs><clipPath>`) is removed for you.

## How to draw them (so they work in every theme)

- **Canvas:** square, 48×48 `viewBox`, about 3px padding on each side.
- **Style:** flat, outlined shapes. Stroke 2.5px with round caps and joins.
- **Colors:** use only these (the shade is optional, mainly for 3D/isometric icons). The renderer swaps them per theme:
  - `#0000FF`: **accent** (outlines, solid details)
  - `#00FF00`: **mid fill** (main body)
  - `#FF0000`: **highlight** (tops of cylinders, faces, small inner areas)
  - `#FFFF00`: **shade** (the dark right-hand side of 3D shapes)
- **Legibility:** must read at 32px. Avoid details smaller than 2px and more than ~6 shapes.
- **Consistency:** same stroke weight, corner roundness and visual weight across the set. Draw them side by side in one Figma file.
- **Licensing:** original work, or based on Lucide (ISC), Tabler or Phosphor (MIT). If you adapt one, add an XML comment in the file naming the source. **No company logos**; brand names go in labels.

## P0: Core set (covers most system design interviews and articles)

### Clients & edge

- [x] `user`: person / client
- [x] `mobile`: phone app
- [x] `browser`: web app window
- [x] `cdn`: globe / edge network
- [x] `dns`: domain lookup (signpost or "www" plate)
- [x] `load-balancer`: one-to-many splitter
- [x] `api-gateway`: entry gate / hexagon
- [x] `firewall`: brick wall / shield (WAF)
- [x] `rate-limiter`: gauge / throttle

### Compute

- [x] `server`: rack server
- [x] `service`: microservice (cube or hexagon)
- [x] `worker`: gear (background jobs)
- [x] `function`: serverless / lambda (λ)
- [x] `container`: shipping box
- [x] `cluster`: Kubernetes-style wheel or node group
- [x] `scheduler`: clock (cron)

### Data

- [x] `database`: SQL cylinder
- [x] `nosql`: document store (stacked docs)
- [x] `key-value`: key + box
- [x] `cache`: lightning bolt
- [x] `search`: magnifier over index
- [x] `storage`: object storage / bucket
- [x] `file`: document / file system
- [x] `warehouse`: data warehouse (building with bars)
- [x] `data-lake`: lake / waves

### Messaging

- [x] `queue`: message queue
- [x] `pubsub`: topic fan-out (broadcast)
- [x] `stream`: event log (Kafka-style partitions)
- [x] `notification`: bell (push)
- [x] `email`: envelope
- [x] `webhook`: hook / callback arrow

### Security & identity

- [x] `auth`: lock / identity provider
- [x] `token`: key / JWT
- [x] `vault`: secrets safe

### Observability

- [x] `metrics`: line chart
- [x] `logs`: list with lines
- [x] `alert`: warning triangle / siren

## P1: Common feature services (popular "design X" problems)

- [x] `payment`: card
- [x] `chat`: speech bubbles
- [x] `video`: play button / film (transcoding, streaming)
- [x] `image`: picture frame (media processing)
- [x] `location`: map pin (geo, ride-sharing)
- [x] `recommendation`: star / thumbs up feed
- [x] `analytics`: bar chart
- [x] `ml-model`: brain / neural net
- [x] `llm`: AI sparkle / agent
- [x] `vector-db`: cylinder with vector arrows
- [x] `etl`: pipeline (funnel or arrows through gear)
- [x] `stream-processor`: gear on a stream

## P2: Infrastructure & dev workflow

- [x] `cloud`: internet / external
- [x] `vm`: virtual machine (monitor)
- [x] `config`: sliders / settings
- [x] `registry`: service discovery (address book)
- [x] `ci-cd`: pipeline loop (infinity)
- [x] `repo`: git branch
- [x] `tracing`: connected spans
- [x] `dashboard`: panel grid
- [x] `time-series`: cylinder with clock
- [x] `graph-db`: connected nodes
- [x] `iot`: chip / sensor
- [x] `desktop`: monitor app

**Progress:** 61 of 61 drawn (updated by `npm run icons`).

Not icons (handled by containers/groups instead): region, availability zone, VPC, data center. Replicas and shards are expressed as duplicate nodes or labels.
