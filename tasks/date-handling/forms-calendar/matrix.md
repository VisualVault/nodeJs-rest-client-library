# Forms Calendar — Test Matrix

Authoritative permutation tracker for the forms calendar date-handling investigation.
Full test evidence → `results.md` | Bug analysis → `analysis.md`

Last updated: 2026-04-01 | Total slots: ~242 | Done: ~82 | Blocked: 0

---

## ID Convention

Category test IDs (`1-A-BRT`, `7-D-isoNoZ`) identify **planned test slots** — a Config × TZ × input combination that may or may not have been run. They map to rows in this file.

Execution test IDs (`1.1`, `2.3`) identify **session run blocks** in `results.md`. One execution block may cover multiple category IDs.

---

## Field Configurations

All tests target one of 8 field configurations defined by three boolean flags:

| Config | enableTime | ignoreTZ | useLegacy | Test Field  | Access      |
| :----: | :--------: | :------: | :-------: | ----------- | ----------- |
|   A    |   false    |  false   |   false   | DataField7  | ✓ Available |
|   B    |   false    |   true   |   false   | DataField10 | ✓ Available |
|   C    |    true    |  false   |   false   | DataField6  | ✓ Available |
|   D    |    true    |   true   |   false   | DataField5  | ✓ Available |
|   E    |   false    |  false   |   true    | DataField12 | ✓ Available |
|   F    |   false    |   true   |   true    | DataField11 | ✓ Available |
|   G    |    true    |  false   |   true    | DataField14 | ✓ Available |
|   H    |    true    |   true   |   true    | DataField13 | ✓ Available |

**Config D** (`enableTime=true`, `ignoreTZ=true`) is the primary bug surface — active for Bug #5 and Bug #6.
**Configs A/B** (`enableTime=false`) are the Bug #7 surface — only visible in UTC+ timezones.

---

## Coverage Summary

`PASS` = ran, no bug triggered. `FAIL` = ran, bug confirmed. `PENDING` = not yet run, no blocker. `BLOCKED` = requires access/setup not currently available. `PARTIAL` = ran, partial result only (noted in Actual). `SKIP` = intentionally excluded with known reason.

| Category                  |  Total  |  PASS  |  FAIL  | PENDING | BLOCKED | PARTIAL | SKIP  |
| ------------------------- | :-----: | :----: | :----: | :-----: | :-----: | :-----: | :---: |
| 1. Calendar Popup         |   20    |   7    |   13   |    0    |    0    |    0    |   0   |
| 2. Typed Input            |   16    |   11   |   5    |    0    |    0    |    0    |   0   |
| 3. Server Reload          |   18    |   9    |   3    |    6    |    0    |    0    |   0   |
| 4. URL Parameters         |    5    |   0    |   0    |    5    |    0    |    0    |   0   |
| 5. Preset Date            |   18    |   1    |   2    |   15    |    0    |    0    |   0   |
| 6. Current Date           |   15    |   2    |   1    |   12    |    0    |    0    |   0   |
| 7. SetFieldValue formats  |   39    |   10   |   5    |   24    |    0    |    0    |   0   |
| 8. GetFieldValue return   |   19    |   6    |   5    |    8    |    0    |    0    |   0   |
| 8B. GetDateObject return  |   12    |   3    |   0    |    9    |    0    |    0    |   0   |
| 9. Round-Trip (GFV)       |   20    |   6    |   5    |    9    |    0    |    0    |   0   |
| 9-GDOC. Round-Trip (GDOC) |    5    |   2    |   0    |    3    |    0    |    0    |   0   |
| 10. Web Service           |   11    |   0    |   0    |   11    |    0    |    0    |   0   |
| 11. Cross-Timezone        |   14    |   0    |   0    |   13    |    0    |    1    |   0   |
| 12. Edge Cases            |   20    |   5    |   5    |    9    |    0    |    0    |   1   |
| 13. Database              |   10    |   2    |   0    |    8    |    0    |    0    |   0   |
| **TOTAL**                 | **242** | **58** | **42** | **141** |  **0**  |  **1**  | **1** |

---

### Group: User Input

## 1 — Calendar Popup

Select a date via popup calendar. For DateTime fields, select time then click Set.
**Bugs exercised**: Bug #7 (IST, date-only configs A/B/E/F), Bug #5 (IST/BRT, DateTime configs C/D), Bug #2 (legacy — popup vs typed asymmetry)

