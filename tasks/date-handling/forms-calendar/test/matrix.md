# Forms Calendar — Test Matrix

Authoritative permutation tracker for the forms calendar date-handling investigation.
Full test evidence → `results.md` | Bug analysis → `../analysis.md` | Dashboard → `index.md`

Last updated: 2026-03-30 | Total slots: ~177+ | Done: ~57 | Blocked (legacy): ~32

---

## ID Convention

Category test IDs (`1-A-BRT`, `7-D-isoNoZ`) identify **planned test slots** — a Config × TZ × input combination that may or may not have been run. They map to rows in this file.

Execution test IDs (`1.1`, `2.3`) identify **session run blocks** in `results.md`. One execution block may cover multiple category IDs. See `index.md § ID Conventions` for the full mapping.

---

## Field Configurations

All tests target one of 8 field configurations defined by three boolean flags:

| Config | enableTime | ignoreTZ | useLegacy | Test Field  | Access                                 |
| :----: | :--------: | :------: | :-------: | ----------- | -------------------------------------- |
|   A    |   false    |  false   |   false   | DataField7  | ✓ Available                            |
|   B    |   false    |   true   |   false   | DataField10 | ✓ Available                            |
|   C    |    true    |  false   |   false   | DataField6  | ✓ Available                            |
|   D    |    true    |   true   |   false   | DataField5  | ✓ Available                            |
|   E    |   false    |  false   |   true    | —           | ✗ Blocked — no `useLegacy=true` access |
|   F    |   false    |   true   |   true    | —           | ✗ Blocked — no `useLegacy=true` access |
|   G    |    true    |  false   |   true    | —           | ✗ Blocked — no `useLegacy=true` access |
|   H    |    true    |   true   |   true    | —           | ✗ Blocked — no `useLegacy=true` access |

**Config D** (`enableTime=true`, `ignoreTZ=true`) is the primary bug surface — active for Bug #5 and Bug #6.
**Configs A/B** (`enableTime=false`) are the Bug #7 surface — only visible in UTC+ timezones.

---

## Coverage Summary

`PASS` = ran, no bug triggered. `FAIL` = ran, bug confirmed. `PENDING` = not yet run, no blocker. `BLOCKED` = requires access/setup not currently available. `PARTIAL` = ran, partial result only (noted in Actual). `SKIP` = intentionally excluded with known reason.

| Category                 |   Total   |  PASS   |  FAIL   | PENDING  | BLOCKED |
| ------------------------ | :-------: | :-----: | :-----: | :------: | :-----: |
| 1. Calendar Popup        |    14     |    3    |    1    |    6     |    4    |
| 2. Typed Input           |    12     |    3    |    1    |    4     |    4    |
| 3. Server Reload         |    13+    |    7    |    0    |    6+    |    —    |
| 4. URL Parameters        |    5+     |    0    |    0    |    5+    |    —    |
| 5. Preset Date           |    9+     |    1    |    0    |    4+    |    4    |
| 6. Current Date          |    9+     |    1    |    0    |    4+    |    4    |
| 7. SetFieldValue formats |    30+    |    4    |    7    |   19+    |    —    |
| 8. GetFieldValue return  |    14+    |    4    |    2    |    8+    |    —    |
| 9. Round-Trip            |    15+    |    3    |    5    |    7+    |    —    |
| 10. Web Service          |    10+    |    0    |    0    |   10+    |    —    |
| 11. Cross-Timezone       |    11+    |    1    |    1    |    9+    |    —    |
| 12. Edge Cases           |    20+    |    1    |    8    |   10+    |    —    |
| 13. Database             |    10     |    2    |    0    |    8     |    —    |
| **TOTAL**                | **~177+** | **~30** | **~25** | **~88+** | **~32** |

---

## Next Testing Priorities

| Priority | ID(s)                                                                | What it proves                                                                                     | Blocker                                                         |
| -------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| HIGH     | 1-A-IST, 2-A-IST                                                     | Bug #7 asymmetry: popup → -2 days, typed → -1 day for same date in IST                             | TZ change to IST + Chrome restart                               |
| HIGH     | 3-A-BRT-IST, 11-A-save-BRT-load-IST                                  | Bug #7 fires on form _load_ path (`initCalendarValueV1`) — zero empirical evidence for this yet    | IST TZ + saved record                                           |
| HIGH     | 7-A-dateObj-BRT                                                      | BRT baseline for Date-object input; needed before IST result (-2 days) can be confirmed as a delta | —                                                               |
| HIGH     | 1-C-IST, 2-C-IST, 1-D-IST, 2-D-IST                                   | DateTime configs in IST — completely untested; different failure mode from A/B                     | IST TZ + Chrome restart                                         |
| HIGH     | 10-D/C/A-ws-\*                                                       | How server scripts set dates — zero coverage of web service path                                   | Node.js test script needed                                      |
| HIGH     | 3-D-IST-BRT                                                          | Save from IST, reload from BRT — cross-TZ record integrity                                         | IST session must save a record                                  |
| MED      | 8-A-empty, 8-C-empty, 12-empty-Config-A/C                            | Bug #6 scope — is truthy `"Invalid Date"` return D-only or affects all configs?                    | —                                                               |
| MED      | 7-B-dateOnly-BRT, 7-B-dateObj-BRT, 7-B-dateOnly-IST, 7-B-dateObj-IST | Config B has zero Cat 7 tests; confirm B and A are equivalent on Bug #7 surface                    | —                                                               |
| MED      | 9-D-UTC0, 1-A-UTC0, 1-D-UTC0                                         | UTC+0 zero-drift / zero-shift control tests — none run yet                                         | UTC+0 TZ setting                                                |
| MED      | 5-C/D, 6-C/D                                                         | Preset/Current Date on DateTime fields                                                             | New test form fields needed (`enableTime=true` + initial value) |
| MED      | 4-D/C/A-\*                                                           | URL parameter date input                                                                           | `enableQListener=true` fields needed                            |
| MED      | 11-save-IST-load-BRT, 11-roundtrip-cross                             | Compound cross-TZ drift                                                                            | TZ switching                                                    |
| LOW      | 9-D-IST-8, 9-D-IST-10                                                | IST multi-trip: how many trips to gain a full day (mirror of BRT 8-trip test)                      | IST TZ                                                          |
| LOW      | All E–H                                                              | Legacy handler behavior — may confirm Bug #2                                                       | `useLegacy=true` access required                                |

