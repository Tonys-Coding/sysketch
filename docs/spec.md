# Spec guide

A sysketch diagram is a short text file (YAML) that lists the parts of your system and how they connect. This page covers everything you can write in it. Your AI assistant knows this format already; this guide is for when you want to read or edit a diagram yourself.

## The smallest diagram

```yaml
edges:
  - client > api > db
```

That is a complete diagram: three boxes with arrows between them. Names like `client`, `api` and `db` pick an icon and a label automatically.

## Arrows (`edges`)

Each line is one arrow, or a chain of arrows.

| Write                     | You get                                              |
| ------------------------- | ---------------------------------------------------- |
| `a > b`                   | an arrow from `a` to `b` (`a -> b` works too)        |
| `a > b > c`               | a chain of two arrows                                |
| `a > b \| GET /users`     | an arrow with a label (on the last arrow of a chain) |
| `a ..> b`                 | a dashed arrow, for responses and background work    |
| `a > b \| lookup [green]` | a colored arrow                                      |
| `a > b [red, dashed]`     | a dashed, colored arrow                              |

Colors: `blue`, `green`, `amber`, `red`, `violet`, `teal`, `pink`, `sky`, `orange`, `slate` (also `yellow`, `purple`, `cyan`, `gray`).

Arrows are numbered in the order you write them (1, 2, 3...). That number shows on the arrow and in the optional legend.

## Parts (`nodes`)

Parts named in arrows are created automatically. Add a `nodes` section when you want a custom name, icon or note:

```yaml
nodes:
  api: server | Orders API | stateless, 3 replicas
edges:
  - client > api > db
```

The format is `id: icon | Label | note`. The label and note are optional. The `id` is the short name you use in arrows.

## Groups (`groups`)

Draw a labeled box around related parts:

```yaml
groups:
  Backend: [api, cache, db]
```

A part can be in one group.

## Names and icons

sysketch understands three kinds of names:

| Kind            | Examples                                             | Result                                             |
| --------------- | ---------------------------------------------------- | -------------------------------------------------- |
| Generic parts   | `client`, `lb`, `api`, `db`, `cache`, `queue`, `cdn` | the matching sysketch icon                         |
| Common products | `redis`, `kafka`, `s3`, `postgres`, `k8s`, `lambda`  | a fitting icon, labeled with the product name      |
| Other products  | `stripe`, `sendgrid`, `auth0`, `aks`, `bigquery`     | a fitting icon (about 230 products are recognized) |

For anything else, write `name/icon`: `acme/queue` draws the `queue` icon labeled "Acme". If you have [official logos](logos.md) installed, product names show the real logo instead.

Run `npx sysketch icons` to list every icon and name, or see the [icon set](icons.md).

## Diagram settings

| Setting     | Values                                                             | What it does                                                |
| ----------- | ------------------------------------------------------------------ | ----------------------------------------------------------- |
| `title`     | any text                                                           | a heading above the diagram                                 |
| `theme`     | `sketch` (default), `graphite`, `blueprint`, `midnight`, `classic` | the look                                                    |
| `legend`    | `true`                                                             | a numbered list of the steps under the diagram              |
| `steps`     | `false`                                                            | hides the step numbers on the arrows                        |
| `direction` | `right` or `down`                                                  | the reading direction (see below)                           |
| `logos`     | a folder, or `false`                                               | your own logo folder, or turn logos off ([guide](logos.md)) |

**Direction:** leave it out and sysketch chooses. Diagrams read left to right, and long flows fold into rows so they still fit on a page. Set `direction: down` for a top-to-bottom diagram.

## A complete example

```yaml
title: 'URL Shortener: Read Path'
legend: true
nodes:
  lb: load-balancer | Load Balancer | round robin
  api: server | API Server | stateless, 3 replicas
  cache: redis | Redis | cache-aside, TTL 24h
  db: postgres | PostgreSQL | source of truth
groups:
  Backend: [api, cache, db]
edges:
  - client > lb | GET /abc123
  - lb > api
  - api > cache | lookup [green]
  - api > db | on miss [amber]
  - api ..> client | 302 redirect [blue]
```

![The URL shortener read path](../examples/url-shortener-v2.svg)

## Longer form

Every arrow can also be written out in full, which is handy for long notes or when another program writes the file:

```yaml
edges:
  - from: api
    to: db
    label: write order
    color: amber
    dashed: true
    note: Orders are written synchronously before replying
```

`note` replaces the arrow's text in the legend. Parts work the same way: `api: { icon: server, label: Orders API, sub: 3 replicas }`.

## Helpful errors

Mistakes come back as short messages that say how to fix them:

- `unknown node "databse". Did you mean: database?`
- `Node "cache" is in two groups ("Backend" and "Data"). Use one.`
- `unknown color "purpel". Use one of: blue, green, amber...`

Values that contain `: ` (like the title above) are quoted for you if you forget.

## Command line reference

```bash
npx sysketch render diagram.yaml               # writes diagram.svg
npx sysketch render diagram.yaml --png         # writes diagram.png (2x resolution)
npx sysketch render diagram.yaml -o out.png --scale 3 --theme blueprint
npx sysketch icons                             # every icon and recognized name
```

Other options: `--direction right|down`, `--logos <folder>`, `--no-logos`. Use `-` as the file name to read from standard input.
