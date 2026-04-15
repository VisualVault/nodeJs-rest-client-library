# Extract Optimization — Speed & Reliability for Daily Sync

## What This Is

Improve the `tools/extract/` pipeline so daily/multi-daily syncs across all projects are fast and reliable. Previously: ~10 min for 108 templates (sequential download + re-download everything every run). Now: incremental sync skips unchanged templates entirely, parallel workers handle new/changed ones.

## Implemented

| Optimization                                               | Impact                                             | Verified             |
| ---------------------------------------------------------- | -------------------------------------------------- | -------------------- |
| Parallel template extraction (3 workers)                   | ~3x faster full export                             | 108/108 on vvdemo    |
| Content-hash incremental sync                              | Subsequent runs instant (`=108 same`)              | Verified             |
| Scripts unified manifest (all items)                       | Scheduled scripts tracked, no false deletions      | 43 items, `=43 same` |
| Single `computeChanges` call for scripts                   | Eliminates double-counted deletions                | Verified             |
| Globals: correct `getForms` API + `xcid/xcdid` from config | Now works on EmanuelJofre (was broken)             | 24 globals extracted |
| Globals: multi-template retry (5 attempts, 20s each)       | Faster failure, tries templates with records first | Verified             |
| Globals: environment-agnostic output                       | Removed hardcoded WADNR strings                    | Verified             |
| Login timeout increased (30s → 60s)                        | Handles slow VV environments                       | Verified             |

## Remaining

| Issue                               | Impact                                                    | Component |
| ----------------------------------- | --------------------------------------------------------- | --------- |
| Scripts: no REST API for source     | Must keep Playwright dock panel extraction                | scripts   |
| Auth: redundant OAuth per component | scripts + globals each call `getVaultApi()` independently | all       |

## Key Files

- `tools/extract/export.js` — orchestrator (context passing, unified computeChanges, manifest after extraction)
- `tools/extract/components/templates.js` — parallel extract, content hash, grid page tracking
- `tools/extract/components/scripts.js` — scripts extraction (unchanged)
- `tools/extract/components/globals.js` — correct API (`getForms`), config-based xcid/xcdid, multi-template retry
- `tools/helpers/vv-sync.js` — `hashField` support in `computeChanges`
- `tools/helpers/vv-admin.js` — login timeout fix
