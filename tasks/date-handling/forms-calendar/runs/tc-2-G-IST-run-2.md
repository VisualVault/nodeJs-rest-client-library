# TC-2-G-IST — Run 2 | 2026-04-03 | IST | PASS

**Spec**: [tc-2-G-IST.md](../test-cases/tc-2-G-IST.md) | **Summary**: [summary](../summaries/tc-2-G-IST.md)

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

| Step # | Expected                | Actual                  | Match |
| ------ | ----------------------- | ----------------------- | ----- |
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |
| api    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |

## Outcome

**PASS** — All values match expected. Firefox produces identical results to prior runs.

## Findings

- Firefox verification for TC-2-G-IST
- Cross-browser consistency confirmed — firefox matches prior engine results
- Test context: Legacy DateTime typed in IST. getSaveValue formats local midnight. Correct storage.
