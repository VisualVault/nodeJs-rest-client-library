# TC-4-FAR-DD-BRT-reload — Run 2 | 2026-04-09 | BRT | FAIL

**Spec**: [tc-4-FAR-DD-BRT-reload.md](../test-cases/tc-4-FAR-DD-BRT-reload.md) | **Summary**: [summary](../summaries/tc-4-FAR-DD-BRT-reload.md)

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

| Step # | Expected                     | Actual                             | Match    |
| ------ | ---------------------------- | ---------------------------------- | -------- |
| raw    | `"2026-03-14T21:00:00"`      | `"unknown"`                        | **FAIL** |
| api    | `"2026-03-14T21:00:00.000Z"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5, Bug #1. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-4-FAR-DD-BRT-reload
- Expected failure — Bug #5, Bug #1
- API value not captured — test stopped at raw value assertion failure
- Test context: Full FillinAndRelate chain → save → reload. Source D fake Z (.000Z) compounds with target D Z-strip (.000 residue → UTC parse). Wrong value (21:00 Mar 14) persists in DB after save. Reload confirms the bug is permanent — the record is corrupted.
