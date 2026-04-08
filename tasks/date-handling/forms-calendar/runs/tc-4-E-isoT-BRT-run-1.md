# TC-4-E-isoT-BRT — Run 1 | 2026-04-08 | BRT | PASS

**Spec**: [tc-4-E-isoT-BRT.md](../test-cases/tc-4-E-isoT-BRT.md) | **Summary**: [summary](../summaries/tc-4-E-isoT-BRT.md)

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

| Step # | Expected       | Actual         | Match |
| ------ | -------------- | -------------- | ----- |
| raw    | `"2026-03-15"` | `"2026-03-15"` | PASS  |
| api    | `"2026-03-15"` | `"2026-03-15"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-4-E-isoT-BRT
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Legacy date-only via URL. enableQListener works with useLegacy. Display shows (no input) — legacy widget does not render URL value visually.
