# TC-3-F-BRT-BRT — Config F, Server Reload, BRT: legacy date-only + ignoreTZ survives save/reload; GFV unchanged

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                       |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=true`, `useLegacy=true`, `enableInitialValue=false` |
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

**P4 — Open a saved record** with Config F field set to 03/15/2026 (saved from BRT):

> The record must have been saved from a BRT timezone session. Use the saved record URL from the test infrastructure configuration.

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
            f.enableTime === false &&
            f.ignoreTimezone === true &&
            f.useLegacy === true &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField11"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

## Test Steps

| #   | Action                                                       | Test Data                                                                                                | Expected Result                                    | ✓   |
| --- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                                               | See Preconditions P1–P6                                                                                  | All P1–P6 checks pass                              | ☐   |
| 2   | Capture raw stored value after reload (DevTools console)     | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                                           | `"2026-03-15"`                                     | ☐   |
| 3   | Capture GetFieldValue return after reload (DevTools console) | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                                                  | `"2026-03-15"`                                     | ☐   |
| 4   | Verify GFV matches raw (DevTools console)                    | `VV.Form.GetFieldValue('<FIELD_NAME>') === VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `true`                                             | ☐   |
| 5   | Confirm browser timezone (DevTools console)                  | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                                           | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> The record was originally saved in BRT with typed input producing `"2026-03-15"` (date-only string). The `ignoreTimezone=true` flag has no effect on date-only fields — the reload path is identical to Config E. On reload, `initCalendarValueV1` processes the value, and for same-TZ (BRT→BRT) the date-only string should survive intact.

## Fail Conditions

**FAIL-1 (Raw value shifted after reload):** Step 2 returns a value other than `"2026-03-15"` (e.g., `"2026-03-14"` indicating a -1 day shift).

- Interpretation: The `initCalendarValueV1` load path is applying a timezone conversion to the date-only string. Since `ignoreTimezone=true` should be inert for date-only fields, this would indicate a code path where ignoreTimezone changes date-only handling. Compare with TC-3-E-BRT-BRT (same config minus ignoreTZ) to isolate the flag's effect.

**FAIL-2 (GFV differs from raw after reload):** Step 3 returns a value different from Step 2.

- Interpretation: `getCalendarFieldValue()` is transforming the stored value on output. For Config F (`enableTime=false`, `useLegacy=true`), the legacy GFV path should return the raw value unchanged regardless of `ignoreTimezone`. If GFV applies a transformation, the `ignoreTimezone` flag may trigger unexpected branching.

**FAIL-3 (Wrong timezone in P3):** `new Date().toString()` does not contain `GMT-0300`.

- Interpretation: System timezone is not BRT. Re-do P1 and P2 before proceeding.

**FAIL-4 (V2 active in P5):** `useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: The platform has switched to V2 code path. This test was designed for V1.

**FAIL-5 (Field not found in P6):** Filter returns no matching fields.

- Interpretation: The DateTest form template does not have a field with Config F flags.

## Related

| Reference                               | Location                                                                    |
| --------------------------------------- | --------------------------------------------------------------------------- |
| Matrix row                              | `matrix.md` — row `3-F-BRT-BRT`                                             |
| Run file                                | [run-1](../runs/tc-3-F-BRT-BRT-run-1.md)                                    |
| Summary                                 | [summary](../summaries/tc-3-F-BRT-BRT.md)                                   |
| Bug #7 analysis                         | `analysis.md` — Bug #7: SetFieldValue Wrong Day (UTC+ only, BRT unaffected) |
| Bug #4 analysis                         | `analysis.md` — Bug #4: Legacy Save Format Strips Timezone                  |
| Sibling: 3-E-BRT-BRT                    | [tc-3-E-BRT-BRT.md](tc-3-E-BRT-BRT.md)                                      |
| Non-legacy equivalent: 3-B-BRT-BRT      | [tc-3-B-BRT-BRT.md](tc-3-B-BRT-BRT.md)                                      |
| Legacy DateTime + ignoreTZ: 3-H-BRT-BRT | [tc-3-H-BRT-BRT.md](tc-3-H-BRT-BRT.md)                                      |
| Field config reference                  | `matrix.md` — Field Configurations table, Config F                          |
