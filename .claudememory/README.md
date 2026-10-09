# Memory Bank Index

Read in this order at the start of every session:

1. `projectBrief.md` — why this exists, the pain point, goals/non-goals, hard constraints
2. `productContext.md` — users, workflows, spec format, visual identity, icon list
3. `techContext.md` — stack, packages, pipeline, technical risks, deployment
4. `systemPatterns.md` — repo structure, design decisions, critical rules, conventions
5. `progress.md` — roadmap by phase, what's done, decisions log, open questions

## Maintenance rules

- After finishing any task: update `progress.md` (check boxes, add to Decisions Log).
- If the spec format changes: update the sample in `productContext.md` in the same change.
- If a stack choice changes: update `techContext.md`, and log it in `progress.md`.
- Keep entries short and factual. Delete stale content instead of piling on.
