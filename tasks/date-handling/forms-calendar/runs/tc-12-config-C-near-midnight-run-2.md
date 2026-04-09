# TC-12-config-C-near-midnight — Run 2 | 2026-04-09 | BRT | PASS

**Spec**: [tc-12-config-C-near-midnight.md](../test-cases/tc-12-config-C-near-midnight.md) | **Summary**: [summary](../summaries/tc-12-config-C-near-midnight.md)

## Environment

| Parameter   | Value                                                                             |
| ----------- | --------------------------------------------------------------------------------- |
| Date        | 2026-04-09                                                                        |
| Browser     | Chromium (Playwright headless)                                                    |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                                                   |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                       |
| Platform    | VisualVault FormViewer                                                            |
| Test Method | Playwright regression (`timezoneId: America/Sao_Paulo`, `--project BRT-chromium`) |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| raw    | `"2026-03-15T23:00:00"`      | `"2026-03-15T23:00:00"`      | PASS  |
| api    | `"2026-03-16T02:00:00.000Z"` | `"2026-03-16T02:00:00.000Z"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-12-config-C-near-midnight
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Control: Config C round-trip at near-midnight is stable. Real UTC conversion (23:00 BRT = 02:00Z) → SFV parses Z back to same local. 0 drift. Proves FORM-BUG-5 is D-specific.
