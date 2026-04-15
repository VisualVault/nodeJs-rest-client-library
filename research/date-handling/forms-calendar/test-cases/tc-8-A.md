# TC-8-A — Config A, GetFieldValue with value, BRT: returns raw date string unchanged; no bugs

## Environment Specs

| Parameter               | Required Value                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                  |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                         |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                  |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                  |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, BRT — set via SetFieldValue, then read via GetFieldValue                    |

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

| #   | Action                                                        | Test Data                                                      | Expected Result                                    | ✓   |
| --- | ------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                                                | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Set a known date value on the target field (DevTools console) | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15')`          | Field displays `03/15/2026`                        | ☐   |
| 3   | Capture raw stored value (DevTools console)                   | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15"`                                     | ☐   |
| 4   | Capture GetFieldValue return (DevTools console)               | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15"`                                     | ☐   |
| 5   | Confirm browser timezone via toISOString (DevTools console)   | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> Config A (`enableTime=false`) returns the raw date string unchanged. GFV does not apply any transformation to date-only fields — the value passes through `getCalendarFieldValue()` without modification.

## Fail Conditions

**FAIL-1 (Wrong value):** Step 4 returns a value different from `"2026-03-15"`.

- Interpretation: GFV is transforming the date-only value unexpectedly. Document the actual return value and compare with the raw value from Step 3.

**FAIL-2 (Wrong timezone in P3):** `new Date().toString()` does not contain `GMT-0300`.

- Interpretation: System timezone was not changed correctly, or Chrome was not restarted after the change. Re-do P1 and P2 before proceeding.

**FAIL-3 (V2 active in P5):** `useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: The platform has switched to V2 code path. This test was designed for V1. Verify whether V2 changes the date-only GFV behavior before recording results.

**FAIL-4 (Field not found in P6):** Filter returns no matching fields.

- Interpretation: The DateTest form template does not have a field with Config A flags. Verify field configuration in the form builder.

## Related

| Reference              | Location                                                      |
| ---------------------- | ------------------------------------------------------------- |
| Matrix row             | `matrix.md` — row `8-A`                                       |
| Sibling: 8-A-empty     | `tc-8-A-empty.md` — Config A empty field (passes — no Bug #6) |
| Config D comparison    | `tc-8-D-BRT.md` — Config D GFV with value (Bug #5 fake Z)     |
| Field config reference | `matrix.md` — Field Configurations table, Config A            |
