# TC-12-utc-0-control — Config D, GFV Round-Trip, UTC+0: zero drift; fake Z coincidentally correct

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `Etc/GMT` — UTC+0, GMT. No DST.                                                         |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, UTC midnight — `2026-03-15T00:00:00+00:00` = `2026-03-15T00:00:00Z` UTC   |

## Preconditions

**P1 — Set system timezone to `Etc/GMT`:**

macOS:

```bash
sudo systemsetup -settimezone GMT
```

Windows (run as Administrator):

```bat
tzutil /s "UTC"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "UTC"
```

Linux:

```bash
sudo timedatectl set-timezone Etc/GMT
```

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains "GMT+0000" or "UTC"
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

| #   | Action                                                     | Test Data                                                                      | Expected Result                                                       | ✓   |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- | --- |
| 1   | Complete setup                                             | See Preconditions P1–P6                                                        | All P1–P6 checks pass                                                 | ☐   |
| 2   | Set baseline value (DevTools console)                      | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')`                 | Field displays `03/15/2026 12:00 AM`                                  | ☐   |
| 3   | Capture baseline raw (DevTools console)                    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"`                                               | ☐   |
| 4   | Capture baseline GFV (DevTools console)                    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T00:00:00"` (correct — no fake Z needed)                  | ☐   |
| 5   | Execute GFV round-trip (DevTools console)                  | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'))` | No error                                                              | ☐   |
| 6   | Capture post-trip raw (DevTools console)                   | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                 | `"2026-03-15T00:00:00"`                                               | ☐   |
| 7   | Capture post-trip GFV (DevTools console)                   | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                        | `"2026-03-15T00:00:00"` (correct — no fake Z needed)                  | ☐   |
| 8   | Verify fake Z is coincidentally correct (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                 | `"2026-03-15T00:00:00.000Z"` — UTC midnight = local midnight at UTC+0 | ☐   |

> **Why this is a control**: Bug #5 adds a fake `[Z]` suffix to local time, mislabeling it as UTC. At UTC+0, local time IS UTC, so the "fake" Z is accidentally correct. The round-trip `SFV(GFV())` produces zero drift because `normalizeCalValue` parses `"T00:00:00.000Z"` as UTC midnight, which equals local midnight. Compare with 9-D-BRT-1 (-3h drift in BRT) and 9-D-IST-1 (+5:30h drift in IST).

## Fail Conditions

**FAIL-1 (Post-trip raw shifted):** Step 6 returns a value other than `"2026-03-15T00:00:00"`.

- Interpretation: The fake Z is causing drift even at UTC+0. This would mean `normalizeCalValue` adds an unexpected transformation beyond the UTC→local conversion. Document the shift amount.

**FAIL-2 (GFV returns different format):** Step 4 returns a value without the `.000Z` suffix or with a different format.

- Interpretation: `getCalendarFieldValue()` behaves differently at UTC+0 than at non-zero offsets. Document the actual format.

**FAIL-3 (Wrong timezone in P3):** `new Date().toString()` does not contain `GMT+0000`.

- Interpretation: System timezone incorrect. Re-do P1 and P2.

## Related

| Reference              | Location                                                             |
| ---------------------- | -------------------------------------------------------------------- |
| Matrix row             | `matrix.md` — row `12-utc-0-control`                                 |
| Run file               | [run-1](../runs/tc-12-utc-0-control-run-1.md)                        |
| Summary                | [summary](../summaries/tc-12-utc-0-control.md)                       |
| Bug #5 analysis        | `analysis.md` — Bug #5: Inconsistent Developer API Behavior (fake Z) |
| BRT drift: 9-D-BRT-1   | `matrix.md` — row `9-D-BRT-1` (Config D drifts -3h/trip in BRT)      |
| IST drift: 9-D-IST-1   | `matrix.md` — row `9-D-IST-1` (Config D drifts +5:30h/trip in IST)   |
| Field config reference | `matrix.md` — Field Configurations table, Config D                   |
