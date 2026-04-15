# TC-3-H-BRT-BRT — Config H, Server Reload, BRT: legacy DateTime + ignoreTZ survives same-TZ reload; GFV unchanged

## Environment Specs

| Parameter               | Required Value                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                               |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                      |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                               |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)               |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=true`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, BRT midnight — `2026-03-15T00:00:00-03:00` = `2026-03-15T03:00:00Z` UTC  |

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

**P4 — Open a saved record** with Config H field set to 03/15/2026 12:00 AM (saved from BRT):

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
            f.enableTime === true &&
            f.ignoreTimezone === true &&
            f.useLegacy === true &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField13"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

## Test Steps

| #   | Action                                                       | Test Data                                                                                                | Expected Result                                    | ✓   |
| --- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                                               | See Preconditions P1–P6                                                                                  | All P1–P6 checks pass                              | ☐   |
| 2   | Capture raw stored value after reload (DevTools console)     | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                                           | `"2026-03-15T00:00:00"`                            | ☐   |
| 3   | Capture GetFieldValue return after reload (DevTools console) | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                                                  | `"2026-03-15T00:00:00"`                            | ☐   |
| 4   | Verify GFV matches raw (DevTools console)                    | `VV.Form.GetFieldValue('<FIELD_NAME>') === VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `true`                                             | ☐   |
| 5   | Confirm browser timezone (DevTools console)                  | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                                           | `"2026-03-15T03:00:00.000Z"` — confirms BRT active | ☐   |

> The record was originally saved in BRT with typed input producing `"2026-03-15T00:00:00"` (local midnight, no Z). On reload, `initCalendarValueV1` → `parseDateString()` processes the value. For same-TZ reload (BRT→BRT), the value should survive intact because `parseDateString` strips Z (no-op for this value) and the moment roundtrip preserves local midnight. The `useLegacy=true` flag means GFV returns the raw stored value without transformation — Bug #5 (fake Z) does not apply.

## Fail Conditions

**FAIL-1 (Raw value shifted after reload):** Step 2 returns a value other than `"2026-03-15T00:00:00"` (e.g., `"2026-03-14T21:00:00"` indicating a -3h shift).

- Interpretation: The `parseDateString()` → `moment(stripped).tz("UTC",true).local()` chain is re-interpreting the stored local-time string as UTC, then converting to local — causing a timezone-offset shift. This would mean same-TZ reloads are not safe for legacy DateTime fields with `ignoreTimezone=true`. Compare with TC-3-G-BRT-BRT (Config G, same legacy flag but `ignoreTimezone=false`) which passes.

**FAIL-2 (GFV applies toISOString or fake Z):** Step 3 returns `"2026-03-15T03:00:00.000Z"` or `"2026-03-15T00:00:00.000Z"` or any value with a Z suffix.

- Interpretation: The `useLegacy=true` flag is not fully bypassing the GFV transformation. Bug #5 (fake Z) only affects `enableTime=true && ignoreTimezone=true && !useLegacy` — if this field triggers it despite `useLegacy=true`, the legacy bypass is broken. Cross-reference TC-8-H-BRT which confirms legacy GFV returns raw value unchanged.

**FAIL-3 (Wrong timezone in P3):** `new Date().toString()` does not contain `GMT-0300`.

- Interpretation: System timezone is not BRT. Re-do P1 and P2 before proceeding.

**FAIL-4 (V2 active in P5):** `useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: The platform has switched to V2 code path. This test was designed for V1.

**FAIL-5 (Field not found in P6):** Filter returns no matching fields.

- Interpretation: The DateTest form template does not have a field with Config H flags.

## Related

| Reference                          | Location                                                                |
| ---------------------------------- | ----------------------------------------------------------------------- |
| Matrix row                         | `matrix.md` — row `3-H-BRT-BRT`                                         |
| Run file                           | [run-1](../runs/tc-3-H-BRT-BRT-run-1.md)                                |
| Summary                            | [summary](../summaries/tc-3-H-BRT-BRT.md)                               |
| Bug #5 analysis                    | `analysis.md` — Bug #5: Fake Z in GetFieldValue (useLegacy=true immune) |
| Bug #4 analysis                    | `analysis.md` — Bug #4: Legacy Save Format Strips Timezone              |
| Sibling: 3-G-BRT-BRT               | [tc-3-G-BRT-BRT.md](tc-3-G-BRT-BRT.md)                                  |
| Non-legacy equivalent: 3-D-BRT-BRT | [tc-3-D-BRT-BRT.md](tc-3-D-BRT-BRT.md)                                  |
| Legacy date-only: 3-E-BRT-BRT      | [tc-3-E-BRT-BRT.md](tc-3-E-BRT-BRT.md)                                  |
| GFV control: 8-H-BRT               | `summaries/tc-8-H-BRT.md` — confirms legacy GFV returns raw value       |
| Field config reference             | `matrix.md` — Field Configurations table, Config H                      |