---

### Group: User Input

## 1 — Calendar Popup

Select a date via popup calendar. For DateTime fields, select time then click Set.
**Bugs exercised**: Bug #7 (IST, date-only configs A/B), Bug #5 (IST/BRT, DateTime configs C/D), Bug #2 (legacy)

| Test ID  | Config |  TZ   | Date Selected   | Expected                                                                     | Actual                  | Status  | Run Date | Evidence                               |
| -------- | :----: | :---: | --------------- | ---------------------------------------------------------------------------- | ----------------------- | ------- | -------- | -------------------------------------- |
| 1-A-BRT  |   A    |  BRT  | Mar 15          | `"2026-03-15"`                                                               | `"2026-03-15"`          | PASS    | —        | [tc-1-1](tc-1-1-calendar-popup-brt.md) |
| 1-B-BRT  |   B    |  BRT  | Mar 15          | `"2026-03-15"`                                                               | `"2026-03-15"`          | PASS    | —        | [tc-1-1](tc-1-1-calendar-popup-brt.md) |
| 1-C-BRT  |   C    |  BRT  | Mar 15 12:00 AM | `"2026-03-15T00:00:00"`                                                      | `"2026-03-15T00:00:00"` | PASS    | —        | [tc-1-1](tc-1-1-calendar-popup-brt.md) |
| 1-D-BRT  |   D    |  BRT  | Mar 15 12:00 AM | `"2026-03-15T00:00:00"`                                                      | `"2026-03-15T00:00:00"` | PASS    | —        | [tc-1-1](tc-1-1-calendar-popup-brt.md) |
| 1-A-IST  |   A    |  IST  | Mar 15          | `"2026-03-13"` (Date obj → -2 days)                                          | —                       | PENDING | —        | —                                      |
| 1-B-IST  |   B    |  IST  | Mar 15          | `"2026-03-13"` (same as A-IST — ignoreTZ no effect on date-only)             | —                       | PENDING | —        | —                                      |
| 1-C-IST  |   C    |  IST  | Mar 15 12:00 AM | `"2026-03-14T18:30:00"` (IST midnight = UTC 18:30 prev day; stored as local) | —                       | PENDING | —        | —                                      |
| 1-D-IST  |   D    |  IST  | Mar 15 12:00 AM | `"2026-03-14T18:30:00"` (same storage; GFV adds fake Z → Bug #5 +5:30h/trip) | —                       | PENDING | —        | —                                      |
| 1-A-UTC0 |   A    | UTC+0 | Mar 15          | `"2026-03-15"` (UTC+0 midnight = UTC midnight; no shift — control)           | —                       | PENDING | —        | —                                      |
| 1-D-UTC0 |   D    | UTC+0 | Mar 15 12:00 AM | `"2026-03-15T00:00:00"` (fake Z coincidentally correct; round-trip stable)   | —                       | PENDING | —        | —                                      |
| 1-E-BRT  |   E    |  BRT  | Mar 15          | —                                                                            | —                       | BLOCKED | —        | —                                      |
| 1-F-BRT  |   F    |  BRT  | Mar 15          | —                                                                            | —                       | BLOCKED | —        | —                                      |
| 1-G-BRT  |   G    |  BRT  | Mar 15 12:00 AM | —                                                                            | —                       | BLOCKED | —        | —                                      |
| 1-H-BRT  |   H    |  BRT  | Mar 15 12:00 AM | —                                                                            | —                       | BLOCKED | —        | —                                      |

> **IST note**: Popup creates a `Date` object at local midnight. `normalizeCalValue()` V1 Date-object branch: `Date→toISO("2026-03-14T18:30:00.000Z")`, strips T → `"2026-03-14"`, re-parses as local midnight → double shift, **-2 days**. Expected to differ from Category 2 IST (typed → -1 day). Needs live test to confirm.
> **C/D IST note**: For DateTime configs, popup creates a Date at IST midnight (= 2026-03-14T18:30:00Z). `getSaveValue()` stores local-time string without Z → `"2026-03-14T18:30:00"`. On reload in IST this re-parses as local → shows 18:30 IST (not midnight). Config D adds fake Z on GFV making round-trips drift +5:30h each pass.
> **UTC+0 note**: UTC+0 midnight = UTC midnight. Bug #7 shift is zero (correct day stored). Config D fake Z coincidentally correct → zero round-trip drift. These are control tests confirming the UTC+0 boundary.

---

## 2 — Typed Input

Type a date directly in the input field (segment-by-segment keyboard entry).
**Bugs exercised**: Bug #7 (IST, date-only configs A/B), Bug #5 (IST/BRT, DateTime configs C/D), Bug #2 (legacy)

| Test ID | Config | TZ  | Date Typed          | Expected                                                                      | Actual                                  | Status  | Run Date | Evidence                            |
| ------- | :----: | :-: | ------------------- | ----------------------------------------------------------------------------- | --------------------------------------- | ------- | -------- | ----------------------------------- |
| 2-A-BRT |   A    | BRT | 03/15/2026          | `"2026-03-15"`                                                                | `"2026-03-15"` · matches popup          | PASS    | —        | [tc-1-2](tc-1-2-typed-input-brt.md) |
| 2-B-BRT |   B    | BRT | 03/15/2026          | `"2026-03-15"`                                                                | `"2026-03-15"` · matches popup          | PASS    | —        | [tc-1-2](tc-1-2-typed-input-brt.md) |
| 2-C-BRT |   C    | BRT | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"`                                                       | `"2026-03-15T00:00:00"` · matches popup | PASS    | —        | [tc-1-2](tc-1-2-typed-input-brt.md) |
| 2-D-BRT |   D    | BRT | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"`                                                       | `"2026-03-15T00:00:00"` · matches popup | PASS    | —        | [tc-1-2](tc-1-2-typed-input-brt.md) |
| 2-A-IST |   A    | IST | 03/15/2026          | `"2026-03-14"` (-1 day — string path)                                         | —                                       | PENDING | —        | —                                   |
| 2-B-IST |   B    | IST | 03/15/2026          | `"2026-03-14"` (same as A-IST — ignoreTZ no effect on date-only)              | —                                       | PENDING | —        | —                                   |
| 2-C-IST |   C    | IST | 03/15/2026 12:00 AM | `"2026-03-14T18:30:00"` (typed string → local midnight → stored as UTC-equiv) | —                                       | PENDING | —        | —                                   |
| 2-D-IST |   D    | IST | 03/15/2026 12:00 AM | `"2026-03-14T18:30:00"` (same; GFV adds fake Z → Bug #5 +5:30h/trip)          | —                                       | PENDING | —        | —                                   |
| 2-E-BRT |   E    | BRT | 03/15/2026          | —                                                                             | —                                       | BLOCKED | —        | —                                   |
| 2-F-BRT |   F    | BRT | 03/15/2026          | —                                                                             | —                                       | BLOCKED | —        | —                                   |
| 2-G-BRT |   G    | BRT | 03/15/2026 12:00 AM | —                                                                             | —                                       | BLOCKED | —        | —                                   |
| 2-H-BRT |   H    | BRT | 03/15/2026 12:00 AM | —                                                                             | —                                       | BLOCKED | —        | —                                   |

> **IST note**: Typed input creates a string → `normalizeCalValue()` string path → single local-midnight conversion → **-1 day**. Expected `"2026-03-14"` while popup (1-A-IST) expected `"2026-03-13"` — same intended date, different stored values. This is Bug #7's asymmetry between Date object (popup) and string (typed) paths.
> **C/D IST note**: Typed input for DateTime fields in IST takes the string path (no Date-object double-shift). Both paths store the same UTC-equivalent `"2026-03-14T18:30:00"` for IST midnight, so popup and typed _should_ agree for C/D — unlike A/B where they diverge. Needs live confirmation.

---

### Group: Initial Values

## 3 — Server Reload

Save form, open saved record in a new tab. Compare displayed dates and GFV return with original.
**Bugs exercised**: structural DB mixed-TZ storage, Bug #7 (IST load of date-only fields)

| Test ID     | Config | Save TZ | Load TZ | Expected                                                                   | Actual                                              | Status  | Run Date | Evidence                                        |
| ----------- | :----: | :-----: | :-----: | -------------------------------------------------------------------------- | --------------------------------------------------- | ------- | -------- | ----------------------------------------------- |
| 3-A-BRT-BRT |   A    |   BRT   |   BRT   | No shift; display identical on reload                                      | No shift; display/GFV identical on reload           | PASS    | —        | [tc-2-1](tc-2-1-form-load-brt.md)               |
| 3-C-BRT-BRT |   C    |   BRT   |   BRT   | No shift; display identical on reload                                      | No shift; display/GFV identical on reload           | PASS    | —        | [tc-2-1](tc-2-1-form-load-brt.md)               |
| 3-D-BRT-BRT |   D    |   BRT   |   BRT   | No shift; GFV fake Z same on reload                                        | No shift; GFV returns same fake Z on reload         | PASS    | —        | [tc-2-9](tc-2-9-form-load-server-reload-brt.md) |
| 3-D-BRT-IST |   D    |   BRT   |   IST   | Display OK; Config D TZ-invariant (stored value unchanged)                 | Display OK; GFV same fake Z (Config D TZ-invariant) | PASS    | —        | [tc-2-4](tc-2-4-cross-tz-brt.md)                |
| 3-A-BRT-IST |   A    |   BRT   |   IST   | Bug #7 on load: stored `"2026-03-15"` → IST reload displays `"2026-03-14"` | —                                                   | PENDING | —        | —                                               |
| 3-C-BRT-IST |   C    |   BRT   |   IST   | Config C stores real UTC; IST reload shows correct local time (control)    | —                                                   | PENDING | —        | —                                               |
| 3-D-IST-BRT |   D    |   IST   |   BRT   | Display OK; GFV same fake Z (TZ-invariant)                                 | —                                                   | PENDING | —        | —                                               |
| 3-B-BRT-BRT |   B    |   BRT   |   BRT   | No shift — same as A-BRT-BRT (ignoreTZ no effect on date-only)             | —                                                   | PENDING | —        | —                                               |
| 3-B-BRT-IST |   B    |   BRT   |   IST   | Bug #7 on load — same as A-BRT-IST prediction                              | —                                                   | PENDING | —        | —                                               |
| 3-A-IST-BRT |   A    |   IST   |   BRT   | Wrong day permanently stored (Bug #7 baked in during IST save)             | —                                                   | PENDING | —        | —                                               |
| 3-C-IST-BRT |   C    |   IST   |   BRT   | Stored IST-offset UTC-equiv; BRT reload shows different time               | —                                                   | PENDING | —        | —                                               |
| 3-B-IST-BRT |   B    |   IST   |   BRT   | Same as A-IST-BRT (ignoreTZ no effect on date-only)                        | —                                                   | PENDING | —        | —                                               |
| 3-ALL-E-H   |  E–H   |   any   |   any   | —                                                                          | —                                                   | BLOCKED | —        | —                                               |

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
**Bugs exercised**: Bug #7 (IST, date-only preset), potential Bug #3 (V2 `initCalendarValueV2` hardcodes `enableTime`)
**Blocker for C/D**: Requires new test form fields with `enableTime=true` + preset initial value.

| Test ID      | Config | Preset   |  TZ   | Expected                                                                                          | Actual                                              | Status  | Run Date | Evidence   |
| ------------ | :----: | -------- | :---: | ------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------- | -------- | ---------- |
| 5-A-BRT      |   A    | 3/1/2026 |  BRT  | `"2026-03-01"` / Date obj                                                                         | Display correct; raw = UTC Date object (DataField2) | PASS    | —        | results.md |
| 5-B-BRT      |   B    | 3/1/2026 |  BRT  | `"2026-03-01"`                                                                                    | —                                                   | PENDING | —        | —          |
| 5-C-BRT      |   C    | 3/1/2026 |  BRT  | —                                                                                                 | —                                                   | PENDING | —        | —          |
| 5-D-BRT      |   D    | 3/1/2026 |  BRT  | —                                                                                                 | —                                                   | PENDING | —        | —          |
| 5-A-IST      |   A    | 3/1/2026 |  IST  | `"2026-02-28"` (Bug #7 prediction: -1 day)                                                        | —                                                   | PENDING | —        | —          |
| 5-B-IST      |   B    | 3/1/2026 |  IST  | `"2026-02-28"` (ignoreTZ=true does not protect preset — same Bug #7 path as A)                    | —                                                   | PENDING | —        | —          |
| 5-A-UTC0     |   A    | 3/1/2026 | UTC+0 | `"2026-03-01"` (UTC+0 midnight = UTC midnight; no shift — Bug #7 boundary control)                | —                                                   | PENDING | —        | —          |
| 5-A-PST      |   A    | 3/1/2026 |  PST  | `"2026-03-01"` (UTC-8 midnight = UTC+8h; same UTC day → correct; confirms Bug #7 UTC- unaffected) | —                                                   | PENDING | —        | —          |
| 5-ALL-legacy |  E–H   | 3/1/2026 |  any  | —                                                                                                 | —                                                   | BLOCKED | —        | —          |

---

## 6 — Current Date Default

Form template with "Current Date" as the initial value.
**Bugs exercised**: baseline/control for UTC vs local storage; no active bug predicted for BRT
**Blocker for C/D**: Requires new test form fields with `enableTime=true` + current-date initial value.

| Test ID      | Config |  TZ   | Expected                       | Actual                                                          | Status  | Run Date | Evidence   |
| ------------ | :----: | :---: | ------------------------------ | --------------------------------------------------------------- | ------- | -------- | ---------- |
| 6-A-BRT      |   A    |  BRT  | Date obj with current UTC time | UTC Date obj stored; display = today's date in BRT (DataField1) | PASS    | —        | results.md |
| 6-B-BRT      |   B    |  BRT  | —                              | —                                                               | PENDING | —        | —          |
| 6-C-BRT      |   C    |  BRT  | —                              | —                                                               | PENDING | —        | —          |
| 6-D-BRT      |   D    |  BRT  | —                              | —                                                               | PENDING | —        | —          |
| 6-A-IST      |   A    |  IST  | Today's date in IST            | —                                                               | PENDING | —        | —          |
| 6-B-IST      |   B    |  IST  | Today's date in IST            | —                                                               | PENDING | —        | —          |
| 6-A-UTC0     |   A    | UTC+0 | Today's date in UTC+0          | —                                                               | PENDING | —        | —          |
| 6-ALL-legacy |  E–H   |  any  | —                              | —                                                               | BLOCKED | —        | —          |

---

### Group: Developer API

## 7 — SetFieldValue Formats

Different input formats passed to `VV.Form.SetFieldValue()`.
**Bugs exercised**: Bug #7 (IST, date-only configs A/B), input-format sensitivity in Config C

| Test ID          | Config | TZ  | Input Value                  | Input Type    | Expected Stored                                                          | Actual Stored                                                 | Status  | Run Date | Evidence   |
| ---------------- | :----: | :-: | ---------------------------- | ------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- | ------- | -------- | ---------- |
| 7-D-dateObj      |   D    | BRT | `new Date(2026,2,15)`        | Date object   | `"2026-03-15T00:00:00"`                                                  | `"2026-03-15T00:00:00"` (GFV: fake Z added)                   | PASS    | —        | results.md |
| 7-D-isoZ         |   D    | BRT | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-14T21:00:00"` (shifted!)                                       | `"2026-03-14T21:00:00"` (Bug #5: -3h shift confirmed)         | FAIL    | —        | results.md |
| 7-D-isoNoZ       |   D    | BRT | `"2026-03-15T00:00:00"`      | ISO without Z | `"2026-03-15T00:00:00"`                                                  | `"2026-03-15T00:00:00"` (GFV: fake Z added)                   | PASS    | —        | results.md |
| 7-D-dateOnly     |   D    | BRT | `"2026-03-15"`               | Date string   | `"2026-03-15T00:00:00"`                                                  | `"2026-03-15T00:00:00"` (GFV: fake Z added)                   | PASS    | —        | results.md |
| 7-D-usFormat     |   D    | BRT | `"03/15/2026"`               | US format     | `"2026-03-15T00:00:00"`                                                  | `"2026-03-15T00:00:00"` (GFV: fake Z added)                   | PASS    | —        | results.md |
| 7-D-usFormatTime |   D    | BRT | `"03/15/2026 12:00:00 AM"`   | US + time     | `"2026-03-15T00:00:00"`                                                  | `"2026-03-15T00:00:00"` (GFV: fake Z added)                   | PASS    | —        | results.md |
| 7-D-epoch        |   D    | BRT | `1773543600000`              | Unix ms       | `"2026-03-15T00:00:00"`                                                  | `"2026-03-15T00:00:00"` (GFV: fake Z added)                   | PASS    | —        | results.md |
| 7-D-isoZ-IST     |   D    | IST | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-15T05:30:00"` (UTC→IST +5:30h)                                 | —                                                             | PENDING | —        | —          |
| 7-D-dateObj-IST  |   D    | IST | `new Date(2026,2,15)`        | Date object   | `"2026-03-14T18:30:00"` (IST midnight stored as UTC-equiv)               | —                                                             | PENDING | —        | —          |
| 7-D-isoNoZ-IST   |   D    | IST | `"2026-03-15T00:00:00"`      | ISO without Z | `"2026-03-15T00:00:00"` (local treated as IST; GFV fake Z → +5:30h/trip) | —                                                             | PENDING | —        | —          |
| 7-C-isoZ         |   C    | BRT | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-14T21:00:00"` (UTC→local)                                      | `"2026-03-14T21:00:00"` (day crosses in DB; GFV: correct UTC) | FAIL    | —        | results.md |
| 7-C-isoNoZ       |   C    | BRT | `"2026-03-15T00:00:00"`      | ISO without Z | `"2026-03-15T00:00:00"`                                                  | `"2026-03-15T00:00:00"` (GFV: real UTC)                       | PASS    | —        | results.md |
| 7-C-dateOnly     |   C    | BRT | `"2026-03-15"`               | Date string   | `"2026-03-15T00:00:00"` (midnight appended; GFV real UTC)                | —                                                             | PENDING | —        | —          |
| 7-C-dateObj      |   C    | BRT | `new Date(2026,2,15)`        | Date object   | `"2026-03-15T00:00:00"` (BRT midnight stored as local time)              | —                                                             | PENDING | —        | —          |
| 7-C-usFormat     |   C    | BRT | `"03/15/2026"`               | US format     | `"2026-03-15T00:00:00"`                                                  | —                                                             | PENDING | —        | —          |
| 7-C-usFormatTime |   C    | BRT | `"03/15/2026 12:00:00 AM"`   | US + time     | `"2026-03-15T00:00:00"`                                                  | —                                                             | PENDING | —        | —          |
| 7-C-epoch        |   C    | BRT | `1773543600000`              | Unix ms       | `"2026-03-15T00:00:00"` (BRT midnight in ms)                             | —                                                             | PENDING | —        | —          |
| 7-A-dateOnly     |   A    | BRT | `"2026-03-15"`               | Date string   | `"2026-03-15"`                                                           | `"2026-03-15"`                                                | PASS    | —        | results.md |
| 7-A-isoZ         |   A    | BRT | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-15"` (date extracted)                                          | `"2026-03-15"` (time/Z stripped)                              | PASS    | —        | results.md |
| 7-A-dateObj-BRT  |   A    | BRT | `new Date(2026,2,15)`        | Date object   | `"2026-03-15"` (BRT baseline)                                            | —                                                             | PENDING | —        | —          |
| 7-A-isoNoZ       |   A    | BRT | `"2026-03-15T00:00:00"`      | ISO without Z | `"2026-03-15"` (time component stripped)                                 | —                                                             | PENDING | —        | —          |
| 7-A-usFormat     |   A    | BRT | `"03/15/2026"`               | US format     | `"2026-03-15"`                                                           | —                                                             | PENDING | —        | —          |
| 7-A-usFormatTime |   A    | BRT | `"03/15/2026 12:00:00 AM"`   | US + time     | `"2026-03-15"` (time stripped for date-only config)                      | —                                                             | PENDING | —        | —          |
| 7-A-epoch        |   A    | BRT | `1773543600000`              | Unix ms       | `"2026-03-15"`                                                           | —                                                             | PENDING | —        | —          |
| 7-A-dateOnly-IST |   A    | IST | `"2026-03-15"`               | Date string   | `"2026-03-14"` (Bug #7: -1 day)                                          | `"2026-03-14"` (Bug #7: -1 day confirmed)                     | FAIL    | —        | results.md |
| 7-A-dateObj-IST  |   A    | IST | `new Date(2026,2,15)`        | Date object   | `"2026-03-13"` (Bug #7: -2 days)                                         | `"2026-03-13"` (Bug #7: -2 days confirmed)                    | FAIL    | —        | results.md |
| 7-B-dateOnly-BRT |   B    | BRT | `"2026-03-15"`               | Date string   | `"2026-03-15"` (ignoreTZ=true; same behavior as A-BRT)                   | —                                                             | PENDING | —        | —          |
| 7-B-isoZ-BRT     |   B    | BRT | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-15"` (same as A-isoZ)                                          | —                                                             | PENDING | —        | —          |
| 7-B-dateObj-BRT  |   B    | BRT | `new Date(2026,2,15)`        | Date object   | `"2026-03-15"` (BRT baseline; same as A-dateObj-BRT)                     | —                                                             | PENDING | —        | —          |
| 7-B-dateOnly-IST |   B    | IST | `"2026-03-15"`               | Date string   | `"2026-03-14"` (Bug #7: -1 day; same as A-dateOnly-IST)                  | —                                                             | PENDING | —        | —          |
| 7-B-dateObj-IST  |   B    | IST | `new Date(2026,2,15)`        | Date object   | `"2026-03-13"` (Bug #7: -2 days; same as A-dateObj-IST)                  | —                                                             | PENDING | —        | —          |
| 7-ALL-legacy     |  E–H   | any | various                      | various       | —                                                                        | —                                                             | BLOCKED | —        | —          |

---

## 8 — GetFieldValue Return

Return value for each configuration from `VV.Form.GetFieldValue()`.
**Bugs exercised**: Bug #5 (Config D fake Z), Bug #6 (empty Config D — scope for other configs unknown)

| Test ID         | Config |  TZ   | Stored Raw              | Expected Return                                                        | Actual Return                                                       | Status  | Run Date | Evidence   |
| --------------- | :----: | :---: | ----------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------- | ------- | -------- | ---------- |
| 8-A             |   A    |  any  | `"2026-03-15"`          | `"2026-03-15"`                                                         | `"2026-03-15"`                                                      | PASS    | —        | results.md |
| 8-B             |   B    |  any  | `"2026-03-15"`          | `"2026-03-15"` (ignoreTZ=true; date-only — expected same return as A)  | —                                                                   | PENDING | —        | —          |
| 8-C-BRT         |   C    |  BRT  | `"2026-03-15T00:00:00"` | `"2026-03-15T03:00:00.000Z"` (real UTC)                                | `"2026-03-15T03:00:00.000Z"` (real UTC confirmed)                   | PASS    | —        | results.md |
| 8-C-IST         |   C    |  IST  | `"2026-03-15T00:00:00"` | `"2026-03-14T18:30:00.000Z"` (real UTC from IST)                       | `"2026-03-14T18:30:00.000Z"` (real UTC confirmed)                   | PASS    | —        | results.md |
| 8-C-UTC0        |   C    | UTC+0 | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` (real UTC at UTC+0 = stored value)        | —                                                                   | PENDING | —        | —          |
| 8-D-BRT         |   D    |  BRT  | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` (**FAKE Z**)                              | `"2026-03-15T00:00:00.000Z"` (fake Z — not real UTC, Bug #5)        | FAIL    | —        | results.md |
| 8-D-IST         |   D    |  IST  | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` (**FAKE Z** — TZ-invariant)               | `"2026-03-15T00:00:00.000Z"` (same fake Z regardless of TZ, Bug #5) | FAIL    | —        | results.md |
| 8-D-UTC0        |   D    | UTC+0 | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` (fake Z, coincidentally correct at UTC+0) | —                                                                   | PENDING | —        | —          |
| 8-D-empty       |   D    |  any  | `""`                    | `""` (expected) / `"Invalid Date"` (**Bug #6**)                        | `"Invalid Date"` (truthy string — Bug #6 confirmed)                 | FAIL    | —        | results.md |
| 8-D-empty-IST   |   D    |  IST  | `""`                    | `"Invalid Date"` (Bug #6 expected TZ-independent)                      | —                                                                   | PENDING | —        | —          |
| 8-A-empty       |   A    |  any  | `""`                    | `""` (expected — is Bug #6 D-only or affects all configs?)             | —                                                                   | PENDING | —        | —          |
| 8-C-empty       |   C    |  any  | `""`                    | `""` (expected — is Bug #6 D-only?)                                    | —                                                                   | PENDING | —        | —          |
| 8-E through 8-H |  E–H   |  any  | various                 | —                                                                      | —                                                                   | BLOCKED | —        | —          |
| 8-V2            |  any   |  any  | any                     | raw value unchanged (`useUpdatedCalendarValueLogic=true`)              | —                                                                   | PENDING | —        | —          |

---

## 9 — Round-Trip (SFV→GFV→SFV)

Call `SetFieldValue(field, GetFieldValue(field))` and measure date drift.
**Bugs exercised**: Bug #5 (Config D — each trip drifts by TZ offset)

| Test ID      | Config |  TZ   | Trips | Expected Shift                                    | Actual Shift                                              | Status  | Run Date | Evidence                                     |
| ------------ | :----: | :---: | :---: | ------------------------------------------------- | --------------------------------------------------------- | ------- | -------- | -------------------------------------------- |
| 9-D-BRT-1    |   D    |  BRT  |   1   | -3h                                               | -3h → `"2026-03-14T21:00:00"` (confirmed)                 | FAIL    | —        | [tc-1-3](tc-1-3-roundtrip-brt.md)            |
| 9-D-BRT-3    |   D    |  BRT  |   3   | -9h (crosses midnight, same day)                  | —                                                         | PENDING | —        | —                                            |
| 9-D-BRT-8    |   D    |  BRT  |   8   | -24h (full day lost)                              | -24h → `"2026-03-14T00:00:00"` (full day lost confirmed)  | FAIL    | —        | [tc-2-8](tc-2-8-roundtrip-cumulative-brt.md) |
| 9-D-BRT-10   |   D    |  BRT  |  10   | -30h                                              | -30h → `"2026-03-13T18:00:00"` (confirmed)                | FAIL    | —        | [tc-2-8](tc-2-8-roundtrip-cumulative-brt.md) |
| 9-D-IST-1    |   D    |  IST  |   1   | +5:30h                                            | +5:30h → `"2026-03-15T05:30:00"` (confirmed)              | FAIL    | —        | [tc-2-5](tc-2-5-roundtrip-ist.md)            |
| 9-D-IST-5    |   D    |  IST  |   5   | +27:30h → day crosses                             | +27:30h → `"2026-03-16T03:30:00"` (day crossed confirmed) | FAIL    | —        | [tc-2-5](tc-2-5-roundtrip-ist.md)            |
| 9-D-IST-8    |   D    |  IST  |   8   | +44h → ~+1d20h (full day gained after ~5 trips)   | —                                                         | PENDING | —        | —                                            |
| 9-D-IST-10   |   D    |  IST  |  10   | +55h → +2d7h (mirror of BRT-10 but forward)       | —                                                         | PENDING | —        | —                                            |
| 9-D-UTC0     |   D    | UTC+0 |   1   | 0 (fake Z coincidentally correct → stable)        | —                                                         | PENDING | —        | —                                            |
| 9-D-PST-1    |   D    |  PST  |   1   | -8h                                               | —                                                         | PENDING | —        | —                                            |
| 9-D-JST-1    |   D    |  JST  |   1   | +9h (UTC+9 — most extreme positive offset tested) | —                                                         | PENDING | —        | —                                            |
| 9-C-BRT-1    |   C    |  BRT  |   1   | 0 (stable)                                        | 0 drift — stable (confirmed)                              | PASS    | —        | [tc-2-3](tc-2-3-roundtrip-brt.md)            |
| 9-C-IST-1    |   C    |  IST  |   1   | 0 (stable)                                        | 0 drift — stable (confirmed)                              | PASS    | —        | results.md                                   |
| 9-A-any      |   A    |  any  |   1   | 0 (stable)                                        | 0 drift — stable (confirmed)                              | PASS    | —        | results.md                                   |
| 9-B-any      |   B    |  any  |   1   | 0 (stable)                                        | 0 drift — stable (confirmed)                              | PASS    | —        | results.md                                   |
| 9-B-IST      |   B    |  IST  |   1   | 0 (stable — ignoreTZ=true on date-only)           | —                                                         | PENDING | —        | —                                            |
| 9-ALL-legacy |  E–H   |  any  |   1   | unknown                                           | —                                                         | BLOCKED | —        | —                                            |

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

| Test ID                  | Action                                                          |    TZ 1     | TZ 2  | Expected                                                              | Actual                                               | Status  | Run Date | Evidence                         |
| ------------------------ | --------------------------------------------------------------- | :---------: | :---: | --------------------------------------------------------------------- | ---------------------------------------------------- | ------- | -------- | -------------------------------- |
| 11-save-BRT-load-IST     | Save in BRT, load in IST                                        |     BRT     |  IST  | Display OK; DB query mismatch                                         | Display OK confirmed; DB not queried                 | PARTIAL | —        | [tc-2-4](tc-2-4-cross-tz-brt.md) |
| 11-save-IST-load-BRT     | Save in IST, load in BRT                                        |     IST     |  BRT  | —                                                                     | —                                                    | PENDING | —        | —                                |
| 11-roundtrip-cross       | BRT save → IST load → round-trip → BRT reload                   | BRT→IST→BRT |   —   | Compound drift from mixed offsets                                     | —                                                    | PENDING | —        | —                                |
| 11-concurrent-edit       | User A (BRT) + User B (IST) edit same record                    |     BRT     |  IST  | Overwrite with different UTC moment for "same" date                   | —                                                    | PENDING | —        | —                                |
| 11-report-cross          | Query DB for dates entered from different TZs                   |    mixed    |   —   | Inconsistent SQL results                                              | Identified theoretically (see results.md § Test 2.4) | PENDING | —        | results.md                       |
| 11-load-UTC0             | BRT-saved record loaded in UTC+0                                |     BRT     | UTC+0 | No fake-Z drift (Z happens to be correct)                             | —                                                    | PENDING | —        | —                                |
| 11-load-PST              | BRT-saved record loaded in PST (UTC-8)                          |     BRT     |  PST  | -8h/trip drift on round-trip                                          | —                                                    | PENDING | —        | —                                |
| 11-load-Tokyo            | BRT-saved record loaded in JST (UTC+9)                          |     BRT     |  JST  | +9h/trip drift on round-trip                                          | —                                                    | PENDING | —        | —                                |
| 11-A-save-BRT-load-IST   | Config A: save in BRT, load in IST                              |     BRT     |  IST  | Bug #7 on load: stored `"2026-03-15"` → IST displays `"2026-03-14"`   | —                                                    | PENDING | —        | —                                |
| 11-B-save-BRT-load-IST   | Config B: save in BRT, load in IST                              |     BRT     |  IST  | Same as A-BRT-IST (ignoreTZ no effect on date-only load path)         | —                                                    | PENDING | —        | —                                |
| 11-C-save-BRT-load-IST   | Config C: save in BRT, load in IST                              |     BRT     |  IST  | Stable: Config C stores real UTC; IST reload shows correct local time | —                                                    | PENDING | —        | —                                |
| 11-D-concurrent-IST-edit | Config D: User A (IST) edits, User B (BRT) re-edits same record |     IST     |  BRT  | Fake Z interpreted differently per TZ → compound drift between users  | —                                                    | PENDING | —        | —                                |

---

### Group: Verification

## 12 — Edge Cases

**Bugs exercised**: Bug #5 (drift at boundaries), Bug #6 (empty value)

| Test ID                   | Config |  TZ   | Description                   | Value                        | Expected                                                                       | Actual                                                                    | Status  | Run Date | Evidence   |
| ------------------------- | :----: | :---: | ----------------------------- | ---------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ------- | -------- | ---------- |
| 12-near-midnight-1        |   D    |  BRT  | UTC input near midnight       | `"2026-03-15T00:30:00.000Z"` | Day crosses on input (BRT = Mar 14 21:30) + fake Z double jeopardy             | Stored `"2026-03-14T21:30:00"` (day crossed); GFV adds fake Z (confirmed) | FAIL    | —        | results.md |
| 12-near-midnight-1-IST    |   D    |  IST  | UTC input near midnight, IST  | `"2026-03-15T00:30:00.000Z"` | IST = Mar 15 06:00 — no day cross on input; drift still +5:30h/trip            | —                                                                         | PENDING | —        | —          |
| 12-near-midnight-2        |   D    |  BRT  | Local time near midnight      | `"2026-03-15T23:00:00"`      | 23:00→20:00→17:00→... (-3h/trip)                                               | 1 trip: 23:00→20:00 (−3h confirmed)                                       | FAIL    | —        | results.md |
| 12-near-midnight-2-IST    |   D    |  IST  | Local time near midnight, IST | `"2026-03-15T23:00:00"`      | 1 trip: +5:30h → `"2026-03-16T04:30:00"` — day crosses FORWARD                 | —                                                                         | PENDING | —        | —          |
| 12-dst-transition         |   D    |  BRT  | US DST change day             | `"2026-03-08T02:00:00"`      | -3h drift from BRT — no DST anomaly (Brazil has no DST)                        | -3h BRT drift confirmed; no DST anomaly                                   | PASS    | —        | results.md |
| 12-dst-US-PST             |   D    |  PST  | US DST spring-forward         | `"2026-03-08T02:00:00"`      | PST→PDT: does 2AM→3AM skip create anomaly beyond standard -8h Bug #5 drift?    | —                                                                         | PENDING | —        | —          |
| 12-dst-brazil             |   D    |   —   | Brazil DST                    | —                            | Brazil no longer uses DST                                                      | —                                                                         | SKIP    | —        | —          |
| 12-year-boundary          |   D    |  BRT  | Jan 1 midnight                | `"2026-01-01T00:00:00"`      | 1 trip → `"2025-12-31T21:00:00"` — year boundary crossed                       | 1 trip → `"2025-12-31T21:00:00"` (year crossed confirmed)                 | FAIL    | —        | results.md |
| 12-year-boundary-IST      |   D    |  IST  | Jan 1 midnight, IST           | `"2026-01-01T00:00:00"`      | 1 trip: +5:30h → `"2026-01-01T05:30:00"` — stays in 2026 (opposite of BRT)     | —                                                                         | PENDING | —        | —          |
| 12-leap-day               |   D    |  BRT  | Feb 29 on leap year           | `"2028-02-29T00:00:00"`      | 1 trip → `"2028-02-28T21:00:00"` — leap day lost                               | 1 trip → `"2028-02-28T21:00:00"` (leap day lost confirmed)                | FAIL    | —        | results.md |
| 12-leap-day-IST           |   D    |  IST  | Feb 29 on leap year, IST      | `"2028-02-29T00:00:00"`      | 1 trip: +5:30h → `"2028-02-29T05:30:00"` — leap day NOT lost (opposite of BRT) | —                                                                         | PENDING | —        | —          |
| 12-empty-value            |   D    |  any  | Empty / null date             | `""` or `null`               | GFV returns truthy `"Invalid Date"` (Bug #6)                                   | `"Invalid Date"` (truthy string — Bug #6 confirmed)                       | FAIL    | —        | results.md |
| 12-null-input             |   D    |  any  | Explicit null input           | `null`                       | Is `null` distinct from `""` for SFV? Expect same Bug #6 behavior.             | —                                                                         | PENDING | —        | —          |
| 12-empty-Config-A         |   A    |  any  | Empty Config A                | `""`                         | GFV return `""` — is Bug #6 D-only or affects A?                               | —                                                                         | PENDING | —        | —          |
| 12-empty-Config-C         |   C    |  any  | Empty Config C                | `""`                         | GFV return `""` — is Bug #6 D-only or affects C?                               | —                                                                         | PENDING | —        | —          |
| 12-utc-0-control          |   D    | UTC+0 | Round-trip at UTC+0           | `"2026-03-15T00:00:00"`      | Fake Z coincidentally correct → 0 drift per trip                               | —                                                                         | PENDING | —        | —          |
| 12-config-C-near-midnight |   C    |  BRT  | Round-trip near midnight      | `"2026-03-15T23:00:00"`      | 1 trip: stable (real UTC, no fake Z → no drift). Control for Bug #5.           | —                                                                         | PENDING | —        | —          |
| 12-invalid-string         |   D    |  BRT  | Invalid string                | `"not-a-date"`               | Silently ignored, field retains previous value                                 | Field unchanged; no error thrown (confirmed)                              | PASS    | —        | results.md |
| 12-far-future             |   D    |  BRT  | Year 2099                     | `"2099-12-31T00:00:00"`      | Standard -3h drift, no special issue                                           | -3h drift; no special issue (confirmed)                                   | PASS    | —        | results.md |
| 12-pre-epoch              |   D    |  BRT  | Year 1969                     | `"1969-12-31T00:00:00"`      | Standard -3h drift, handles negative epoch                                     | -3h drift; negative epoch handled correctly (confirmed)                   | PASS    | —        | results.md |

---

## 13 — Database

Direct DB query to verify stored values. Requires SQL access to the VisualVault database.
**Bugs exercised**: structural mixed UTC/local storage

| Test ID                 | Description                                                                    | Expected                                                                                 | Actual                                    | Status  | Run Date | Evidence                                      |
| ----------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------- | ------- | -------- | --------------------------------------------- |
| 13-initial-values       | Initial/preset date fields store UTC (via `new Date().toISOString()`)          | UTC datetime in raw SQL                                                                  | UTC datetime confirmed in raw SQL         | PASS    | —        | [tc-2-10](tc-2-10-db-storage-mixed-tz-brt.md) |
| 13-user-input           | User-input fields store local time (via `getSaveValue()` strips Z)             | Local time string without Z in raw SQL                                                   | Local time without Z confirmed in raw SQL | PASS    | —        | [tc-2-10](tc-2-10-db-storage-mixed-tz-brt.md) |
| 13-after-roundtrip      | DB values after Bug #5 drift (save after round-trip, check raw SQL)            | `"2026-03-14T00:00:00"` after 8 BRT round-trips                                          | —                                         | PENDING | —        | —                                             |
| 13-cross-tz-save        | DB values for a record saved from IST                                          | IST local time (UTC-equiv): e.g. `"2026-03-14T18:30:00"`                                 | —                                         | PENDING | —        | —                                             |
| 13-ws-input             | DB values when date set via web service / scheduled script                     | Same as equivalent Cat 7/10 web-service input results                                    | —                                         | PENDING | —        | —                                             |
| 13-query-consistency    | SQL date range query for same logical date entered from BRT vs IST             | Query returns different row counts (inconsistent)                                        | —                                         | PENDING | —        | —                                             |
| 13-B-storage            | Raw DB value for Config B vs Config A                                          | Same storage format as Config A (ignoreTZ has no effect on date-only)                    | —                                         | PENDING | —        | —                                             |
| 13-C-vs-D-storage       | SQL comparison: Config C vs Config D storage for BRT midnight                  | Config C: `"2026-03-14T21:00:00"` (UTC-equiv); Config D: `"2026-03-15T00:00:00"` (local) | —                                         | PENDING | —        | —                                             |
| 13-multi-roundtrip-db   | Raw SQL after 8 BRT round-trips on Config D                                    | `"2026-03-14T00:00:00"` (drifted -24h from `"2026-03-15T00:00:00"`)                      | —                                         | PENDING | —        | —                                             |
| 13-preset-vs-user-input | Config A: preset field vs user-input field — same logical date, SQL comparison | Two different raw SQL values for same logical date (UTC Date obj vs local string)        | —                                         | PENDING | —        | —                                             |
