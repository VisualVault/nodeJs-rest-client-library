# TC-4-FAR-DD-IST — Run 1 | 2026-04-08 | IST | PASS

**Spec**: [tc-4-FAR-DD-IST.md](../test-cases/tc-4-FAR-DD-IST.md) | **Summary**: [summary](../summaries/tc-4-FAR-DD-IST.md)

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

- Chromium verification for TC-4-FAR-DD-IST
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: D→D IST: Bugs compound same as BRT. Source fake Z ".000Z" → strip Z → ".000" → UTC parse → UTC midnight in IST = 05:30 Mar 15. The .000 residue causes UTC interpretation.
