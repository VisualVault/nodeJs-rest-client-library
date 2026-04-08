# TC-4-D-midnight-z-IST — Run 1 | 2026-04-08 | IST | PASS

**Spec**: [tc-4-D-midnight-z-IST.md](../test-cases/tc-4-D-midnight-z-IST.md) | **Summary**: [summary](../summaries/tc-4-D-midnight-z-IST.md)

## Environment

| Parameter   | Value                                                                        |
| ----------- | ---------------------------------------------------------------------------- |
| Date        | 2026-04-08                                                                   |
| Browser     | Chromium (Playwright headless)                                               |
| Tester TZ   | Asia/Kolkata — UTC+5:30 (IST)                                                |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                  |
| Platform    | VisualVault FormViewer                                                       |
| Test Method | Playwright regression (`timezoneId: Asia/Kolkata`, `--project IST-chromium`) |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| raw    | `"2026-03-15T05:30:00"`      | `"2026-03-15T05:30:00"`      | PASS  |
| api    | `"2026-03-15T05:30:00.000Z"` | `"2026-03-15T05:30:00.000Z"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-4-D-midnight-z-IST
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: FORM-BUG-1 midnight in IST: UTC midnight becomes 05:30 IST. Date stays Mar 15 (no day shift), but time is wrong.
