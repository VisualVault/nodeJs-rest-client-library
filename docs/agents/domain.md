# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, or
- **`CONTEXT-MAP.md`** at the repo root if it exists: it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in. Also read the context's own `docs/adr/` for decisions scoped to it; `CONTEXT-MAP.md` names the path for each context.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/vv-domain-modeling` skill (reached via `/vv-grill-with-docs` and `/vv-improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

A single-context repo keeps one `CONTEXT.md` and one `docs/adr/` at the root.
A multi-context repo adds a `CONTEXT-MAP.md` that names, for each context, its
own `CONTEXT.md` and `docs/adr/`:

```
/
├── CONTEXT-MAP.md
├── docs/adr/                ← repo-wide decisions
└── <context>/
    ├── CONTEXT.md
    └── docs/adr/            ← decisions scoped to that context
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/vv-domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
