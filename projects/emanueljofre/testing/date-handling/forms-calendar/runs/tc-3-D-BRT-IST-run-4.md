# TC-3-D-BRT-IST — Run 4 | 2026-04-03 | IST | FAIL

**Spec**: [tc-3-D-BRT-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-3-D-BRT-IST.md) | **Summary**: [summary](../summaries/tc-3-D-BRT-IST.md)

## Environment

| Parameter   | Value                                                                       |
| ----------- | --------------------------------------------------------------------------- |
| Date        | 2026-04-03                                                                  |
| Browser     | Firefox (Playwright headless)                                               |
| Tester TZ   | Asia/Kolkata — UTC+5:30 (IST)                                               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                 |
| Platform    | VisualVault FormViewer                                                      |
| Test Method | Playwright regression (`timezoneId: Asia/Kolkata`, `--project IST-firefox`) |

## Step Results

| Step # | Expected                | Actual                       | Match    |
| ------ | ----------------------- | ---------------------------- | -------- |
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` | **FAIL** |
| api    | `"2026-03-15T00:00:00"` | `"not captured"`             | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Firefox verification for TC-3-D-BRT-IST
- Expected failure — Bug #5
- Test context: EXPECTED FAIL on GFV: Bug #5 fake Z in IST context. Raw TZ-invariant (ignoreTZ field).
