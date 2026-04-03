# TC-6-D-IST — Run 2 | 2026-04-03 | IST | FAIL

**Spec**: [tc-6-D-IST.md](../test-cases/tc-6-D-IST.md) | **Summary**: [summary](../summaries/tc-6-D-IST.md)

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

| Step # | Expected | Actual                       | Match    |
| ------ | -------- | ---------------------------- | -------- |
| raw    | `""`     | `"2026-04-03T22:48:56.640Z"` | **FAIL** |
| api    | `""`     | `"not captured"`             | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Firefox verification for TC-6-D-IST
- Expected failure — Bug #5
- Test context: EXPECTED FAIL: Bug #5 fires on Current Date at form load. Raw = correct Date object (today in IST). GFV returns IST local time with fake Z (+5:30h offset vs real UTC). Config D current-date fields corrupted before user interaction.
