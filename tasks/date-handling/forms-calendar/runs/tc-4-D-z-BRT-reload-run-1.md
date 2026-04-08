# TC-4-D-z-BRT-reload — Run 1 | 2026-04-08 | BRT | PASS

**Spec**: [tc-4-D-z-BRT-reload.md](../test-cases/tc-4-D-z-BRT-reload.md) | **Summary**: [summary](../summaries/tc-4-D-z-BRT-reload.md)

## Environment

| Parameter   | Value                                                                             |
| ----------- | --------------------------------------------------------------------------------- |
| Date        | 2026-04-08                                                                        |
| Browser     | Chromium (Playwright headless)                                                    |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                                                   |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                       |
| Platform    | VisualVault FormViewer                                                            |
| Test Method | Playwright regression (`timezoneId: America/Sao_Paulo`, `--project BRT-chromium`) |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| raw    | `"2026-03-14T21:00:00"`      | `"2026-03-14T21:00:00"`      | PASS  |
| api    | `"2026-03-14T21:00:00.000Z"` | `"2026-03-14T21:00:00.000Z"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-4-D-z-BRT-reload
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: FORM-BUG-1 locked in DB: UTC midnight Z-stripped → parsed as UTC (.000 residue) → BRT 21:00 Mar 14. After save+reload, the wrong value persists self-consistently (V1 DateTime reload reconstructs local time).
