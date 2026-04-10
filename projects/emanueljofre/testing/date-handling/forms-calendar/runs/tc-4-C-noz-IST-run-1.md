# TC-4-C-noz-IST — Run 1 | 2026-04-08 | IST | PASS

**Spec**: [tc-4-C-noz-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-4-C-noz-IST.md) | **Summary**: [summary](../summaries/tc-4-C-noz-IST.md)

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
| raw    | `"2026-03-15T14:30:00"`      | `"2026-03-15T14:30:00"`      | PASS  |
| api    | `"2026-03-15T09:00:00.000Z"` | `"2026-03-15T09:00:00.000Z"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-4-C-noz-IST
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Config C without Z in IST. Local 14:30 IST stored. API returns UTC equivalent (-5:30h).
