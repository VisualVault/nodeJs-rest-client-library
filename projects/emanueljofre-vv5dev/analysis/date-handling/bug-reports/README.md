# V2 Bug Reports — EmanuelJofre-vv5dev

Per-bug support-ticket-ready dossiers for **every date-handling defect that reproduces on V2** in this environment. Self-contained — each file documents the observed V2 behavior independently of V1 history. V1 is treated as legacy/EOL: bugs are reported against V2 regardless of whether the underlying defect originated in V1.

## Index — 21 bugs

### Section A · V2-only new defects (9)

| # | Bug | Severity | Dossier |
|---|---|---|---|
| 1 | FORM-BUG-V2-TYPED-MM-OVERFLOW | **High** — silent data corruption | [v2-typed-mm-overflow.md](v2-typed-mm-overflow.md) |
| 2 | FORM-BUG-V2-CONFIG-D-TYPED-EMPTY | **Medium** — silent data loss | [v2-config-d-typed-empty.md](v2-config-d-typed-empty.md) |
| 3 | FORM-BUG-8 (V2 SFV-null hang) | Medium | [bug-8-sfv-null-hang.md](bug-8-sfv-null-hang.md) |
| 4 | FORM-BUG-V2-EPOCH-PRESERVED | Medium | [v2-epoch-preserved.md](v2-epoch-preserved.md) |
| 5 | FORM-BUG-3 (V2 hardcoded params) | Medium | [bug-3-hardcoded-params.md](bug-3-hardcoded-params.md) |
| 6 | FORM-BUG-V2-PRESET-YEAR | Medium | [v2-preset-year.md](v2-preset-year.md) |
| 7 | FORM-BUG-V2-URL-PARAM-NORMALIZE | Low–Medium | [v2-url-param-normalize.md](v2-url-param-normalize.md) |
| 8 | FORM-BUG-V2-LEGACY-Z | Low | [v2-legacy-z.md](v2-legacy-z.md) |
| 9 | FORM-BUG-V2-UTCMIDNIGHT | Low | [v2-utcmidnight.md](v2-utcmidnight.md) |

### Section B · Forms-calendar defects active on V2 (3)

| # | Bug | Severity | Dossier |
|---|---|---|---|
| 10 | FORM-BUG-1 (TZ marker stripped on form load) | Medium–High | [bug-1-timezone-stripping.md](bug-1-timezone-stripping.md) |
| 11 | FORM-BUG-2 (popup vs typed for legacy fields) | Medium | [bug-2-inconsistent-handlers.md](bug-2-inconsistent-handlers.md) |
| 12 | FORM-BUG-7 (wrong day for UTC+ TZ on date-only fields) | High | [bug-7-wrong-day-utc-plus.md](bug-7-wrong-day-utc-plus.md) |

### Section C · Server-side / cross-component defects active on V2 (8)

| # | Bug | Severity | Dossier |
|---|---|---|---|
| 13 | WS-BUG-1 (cross-layer shift API → Forms) | High | [ws-bug-1-cross-layer-shift.md](ws-bug-1-cross-layer-shift.md) |
| 14 | WS-BUG-2 (DD/MM/YYYY silently discarded) | High | [ws-bug-2-latam-data-loss.md](ws-bug-2-latam-data-loss.md) |
| 15 | WS-BUG-3 (ambiguous dates silently swapped) | High | [ws-bug-3-ambiguous-dates.md](ws-bug-3-ambiguous-dates.md) |
| 16 | WS-BUG-4 (endpoint format mismatch) | Medium | [ws-bug-4-endpoint-format-mismatch.md](ws-bug-4-endpoint-format-mismatch.md) |
| 17 | WS-BUG-5 (compact ISO + epoch silently nullified) | Medium | [ws-bug-5-silent-null-formats.md](ws-bug-5-silent-null-formats.md) |
| 18 | WS-BUG-6 (date-only fields accept time components) | Medium | [ws-bug-6-no-date-only-enforcement.md](ws-bug-6-no-date-only-enforcement.md) |
| 19 | DB-BUG-1 (dashboard format inconsistency) | Medium | [db-bug-1-format-inconsistency.md](db-bug-1-format-inconsistency.md) |
| 20 | DOC-BUG-1 (DocLib index field TZ converted to UTC, Z stripped) | High | [doc-bug-1-tz-utc-z-stripped.md](doc-bug-1-tz-utc-z-stripped.md) |

### Section D · V2 partial / changed behavior (1)

| # | Bug | Severity | Dossier |
|---|---|---|---|
| 21 | DOC-BUG-2 (cannot clear date once set — V2 partial fix) | Medium → Verification needed | [doc-bug-2-cannot-clear.md](doc-bug-2-cannot-clear.md) |

## Format

Every dossier follows the same template:

1. **Metadata** — environment, build, OS/browser, user role, TZ, frequency, severity
2. **Summary** — plain-language description of what users/scripts observe
3. **Steps to Reproduce** — preconditions, test data, Expected-vs-Actual rule
4. **Reproductions** — 1–3 concrete scenarios with exact inputs and outputs
5. **Concrete values by timezone** — per-TZ table (where TZ-relevant)
6. **Workaround** — short-term mitigation guidance
7. **Status / Test evidence** — TC slots, build fingerprints, regression run dates
8. **References** — pointers to research docs, audit entries, code paths

V2-only dossiers and reactivated-on-V2 dossiers are written as if V1 doesn't exist — every defect is reported as a current V2 platform problem.

## Build context (common to all dossiers)

| Field | Value |
|---|---|
| Server | `vv5dev` (https://vv5dev.visualvault.com) |
| Customer | `EmanuelJofre`, database `Main` |
| Platform version | `progVersion 6.1.20260416.1` · `formViewerBuild 20260418.1` · `dbVersion 3041` · fingerprint `f36b65dd` |
| Calendar code path | V2 (`useUpdatedCalendarValueLogic = true` at Database scope) |
| Kendo version | v2 |
| Test harness (forms) | `Date Test Harness` form (templateId `713af8f2-d93c-f111-8312-f68855a47462`) |
| Test harness (WS) | `DateTestWSHarness` web service + `DateTest - All Records` / `DateTest - By Instance Name` custom queries |
| Test harness (DocLib) | `/zzz-date-tests` folder + `zzz-date-test-doc` document with `Date` + `Date With Preset` index fields |
| Last full regression | 2026-05-04 (forms 294P/3F/2T/3I, WS 129P/0F, dash 36P/0F, doc 40P/0F) |

## Related

- [v2-bugs-catalog.md](../v2-bugs-catalog.md) — overview catalog grouping all 21 bugs by category
- [v2-baseline-audit.md](../../testing/date-handling/v2-baseline-audit.md) — V1 vs V2 expected-value differential audit
- [docs/reference/form-fields.md § Known Bugs](../../../../docs/reference/form-fields.md#known-bugs-calendar-field) — canonical platform-bug reference table
