# Forms Calendar — Test Index

Quick-reference dashboard for the forms calendar date-handling investigation.
Full session evidence → `results.md` | Code analysis → `analysis.md` | Context → `../CLAUDE.md`

Last updated: 2026-03-30 | Code path: V1 (`useUpdatedCalendarValueLogic = false`) | Build: 20260304.1

---

## Confirmed Bugs

| #   | Bug                                                                      | Trigger Condition                                                  | Severity | Status                                  |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------ | -------- | --------------------------------------- |
| #5  | `GetFieldValue` appends fake `[Z]` → round-trip drift                    | `enableTime=true` + `ignoreTZ=true` + `useLegacy=false` (Config D) | **HIGH** | ✓ Confirmed live — BRT + IST            |
| #6  | Empty Config D field → `GetFieldValue` returns `"Invalid Date"` (truthy) | Config D, value set to `""` or `null`                              | **MED**  | ✓ Confirmed live — BRT                  |
| #7  | `SetFieldValue` stores wrong day for UTC+ users                          | `enableTime=false`, all date-only configs (A, B)                   | **HIGH** | ✓ Confirmed live (IST) + code           |
| #2  | Popup and typed input use inconsistent handlers                          | `useLegacy=true` (predicted)                                       | MED      | ✗ Not reproduced with `useLegacy=false` |
| #1  | `parseDateString()` strips Z from UTC strings on load                    | V1 form load path — all configs                                    | LOW      | Partial — raw never has Z suffix        |
| #4  | `getSaveValue()` strips Z before storing                                 | All configs, all user input paths                                  | LOW      | Partial — same symptom as #1            |
| #3  | `initCalendarValueV2()` ignores field `enableTime` setting               | V2 code path (not yet triggered in tests)                          | LOW      | Code-only — not live-tested             |

**Structural finding (not a numbered bug):** The database stores a mix of UTC and local times depending on code path. Initial value / preset fields → UTC (via `new Date()` → `toISOString()`). User input / popup / typed → local time (via `getSaveValue()` which strips Z). SQL date range queries will return inconsistent results when mixing field types.

### Bug #5 — Drift Rate by Timezone

| Timezone        | Offset   | Drift per round-trip | Full day lost after                   |
| --------------- | -------- | -------------------- | ------------------------------------- |
| Los Angeles PST | UTC-8    | -8h backward         | 3 trips                               |
| São Paulo BRT   | UTC-3    | -3h backward         | 8 trips                               |
| London GMT      | UTC+0    | **0h — no drift**    | Never (fake Z coincidentally correct) |
| Mumbai IST      | UTC+5:30 | +5:30h forward       | ~4.4 trips                            |
| Tokyo JST       | UTC+9    | +9h forward          | ~2.7 trips                            |

---

## Bug × Config Matrix

| Config | enableTime | ignoreTZ | useLegacy | #5 fake Z | #6 Invalid Date |  #7 wrong day   | #2 handlers |
| :----: | :--------: | :------: | :-------: | :-------: | :-------------: | :-------------: | :---------: |
|   A    |   false    |  false   |   false   |     —     |        —        | **✓ UTC+ only** |      —      |
|   B    |   false    |   true   |   false   |     —     |        —        | **✓ UTC+ only** |      —      |
|   C    |    true    |  false   |   false   |     —     |        —        |        —        |      —      |
|   D    |    true    |   true   |   false   |   **✓**   |      **✓**      |        —        |      —      |
|   E    |   false    |  false   |   true    |     —     |        —        |     unknown     |  predicted  |
|   F    |   false    |   true   |   true    |     —     |        —        |     unknown     |  predicted  |
|   G    |    true    |  false   |   true    |     —     |     unknown     |        —        |  predicted  |
|   H    |    true    |   true   |   true    |  unknown  |     unknown     |        —        |  predicted  |

`✓` = confirmed or expected by code. `—` = not applicable to this config. `unknown` = untested (no legacy access).

