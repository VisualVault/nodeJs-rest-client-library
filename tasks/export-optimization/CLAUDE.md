# Export Optimization — Speed & Reliability for Daily Sync

## What This Is

Improve the `tools/export/` pipeline so daily/multi-daily syncs across all projects are fast and reliable. Currently a full export of 108 templates takes ~10 minutes sequentially. Target: under 3 minutes for incremental sync, under 5 for full.

## Current State

Export tool (`tools/export/export.js`) supports 4 components: scripts, schedules, globals, templates. Tested on both WADNR (vv5dev) and EmanuelJofre (vvdemo). Key issues discovered on 2026-04-09:

| Issue                                                              | Impact                                | Component |
| ------------------------------------------------------------------ | ------------------------------------- | --------- |
| Template export is sequential (1 click + download per template)    | ~10 min for 108 templates             | templates |
| No revision-based change detection for templates                   | Re-downloads everything on every sync | templates |
| Scripts use API for metadata but UI for source (no API for source) | Slow extraction via dock panel clicks | scripts   |
| Globals fails on some environments (FormViewer timeout)            | Missing globals for EmanuelJofre      | globals   |
| Auth token acquired separately per component                       | Redundant API auth calls              | all       |
| Script sync deletes+recreates files when categories shift          | Data loss on re-runs                  | scripts   |

## Next Steps

1. **Parallel template export** — Open 3-4 Playwright pages in the same browser context, split the template list, export simultaneously. Each page handles its own grid pagination + download. Expected: ~3-4x faster.

2. **Template revision tracking** — Add revision number to template metadata during grid scrape. Store in manifest. On re-sync, compare revision — only re-download if changed. This makes incremental syncs near-instant for templates.

3. **Investigate API for script source** — Check if `getOutsideProcess(id)` or similar REST endpoint returns script source code. If yes, eliminate Playwright dock panel extraction entirely for scripts.

4. **Shared auth session** — Authenticate once via REST API at orchestrator level, pass the token/session to all components. Currently scripts and globals each call `getVaultApi()` independently.

5. **Fix globals for all environments** — The current API-based approach picks the first template and tries to load it in FormViewer. Template "000" on vvdemo doesn't populate VV.Form.Global. Try a different template, or iterate until one works.

6. **Fix scripts sync category handling** — The scheduled/non-scheduled split in `computeChanges` deletes files when the manifest category changes between runs. Need idempotent sync that doesn't destroy data.

## Key Files

- `tools/export/export.js` — orchestrator
- `tools/export/components/scripts.js` — scripts extraction (API + Playwright)
- `tools/export/components/schedules.js` — schedules (grid scraping, metadata only)
- `tools/export/components/globals.js` — globals (API + FormViewer introspection)
- `tools/export/components/templates.js` — templates (grid scraping + download)
- `tools/helpers/vv-admin.js` — shared admin page helpers
- `tools/helpers/vv-sync.js` — manifest, change detection, README generation
