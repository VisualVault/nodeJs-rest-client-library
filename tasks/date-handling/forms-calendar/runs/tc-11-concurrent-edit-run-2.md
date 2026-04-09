# TC-11-concurrent-edit — Run 2 | 2026-04-09 | BRT | FAIL

**Spec**: [tc-11-concurrent-edit.md](../test-cases/tc-11-concurrent-edit.md) | **Summary**: [summary](../summaries/tc-11-concurrent-edit.md)

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

- Chromium verification for TC-11-concurrent-edit
- Expected failure — Bug #5
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL: BRT→IST concurrent edit (reverse of 11-D-concurrent-IST-edit). User A (BRT) round-trips -3h (crosses day boundary to T21:00 Mar 14), User B (IST) round-trips +5:30h on drifted value, net +2:30h. Same net drift as IST→BRT, proving commutativity.