### Bug #7 — Shift by Input Format (IST, UTC+5:30)

| Input to SetFieldValue       | BRT stores       | IST stores       | Δ days |
| ---------------------------- | ---------------- | ---------------- | ------ |
| `"2026-03-15"`               | `"2026-03-15"` ✓ | `"2026-03-14"` ✗ | -1     |
| `"03/15/2026"`               | `"2026-03-15"` ✓ | `"2026-03-14"` ✗ | -1     |
| `"2026-03-15T00:00:00"`      | `"2026-03-15"` ✓ | `"2026-03-14"` ✗ | -1     |
| `"2026-03-15T00:00:00.000Z"` | `"2026-03-15"` ✓ | `"2026-03-14"` ✗ | -1     |
| `new Date(2026,2,15)`        | `"2026-03-15"` ✓ | `"2026-03-13"` ✗ | **-2** |

---

## Coverage Summary

`✓ Pass` = ran, no bug triggered. `✗ Fail` = ran, bug confirmed. Partial = structural issue observed but no clean bug trigger (noted inline). Pending = not yet run. Blocked = requires `useLegacy=true` access.

| Category                 |   Total   | ✓ Pass  | ✗ Fail  | Pending  | Blocked |
| ------------------------ | :-------: | :-----: | :-----: | :------: | :-----: |
| 1. Calendar Popup        |    10     |    3    |    1    |    2     |    4    |
| 2. Typed Input           |    10     |    3    |    1    |    2     |    4    |
| 3. Server Reload         |    8+     |    7    |    0    |    1+    |    —    |
| 4. URL Parameters        |    5+     |    0    |    0    |    5+    |    —    |
| 5. Preset Date           |    6+     |    1    |    0    |    1+    |    4    |
| 6. Current Date          |    6+     |    1    |    0    |    1+    |    4    |
| 7. SetFieldValue formats |    12+    |    4    |    7    |    1+    |    —    |
| 8. GetFieldValue return  |    8+     |    4    |    2    |    2+    |    —    |
| 9. Round-Trip            |    10+    |    3    |    5    |    2+    |    —    |
| 10. Web Service          |    10+    |    0    |    0    |   10+    |    —    |
| 11. Cross-Timezone       |    7+     |    1    |    1    |    4+    |    —    |
| 12. Edge Cases           |    10+    |    1    |    8    |    0     |    —    |
| 13. Database             |     6     |    2    |    0    |    4     |    —    |
| **TOTAL**                | **~108+** | **~30** | **~25** | **~19+** | **~32** |

Cat 3: 3-D-BRT-IST and 5-A-BRT are structural partial (display correct, DB mixed UTC/local — see structural finding above). Cat 12: 12-dst-brazil skipped (Brazil no longer uses DST).

---

## ID Conventions

Two namespaces are used in this investigation — never mix them:

| ID Format                       | Example              | Where it appears                                                       | What it identifies                                                        |
| ------------------------------- | -------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **X.Y** (execution test ID)     | `3.1`, `4.2`         | Failing/Passing/Retest sections below; section headers in `results.md` | An actual test session block that was run and recorded                    |
| **N-X-TZ** (planning matrix ID) | `1-A-IST`, `2-B-BRT` | Top Priority Gaps; Complete Test Matrix in `results.md`                | A planned test slot in the coverage matrix (may or may not have been run) |

---

## Failing Test IDs

Tests run that confirmed a bug. Grouped by bug. IDs are execution test IDs (X.Y) — map directly to section headers in `results.md`.

### Bug #5 — Fake `[Z]` in GetFieldValue (Config D, all TZs except UTC+0)

All failures on `enableTime=true` + `ignoreTZ=true` + `useLegacy=false` (Config D fields).

