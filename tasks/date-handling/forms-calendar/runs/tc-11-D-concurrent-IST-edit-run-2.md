# TC-11-D-concurrent-IST-edit — Run 2 | 2026-04-09 | BRT | FAIL

**Spec**: [tc-11-D-concurrent-IST-edit.md](../test-cases/tc-11-D-concurrent-IST-edit.md) | **Summary**: [summary](../summaries/tc-11-D-concurrent-IST-edit.md)

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

| Step # | Expected                | Actual                             | Match    |
| ------ | ----------------------- | ---------------------------------- | -------- |
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-14T21:00:00"`            | **FAIL** |
| api    | `"2026-03-15T00:00:00"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-11-D-concurrent-IST-edit
- Expected failure — Bug #5
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL: Concurrent multi-user edit. User A (IST) round-trips +5:30h, User B (BRT) round-trips -3h, net +2:30h. Two users independently trigger Bug #5 — shifts accumulate across users.
