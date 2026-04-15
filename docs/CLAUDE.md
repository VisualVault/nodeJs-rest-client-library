# Docs — Platform Documentation

Reference documentation for the VisualVault platform. All content here is **shared** — it describes how the platform works, not customer-specific data.

## Organization

| Folder          | Content                                                                      |
| --------------- | ---------------------------------------------------------------------------- |
| `architecture/` | Platform architecture, URL anatomy, navigation, component diagrams           |
| `reference/`    | API reference, field types, config options, date patterns, CLI tools catalog |
| `guides/`       | How-to guides (dev setup, Playwright testing, scripting)                     |
| `standards/`    | Coding standards, bug report structure, conventions                          |

## Single Source of Truth

Setup instructions live in **one place only** — `guides/dev-setup.md`. Other files link to it instead of duplicating. When adding documentation:

- If it's about how to set up or configure something → add to `guides/dev-setup.md`
- If it's about how the VV platform works → `architecture/` or `reference/`
- If it's about patterns and conventions for this repo → `standards/`

## Writing Style

- Document what was verified live, not what's assumed from code reading
- Include build numbers and verification dates for platform behavior claims
- Link to related task analysis when referencing confirmed bugs