| Test ID | Scenario                                    | TZ  | Observed failure                                                                                 |
| ------- | ------------------------------------------- | --- | ------------------------------------------------------------------------------------------------ |
| 1.1     | Calendar popup, Form 1                      | BRT | GFV returns fake Z: `"2026-03-15T00:00:00.000Z"` (correct would be `"2026-03-15T03:00:00.000Z"`) |
| 1.2     | Typed input, Form 1                         | BRT | Same — fake Z on GFV, storage itself correct                                                     |
| 1.3     | Round-trip, Form 1                          | BRT | -3h drift per trip: `"2026-03-15T00:00:00"` → `"2026-03-14T21:00:00"`                            |
| 2.2     | Calendar popup, DataField5                  | BRT | GFV returns fake Z                                                                               |
| 2.3     | Round-trip comparison, DataField5           | BRT | Fake Z on GFV; round-trip drift confirmed                                                        |
| 2.8     | Multiple sequential round-trips, DataField5 | BRT | 1 trip: -3h; 8 trips: -24h (full day lost); 10 trips: -30h                                       |
| 2.5     | Live IST cross-timezone test, DataField5    | IST | Fake Z; 1 trip: +5:30h drift; day crossed after 5 trips                                          |
| 3.1     | SetFieldValue input formats, Config D       | BRT | GFV fake Z across all input formats; `isoZ` input also causes UTC→local shift on write           |
| 4.2     | 5 round-trips, Config D from IST            | IST | Day crossed: `"2026-03-15T00:00:00"` → `"2026-03-16T03:30:00"` after 5 trips                     |
| 4.3     | Cross-TZ round-trip: BRT save, IST load     | IST | +5:30h drift on round-trip; BRT user sees 05:30 AM instead of midnight                           |

**Within Test 3.4 (edge cases), individual rows that fail Bug #5:**

| Row                | Observed failure                                                                  |
| ------------------ | --------------------------------------------------------------------------------- |
| 12-year-boundary   | 1 trip → year boundary crossed: `"2026-01-01T00:00:00"` → `"2025-12-31T21:00:00"` |
| 12-leap-day        | 1 trip → leap day lost: `"2028-02-29T00:00:00"` → `"2028-02-28T21:00:00"`         |
| 12-near-midnight-1 | UTC input stored as Mar 14 21:30 on write + fake Z on GFV (compound failure)      |
| 12-near-midnight-2 | Start 23:00, -3h/trip: 23→20→17→14→11→…                                           |
| 12-dst-transition  | Mar 8 02:00 → 1 trip → Mar 7 23:00 — standard drift, no extra DST anomaly         |
| 12-far-future      | `"2099-12-31T00:00:00"` → standard -3h drift                                      |
| 12-pre-epoch       | `"1969-12-31T00:00:00"` → standard -3h drift                                      |

### Bug #6 — `GetFieldValue` returns `"Invalid Date"` for empty Config D fields

| Test ID | Row            | TZ  | Observed failure                                                                                                                         |
| ------- | -------------- | --- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 3.4     | 12-empty-value | BRT | Set `""` or `null` → raw `""` correct but GFV = `"Invalid Date"` (truthy) — `if (GetFieldValue('field'))` returns `true` for empty field |

### Bug #7 — `SetFieldValue` stores wrong day for UTC+ users (date-only Configs A, B)

| Test ID | Scenario                         | TZ  | Observed failure                                                                                                |
| ------- | -------------------------------- | --- | --------------------------------------------------------------------------------------------------------------- |
| 4.4     | SetFieldValue on Config A in IST | IST | `"2026-03-15"` → stored `"2026-03-14"` (-1 day); `new Date(2026,2,15)` → `"2026-03-13"` (-2 days, double shift) |

### Passing Test IDs

Tests run that confirmed no bug. These are the regression baseline — they must continue to pass after any fix.

