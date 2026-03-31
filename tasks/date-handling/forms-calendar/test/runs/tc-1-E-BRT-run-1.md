# TC-1-E-BRT — Run 1 | 2026-03-31 | BRT | FAIL-1

**Spec**: [tc-1-E-BRT.md](../tc-1-E-BRT.md) | **Summary**: [summary](../summaries/tc-1-E-BRT.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-31                                  |
| Tester TZ | `America/Sao_Paulo` — UTC-3 (BRT)           |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

Full precondition verification narrative in archived results.md (see Session reference in Outcome). Field identified as `DataField12` (`enableTime=false`, `ignoreTimezone=false`, `useLegacy=true`, `enableInitialValue=false`). V1 confirmed via `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` → `false`. BRT confirmed via `new Date(2026, 2, 15, 0, 0, 0).toISOString()` → `"2026-03-15T03:00:00.000Z"`.

## Step Results

| Step #                    | Expected                                    | Actual                       | Match    |
| ------------------------- | ------------------------------------------- | ---------------------------- | -------- |
| Step 5 — raw stored value | `"2026-03-15"` (date-only, per expectation) | `"2026-03-15T03:00:00.000Z"` | **FAIL** |
| Step 6 — GetFieldValue    | `"2026-03-15"`                              | `"2026-03-15T03:00:00.000Z"` | **FAIL** |
| Step 7 — isoRef           | `"2026-03-15T03:00:00.000Z"`                | `"2026-03-15T03:00:00.000Z"` | PASS     |

## Outcome

**FAIL-1** — Legacy popup path (useLegacy=true) stores a full UTC datetime string `"2026-03-15T03:00:00.000Z"` even though `enableTime=false`. Expected behavior was date-only storage matching modern Configs A/B. Legacy path does not produce date-only format.

## Findings

- Legacy popup (`useLegacy=true`) stores a full UTC ISO datetime string with Z suffix — not the date-only string produced by modern Configs A/B.
- The stored UTC time correctly represents BRT midnight (`2026-03-15 00:00 BRT = 2026-03-15T03:00:00Z`), so no date shift for BRT.
- `enableTime=false` has no effect on storage format in the legacy path — the full UTC datetime is stored regardless.
- GetFieldValue returns the same UTC datetime string without transformation (no fake-Z on this path — the value already has a real Z).
- This format difference is the FAIL: a developer expecting `"2026-03-15"` will receive `"2026-03-15T03:00:00.000Z"` — different type, different parsing behavior downstream.
- In IST, the stored UTC datetime would have a previous-day date portion (2026-03-14T18:30:00.000Z) — tc-1-E-IST.md.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
