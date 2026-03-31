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

`✓ Pass` = ran, no bug triggered. `✗ Fail` = ran, bug confirmed. `Pending` = not yet run, no blocker. `Blocked` = requires access/setup not currently available.

| Category                 |   Total   | ✓ Pass  | ✗ Fail  | Pending  | Blocked |
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

Cat 3: 3-D-BRT-IST and 5-A-BRT are structural partials (display correct, DB stores mixed UTC/local). Cat 12: 12-dst-brazil skipped — Brazil no longer uses DST. Cat 8: 8-A was previously shown as DONE ✓; 8-B was incorrectly listed as done — corrected to NOT TESTED.

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

## Category 1: User Input — Calendar Popup

Select a date via popup calendar. For DateTime fields, select time then click Set.
**Bugs exercised**: Bug #7 (IST, date-only configs A/B), Bug #5 (IST/BRT, DateTime configs C/D), Bug #2 (legacy)

| Test ID  | Config |  TZ   | Date Selected   | Expected Raw                                                                 | Status           |
| -------- | :----: | :---: | --------------- | ---------------------------------------------------------------------------- | ---------------- |
| 1-A-BRT  |   A    |  BRT  | Mar 15          | `"2026-03-15"`                                                               | DONE ✓           |
| 1-B-BRT  |   B    |  BRT  | Mar 15          | `"2026-03-15"`                                                               | DONE ✓           |
| 1-C-BRT  |   C    |  BRT  | Mar 15 12:00 AM | `"2026-03-15T00:00:00"`                                                      | DONE ✓           |
| 1-D-BRT  |   D    |  BRT  | Mar 15 12:00 AM | `"2026-03-15T00:00:00"`                                                      | DONE ✓           |
| 1-A-IST  |   A    |  IST  | Mar 15          | `"2026-03-13"` (Date obj → -2 days)                                          | PENDING          |
| 1-B-IST  |   B    |  IST  | Mar 15          | `"2026-03-13"` (same as A-IST — ignoreTZ no effect on date-only)             | PENDING          |
| 1-C-IST  |   C    |  IST  | Mar 15 12:00 AM | `"2026-03-14T18:30:00"` (IST midnight = UTC 18:30 prev day; stored as local) | PENDING          |
| 1-D-IST  |   D    |  IST  | Mar 15 12:00 AM | `"2026-03-14T18:30:00"` (same storage; GFV adds fake Z → Bug #5 +5:30h/trip) | PENDING          |
| 1-A-UTC0 |   A    | UTC+0 | Mar 15          | `"2026-03-15"` (UTC+0 midnight = UTC midnight; no shift — control)           | PENDING          |
| 1-D-UTC0 |   D    | UTC+0 | Mar 15 12:00 AM | `"2026-03-15T00:00:00"` (fake Z coincidentally correct; round-trip stable)   | PENDING          |
| 1-E-BRT  |   E    |  BRT  | Mar 15          | —                                                                            | BLOCKED (legacy) |
| 1-F-BRT  |   F    |  BRT  | Mar 15          | —                                                                            | BLOCKED (legacy) |
| 1-G-BRT  |   G    |  BRT  | Mar 15 12:00 AM | —                                                                            | BLOCKED (legacy) |
| 1-H-BRT  |   H    |  BRT  | Mar 15 12:00 AM | —                                                                            | BLOCKED (legacy) |

> **IST note**: Popup creates a `Date` object at local midnight. `normalizeCalValue()` V1 Date-object branch: `Date→toISO("2026-03-14T18:30:00.000Z")`, strips T → `"2026-03-14"`, re-parses as local midnight → double shift, **-2 days**. Expected to differ from Category 2 IST (typed → -1 day). Needs live test to confirm.
> **C/D IST note**: For DateTime configs, popup creates a Date at IST midnight (= 2026-03-14T18:30:00Z). `getSaveValue()` stores local-time string without Z → `"2026-03-14T18:30:00"`. On reload in IST this re-parses as local → shows 18:30 IST (not midnight). Config D adds fake Z on GFV making round-trips drift +5:30h each pass.
> **UTC+0 note**: UTC+0 midnight = UTC midnight. Bug #7 shift is zero (correct day stored). Config D fake Z coincidentally correct → zero round-trip drift. These are control tests confirming the UTC+0 boundary.

---

## Category 2: User Input — Typed Input

Type a date directly in the input field (segment-by-segment keyboard entry).
**Bugs exercised**: Bug #7 (IST, date-only configs A/B), Bug #5 (IST/BRT, DateTime configs C/D), Bug #2 (legacy)

| Test ID | Config | TZ  | Date Typed          | Expected Raw                                                                  | Status                 |
| ------- | :----: | :-: | ------------------- | ----------------------------------------------------------------------------- | ---------------------- |
| 2-A-BRT |   A    | BRT | 03/15/2026          | `"2026-03-15"`                                                                | DONE ✓ (matches popup) |
| 2-B-BRT |   B    | BRT | 03/15/2026          | `"2026-03-15"`                                                                | DONE ✓ (matches popup) |
| 2-C-BRT |   C    | BRT | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"`                                                       | DONE ✓ (matches popup) |
| 2-D-BRT |   D    | BRT | 03/15/2026 12:00 AM | `"2026-03-15T00:00:00"`                                                       | DONE ✓ (matches popup) |
| 2-A-IST |   A    | IST | 03/15/2026          | `"2026-03-14"` (-1 day — string path)                                         | PENDING                |
| 2-B-IST |   B    | IST | 03/15/2026          | `"2026-03-14"` (same as A-IST — ignoreTZ no effect on date-only)              | PENDING                |
| 2-C-IST |   C    | IST | 03/15/2026 12:00 AM | `"2026-03-14T18:30:00"` (typed string → local midnight → stored as UTC-equiv) | PENDING                |
| 2-D-IST |   D    | IST | 03/15/2026 12:00 AM | `"2026-03-14T18:30:00"` (same; GFV adds fake Z → Bug #5 +5:30h/trip)          | PENDING                |
| 2-E-BRT |   E    | BRT | 03/15/2026          | —                                                                             | BLOCKED (legacy)       |
| 2-F-BRT |   F    | BRT | 03/15/2026          | —                                                                             | BLOCKED (legacy)       |
| 2-G-BRT |   G    | BRT | 03/15/2026 12:00 AM | —                                                                             | BLOCKED (legacy)       |
| 2-H-BRT |   H    | BRT | 03/15/2026 12:00 AM | —                                                                             | BLOCKED (legacy)       |

> **IST note**: Typed input creates a string → `normalizeCalValue()` string path → single local-midnight conversion → **-1 day**. Expected `"2026-03-14"` while popup (1-A-IST) expected `"2026-03-13"` — same intended date, different stored values. This is Bug #7's asymmetry between Date object (popup) and string (typed) paths.
> **C/D IST note**: Typed input for DateTime fields in IST takes the string path (no Date-object double-shift). Both paths store the same UTC-equivalent `"2026-03-14T18:30:00"` for IST midnight, so popup and typed _should_ agree for C/D — unlike A/B where they diverge. Needs live confirmation.

---

## Category 3: Server Reload

Save form, open saved record in a new tab. Compare displayed dates and GFV return with original.
**Bugs exercised**: structural DB mixed-TZ storage, Bug #7 (IST load of date-only fields)

| Test ID     | Config | Save TZ | Load TZ | Status                                                                                                |
| ----------- | :----: | :-----: | :-----: | ----------------------------------------------------------------------------------------------------- |
| 3-A-BRT-BRT |   A    |   BRT   |   BRT   | DONE ✓ (no shift)                                                                                     |
| 3-C-BRT-BRT |   C    |   BRT   |   BRT   | DONE ✓ (no shift)                                                                                     |
| 3-D-BRT-BRT |   D    |   BRT   |   BRT   | DONE ✓ (no shift)                                                                                     |
| 3-D-BRT-IST |   D    |   BRT   |   IST   | DONE ✓ (display OK; GFV same fake Z — Config D is TZ-invariant)                                       |
| 3-A-BRT-IST |   A    |   BRT   |   IST   | NOT TESTED (key Bug #7 load-path test: stored "2026-03-15" should display as "2026-03-14" in IST)     |
| 3-C-BRT-IST |   C    |   BRT   |   IST   | NOT TESTED (control: Config C stores real UTC; IST reload should show correct local time)             |
| 3-D-IST-BRT |   D    |   IST   |   BRT   | PENDING — save from IST required (DateTest-000009 was not saved)                                      |
| 3-B-BRT-BRT |   B    |   BRT   |   BRT   | NOT TESTED (Config B baseline reload — ignoreTZ=true, date-only; expected same as A-BRT-BRT)          |
| 3-B-BRT-IST |   B    |   BRT   |   IST   | NOT TESTED (Config B cross-TZ; Bug #7 on load same as A-BRT-IST prediction)                           |
| 3-A-IST-BRT |   A    |   IST   |   BRT   | NOT TESTED (save from IST with Bug #7 baked in — wrong day permanently stored; verify display in BRT) |
| 3-C-IST-BRT |   C    |   IST   |   BRT   | NOT TESTED (Config C from IST: stored as IST-offset UTC-equiv; BRT reload should show different time) |
| 3-B-IST-BRT |   B    |   IST   |   BRT   | NOT TESTED (same as A-IST-BRT — ignoreTZ no effect on date-only)                                      |
| 3-ALL-E-H   |  E–H   |   any   |   any   | BLOCKED (legacy)                                                                                      |

> **Structural partial**: Tests 3-D-BRT-BRT and 3-A-BRT-BRT show correct display but DB stores UTC for initial-value fields and local time for user-input fields — same logical date has different stored representations. Not a discrete visible failure, but affects SQL range queries.

---

## Category 4: URL Parameters

Open form with date pre-filled via URL query string.
**Bugs exercised**: Bug #1 (`parseDateString` strips Z on load)
**Blocker**: Requires fields with `enableQListener=true` — not present in current test form.

| Test ID          | Config | TZ  | URL Value                         | Expected Behavior                            | Status     |
| ---------------- | :----: | :-: | --------------------------------- | -------------------------------------------- | ---------- |
| 4-D-Z            |   D    | BRT | `?field=2026-03-15T00:00:00.000Z` | `parseDateString` strips Z → stored as local | NOT TESTED |
| 4-D-noZ          |   D    | BRT | `?field=2026-03-15T00:00:00`      | treated as local                             | NOT TESTED |
| 4-C-Z            |   C    | BRT | `?field=2026-03-15T00:00:00.000Z` | `parseDateString` strips Z                   | NOT TESTED |
| 4-A-dateonly     |   A    | BRT | `?field=2026-03-15`               | should show March 15                         | NOT TESTED |
| 4-D-midnight-IST |   D    | IST | `?field=2026-03-15T00:00:00.000Z` | may shift to Mar 15 05:30 on load            | NOT TESTED |

---

## Category 5: Preset Date Default

Form template with a specific preset date configured in field settings.
**Bugs exercised**: Bug #7 (IST, date-only preset), potential Bug #3 (V2 `initCalendarValueV2` hardcodes `enableTime`)
**Blocker for C/D**: Requires new test form fields with `enableTime=true` + preset initial value.

| Test ID      | Config | Preset   |  TZ   | Expected                                                                                          | Status                                                           |
| ------------ | :----: | -------- | :---: | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 5-A-BRT      |   A    | 3/1/2026 |  BRT  | `"2026-03-01"` / Date obj                                                                         | DONE ✓ (DataField2 — display correct, stored as UTC Date object) |
| 5-B-BRT      |   B    | 3/1/2026 |  BRT  | `"2026-03-01"`                                                                                    | NOT TESTED                                                       |
| 5-C-BRT      |   C    | 3/1/2026 |  BRT  | —                                                                                                 | NOT TESTED (needs DateTime field with preset)                    |
| 5-D-BRT      |   D    | 3/1/2026 |  BRT  | —                                                                                                 | NOT TESTED (needs DateTime field with preset)                    |
| 5-A-IST      |   A    | 3/1/2026 |  IST  | `"2026-02-28"` (Bug #7 prediction: -1 day)                                                        | NOT TESTED                                                       |
| 5-B-IST      |   B    | 3/1/2026 |  IST  | `"2026-02-28"` (ignoreTZ=true does not protect preset — same Bug #7 path as A)                    | NOT TESTED                                                       |
| 5-A-UTC0     |   A    | 3/1/2026 | UTC+0 | `"2026-03-01"` (UTC+0 midnight = UTC midnight; no shift — Bug #7 boundary control)                | NOT TESTED                                                       |
| 5-A-PST      |   A    | 3/1/2026 |  PST  | `"2026-03-01"` (UTC-8 midnight = UTC+8h; same UTC day → correct; confirms Bug #7 UTC- unaffected) | NOT TESTED                                                       |
| 5-ALL-legacy |  E–H   | 3/1/2026 |  any  | —                                                                                                 | BLOCKED (legacy)                                                 |

---

## Category 6: Current Date Default

Form template with "Current Date" as the initial value.
**Bugs exercised**: baseline/control for UTC vs local storage; no active bug predicted for BRT
**Blocker for C/D**: Requires new test form fields with `enableTime=true` + current-date initial value.

| Test ID      | Config |  TZ   | Expected                       | Status                                                                                |
| ------------ | :----: | :---: | ------------------------------ | ------------------------------------------------------------------------------------- |
| 6-A-BRT      |   A    |  BRT  | Date obj with current UTC time | DONE ✓ (DataField1 — correct, UTC stored)                                             |
| 6-B-BRT      |   B    |  BRT  | —                              | NOT TESTED (Config B current-date — ignoreTZ=true, date-only; expected same as A-BRT) |
| 6-C-BRT      |   C    |  BRT  | —                              | NOT TESTED (needs DateTime field with currentDate)                                    |
| 6-D-BRT      |   D    |  BRT  | —                              | NOT TESTED (needs DateTime field with currentDate)                                    |
| 6-A-IST      |   A    |  IST  | Today's date in IST            | NOT TESTED                                                                            |
| 6-B-IST      |   B    |  IST  | Today's date in IST            | NOT TESTED (same Bug #7 surface as A-IST — ignoreTZ no effect)                        |
| 6-A-UTC0     |   A    | UTC+0 | Today's date in UTC+0          | NOT TESTED (current date at UTC+0 midnight = UTC midnight; no shift — control)        |
| 6-ALL-legacy |  E–H   |  any  | —                              | BLOCKED (legacy)                                                                      |

---

## Category 7: Developer API — SetFieldValue Input Formats

Different input formats passed to `VV.Form.SetFieldValue()`.
**Bugs exercised**: Bug #7 (IST, date-only configs A/B), input-format sensitivity in Config C

| Test ID          | Config | TZ  | Input Value                  | Input Type    | Expected Stored                                                                     | Status                                      |
| ---------------- | :----: | :-: | ---------------------------- | ------------- | ----------------------------------------------------------------------------------- | ------------------------------------------- |
| 7-D-dateObj      |   D    | BRT | `new Date(2026,2,15)`        | Date object   | `"2026-03-15T00:00:00"`                                                             | DONE ✓                                      |
| 7-D-isoZ         |   D    | BRT | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-14T21:00:00"` (shifted!)                                                  | DONE ✗                                      |
| 7-D-isoNoZ       |   D    | BRT | `"2026-03-15T00:00:00"`      | ISO without Z | `"2026-03-15T00:00:00"`                                                             | DONE ✓ (GFV adds fake Z)                    |
| 7-D-dateOnly     |   D    | BRT | `"2026-03-15"`               | Date string   | `"2026-03-15T00:00:00"`                                                             | DONE ✓ (GFV adds fake Z)                    |
| 7-D-usFormat     |   D    | BRT | `"03/15/2026"`               | US format     | `"2026-03-15T00:00:00"`                                                             | DONE ✓ (GFV adds fake Z)                    |
| 7-D-usFormatTime |   D    | BRT | `"03/15/2026 12:00:00 AM"`   | US + time     | `"2026-03-15T00:00:00"`                                                             | DONE ✓ (GFV adds fake Z)                    |
| 7-D-epoch        |   D    | BRT | `1773543600000`              | Unix ms       | `"2026-03-15T00:00:00"`                                                             | DONE ✓ (GFV adds fake Z)                    |
| 7-D-isoZ-IST     |   D    | IST | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-15T05:30:00"` (UTC→IST +5:30h; different shift from BRT)                  | NOT TESTED                                  |
| 7-D-dateObj-IST  |   D    | IST | `new Date(2026,2,15)`        | Date object   | `"2026-03-14T18:30:00"` (IST midnight stored as UTC-equiv)                          | NOT TESTED                                  |
| 7-D-isoNoZ-IST   |   D    | IST | `"2026-03-15T00:00:00"`      | ISO without Z | `"2026-03-15T00:00:00"` (local treated as IST; GFV fake Z → +5:30h/trip)            | NOT TESTED                                  |
| 7-C-isoZ         |   C    | BRT | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-14T21:00:00"` (UTC→local)                                                 | DONE ✗ (day crosses in DB; GFV correct UTC) |
| 7-C-isoNoZ       |   C    | BRT | `"2026-03-15T00:00:00"`      | ISO without Z | `"2026-03-15T00:00:00"`                                                             | DONE ✓ (GFV real UTC)                       |
| 7-C-dateOnly     |   C    | BRT | `"2026-03-15"`               | Date string   | `"2026-03-15T00:00:00"` (midnight appended; GFV real UTC)                           | NOT TESTED                                  |
| 7-C-dateObj      |   C    | BRT | `new Date(2026,2,15)`        | Date object   | `"2026-03-15T00:00:00"` (BRT midnight stored as local time)                         | NOT TESTED                                  |
| 7-C-usFormat     |   C    | BRT | `"03/15/2026"`               | US format     | `"2026-03-15T00:00:00"`                                                             | NOT TESTED                                  |
| 7-C-usFormatTime |   C    | BRT | `"03/15/2026 12:00:00 AM"`   | US + time     | `"2026-03-15T00:00:00"`                                                             | NOT TESTED                                  |
| 7-C-epoch        |   C    | BRT | `1773543600000`              | Unix ms       | `"2026-03-15T00:00:00"` (BRT midnight in ms)                                        | NOT TESTED                                  |
| 7-A-dateOnly     |   A    | BRT | `"2026-03-15"`               | Date string   | `"2026-03-15"`                                                                      | DONE ✓                                      |
| 7-A-isoZ         |   A    | BRT | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-15"` (date extracted)                                                     | DONE ✓                                      |
| 7-A-dateObj-BRT  |   A    | BRT | `new Date(2026,2,15)`        | Date object   | `"2026-03-15"` (BRT baseline — same day; needed to contextualize IST -2 day result) | NOT TESTED                                  |
| 7-A-isoNoZ       |   A    | BRT | `"2026-03-15T00:00:00"`      | ISO without Z | `"2026-03-15"` (time component stripped)                                            | NOT TESTED                                  |
| 7-A-usFormat     |   A    | BRT | `"03/15/2026"`               | US format     | `"2026-03-15"`                                                                      | NOT TESTED                                  |
| 7-A-usFormatTime |   A    | BRT | `"03/15/2026 12:00:00 AM"`   | US + time     | `"2026-03-15"` (time stripped for date-only config)                                 | NOT TESTED                                  |
| 7-A-epoch        |   A    | BRT | `1773543600000`              | Unix ms       | `"2026-03-15"`                                                                      | NOT TESTED                                  |
| 7-A-dateOnly-IST |   A    | IST | `"2026-03-15"`               | Date string   | `"2026-03-14"` (Bug #7: -1 day)                                                     | DONE ✗                                      |
| 7-A-dateObj-IST  |   A    | IST | `new Date(2026,2,15)`        | Date object   | `"2026-03-13"` (Bug #7: -2 days)                                                    | DONE ✗                                      |
| 7-B-dateOnly-BRT |   B    | BRT | `"2026-03-15"`               | Date string   | `"2026-03-15"` (ignoreTZ=true; same behavior as A-BRT)                              | NOT TESTED                                  |
| 7-B-isoZ-BRT     |   B    | BRT | `"2026-03-15T00:00:00.000Z"` | ISO with Z    | `"2026-03-15"` (same as A-isoZ)                                                     | NOT TESTED                                  |
| 7-B-dateObj-BRT  |   B    | BRT | `new Date(2026,2,15)`        | Date object   | `"2026-03-15"` (BRT baseline; same as A-dateObj-BRT)                                | NOT TESTED                                  |
| 7-B-dateOnly-IST |   B    | IST | `"2026-03-15"`               | Date string   | `"2026-03-14"` (Bug #7: -1 day; same as A-dateOnly-IST)                             | NOT TESTED                                  |
| 7-B-dateObj-IST  |   B    | IST | `new Date(2026,2,15)`        | Date object   | `"2026-03-13"` (Bug #7: -2 days; same as A-dateObj-IST)                             | NOT TESTED                                  |
| 7-ALL-legacy     |  E–H   | any | various                      | various       | —                                                                                   | BLOCKED (legacy)                            |

---

## Category 8: Developer API — GetFieldValue Return Format

Return value for each configuration from `VV.Form.GetFieldValue()`.
**Bugs exercised**: Bug #5 (Config D fake Z), Bug #6 (empty Config D — scope for other configs unknown)

| Test ID         | Config |  TZ   | Stored Raw              | Expected Return                                                            | Status           |
| --------------- | :----: | :---: | ----------------------- | -------------------------------------------------------------------------- | ---------------- |
| 8-A             |   A    |  any  | `"2026-03-15"`          | `"2026-03-15"`                                                             | DONE ✓           |
| 8-B             |   B    |  any  | `"2026-03-15"`          | `"2026-03-15"` (ignoreTZ=true; date-only — expected same return as A)      | NOT TESTED       |
| 8-C-BRT         |   C    |  BRT  | `"2026-03-15T00:00:00"` | `"2026-03-15T03:00:00.000Z"` (real UTC)                                    | DONE ✓           |
| 8-C-IST         |   C    |  IST  | `"2026-03-15T00:00:00"` | `"2026-03-14T18:30:00.000Z"` (real UTC from IST)                           | DONE ✓           |
| 8-C-UTC0        |   C    | UTC+0 | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` (real UTC at UTC+0 = stored value)            | NOT TESTED       |
| 8-D-BRT         |   D    |  BRT  | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` (**FAKE Z**)                                  | DONE ✗           |
| 8-D-IST         |   D    |  IST  | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` (**FAKE Z** — same string, TZ-invariant)      | DONE ✗           |
| 8-D-UTC0        |   D    | UTC+0 | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` (fake Z, but coincidentally correct at UTC+0) | NOT TESTED       |
| 8-D-empty       |   D    |  any  | `""`                    | `""` (expected) / `"Invalid Date"` (**Bug #6**)                            | DONE ✗           |
| 8-D-empty-IST   |   D    |  IST  | `""`                    | `"Invalid Date"` (Bug #6 expected TZ-independent — confirm same behavior)  | NOT TESTED       |
| 8-A-empty       |   A    |  any  | `""`                    | `""` (expected — is Bug #6 D-only or affects all configs?)                 | NOT TESTED       |
| 8-C-empty       |   C    |  any  | `""`                    | `""` (expected — is Bug #6 D-only?)                                        | NOT TESTED       |
| 8-E through 8-H |  E–H   |  any  | various                 | —                                                                          | BLOCKED (legacy) |
| 8-V2            |  any   |  any  | any                     | raw value unchanged (`useUpdatedCalendarValueLogic=true`)                  | NOT TESTED       |

---

## Category 9: Round-Trip — SetFieldValue(GetFieldValue())

Call `SetFieldValue(field, GetFieldValue(field))` and measure date drift.
**Bugs exercised**: Bug #5 (Config D — each trip drifts by TZ offset)

| Test ID      | Config |  TZ   | Trips | Expected Shift                                                 | Status           |
| ------------ | :----: | :---: | :---: | -------------------------------------------------------------- | ---------------- |
| 9-D-BRT-1    |   D    |  BRT  |   1   | -3h                                                            | DONE ✗           |
| 9-D-BRT-3    |   D    |  BRT  |   3   | -9h (crosses midnight, same day)                               | NOT TESTED       |
| 9-D-BRT-8    |   D    |  BRT  |   8   | -24h (full day lost)                                           | DONE ✗           |
| 9-D-BRT-10   |   D    |  BRT  |  10   | -30h                                                           | DONE ✗           |
| 9-D-IST-1    |   D    |  IST  |   1   | +5:30h                                                         | DONE ✗           |
| 9-D-IST-5    |   D    |  IST  |   5   | +27:30h → day crosses                                          | DONE ✗           |
| 9-D-IST-8    |   D    |  IST  |   8   | +44h → ~+1d20h (full day gained after ~5 trips)                | NOT TESTED       |
| 9-D-IST-10   |   D    |  IST  |  10   | +55h → +2d7h (mirror of BRT-10 but forward not backward)       | NOT TESTED       |
| 9-D-UTC0     |   D    | UTC+0 |   1   | 0 (fake Z coincidentally correct → stable)                     | NOT TESTED       |
| 9-D-PST-1    |   D    |  PST  |   1   | -8h                                                            | NOT TESTED       |
| 9-D-JST-1    |   D    |  JST  |   1   | +9h (UTC+9 — most extreme positive offset tested)              | NOT TESTED       |
| 9-C-BRT-1    |   C    |  BRT  |   1   | 0 (stable)                                                     | DONE ✓           |
| 9-C-IST-1    |   C    |  IST  |   1   | 0 (stable)                                                     | DONE ✓           |
| 9-A-any      |   A    |  any  |   1   | 0 (stable)                                                     | DONE ✓           |
| 9-B-any      |   B    |  any  |   1   | 0 (stable)                                                     | DONE ✓           |
| 9-B-IST      |   B    |  IST  |   1   | 0 (stable — ignoreTZ=true on date-only; confirm same as A-any) | NOT TESTED       |
| 9-ALL-legacy |  E–H   |  any  |   1   | unknown                                                        | BLOCKED (legacy) |

---

## Category 10: Web Service / External Script — SetFieldValue from Code

Simulate a scheduled script, form button event, or REST API call setting a date value.
**Bugs exercised**: Bug #7 (date-only, UTC+ server?), input format sensitivity in all configs
**Blocker**: Requires a Node.js test script to send values via `VVRestApi`.

| Test ID                | Config | Source           | Value                             | Expected Result                          | Status     |
| ---------------------- | :----: | ---------------- | --------------------------------- | ---------------------------------------- | ---------- |
| 10-D-ws-isoZ           |   D    | Web service JSON | `"2026-03-15T00:00:00.000Z"`      | Stored as local (shifted?)               | NOT TESTED |
| 10-D-ws-isoNoZ         |   D    | Web service JSON | `"2026-03-15T00:00:00"`           | Stored as-is                             | NOT TESTED |
| 10-D-ws-dateOnly       |   D    | Web service JSON | `"2026-03-15"`                    | Midnight appended                        | NOT TESTED |
| 10-D-ws-dotnet         |   D    | .NET DateTime    | `"2026-03-15T00:00:00.000+00:00"` | —                                        | NOT TESTED |
| 10-D-ws-epoch          |   D    | Epoch ms         | `1773784800000`                   | —                                        | NOT TESTED |
| 10-C-ws-isoZ           |   C    | Web service JSON | `"2026-03-15T00:00:00.000Z"`      | UTC→local (Mar 14 in BRT)                | NOT TESTED |
| 10-A-ws-isoZ           |   A    | Web service JSON | `"2026-03-15T00:00:00.000Z"`      | `"2026-03-15"` (date extracted)          | NOT TESTED |
| 10-A-ws-dateOnly       |   A    | Web service JSON | `"2026-03-15"`                    | `"2026-03-15"`                           | NOT TESTED |
| 10-D-ws-midnight-cross |   D    | Web service      | `"2026-03-15T02:00:00.000Z"`      | In BRT: Mar 14 23:00 (crosses midnight!) | NOT TESTED |
| 10-D-script-scheduled  |   D    | Scheduled script | `response.data.date`              | —                                        | NOT TESTED |
| 10-D-script-button     |   D    | Form button      | `VV.Form.SetFieldValue(...)`      | Same as Cat 7 — no new behavior expected | NOT TESTED |

---

## Category 11: Cross-Timezone — Multi-User Scenarios

**Bugs exercised**: Bug #5 (compound drift when different users edit), structural DB inconsistency

| Test ID                  | Action                                                          |    TZ 1     | TZ 2  | Expected Issue                                                                                   | Status                                       |
| ------------------------ | --------------------------------------------------------------- | :---------: | :---: | ------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| 11-save-BRT-load-IST     | Save in BRT, load in IST                                        |     BRT     |  IST  | Display OK; DB query mismatch                                                                    | PARTIAL ✓ (display verified; DB not queried) |
| 11-save-IST-load-BRT     | Save in IST, load in BRT                                        |     IST     |  BRT  | —                                                                                                | NOT TESTED                                   |
| 11-roundtrip-cross       | BRT save → IST load → round-trip → BRT reload                   | BRT→IST→BRT |   —   | Compound drift from mixed offsets                                                                | NOT TESTED                                   |
| 11-concurrent-edit       | User A (BRT) + User B (IST) edit same record                    |     BRT     |  IST  | Overwrite with different UTC moment for "same" date                                              | NOT TESTED                                   |
| 11-report-cross          | Query DB for dates entered from different TZs                   |    mixed    |   —   | Inconsistent SQL results                                                                         | IDENTIFIED (theoretical, see Test 2.4)       |
| 11-load-UTC0             | BRT-saved record loaded in UTC+0                                |     BRT     | UTC+0 | No fake-Z drift (Z happens to be correct)                                                        | NOT TESTED                                   |
| 11-load-PST              | BRT-saved record loaded in PST (UTC-8)                          |     BRT     |  PST  | -8h/trip drift on round-trip                                                                     | NOT TESTED                                   |
| 11-load-Tokyo            | BRT-saved record loaded in JST (UTC+9)                          |     BRT     |  JST  | +9h/trip drift on round-trip                                                                     | NOT TESTED                                   |
| 11-A-save-BRT-load-IST   | Config A: save in BRT, load in IST                              |     BRT     |  IST  | Bug #7 on load: stored "2026-03-15" → IST reload displays "2026-03-14" (load-path manifestation) | NOT TESTED                                   |
| 11-B-save-BRT-load-IST   | Config B: save in BRT, load in IST                              |     BRT     |  IST  | Same as A-BRT-IST (ignoreTZ no effect on date-only load path)                                    | NOT TESTED                                   |
| 11-C-save-BRT-load-IST   | Config C: save in BRT, load in IST                              |     BRT     |  IST  | Expected stable: Config C stores real UTC; IST reload shows correct local time                   | NOT TESTED                                   |
| 11-D-concurrent-IST-edit | Config D: User A (IST) edits, User B (BRT) re-edits same record |     IST     |  BRT  | Fake Z interpreted differently per TZ → compound drift between users                             | NOT TESTED                                   |

---

## Category 12: Edge Cases

All on Config D (DataField5), BRT timezone, unless noted.
**Bugs exercised**: Bug #5 (drift at boundaries), Bug #6 (empty value)

| Test ID                   | Description                       | Value                        | Expected Issue                                                                              | Status            |
| ------------------------- | --------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------- | ----------------- |
| 12-near-midnight-1        | UTC input near midnight           | `"2026-03-15T00:30:00.000Z"` | Day crosses on input (BRT = Mar 14 21:30) + fake Z added — double jeopardy                  | DONE ✗            |
| 12-near-midnight-1-IST    | UTC input near midnight, IST      | `"2026-03-15T00:30:00.000Z"` | IST = Mar 15 06:00 — no day cross on input (opposite of BRT); drift still +5:30h/trip       | NOT TESTED        |
| 12-near-midnight-2        | Local time near midnight          | `"2026-03-15T23:00:00"`      | 23:00→20:00→17:00→... (-3h/trip)                                                            | DONE ✗            |
| 12-near-midnight-2-IST    | Local time near midnight, IST     | `"2026-03-15T23:00:00"`      | 1 trip: +5:30h → "2026-03-16T04:30:00" — day crosses FORWARD (opposite of BRT)              | NOT TESTED        |
| 12-dst-transition         | US DST change day                 | `"2026-03-08T02:00:00"`      | -3h drift from BRT — no DST anomaly (Brazil has no DST). Retest from US TZ needed.          | DONE ✓ (BRT only) |
| 12-dst-US-PST             | US DST spring-forward, from PST   | `"2026-03-08T02:00:00"`      | PST→PDT transition: does the 2AM→3AM skip create anomaly beyond standard -8h Bug #5 drift?  | NOT TESTED        |
| 12-dst-brazil             | Brazil DST                        | —                            | Brazil no longer uses DST                                                                   | SKIP              |
| 12-year-boundary          | Jan 1 midnight                    | `"2026-01-01T00:00:00"`      | **1 trip → 2025-12-31T21:00:00** — year boundary crossed                                    | DONE ✗            |
| 12-year-boundary-IST      | Jan 1 midnight, IST               | `"2026-01-01T00:00:00"`      | 1 trip: +5:30h → "2026-01-01T05:30:00" — stays in 2026 (opposite of BRT year-boundary loss) | NOT TESTED        |
| 12-leap-day               | Feb 29 on leap year               | `"2028-02-29T00:00:00"`      | **1 trip → 2028-02-28T21:00:00** — leap day lost                                            | DONE ✗            |
| 12-leap-day-IST           | Feb 29 on leap year, IST          | `"2028-02-29T00:00:00"`      | 1 trip: +5:30h → "2028-02-29T05:30:00" — leap day NOT lost (opposite of BRT)                | NOT TESTED        |
| 12-empty-value            | Empty / null date                 | `""` or `null`               | GFV returns truthy `"Invalid Date"` (Bug #6)                                                | DONE ✗            |
| 12-null-input             | Explicit null input               | `null`                       | Is `null` distinct from `""` for SFV on Config D? Expect same Bug #6 behavior.              | NOT TESTED        |
| 12-empty-Config-A         | Empty Config A                    | `""`                         | GFV return — is Bug #6 D-only or affects A? Expected `""` but needs verification.           | NOT TESTED        |
| 12-empty-Config-C         | Empty Config C                    | `""`                         | GFV return — is Bug #6 D-only or affects C? Expected `""` but needs verification.           | NOT TESTED        |
| 12-utc-0-control          | Config D at UTC+0, round-trip     | `"2026-03-15T00:00:00"`      | Fake Z coincidentally correct → 0 drift per trip. Empirical confirmation of UTC+0 boundary. | NOT TESTED        |
| 12-config-C-near-midnight | Config C round-trip near midnight | `"2026-03-15T23:00:00"`      | 1 trip: expected stable (real UTC, no fake Z → no drift). Control for Bug #5 edge cases.    | NOT TESTED        |
| 12-invalid-string         | Invalid string                    | `"not-a-date"`               | Silently ignored, field retains previous value                                              | DONE ✓            |
| 12-far-future             | Year 2099                         | `"2099-12-31T00:00:00"`      | Standard -3h drift, no special issue                                                        | DONE ✓            |
| 12-pre-epoch              | Year 1969                         | `"1969-12-31T00:00:00"`      | Standard -3h drift, handles negative epoch                                                  | DONE ✓            |

---

## Category 13: Database Verification

Direct DB query to verify stored values. Requires SQL access to the VisualVault database.
**Bugs exercised**: structural mixed UTC/local storage

| Test ID                 | Description                                                                                                                                                           | Status     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 13-initial-values       | Initial/preset date fields store UTC (via `new Date().toISOString()`)                                                                                                 | DONE ✓     |
| 13-user-input           | User-input fields store local time (via `getSaveValue()` strips Z)                                                                                                    | DONE ✓     |
| 13-after-roundtrip      | DB values after Bug #5 drift (save after round-trip, check raw SQL)                                                                                                   | NOT TESTED |
| 13-cross-tz-save        | DB values for a record saved from IST                                                                                                                                 | NOT TESTED |
| 13-ws-input             | DB values when date set via web service / scheduled script                                                                                                            | NOT TESTED |
| 13-query-consistency    | SQL date range query returns consistent results for same logical date entered from BRT vs IST                                                                         | NOT TESTED |
| 13-B-storage            | Raw DB value for Config B vs Config A — does ignoreTZ=true change storage format for date-only fields?                                                                | NOT TESTED |
| 13-C-vs-D-storage       | SQL comparison: Config C stores UTC-equiv `"2026-03-14T21:00:00"` (BRT midnight) vs Config D stores local `"2026-03-15T00:00:00"` — quantify mixed-storage per config | NOT TESTED |
| 13-multi-roundtrip-db   | Raw SQL value after 8 BRT round-trips on Config D: expect drift from `"2026-03-15T00:00:00"` to `"2026-03-14T00:00:00"` (-24h total)                                  | NOT TESTED |
| 13-preset-vs-user-input | Config A: preset field (UTC Date obj stored) vs user-input field (local string stored) — same logical date, SQL comparison of raw values                              | NOT TESTED |
