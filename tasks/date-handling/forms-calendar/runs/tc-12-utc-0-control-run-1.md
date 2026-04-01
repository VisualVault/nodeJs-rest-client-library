# TC-12-utc-0-control — Run 1 | 2026-04-01 | UTC+0 | PASS

**Spec**: [tc-12-utc-0-control.md](../test-cases/tc-12-utc-0-control.md) | **Summary**: [summary](../summaries/tc-12-utc-0-control.md)

## Environment

| Parameter   | Value                                       |
| ----------- | ------------------------------------------- |
| Date        | 2026-04-01                                  |
| Tester TZ   | Etc/GMT — UTC+0 (GMT)                       |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform    | VisualVault FormViewer, Build 20260304.1    |
| Test Method | Playwright CLI (`timezoneId: Etc/GMT`)      |

## Preconditions Verified

| Check        | Command                                                                                            | Result                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                            | `"Wed Apr 01 2026 18:05:13 GMT+0000 (Greenwich Mean Time)"` — contains GMT+0000 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                        | `false` → V1 active ✓                                                             |
| Field lookup | filter `fieldType===13, enableTime=true, ignoreTZ=true, useLegacy=false, enableInitialValue=false` | `["DataField5"]` ✓                                                                |

## Step Results

| Step # | Expected                                     | Actual                       | Match |
| ------ | -------------------------------------------- | ---------------------------- | ----- |
| 3      | `"2026-03-15T00:00:00"` (baseline raw)       | `"2026-03-15T00:00:00"`      | PASS  |
| 4      | `"2026-03-15T00:00:00.000Z"` (GFV fake Z)    | `"2026-03-15T00:00:00.000Z"` | PASS  |
| 6      | `"2026-03-15T00:00:00"` (post-trip raw)      | `"2026-03-15T00:00:00"`      | PASS  |
| 7      | `"2026-03-15T00:00:00.000Z"` (post-trip GFV) | `"2026-03-15T00:00:00.000Z"` | PASS  |
| 8      | `"2026-03-15T00:00:00.000Z"` (TZ ref)        | `"2026-03-15T00:00:00.000Z"` | PASS  |

## Outcome

**PASS** — Zero drift after 1 GFV round-trip at UTC+0. Bug #5 fake Z is coincidentally correct because local midnight = UTC midnight.

## Findings

- Actual matches matrix prediction: 0 drift at UTC+0
- **Bug #5 is timezone-dependent, not a universal defect**: At UTC+0, the fake Z suffix `"...T00:00:00.000Z"` happens to correctly label the local time as UTC. `normalizeCalValue` parses it as UTC midnight → Date = UTC midnight → `getSaveValue` extracts local = `"T00:00:00"` → unchanged
- **Key comparison triangle**:
    - UTC+0: 0 drift (fake Z coincidentally correct)
    - BRT (UTC-3): -3h drift per trip (local midnight mislabeled as UTC, then reconverted -3h)
    - IST (UTC+5:30): +5:30h drift per trip (predicted — untested)
- The drift magnitude = the timezone offset, applied once per round-trip. At UTC+0, offset = 0, so drift = 0
- `isoRef` confirms UTC+0: `new Date(2026,2,15,0,0,0).toISOString()` = `"2026-03-15T00:00:00.000Z"` — matches GFV, proving local = UTC
- Recommended next: verify drift in IST (+5:30h expected) to complete the comparison triangle
