# TC-8B-D-IST — Run 3 | 2026-04-09 | IST | PASS

**Spec**: [tc-8B-D-IST.md](../test-cases/tc-8B-D-IST.md) | **Summary**: [summary](../summaries/tc-8B-D-IST.md)

## Environment

| Parameter   | Value                                                                        |
| ----------- | ---------------------------------------------------------------------------- |
| Date        | 2026-04-09                                                                   |
| Browser     | Chromium (Playwright headless)                                               |
| Tester TZ   | Asia/Kolkata — UTC+5:30 (IST)                                                |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                  |
| Platform    | VisualVault FormViewer                                                       |
| Test Method | Playwright regression (`timezoneId: Asia/Kolkata`, `--project IST-chromium`) |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| raw    | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS  |
| api    | `"2026-03-15T00:00:00.000Z"` | `"2026-03-15T00:00:00.000Z"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-8B-D-IST
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: GDOC returns correct real UTC in IST. toISOString() = "2026-03-14T18:30:00.000Z" (IST midnight in UTC). Contrasts GFV fake Z "T00:00:00.000Z". Confirms GDOC as safe alternative in UTC+ timezones.
