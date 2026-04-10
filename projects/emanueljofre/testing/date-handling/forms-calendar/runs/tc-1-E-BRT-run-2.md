# TC-1-E-BRT — Run 2 | 2026-04-06 | BRT | FAIL-1

**Spec**: [tc-1-E-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-1-E-BRT.md) | **Summary**: [summary](../summaries/tc-1-E-BRT.md)

## Environment

| Parameter   | Value                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------- |
| Date        | 2026-04-06                                                                                  |
| Browser     | Chromium (Playwright headless)                                                              |
| Tester TZ   | `America/Sao_Paulo` — UTC-3 (BRT)                                                           |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                                 |
| Platform    | VisualVault FormViewer                                                                      |
| Test Method | Playwright spec (`cat-1-legacy-popup.spec.js`, `--project BRT-chromium`) — Bug #2 audit run |

## Step Results

| Step # | Expected       | Actual                       | Match    |
| ------ | -------------- | ---------------------------- | -------- |
| raw    | `"2026-03-15"` | `"2026-03-15T03:00:00.000Z"` | **FAIL** |
| api    | `"2026-03-15"` | `"2026-03-15T03:00:00.000Z"` | **FAIL** |

## Outcome

**FAIL-1** — Confirms run-1 (2026-03-31, manual Claude-in-Chrome). Legacy popup stores full UTC datetime `"2026-03-15T03:00:00.000Z"` instead of date-only `"2026-03-15"`.

## Audit Note

This is a **Bug #2 audit run** verifying the manual run-1 via automated Playwright. Values match run-1 exactly. Cross-category comparison: Cat 2 typed input (TC-2-E-BRT) stores `"2026-03-15"` — format divergence confirmed.
