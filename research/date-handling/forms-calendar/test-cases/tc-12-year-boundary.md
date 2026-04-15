# TC-12-year-boundary — Config D, GFV Round-Trip, BRT: year boundary crossed in 1 trip from Jan 1 midnight

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST since 2019.                                    |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-01-01`, BRT midnight — `2026-01-01T00:00:00-03:00` = `2026-01-01T03:00:00Z` UTC   |

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

| #   | Action                                        | Test Data                                                                  | Expected Result                                                                   | ✓   |
| --- | --------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --- |
| 1   | Complete setup                                | See Preconditions P1–P6                                                    | All P1–P6 checks pass                                                             | ☐   |
| 2   | Set baseline value (DevTools console)         | `VV.Form.SetFieldValue('DataField5', '2026-01-01T00:00:00')`               | Field displays `01/01/2026 12:00 AM`                                              | ☐   |
| 3   | Capture baseline raw (DevTools console)       | `VV.Form.VV.FormPartition.getValueObjectValue('DataField5')`               | `"2026-01-01T00:00:00"`                                                           | ☐   |
| 4   | Capture baseline GFV (DevTools console)       | `VV.Form.GetFieldValue('DataField5')`                                      | `"2026-01-01T00:00:00.000Z"` (Bug #5 fake Z — actually local time)                | ☐   |
| 5   | Execute GFV round-trip (DevTools console)     | `VV.Form.SetFieldValue('DataField5', VV.Form.GetFieldValue('DataField5'))` | No error                                                                          | ☐   |
| 6   | Capture post-trip display                     | Read field value from form UI                                              | `12/31/2025 09:00 PM` (shifted -3h, YEAR CROSSED to 2025)                         | ☐   |
| 7   | Capture post-trip raw (DevTools console)      | `VV.Form.VV.FormPartition.getValueObjectValue('DataField5')`               | `"2025-12-31T21:00:00"` (-3h drift, year boundary crossed)                        | ☐   |
| 8   | Capture post-trip GFV (DevTools console)      | `VV.Form.GetFieldValue('DataField5')`                                      | `"2025-12-31T21:00:00.000Z"` (Bug #5 fake Z on shifted value)                     | ☐   |
| 9   | Calculate drift                               | Compare Step 3 and Step 7 raw values                                       | Drift = -3h (one TZ offset). Year crossed from 2026 to 2025.                      | ☐   |
| 10  | Verify fake Z is incorrect (DevTools console) | `new Date(2026, 0, 1, 0, 0, 0).toISOString()`                              | `"2026-01-01T03:00:00.000Z"` — real UTC is 03:00Z Jan 1, not 00:00Z as GFV claims | ☐   |

> **Why year boundary matters**: This is the most severe manifestation of Bug #5 drift. A single `SFV(GFV())` round-trip on January 1 midnight crosses the year boundary — the record now shows 2025 instead of 2026. For business logic that checks year values (`getFullYear()`), fiscal year calculations, or year-based filtering, this is a critical data corruption. Any automated workflow that reads and writes back a Config D field will silently roll the date back by 3 hours per cycle, and at year boundaries this causes the most visible damage.

## Fail Conditions

**FAIL-1 (Post-trip raw shifted unexpectedly):** Step 7 returns a value other than `"2025-12-31T21:00:00"`.

- Interpretation: The drift is not exactly -3h. Document the actual shift amount and whether the year boundary was crossed differently.

**FAIL-2 (GFV returns different format):** Step 4 returns a value without the `.000Z` suffix or with a different format.

- Interpretation: `getCalendarFieldValue()` behaves differently for year-boundary dates. Document the actual format.

**FAIL-3 (Wrong timezone in P3):** `new Date().toString()` does not contain `GMT-0300` or `BRT`.

- Interpretation: System timezone incorrect. Re-do P1 and P2.

**FAIL-4 (Year boundary not crossed):** Step 7 raw value year portion is still `2026`.

- Interpretation: Either the drift is less than -3h or the date landed on `2026-01-01` with a different time. Document the exact value — this would contradict the Bug #5 mechanism.

## Related

| Reference              | Location                                                             |
| ---------------------- | -------------------------------------------------------------------- |
| Matrix row             | `matrix.md` — row `12-year-boundary`                                 |
| Bug #5 analysis        | `analysis.md` — Bug #5: Inconsistent Developer API Behavior (fake Z) |
| UTC+0 control          | `tc-12-utc-0-control.md` — zero drift baseline                       |
| BRT drift: 9-D-BRT-1   | `matrix.md` — row `9-D-BRT-1` (Config D drifts -3h/trip in BRT)      |
| Field config reference | `matrix.md` — Field Configurations table, Config D                   |
