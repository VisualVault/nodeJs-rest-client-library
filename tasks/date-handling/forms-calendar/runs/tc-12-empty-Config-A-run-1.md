# TC-12-empty-Config-A — Run 1 | 2026-04-08 | BRT | PASS

**Spec**: [tc-12-empty-Config-A.md](../test-cases/tc-12-empty-Config-A.md) | **Summary**: [summary](../summaries/tc-12-empty-Config-A.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-08                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer                           |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                               |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                     | `"Wed Apr 08 2026 16:01:50 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | Config A filter                                             | `["Field7"]` ✓                                                                       |

## Step Results

| Step # | Expected | Actual | Match |
| ------ | -------- | ------ | ----- |
| 2      | `""`     | `""`   | PASS  |
| 3      | `""`     | `""`   | PASS  |

## Outcome

**PASS** — Empty Config A field returns `""` from both raw and GetFieldValue. Bug #6 absent.

## Findings

- Confirmed: Config A (`enableTime=false`) is immune to Bug #6
- Bug #6 scope boundary validated: requires `enableTime=true` to trigger
- Matches Cat 8 sibling tc-8-A-empty (also PASS)
- No further action — control test closed
