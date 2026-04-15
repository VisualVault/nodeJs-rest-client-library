# TC-9-GDOC-D-BRT-1 — Config D, GDOC Round-Trip, BRT: zero drift; real UTC round-trips correctly

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                       |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, BRT midnight — `2026-03-15T00:00:00-03:00` = `2026-03-15T03:00:00Z` UTC   |

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
```

## Test Steps

| #   | Action                                      | Test Data                                                                                                | Expected Result                                    | ✓   |
| --- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                                                                  | All P1–P6 checks pass                              | ☐   |
| 2   | Set baseline value (DevTools console)       | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')`                                           | Field displays `03/15/2026 12:00 AM`               | ☐   |
| 3   | Capture baseline raw (DevTools console)     | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                                           | `"2026-03-15T00:00:00"`                            | ☐   |
| 4   | Get GDOC ISO value (DevTools console)       | `var d = VV.Form.GetDateObjectFromCalendar('<FIELD_NAME>'); d.toISOString()`                             | `"2026-03-15T03:00:00.000Z"`                       | ☐   |
| 5   | Execute GDOC round-trip (DevTools console)  | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetDateObjectFromCalendar('<FIELD_NAME>').toISOString())` | No error                                           | ☐   |
| 6   | Capture post-trip raw (DevTools console)    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                                           | `"2026-03-15T00:00:00"`                            | ☐   |
| 7   | Capture post-trip GFV (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                                                  | `"2026-03-15T00:00:00"`                            | ☐   |
| 8   | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                                           | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> **Key contrast with GFV round-trip**: The same Config D field drifts -3h per trip with `SetFieldValue(GetFieldValue())` (Bug #5 fake Z). GDOC round-trip should show zero drift because `.toISOString()` produces real UTC, which `normalizeCalValue` correctly parses back to local midnight.

## Fail Conditions

**FAIL-1 (Post-trip raw shifted by -3h):** Step 6 returns `"2026-03-15T03:00:00"` instead of `"2026-03-15T00:00:00"`.

- Interpretation: `normalizeCalValue` stored the UTC time component directly without converting to local time. This would mean the Z suffix is stripped before moment parses, causing it to treat `T03:00:00` as local time. Document the exact stored value.

**FAIL-2 (Post-trip raw shifted by +3h):** Step 6 returns `"2026-03-14T21:00:00"`.

- Interpretation: Double conversion — `normalizeCalValue` converts UTC to local (-3h), then `getSaveValue` extracts local time again. The real UTC string went through two timezone conversions instead of one.

**FAIL-3 (Wrong timezone in P3):** `new Date().toString()` does not contain `GMT-0300`.

- Interpretation: System timezone incorrect. Re-do P1 and P2.

**FAIL-4 (V2 active in P5):** `useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 active. This test was designed for V1.

## Related

| Reference                       | Location                                                              |
| ------------------------------- | --------------------------------------------------------------------- |
| Matrix row                      | `matrix.md` — row `9-GDOC-D-BRT-1`                                    |
| Run file                        | [run-1](../runs/tc-9-GDOC-D-BRT-1-run-1.md)                           |
| Summary                         | [summary](../summaries/tc-9-GDOC-D-BRT-1.md)                          |
| GDOC value source: 8B-D-BRT     | `summaries/tc-8B-D-BRT.md` — GDOC returns real UTC `"T03:00:00.000Z"` |
| GFV drift comparison: 9-D-BRT-1 | `matrix.md` — row `9-D-BRT-1` (Bug #5 fake-Z drift, -3h/trip)         |
| Bug #5 analysis                 | `analysis.md` — Bug #5: Inconsistent Developer API Behavior (fake Z)  |
| Field config reference          | `matrix.md` — Field Configurations table, Config D                    |
