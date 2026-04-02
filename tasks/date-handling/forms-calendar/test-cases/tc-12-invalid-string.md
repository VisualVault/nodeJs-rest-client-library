# TC-12-invalid-string — Config D, SetFieldValue invalid string, BRT: silently ignored, field unchanged

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                       |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | Invalid input `"not-a-date"` on Config D — expected: silently ignored                   |

---

## Preconditions

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

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

**P5 — Verify code path** (DevTools console, after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active
```

**P6 — Locate the target field by configuration** (DevTools console, after form loads):

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
```

---

## Test Steps

| #   | Action                                      | Test Data                                                      | Expected Result                                    | ✓   |
| --- | ------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Set invalid value (DevTools console)        | `VV.Form.SetFieldValue('<FIELD_NAME>', 'not-a-date')`          | No error thrown                                    | ☐   |
| 3   | Capture raw stored value (DevTools console) | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `""` — field unchanged (empty, as it was before)   | ☐   |
| 4   | Capture GetFieldValue (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `""` — empty string (correct for untouched field)  | ☐   |
| 5   | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> The invalid string is silently discarded by `normalizeCalValue()` — `moment("not-a-date")` returns an invalid moment, and the function does not propagate it to storage. The field retains its previous state (empty on a fresh form). Bug #6 applies to the resulting empty field state.

---

## Fail Conditions

**FAIL-1 (Bug #6 — Invalid Date on empty field):** Step 4 returns `"Invalid Date"` instead of `""`.

- Interpretation: Bug #6 fires on the empty field state. This is not caused by the invalid input itself — it is the same Bug #6 behavior seen in 12-empty-value and 8-D-empty. The invalid input was correctly rejected; the bug is in how GFV handles the resulting empty state.

**FAIL-2 (Invalid string stored):** Step 3 returns `"not-a-date"` or any non-empty value.

- Interpretation: `normalizeCalValue()` did not reject the invalid input — it stored it verbatim. This would be a new bug.

**FAIL-3 (Error thrown):** Step 2 throws a JavaScript error in the console.

- Interpretation: `SetFieldValue()` does not handle invalid input gracefully. Expected behavior is silent rejection.

**FAIL-4 (Wrong timezone):** Step 5 does not return `"2026-03-15T03:00:00.000Z"`.

- Interpretation: System timezone is not BRT. Re-do P1 and P2.

**FAIL-5 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path active.

**FAIL-6 (Field not found):** P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config D flags.

---

## Related

| Reference              | Location                                                          |
| ---------------------- | ----------------------------------------------------------------- |
| Matrix row             | `matrix.md` — row `12-invalid-string`                             |
| Empty field sibling    | [tc-12-empty-value.md](tc-12-empty-value.md) — same Bug #6        |
| Bug #6 analysis        | `analysis.md` — Bug #6: Empty Field Returns Truthy "Invalid Date" |
| Field config reference | `matrix.md` — Field Configurations table, Config D                |
