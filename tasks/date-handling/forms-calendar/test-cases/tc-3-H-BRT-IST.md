# TC-3-H-BRT-IST — Config H, Server Reload, BRT→IST: legacy DateTime + ignoreTZ survives cross-TZ reload; no fake Z

## Environment Specs

| Parameter               | Required Value                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                 |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, `IST`. No DST (India does not observe DST).                  |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                 |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=true`, `enableInitialValue=false`   |
| **Scenario**            | BRT-saved record reloaded in IST — stored `"2026-03-15T00:00:00"` should be TZ-invariant |

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

**P4 — Open the BRT-saved record** (DateTest-000472 Rev 1):

> This record was saved from BRT (UTC-3, 2026-04-02) with Config H field set to `03/15/2026 12:00 AM`. The stored value is `"2026-03-15T00:00:00"`. This test verifies the value survives cross-TZ reload and that `useLegacy=true` prevents Bug #5 fake Z on GFV.

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

| #   | Action                             | Test Data                                                                                                | Expected Result                                    | ✓   |
| --- | ---------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                     | See Preconditions P1–P6                                                                                  | All P1–P6 checks pass                              | ☐   |
| 2   | Verify form loaded with saved data | Tab title shows record name + Rev                                                                        | `DateTest-000472 Rev 1` (or current revision)      | ☐   |
| 3   | Verify display after IST reload    | Visually inspect the target field (identified in P6)                                                     | `03/15/2026 12:00 AM`                              | ☐   |
| 4   | Capture raw stored value           | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                                           | `"2026-03-15T00:00:00"`                            | ☐   |
| 5   | Capture GFV                        | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                                                  | `"2026-03-15T00:00:00"`                            | ☐   |
| 6   | Verify GFV matches raw             | `VV.Form.GetFieldValue('<FIELD_NAME>') === VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `true`                                             | ☐   |
| 7   | Verify IST timezone active         | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                                           | `"2026-03-14T18:30:00.000Z"` — confirms IST active | ☐   |

> **Key comparison with Config D (3-D-BRT-IST)**: Config D (`enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`) also stores `"2026-03-15T00:00:00"` and the raw value survives cross-TZ reload identically. However, Config D's GFV appends a fake Z (Bug #5), returning `"2026-03-15T00:00:00.000Z"`. Config H (`useLegacy=true`) should bypass this transformation — GFV returns raw value unchanged. Step 5 validates this distinction.

## Fail Conditions

**FAIL-1 (Wrong timezone active):**
`new Date().toString()` does not contain `GMT+0530`.

- Interpretation: System timezone is not IST. Re-run P1 and P2 before continuing.

**FAIL-2 (V2 code path active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 is active instead of V1. This test documents V1 behavior.

**FAIL-3 (Bug #5 — GFV appends fake Z despite useLegacy=true):**
Step 5 returns `"2026-03-15T00:00:00.000Z"` instead of `"2026-03-15T00:00:00"`. The `.000Z` suffix is appended by `getCalendarFieldValue()` using `moment(value).toISOString()`.

- Interpretation: The `useLegacy=true` flag is NOT bypassing the GFV fake-Z transformation in the cross-TZ case. This would be a new finding — same-TZ tests (TC-3-H-BRT-BRT, TC-8-H-BRT) confirm legacy bypasses Bug #5 in BRT. If cross-TZ reload triggers a different code path that ignores the legacy flag, it indicates `getCalendarFieldValue()` has timezone-dependent branching. Compare with TC-3-D-BRT-IST (non-legacy, Bug #5 confirmed).

**FAIL-4 (Raw value shifts on reload):**
Step 4 returns a value other than `"2026-03-15T00:00:00"`.

- Interpretation: The server reload path is transforming the stored DateTime value. For `ignoreTimezone=true`, the value should pass through unchanged regardless of reader timezone.

**FAIL-5 (Display shows wrong date or time):**
Step 3 shows a date other than `03/15/2026` or a time other than `12:00 AM`.

- Interpretation: The display component is misinterpreting the stored local time string on cross-TZ reload. With `ignoreTimezone=true`, display should be identical regardless of reader timezone.

**FAIL-6 (Wrong IST offset in isoRef):**
Step 7 does not return `"2026-03-14T18:30:00.000Z"`.

- Interpretation: IST is not active in the browser. Abort and re-check P1–P2.

## Related

| Reference                              | Location                                                                |
| -------------------------------------- | ----------------------------------------------------------------------- |
| Matrix row                             | `matrix.md` — row `3-H-BRT-IST`                                         |
| Run file                               | [run-1](../runs/tc-3-H-BRT-IST-run-1.md)                                |
| Summary                                | [summary](../summaries/tc-3-H-BRT-IST.md)                               |
| Bug #5 analysis                        | `analysis.md` — Bug #5: Fake Z in GetFieldValue (useLegacy=true immune) |
| Same-TZ sibling: 3-H-BRT-BRT           | [tc-3-H-BRT-BRT.md](tc-3-H-BRT-BRT.md)                                  |
| Non-legacy equivalent: 3-D-BRT-IST     | [tc-3-D-BRT-IST.md](tc-3-D-BRT-IST.md)                                  |
| Legacy date-only cross-TZ: 3-E-BRT-IST | [tc-3-E-BRT-IST.md](tc-3-E-BRT-IST.md)                                  |
| GFV control: 8-H-BRT                   | `summaries/tc-8-H-BRT.md` — confirms legacy GFV returns raw unchanged   |
| Field config reference                 | `matrix.md` — Field Configurations table, Config H                      |
