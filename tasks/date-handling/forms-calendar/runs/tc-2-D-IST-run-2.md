# TC-2-D-IST — Run 2 | 2026-04-03 | IST | FAIL

**Spec**: [tc-2-D-IST.md](../test-cases/tc-2-D-IST.md) | **Summary**: [summary](../summaries/tc-2-D-IST.md)

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

- Firefox verification for TC-2-D-IST
- Expected failure — Bug #5
- Test context: EXPECTED FAIL on GFV: Bug #5 fake Z → "...000Z". Correct: raw unchanged.
