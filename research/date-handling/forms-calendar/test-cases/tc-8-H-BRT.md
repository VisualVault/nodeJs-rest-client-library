# TC-8-H-BRT — Config H, GetFieldValue, BRT: raw value unchanged; no fake Z — useLegacy bypasses Bug #5

## Environment Specs

| Parameter               | Required Value                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                               |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                      |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                               |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)               |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=true`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, BRT midnight — `2026-03-15T00:00:00-03:00` = `2026-03-15T03:00:00Z` UTC  |

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
            f.useLegacy === true &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField13"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

## Test Steps

| #   | Action                                                            | Test Data                                                                                                | Expected Result                                    | ✓   |
| --- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                                                    | See Preconditions P1–P6                                                                                  | All P1–P6 checks pass                              | ☐   |
| 2   | Set a known DateTime value on the target field (DevTools console) | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')`                                           | Field displays `03/15/2026 12:00 AM`               | ☐   |
| 3   | Capture raw stored value (DevTools console)                       | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                                           | `"2026-03-15T00:00:00"`                            | ☐   |
| 4   | Capture GetFieldValue return (DevTools console)                   | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                                                  | `"2026-03-15T00:00:00"`                            | ☐   |
| 5   | Verify GFV matches raw (DevTools console)                         | `VV.Form.GetFieldValue('<FIELD_NAME>') === VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `true`                                             | ☐   |
| 6   | Confirm browser timezone (DevTools console)                       | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                                           | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> This test is a control for Bug #5. Config H (`useLegacy=true`) has the same `enableTime` + `ignoreTimezone` flags as Config D (`useLegacy=false`), but `getCalendarFieldValue()` skips the fake-Z branch when `useLegacy=true`. Compare step 4 result with 8-D-BRT (which returns `"2026-03-15T00:00:00.000Z"` — fake Z).

## Fail Conditions

**FAIL-1 (GetFieldValue returns fake Z):** Step 4 returns `"2026-03-15T00:00:00.000Z"` instead of `"2026-03-15T00:00:00"`.

- Interpretation: Bug #5 affects Config H despite `useLegacy=true`. This would mean the `!useLegacy` guard in `getCalendarFieldValue()` is not working as analyzed. Escalate — the scope of Bug #5 is wider than expected. Re-verify the code path condition: `if (!fieldDef.useLegacy && fieldDef.enableTime)`.

**FAIL-2 (GetFieldValue applies toISOString):** Step 4 returns `"2026-03-15T03:00:00.000Z"` (real UTC conversion, not fake Z).

- Interpretation: The legacy code path is applying `new Date(value).toISOString()` — the `ignoreTimezone=false` branch instead of the `ignoreTimezone=true` branch. This would mean `useLegacy` doesn't bypass the entire enableTime block but routes to a different sub-branch. Document the actual return value.

**FAIL-3 (Wrong timezone in P3):** `new Date().toString()` does not contain `GMT-0300`.

- Interpretation: System timezone was not changed correctly, or Chrome was not restarted after the change. Re-do P1 and P2 before proceeding.

**FAIL-4 (V2 active in P5):** `useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: The platform has switched to V2 code path. This test was designed for V1. Verify whether V2 changes the legacy behavior before recording results.

**FAIL-5 (Field not found in P6):** Filter returns no matching fields.

- Interpretation: The DateTest form template does not have a field with Config H flags. Verify field configuration in the form builder.

## Related

| Reference               | Location                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| Matrix row              | `matrix.md` — row `8-H-BRT`                                                                 |
| Run file                | [run-1](../runs/tc-8-H-BRT-run-1.md)                                                        |
| Summary                 | [summary](../summaries/tc-8-H-BRT.md)                                                       |
| Bug #5 analysis         | `analysis.md` — Bug #5: Inconsistent Developer API Behavior (fake Z in GetFieldValue)       |
| Key comparison: 8-D-BRT | `matrix.md` — row `8-D-BRT` (Config D, same flags except `useLegacy=false` — Bug #5 active) |
| Sibling: 8-H-IST        | Not yet created — Config H GFV in IST (expected same result, TZ-invariant)                  |
| Sibling: 8-H-empty      | Not yet created — Config H empty field (does `useLegacy=true` prevent Bug #6?)              |
| Field config reference  | `matrix.md` — Field Configurations table, Config H                                          |
