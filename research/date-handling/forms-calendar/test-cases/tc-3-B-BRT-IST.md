# TC-3-B-BRT-IST — Config B, Server Reload, BRT→IST: date-only string survives cross-TZ reload; GFV unchanged

## Environment Specs

| Parameter               | Required Value                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                 |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, `IST`. No DST (India does not observe DST).                  |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                 |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
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
// PASS: output contains GMT+0530
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the BRT-saved record** (DateTest-000107 Rev 1):

```text
https://vvdemo.visualvault.com/FormViewer/app?DataID=c63dea33-867e-49e2-b929-fb226b6d3933&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

> This record was saved from BRT (UTC-3, 2026-04-01) with Config B field set to `03/15/2026`. The stored value is `"2026-03-15"`. This test verifies the date-only string survives cross-TZ reload when opened from IST.

**P5 — Verify code path** (DevTools console after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active; verify this test applies to V2 before continuing
```

**P6 — Locate the target field by configuration** (DevTools console):

```javascript
Object.values(VV.Form.VV.FormPartition.fieldMaster)
    .filter(
        (f) =>
            f.fieldType === 13 &&
            f.enableTime === false &&
            f.ignoreTimezone === true &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField10"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

## Test Steps

| #   | Action                             | Test Data                                                      | Expected Result                                    | ✓   |
| --- | ---------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                     | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Verify form loaded with saved data | Tab title shows record name + Rev                              | `DateTest-000107 Rev 1`                            | ☐   |
| 3   | Verify display after IST reload    | Visually inspect the target field (identified in P6)           | `03/15/2026`                                       | ☐   |
| 4   | Capture raw stored value           | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15"`                                     | ☐   |
| 5   | Capture GFV                        | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15"`                                     | ☐   |
| 6   | Verify IST timezone active         | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-14T18:30:00.000Z"` — confirms IST active | ☐   |

> **Note on Bug #7 prediction**: The matrix originally predicted Bug #7 would fire on form load in IST, causing the stored `"2026-03-15"` to shift to `"2026-03-14"`. However, tc-3-A-BRT-IST (Config A sibling) proved that date-only strings survive cross-TZ reload without re-parsing through a Date object. Config B (`ignoreTZ=true`) should behave identically since `ignoreTZ` is inert for `enableTime=false` fields. Steps 3–4 confirm this.

## Fail Conditions

**FAIL-1 (Wrong timezone active):**
`new Date().toString()` does not contain `GMT+0530`.

- Interpretation: System timezone is not IST. The test cannot proceed because the reload behavior depends on the local timezone. Re-run P1 and P2 before continuing.

**FAIL-2 (V2 code path active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 is active instead of V1. This test documents V1 behavior. V2 may produce different results for the form load path. Verify the test applies to V2 before continuing.

**FAIL-3 (Bug #7 — date shifts on IST reload):**
Step 4 returns `"2026-03-14"` instead of `"2026-03-15"`. The form load path parsed the date-only string `"2026-03-15"` as IST local midnight (2026-03-14T18:30:00Z), then `getSaveValue()` extracted the UTC date → `"2026-03-14"` (-1 day shift). Display in Step 3 would show `03/14/2026`.

- Interpretation: Bug #7 confirmed on form load path in IST. The stored value is corrupted on every reload from a UTC+ timezone — progressive data degradation. This is a critical data integrity issue. Note: tc-3-A-BRT-IST (Config A) did NOT trigger this, so a FAIL here would indicate Config B (`ignoreTimezone=true`) introduces different load behavior for date-only fields.

**FAIL-4 (GFV transforms the stored value):**
Step 5 returns a value other than the raw stored value from Step 4.

- Interpretation: `getCalendarFieldValue()` is transforming the date-only value for Config B. For Config B (`enableTime=false`, `ignoreTimezone=true`, `!useLegacy`), GFV should return the raw stored value unchanged. Bug #5 (fake Z) does not apply to `enableTime=false` fields.

**FAIL-5 (Wrong IST offset in isoRef):**
Step 6 does not return `"2026-03-14T18:30:00.000Z"`.

- Interpretation: IST is not active in the browser's JS engine. The timezone change did not take effect. Abort and re-check P1–P2.

## Related

| Reference                  | Location                                                      |
| -------------------------- | ------------------------------------------------------------- |
| Matrix row                 | `../matrix.md` — row `3-B-BRT-IST`                            |
| Run history                | [summary](../summaries/tc-3-B-BRT-IST.md)                     |
| Bug #7 analysis            | `../analysis.md` — Bug #7 (date-only SetFieldValue wrong day) |
| Sibling: same-TZ Config B  | [tc-3-B-BRT-BRT.md](tc-3-B-BRT-BRT.md)                        |
| Sibling: cross-TZ Config A | [tc-3-A-BRT-IST.md](tc-3-A-BRT-IST.md)                        |
| Sibling: cross-TZ Config D | [tc-3-D-BRT-IST.md](tc-3-D-BRT-IST.md)                        |
| Field config reference     | `../../CLAUDE.md` — Test Form Fields table                    |
