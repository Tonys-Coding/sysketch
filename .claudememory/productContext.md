# Product Context

## Purpose

A spec-to-diagram renderer for system design visuals (architecture diagrams, request flows, data pipelines) in a flat, colorful, educational style. Primary users are people who ask an AI to produce diagrams and want them cheap, consistent, and good-looking.

## Users & Workflows

- **AI-assisted writer / engineer (primary):** asks Claude (via MCP or CLI) "diagram a URL shortener". The model emits a ~30-line spec; tool returns SVG/PNG. Drops it in a blog post, README, slide, or interview prep notes.
- **Student / interview prepper:** wants many consistent diagrams for study notes. Cares about the numbered-step flow style.
- **Tool/agent builder:** integrates `render_diagram` as an MCP tool or imports the npm package in their own pipeline.
- **Manual tweaker (later):** opens the web editor, edits the spec text, sees live preview, exports.

## Spec Format (draft v0 — will evolve, keep this section current)

```yaml
title: URL Shortener
groups:
  - id: backend
    label: Backend
    nodes: [api, cache, db]
nodes:
  - { id: client, icon: user }
  - { id: lb, icon: load-balancer }
  - { id: api, icon: server }
  - { id: cache, icon: redis }
  - { id: db, icon: database }
edges:
  - { from: client, to: lb, step: 1, label: 'POST /shorten' }
  - { from: lb, to: api, step: 2 }
  - { from: api, to: cache, step: 3 }
  - { from: api, to: db, step: 4 }
```

Design rules for the spec:

- Flat and short. Labels default from `id` / icon name so the LLM can omit them.
- Unknown icon -> clear error listing nearest matches (LLMs self-correct from good errors).
- Accept YAML or JSON (YAML is a JSON superset; one parser).
- Every validation error is written for an LLM reader: what was wrong, what is valid, one fix suggestion.

## Visual Identity (original, not ByteByteGo's)

- Rounded rectangles, flat pastel fills, bold dark strokes.
- Numbered circular step badges on arrows.
- Labeled group containers (rounded, tinted background).
- Friendly rounded font (permissive license, e.g. Nunito / Quicksand — confirm license when picking).
- All colors/radii/stroke widths are **design tokens** in a theme object, so themes are data, not code.

## Icon Set (target ~40–60, original)

Starter 10 for MVP: user/client, server, database, cache (redis-style), queue, load-balancer, api-gateway, cdn, storage/bucket, cloud/internet.
Next: worker, cron, firewall, auth, search, monitoring, mobile, browser, message-broker, microservice, container, k8s, lambda/function, notification, email, payment, ML-model, etc.
Icons are authored once (Claude can draft, human curates), stored as optimized SVG path data in the repo.

## Landscape (verify before committing, space moves fast)

Mermaid, D2, Excalidraw, draw.io, Eraser, Structurizr, diagrams (Python, mingrammer). Gap we target: **polished educational look + LLM-cheap spec + MCP-native**. Action item: do a real GitHub/npm search and record findings in `progress.md`.
