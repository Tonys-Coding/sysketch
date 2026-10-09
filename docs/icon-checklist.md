# Icon Checklist

Drop finished icons into `icons-src/` as `<name>.svg` (e.g. `icons-src/database.svg`). Claude converts them into `packages/sysketch/src/icons.ts`, wires up aliases and colors, and checks them in every theme.

`[x]` = a placeholder already exists (drawn by Claude). Replace it with your own version whenever you like.

## How to draw them (so they work in every theme)

- **Canvas:** square, 48×48 `viewBox`, about 3px padding on each side.
- **Style:** flat, outlined shapes. Stroke 2.5px with round caps and joins. No gradients, shadows, filters, masks, text or embedded images.
- **Colors:** use only these three. The renderer swaps them per theme:
  - `#0000FF`: **accent** (outlines, solid details)
  - `#00FF00`: **mid fill** (main body)
  - `#FF0000`: **highlight** (tops of cylinders, faces, small inner areas)
- **Legibility:** must read at 32px. Avoid details smaller than 2px and more than ~6 shapes.
- **Consistency:** same stroke weight, corner roundness and visual weight across the set. Draw them side by side in one Figma file.
- **Licensing:** original work, or based on Lucide (ISC), Tabler or Phosphor (MIT). Note the source in the filename comment. **No company logos**; brand names go in labels.

## P0: Core set (covers most system design interviews and articles)

### Clients & edge

- [x] `user`: person / client
- [ ] `mobile`: phone app
- [ ] `browser`: web app window
- [x] `cdn`: globe / edge network
- [ ] `dns`: domain lookup (signpost or "www" plate)
- [x] `load-balancer`: one-to-many splitter
- [x] `api-gateway`: entry gate / hexagon
- [ ] `firewall`: brick wall / shield (WAF)
- [ ] `rate-limiter`: gauge / throttle

### Compute

- [x] `server`: rack server
- [ ] `service`: microservice (cube or hexagon)
- [ ] `worker`: gear (background jobs)
- [ ] `function`: serverless / lambda (λ)
- [ ] `container`: shipping box
- [ ] `cluster`: Kubernetes-style wheel or node group
- [ ] `scheduler`: clock (cron)

### Data

- [x] `database`: SQL cylinder
- [ ] `nosql`: document store (stacked docs)
- [ ] `key-value`: key + box
- [x] `cache`: lightning bolt
- [ ] `search`: magnifier over index
- [x] `storage`: object storage / bucket
- [ ] `file`: document / file system
- [ ] `warehouse`: data warehouse (building with bars)
- [ ] `data-lake`: lake / waves

### Messaging

- [x] `queue`: message queue
- [ ] `pubsub`: topic fan-out (broadcast)
- [ ] `stream`: event log (Kafka-style partitions)
- [ ] `notification`: bell (push)
- [ ] `email`: envelope
- [ ] `webhook`: hook / callback arrow

### Security & identity

- [ ] `auth`: lock / identity provider
- [ ] `token`: key / JWT
- [ ] `vault`: secrets safe

### Observability

- [ ] `metrics`: line chart
- [ ] `logs`: list with lines
- [ ] `alert`: warning triangle / siren

## P1: Common feature services (popular "design X" problems)

- [ ] `payment`: card
- [ ] `chat`: speech bubbles
- [ ] `video`: play button / film (transcoding, streaming)
- [ ] `image`: picture frame (media processing)
- [ ] `location`: map pin (geo, ride-sharing)
- [ ] `recommendation`: star / thumbs up feed
- [ ] `analytics`: bar chart
- [ ] `ml-model`: brain / neural net
- [ ] `llm`: AI sparkle / agent
- [ ] `vector-db`: cylinder with vector arrows
- [ ] `etl`: pipeline (funnel or arrows through gear)
- [ ] `stream-processor`: gear on a stream

## P2: Infrastructure & dev workflow

- [x] `cloud`: internet / external
- [ ] `vm`: virtual machine (monitor)
- [ ] `config`: sliders / settings
- [ ] `registry`: service discovery (address book)
- [ ] `ci-cd`: pipeline loop (infinity)
- [ ] `repo`: git branch
- [ ] `tracing`: connected spans
- [ ] `dashboard`: panel grid
- [ ] `time-series`: cylinder with clock
- [ ] `graph-db`: connected nodes
- [ ] `iot`: chip / sensor
- [ ] `desktop`: monitor app

**Totals:** P0 = 37 (8 done), P1 = 12, P2 = 12 (1 done). About 61 icons in all.

Not icons (handled by containers/groups instead): region, availability zone, VPC, data center. Replicas and shards are expressed as duplicate nodes or labels.
