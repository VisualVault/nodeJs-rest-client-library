# TC-8-A-empty — Config A, GetFieldValue, BRT: empty field returns empty string; Bug #6 absent for date-only config

## Environment Specs

| Parameter               | Required Value                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                     |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                            |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                     |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                     |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false`    |
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
            f.enableTime === false &&
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField7"]
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

> Steps 3–6 must be executed without any prior interaction with the target field. Do not click, type in, or set any value on the field before running these steps.

## Fail Conditions

**FAIL-1 (GetFieldValue returns "Invalid Date"):** GetFieldValue returns `"Invalid Date"` instead of `""`.

- Interpretation: Bug #6 is not limited to Config D — it also affects date-only fields (Config A). This would mean `getCalendarFieldValue()` processes empty strings through `moment("").format(...)` even when `enableTime=false`. Escalate — the scope of Bug #6 is wider than analyzed. Re-run with Configs B, E, F to map full blast radius.

**FAIL-2 (GetFieldValue returns null or undefined):** GetFieldValue returns `null`, `undefined`, or a non-string type instead of `""`.

- Interpretation: The empty-field code path returns a different falsy value than expected. While functionally similar to `""` for most boolean checks, this breaks strict equality comparisons (`=== ""`) in developer scripts. Document the actual return value and type.

**FAIL-3 (Wrong timezone in P3):** `new Date().toString()` does not contain `GMT-0300`.

- Interpretation: System timezone was not changed correctly, or Chrome was not restarted after the change. Re-do P1 and P2 before proceeding.

**FAIL-4 (V2 active in P5):** `useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: The platform has switched to V2 code path. This test was designed for V1. Verify whether V2 changes the empty-field behavior before recording results.

**FAIL-5 (Field not found in P6):** Filter returns no matching fields.

- Interpretation: The DateTest form template does not have a field with Config A flags. The form definition may have changed. Verify field configuration in the form builder.

## Related

| Reference              | Location                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------- |
| Matrix row             | `matrix.md` — row `8-A-empty`                                                          |
| Run file               | `results.md § Session 2026-04-01`, [run-1](../runs/tc-8-A-empty-run-1.md)              |
| Summary                | [summary](../summaries/tc-8-A-empty.md)                                                |
| Bug #6 analysis        | `analysis.md` — Bug #6: GetFieldValue Returns "Invalid Date" for Empty Config D Fields |
| Sibling: 8-D-empty     | Not yet created — Config D empty field (Bug #6 confirmed)                              |
| Field config reference | `matrix.md` — Field Configurations table, Config A                                     |
