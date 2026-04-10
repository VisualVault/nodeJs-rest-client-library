# TC-9-H-IST-1 — Run 1 | 2026-04-01 | IST | PASS

**Spec**: [tc-9-H-IST-1.md](tasks/date-handling/forms-calendar/test-cases/tc-9-H-IST-1.md) | **Summary**: [summary](../summaries/tc-9-H-IST-1.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-01                                   |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer                       |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                                                     | Result                |
| ------------ | ----------------------------------------------------------- | --------------------- |
| TZ           | `new Date().toString()`                                     | Contains GMT+0530 ✓   |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓ |
| Field lookup | filter by config flags                                      | `["DataField13"]` ✓   |

## Step Results

| Step # | Expected                                | Actual                             | Match |
| ------ | --------------------------------------- | ---------------------------------- | ----- |
| 1      | SFV sets raw to `"2026-03-15T00:00:00"` | pre raw = `"2026-03-15T00:00:00"`  | PASS  |
| 2      | GFV returns `"2026-03-15T00:00:00"`     | pre api = `"2026-03-15T00:00:00"`  | PASS  |
| 3      | SFV(GFV()) round-trip: raw unchanged    | post raw = `"2026-03-15T00:00:00"` | PASS  |
| 4      | GFV after round-trip unchanged          | post api = `"2026-03-15T00:00:00"` | PASS  |

## Outcome

**PASS** — 0 drift after 1 GFV round-trip. Config H (`useLegacy=true`) confirmed as universal protection against Bug #5 in IST.

## Findings

- **Config H stable in IST**: Zero drift, matching BRT result (9-H-BRT-1). The `useLegacy=true` flag causes `getCalendarFieldValue()` to return the raw value without the fake Z transformation.
- **Universal protection confirmed**: Config H avoids Bug #5 in both UTC- (BRT) and UTC+ (IST) timezones. The legacy code path does not append the fake Z suffix.
- **GFV returns clean value**: No `.000Z` suffix appended — returns the exact stored string `"2026-03-15T00:00:00"`. This is the correct behavior that Config D fails to provide.
- **Workaround validation**: For developers needing stable round-trips on DateTime + ignoreTimezone fields, enabling `useLegacy=true` is a viable workaround.