| Test ID | Scenario                              | Config | TZ  | What passes                                                        |
| ------- | ------------------------------------- | ------ | --- | ------------------------------------------------------------------ |
| 2.2     | Calendar popup, DataField6            | C      | BRT | Storage + GFV correct UTC — no Bug #5                              |
| 2.2     | Calendar popup, DataField7            | A      | BRT | Storage date-only, GFV clean — no Bug #7 in BRT                    |
| 2.3     | Round-trip comparison, DataField6     | C      | BRT | 1 trip: no drift — Config C stable                                 |
| 2.3     | Round-trip comparison, DataField7     | A      | BRT | 1 trip: no drift — date-only stable in BRT                         |
| 2.9     | Save and reload (server round-trip)   | A/C/D  | BRT | No shift on same-TZ reload                                         |
| 2.7     | DataField10 — date-only + ignoreTZ    | B      | BRT | Clean storage, no drift                                            |
| 2.6     | Typed input comparison                | C/A    | BRT | Storage matches popup — Bug #2 not reproduced                      |
| 2.5     | Live IST test, DataField5 Config C    | C      | IST | GFV returns correct UTC — Config C stable in IST                   |
| 3.2     | SetFieldValue input formats, Config C | C      | BRT | All input formats: storage + GFV correct UTC                       |
| 3.3     | SetFieldValue input formats, Config A | A      | BRT | All input formats: date-only clean in UTC-                         |
| 4.1     | Load BRT-saved record in IST          | A/C/D  | IST | Display correct on IST load (structural DB issue noted separately) |

**Within Test 3.4, individual rows that pass:**

| Row               | What passes                                                  |
| ----------------- | ------------------------------------------------------------ |
| 12-invalid-string | `"not-a-date"` → silently ignored, field unchanged, no crash |

**Structural partials** (display correct, underlying DB issue noted): Tests 2.3 and 4.1 — database stores UTC vs local depending on code path; not a discrete failure for current tests.

---

## Retest Scope by Fix

When a fix is applied, run these test IDs to verify the fix works and the regression baseline holds. All IDs are execution test IDs (X.Y format).

### Fix for Bug #5 (fake Z in `getCalendarFieldValue()`)

Must fail → pass after fix:

```
1.1, 1.2, 1.3
2.2 (DataField5), 2.3 (DataField5), 2.8, 2.5 (DataField5)
3.1
4.2, 4.3
3.4: rows 12-year-boundary, 12-leap-day, 12-near-midnight-1, 12-near-midnight-2, 12-dst-transition, 12-far-future, 12-pre-epoch
```

