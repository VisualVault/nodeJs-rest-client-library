# TC-1-C-BRT — Run 1 | 2026-03-27 | BRT | PASS

**Spec**: [tc-1-C-BRT.md](../test-cases/tc-1-C-BRT.md) | **Summary**: [summary](../summaries/tc-1-C-BRT.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | ~2026-03-27                                 |
| Tester TZ | `America/Sao_Paulo` — UTC-3 (BRT)           |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

Full precondition verification narrative in archived results.md (see Session reference in Outcome). Field identified as `DataField6` (`enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`). V1 confirmed via `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` → `false`.

## Step Results

| Step #                    | Expected                | Actual                       | Match |
| ------------------------- | ----------------------- | ---------------------------- | ----- |
| Step 8 — raw stored value | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"`      | PASS  |
| Step 9 — GetFieldValue    | `"2026-03-15T00:00:00"` | `"2026-03-15T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — Config C, BRT: DateTime popup stores local midnight `"2026-03-15T00:00:00"` and GetFieldValue returns proper UTC conversion `"2026-03-15T03:00:00.000Z"` (real UTC of BRT midnight); round-trip is stable.

## Findings

- Config C (enableTime=true, ignoreTZ=false) correctly converts the stored local time to UTC in GetFieldValue output — BRT midnight (00:00) → UTC `03:00Z`.
- This is the correct behavior: GetFieldValue applies `new Date(value).toISOString()` which preserves the real UTC equivalent.
- Round-trip is stable: SetFieldValue with this value correctly round-trips back to `"2026-03-15T00:00:00"` (confirmed in Test 2.3).
- Config D differs from Config C only in GetFieldValue output (fake Z vs real UTC conversion) — same raw storage.

**Full session narrative**: results.md — Session 1, Group 2 — Tests 2.2 and 2.3 (pre-2026-04-01 archive)