| Test ID  | Config |  TZ   | Date Selected   | Expected                                                                                                                                                       | Actual                                | Status | Run Date   | Evidence                            |
| -------- | :----: | :---: | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------ | ---------- | ----------------------------------- |
| 1-A-BRT  |   A    |  BRT  | Mar 15          | `"2026-03-15"`                                                                                                                                                 | `"2026-03-15"`                        | PASS   | 2026-03-31 | [summary](summaries/tc-1-A-BRT.md)  |
| 1-B-BRT  |   B    |  BRT  | Mar 15          | `"2026-03-15"`                                                                                                                                                 | `"2026-03-15"`                        | PASS   | 2026-04-01 | [summary](summaries/tc-1-B-BRT.md)  |
| 1-C-BRT  |   C    |  BRT  | Mar 15 12:00 AM | `"2026-03-15T00:00:00"`                                                                                                                                        | `"2026-03-15T00:00:00"`               | PASS   | 2026-03-27 | [summary](summaries/tc-1-C-BRT.md)  |
| 1-D-BRT  |   D    |  BRT  | Mar 15 12:00 AM | `"2026-03-15T00:00:00"`                                                                                                                                        | `"2026-03-15T00:00:00"` (GFV: fake Z) | FAIL   | 2026-03-27 | [summary](summaries/tc-1-D-BRT.md)  |
| 1-A-IST  |   A    |  IST  | Mar 15          | `"2026-03-14"` (string path → -1 day; -2 day prediction was wrong)                                                                                             | `"2026-03-14"`                        | FAIL   | 2026-03-30 | [summary](summaries/tc-1-A-IST.md)  |
| 1-B-IST  |   B    |  IST  | Mar 15          | `"2026-03-14"` (same as A-IST — ignoreTZ no effect on date-only; -1 day)                                                                                       | `"2026-03-14"`                        | FAIL   | 2026-03-30 | [summary](summaries/tc-1-B-IST.md)  |
| 1-C-IST  |   C    |  IST  | Mar 15 12:00 AM | `"2026-03-15T00:00:00"` (local midnight stored — same as BRT; prediction corrected 2026-03-30)                                                                 | `"2026-03-15T00:00:00"`               | PASS   | 2026-03-30 | [summary](summaries/tc-1-C-IST.md)  |
| 1-D-IST  |   D    |  IST  | Mar 15 12:00 AM | `"2026-03-15T00:00:00"` (local midnight stored — same as C; GFV adds fake Z → Bug #5; prediction corrected 2026-03-30)                                         | `"2026-03-15T00:00:00"`               | FAIL   | 2026-03-30 | [summary](summaries/tc-1-D-IST.md)  |
| 1-A-UTC0 |   A    | UTC+0 | Mar 15          | `"2026-03-15"` (UTC+0 midnight = UTC midnight; no shift — control)                                                                                             | `"2026-03-15"`                        | PASS   | 2026-03-30 | [summary](summaries/tc-1-A-UTC0.md) |
| 1-D-UTC0 |   D    | UTC+0 | Mar 15 12:00 AM | `"2026-03-15T00:00:00"` (fake Z coincidentally correct; round-trip stable)                                                                                     | `"2026-03-15T00:00:00"`               | PASS   | 2026-03-31 | [summary](summaries/tc-1-D-UTC0.md) |
| 1-E-BRT  |   E    |  BRT  | Mar 15          | `"2026-03-15T03:00:00.000Z"` (legacy popup stores UTC datetime, not date-only; prediction corrected 2026-03-31)                                                | `"2026-03-15T03:00:00.000Z"`          | FAIL   | 2026-03-31 | [summary](summaries/tc-1-E-BRT.md)  |
| 1-F-BRT  |   F    |  BRT  | Mar 15          | `"2026-03-15T03:00:00.000Z"` (predict same as E-BRT — legacy path format; ignoreTZ no effect; corrected 2026-03-31)                                            | `"2026-03-15T03:00:00.000Z"`          | FAIL   | 2026-03-31 | [summary](summaries/tc-1-F-BRT.md)  |
| 1-G-BRT  |   G    |  BRT  | Mar 15 12:00 AM | `"2026-03-15T03:00:00.000Z"` (legacy DateTime popup closes without Time tab; raw UTC BRT midnight stored; prediction corrected 2026-03-31)                     | `"2026-03-15T03:00:00.000Z"`          | FAIL   | 2026-03-31 | [summary](summaries/tc-1-G-BRT.md)  |
| 1-H-BRT  |   H    |  BRT  | Mar 15 12:00 AM | `"2026-03-15T03:00:00.000Z"` (legacy popup stores UTC datetime; ignoreTZ no effect; popup closes without Time tab; prediction corrected 2026-03-31)            | `"2026-03-15T03:00:00.000Z"`          | FAIL   | 2026-03-31 | [summary](summaries/tc-1-H-BRT.md)  |
| 1-E-IST  |   E    |  IST  | Mar 15          | `"2026-03-14T18:30:00.000Z"` (legacy popup stores UTC datetime; IST midnight = prev-day UTC; prediction corrected 2026-03-31)                                  | `"2026-03-14T18:30:00.000Z"`          | FAIL   | 2026-03-31 | [summary](summaries/tc-1-E-IST.md)  |
| 1-F-IST  |   F    |  IST  | Mar 15          | `"2026-03-14T18:30:00.000Z"` (same as E-IST — legacy popup UTC datetime; ignoreTZ no effect; prediction corrected 2026-03-31)                                  | `"2026-03-14T18:30:00.000Z"`          | PASS   | 2026-03-31 | [summary](summaries/tc-1-F-IST.md)  |
| 1-G-IST  |   G    |  IST  | Mar 15 12:00 AM | `"2026-03-14T18:30:00.000Z"` (legacy DateTime popup; IST midnight as UTC; popup closes without Time tab; prediction corrected 2026-03-31)                      | `"2026-03-14T18:30:00.000Z"`          | FAIL   | 2026-03-31 | [summary](summaries/tc-1-G-IST.md)  |
| 1-H-IST  |   H    |  IST  | Mar 15 12:00 AM | `"2026-03-14T18:30:00.000Z"` (same as G-IST — ignoreTZ no-op on legacy popup; GFV: no fake Z — useLegacy=true; prediction corrected 2026-03-31)                | `"2026-03-14T18:30:00.000Z"`          | FAIL   | 2026-03-31 | [summary](summaries/tc-1-H-IST.md)  |
| 1-E-UTC0 |   E    | UTC+0 | Mar 15          | `"2026-03-15T00:00:00.000Z"` (legacy popup stores UTC datetime; UTC+0 midnight = UTC midnight; date correct but format wrong; prediction corrected 2026-03-31) | `"2026-03-15T00:00:00.000Z"`          | FAIL   | 2026-03-31 | [summary](summaries/tc-1-E-UTC0.md) |
| 1-F-UTC0 |   F    | UTC+0 | Mar 15          | `"2026-03-15T00:00:00.000Z"` (same as E-UTC0 — ignoreTZ no effect; legacy UTC datetime; prediction corrected 2026-03-31)                                       | `"2026-03-15T00:00:00.000Z"`          | FAIL   | 2026-03-31 | [summary](summaries/tc-1-F-UTC0.md) |

> **IST note (non-legacy A/B)**: Popup and typed input both store `"2026-03-14"` (-1 day, Bug #7). The predicted -2 day double-shift was wrong — live tests 1-A-IST, 1-B-IST, 2-A-IST, 2-B-IST all confirmed single -1 day shift. Bug #2 asymmetry absent for non-legacy configs in IST.
> **IST note (legacy E/F)**: Live test 1-E-IST (2026-03-31) confirmed legacy popup stores raw `toISOString()` — `"2026-03-14T18:30:00.000Z"` (IST midnight in UTC). Same format as E/F-BRT but shifted by -5:30h from UTC perspective. The old prediction `"2026-03-14"` (date-only) was wrong; legacy popup bypasses `getSaveValue()` and stores full UTC datetime. Knock-on: 1-F-IST, 1-G-IST, 1-H-IST predictions updated accordingly (see rows above).
> **C/D IST note**: For DateTime configs, popup creates a Date at IST midnight (= 2026-03-14T18:30:00Z). `getSaveValue()` stores local-time string without Z → `"2026-03-14T18:30:00"`. On reload in IST this re-parses as local → shows 18:30 IST (not midnight). Config D adds fake Z on GFV making round-trips drift +5:30h each pass.
> **UTC+0 note**: UTC+0 midnight = UTC midnight. Bug #7 shift is zero (correct day stored). Config D fake Z coincidentally correct → zero round-trip drift. These are control tests confirming the UTC+0 boundary.

---

## 2 — Typed Input

Type a date directly in the input field (segment-by-segment keyboard entry).
**Bugs exercised**: Bug #7 (IST, date-only configs A/B), Bug #5 (IST/BRT, DateTime configs C/D), Bug #2 (legacy)

| Test ID | Config | TZ  | Date Typed          | Expected                                                                                                      | Actual                                  | Status | Run Date   | Evidence                           |
| ------- | :----: | :-: | ------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------ | ---------- | ---------------------------------- |
| 2-A-BRT |   A    | BRT | 03/15/2026          | `"2026-03-15"`                                                                                                | `"2026-03-15"` · matches popup          | PASS   | 2026-04-01 | [summary](summaries/tc-2-A-BRT.md) |
| 2-B-BRT |   B    | BRT | 03/15/2026          | `"2026-03-15"`                                                                                                | `"2026-03-15"` · matches popup          | PASS   | 2026-03-27 | [summary](summaries/tc-2-B-BRT.md) |
| 2-C-BRT |   C    | BRT | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"`                                                                                       | `"2026-03-15T00:00:00"` · matches popup | PASS   | 2026-03-27 | [summary](summaries/tc-2-C-BRT.md) |
| 2-D-BRT |   D    | BRT | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"`                                                                                       | `"2026-03-15T00:00:00"` · matches popup | PASS   | 2026-03-27 | [summary](summaries/tc-2-D-BRT.md) |
| 2-A-IST |   A    | IST | 03/15/2026          | `"2026-03-14"` (-1 day — string path, same as popup; Bug #2 absent)                                           | `"2026-03-14"`                          | FAIL   | 2026-03-31 | [summary](summaries/tc-2-A-IST.md) |
| 2-B-IST |   B    | IST | 03/15/2026          | `"2026-03-14"` (same as A-IST — ignoreTZ no effect on date-only)                                              | `"2026-03-14"`                          | FAIL   | 2026-03-31 | [summary](summaries/tc-2-B-IST.md) |
| 2-C-IST |   C    | IST | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"` (local midnight stored — same as BRT/popup; prediction corrected 2026-03-31)          | `"2026-03-15T00:00:00"`                 | PASS   | 2026-03-31 | [summary](summaries/tc-2-C-IST.md) |
| 2-D-IST |   D    | IST | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"` (same storage as C-IST; GFV adds fake Z → Bug #5; prediction corrected 2026-03-31)    | `"2026-03-15T00:00:00"` (GFV: fake Z)   | FAIL   | 2026-03-31 | [summary](summaries/tc-2-D-IST.md) |
| 2-E-BRT |   E    | BRT | 03/15/2026          | `"2026-03-15"` (legacy typed path stores date-only; differs from popup — Bug #2 confirmed)                    | `"2026-03-15"`                          | PASS   | 2026-03-31 | [summary](summaries/tc-2-E-BRT.md) |
| 2-F-BRT |   F    | BRT | 03/15/2026          | `"2026-03-15"` (same as E-BRT — ignoreTZ no effect on date-only)                                              | `"2026-03-15"`                          | PASS   | 2026-03-31 | [summary](summaries/tc-2-F-BRT.md) |
| 2-G-BRT |   G    | BRT | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"` (legacy DateTime typed; getSaveValue formats local; Bug #2 confirmed vs popup)        | `"2026-03-15T00:00:00"`                 | PASS   | 2026-03-31 | [summary](summaries/tc-2-G-BRT.md) |
| 2-H-BRT |   H    | BRT | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"` (legacy DateTime + ignoreTZ; GFV: no fake Z)                                          | `"2026-03-15T00:00:00"`                 | PASS   | 2026-03-31 | [summary](summaries/tc-2-H-BRT.md) |
| 2-E-IST |   E    | IST | 03/15/2026          | `"2026-03-14"` (Bug #7 -1 day — same path as A/B-IST; confirms Bug #7 in legacy typed)                        | `"2026-03-14"`                          | FAIL   | 2026-03-31 | [summary](summaries/tc-2-E-IST.md) |
| 2-F-IST |   F    | IST | 03/15/2026          | `"2026-03-14"` (same as E-IST — ignoreTZ no effect on date-only)                                              | `"2026-03-14"`                          | FAIL   | 2026-03-31 | [summary](summaries/tc-2-F-IST.md) |
| 2-G-IST |   G    | IST | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"` (local midnight stored — getSaveValue formats local; prediction corrected 2026-03-31) | `"2026-03-15T00:00:00"`                 | PASS   | 2026-03-31 | [summary](summaries/tc-2-G-IST.md) |
| 2-H-IST |   H    | IST | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"` (same as G-IST; GFV: no fake Z — useLegacy=true; prediction corrected 2026-03-31)     | `"2026-03-15T00:00:00"`                 | PASS   | 2026-04-01 | [summary](summaries/tc-2-H-IST.md) |

> **IST note (corrected 2026-03-31)**: Typed input confirmed (Test 8.1): stores `"2026-03-14"` (-1 day, Bug #7) — same result as popup (Test 5.1). Bug #2 asymmetry (popup → -2 days, typed → -1 day) not observed; both go through single-shift path in V1 with useLegacy=false.
> **C/D IST note (prediction corrected 2026-03-31)**: `"2026-03-14T18:30:00"` prediction likely wrong. Based on confirmed 1-C-IST / 1-D-IST behavior, `getSaveValue()` formats as LOCAL time → expect `"2026-03-15T00:00:00"` (same as BRT) for DateTime typed IST. Needs live confirmation.
> **G/H IST note (confirmed 2026-03-31)**: 2-G-IST live test confirms typed input stores `"2026-03-15T00:00:00"` (local midnight, no Z). Original prediction `"2026-03-14T18:30:00"` was wrong — `getSaveValue()` uses `moment().format()` which outputs local time. Bug #2 confirmed: popup (1-G-IST) stores `"2026-03-14T18:30:00.000Z"` (raw UTC), typed stores `"2026-03-15T00:00:00"` (local). H-IST prediction updated accordingly. 2-H-IST confirmed 2026-04-01 — same result as G-IST, `ignoreTZ` no-op on typed path.

---

### Group: Initial Values

## 3 — Server Reload

Save form, open saved record in a new tab. Compare displayed dates and GFV return with original.
**Bugs exercised**: structural DB mixed-TZ storage, Bug #7 (IST load of date-only fields)

| Test ID     | Config | Save TZ | Load TZ | Expected                                                                                           | Actual                                                                                                                             | Status  | Run Date   | Evidence                               |
| ----------- | :----: | :-----: | :-----: | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------- | -------------------------------------- |
| 3-A-BRT-BRT |   A    |   BRT   |   BRT   | No shift; display identical on reload                                                              | No shift; display/GFV identical on reload                                                                                          | PASS    | 2026-03-31 | [summary](summaries/tc-3-A-BRT-BRT.md) |
| 3-C-BRT-BRT |   C    |   BRT   |   BRT   | No shift; display identical on reload                                                              | No shift; display/GFV identical on reload                                                                                          | PASS    | 2026-03-31 | [summary](summaries/tc-3-C-BRT-BRT.md) |
| 3-D-BRT-BRT |   D    |   BRT   |   BRT   | No shift; GFV fake Z same on reload                                                                | No shift; GFV returns same fake Z on reload                                                                                        | PASS    | 2026-03-31 | [summary](summaries/tc-3-D-BRT-BRT.md) |
| 3-D-BRT-IST |   D    |   BRT   |   IST   | Display OK; raw TZ-invariant; GFV returns raw without fake Z                                       | Display OK; raw TZ-invariant; GFV appends fake Z (Bug #5)                                                                          | PASS    | 2026-04-01 | [summary](summaries/tc-3-D-BRT-IST.md) |
| 3-A-BRT-IST |   A    |   BRT   |   IST   | No shift; date-only string survives cross-TZ reload (prediction corrected 2026-04-01)              | No shift; display/GFV identical on reload                                                                                          | PASS    | 2026-04-01 | [summary](summaries/tc-3-A-BRT-IST.md) |
| 3-C-BRT-IST |   C    |   BRT   |   IST   | Display 8:30 AM (BRT midnight in IST); GFV `T03:00:00Z` (prediction corrected 2026-04-01)          | Display 12:00 AM; GFV `"2026-03-14T18:30:00.000Z"` (8.5h shift, Bug #1+#4)                                                         | FAIL    | 2026-04-01 | [summary](summaries/tc-3-C-BRT-IST.md) |
| 3-D-IST-BRT |   D    |   IST   |   BRT   | Display OK; GFV same fake Z (TZ-invariant)                                                         | Display OK; raw TZ-invariant; GFV appends fake Z (Bug #5)                                                                          | PASS    | 2026-04-01 | [summary](summaries/tc-3-D-IST-BRT.md) |
| 3-B-BRT-BRT |   B    |   BRT   |   BRT   | No shift — same as A-BRT-BRT (ignoreTZ no effect on date-only)                                     | raw: `"2026-03-15"`, api: `"2026-03-15"`                                                                                           | PASS    | 2026-04-01 | [summary](summaries/tc-3-B-BRT-BRT.md) |
| 3-B-BRT-IST |   B    |   BRT   |   IST   | No shift — same as A-BRT-IST (prediction corrected 2026-04-01)                                     | raw: `"2026-03-15"`, api: `"2026-03-15"`                                                                                           | PASS    | 2026-04-01 | [summary](summaries/tc-3-B-BRT-IST.md) |
| 3-A-IST-BRT |   A    |   IST   |   BRT   | Wrong day permanently stored (Bug #7 baked in during IST save)                                     | raw: `"2026-03-14"`, api: `"2026-03-14"`                                                                                           | FAIL    | 2026-04-01 | [summary](summaries/tc-3-A-IST-BRT.md) |
| 3-C-IST-BRT |   C    |   IST   |   BRT   | Stored IST-offset UTC-equiv; BRT reload shows different time                                       | raw: `"2026-03-15T00:00:00"` (survives); GFV: `"2026-03-15T03:00:00.000Z"` (BRT midnight, not IST midnight — Bug #1+#4 8.5h shift) | FAIL    | 2026-04-01 | [summary](summaries/tc-3-C-IST-BRT.md) |
| 3-B-IST-BRT |   B    |   IST   |   BRT   | Same as A-IST-BRT (ignoreTZ no effect on date-only)                                                | —                                                                                                                                  | PENDING | —          | —                                      |
| 3-E-BRT-BRT |   E    |   BRT   |   BRT   | No shift — same as A-BRT-BRT (legacy date-only, same reload path)                                  | —                                                                                                                                  | PENDING | —          | —                                      |
| 3-F-BRT-BRT |   F    |   BRT   |   BRT   | No shift — same as E-BRT-BRT (ignoreTZ no effect on date-only)                                     | —                                                                                                                                  | PENDING | —          | —                                      |
| 3-G-BRT-BRT |   G    |   BRT   |   BRT   | No shift; display identical — predict same as C-BRT-BRT (legacy DateTime)                          | `"2026-03-15T00:00:00"` raw + GFV unchanged                                                                                        | PASS    | 2026-04-01 | [summary](summaries/tc-3-G-BRT-BRT.md) |
| 3-H-BRT-BRT |   H    |   BRT   |   BRT   | No shift; GFV returns stored value without fake Z (useLegacy=true)                                 | —                                                                                                                                  | PENDING | —          | —                                      |
| 3-E-BRT-IST |   E    |   BRT   |   IST   | No shift — same as A-BRT-IST; date-only survives cross-TZ reload (prediction corrected 2026-04-01) | —                                                                                                                                  | PENDING | —          | —                                      |
| 3-H-BRT-IST |   H    |   BRT   |   IST   | Display OK; no fake Z drift (useLegacy=true); compare with 3-D-BRT-IST                             | —                                                                                                                                  | PENDING | —          | —                                      |

> **Structural partial**: Tests 3-D-BRT-BRT and 3-A-BRT-BRT show correct display but DB stores UTC for initial-value fields and local time for user-input fields — same logical date has different stored representations. Not a discrete visible failure, but affects SQL range queries.

---

## 4 — URL Parameters

Open form with date pre-filled via URL query string.
**Bugs exercised**: Bug #1 (`parseDateString` strips Z on load)
**Blocker**: Requires fields with `enableQListener=true` — not present in current test form.

| Test ID          | Config | TZ  | URL Value                         | Expected                                     | Actual | Status  | Run Date | Evidence |
| ---------------- | :----: | :-: | --------------------------------- | -------------------------------------------- | ------ | ------- | -------- | -------- |
| 4-D-Z            |   D    | BRT | `?field=2026-03-15T00:00:00.000Z` | `parseDateString` strips Z → stored as local | —      | PENDING | —        | —        |
| 4-D-noZ          |   D    | BRT | `?field=2026-03-15T00:00:00`      | treated as local                             | —      | PENDING | —        | —        |
| 4-C-Z            |   C    | BRT | `?field=2026-03-15T00:00:00.000Z` | `parseDateString` strips Z                   | —      | PENDING | —        | —        |
| 4-A-dateonly     |   A    | BRT | `?field=2026-03-15`               | should show March 15                         | —      | PENDING | —        | —        |
| 4-D-midnight-IST |   D    | IST | `?field=2026-03-15T00:00:00.000Z` | may shift to Mar 15 05:30 on load            | —      | PENDING | —        | —        |

---

## 5 — Preset Date Default

Form template with a specific preset date configured in field settings.
**Bugs exercised**: Bug #7 (IST, date-only preset — configs A/B/E/F), potential Bug #3 (V2 `initCalendarValueV2` hardcodes `enableTime`)

| Test ID  | Config | Preset   |  TZ   | Expected                                                                                                              | Actual                                                                                                                                           | Status  | Run Date   | Evidence                           |
| -------- | :----: | -------- | :---: | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ---------- | ---------------------------------- |
| 5-A-BRT  |   A    | 3/1/2026 |  BRT  | `"2026-03-01"` / Date obj                                                                                             | Display correct; raw = UTC Date object (DataField2)                                                                                              | PASS    | —          | results.md                         |
| 5-B-BRT  |   B    | 3/1/2026 |  BRT  | `"2026-03-01"` (ignoreTZ no effect on date-only preset)                                                               | —                                                                                                                                                | PENDING | —          | —                                  |
| 5-C-BRT  |   C    | 3/1/2026 |  BRT  | TBD — DateTime preset load path (DataField15)                                                                         | —                                                                                                                                                | PENDING | —          | —                                  |
| 5-D-BRT  |   D    | 3/1/2026 |  BRT  | TBD — DateTime + ignoreTZ preset; GFV will add fake Z on first read (DataField16)                                     | —                                                                                                                                                | PENDING | —          | —                                  |
| 5-A-IST  |   A    | 3/1/2026 |  IST  | Date obj (UTC: `"2026-02-28"`), display: `03/01/2026`, save→ `"2026-02-28"` (Bug #7 on init path)                     | Date obj (UTC: `"2026-02-28T18:30:00.000Z"`), display: `03/01/2026` (correct local), save→ `"2026-02-28"` (Bug #7)                               | FAIL    | 2026-04-01 | [summary](summaries/tc-5-A-IST.md) |
| 5-B-IST  |   B    | 3/1/2026 |  IST  | `"2026-02-28"` (ignoreTZ=true does not protect preset — same Bug #7 path as A)                                        | —                                                                                                                                                | PENDING | —          | —                                  |
| 5-C-IST  |   C    | 3/1/2026 |  IST  | TBD — DateTime preset in IST; Config C stores real UTC → expect IST-offset stored value (DataField15)                 | —                                                                                                                                                | PENDING | —          | —                                  |
| 5-D-IST  |   D    | 3/1/2026 |  IST  | TBD — DateTime + ignoreTZ preset in IST; **does Bug #5 fire at form load?** GFV adds fake Z immediately (DataField16) | Raw: Date `"2026-03-01T11:28:54.627Z"` (correct IST date); GFV: `"2026-03-01T16:58:54.627Z"` (**fake Z, +5:30h**, Bug #5 confirmed at form load) | FAIL    | 2026-04-01 | [summary](summaries/tc-5-D-IST.md) |
| 5-A-UTC0 |   A    | 3/1/2026 | UTC+0 | `"2026-03-01"` (UTC+0 midnight = UTC midnight; no shift — Bug #7 boundary control)                                    | —                                                                                                                                                | PENDING | —          | —                                  |
| 5-C-UTC0 |   C    | 3/1/2026 | UTC+0 | TBD — DateTime preset at UTC+0; control for C-IST                                                                     | —                                                                                                                                                | PENDING | —          | —                                  |
| 5-D-UTC0 |   D    | 3/1/2026 | UTC+0 | TBD — Config D preset at UTC+0; fake Z coincidentally correct → stable on round-trip                                  | —                                                                                                                                                | PENDING | —          | —                                  |
| 5-A-PST  |   A    | 3/1/2026 |  PST  | `"2026-03-01"` (UTC-8 midnight = UTC+8h; same UTC day → correct; confirms Bug #7 UTC- unaffected)                     | —                                                                                                                                                | PENDING | —          | —                                  |
| 5-E-BRT  |   E    | 3/1/2026 |  BRT  | `"2026-03-01"` (legacy date-only; same path as A-BRT → correct)                                                       | —                                                                                                                                                | PENDING | —          | —                                  |
| 5-F-BRT  |   F    | 3/1/2026 |  BRT  | `"2026-03-01"` (same as E-BRT — ignoreTZ no effect on date-only)                                                      | —                                                                                                                                                | PENDING | —          | —                                  |
| 5-G-BRT  |   G    | 3/1/2026 |  BRT  | TBD — legacy DateTime preset behavior (DataField21)                                                                   | —                                                                                                                                                | PENDING | —          | —                                  |
| 5-H-BRT  |   H    | 3/1/2026 |  BRT  | TBD — legacy DateTime + ignoreTZ preset; GFV: **no fake Z** (useLegacy=true) (DataField22)                            | —                                                                                                                                                | PENDING | —          | —                                  |
| 5-E-IST  |   E    | 3/1/2026 |  IST  | `"2026-02-28"` (Bug #7 -1 day — same path as A-IST; confirms Bug #7 in legacy preset)                                 | —                                                                                                                                                | PENDING | —          | —                                  |
| 5-F-IST  |   F    | 3/1/2026 |  IST  | `"2026-02-28"` (same as E-IST — ignoreTZ no effect on date-only)                                                      | —                                                                                                                                                | PENDING | —          | —                                  |

---

## 6 — Current Date Default

Form template with "Current Date" as the initial value.
**Bugs exercised**: baseline/control for UTC vs local storage; cross-midnight edge in UTC- timezones; Bug #5 at first load for Config D

| Test ID  | Config |  TZ   | Expected                                                                                                | Actual                                                                                                                                       | Status  | Run Date   | Evidence                           |
| -------- | :----: | :---: | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------- | ---------------------------------- |
| 6-A-BRT  |   A    |  BRT  | Date obj with current UTC time                                                                          | UTC Date obj stored; display = today's date in BRT (DataField1)                                                                              | PASS    | —          | results.md                         |
| 6-B-BRT  |   B    |  BRT  | Today's date (ignoreTZ no effect on date-only current date)                                             | —                                                                                                                                            | PENDING | —          | —                                  |
| 6-C-BRT  |   C    |  BRT  | TBD — DateTime current date load path; UTC-based storage expected (DataField17)                         | —                                                                                                                                            | PENDING | —          | —                                  |
| 6-D-BRT  |   D    |  BRT  | TBD — DateTime + ignoreTZ current date; GFV adds fake Z immediately on first read (DataField18)         | —                                                                                                                                            | PENDING | —          | —                                  |
| 6-A-IST  |   A    |  IST  | Today's date in IST (UTC midnight may be previous IST day — cross-midnight edge)                        | PASS — `"2026-04-01T17:41:16.150Z"` Date obj, IST date correct                                                                               | PASS    | 2026-04-01 | [summary](summaries/tc-6-A-IST.md) |
| 6-B-IST  |   B    |  IST  | Same as A-IST (ignoreTZ no effect on date-only)                                                         | —                                                                                                                                            | PENDING | —          | —                                  |
| 6-C-IST  |   C    |  IST  | TBD — DateTime current date in IST (DataField17)                                                        | —                                                                                                                                            | PENDING | —          | —                                  |
| 6-D-IST  |   D    |  IST  | TBD — Config D current date in IST; **Bug #5 fires at load** — fake Z immediately applied (DataField18) | Raw: Date `"2026-04-02T00:39:22.750Z"` (correct IST today); GFV: `"2026-04-02T06:09:22.750Z"` (**fake Z, +5:30h**, Bug #5 confirmed at load) | FAIL    | 2026-04-01 | [summary](summaries/tc-6-D-IST.md) |
| 6-A-UTC0 |   A    | UTC+0 | Today's date in UTC+0                                                                                   | —                                                                                                                                            | PENDING | —          | —                                  |
| 6-E-BRT  |   E    |  BRT  | Today's date (legacy date-only; same path as A-BRT)                                                     | —                                                                                                                                            | PENDING | —          | —                                  |
| 6-F-BRT  |   F    |  BRT  | Today's date (same as E-BRT — ignoreTZ no effect on date-only)                                          | —                                                                                                                                            | PENDING | —          | —                                  |
| 6-G-BRT  |   G    |  BRT  | TBD — legacy DateTime current date (DataField25)                                                        | —                                                                                                                                            | PENDING | —          | —                                  |
| 6-H-BRT  |   H    |  BRT  | TBD — legacy DateTime + ignoreTZ current date; GFV: no fake Z (useLegacy=true) (DataField26)            | —                                                                                                                                            | PENDING | —          | —                                  |
| 6-E-IST  |   E    |  IST  | Today's IST date (may differ from UTC date — same cross-midnight edge as A-IST)                         | —                                                                                                                                            | PENDING | —          | —                                  |
| 6-F-IST  |   F    |  IST  | Same as E-IST (ignoreTZ no effect on date-only)                                                         | —                                                                                                                                            | PENDING | —          | —                                  |

---

### Group: Developer API

## 7 — SetFieldValue Formats

Different input formats passed to `VV.Form.SetFieldValue()`.
**Bugs exercised**: Bug #7 (IST, date-only configs A/B), input-format sensitivity in Config C

| Test ID          | Config | TZ  | Input Value                  | Input Type    | Expected Stored                                                                             | Actual Stored                                                                                | Status  | Run Date   | Evidence                                   |
| ---------------- | :----: | :-: | ---------------------------- | ------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------- | ---------- | ------------------------------------------ |
| 7-D-dateObj      |   D    | BRT | `new Date(2026,2,15)`        | Date object   | `"2026-03-15T00:00:00"`                                                                     | `"2026-03-15T00:00:00"` (GFV: fake Z added)                                                  | PASS    | —          | [spec](test-cases/tc-7-D-dateObj.md)       |
| 7-D-isoZ         |   D    | BRT | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-14T21:00:00"` (shifted!)                                                          | `"2026-03-14T21:00:00"` (Bug #5: -3h shift confirmed)                                        | FAIL    | —          | [spec](test-cases/tc-7-D-isoZ.md)          |
| 7-D-isoNoZ       |   D    | BRT | `"2026-03-15T00:00:00"`      | ISO without Z | `"2026-03-15T00:00:00"`                                                                     | `"2026-03-15T00:00:00"` (GFV: fake Z added)                                                  | PASS    | —          | [spec](test-cases/tc-7-D-isoNoZ.md)        |
| 7-D-dateOnly     |   D    | BRT | `"2026-03-15"`               | Date string   | `"2026-03-15T00:00:00"`                                                                     | `"2026-03-15T00:00:00"` (GFV: fake Z added)                                                  | PASS    | —          | [spec](test-cases/tc-7-D-dateOnly.md)      |
| 7-D-usFormat     |   D    | BRT | `"03/15/2026"`               | US format     | `"2026-03-15T00:00:00"`                                                                     | `"2026-03-15T00:00:00"` (GFV: fake Z added)                                                  | PASS    | —          | [spec](test-cases/tc-7-D-usFormat.md)      |
| 7-D-usFormatTime |   D    | BRT | `"03/15/2026 12:00:00 AM"`   | US + time     | `"2026-03-15T00:00:00"`                                                                     | `"2026-03-15T00:00:00"` (GFV: fake Z added)                                                  | PASS    | —          | [spec](test-cases/tc-7-D-usFormatTime.md)  |
| 7-D-epoch        |   D    | BRT | `1773543600000`              | Unix ms       | `"2026-03-15T00:00:00"`                                                                     | `"2026-03-15T00:00:00"` (GFV: fake Z added)                                                  | PASS    | —          | [spec](test-cases/tc-7-D-epoch.md)         |
| 7-D-isoZ-IST     |   D    | IST | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-15T05:30:00"` (UTC→IST +5:30h)                                                    | `"2026-03-15T05:30:00"` (confirmed +5:30h shift); GFV: `"2026-03-15T05:30:00.000Z"` (fake Z) | FAIL    | 2026-04-01 | [summary](summaries/tc-7-D-isoZ-IST.md)    |
| 7-D-dateObj-IST  |   D    | IST | `new Date(2026,2,15)`        | Date object   | `"2026-03-15T00:00:00"` (local midnight stored correctly — prediction corrected 2026-04-01) | `"2026-03-15T00:00:00"` (correct); GFV: `"2026-03-15T00:00:00.000Z"` (fake Z)                | PASS    | 2026-04-01 | [summary](summaries/tc-7-D-dateObj-IST.md) |
| 7-D-isoNoZ-IST   |   D    | IST | `"2026-03-15T00:00:00"`      | ISO without Z | `"2026-03-15T00:00:00"` (local treated as IST; GFV fake Z → +5:30h/trip)                    | `"2026-03-15T00:00:00"` (correct); GFV: `"2026-03-15T00:00:00.000Z"` (fake Z)                | PASS    | 2026-04-01 | [summary](summaries/tc-7-D-isoNoZ-IST.md)  |
| 7-C-isoZ         |   C    | BRT | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-14T21:00:00"` (UTC→local)                                                         | `"2026-03-14T21:00:00"` (day crosses in DB; GFV: correct UTC)                                | FAIL    | —          | [spec](test-cases/tc-7-C-isoZ.md)          |
| 7-C-isoNoZ       |   C    | BRT | `"2026-03-15T00:00:00"`      | ISO without Z | `"2026-03-15T00:00:00"`                                                                     | `"2026-03-15T00:00:00"` (GFV: real UTC)                                                      | PASS    | —          | [spec](test-cases/tc-7-C-isoNoZ.md)        |
| 7-C-dateOnly     |   C    | BRT | `"2026-03-15"`               | Date string   | `"2026-03-15T00:00:00"` (midnight appended; GFV real UTC)                                   | —                                                                                            | PENDING | —          | —                                          |
| 7-C-dateObj      |   C    | BRT | `new Date(2026,2,15)`        | Date object   | `"2026-03-15T00:00:00"` (BRT midnight stored as local time)                                 | —                                                                                            | PENDING | —          | —                                          |
| 7-C-usFormat     |   C    | BRT | `"03/15/2026"`               | US format     | `"2026-03-15T00:00:00"`                                                                     | —                                                                                            | PENDING | —          | —                                          |
| 7-C-usFormatTime |   C    | BRT | `"03/15/2026 12:00:00 AM"`   | US + time     | `"2026-03-15T00:00:00"`                                                                     | —                                                                                            | PENDING | —          | —                                          |
| 7-C-epoch        |   C    | BRT | `1773543600000`              | Unix ms       | `"2026-03-15T00:00:00"` (BRT midnight in ms)                                                | —                                                                                            | PENDING | —          | —                                          |
| 7-A-dateOnly     |   A    | BRT | `"2026-03-15"`               | Date string   | `"2026-03-15"`                                                                              | `"2026-03-15"`                                                                               | PASS    | —          | [spec](test-cases/tc-7-A-dateOnly.md)      |
| 7-A-isoZ         |   A    | BRT | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-15"` (date extracted)                                                             | `"2026-03-15"` (time/Z stripped)                                                             | PASS    | —          | [spec](test-cases/tc-7-A-isoZ.md)          |
| 7-A-dateObj-BRT  |   A    | BRT | `new Date(2026,2,15)`        | Date object   | `"2026-03-15"` (BRT baseline)                                                               | —                                                                                            | PENDING | —          | —                                          |
| 7-A-isoNoZ       |   A    | BRT | `"2026-03-15T00:00:00"`      | ISO without Z | `"2026-03-15"` (time component stripped)                                                    | —                                                                                            | PENDING | —          | —                                          |
| 7-A-usFormat     |   A    | BRT | `"03/15/2026"`               | US format     | `"2026-03-15"`                                                                              | —                                                                                            | PENDING | —          | —                                          |
| 7-A-usFormatTime |   A    | BRT | `"03/15/2026 12:00:00 AM"`   | US + time     | `"2026-03-15"` (time stripped for date-only config)                                         | —                                                                                            | PENDING | —          | —                                          |
| 7-A-epoch        |   A    | BRT | `1773543600000`              | Unix ms       | `"2026-03-15"`                                                                              | —                                                                                            | PENDING | —          | —                                          |
| 7-A-dateOnly-IST |   A    | IST | `"2026-03-15"`               | Date string   | `"2026-03-14"` (Bug #7: -1 day)                                                             | `"2026-03-14"` (Bug #7: -1 day confirmed)                                                    | FAIL    | —          | [spec](test-cases/tc-7-A-dateOnly-IST.md)  |
| 7-A-dateObj-IST  |   A    | IST | `new Date(2026,2,15)`        | Date object   | `"2026-03-13"` (Bug #7: -2 days)                                                            | `"2026-03-13"` (Bug #7: -2 days confirmed)                                                   | FAIL    | —          | [spec](test-cases/tc-7-A-dateObj-IST.md)   |
| 7-B-dateOnly-BRT |   B    | BRT | `"2026-03-15"`               | Date string   | `"2026-03-15"` (ignoreTZ=true; same behavior as A-BRT)                                      | —                                                                                            | PENDING | —          | —                                          |
| 7-B-isoZ-BRT     |   B    | BRT | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-15"` (same as A-isoZ)                                                             | —                                                                                            | PENDING | —          | —                                          |
| 7-B-dateObj-BRT  |   B    | BRT | `new Date(2026,2,15)`        | Date object   | `"2026-03-15"` (BRT baseline; same as A-dateObj-BRT)                                        | —                                                                                            | PENDING | —          | —                                          |
| 7-B-dateOnly-IST |   B    | IST | `"2026-03-15"`               | Date string   | `"2026-03-14"` (Bug #7: -1 day; same as A-dateOnly-IST)                                     | —                                                                                            | PENDING | —          | —                                          |
| 7-B-dateObj-IST  |   B    | IST | `new Date(2026,2,15)`        | Date object   | `"2026-03-13"` (Bug #7: -2 days; same as A-dateObj-IST)                                     | —                                                                                            | PENDING | —          | —                                          |
| 7-E-dateOnly-BRT |   E    | BRT | `"2026-03-15"`               | Date string   | `"2026-03-15"` (legacy date-only; same as A-dateOnly)                                       | —                                                                                            | PENDING | —          | —                                          |
| 7-E-dateOnly-IST |   E    | IST | `"2026-03-15"`               | Date string   | `"2026-03-14"` (Bug #7 -1 day — same as A-dateOnly-IST)                                     | —                                                                                            | PENDING | —          | —                                          |
| 7-F-dateOnly-IST |   F    | IST | `"2026-03-15"`               | Date string   | `"2026-03-14"` (same as E-IST — ignoreTZ no effect on date-only)                            | —                                                                                            | PENDING | —          | —                                          |
| 7-G-isoNoZ-BRT   |   G    | BRT | `"2026-03-15T00:00:00"`      | ISO without Z | `"2026-03-15T00:00:00"` (legacy DateTime; predict same as C-isoNoZ)                         | —                                                                                            | PENDING | —          | —                                          |
| 7-G-isoZ-BRT     |   G    | BRT | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-14T21:00:00"` (UTC→local BRT shift; same as C-isoZ)                               | —                                                                                            | PENDING | —          | —                                          |
| 7-H-isoNoZ-BRT   |   H    | BRT | `"2026-03-15T00:00:00"`      | ISO without Z | `"2026-03-15T00:00:00"` (legacy DateTime + ignoreTZ; GFV: **no fake Z**)                    | —                                                                                            | PENDING | —          | —                                          |
| 7-H-isoZ-BRT     |   H    | BRT | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-14T21:00:00"` (shifted same as D-isoZ; Bug #5 absent in GFV)                      | —                                                                                            | PENDING | —          | —                                          |
| 7-H-dateObj-BRT  |   H    | BRT | `new Date(2026,2,15)`        | Date object   | `"2026-03-15T00:00:00"` (local midnight; GFV: no fake Z — useLegacy=true)                   | —                                                                                            | PENDING | —          | —                                          |

---

## 8 — GetFieldValue Return

Return value for each configuration from `VV.Form.GetFieldValue()`.
**Bugs exercised**: Bug #5 (Config D fake Z), Bug #6 (empty Config D — scope for other configs unknown)

| Test ID       | Config |  TZ   | Stored Raw              | Expected Return                                                                                     | Actual Return                                                       | Status  | Run Date   | Evidence                                 |
| ------------- | :----: | :---: | ----------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------- | ---------- | ---------------------------------------- |
| 8-A           |   A    |  any  | `"2026-03-15"`          | `"2026-03-15"`                                                                                      | `"2026-03-15"`                                                      | PASS    | —          | results.md                               |
| 8-B           |   B    |  BRT  | `"2026-03-15"`          | `"2026-03-15"` (ignoreTZ=true; date-only — expected same return as A)                               | `"2026-03-15"` (raw unchanged, same as A)                           | PASS    | 2026-04-01 | [summary](summaries/tc-8-B.md)           |
| 8-C-BRT       |   C    |  BRT  | `"2026-03-15T00:00:00"` | `"2026-03-15T03:00:00.000Z"` (real UTC)                                                             | `"2026-03-15T03:00:00.000Z"` (real UTC confirmed)                   | PASS    | —          | results.md                               |
| 8-C-IST       |   C    |  IST  | `"2026-03-15T00:00:00"` | `"2026-03-14T18:30:00.000Z"` (real UTC from IST)                                                    | `"2026-03-14T18:30:00.000Z"` (real UTC confirmed)                   | PASS    | —          | results.md                               |
| 8-C-UTC0      |   C    | UTC+0 | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` (real UTC at UTC+0 = stored value)                                     | —                                                                   | PENDING | —          | —                                        |
| 8-D-BRT       |   D    |  BRT  | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` (**FAKE Z**)                                                           | `"2026-03-15T00:00:00.000Z"` (fake Z — not real UTC, Bug #5)        | FAIL    | —          | results.md                               |
| 8-D-IST       |   D    |  IST  | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` (**FAKE Z** — TZ-invariant)                                            | `"2026-03-15T00:00:00.000Z"` (same fake Z regardless of TZ, Bug #5) | FAIL    | —          | results.md                               |
| 8-D-UTC0      |   D    | UTC+0 | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` (fake Z, coincidentally correct at UTC+0)                              | —                                                                   | PENDING | —          | —                                        |
| 8-D-empty     |   D    |  any  | `""`                    | `""` (expected) / `"Invalid Date"` (**Bug #6**)                                                     | `"Invalid Date"` (truthy string — Bug #6 confirmed)                 | FAIL    | —          | results.md                               |
| 8-D-empty-IST |   D    |  IST  | `""`                    | `"Invalid Date"` (Bug #6 expected TZ-independent)                                                   | `"Invalid Date"` (Bug #6 confirmed TZ-independent)                  | FAIL    | 2026-04-01 | [summary](summaries/tc-8-D-empty-IST.md) |
| 8-A-empty     |   A    |  any  | `""`                    | `""` (expected — is Bug #6 D-only or affects all configs?)                                          | `""` (empty string, strict equality confirmed)                      | PASS    | 2026-04-01 | [summary](summaries/tc-8-A-empty.md)     |
| 8-C-empty     |   C    |  any  | `""`                    | `""` (expected — is Bug #6 D-only?)                                                                 | THROWS `RangeError: Invalid time value` (Bug #6 variant)            | FAIL    | 2026-04-01 | [summary](summaries/tc-8-C-empty.md)     |
| 8-E           |   E    |  any  | `"2026-03-15"`          | `"2026-03-15"` (legacy date-only; same as A)                                                        | —                                                                   | PENDING | —          | —                                        |
| 8-F           |   F    |  any  | `"2026-03-15"`          | `"2026-03-15"` (legacy date-only + ignoreTZ; same as E — date-only unaffected by ignoreTZ)          | —                                                                   | PENDING | —          | —                                        |
| 8-G-BRT       |   G    |  BRT  | `"2026-03-15T00:00:00"` | `"2026-03-15T03:00:00.000Z"` (real UTC — same as C-BRT; ignoreTZ=false)                             | —                                                                   | PENDING | —          | —                                        |
| 8-H-BRT       |   H    |  BRT  | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` (**no fake Z** — useLegacy=true skips fake-Z branch; key Bug #5 comparison) | `"2026-03-15T00:00:00"` (raw unchanged, no fake Z)                  | PASS    | 2026-04-01 | [summary](summaries/tc-8-H-BRT.md)       |
| 8-H-IST       |   H    |  IST  | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` (no fake Z — TZ-invariant, same as H-BRT)                                   | —                                                                   | PENDING | —          | —                                        |
| 8-H-empty     |   H    |  BRT  | `""`                    | `""` (expected) — does useLegacy=true prevent Bug #6?                                               | `""` (strict empty — **useLegacy=true prevents Bug #6**)            | PASS    | 2026-04-01 | [summary](summaries/tc-8-H-empty.md)     |
| 8-V2          |  any   |  any  | any                     | raw value unchanged (`useUpdatedCalendarValueLogic=true`)                                           | —                                                                   | PENDING | —          | —                                        |

---

## 8B — GetDateObjectFromCalendar Return

Return value from `VV.Form.GetDateObjectFromCalendar()` — returns a JS `Date` object, not a string.
**Key questions**: Does it avoid Bug #5 fake Z? What day does the Date object show in UTC+ for date-only fields? Is the `.toISOString()` output safe for round-trips?
**Bugs exercised**: Bug #7 (IST date-only — Date shows correct day but UTC representation is prev day), Bug #5 comparison (Config D — Date object may be correct where GFV is wrong)

| Test ID    | Config |  TZ   | Stored Raw              | Expected Date.toString()                           | Expected .toISOString()      | Actual                                                                    | Status  | Run Date   | Evidence                              |
| ---------- | :----: | :---: | ----------------------- | -------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------- | ------- | ---------- | ------------------------------------- |
| 8B-A-BRT   |   A    |  BRT  | `"2026-03-15"`          | `Mar 15 2026 00:00:00 GMT-0300` (BRT midnight)     | `"2026-03-15T03:00:00.000Z"` | —                                                                         | PENDING | —          | —                                     |
| 8B-A-IST   |   A    |  IST  | `"2026-03-15"`          | `Mar 15 2026 00:00:00 GMT+0530` (IST midnight)     | `"2026-03-14T18:30:00.000Z"` | —                                                                         | PENDING | —          | —                                     |
| 8B-A-UTC0  |   A    | UTC+0 | `"2026-03-15"`          | `Mar 15 2026 00:00:00 GMT+0000` (UTC midnight)     | `"2026-03-15T00:00:00.000Z"` | —                                                                         | PENDING | —          | —                                     |
| 8B-C-BRT   |   C    |  BRT  | `"2026-03-15T00:00:00"` | `Mar 15 2026 00:00:00 GMT-0300` (BRT midnight)     | `"2026-03-15T03:00:00.000Z"` | —                                                                         | PENDING | —          | —                                     |
| 8B-C-IST   |   C    |  IST  | `"2026-03-15T00:00:00"` | `Mar 15 2026 00:00:00 GMT+0530` (IST midnight)     | `"2026-03-14T18:30:00.000Z"` | —                                                                         | PENDING | —          | —                                     |
| 8B-D-BRT   |   D    |  BRT  | `"2026-03-15T00:00:00"` | `Mar 15 2026 00:00:00 GMT-0300` — no fake Z        | `"2026-03-15T03:00:00.000Z"` | `Sun Mar 15 2026 00:00:00 GMT-0300` / `"2026-03-15T03:00:00.000Z"`        | PASS    | 2026-04-01 | [summary](summaries/tc-8B-D-BRT.md)   |
| 8B-D-IST   |   D    |  IST  | `"2026-03-15T00:00:00"` | `Mar 15 2026 00:00:00 GMT+0530` — no fake Z        | `"2026-03-14T18:30:00.000Z"` | `Sun Mar 15 2026 00:00:00 GMT+0530` / `"2026-03-14T18:30:00.000Z"`        | PASS    | 2026-04-01 | [summary](summaries/tc-8B-D-IST.md)   |
| 8B-D-UTC0  |   D    | UTC+0 | `"2026-03-15T00:00:00"` | `Mar 15 2026 00:00:00 GMT+0000` — matches GFV      | `"2026-03-15T00:00:00.000Z"` | —                                                                         | PENDING | —          | —                                     |
| 8B-D-empty |   D    |  BRT  | `""`                    | `null` (expected clean null, not Invalid Date)     | N/A                          | Returns `undefined` (not `null`); no throw, no Invalid Date — falsy, safe | PASS    | 2026-04-01 | [summary](summaries/tc-8B-D-empty.md) |
| 8B-A-empty |   A    |  any  | `""`                    | `null` (expected)                                  | N/A                          | —                                                                         | PENDING | —          | —                                     |
| 8B-E-BRT   |   E    |  BRT  | `"2026-03-15"`          | `Mar 15 2026 00:00:00 GMT-0300` (legacy date-only) | `"2026-03-15T03:00:00.000Z"` | —                                                                         | PENDING | —          | —                                     |
| 8B-H-BRT   |   H    |  BRT  | `"2026-03-15T00:00:00"` | `Mar 15 2026 00:00:00 GMT-0300` (legacy DateTime)  | `"2026-03-15T03:00:00.000Z"` | —                                                                         | PENDING | —          | —                                     |

> **Why this matters**: Developers writing form scripts have three ways to read a date: `GetFieldValue()` (string, Bug #5 affected), `getValueObjectValue()` (raw string, internal), and `GetDateObjectFromCalendar()` (Date object). If a developer calls `.toISOString()` on the Date object and passes it to `SetFieldValue()`, a different drift pattern emerges than the GFV round-trip — see 9-GDOC rows below.
> **IST note for date-only (8B-A-IST)**: The Date object will show `Mar 15` (correct day in local display) but `.toISOString()` returns `"2026-03-14T18:30:00.000Z"` (previous UTC day). This is not a bug in GetDateObjectFromCalendar — it's how JS Date works. The danger is if a developer passes `.toISOString()` to `SetFieldValue()`, which would trigger Bug #7's `moment(input).toDate()` with a Z-suffixed UTC string.

---

## 9 — Round-Trip (SFV→GFV→SFV)

Call `SetFieldValue(field, GetFieldValue(field))` and measure date drift.
**Bugs exercised**: Bug #5 (Config D — each trip drifts by TZ offset)

| Test ID    | Config |  TZ   | Trips | Expected Shift                                                                      | Actual Shift                                              | Status  | Run Date   | Evidence                              |
| ---------- | :----: | :---: | :---: | ----------------------------------------------------------------------------------- | --------------------------------------------------------- | ------- | ---------- | ------------------------------------- |
| 9-D-BRT-1  |   D    |  BRT  |   1   | -3h                                                                                 | -3h → `"2026-03-14T21:00:00"` (confirmed)                 | FAIL    | 2026-03-27 | [summary](summaries/tc-9-D-BRT-1.md)  |
| 9-D-BRT-3  |   D    |  BRT  |   3   | -9h (crosses midnight, same day)                                                    | —                                                         | PENDING | —          | —                                     |
| 9-D-BRT-8  |   D    |  BRT  |   8   | -24h (full day lost)                                                                | -24h → `"2026-03-14T00:00:00"` (full day lost confirmed)  | FAIL    | 2026-03-27 | [summary](summaries/tc-9-D-BRT-8.md)  |
| 9-D-BRT-10 |   D    |  BRT  |  10   | -30h                                                                                | -30h → `"2026-03-13T18:00:00"` (confirmed)                | FAIL    | 2026-03-27 | [summary](summaries/tc-9-D-BRT-10.md) |
| 9-D-IST-1  |   D    |  IST  |   1   | +5:30h                                                                              | +5:30h → `"2026-03-15T05:30:00"` (confirmed)              | FAIL    | 2026-03-27 | [summary](summaries/tc-9-D-IST-1.md)  |
| 9-D-IST-5  |   D    |  IST  |   5   | +27:30h → day crosses                                                               | +27:30h → `"2026-03-16T03:30:00"` (day crossed confirmed) | FAIL    | 2026-03-27 | [summary](summaries/tc-9-D-IST-5.md)  |
| 9-D-IST-8  |   D    |  IST  |   8   | +44h → ~+1d20h (full day gained after ~5 trips)                                     | —                                                         | PENDING | —          | —                                     |
| 9-D-IST-10 |   D    |  IST  |  10   | +55h → +2d7h (mirror of BRT-10 but forward)                                         | —                                                         | PENDING | —          | —                                     |
| 9-D-UTC0   |   D    | UTC+0 |   1   | 0 (fake Z coincidentally correct → stable)                                          | —                                                         | PENDING | —          | —                                     |
| 9-D-PST-1  |   D    |  PST  |   1   | -8h                                                                                 | —                                                         | PENDING | —          | —                                     |
| 9-D-JST-1  |   D    |  JST  |   1   | +9h (UTC+9 — most extreme positive offset tested)                                   | —                                                         | PENDING | —          | —                                     |
| 9-C-BRT-1  |   C    |  BRT  |   1   | 0 (stable)                                                                          | 0 drift — stable (confirmed)                              | PASS    | 2026-03-27 | [summary](summaries/tc-9-C-BRT-1.md)  |
| 9-C-IST-1  |   C    |  IST  |   1   | 0 (stable)                                                                          | 0 drift — stable (confirmed)                              | PASS    | —          | results.md                            |
| 9-A-any    |   A    |  any  |   1   | 0 (stable)                                                                          | 0 drift — stable (confirmed)                              | PASS    | —          | results.md                            |
| 9-B-any    |   B    |  any  |   1   | 0 (stable)                                                                          | 0 drift — stable (confirmed)                              | PASS    | —          | results.md                            |
| 9-B-IST    |   B    |  IST  |   1   | 0 (stable — ignoreTZ=true on date-only)                                             | —                                                         | PENDING | —          | —                                     |
| 9-E-any    |   E    |  any  |   1   | 0 drift (stable — date-only legacy; same as A/B)                                    | —                                                         | PENDING | —          | —                                     |
| 9-G-BRT-1  |   G    |  BRT  |   1   | 0 drift (stable — legacy DateTime ignoreTZ=false; same as C)                        | —                                                         | PENDING | —          | —                                     |
| 9-H-BRT-1  |   H    |  BRT  |   1   | **0 drift** — useLegacy=true skips fake-Z branch; key comparison vs 9-D-BRT-1 (-3h) | `"2026-03-15T00:00:00"` unchanged, 0 drift                | PASS    | 2026-04-01 | [summary](summaries/tc-9-H-BRT-1.md)  |
| 9-H-IST-1  |   H    |  IST  |   1   | **0 drift** — no fake Z regardless of TZ; key comparison vs 9-D-IST-1 (+5:30h)      | `"2026-03-15T00:00:00"` unchanged, **0 drift** confirmed  | PASS    | 2026-04-01 | [summary](summaries/tc-9-H-IST-1.md)  |

### 9-GDOC — Round-Trip via GetDateObjectFromCalendar

`SetFieldValue(field, GetDateObjectFromCalendar(field).toISOString())` — different drift pattern than GFV round-trip because `.toISOString()` produces real UTC, not fake Z.

| Test ID        | Config | TZ  | Trips | Expected Shift                                                                                                                | Actual                                         | Status  | Run Date   | Evidence                                  |
| -------------- | :----: | :-: | :---: | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------- | ---------- | ----------------------------------------- |
| 9-GDOC-A-BRT-1 |   A    | BRT |   1   | 0 (date-only: SFV receives ISO Z string → `normalizeCalValue` → `moment("...Z").toDate()` → BRT midnight → same day)          | —                                              | PENDING | —          | —                                         |
| 9-GDOC-A-IST-1 |   A    | IST |   1   | -1 day (`.toISOString()` = `"2026-03-14T18:30:00.000Z"` → SFV parses → stores `"2026-03-14"`)                                 | —                                              | PENDING | —          | —                                         |
| 9-GDOC-D-BRT-1 |   D    | BRT |   1   | 0 drift (prediction corrected 2026-04-01: real UTC Z parsed correctly by moment → local midnight preserved)                   | `"2026-03-15T00:00:00"` unchanged              | PASS    | 2026-04-01 | [summary](summaries/tc-9-GDOC-D-BRT-1.md) |
| 9-GDOC-D-IST-1 |   D    | IST |   1   | 0 drift (prediction corrected 2026-04-01: GDOC `.toISOString()` = real UTC → SFV parses correctly → local midnight preserved) | `"2026-03-15T00:00:00"` unchanged, **0 drift** | PASS    | 2026-04-01 | [summary](summaries/tc-9-GDOC-D-IST-1.md) |
| 9-GDOC-C-BRT-1 |   C    | BRT |   1   | 0 (Config C applies real UTC conversion; `.toISOString()` matches GFV; same round-trip as 9-C-BRT-1)                          | —                                              | PENDING | —          | —                                         |

> **Why GDOC round-trips differ from GFV round-trips**: GFV for Config D returns `"...T00:00:00.000Z"` (fake Z — local time mislabeled as UTC). `GetDateObjectFromCalendar().toISOString()` returns `"...T03:00:00.000Z"` (real UTC). When fed back into SetFieldValue, the real UTC string triggers a different code path in `normalizeCalValue()` — potentially storing `T03:00:00` instead of `T00:00:00`, a -3h shift in one trip but via a different mechanism than the fake Z drift.

---

### Group: Integration

## 10 — Web Service Input

Simulate a scheduled script, form button event, or REST API call setting a date value.
**Bugs exercised**: Bug #7 (date-only, UTC+ server?), input format sensitivity in all configs
**Blocker**: Requires a Node.js test script to send values via `VVRestApi`.

| Test ID                | Config | Source           | Value                             | Expected                                 | Actual | Status  | Run Date | Evidence |
| ---------------------- | :----: | ---------------- | --------------------------------- | ---------------------------------------- | ------ | ------- | -------- | -------- |
| 10-D-ws-isoZ           |   D    | Web service JSON | `"2026-03-15T00:00:00.000Z"`      | Stored as local (shifted?)               | —      | PENDING | —        | —        |
| 10-D-ws-isoNoZ         |   D    | Web service JSON | `"2026-03-15T00:00:00"`           | Stored as-is                             | —      | PENDING | —        | —        |
| 10-D-ws-dateOnly       |   D    | Web service JSON | `"2026-03-15"`                    | Midnight appended                        | —      | PENDING | —        | —        |
| 10-D-ws-dotnet         |   D    | .NET DateTime    | `"2026-03-15T00:00:00.000+00:00"` | —                                        | —      | PENDING | —        | —        |
| 10-D-ws-epoch          |   D    | Epoch ms         | `1773784800000`                   | —                                        | —      | PENDING | —        | —        |
| 10-C-ws-isoZ           |   C    | Web service JSON | `"2026-03-15T00:00:00.000Z"`      | UTC→local (Mar 14 in BRT)                | —      | PENDING | —        | —        |
| 10-A-ws-isoZ           |   A    | Web service JSON | `"2026-03-15T00:00:00.000Z"`      | `"2026-03-15"` (date extracted)          | —      | PENDING | —        | —        |
| 10-A-ws-dateOnly       |   A    | Web service JSON | `"2026-03-15"`                    | `"2026-03-15"`                           | —      | PENDING | —        | —        |
| 10-D-ws-midnight-cross |   D    | Web service      | `"2026-03-15T02:00:00.000Z"`      | In BRT: Mar 14 23:00 (crosses midnight!) | —      | PENDING | —        | —        |
| 10-D-script-scheduled  |   D    | Scheduled script | `response.data.date`              | —                                        | —      | PENDING | —        | —        |
| 10-D-script-button     |   D    | Form button      | `VV.Form.SetFieldValue(...)`      | Same as Cat 7 — no new behavior expected | —      | PENDING | —        | —        |

---

## 11 — Cross-Timezone

**Bugs exercised**: Bug #5 (compound drift when different users edit), structural DB inconsistency

| Test ID                  | Action                                                          |    TZ 1     | TZ 2  | Expected                                                                       | Actual                                               | Status  | Run Date | Evidence              |
| ------------------------ | --------------------------------------------------------------- | :---------: | :---: | ------------------------------------------------------------------------------ | ---------------------------------------------------- | ------- | -------- | --------------------- |
| 11-save-BRT-load-IST     | Save in BRT, load in IST                                        |     BRT     |  IST  | Display OK; DB query mismatch                                                  | Display OK confirmed; DB not queried                 | PARTIAL | —        | results.md (archived) |
| 11-save-IST-load-BRT     | Save in IST, load in BRT                                        |     IST     |  BRT  | —                                                                              | —                                                    | PENDING | —        | —                     |
| 11-roundtrip-cross       | BRT save → IST load → round-trip → BRT reload                   | BRT→IST→BRT |   —   | Compound drift from mixed offsets                                              | —                                                    | PENDING | —        | —                     |
| 11-concurrent-edit       | User A (BRT) + User B (IST) edit same record                    |     BRT     |  IST  | Overwrite with different UTC moment for "same" date                            | —                                                    | PENDING | —        | —                     |
| 11-report-cross          | Query DB for dates entered from different TZs                   |    mixed    |   —   | Inconsistent SQL results                                                       | Identified theoretically (see results.md § Test 2.4) | PENDING | —        | results.md            |
| 11-load-UTC0             | BRT-saved record loaded in UTC+0                                |     BRT     | UTC+0 | No fake-Z drift (Z happens to be correct)                                      | —                                                    | PENDING | —        | —                     |
| 11-load-PST              | BRT-saved record loaded in PST (UTC-8)                          |     BRT     |  PST  | -8h/trip drift on round-trip                                                   | —                                                    | PENDING | —        | —                     |
| 11-load-Tokyo            | BRT-saved record loaded in JST (UTC+9)                          |     BRT     |  JST  | +9h/trip drift on round-trip                                                   | —                                                    | PENDING | —        | —                     |
| 11-A-save-BRT-load-IST   | Config A: save in BRT, load in IST                              |     BRT     |  IST  | Bug #7 on load: stored `"2026-03-15"` → IST displays `"2026-03-14"`            | —                                                    | PENDING | —        | —                     |
| 11-B-save-BRT-load-IST   | Config B: save in BRT, load in IST                              |     BRT     |  IST  | Same as A-BRT-IST (ignoreTZ no effect on date-only load path)                  | —                                                    | PENDING | —        | —                     |
| 11-C-save-BRT-load-IST   | Config C: save in BRT, load in IST                              |     BRT     |  IST  | Stable: Config C stores real UTC; IST reload shows correct local time          | —                                                    | PENDING | —        | —                     |
| 11-D-concurrent-IST-edit | Config D: User A (IST) edits, User B (BRT) re-edits same record |     IST     |  BRT  | Fake Z interpreted differently per TZ → compound drift between users           | —                                                    | PENDING | —        | —                     |
| 11-E-save-BRT-load-IST   | Config E (legacy date-only): save in BRT, load in IST           |     BRT     |  IST  | Bug #7 on IST load: same as A-BRT-IST (legacy code path, same midnight parse)  | —                                                    | PENDING | —        | —                     |
| 11-H-BRT-roundtrip       | Config H: save in BRT, multiple round-trips, verify no drift    |     BRT     |   —   | 0 drift — useLegacy=true; confirms legacy fixes Bug #5 for ignoreTZ+enableTime | —                                                    | PENDING | —        | —                     |

---

### Group: Verification

## 12 — Edge Cases

**Bugs exercised**: Bug #5 (drift at boundaries), Bug #6 (empty value)

| Test ID                   | Config |  TZ   | Description                   | Value                        | Expected                                                                       | Actual                                                                    | Status  | Run Date   | Evidence                                    |
| ------------------------- | :----: | :---: | ----------------------------- | ---------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ------- | ---------- | ------------------------------------------- |
| 12-near-midnight-1        |   D    |  BRT  | UTC input near midnight       | `"2026-03-15T00:30:00.000Z"` | Day crosses on input (BRT = Mar 14 21:30) + fake Z double jeopardy             | Stored `"2026-03-14T21:30:00"` (day crossed); GFV adds fake Z (confirmed) | FAIL    | —          | results.md                                  |
| 12-near-midnight-1-IST    |   D    |  IST  | UTC input near midnight, IST  | `"2026-03-15T00:30:00.000Z"` | IST = Mar 15 06:00 — no day cross on input; drift still +5:30h/trip            | —                                                                         | PENDING | —          | —                                           |
| 12-near-midnight-2        |   D    |  BRT  | Local time near midnight      | `"2026-03-15T23:00:00"`      | 23:00→20:00→17:00→... (-3h/trip)                                               | 1 trip: 23:00→20:00 (−3h confirmed)                                       | FAIL    | —          | results.md                                  |
| 12-near-midnight-2-IST    |   D    |  IST  | Local time near midnight, IST | `"2026-03-15T23:00:00"`      | 1 trip: +5:30h → `"2026-03-16T04:30:00"` — day crosses FORWARD                 | —                                                                         | PENDING | —          | —                                           |
| 12-dst-transition         |   D    |  BRT  | US DST change day             | `"2026-03-08T02:00:00"`      | -3h drift from BRT — no DST anomaly (Brazil has no DST)                        | -3h BRT drift confirmed; no DST anomaly                                   | PASS    | —          | results.md                                  |
| 12-dst-US-PST             |   D    |  PST  | US DST spring-forward         | `"2026-03-08T02:00:00"`      | PST→PDT: does 2AM→3AM skip create anomaly beyond standard -8h Bug #5 drift?    | —                                                                         | PENDING | —          | —                                           |
| 12-dst-brazil             |   D    |   —   | Brazil DST                    | —                            | Brazil no longer uses DST                                                      | —                                                                         | SKIP    | —          | —                                           |
| 12-year-boundary          |   D    |  BRT  | Jan 1 midnight                | `"2026-01-01T00:00:00"`      | 1 trip → `"2025-12-31T21:00:00"` — year boundary crossed                       | 1 trip → `"2025-12-31T21:00:00"` (year crossed confirmed)                 | FAIL    | —          | results.md                                  |
| 12-year-boundary-IST      |   D    |  IST  | Jan 1 midnight, IST           | `"2026-01-01T00:00:00"`      | 1 trip: +5:30h → `"2026-01-01T05:30:00"` — stays in 2026 (opposite of BRT)     | —                                                                         | PENDING | —          | —                                           |
| 12-leap-day               |   D    |  BRT  | Feb 29 on leap year           | `"2028-02-29T00:00:00"`      | 1 trip → `"2028-02-28T21:00:00"` — leap day lost                               | 1 trip → `"2028-02-28T21:00:00"` (leap day lost confirmed)                | FAIL    | —          | results.md                                  |
| 12-leap-day-IST           |   D    |  IST  | Feb 29 on leap year, IST      | `"2028-02-29T00:00:00"`      | 1 trip: +5:30h → `"2028-02-29T05:30:00"` — leap day NOT lost (opposite of BRT) | —                                                                         | PENDING | —          | —                                           |
| 12-empty-value            |   D    |  any  | Empty / null date             | `""` or `null`               | GFV returns truthy `"Invalid Date"` (Bug #6)                                   | `"Invalid Date"` (truthy string — Bug #6 confirmed)                       | FAIL    | —          | results.md                                  |
| 12-null-input             |   D    |  any  | Explicit null input           | `null`                       | Is `null` distinct from `""` for SFV? Expect same Bug #6 behavior.             | —                                                                         | PENDING | —          | —                                           |
| 12-empty-Config-A         |   A    |  any  | Empty Config A                | `""`                         | GFV return `""` — is Bug #6 D-only or affects A?                               | —                                                                         | PENDING | —          | —                                           |
| 12-empty-Config-C         |   C    |  any  | Empty Config C                | `""`                         | GFV return `""` — is Bug #6 D-only or affects C?                               | —                                                                         | PENDING | —          | —                                           |
| 12-utc-0-control          |   D    | UTC+0 | Round-trip at UTC+0           | `"2026-03-15T00:00:00"`      | Fake Z coincidentally correct → 0 drift per trip                               | `"2026-03-15T00:00:00"` unchanged, 0 drift                                | PASS    | 2026-04-01 | [summary](summaries/tc-12-utc-0-control.md) |
| 12-config-C-near-midnight |   C    |  BRT  | Round-trip near midnight      | `"2026-03-15T23:00:00"`      | 1 trip: stable (real UTC, no fake Z → no drift). Control for Bug #5.           | —                                                                         | PENDING | —          | —                                           |
| 12-invalid-string         |   D    |  BRT  | Invalid string                | `"not-a-date"`               | Silently ignored, field retains previous value                                 | Field unchanged; no error thrown (confirmed)                              | PASS    | —          | results.md                                  |
| 12-far-future             |   D    |  BRT  | Year 2099                     | `"2099-12-31T00:00:00"`      | Standard -3h drift, no special issue                                           | -3h drift; no special issue (confirmed)                                   | PASS    | —          | results.md                                  |
| 12-pre-epoch              |   D    |  BRT  | Year 1969                     | `"1969-12-31T00:00:00"`      | Standard -3h drift, handles negative epoch                                     | -3h drift; negative epoch handled correctly (confirmed)                   | PASS    | —          | results.md                                  |

---

## 13 — Database

Direct DB query to verify stored values. Requires SQL access to the VisualVault database.
**Bugs exercised**: structural mixed UTC/local storage

| Test ID                 | Description                                                                    | Expected                                                                                 | Actual                                    | Status  | Run Date   | Evidence                                     |
| ----------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------- | ------- | ---------- | -------------------------------------------- |
| 13-initial-values       | Initial/preset date fields store UTC (via `new Date().toISOString()`)          | UTC datetime in raw SQL                                                                  | UTC datetime confirmed in raw SQL         | PASS    | 2026-03-27 | [summary](summaries/tc-13-initial-values.md) |
| 13-user-input           | User-input fields store local time (via `getSaveValue()` strips Z)             | Local time string without Z in raw SQL                                                   | Local time without Z confirmed in raw SQL | PASS    | 2026-03-27 | [summary](summaries/tc-13-user-input.md)     |
| 13-after-roundtrip      | DB values after Bug #5 drift (save after round-trip, check raw SQL)            | `"2026-03-14T00:00:00"` after 8 BRT round-trips                                          | —                                         | PENDING | —          | —                                            |
| 13-cross-tz-save        | DB values for a record saved from IST                                          | IST local time (UTC-equiv): e.g. `"2026-03-14T18:30:00"`                                 | —                                         | PENDING | —          | —                                            |
| 13-ws-input             | DB values when date set via web service / scheduled script                     | Same as equivalent Cat 7/10 web-service input results                                    | —                                         | PENDING | —          | —                                            |
| 13-query-consistency    | SQL date range query for same logical date entered from BRT vs IST             | Query returns different row counts (inconsistent)                                        | —                                         | PENDING | —          | —                                            |
| 13-B-storage            | Raw DB value for Config B vs Config A                                          | Same storage format as Config A (ignoreTZ has no effect on date-only)                    | —                                         | PENDING | —          | —                                            |
| 13-C-vs-D-storage       | SQL comparison: Config C vs Config D storage for BRT midnight                  | Config C: `"2026-03-14T21:00:00"` (UTC-equiv); Config D: `"2026-03-15T00:00:00"` (local) | —                                         | PENDING | —          | —                                            |
| 13-multi-roundtrip-db   | Raw SQL after 8 BRT round-trips on Config D                                    | `"2026-03-14T00:00:00"` (drifted -24h from `"2026-03-15T00:00:00"`)                      | —                                         | PENDING | —          | —                                            |
| 13-preset-vs-user-input | Config A: preset field vs user-input field — same logical date, SQL comparison | Two different raw SQL values for same logical date (UTC Date obj vs local string)        | —                                         | PENDING | —          | —                                            |
