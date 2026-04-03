# TC-12-near-midnight-2 — Run 1 | 2026-04-03 | BRT | FAIL

**Spec**: [tc-12-near-midnight-2.md](../test-cases/tc-12-near-midnight-2.md) | **Summary**: [summary](../summaries/tc-12-near-midnight-2.md)

## Environment

| Parameter   | Value                                                                            |
| ----------- | -------------------------------------------------------------------------------- |
| Date        | 2026-04-03                                                                       |
| Browser     | Firefox (Playwright headless)                                                    |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                                                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                      |
| Platform    | VisualVault FormViewer                                                           |
| Test Method | Playwright regression (`timezoneId: America/Sao_Paulo`, `--project BRT-firefox`) |

## Step Results

| Step # | Expected                | Actual                    | Match    |
| ------ | ----------------------- | ------------------------- | -------- |
| raw    | `"2026-03-15T23:00:00"` | `""2026-03-15T20:00:00""` | **FAIL** |
| api    | `"2026-03-15T23:00:00"` | `"not captured"`          | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Firefox verification for TC-12-near-midnight-2
- Expected failure — Bug #5
- Test context: EXPECTED FAIL: Near-midnight round-trip. 23:00 -3h = 20:00 (stays same day after 1 trip). Subsequent trips: 20→17→14→11→08→05→02→23 (day crossed after 8 trips from 23:00).
