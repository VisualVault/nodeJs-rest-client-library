# TC-12-near-midnight-2-IST — Config D, Round-Trip, IST: +5:30h drift crosses day FORWARD; opposite of BRT (Bug #5)

## Environment Specs

| Parameter               | Required Value                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                       |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, `IST`. No DST (India does not observe DST).                        |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                       |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                       |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`        |
| **Scenario**            | `2026-03-15T23:00:00`, IST midnight — `2026-03-15T23:00:00+05:30` = `2026-03-15T17:30:00Z` UTC |

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
// PASS: output contains "GMT+0530"
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

| #   | Action                                     | Test Data                                                                      | Expected Result                                    | ✓   |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------- | --- |
| 1   | Complete setup                             | See Preconditions P1–P6                                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Set near-midnight value (DevTools console) | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T23:00:00')`                 | Field displays `03/15/2026 11:00 PM`               | ☐   |
| 3   | Capture baseline raw (DevTools console)    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T23:00:00"`                            | ☐   |
| 4   | Capture baseline GFV (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T23:00:00"`                            | ☐   |
| 5   | Execute GFV round-trip (DevTools console)  | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error                                           | ☐   |
| 6   | Capture post-trip display                  | Read field value from form UI                                                  | `03/15/2026 11:00 PM`                              | ☐   |
| 7   | Capture post-trip raw (DevTools console)   | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T23:00:00"`                            | ☐   |
| 8   | Capture post-trip GFV (DevTools console)   | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T23:00:00"`                            | ☐   |
| 9   | Confirm IST timezone active                | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                 | `"2026-03-14T18:30:00.000Z"` — confirms IST active | ☐   |

> **Near-midnight resilience comparison**: BRT (UTC-3) drifts -3h per trip: 23:00→20:00→17:00→... Day is crossed after 8 trips. IST (UTC+5:30) drifts +5:30h per trip: 23:00→04:30(next day)→10:00→... Day crosses FORWARD after just 1 trip. IST is more destructive for near-midnight values because the +5:30h offset exceeds the remaining time before midnight (1 hour).

## Fail Conditions

**FAIL-1 (Bug #5 — baseline GFV fake Z):** Step 4 returns `"2026-03-15T23:00:00.000Z"` instead of `"2026-03-15T23:00:00"`.

- Interpretation: Bug #5 confirmed. GFV appends fake `.000Z` to local time value.

**FAIL-2 (Bug #5 — +5:30h drift, day crosses forward):** Step 7 returns `"2026-03-16T04:30:00"` instead of `"2026-03-15T23:00:00"`. Display (Step 6) shows `03/16/2026 04:30 AM`. The fake Z from Step 4 caused IST (+5:30) to shift forward by 5:30h: 23:00 + 5:30 = 04:30 next day.

- Interpretation: Bug #5 drift confirmed in IST. Opposite direction from BRT (-3h stays same day). A single round-trip at 23:00 IST advances the date by one day. This is the worst-case near-midnight scenario — any value after 18:30 IST will cross midnight on 1 trip.

**FAIL-3 (Wrong timezone):** `new Date().toString()` does not contain `GMT+0530`.

- Interpretation: System timezone is not IST. Re-do P1 and P2.

**FAIL-4 (V2 active):** `useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 is active. This test documents V1 behavior.

## Related

| Reference              | Location                                             |
| ---------------------- | ---------------------------------------------------- |
| Matrix row             | `matrix.md` — row `12-near-midnight-2-IST`           |
| Run file               | [run-1](../runs/tc-12-near-midnight-2-IST-run-1.md)  |
| Summary                | [summary](../summaries/tc-12-near-midnight-2-IST.md) |
| Bug #5 analysis        | `analysis.md` — Bug #5: Fake Z in GetFieldValue      |
| BRT sibling            | [tc-12-near-midnight-2.md](tc-12-near-midnight-2.md) |
| UTC+0 control          | [tc-12-utc-0-control.md](tc-12-utc-0-control.md)     |
| Field config reference | `matrix.md` — Field Configurations table, Config D   |
