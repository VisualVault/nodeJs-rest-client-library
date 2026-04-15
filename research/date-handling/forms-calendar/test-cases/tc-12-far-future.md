# TC-12-far-future — Config D, GFV Round-Trip, BRT: far-future date, year boundary crossed from Dec 31 midnight

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST since 2019.                                    |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2099-12-31`, BRT midnight — `2099-12-31T00:00:00-03:00` = `2099-12-31T03:00:00Z` UTC   |

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
// PASS: output contains "GMT-0300" or "BRT"
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
// ABORT: true  → V2 is active
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

| #   | Action                                        | Test Data                                                                  | Expected Result                                                                    | ✓   |
| --- | --------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --- |
| 1   | Complete setup                                | See Preconditions P1–P6                                                    | All P1–P6 checks pass                                                              | ☐   |
| 2   | Set baseline value (DevTools console)         | `VV.Form.SetFieldValue('DataField5', '2099-12-31T00:00:00')`               | Field displays `12/31/2099 12:00 AM`                                               | ☐   |
| 3   | Capture baseline raw (DevTools console)       | `VV.Form.VV.FormPartition.getValueObjectValue('DataField5')`               | `"2099-12-31T00:00:00"`                                                            | ☐   |
| 4   | Capture baseline GFV (DevTools console)       | `VV.Form.GetFieldValue('DataField5')`                                      | `"2099-12-31T00:00:00.000Z"` (Bug #5 fake Z — actually local time)                 | ☐   |
| 5   | Execute GFV round-trip (DevTools console)     | `VV.Form.SetFieldValue('DataField5', VV.Form.GetFieldValue('DataField5'))` | No error                                                                           | ☐   |
| 6   | Capture post-trip display                     | Read field value from form UI                                              | `12/30/2099 09:00 PM` (shifted -3h, crossed to Dec 30)                             | ☐   |
| 7   | Capture post-trip raw (DevTools console)      | `VV.Form.VV.FormPartition.getValueObjectValue('DataField5')`               | `"2099-12-30T21:00:00"` (-3h drift, day boundary crossed)                          | ☐   |
| 8   | Capture post-trip GFV (DevTools console)      | `VV.Form.GetFieldValue('DataField5')`                                      | `"2099-12-30T21:00:00.000Z"` (Bug #5 fake Z on shifted value)                      | ☐   |
| 9   | Calculate drift                               | Compare Step 3 and Step 7 raw values                                       | Drift = -3h (one TZ offset). Day crossed from Dec 31 to Dec 30.                    | ☐   |
| 10  | Verify fake Z is incorrect (DevTools console) | `new Date(2099, 11, 31, 0, 0, 0).toISOString()`                            | `"2099-12-31T03:00:00.000Z"` — real UTC is 03:00Z Dec 31, not 00:00Z as GFV claims | ☐   |

> **Why far-future dates matter**: This test validates that the Bug #5 drift mechanism is stable across extreme date ranges. V8's `Date` object handles dates up to year 275760, but IANA timezone data for far-future dates relies on extrapolation from current rules. Since Brazil abolished DST in 2019 and BRT is a fixed UTC-3, the offset should remain -3h for 2099. If it does not, it would indicate V8 is applying speculative future DST rules. Additionally, this tests that the year-end boundary crossing (Dec 31 → Dec 30) behaves identically to the year-start case (Jan 1 → Dec 31 in `tc-12-year-boundary`), confirming the drift is purely mechanical and not date-sensitive.

## Fail Conditions

**FAIL-1 (Post-trip raw shifted unexpectedly):** Step 7 returns a value other than `"2099-12-30T21:00:00"`.

- Interpretation: The drift is not exactly -3h for far-future dates. If the offset differs, V8 may be applying speculative DST rules for 2099. Document the actual shift.

**FAIL-2 (GFV returns different format):** Step 4 returns a value without the `.000Z` suffix or with a different format.

- Interpretation: `getCalendarFieldValue()` behaves differently for far-future dates. Document the actual format.

**FAIL-3 (Wrong timezone in P3):** `new Date().toString()` does not contain `GMT-0300` or `BRT`.

- Interpretation: System timezone incorrect. Re-do P1 and P2.

**FAIL-4 (Day boundary not crossed):** Step 7 raw value date portion is still `2099-12-31`.

- Interpretation: The drift stayed within Dec 31. At midnight with -3h drift this should not happen. Document the exact value.

## Related

| Reference              | Location                                                             |
| ---------------------- | -------------------------------------------------------------------- |
| Matrix row             | `matrix.md` — row `12-far-future`                                    |
| Bug #5 analysis        | `analysis.md` — Bug #5: Inconsistent Developer API Behavior (fake Z) |
| UTC+0 control          | `tc-12-utc-0-control.md` — zero drift baseline                       |
| Year boundary          | `tc-12-year-boundary.md` — year crossed from Jan 1 midnight          |
| Leap day               | `tc-12-leap-day.md` — leap day lost from Feb 29 midnight             |
| BRT drift: 9-D-BRT-1   | `matrix.md` — row `9-D-BRT-1` (Config D drifts -3h/trip in BRT)      |
| Field config reference | `matrix.md` — Field Configurations table, Config D                   |
