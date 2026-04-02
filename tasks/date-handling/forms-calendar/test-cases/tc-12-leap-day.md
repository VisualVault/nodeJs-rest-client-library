# TC-12-leap-day — Config D, GFV Round-Trip, BRT: leap day lost in 1 trip from Feb 29 midnight

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST since 2019.                                    |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2028-02-29`, BRT midnight — `2028-02-29T00:00:00-03:00` = `2028-02-29T03:00:00Z` UTC   |

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
| 2   | Set baseline value (DevTools console)         | `VV.Form.SetFieldValue('DataField5', '2028-02-29T00:00:00')`               | Field displays `02/29/2028 12:00 AM`                                               | ☐   |
| 3   | Capture baseline raw (DevTools console)       | `VV.Form.VV.FormPartition.getValueObjectValue('DataField5')`               | `"2028-02-29T00:00:00"`                                                            | ☐   |
| 4   | Capture baseline GFV (DevTools console)       | `VV.Form.GetFieldValue('DataField5')`                                      | `"2028-02-29T00:00:00.000Z"` (Bug #5 fake Z — actually local time)                 | ☐   |
| 5   | Execute GFV round-trip (DevTools console)     | `VV.Form.SetFieldValue('DataField5', VV.Form.GetFieldValue('DataField5'))` | No error                                                                           | ☐   |
| 6   | Capture post-trip display                     | Read field value from form UI                                              | `02/28/2028 09:00 PM` (shifted -3h, leap day LOST)                                 | ☐   |
| 7   | Capture post-trip raw (DevTools console)      | `VV.Form.VV.FormPartition.getValueObjectValue('DataField5')`               | `"2028-02-28T21:00:00"` (-3h drift, Feb 29 → Feb 28)                               | ☐   |
| 8   | Capture post-trip GFV (DevTools console)      | `VV.Form.GetFieldValue('DataField5')`                                      | `"2028-02-28T21:00:00.000Z"` (Bug #5 fake Z on shifted value)                      | ☐   |
| 9   | Calculate drift                               | Compare Step 3 and Step 7 raw values                                       | Drift = -3h (one TZ offset). Leap day lost — Feb 29 → Feb 28.                      | ☐   |
| 10  | Verify fake Z is incorrect (DevTools console) | `new Date(2028, 1, 29, 0, 0, 0).toISOString()`                             | `"2028-02-29T03:00:00.000Z"` — real UTC is 03:00Z Feb 29, not 00:00Z as GFV claims | ☐   |

> **Why leap day matters**: February 29 only exists in leap years. A single round-trip shifts the date to February 28 — a valid date that exists every year. Unlike other day-boundary crossings where the shifted date is still "close" to the original, losing a leap day means the record now references a completely different calendar date. Any business logic that validates leap-year dates, calculates age from birthdate, or schedules events on Feb 29 will silently get the wrong date. A second round-trip would shift to Feb 28 18:00, a third to Feb 28 15:00, etc. — the leap day is irrecoverably lost after the first trip.

## Fail Conditions

**FAIL-1 (Post-trip raw shifted unexpectedly):** Step 7 returns a value other than `"2028-02-28T21:00:00"`.

- Interpretation: The drift is not exactly -3h or the leap day handling introduces additional behavior. Document the actual value.

**FAIL-2 (GFV returns different format):** Step 4 returns a value without the `.000Z` suffix or with a different format.

- Interpretation: `getCalendarFieldValue()` behaves differently for leap day dates. Document the actual format.

**FAIL-3 (Wrong timezone in P3):** `new Date().toString()` does not contain `GMT-0300` or `BRT`.

- Interpretation: System timezone incorrect. Re-do P1 and P2.

**FAIL-4 (Leap day preserved):** Step 7 raw value date portion is still `2028-02-29`.

- Interpretation: The drift stayed within Feb 29. At midnight with -3h drift this should not happen, but document if a different time component appears.

## Related

| Reference              | Location                                                             |
| ---------------------- | -------------------------------------------------------------------- |
| Matrix row             | `matrix.md` — row `12-leap-day`                                      |
| Bug #5 analysis        | `analysis.md` — Bug #5: Inconsistent Developer API Behavior (fake Z) |
| UTC+0 control          | `tc-12-utc-0-control.md` — zero drift baseline                       |
| BRT drift: 9-D-BRT-1   | `matrix.md` — row `9-D-BRT-1` (Config D drifts -3h/trip in BRT)      |
| Year boundary          | `tc-12-year-boundary.md` — year crossed in 1 trip                    |
| Field config reference | `matrix.md` — Field Configurations table, Config D                   |
