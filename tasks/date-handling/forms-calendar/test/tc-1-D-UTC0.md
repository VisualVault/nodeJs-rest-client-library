# TC-1-D-UTC0 — Config D, Calendar Popup, UTC+0: local midnight stored; GetFieldValue fake Z coincidentally correct (Bug #5 present, no drift)

## Environment Specs

| Parameter               | Value                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                   |
| **System Timezone**     | `GMT` — UTC+0, Greenwich Mean Time. No DST (GMT is always UTC+0).                          |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                   |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                   |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`    |
| **Scenario**            | 2026-03-15, GMT midnight — `2026-03-15T00:00:00 GMT+0000` = `2026-03-15T00:00:00.000Z` UTC |

---

## Preconditions

**P1 — Set system timezone to `GMT`:**

macOS:

```bash
sudo systemsetup -settimezone GMT
```

Windows (run as Administrator):

```bat
tzutil /s "Greenwich Standard Time"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "Greenwich Standard Time"
```

Linux:

```bash
sudo timedatectl set-timezone GMT
```

> **Important — do not use `Europe/London`**: UK observes British Summer Time (BST, UTC+1) from late March through October. From 2026-03-29 onward, `Europe/London` is UTC+1, not UTC+0. Always use `GMT` (or `Africa/Abidjan`) for a fixed UTC+0 zone with no DST.

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains "GMT+0000"
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the DateTest form template** (creates a fresh instance):

```
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

Wait for the tab title to change from "Viewer" to "DateTest-XXXXXX" before proceeding.

**P5 — Verify code path** (DevTools console after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active; verify this test applies to V2 before continuing
```

**P6 — Locate the target field by configuration** (DevTools console):

```javascript
Object.values(VV.Form.VV.FormPartition.fieldMaster)
    .filter(
        (f) =>
            f.fieldType === 13 &&
            f.enableTime === true &&
            f.ignoreTimezone === true &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField5"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

---

## Test Steps

| #   | Action                                                              | Test Data                                                            | Expected Result                                                                            | ✓   |
| --- | ------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --- |
| 1   | Complete setup                                                      | See Preconditions P1–P6                                              | All P1–P6 checks pass                                                                      | ☐   |
| 2   | Click the calendar icon next to the target field (identified in P6) | `<FIELD_NAME>`                                                       | Calendar popup opens on the Date tab; March 2026 is visible; today (Mar 31) is highlighted | ☐   |
| 3   | Click day 15 in the calendar                                        | Day 15 in the March 2026 grid                                        | Popup advances automatically to the Time tab                                               | ☐   |
| 4   | Verify time header before clicking Set                              | —                                                                    | Header displays `12:00 AM`                                                                 | ☐   |
| 5   | Click **Set**                                                       | —                                                                    | Popup closes; target field displays `03/15/2026 12:00 AM`                                  | ☐   |
| 6   | Capture raw stored value                                            | `` `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` `` | `"2026-03-15T00:00:00"`                                                                    | ☐   |
| 7   | Capture GetFieldValue output                                        | `` `VV.Form.GetFieldValue('<FIELD_NAME>')` ``                        | `"2026-03-15T00:00:00"` — same as raw, no transformation                                   | ☐   |
| 8   | Capture isoRef                                                      | `` `new Date(2026, 2, 15, 0, 0, 0).toISOString()` ``                 | `"2026-03-15T00:00:00.000Z"` — confirms UTC+0 active                                       | ☐   |

> **Modal scroll note**: The Set button is below the time picker columns and may not be visible without scrolling. If it is not visible, scroll the **page** (use the browser scrollbar or drag outside the modal boundary) to bring the full modal into view. Do not scroll inside the Hour, Minute, or AM/PM columns — that changes the selected time.

---

## Fail Conditions

**FAIL-1 (Bug #5 active — fake Z in GetFieldValue):**
Step 7 returns `"2026-03-15T00:00:00.000Z"` — fake Z appended to local midnight.

- Interpretation: `getCalendarFieldValue()` is appending a literal `Z` to the local time string. Correct return is `"2026-03-15T00:00:00"` matching the raw stored value. This is Bug #5. **At UTC+0, the fake Z coincidentally equals the real UTC value, so no round-trip drift occurs** — but the bug is still present in the code and will cause drift for any user not at UTC+0 (−3h per trip in BRT, +5:30h per trip in IST).

**FAIL-2 (Bug #5 drift — non-UTC+0 timezone):**
GetFieldValue returns a value where the Z-appended time does not equal real UTC midnight for the selected date (e.g., `"2026-03-14T21:00:00.000Z"` for UTC-3, or `"2026-03-14T18:30:00.000Z"` for UTC+5:30).

- **Interpretation**: Bug #5 is present but not coincidentally correct. This test is only valid at UTC+0. If you see a non-midnight Z time, the system timezone is not UTC+0 — verify P3 returns `GMT+0000`.

**FAIL-3 (Bug #5 — wrong fake Z format):**
GetFieldValue returns a value containing a literal `[Z]` instead of a real `Z` (e.g., `"2026-03-15T00:00:00.000[Z]"`).

- **Interpretation**: The `moment().format()` call in `getCalendarFieldValue()` produced a bracketed literal instead of the ISO Z suffix. This would indicate a different version of the moment.js library or a code change. The bracketed `[Z]` is not a valid ISO 8601 designator and would break any downstream ISO parsing.

**FAIL-4 (Bug #6 — empty field returns "Invalid Date"):**
Not triggered by this test (the field is not cleared). If running a companion empty-field test: GetFieldValue returns the string `"Invalid Date"` when the target field has no value set.

- **Interpretation**: `getCalendarFieldValue()` calls `moment("").format(...)` when `value=""`. `moment("")` is invalid; `.format()` returns the string `"Invalid Date"`. This is truthy — `if (VV.Form.GetFieldValue('field'))` incorrectly evaluates `true` for an empty field.

**FAIL-5 (Wrong day stored):**
Raw stored value is `"2026-03-14T00:00:00"` or `"2026-03-16T00:00:00"` instead of `"2026-03-15T00:00:00"`.

- **Interpretation**: A date shift occurred in `getSaveValue()`. At UTC+0 this should not happen — local midnight equals UTC midnight. Verify isoRef confirms `GMT+0000` active. If the raw value is off by one day, the system timezone was not correctly set to UTC+0 when the form loaded.

**FAIL-6 (isoRef shows non-UTC+0 offset):**
`new Date(2026, 2, 15, 0, 0, 0).toISOString()` returns any value other than `"2026-03-15T00:00:00.000Z"`.

- **Interpretation**: The browser timezone is not UTC+0 — the test is running under the wrong timezone. Abort, fix P1/P2, reload the form from the template URL and rerun.

---

## Related

| Reference                                 | Location                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| Matrix row                                | `matrix.md` — row `1-D-UTC0`                                             |
| Live test evidence                        | `results.md § Test 7.1`                                                  |
| Bug #5 analysis                           | `analysis.md` — Bug #5 (Inconsistent Developer API)                      |
| Bug #6 analysis                           | `analysis.md` — Bug #6 (GetFieldValue "Invalid Date" for empty Config D) |
| Sibling TC — same config, IST             | [`tc-1-D-IST.md`](tc-1-D-IST.md) — FAIL (Bug #5 drift, +5:30h per trip)  |
| Sibling TC — same config, UTC+0, Config A | [`tc-1-A-UTC0.md`](tc-1-A-UTC0.md) — PASS (date-only, no drift)          |
| Field config reference                    | `tasks/date-handling/CLAUDE.md` — Test Form Fields table                 |
