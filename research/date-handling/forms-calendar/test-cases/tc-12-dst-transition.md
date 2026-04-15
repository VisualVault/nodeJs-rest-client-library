# TC-12-dst-transition — Config D, GFV Round-Trip, BRT: US DST day, BRT has no DST

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST since 2019.                                    |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-08`, 02:00 BRT — `2026-03-08T02:00:00-03:00` = `2026-03-08T05:00:00Z` UTC      |

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

| #   | Action                                        | Test Data                                                                  | Expected Result                                                             | ✓   |
| --- | --------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --- |
| 1   | Complete setup                                | See Preconditions P1–P6                                                    | All P1–P6 checks pass                                                       | ☐   |
| 2   | Set baseline value (DevTools console)         | `VV.Form.SetFieldValue('DataField5', '2026-03-08T02:00:00')`               | Field displays `03/08/2026 02:00 AM`                                        | ☐   |
| 3   | Capture baseline raw (DevTools console)       | `VV.Form.VV.FormPartition.getValueObjectValue('DataField5')`               | `"2026-03-08T02:00:00"`                                                     | ☐   |
| 4   | Capture baseline GFV (DevTools console)       | `VV.Form.GetFieldValue('DataField5')`                                      | `"2026-03-08T02:00:00.000Z"` (Bug #5 fake Z — actually local time)          | ☐   |
| 5   | Execute GFV round-trip (DevTools console)     | `VV.Form.SetFieldValue('DataField5', VV.Form.GetFieldValue('DataField5'))` | No error                                                                    | ☐   |
| 6   | Capture post-trip display                     | Read field value from form UI                                              | `03/07/2026 11:00 PM` (shifted -3h, day crossed to March 7)                 | ☐   |
| 7   | Capture post-trip raw (DevTools console)      | `VV.Form.VV.FormPartition.getValueObjectValue('DataField5')`               | `"2026-03-07T23:00:00"` (-3h drift, day boundary crossed)                   | ☐   |
| 8   | Capture post-trip GFV (DevTools console)      | `VV.Form.GetFieldValue('DataField5')`                                      | `"2026-03-07T23:00:00.000Z"` (Bug #5 fake Z on shifted value)               | ☐   |
| 9   | Calculate drift                               | Compare Step 3 and Step 7 raw values                                       | Drift = -3h (one TZ offset). Day crossed from March 8 to March 7.           | ☐   |
| 10  | Verify fake Z is incorrect (DevTools console) | `new Date(2026, 2, 8, 2, 0, 0).toISOString()`                              | `"2026-03-08T05:00:00.000Z"` — real UTC is 05:00Z, not 02:00Z as GFV claims | ☐   |

> **Why US DST day matters**: March 8, 2026 is when US clocks spring forward (2:00 AM → 3:00 AM EST/EDT). Brazil abolished DST in 2019, so BRT stays at UTC-3 year-round. This test confirms that the GFV round-trip drift is purely based on the system's current UTC offset (-3h) and is not affected by DST rules of other regions. The V8 engine in Chrome uses the system timezone's IANA data — BRT has no transition on this date, so the drift should be a clean -3h with no DST-related anomalies.

## Fail Conditions

**FAIL-1 (Post-trip raw shifted unexpectedly):** Step 7 returns a value other than `"2026-03-07T23:00:00"`.

- Interpretation: The drift is not exactly -3h. If the shift is -4h or different, it may indicate V8 is applying US DST rules despite the system being set to BRT. Document the actual shift.

**FAIL-2 (GFV returns different format):** Step 4 returns a value without the `.000Z` suffix or with a different format.

- Interpretation: `getCalendarFieldValue()` behaves differently on DST transition dates. Document the actual format.

**FAIL-3 (Wrong timezone in P3):** `new Date().toString()` does not contain `GMT-0300` or `BRT`.

- Interpretation: System timezone incorrect. Re-do P1 and P2.

**FAIL-4 (No day boundary crossed):** Step 7 raw value date portion is still `2026-03-08`.

- Interpretation: The drift is less than expected. At 02:00 with -3h drift, the result should be 23:00 on March 7. If it stays on March 8, the drift mechanism differs from the standard Bug #5 pattern.

## Related

| Reference              | Location                                                             |
| ---------------------- | -------------------------------------------------------------------- |
| Matrix row             | `matrix.md` — row `12-dst-transition`                                |
| Bug #5 analysis        | `analysis.md` — Bug #5: Inconsistent Developer API Behavior (fake Z) |
| UTC+0 control          | `tc-12-utc-0-control.md` — zero drift baseline                       |
| BRT drift: 9-D-BRT-1   | `matrix.md` — row `9-D-BRT-1` (Config D drifts -3h/trip in BRT)      |
| Field config reference | `matrix.md` — Field Configurations table, Config D                   |
