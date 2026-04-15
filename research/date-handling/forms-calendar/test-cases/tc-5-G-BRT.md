# TC-5-G-BRT — Config G, Preset Date, BRT: legacy DateTime preset stores raw Date; GFV returns raw Date (no bugs)

## Environment Specs

| Parameter               | Required Value                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                               |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, `BRT`. DST not observed (Brazil suspended DST in 2019).                   |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                               |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                               |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=true`, `enableInitialValue=true`                 |
| **Scenario**            | Preset DateTime `3/1/2026 08:32 AM` BRT — `2026-03-01T08:32:23-03:00` = `2026-03-01T11:32:23.628Z` UTC |

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
// PASS: output contains GMT-0300
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the DateTest form template** (creates a fresh instance — preset auto-populates):

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

> Opening the template (not a saved record) triggers preset initialization. The target field has `enableInitialValue=true` with a preset DateTime. The form loads with this field pre-populated.

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
            f.ignoreTimezone === false &&
            f.useLegacy === true &&
            f.enableInitialValue === true
    )
    .map((f) => ({ name: f.name, initialDate: f.initialDate }));
// Expected result includes: { name: "Field21", initialDate: "2026-03-01T11:32:23.628Z" }
// Multiple fields may match (Current Date fields also have enableInitialValue=true)
// Use the field whose initialDate contains "2026-03-01" — that is the preset field
// Record this name as <FIELD_NAME> in all console steps
```

> **Important:** The filter returns both preset and current-date fields. Identify the correct field by its `initialDate` value — the preset field has a fixed date containing `"2026-03-01"`, while current-date fields have dynamic timestamps near the test execution time.

## Test Steps

| #   | Action                         | Test Data                                                      | Expected Result                                                                                             | ✓   |
| --- | ------------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --- |
| 1   | Complete setup                 | See Preconditions P1–P6                                        | All P1–P6 checks pass; target field identified as preset field with `initialDate` containing `"2026-03-01"` | ☐   |
| 2   | Verify display of preset field | Visually inspect the target field (identified in P6)           | `03/01/2026 08:32 AM` (BRT local)                                                                           | ☐   |
| 3   | Capture raw stored value       | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | Date object — `.toISOString()` = `"2026-03-01T11:32:23.628Z"`                                               | ☐   |
| 4   | Capture GFV                    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | Date object — `.toISOString()` = `"2026-03-01T11:32:23.628Z"`                                               | ☐   |
| 5   | Verify BRT timezone active     | `new Date(2026, 2, 1, 0, 0, 0).toISOString()`                  | `"2026-03-01T03:00:00.000Z"` — confirms BRT active                                                          | ☐   |

> **Note on DateTime preset behavior**: DateTime presets bypass `parseDateString` truncation — the raw Date is identical to `initialDate`. Legacy GFV returns the raw Date as-is (no transformation). Compare with non-legacy Config C (same behavior, PASS) and Config D (fake Z via Bug #5 — legacy avoids this). The `useLegacy=true` flag prevents `getCalendarFieldValue()` from applying the Bug #5 fake Z transformation, making legacy DateTime presets safer than their non-legacy `ignoreTimezone=true` counterparts.

## Fail Conditions

**FAIL-1 (Wrong timezone active):**
`new Date().toString()` does not contain `GMT-0300`.

- Interpretation: System timezone is not BRT. The test cannot proceed because the preset init behavior depends on the local timezone. Re-run P1 and P2 before continuing.

**FAIL-2 (V2 code path active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 is active instead of V1. This test documents V1 behavior. V2 may process presets differently.

**FAIL-3 (Raw value does not match initialDate):**
Step 3: Raw Date `.toISOString()` does not equal `"2026-03-01T11:32:23.628Z"`.

- Interpretation: The init path transformed the preset value instead of preserving it. Verify the field configuration matches Config G and that the form template has not changed.

## Related

| Reference               | Location                                                         |
| ----------------------- | ---------------------------------------------------------------- |
| Matrix row              | `../matrix.md` — row `5-G-BRT`                                   |
| Summary                 | [summary](../summaries/tc-5-G-BRT.md)                            |
| Sibling: 5-C-BRT (PASS) | matrix.md — row `5-C-BRT` (non-legacy equivalent, PASS)          |
| Sibling: 5-H-BRT        | [tc-5-H-BRT.md](tc-5-H-BRT.md) — ignoreTZ sibling                |
| Field config reference  | `../../CLAUDE.md` — Test Form Fields table (Preset Date section) |
