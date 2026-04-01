# TC-8-C-empty — Config C, GetFieldValue, BRT: empty field throws RangeError; Bug #6 variant for ignoreTimezone=false

## Environment Specs

| Parameter               | Required Value                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                     |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                            |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                     |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                     |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false`     |
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
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField6"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

## Test Steps

| #   | Action                                                             | Test Data                                                              | Expected Result                          | ✓   |
| --- | ------------------------------------------------------------------ | ---------------------------------------------------------------------- | ---------------------------------------- | --- |
| 1   | Complete setup                                                     | See Preconditions P1–P6                                                | All P1–P6 checks pass                    | ☐   |
| 2   | Verify field is empty (no interaction)                             | Visually inspect the target field (identified in P6)                   | Field input is blank — no date displayed | ☐   |
| 3   | Capture raw stored value (DevTools console)                        | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`         | `""`                                     | ☐   |
| 4   | Capture GetFieldValue return (DevTools console, wrap in try/catch) | `try { VV.Form.GetFieldValue('<FIELD_NAME>') } catch(e) { e.message }` | `""`                                     | ☐   |
| 5   | Verify return type is string (DevTools console)                    | `typeof VV.Form.GetFieldValue('<FIELD_NAME>')`                         | `"string"`                               | ☐   |
| 6   | Confirm browser timezone (DevTools console)                        | `new Date().toISOString()`                                             | A UTC timestamp — confirms BRT active    | ☐   |

> Steps 3–5 must be executed without any prior interaction with the target field. Do not click, type in, or set any value on the field before running these steps. Step 4 uses try/catch because the current system throws an error instead of returning `""`.

## Fail Conditions

**FAIL-1 (GetFieldValue throws RangeError):** Step 4 throws `RangeError: Invalid time value` instead of returning `""`.

- Interpretation: Bug #6 variant for Config C (`enableTime=true, ignoreTimezone=false`). The `getCalendarFieldValue()` code path for `ignoreTimezone=false` calls `new Date(value).toISOString()`. When `value=""`, `new Date("")` creates an Invalid Date, and `.toISOString()` throws `RangeError`. This is **worse than Bug #6** (Config D returns `"Invalid Date"` string — truthy but non-crashing; Config C **throws**, crashing any script without try/catch). Both bugs share the root cause: no empty-value guard before date transformation in `getCalendarFieldValue()`.

**FAIL-2 (GetFieldValue returns "Invalid Date" string):** Step 4 returns the string `"Invalid Date"` instead of `""`.

- Interpretation: Bug #6 exact pattern (same as Config D). Would mean `ignoreTimezone` flag doesn't affect the empty-value code path. Document to compare with 8-D-empty.

**FAIL-3 (Wrong timezone in P3):** `new Date().toString()` does not contain `GMT-0300`.

- Interpretation: System timezone incorrect. Re-do P1 and P2.

**FAIL-4 (V2 active in P5):** `useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 active. This test was designed for V1.

**FAIL-5 (Field not found in P6):** Filter returns no matching fields.

- Interpretation: DateTest form does not have a Config C field.

## Related

| Reference              | Location                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------- |
| Matrix row             | `matrix.md` — row `8-C-empty`                                                          |
| Run file               | [run-1](../runs/tc-8-C-empty-run-1.md)                                                 |
| Summary                | [summary](../summaries/tc-8-C-empty.md)                                                |
| Bug #6 analysis        | `analysis.md` — Bug #6: GetFieldValue Returns "Invalid Date" for Empty Config D Fields |
| Sibling: 8-A-empty     | `summaries/tc-8-A-empty.md` — Config A empty (PASS, `""`)                              |
| Sibling: 8-D-empty     | `matrix.md` — row `8-D-empty` (FAIL, returns `"Invalid Date"` string)                  |
| Sibling: 8-H-empty     | Not yet created — does useLegacy=true prevent both variants?                           |
| Field config reference | `matrix.md` — Field Configurations table, Config C                                     |
