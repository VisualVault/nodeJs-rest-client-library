# TC-8B-D-UTC0 — Config D, GetDateObject, UTC0: correct Date; GDOC and GFV identical at UTC boundary

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `Etc/GMT` — UTC+0. No DST.                                                              |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15T00:00:00`, UTC+0 — set via SetFieldValue, then GDOC                         |

---

## Preconditions

Complete all steps in order. Do not proceed if any verification fails.

**P1 — Set system timezone to `Etc/GMT`:**

macOS:

```bash
sudo systemsetup -settimezone GMT
```

Windows (run as Administrator):

```bat
tzutil /s "UTC"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "UTC"
```

Linux:

```bash
sudo timedatectl set-timezone Etc/GMT
```

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

**P5 — Verify V1 is the active code path** (run in DevTools console after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active; verify this test applies to V2 behavior before continuing
```

**P6 — Locate the target field by configuration** (run in DevTools console):

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
// Expected: ["Field5"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

---

## Test Steps

| #   | Action                                                   | Test Data                                                      | Expected Result                                      | ✓   |
| --- | -------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------- | --- |
| 1   | Complete setup                                           | See Preconditions P1–P6                                        | All P1–P6 checks pass                                | ☐   |
| 2   | Set a known value on the target field (DevTools console) | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')` | Field displays `03/15/2026 12:00 AM`                 | ☐   |
| 3   | Capture raw stored value (DevTools console)              | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"`                              | ☐   |
| 4   | Call GetDateObjectFromCalendar (DevTools console)        | `var d = VV.Form.GetDateObjectFromCalendar('<FIELD_NAME>')`    | No error thrown                                      | ☐   |
| 5   | Verify return is a Date object (DevTools console)        | `d instanceof Date`                                            | `true`                                               | ☐   |
| 6   | Capture Date toString (DevTools console)                 | `d.toString()`                                                 | Contains `Mar 15 2026 00:00:00 GMT+0000`             | ☐   |
| 7   | Capture Date toISOString (DevTools console)              | `d.toISOString()`                                              | `"2026-03-15T00:00:00.000Z"`                         | ☐   |
| 8   | Compare with GetFieldValue (DevTools console)            | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T00:00:00"` (correct — no fake Z)        | ☐   |
| 9   | Confirm browser timezone (DevTools console)              | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T00:00:00.000Z"` — confirms UTC+0 active | ☐   |

> At UTC+0, GDOC.toISOString() and GFV with fake Z (Bug #5) produce identical strings — both show `"...T00:00:00.000Z"`. Bug #5 is invisible here because the fake Z coincidentally matches the real UTC value. Step 8 shows the raw value without Z; if Bug #5 fires it adds `.000Z` but the numeric content is still correct.

---

## Fail Conditions

**FAIL-1 (GetFieldValue returns fake Z — Bug #5):**
Step 8 returns `"2026-03-15T00:00:00.000Z"` instead of `"2026-03-15T00:00:00"`.

- Interpretation: Bug #5 confirmed. `getCalendarFieldValue()` adds literal `[Z]` via `moment(value).format("YYYY-MM-DD[T]HH:mm:ss.SSS[Z]")`. At UTC+0, the value is coincidentally correct numerically — `T00:00:00.000Z` is true UTC midnight. The bug is present (format is wrong) but has no functional impact at this timezone. Contrast with 8B-D-BRT where the 3h discrepancy between fake Z and real UTC proves the Z is fake.

**FAIL-2 (GDOC returns null or non-Date):**
Step 5 returns `false` — GetDateObjectFromCalendar does not return a Date object.

- Interpretation: The function may return a string, null, or other type for this config. Document the actual return type and value.

**FAIL-3 (GDOC toISOString differs from expected):**
Step 7 returns a value other than `"2026-03-15T00:00:00.000Z"`.

- Interpretation: The Date object does not represent UTC+0 midnight as expected. Document the actual value.

**FAIL-4 (Wrong timezone in P3):**
`new Date().toString()` does not contain `GMT+0000`.

- Interpretation: System timezone was not changed correctly, or Chrome was not restarted after the change. Re-do P1 and P2 before proceeding.

**FAIL-5 (V2 active in P5):**
`useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: The platform has switched to V2 code path. This test was designed for V1. Verify whether V2 changes GDOC behavior before recording results.

**FAIL-6 (Field not found in P6):**
Filter returns no matching fields.

- Interpretation: The DateTest form template does not have a field with Config D flags. Verify field configuration in the form builder.

---

## Related

| Reference                | Location                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| Matrix row               | `../matrix.md` — row `8B-D-UTC0`                                                         |
| Bug #5 analysis          | `../analysis.md` — Bug #5: Inconsistent Developer API Behavior (fake Z in GetFieldValue) |
| Sibling: 8B-D-BRT        | [`tc-8B-D-BRT.md`](tc-8B-D-BRT.md) — Config D GDOC in BRT (fake Z visible)               |
| Sibling: 8B-D-IST        | `tc-8B-D-IST.md` — Config D GDOC in IST                                                  |
| GFV comparison: 8-D-UTC0 | `../matrix.md` — row `8-D-UTC0` (Cat 8, same config — Bug #5 fake Z invisible)           |
| Field config reference   | `research/date-handling/CLAUDE.md` — Config D                                            |
