# TC-1-A-BRT — Run 1 | 2026-03-27 | BRT | PASS

**Spec**: [tc-1-A-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-1-A-BRT.md) | **Summary**: [summary](../summaries/tc-1-A-BRT.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | ~2026-03-27                                 |
| Tester TZ | `America/Sao_Paulo` — UTC-3 (BRT)           |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

Full precondition verification narrative in archived results.md (see Session reference in Outcome). Field identified as `DataField7` (`enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`). V1 confirmed via `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` → `false`.

## Step Results

| Step #                    | Expected       | Actual         | Match |
| ------------------------- | -------------- | -------------- | ----- |
| Step 6 — raw stored value | `"2026-03-15"` | `"2026-03-15"` | PASS  |
| Step 7 — GetFieldValue    | `"2026-03-15"` | `"2026-03-15"` | PASS  |

## Outcome

**PASS** — Config A, BRT: date-only popup stores `"2026-03-15"` and GetFieldValue returns same value; no shift (BRT UTC-3 midnight is the same calendar day).

## Findings

- Config A date-only popup in BRT stores the correct date without shift. Bug #7 does not affect UTC- timezones.
- GetFieldValue returns the raw stored value directly with no transformation; no fake-Z on date-only fields.
- Round-trip is stable: no drift in BRT for Config A.
- Next step: run same TC in IST (UTC+5:30) to confirm Bug #7 triggers — see tc-1-A-IST.md.

**Full session narrative**: results.md — Session 1, Group 2 — Test 2.2 (pre-2026-04-01 archive)
