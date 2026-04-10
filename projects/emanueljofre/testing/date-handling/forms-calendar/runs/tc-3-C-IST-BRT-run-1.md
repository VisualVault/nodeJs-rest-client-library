# TC-3-C-IST-BRT — Run 1 | 2026-04-01 | BRT | FAIL

**Spec**: [tc-3-C-IST-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-3-C-IST-BRT.md) | **Summary**: [summary](../summaries/tc-3-C-IST-BRT.md)

## Environment

| Parameter   | Value                                               |
| ----------- | --------------------------------------------------- |
| Date        | 2026-04-01                                          |
| Save TZ     | Asia/Calcutta — UTC+5:30 (IST)                      |
| Load TZ     | America/Sao_Paulo — UTC-3 (BRT)                     |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)         |
| Platform    | VisualVault FormViewer, Build 20260304.1            |
| Test Method | Playwright CLI (two sessions: IST save, BRT reload) |

## Preconditions Verified

| Check         | Command                                                          | Result                                                      |
| ------------- | ---------------------------------------------------------------- | ----------------------------------------------------------- |
| IST TZ (save) | `new Date().toString()`                                          | `"Thu Apr 02 2026 06:30:39 GMT+0530"` — contains GMT+0530 ✓ |
| BRT TZ (load) | `new Date().toString()`                                          | `"Wed Apr 01 2026 22:01:39 GMT-0300"` — contains GMT-0300 ✓ |
| V1/V2         | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`      | `false` → V1 active ✓                                       |
| Field lookup  | filter by enableTime=true, ignoreTimezone=false, useLegacy=false | `["DataField6"]` ✓                                          |
| Saved record  | VV.Form.DataID after IST save                                    | `"278aee29-1141-4165-8769-e33869a5056e"` ✓                  |

## IST Save Phase

| Step   | Action                     | Value                                                   |
| ------ | -------------------------- | ------------------------------------------------------- |
| Save-1 | SFV("2026-03-15T00:00:00") | raw: `"2026-03-15T00:00:00"`                            |
| Save-2 | GFV in IST (pre-reload)    | `"2026-03-14T18:30:00.000Z"` (real UTC of IST midnight) |
| Save-3 | Click Save                 | DataID assigned ✓                                       |

## BRT Reload Step Results

| Step # | Expected                                                       | Actual                                          | Match    |
| ------ | -------------------------------------------------------------- | ----------------------------------------------- | -------- |
| 1      | raw: `"2026-03-15T00:00:00"`                                   | `"2026-03-15T00:00:00"`                         | PASS     |
| 2      | GFV: `"2026-03-14T18:30:00.000Z"` (IST midnight UTC preserved) | `"2026-03-15T03:00:00.000Z"` (BRT midnight UTC) | **FAIL** |

## Outcome

**FAIL** — GFV shifts by 8.5h on cross-TZ reload (IST→BRT). Bug #1+#4: timezone info stripped on save → local-time string reinterpreted as BRT midnight instead of IST midnight.

## Findings

- Raw string `"2026-03-15T00:00:00"` survives the DB round-trip intact — the DB stores exactly what was saved
- GFV in IST returned `"2026-03-14T18:30:00.000Z"` (correct real UTC for IST midnight); GFV in BRT returned `"2026-03-15T03:00:00.000Z"` (BRT midnight UTC) — 8.5h forward shift
- This is the **mirror image** of 3-C-BRT-IST (which shifted 8.5h in the opposite direction)
- Root cause: `getSaveValue()` strips timezone → stores local time without offset marker → on reload, `new Date("2026-03-15T00:00:00")` in BRT creates BRT midnight (not IST midnight)
- The display shows "03/15/2026 12:00 AM" in both TZs (same string → same display) but the UTC meaning is different
- Impact: SQL queries comparing Config C values across users in different TZs will find inconsistent UTC representations for the "same" logical midnight
