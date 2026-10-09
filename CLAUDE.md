# CLAUDE.md

This project keeps a memory bank in `.claudememory/`. At the start of every session, read `.claudememory/README.md` and the files it lists before doing any work.

Core principle: the LLM never writes SVG. It writes a small declarative spec; a deterministic renderer (parse -> validate -> ELK layout -> themed SVG) draws it.

After completing work, update `.claudememory/progress.md`.
