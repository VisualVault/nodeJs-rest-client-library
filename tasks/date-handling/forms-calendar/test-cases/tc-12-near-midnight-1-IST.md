# TC-12-near-midnight-1-IST — Config D, SetFieldValue, IST: ISO+Z near midnight stays same day; GFV adds fake Z (Bug #5)

## Environment Specs

| Parameter               | Required Value                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                         |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, `IST`. No DST (India does not observe DST).                          |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                         |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                         |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`          |
| **Scenario**            | `2026-03-15T00:30:00.000Z` (UTC), IST — `2026-03-15T06:00:00+05:30` = `2026-03-15T00:30:00Z` UTC |

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

| #   | Action                        | Test Data                                                           | Expected Result                                    | ✓   |
| --- | ----------------------------- | ------------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                | See Preconditions P1–P6                                             | All P1–P6 checks pass                              | ☐   |
| 2   | Set ISO+Z value near midnight | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:30:00.000Z')` | Display shows `03/15/2026 06:00 AM`                | ☐   |
| 3   | Capture raw stored value      | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`      | `"2026-03-15T06:00:00"`                            | ☐   |
| 4   | Capture GFV                   | `VV.Form.GetFieldValue('<FIELD_NAME>')`                             | `"2026-03-15T06:00:00"`                            | ☐   |
| 5   | Confirm IST timezone active   | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                      | `"2026-03-14T18:30:00.000Z"` — confirms IST active | ☐   |

> ISO+Z input is parsed as UTC (00:30 UTC = 06:00 IST on Mar 15). Unlike BRT (UTC-3) which shifts to the previous day (Mar 14 21:30), IST (UTC+5:30) stays on the same day (Mar 15 06:00). The day-crossing outcome depends entirely on the TZ offset sign.

## Fail Conditions

**FAIL-1 (Bug #5 — GFV appends fake Z):** Step 4 returns `"2026-03-15T06:00:00.000Z"` instead of `"2026-03-15T06:00:00"`. The `.000Z` suffix is appended by `getCalendarFieldValue()` using `moment(value).toISOString()`.

- Interpretation: Bug #5 confirmed in IST. The fake Z misrepresents IST 06:00 as UTC 06:00. If round-tripped, subsequent SFV would parse `"06:00:00.000Z"` as UTC, converting to IST 11:30 → stored as `"2026-03-15T11:30:00"` (+5:30h drift).

**FAIL-2 (Day crossing — unexpected):** Step 3 returns a value on Mar 14 instead of Mar 15.

- Interpretation: IST (UTC+5:30) should NOT cross days for 00:30 UTC input. If Mar 14 appears, `normalizeCalValue()` or `getSaveValue()` is extracting the UTC date instead of the IST date.

**FAIL-3 (Wrong timezone):** `new Date().toString()` does not contain `GMT+0530`.

- Interpretation: System timezone is not IST. Re-do P1 and P2.

**FAIL-4 (V2 active):** `useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 is active. This test documents V1 behavior.

**FAIL-5 (Field not found):** P6 returns no matching fields.

- Interpretation: The DateTest form template does not have a field with Config D flags.

## Related

| Reference              | Location                                             |
| ---------------------- | ---------------------------------------------------- |
| Matrix row             | `matrix.md` — row `12-near-midnight-1-IST`           |
| Run file               | [run-1](../runs/tc-12-near-midnight-1-IST-run-1.md)  |
| Summary                | [summary](../summaries/tc-12-near-midnight-1-IST.md) |
| Bug #5 analysis        | `analysis.md` — Bug #5: Fake Z in GetFieldValue      |
| BRT sibling            | [tc-12-near-midnight-1.md](tc-12-near-midnight-1.md) |
| UTC+0 control          | [tc-12-utc-0-control.md](tc-12-utc-0-control.md)     |
| Field config reference | `matrix.md` — Field Configurations table, Config D   |
