# TC-5-D-IST — Run 2 | 2026-04-03 | IST | FAIL

**Spec**: [tc-5-D-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-5-D-IST.md) | **Summary**: [summary](../summaries/tc-5-D-IST.md)

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
| raw    | `"2026-03-01T00:00:00"` | `"2026-03-01T11:28:54.627Z"` | **FAIL** |
| api    | `"2026-03-01T00:00:00"` | `"not captured"`             | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Firefox verification for TC-5-D-IST
- Expected failure — Bug #5
- Test context: EXPECTED FAIL: Bug #5 fires on preset Date at form load. Raw = Date object (correct local date). GFV returns IST local time with fake Z (+5:30h offset). Config D preset fields are corrupted before any user interaction.
