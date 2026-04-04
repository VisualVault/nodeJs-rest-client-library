# TC-8B-A-empty — Config A, GetDateObject, empty field: returns undefined (falsy, safe)

## Environment Specs

| Parameter               | Required Value                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                  |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                         |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                  |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                  |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | Empty Config A field — GDOC return type test                                              |

---

## Preconditions

Complete all steps in order. Do not proceed if any verification fails.

**P1 — Set system timezone to `America/Sao_Paulo`:**

macOS:

```bash
sudo systemsetup -settimezone America/Sao_Paulo
```

Windows (run as Administrator):

```bat
tzutil /s "E. South America Standard Time"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "E. South America Standard Time"
```

Linux:

```bash
sudo timedatectl set-timezone America/Sao_Paulo
```

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains "GMT-0300"
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
// Expected: ["Field7"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field matching this configuration — stop and report.

---

## Test Steps

| #   | Action                                            | Test Data                                                      | Expected Result                                    | ✓   |
| --- | ------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                                    | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Verify field is empty (DevTools console)          | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `""`                                               | ☐   |
| 3   | Call GetDateObjectFromCalendar (DevTools console) | `var d = VV.Form.GetDateObjectFromCalendar('<FIELD_NAME>')`    | No error thrown                                    | ☐   |
| 4   | Check return value (DevTools console)             | `d`                                                            | `undefined`                                        | ☐   |
| 5   | Check typeof (DevTools console)                   | `typeof d`                                                     | `"undefined"`                                      | ☐   |
| 6   | Check falsy behavior (DevTools console)           | `!d`                                                           | `true`                                             | ☐   |
| 7   | Compare with GetFieldValue (DevTools console)     | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `""`                                               | ☐   |
| 8   | Confirm browser timezone (DevTools console)       | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> Empty Config A GDOC returns `undefined` — falsy, safe for developer `if (!d)` checks. Same behavior as 8B-D-empty (Config D empty also returns `undefined`). Contrast with Bug #6 where GFV returns the truthy string `"Invalid Date"` for empty Config D fields.

---

## Fail Conditions

**FAIL-1 (GDOC throws or returns Invalid Date):**
Step 3 throws an error, or step 4 returns an Invalid Date object instead of `undefined`.

- Interpretation: GDOC does not handle empty fields gracefully. Document the error or return value. If it returns an `Invalid Date` object, it would be truthy and `instanceof Date === true` — dangerous for developer code.

**FAIL-2 (GDOC returns truthy value):**
Step 6 returns `false` (meaning `d` is truthy).

- Interpretation: GDOC returns something other than `undefined`/`null`/`""` for an empty field. Document the actual value and type. This would make `if (d)` checks unreliable.

**FAIL-3 (Wrong timezone):**
Step 8 does not return `"2026-03-15T03:00:00.000Z"`.

- Interpretation: System timezone is not BRT. Re-do P1 and P2.

**FAIL-4 (V2 active):**
P5 returns `true`.

- Interpretation: V2 code path active. Verify this test applies to V2 behavior before continuing.

**FAIL-5 (Field not found):**
P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config A flags.

---

## Related

| Reference                 | Location                                                                   |
| ------------------------- | -------------------------------------------------------------------------- |
| Matrix row                | `../matrix.md` — row `8B-A-empty`                                          |
| Sibling: 8B-D-empty       | `tc-8B-D-empty.md` — Config D empty (same behavior — returns `undefined`)  |
| GFV comparison: 8-A-empty | `../matrix.md` — row `8-A-empty` (Cat 8, Config A GFV on empty field)      |
| Bug #6 reference          | `../analysis.md` — Bug #6: GFV returns `"Invalid Date"` for empty Config D |
| Field config reference    | `tasks/date-handling/CLAUDE.md` — Config A                                 |