Must continue to pass (regression — ensure fix doesn't break stable configs):

```
2.2 (DataField6, DataField7), 2.3 (DataField6, DataField7), 2.9, 2.7, 2.6
2.5 (Config C — DataField6)
3.2, 3.3
4.1
3.4: row 12-invalid-string
```

### Fix for Bug #6 (empty field `"Invalid Date"` in `getCalendarFieldValue()`)

Must fail → pass after fix: `3.4` row `12-empty-value`

Regression check: run all other rows in Test 3.4 and Test 2.1/2.2 GFV results — fix must not change non-empty GFV behavior.

### Fix for Bug #7 (date-only wrong day UTC+ in `normalizeCalValue()`)

Fixes must be verified from **IST** timezone (UTC+ is required to observe the bug):

Must fail → pass after fix (run from IST):

```
4.4
Pending formal runs from IST: 1-A-IST, 1-B-IST (popup), 2-A-IST, 2-B-IST (typed)
```

Regression check from BRT (must stay passing): `3.3, 2.3 (DataField7), 2.7`

---

## Formal TC Files

Executable, reproducible test procedures with exact pass/fail criteria.
All other results exist as session notes in `results.md` only.

| TC      | Scenario                                            | Config      | TZ  | Bug(s) Exercised                                                              | File                                         |
| ------- | --------------------------------------------------- | ----------- | --- | ----------------------------------------------------------------------------- | -------------------------------------------- |
| TC-1.1  | Calendar popup — user selects date                  | D           | BRT | #5 observed in GFV; storage correct from input                                | `test/tc-1-1-calendar-popup-brt.md`          |
| TC-1.2  | Typed input — user types date segments              | D           | BRT | #5 observed in GFV; #2 not reproduced                                         | `test/tc-1-2-typed-input-brt.md`             |
| TC-1.3  | Round-trip — `SetFieldValue(GetFieldValue())`       | D           | BRT | **#5 active: -3h drift per trip**                                             | `test/tc-1-3-roundtrip-brt.md`               |
| TC-2.1  | Form load (initial values) — Config A pre-save      | A (w/ init) | BRT | Baseline — no bug; documents pre-save Date object format                      | `test/tc-2-1-form-load-brt.md`               |
| TC-2.2  | Calendar popup — DataField5                         | D           | BRT | #5 observed in GFV                                                            | `test/tc-2-2-calendar-popup-brt.md`          |
| TC-2.3  | Round-trip comparison — Configs C, D, A             | C, D, A     | BRT | **#5 active on D; C and A stable**                                            | `test/tc-2-3-roundtrip-brt.md`               |
| TC-2.4  | Cross-TZ drift analysis — drift rate by timezone    | D           | BRT | #5 drift formula: magnitude = TZ offset; direction = sign of offset           | `test/tc-2-4-cross-tz-brt.md`                |
| TC-2.5  | Round-trip — IST forward drift                      | D           | IST | **#5 active: +5:30h per trip; day gained after ~4.4 trips**                   | `test/tc-2-5-roundtrip-ist.md`               |
| TC-2.6  | Typed input — Config D comparison with popup        | D           | BRT | #5 in GFV; Bug #2 absent with `useLegacy=false`                               | `test/tc-2-6-typed-input-brt.md`             |
| TC-2.7  | Round-trip — Config B date-only + ignoreTimezone    | B           | BRT | No Bug #5 (date-only); Bug #7 absent in BRT                                   | `test/tc-2-7-roundtrip-brt.md`               |
| TC-2.8  | Round-trip × 10 — cumulative drift                  | D           | BRT | **#5 active: -3h × 8 = full day lost; -3h × 10 = -30h total**                 | `test/tc-2-8-roundtrip-cumulative-brt.md`    |
| TC-2.9  | Form load (server reload) — post-save Configs A/C/D | A, C, D     | BRT | #5 in GFV for Config D only; no date shift on reload                          | `test/tc-2-9-form-load-server-reload-brt.md` |
| TC-2.10 | Database query — direct SQL on DateTest-000004      | A, C, D     | BRT | Structural: initial-value fields store UTC; user-input fields store local BRT | `test/tc-2-10-db-storage-mixed-tz-brt.md`    |

---

## Top Priority Gaps

| Priority | Test IDs                                 | What it proves                                                                  | Blocker                                                         |
| -------- | ---------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| HIGH     | 1-A-IST, 2-A-IST                         | Bug #7 asymmetry: popup → -2 days, typed → -1 day in IST for same intended date | Requires TZ change to IST + Chrome restart                      |
| HIGH     | 10-D/C/A-ws-\*                           | How server scripts set dates; first coverage of web service path                | Node.js test script needed                                      |
| HIGH     | 3-D-IST-BRT                              | Save from IST, reload from BRT — cross-TZ record integrity                      | IST session must save a record (currently unsaved)              |
| MED      | 5-C/D, 6-C/D                             | Preset/Current Date behavior on DateTime fields                                 | New test form fields needed (`enableTime=true` + initial value) |
| MED      | 4-D/C/A                                  | URL parameter date input                                                        | `enableQListener=true` fields needed                            |
| MED      | 11-save-IST-load-BRT, 11-concurrent-edit | Multi-user cross-TZ scenarios                                                   | TZ switching                                                    |
| LOW      | E–H (all categories)                     | Legacy handler behavior; may confirm Bug #2                                     | `useLegacy=true` access required                                |
