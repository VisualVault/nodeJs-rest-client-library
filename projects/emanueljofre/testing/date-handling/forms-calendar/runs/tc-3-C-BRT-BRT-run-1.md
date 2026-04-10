# TC-3-C-BRT-BRT — Run 1 | 2026-03-27 | BRT | PASS

**Spec**: [tc-2-1-form-load-brt.md](tasks/date-handling/forms-calendar/test-cases/tc-2-1-form-load-brt.md) | **Summary**: [summary](../summaries/tc-3-C-BRT-BRT.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-27                                  |
| Tester TZ | `America/Sao_Paulo` — UTC-3 (BRT)           |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

Full precondition verification narrative in archived results.md (pre-2026-04-01).

## Step Results

| Step # | Expected                                                              | Actual                       | Match |
| ------ | --------------------------------------------------------------------- | ---------------------------- | ----- |
| 1      | All P1–P6 checks pass                                                 | All P1–P6 checks pass        | PASS  |
| 2      | Tab title `DateTest-000004 Rev 1`; form loads correctly               | Confirmed                    | PASS  |
| 11     | Display: `03/15/2026 12:00 AM`                                        | `03/15/2026 12:00 AM`        | PASS  |
| 12     | Raw stored: `"2026-03-15T00:00:00"` — no shift from server reload     | `"2026-03-15T00:00:00"`      | PASS  |
| 13     | GFV: `"2026-03-15T03:00:00.000Z"` — proper UTC conversion (no Bug #5) | `"2026-03-15T03:00:00.000Z"` | PASS  |
| 17     | `"2026-03-15T03:00:00.000Z"` (BRT confirmed)                          | `"2026-03-15T03:00:00.000Z"` | PASS  |

> Note: Step numbers match tc-2-9 spec (Config C block = steps 11–13; isoRef = step 17). Config C is DataField6 (`enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`). Observed during the same DateTest-000004 Rev 1 reload session as 3-D-BRT-BRT and 3-A-BRT-BRT.

## Outcome

**PASS** — Config C display and GFV are identical on server reload in BRT; no shift; GFV correctly returns UTC offset value (not fake Z).

## Findings

- Config C (`ignoreTimezone=false`) GFV correctly converts local midnight to UTC: `"2026-03-15T03:00:00.000Z"` — this is the expected UTC-conversion behavior, not Bug #5.
- Raw stored value `"2026-03-15T00:00:00"` unchanged from the original save — no drift on reload.
- Display `03/15/2026 12:00 AM` identical on reload.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
