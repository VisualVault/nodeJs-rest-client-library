# TC-1-B-BRT — Run 1 | 2026-03-27 | BRT | PASS

**Spec**: [tc-1-B-BRT.md](../test-cases/tc-1-B-BRT.md) | **Summary**: [summary](../summaries/tc-1-B-BRT.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | ~2026-03-27                                 |
| Tester TZ | `America/Sao_Paulo` — UTC-3 (BRT)           |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

Full precondition verification narrative in archived results.md (see Session reference in Outcome). Field identified as `DataField10` (`enableTime=false`, `ignoreTimezone=true`, `useLegacy=false`). V1 confirmed via `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` → `false`.

## Step Results

| Step #                    | Expected       | Actual         | Match |
| ------------------------- | -------------- | -------------- | ----- |
| Step 6 — raw stored value | `"2026-03-15"` | `"2026-03-15"` | PASS  |
| Step 7 — GetFieldValue    | `"2026-03-15"` | `"2026-03-15"` | PASS  |

## Outcome

**PASS** — Config B, BRT: date-only popup stores `"2026-03-15"` and GetFieldValue returns same value; `ignoreTimezone=true` has no effect on date-only fields in BRT.

## Findings

- Config B (ignoreTZ=true, date-only) produces identical stored values to Config A in BRT — the ignoreTZ flag has no observable effect on date-only storage or retrieval.
- GetFieldValue returns the raw stored value; no fake-Z on date-only fields regardless of ignoreTZ setting.
- Round-trip is stable: no drift in BRT for Config B.
- Next step: run same TC in IST (UTC+5:30) to confirm ignoreTZ has no effect on Bug #7 — see tc-1-B-IST.md.

**Full session narrative**: results.md — Session 1, Group 2 — Tests 2.2 and 2.7 (pre-2026-04-01 archive)
