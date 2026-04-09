# TC-5-A-PST — Run 2 | 2026-04-09 | PST | PASS

**Spec**: [tc-5-A-PST.md](../test-cases/tc-5-A-PST.md) | **Summary**: [summary](../summaries/tc-5-A-PST.md)

## Environment

| Parameter   | Value                                                                             |
| ----------- | --------------------------------------------------------------------------------- |
| Date        | 2026-04-09                                                                        |
| Browser     | Chromium (Playwright headless)                                                    |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                                                   |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                       |
| Platform    | VisualVault FormViewer                                                            |
| Test Method | Playwright regression (`timezoneId: America/Sao_Paulo`, `--project PST-chromium`) |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| raw    | `"2026-03-01T08:00:00.000Z"` | `"2026-03-01T08:00:00.000Z"` | PASS  |
| api    | `"2026-03-01T08:00:00.000Z"` | `"2026-03-01T08:00:00.000Z"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-5-A-PST
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Config A preset at PST (UTC-8). Deepest UTC- control. PST midnight March 1 = UTC 08:00 March 1. Negative offset preserves date. TZ check shows GMT-0700 (PDT in April) but preset date uses PST offset for March 1.
