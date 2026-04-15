# TC-12-year-boundary-IST — Config D, Round-Trip, IST: +5:30h drift stays in 2026; opposite of BRT year crossing (Bug #5)

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, `IST`. No DST (India does not observe DST).                 |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-01-01`, IST midnight — `2026-01-01T00:00:00+05:30` = `2025-12-31T18:30:00Z` UTC   |

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

| #   | Action                                    | Test Data                                                                      | Expected Result                                                            | ✓   |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | --- |
| 1   | Complete setup                            | See Preconditions P1–P6                                                        | All P1–P6 checks pass                                                      | ☐   |
| 2   | Set baseline value (DevTools console)     | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-01-01T00:00:00')`                 | Field displays `01/01/2026 12:00 AM`                                       | ☐   |
| 3   | Capture baseline raw (DevTools console)   | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-01-01T00:00:00"`                                                    | ☐   |
| 4   | Capture baseline GFV (DevTools console)   | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-01-01T00:00:00"`                                                    | ☐   |
| 5   | Execute GFV round-trip (DevTools console) | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error                                                                   | ☐   |
| 6   | Capture post-trip display                 | Read field value from form UI                                                  | `01/01/2026 12:00 AM`                                                      | ☐   |
| 7   | Capture post-trip raw (DevTools console)  | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-01-01T00:00:00"`                                                    | ☐   |
| 8   | Capture post-trip GFV (DevTools console)  | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-01-01T00:00:00"`                                                    | ☐   |
| 9   | Calculate drift                           | Compare Step 3 and Step 7 raw values                                           | No drift — value unchanged                                                 | ☐   |
| 10  | Verify IST active (DevTools console)      | `new Date(2026, 0, 1, 0, 0, 0).toISOString()`                                  | `"2025-12-31T18:30:00.000Z"` — real UTC is Dec 31 18:30Z, not Jan 1 00:00Z | ☐   |

> **Opposite year boundary behavior**: BRT (UTC-3) drifts -3h from Jan 1 midnight → Dec 31 21:00 (year boundary crossed to 2025 in 1 trip — critical fiscal year corruption). IST (UTC+5:30) drifts +5:30h → Jan 1 05:30 (stays in 2026). The year boundary is NOT crossed for UTC+ users at Jan 1 midnight. Bug #5 still corrupts the time (+5:30h shift), but the year stays correct.

## Fail Conditions

**FAIL-1 (Bug #5 — baseline GFV fake Z):** Step 4 returns `"2026-01-01T00:00:00.000Z"` instead of `"2026-01-01T00:00:00"`.

- Interpretation: Bug #5 confirmed. GFV appends fake `.000Z`.

**FAIL-2 (Bug #5 — +5:30h drift, stays in 2026):** Step 7 returns `"2026-01-01T05:30:00"` instead of `"2026-01-01T00:00:00"`. Display (Step 6) shows `01/01/2026 05:30 AM`. The value stays in 2026 (opposite of BRT crossing to 2025).

- Interpretation: Bug #5 drift confirmed in IST at year boundary. Unlike BRT (fiscal year corrupted), IST preserves the year. The data is still corrupted (time shifted +5:30h), but year-based queries and fiscal year calculations remain correct after 1 trip.

**FAIL-3 (Year boundary crossed forward):** Step 7 shows a date in January 2 or later.

- Interpretation: Would require multiple trips. After ~4 trips: 00:00 → 05:30 → 11:00 → 16:30 → 22:00 → 03:30(Jan 2). Document exact trip count.

**FAIL-4 (Wrong timezone):** `new Date().toString()` does not contain `GMT+0530`.

- Interpretation: System timezone is not IST. Re-do P1 and P2.

## Related

| Reference              | Location                                           |
| ---------------------- | -------------------------------------------------- |
| Matrix row             | `matrix.md` — row `12-year-boundary-IST`           |
| Run file               | [run-1](../runs/tc-12-year-boundary-IST-run-1.md)  |
| Summary                | [summary](../summaries/tc-12-year-boundary-IST.md) |
| Bug #5 analysis        | `analysis.md` — Bug #5: Fake Z in GetFieldValue    |
| BRT sibling            | [tc-12-year-boundary.md](tc-12-year-boundary.md)   |
| UTC+0 control          | [tc-12-utc-0-control.md](tc-12-utc-0-control.md)   |
| Field config reference | `matrix.md` — Field Configurations table, Config D |
