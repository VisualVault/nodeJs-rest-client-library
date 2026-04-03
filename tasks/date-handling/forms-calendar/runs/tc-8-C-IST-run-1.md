# TC-8-C-IST — Run 1 | 2026-04-03 | IST | PASS

**Spec**: [tc-8-C-IST.md](../test-cases/tc-8-C-IST.md) | **Summary**: [summary](../summaries/tc-8-C-IST.md)

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

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| raw    | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS  |
| api    | `"2026-03-14T18:30:00.000Z"` | `"2026-03-14T18:30:00.000Z"` | PASS  |

## Outcome

**PASS** — All values match expected. Firefox produces identical results to prior runs.

## Findings

- Firefox verification for TC-8-C-IST
- Cross-browser consistency confirmed — firefox matches prior engine results
- Test context: Config C real UTC from IST: local midnight = previous UTC day (Mar 14 18:30Z). Day crossing is correct behavior.
