# TC-5-A-IST — Config A, Preset Date, IST: Bug #7 latent in preset Date object; save would corrupt to Feb 28

## Environment Specs

| Parameter               | Required Value                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                        |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, `IST`. No DST (India does not observe DST).                         |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                        |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                        |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=true`        |
| **Scenario**            | Preset date `3/1/2026`, IST midnight — `2026-03-01T00:00:00+05:30` = `2026-02-28T18:30:00Z` UTC |

## Preconditions

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

**P4 — Open the DateTest form template** (creates a fresh instance — preset auto-populates):

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

> Opening the template (not a saved record) triggers preset initialization. The target field has `enableInitialValue=true` with preset date `3/1/2026`. The form loads with this field pre-populated.

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
            f.enableTime === false &&
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === true
    )
    .map((f) => ({ name: f.name, initialDate: f.initialDate }));
// Expected result includes: { name: "DataField2", initialDate: "2026-03-01T03:00:00Z" }
// Multiple fields may match (Current Date fields also have enableInitialValue=true)
// Use the field whose initialDate contains "2026-03-01" — that is the preset field
// Record this name as <FIELD_NAME> in all console steps
```

> **Important:** The filter returns both preset and current-date fields. Identify the correct field by its `initialDate` value — the preset field has a fixed date (`"2026-03-01T03:00:00Z"`), while current-date fields have dynamic timestamps near the test execution time.

## Test Steps

| #   | Action                         | Test Data                                                                                    | Expected Result                                                                                              | ✓   |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --- |
| 1   | Complete setup                 | See Preconditions P1–P6                                                                      | All P1–P6 checks pass; target field identified as preset field with `initialDate` = `"2026-03-01T03:00:00Z"` | ☐   |
| 2   | Verify display of preset field | Visually inspect the target field (identified in P6)                                         | `03/01/2026`                                                                                                 | ☐   |
| 3   | Capture raw stored value       | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                               | Date object — `.toLocaleDateString()` = `"3/1/2026"`, `.toISOString()` contains `"2026-03-01"`               | ☐   |
| 4   | Capture GFV                    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                                      | `"2026-03-01"` (date-only string)                                                                            | ☐   |
| 5   | Simulate save extraction       | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>').toISOString().substring(0,10)` | `"2026-03-01"`                                                                                               | ☐   |
| 6   | Verify IST timezone active     | `new Date(2026, 2, 1, 0, 0, 0).toISOString()`                                                | `"2026-02-28T18:30:00.000Z"` — confirms IST active                                                           | ☐   |

> **Note on raw type**: Before save, preset fields store a **Date object** in the value partition, not a string. This is the same in both BRT and IST (5-A-BRT also stores a Date object). The Date object's `.toLocaleDateString()` shows the correct local date, but `.toISOString()` reflects the UTC representation. For date-only fields, `getSaveValue()` extracts the date portion from the UTC representation (`toISOString().substring(0,10)`). When IST midnight = previous UTC day, this extraction produces the wrong date.

## Fail Conditions

**FAIL-1 (Wrong timezone active):**
`new Date().toString()` does not contain `GMT+0530`.

- Interpretation: System timezone is not IST. The test cannot proceed because the preset init behavior depends on the local timezone. Re-run P1 and P2 before continuing.

**FAIL-2 (V2 code path active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 is active instead of V1. This test documents V1 behavior. V2 partially fixes Bug #7 for non-ignoreTZ date-only fields — this test may pass under V2.

**FAIL-3 (Bug #7 — preset Date object has wrong UTC date):**
Step 3: Raw Date `.toISOString()` = `"2026-02-28T18:30:00.000Z"` — the UTC date is February 28, not March 1. Step 5: simulated save extraction = `"2026-02-28"` instead of `"2026-03-01"`. Display in Step 2 may still show `03/01/2026` (correct local date), masking the internal corruption.

- Interpretation: Bug #7 confirmed on the preset/form-init path. `initCalendarValueV1` parses the preset date `"2026-03-01"` via `moment(e).toDate()` → IST local midnight (March 1 00:00 IST = Feb 28 18:30 UTC). The Date object represents the right local moment but has the wrong UTC calendar day. When `getSaveValue()` extracts `toISOString().substring(0,10)`, it gets `"2026-02-28"` — permanent data corruption on first save. **This is worse than Bug #7 on SetFieldValue because the user never entered a wrong value — the preset was configured correctly. Every form instance created in UTC+ timezones with date-only presets silently stores the wrong date.**

**FAIL-4 (GFV returns unexpected value):**
Step 4 returns a Date object instead of a date-only string, or returns a value other than the expected date.

- Interpretation: For preset fields before save, `GetFieldValue()` may return the raw Date object (same as `getValueObjectValue()`). If it returns `"2026-02-28T18:30:00.000Z"` (the Date's ISO representation), Bug #7 is exposed through the developer API. If it returns `"2026-03-01"` (correct local date), the bug is only latent in storage.

**FAIL-5 (Wrong IST offset in isoRef):**
Step 6 does not return `"2026-02-28T18:30:00.000Z"`.

- Interpretation: IST is not active in the browser's JS engine. Abort and re-check P1–P2.

## Related

| Reference                  | Location                                                              |
| -------------------------- | --------------------------------------------------------------------- |
| Matrix row                 | `../matrix.md` — row `5-A-IST`                                        |
| Summary                    | [summary](../summaries/tc-5-A-IST.md)                                 |
| Bug #7 analysis            | `../analysis.md` — Bug #7 (date-only SetFieldValue wrong day in UTC+) |
| Sibling: 5-A-BRT (PASS)    | matrix.md — row `5-A-BRT`                                             |
| Sibling: 1-A-IST (FAIL)    | [tc-1-A-IST.md](tc-1-A-IST.md) — popup input Bug #7                   |
| Sibling: 5-B-IST (PENDING) | matrix.md — row `5-B-IST` (same prediction — ignoreTZ inert)          |
| Field config reference     | `../../CLAUDE.md` — Test Form Fields table (Preset Date section)      |
