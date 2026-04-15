# TC-3-E-BRT-IST — Config E, Server Reload, BRT→IST: legacy date-only string survives cross-TZ reload; GFV unchanged

## Environment Specs

| Parameter               | Required Value                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                 |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, `IST`. No DST (India does not observe DST).                  |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                 |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=true`, `enableInitialValue=false` |
| **Scenario**            | BRT-saved record reloaded in IST — stored `"2026-03-15"` should be unchanged on reload   |

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

**P4 — Open the BRT-saved record** (DateTest-000471 Rev 1):

> This record was saved from BRT (UTC-3, 2026-04-02) with Config E field set to `03/15/2026`. The stored value is `"2026-03-15"`. This test verifies the date-only string survives cross-TZ reload when loaded in IST.

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
            f.ignoreTimezone === false &&
            f.useLegacy === true &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField12"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

## Test Steps

| #   | Action                             | Test Data                                                      | Expected Result                                    | ✓   |
| --- | ---------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                     | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Verify form loaded with saved data | Tab title shows record name + Rev                              | `DateTest-000471 Rev 1` (or current revision)      | ☐   |
| 3   | Verify display after IST reload    | Visually inspect the target field (identified in P6)           | `03/15/2026`                                       | ☐   |
| 4   | Capture raw stored value           | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15"`                                     | ☐   |
| 5   | Capture GFV                        | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15"`                                     | ☐   |
| 6   | Verify IST timezone active         | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-14T18:30:00.000Z"` — confirms IST active | ☐   |

> Date-only strings are timezone-invariant in the storage and retrieval paths. The `initCalendarValueV1` load path for date-only fields preserves the raw `"2026-03-15"` string without re-parsing through a Date object. This is consistent with Config A (3-A-BRT-IST, PASS) and Config B (3-B-BRT-IST, PASS) — the `useLegacy=true` flag does not alter date-only reload behavior.

## Fail Conditions

**FAIL-1 (Wrong timezone active):**
`new Date().toString()` does not contain `GMT+0530`.

- Interpretation: System timezone is not IST. Re-run P1 and P2 before continuing.

**FAIL-2 (V2 code path active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 is active instead of V1. This test documents V1 behavior.

**FAIL-3 (Bug #7 — date shifts on IST reload):**
Step 4 returns `"2026-03-14"` instead of `"2026-03-15"`. The form load path parsed the date-only string `"2026-03-15"` as IST local midnight (2026-03-14T18:30:00Z), then `getSaveValue()` extracted the UTC date → `"2026-03-14"` (-1 day shift).

- Interpretation: Bug #7 confirmed on the legacy form load path in IST. The stored value is corrupted on every reload from a UTC+ timezone. Compare with TC-3-A-BRT-IST (non-legacy, PASS) to determine if `useLegacy=true` changes the load path.

**FAIL-4 (GFV transforms the stored value):**
Step 5 returns a value other than the raw stored value from Step 4.

- Interpretation: `getCalendarFieldValue()` is transforming the date-only value for Config E. For legacy date-only fields, GFV should return the raw stored value unchanged.

**FAIL-5 (Wrong IST offset in isoRef):**
Step 6 does not return `"2026-03-14T18:30:00.000Z"`.

- Interpretation: IST is not active in the browser. Abort and re-check P1–P2.

## Related

| Reference                             | Location                                                    |
| ------------------------------------- | ----------------------------------------------------------- |
| Matrix row                            | `matrix.md` — row `3-E-BRT-IST`                             |
| Run file                              | [run-1](../runs/tc-3-E-BRT-IST-run-1.md)                    |
| Summary                               | [summary](../summaries/tc-3-E-BRT-IST.md)                   |
| Bug #7 analysis                       | `analysis.md` — Bug #7: SetFieldValue Wrong Day (UTC+ only) |
| Same-TZ sibling: 3-E-BRT-BRT          | [tc-3-E-BRT-BRT.md](tc-3-E-BRT-BRT.md)                      |
| Non-legacy equivalent: 3-A-BRT-IST    | [tc-3-A-BRT-IST.md](tc-3-A-BRT-IST.md)                      |
| ignoreTZ sibling: 3-F-BRT-BRT         | [tc-3-F-BRT-BRT.md](tc-3-F-BRT-BRT.md)                      |
| Legacy DateTime cross-TZ: 3-H-BRT-IST | [tc-3-H-BRT-IST.md](tc-3-H-BRT-IST.md)                      |
| Field config reference                | `matrix.md` — Field Configurations table, Config E          |
