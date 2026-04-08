# TC-11-save-IST-load-BRT — Run 1 | 2026-04-08 | BRT | PASS

**Spec**: [tc-11-save-IST-load-BRT.md](../test-cases/tc-11-save-IST-load-BRT.md) | **Summary**: [summary](../summaries/tc-11-save-IST-load-BRT.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-08                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer                           |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                             | Result                   |
| ------------ | ----------------------------------- | ------------------------ |
| TZ           | `new Date().toString()`             | Contains GMT-0300 ✓      |
| V1/V2        | useUpdatedCalendarValueLogic        | `false` → V1 active ✓    |
| Field lookup | Config A + D filter                 | `["Field7", "Field5"]` ✓ |
| Record       | DateTest-000084 Rev 1 (cat3-AD-IST) | Loaded successfully ✓    |

## Step Results

| Step # | Config | Field  | Expected                | Actual                       | Match    |
| ------ | ------ | ------ | ----------------------- | ---------------------------- | -------- |
| 3      | A      | Field7 | `"2026-03-15"`          | `"2026-03-14"`               | **FAIL** |
| 4      | A      | Field7 | `"2026-03-15"`          | `"2026-03-14"`               | **FAIL** |
| 5      | D      | Field5 | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"`      | PASS     |
| 6      | D      | Field5 | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` | **FAIL** |

## Outcome

**PASS** for load integrity — cross-TZ load from IST to BRT does NOT introduce new corruption. Config A raw `"2026-03-14"` was already corrupted when saved from IST (FORM-BUG-7 at input time). Config D raw `"2026-03-15T00:00:00"` preserved; GFV adds fake Z suffix (FORM-BUG-5).

## Findings

- Cross-TZ load does NOT introduce corruption — the load path is innocent
- Config A `"2026-03-14"` is pre-existing damage from IST save time (FORM-BUG-7 shifted Mar 15 → Mar 14 at input)
- Config D raw value preserved across timezone change; FORM-BUG-5 fake Z on GFV is a read-time issue, not load-time
- Confirms the pattern: corruption happens at INPUT time (SFV, typed input, popup), not at load time
- Config D ignoreTimezone=true DateTime storage is TZ-invariant — `"2026-03-15T00:00:00"` survives any TZ transition
