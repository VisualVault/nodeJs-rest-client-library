# TC-8-D-BRT — Config D, GetFieldValue with value, BRT: GFV adds fake Z to local time (Bug #5)

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                       |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15T00:00:00`, BRT — set via SetFieldValue, then read via GetFieldValue         |

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

| #   | Action                                                            | Test Data                                                      | Expected Result                                      | ✓   |
| --- | ----------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------- | --- |
| 1   | Complete setup                                                    | See Preconditions P1–P6                                        | All P1–P6 checks pass                                | ☐   |
| 2   | Set a known DateTime value on the target field (DevTools console) | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')` | Field displays `03/15/2026 12:00 AM`                 | ☐   |
| 3   | Capture raw stored value (DevTools console)                       | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"`                              | ☐   |
| 4   | Capture GetFieldValue return (DevTools console)                   | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T00:00:00"` (correct: no transformation) | ☐   |
| 5   | Confirm browser timezone via toISOString (DevTools console)       | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active   | ☐   |

> Step 5 proves BRT is active. If GFV returned real UTC, it would match Step 5 (+3h). Bug #5 returns `"2026-03-15T00:00:00.000Z"` — same digits as raw but with fake Z appended, not a genuine UTC conversion.

## Fail Conditions

**FAIL-1 (Bug #5 fake Z):** Step 4 returns `"2026-03-15T00:00:00.000Z"` instead of `"2026-03-15T00:00:00"`.

- Interpretation: Bug #5 confirmed. `getCalendarFieldValue()` appends a literal `[Z]` format suffix to the raw local time value when `enableTime=true && ignoreTimezone=true && !useLegacy`. The `Z` does not represent a real UTC conversion — Step 5 shows that real UTC from BRT midnight would be `"2026-03-15T03:00:00.000Z"`. This fake Z causes progressive -3h drift on every `SetFieldValue(GetFieldValue())` round-trip.

**FAIL-2 (Wrong timezone in P3):** `new Date().toString()` does not contain `GMT-0300`.

- Interpretation: System timezone was not changed correctly, or Chrome was not restarted after the change. Re-do P1 and P2 before proceeding.

**FAIL-3 (V2 active in P5):** `useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: The platform has switched to V2 code path. This test was designed for V1. Verify whether V2 changes the Config D GFV behavior before recording results.

**FAIL-4 (Field not found in P6):** Filter returns no matching fields.

- Interpretation: The DateTest form template does not have a field with Config D flags. Verify field configuration in the form builder.

## Related

| Reference              | Location                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------- |
| Matrix row             | `matrix.md` — row `8-D-BRT`                                                           |
| IST sibling            | `tc-8-D-IST.md` — Config D GFV in IST (same fake Z regardless of TZ — Bug #5)         |
| Empty sibling          | `tc-8-D-empty.md` — Config D empty field (Bug #6 returns "Invalid Date")              |
| Config C comparison    | `tc-8-C-BRT.md` — Config C GFV in BRT (real UTC, no Bug #5)                           |
| Bug #5 analysis        | `analysis.md` — Bug #5: Inconsistent Developer API Behavior (fake Z in GetFieldValue) |
| Field config reference | `matrix.md` — Field Configurations table, Config D                                    |
