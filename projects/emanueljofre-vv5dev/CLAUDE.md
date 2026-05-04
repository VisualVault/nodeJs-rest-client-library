# EmanuelJofre-vv5dev Project — Personal Sandbox on vv5dev

## Environment

| Setting      | Value                                                     |
| ------------ | --------------------------------------------------------- |
| Server       | vv5dev                                                    |
| Customer     | EmanuelJofre                                              |
| Database     | Main                                                      |
| Base URL     | https://vv5dev.visualvault.com                            |
| Read-Only    | No (enforced in `.env.json`)                              |
| Write Policy | `unrestricted` — development sandbox, all writes allowed  |

Full environment profile (platform versions, services, front-end stack): [`environment.json`](environment.json) — generate with `npm run env:profile -- --project emanueljofre-vv5dev`.

## Write Safety

Development sandbox — all writes allowed. See root `CLAUDE.md` § "Write Safety" for the guard architecture.

## Extracts

All data extracted via `tools/extract/` from the EmanuelJofre admin panels on vv5dev.

| Component          | Count | Location                     |
| ------------------ | ----- | ---------------------------- |
| Web Services       | —     | `extracts/web-services/`     |
| Scheduled Services | —     | `extracts/schedules/`        |
| Global Functions   | —     | `extracts/global-functions/` |
| Form Templates     | 1 template (Date Test Harness) | `extracts/form-templates/`   |
| Custom Queries     | —     | `extracts/custom-queries/`   |

Full extraction not yet run. Date Test Harness extracted 2026-04-20 for the V2 baseline test run.

## Commands

```bash
# Capture environment profile
npm run env:profile -- --project emanueljofre-vv5dev              # HTTP only (~3s)
npm run env:profile:browser -- --project emanueljofre-vv5dev      # + browser probes (~12s)

# Export all components
node tools/extract/extract.js --project emanueljofre-vv5dev

# Dry-run
node tools/extract/extract.js --project emanueljofre-vv5dev --dry-run
```

## Analysis

- [`analysis/date-handling/v2-impact-analysis.md`](analysis/date-handling/v2-impact-analysis.md) — Comprehensive impact analysis: severity matrix, customer-impact scenarios, V1→V2 migration risk map, compound-bug interactions, recommendations per stakeholder.
- [`analysis/date-handling/v2-briefing.md`](analysis/date-handling/v2-briefing.md) — Manager-facing 5-minute briefing of the V2 trade-offs and bottom-line risks.
- [`analysis/date-handling/v2-bugs-catalog.md`](analysis/date-handling/v2-bugs-catalog.md) — Catalog of every date-handling bug observable on this V2 environment: V2-only new defects, V1 defects persisting in V2, cross-component defects, partial fixes, and V1 defects fixed in V2.
- [`analysis/date-handling/bug-reports/`](analysis/date-handling/bug-reports/) — 21 self-contained per-bug dossiers in support-ticket-ready format.
- [`analysis/central-admin/`](analysis/central-admin/README.md) — Central Admin customer-config snapshot (v3041, captured 2026-04-20): per-tab JSON, settings index, key environment facts. See [docs/architecture/visualvault-platform.md § Central Admin](../../docs/architecture/visualvault-platform.md#central-admin-cross-customer-control-panel) for the platform-level documentation.

Other analysis starting points (when extracts exist):

- `node tools/inventory/inventory-fields.js` for field inventory
- `node tools/inventory/inventory-scripts.js` for script inventory

## Testing

V2 date-handling baseline — execution data in `testing/date-handling/`:

- [`testing/date-handling/status.md`](testing/date-handling/status.md) — full chromium regression summary (per-TZ, per-category)
- [`testing/date-handling/failures.md`](testing/date-handling/failures.md) — per-failure Expected vs Received table
- [`testing/date-handling/failures.json`](testing/date-handling/failures.json) — structured failure data
- [`testing/date-handling/regression-results-latest.json`](testing/date-handling/regression-results-latest.json) — custom-reporter structured output (per-TC status + actual values + `buildContext.fingerprint`)
- [`testing/date-handling/v2-baseline-audit.md`](testing/date-handling/v2-baseline-audit.md) — V1-vs-V2 diff audit with verdicts (IDENTICAL / FORMAT_ONLY / SAME_LOCAL_DATE / KNOWN_BUG_PERSISTS / UNFLAGGED_DIFFERENCE). Regenerate with `npm run audit:v2 -- --project EmanuelJofre-vv5dev --write`.
- ✅ [`testing/date-handling/v2-review-queue.md`](testing/date-handling/v2-review-queue.md) — **CLOSED 2026-04-22**. All 6 UNFLAGGED entries resolved; three new V2 bug tags landed (`FORM-BUG-V2-EPOCH-PRESERVED`, `FORM-BUG-V2-URL-PARAM-NORMALIZE`). One mid-sweep tag withdrawn (`FORM-BUG-V2-SAVE-RELOAD-EMPTY` — root cause was `saveFormAndReload` helper calling `page.reload()` on the template URL, not a platform issue). Audit `UNFLAGGED_DIFFERENCE = 0`.
- `testing/date-handling/full-log.log` — raw playwright output

### Build timeline

Every regression JSON embeds a `buildContext` with a short fingerprint (SHA-8 of `environment` + `progVersion` + `dbVersion` + `formViewerBuild`) so runs can be correlated with platform rollouts. Derive the timeline on demand — no separate file to maintain:

```bash
npm run build:timeline -- --project EmanuelJofre-vv5dev
npm run build:timeline -- --project EmanuelJofre-vv5dev --tc TC-1-D-BRT   # per-TC history across builds
npm run build:timeline -- --project EmanuelJofre-vv5dev --json            # machine-readable
```

### Task status (executed vs pending)

Cross-reference the forms-calendar matrix against regression runs to see which slots have been executed on this customer, which are still pending, and per-TC history:

```bash
npm run task:status -- --project EmanuelJofre-vv5dev                      # stdout rollup
npm run task:status -- --project EmanuelJofre-vv5dev --write              # persists to testing/date-handling/forms-calendar/status.md
npm run task:status -- --project EmanuelJofre-vv5dev --pending-only
```

## Repo

Deployable code lives in `repo/` (independent git repo — [emanueljofre/EmanuelJofre-vv5dev](https://github.com/emanueljofre/EmanuelJofre-vv5dev), private).

## Related

- **Test assets catalog: [`test-assets.md`](test-assets.md)** — Date Test Harness form, field map (semantic names), V2 context
- Sister sandbox on vvdemo: [`../emanueljofre-vvdemo/`](../emanueljofre-vvdemo/CLAUDE.md)
