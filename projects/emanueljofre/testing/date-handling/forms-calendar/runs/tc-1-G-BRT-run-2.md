# TC-1-G-BRT — Run 2 | 2026-04-06 | BRT | FAIL-1

**Spec**: [tc-1-G-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-1-G-BRT.md) | **Summary**: [summary](../summaries/tc-1-G-BRT.md)

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

| Step # | Expected                | Actual                       | Match    |
| ------ | ----------------------- | ---------------------------- | -------- |
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-15T03:00:00.000Z"` | **FAIL** |
| api    | `"2026-03-15T00:00:00"` | `"2026-03-15T03:00:00.000Z"` | **FAIL** |

## Outcome

**FAIL-1** — Confirms run-1 (2026-03-31). Legacy DateTime popup stores raw UTC `"2026-03-15T03:00:00.000Z"` instead of local-time-no-Z `"2026-03-15T00:00:00"`. Cross-category: TC-2-G-BRT stores `"2026-03-15T00:00:00"`.

## Audit Note

Bug #2 audit run. The popup closes immediately on day click without Time tab (legacy behavior confirmed again). Popup handler (`calChangeSetValue`) skips `getSaveValue()`, storing raw `toISOString()`.
