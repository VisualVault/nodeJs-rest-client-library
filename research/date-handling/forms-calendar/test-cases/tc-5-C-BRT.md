# TC-5-C-BRT — Config C, Preset Date, BRT: DateTime preset stored as raw Date object; GFV returns real UTC ISO (no bugs)

## Environment Specs

| Parameter               | Required Value                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                                |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, `BRT`. DST not observed (Brazil suspended DST in 2019).                    |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=true`                 |
| **Scenario**            | Preset DateTime `3/31/2026 08:29 AM` BRT — `2026-03-31T08:29:14-03:00` = `2026-03-31T11:29:14.181Z` UTC |

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

> Opening the template (not a saved record) triggers preset initialization. The target field has `enableTime=true` with a preset DateTime value. The form loads with this field pre-populated including time.

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
            f.useLegacy === false &&
            f.enableInitialValue === true
    )
    .map((f) => ({ name: f.name, initialDate: f.initialDate }));
// Expected result includes: { name: "Field15", initialDate: "2026-03-31T11:29:14.181Z" }
// Multiple fields may match (Current Date fields also have enableInitialValue=true)
// Use the field whose initialDate contains a fixed timestamp (not near current time)
// Record this name as <FIELD_NAME> in all console steps
```

> **Important:** The filter returns both preset and current-date fields. For Config C, the preset field (Field15) has `initialDate: "2026-03-31T11:29:14.181Z"` — a fixed historical timestamp. The current-date field (Field17) has a dynamic timestamp near the test execution time. Use the historical timestamp field.

## Test Steps

| #   | Action                         | Test Data                                                      | Expected Result                                                                                                  | ✓   |
| --- | ------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --- |
| 1   | Complete setup                 | See Preconditions P1–P6                                        | All P1–P6 checks pass; target field identified as preset field with `initialDate` = `"2026-03-31T11:29:14.181Z"` | ☐   |
| 2   | Verify display of preset field | Visually inspect the target field (identified in P6)           | `03/31/2026 08:29 AM` (BRT local display of the preset DateTime)                                                 | ☐   |
| 3   | Capture raw stored value       | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | Date object — `.toISOString()` = `"2026-03-31T11:29:14.181Z"`                                                    | ☐   |
| 4   | Capture GFV                    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-31T11:29:14.181Z"` (real UTC ISO string — Config C uses `new Date(value).toISOString()`)               | ☐   |
| 5   | Verify BRT timezone active     | `new Date(2026, 2, 31, 0, 0, 0).toISOString()`                 | `"2026-03-31T03:00:00.000Z"` — confirms BRT active                                                               | ☐   |

> **Note on DateTime preset behavior**: Unlike date-only presets (which go through `parseDateString` with hardcoded `enableTime=false`), DateTime preset fields store the raw Date object identical to the `initialDate` value — no truncation to midnight, no timezone stripping. The raw value is `new Date("2026-03-31T11:29:14.181Z")` which preserves the original UTC timestamp. Config C's GFV path (`new Date(value).toISOString()`) returns the same real UTC ISO string.

## Fail Conditions

**FAIL-1 (Wrong timezone active):**
`new Date().toString()` does not contain `GMT-0300`.

- Interpretation: System timezone is not BRT. Re-run P1 and P2 before continuing.

**FAIL-2 (V2 code path active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 is active instead of V1. This test documents V1 behavior.

**FAIL-3 (Raw value does not match initialDate):**
Step 3: Raw Date `.toISOString()` ≠ `"2026-03-31T11:29:14.181Z"`.

- Interpretation: The init path applied an unexpected transformation to the DateTime preset. Check if `parseDateString` with hardcoded `enableTime=false` truncated the time to midnight, which would indicate Bug #3 is affecting the stored value (not just the init parameters).

**FAIL-4 (GFV returns wrong format):**
Step 4 returns a value that is not `"2026-03-31T11:29:14.181Z"`.

- Interpretation: Config C GFV path (`new Date(value).toISOString()`) should return the same UTC ISO string as the raw. If it returns a different value, the GFV transformation is altering the timestamp.

## Related

| Reference              | Location                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| Matrix row             | `../matrix.md` — row `5-C-BRT`                                                                   |
| Summary                | [summary](../summaries/tc-5-C-BRT.md)                                                            |
| Bug #3 analysis        | `../analysis.md` — Bug #3 (hardcoded params — does not affect stored value for DateTime presets) |
| Sibling: 5-C-IST       | [tc-5-C-IST.md](tc-5-C-IST.md) — same config in IST (identical values)                           |
| Field config reference | `../../CLAUDE.md` — Test Form Fields table (Preset Date section)                                 |
