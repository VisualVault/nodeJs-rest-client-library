# TC-8B-A-IST — Config A, GetDateObject, IST: Bug #7 upstream corrupts stored value; GDOC reads correctly

## Environment Specs

| Parameter               | Required Value                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                  |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST. No DST.                                                  |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                  |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                  |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, IST midnight — `2026-03-15T00:00:00+05:30` = `2026-03-14T18:30:00Z` UTC     |

---

## Preconditions

Complete all steps in order. Do not proceed if any verification fails.

**P1 — Set system timezone to `Asia/Calcutta`:**

macOS:

```bash
sudo systemsetup -settimezone Asia/Calcutta
```

Windows (run as Administrator):

```bat
tzutil /s "India Standard Time"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "India Standard Time"
```

Linux:

```bash
sudo timedatectl set-timezone Asia/Calcutta
```

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains GMT+0530
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
            f.enableTime === false &&
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected on current test form: ["Field7"]
// Record the returned name — use it as <FIELD_NAME> in the test steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field matching this configuration — stop and report.

---

## Test Steps

| #   | Action                                                   | Test Data                                                      | Expected Result                                    | ✓   |
| --- | -------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                                           | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Set a known value on the target field (DevTools console) | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15')`          | Field displays `03/15/2026`                        | ☐   |
| 3   | Capture raw stored value (DevTools console)              | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15"`                                     | ☐   |
| 4   | Call GetDateObjectFromCalendar (DevTools console)        | `var d = VV.Form.GetDateObjectFromCalendar('<FIELD_NAME>')`    | No error thrown                                    | ☐   |
| 5   | Verify return is a Date object (DevTools console)        | `d instanceof Date`                                            | `true`                                             | ☐   |
| 6   | Capture Date toString (DevTools console)                 | `d.toString()`                                                 | Contains `Mar 15 2026 00:00:00 GMT+0530`           | ☐   |
| 7   | Capture Date toISOString (DevTools console)              | `d.toISOString()`                                              | `"2026-03-14T18:30:00.000Z"`                       | ☐   |
| 8   | Compare with GetFieldValue (DevTools console)            | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15"` — raw unchanged for date-only       | ☐   |
| 9   | Confirm browser timezone (DevTools console)              | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-14T18:30:00.000Z"` — confirms IST active | ☐   |

> Bug #7 upstream corrupts the stored value from `"2026-03-15"` to `"2026-03-14"` before GDOC reads it. GDOC itself works correctly. Expected values above reflect correct behavior — the test is designed to **FAIL** when Bug #7 is present.

---

## Fail Conditions

**FAIL-1 (Bug #7 — stored value corrupted):**
Step 3 returns `"2026-03-14"` instead of `"2026-03-15"`.

- Interpretation: Bug #7 in SetFieldValue's `normalizeCalValue()` uses `moment("2026-03-15").toDate()` which creates IST midnight → `getSaveValue()` extracts UTC date → stores previous day. GDOC then reads the corrupted value correctly, showing Mar 14 and toISOString `"2026-03-13T18:30:00.000Z"`.

**FAIL-2 (GDOC returns non-Date):**
Step 5 returns `false` — GetDateObjectFromCalendar does not return a Date object.

- Interpretation: The function may return a string, null, or other type for date-only configs. Document the actual return type and value.

**FAIL-3 (GDOC toISOString differs from expected):**
Step 7 returns a value other than `"2026-03-14T18:30:00.000Z"`.

- Interpretation: The Date object does not represent IST midnight as expected. Document the actual value.

**FAIL-4 (Wrong timezone):**
Step 9 does not return `"2026-03-14T18:30:00.000Z"`.

- Interpretation: System timezone is not IST. Re-do P1 and P2.

**FAIL-5 (V2 active):**
P5 returns `true`.

- Interpretation: V2 code path active. Verify this test applies to V2 behavior before continuing.

**FAIL-6 (Field not found):**
P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config A flags.

---

## Related

| Reference              | Location                                                                       |
| ---------------------- | ------------------------------------------------------------------------------ |
| Matrix row             | `../matrix.md` — row `8B-A-IST`                                                |
| Analysis               | `../analysis.md` — Bug #7 upstream corrupts date-only in east-of-UTC timezones |
| Sibling (BRT)          | [`tc-8B-A-BRT.md`](tc-8B-A-BRT.md) — no bug in BRT                             |
| Sibling (UTC0)         | [`tc-8B-A-UTC0.md`](tc-8B-A-UTC0.md)                                           |
| Cat 1 same bug         | [`tc-1-A-IST.md`](tc-1-A-IST.md) — Bug #7 in Cat 1                             |
| GFV comparison         | [`tc-8-A.md`](tc-8-A.md) — Cat 8 Config A GFV                                  |
| Field config reference | `research/date-handling/CLAUDE.md` — Config A                                  |
