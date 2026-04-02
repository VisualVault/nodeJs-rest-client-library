# TC-8-D-empty — Config D, GetFieldValue on empty field, BRT: should return empty string; Bug #6 returns "Invalid Date"

## Environment Specs

| Parameter               | Required Value                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                     |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                            |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                     |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                     |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`      |
| **Scenario**            | Empty field — no date entered, no prior interaction. GetFieldValue on virgin field instance. |

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
// ABORT: true  → V2 is active; verify this test applies to V2 before continuing
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
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

## Test Steps

| #   | Action                                                    | Test Data                                                      | Expected Result                                                  | ✓   |
| --- | --------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------- | --- |
| 1   | Complete setup                                            | See Preconditions P1–P6                                        | All P1–P6 checks pass                                            | ☐   |
| 2   | Verify field is empty (no interaction)                    | Visually inspect the target field (identified in P6)           | Field input is blank — no date displayed                         | ☐   |
| 3   | Capture raw stored value (DevTools console)               | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `""`                                                             | ☐   |
| 4   | Capture GetFieldValue return (DevTools console)           | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `""`                                                             | ☐   |
| 5   | Verify return type is string (DevTools console)           | `typeof VV.Form.GetFieldValue('<FIELD_NAME>')`                 | `"string"`                                                       | ☐   |
| 6   | Verify strict equality to empty string (DevTools console) | `VV.Form.GetFieldValue('<FIELD_NAME>') === ''`                 | `true`                                                           | ☐   |
| 7   | Confirm browser timezone (DevTools console)               | `new Date().toISOString()`                                     | A UTC timestamp with no BRT offset visible — confirms BRT active | ☐   |

> Step 2 is intentionally a visual check only — the test verifies GFV behavior on an untouched empty field. Do not click, type in, or set any value on the field before running Steps 3–6.

## Fail Conditions

**FAIL-1 (Bug #6 Invalid Date):** Step 4 returns `"Invalid Date"` instead of `""`.

- Interpretation: Bug #6 confirmed. `getCalendarFieldValue()` calls `moment("").format(...)` which produces the string `"Invalid Date"` — a truthy value that corrupts downstream logic. Any developer script using `if (VV.Form.GetFieldValue('field'))` will evaluate `true` for an empty field. This is the core Config D empty-field defect.

**FAIL-2 (Wrong timezone in P3):** `new Date().toString()` does not contain `GMT-0300`.

- Interpretation: System timezone was not changed correctly, or Chrome was not restarted after the change. Re-do P1 and P2 before proceeding.

**FAIL-3 (V2 active in P5):** `useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: The platform has switched to V2 code path. This test was designed for V1. Verify whether V2 changes the empty-field behavior before recording results.

**FAIL-4 (Field not found in P6):** Filter returns no matching fields.

- Interpretation: The DateTest form template does not have a field with Config D flags. Verify field configuration in the form builder.

## Related

| Reference              | Location                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------- |
| Matrix row             | `matrix.md` — row `8-D-empty`                                                          |
| IST empty sibling      | Not yet created — `tc-8-D-empty-IST.md` (same Bug #6 expected regardless of TZ)        |
| Config A empty         | `tc-8-A-empty.md` — Config A empty field (passes — no Bug #6)                          |
| Config H empty         | Not yet created — Config H empty (expected: passes — `useLegacy=true` prevents Bug #6) |
| Bug #6 analysis        | `analysis.md` — Bug #6: GetFieldValue Returns "Invalid Date" for Empty Config D Fields |
| With-value sibling     | `tc-8-D-BRT.md` — Config D GFV with value (Bug #5 fake Z)                              |
| Field config reference | `matrix.md` — Field Configurations table, Config D                                     |
