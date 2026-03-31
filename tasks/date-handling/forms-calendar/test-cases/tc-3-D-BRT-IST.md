# TC-3-D-BRT-IST — Config D, Server Reload, BRT→IST: raw value TZ-invariant; GFV appends fake Z (Bug #5)

## Environment Specs

| Parameter               | Required Value                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                 |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, `IST`. No DST (India does not observe DST).                  |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                 |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`  |
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
// PASS: output contains GMT+0530
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the BRT-saved record** (DateTest-000080 Rev 2):

```text
https://vvdemo.visualvault.com/FormViewer/app?DataID=901ce05d-b2f7-42e9-8569-7f9d4caf258d&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

> This record was saved from BRT (UTC-3, 2026-03-31) with Config D field set to `03/15/2026 12:00 AM`. The stored value is `"2026-03-15T00:00:00"`. This test verifies the value survives cross-TZ reload.

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
            f.enableTime === true &&
            f.ignoreTimezone === true &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField5"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

## Test Steps

| #   | Action                             | Test Data                                                      | Expected Result                                    | ✓   |
| --- | ---------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                     | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Verify form loaded with saved data | Tab title shows record name + Rev                              | `DateTest-000004 Rev 1` (or current revision)      | ☐   |
| 3   | Verify display after IST reload    | Visually inspect the target field (identified in P6)           | `03/15/2026 12:00 AM`                              | ☐   |
| 4   | Capture raw stored value           | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"`                            | ☐   |
| 5   | Capture GFV                        | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T00:00:00"`                            | ☐   |
| 6   | Verify IST timezone active         | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-14T18:30:00.000Z"` — confirms IST active | ☐   |

> **Note on Bug #5**: Step 5 Expected shows correct/intended behavior — GFV should return the raw stored value unchanged. Bug #5 causes `getCalendarFieldValue()` to append a fake `[Z]` suffix for Config D fields, producing `"2026-03-15T00:00:00.000Z"` instead. This misrepresents local midnight as UTC midnight. If a developer passes this value to `SetFieldValue()` in IST, it will be parsed as UTC and shifted by +5:30h, causing progressive drift. See FAIL-3.

## Fail Conditions

**FAIL-1 (Wrong timezone active):**
`new Date().toString()` does not contain `GMT+0530`.

- Interpretation: System timezone is not IST. The test cannot proceed because the reload behavior depends on the local timezone. Re-run P1 and P2 before continuing.

**FAIL-2 (V2 code path active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 is active instead of V1. This test documents V1 behavior. V2 may produce different results for the form load path. Verify the test applies to V2 before continuing.

**FAIL-3 (Bug #5 — GFV appends fake Z):**
Step 5 returns `"2026-03-15T00:00:00.000Z"` instead of `"2026-03-15T00:00:00"`. The `.000Z` suffix is appended by `getCalendarFieldValue()` (line ~104114) which uses `moment(value).toISOString()` for Config D fields (`enableTime=true && ignoreTimezone=true && !useLegacy`). This converts the stored local time to an ISO string with Z suffix without applying timezone conversion — the hours remain `00:00:00`, making the Z a false UTC claim. Expected shows correct behavior (`"2026-03-15T00:00:00"`); the buggy system produces `"2026-03-15T00:00:00.000Z"`.

- Interpretation: Bug #5 confirmed on IST reload path. The raw stored value is correct (`"2026-03-15T00:00:00"` — TZ-invariant, unchanged from BRT save), but any code reading via `GetFieldValue()` receives the fake Z. A `SetFieldValue(GetFieldValue())` round-trip in IST will cause +5:30h drift per trip (~4.4 trips = full day gained). Note: BRT-BRT Run 1 (2026-03-27) did not observe fake Z on GFV; IST reload consistently triggers it — investigate whether the reader's timezone affects `getCalendarFieldValue()` output.

**FAIL-4 (Raw value shifts on reload):**
Step 4 returns a value other than `"2026-03-15T00:00:00"`.

- Interpretation: The server reload path is transforming the stored value. This would indicate a bug in `initCalendarValueV1` or `parseDateString` for DateTime strings with `ignoreTimezone=true`. The stored value should pass through unchanged since Config D suppresses offset conversion.

**FAIL-5 (Display shows wrong date or time):**
Step 3 shows a date other than `03/15/2026` or a time other than `12:00 AM`.

- Interpretation: The display component is misinterpreting the stored local time string on cross-TZ reload. With `ignoreTimezone=true`, the display should be identical regardless of the reader's timezone.

**FAIL-6 (Wrong IST offset in isoRef):**
Step 6 does not return `"2026-03-14T18:30:00.000Z"`.

- Interpretation: IST is not active in the browser's JS engine. The timezone change did not take effect. Abort and re-check P1–P2.

## Related

| Reference                 | Location                                                        |
| ------------------------- | --------------------------------------------------------------- |
| Matrix row                | `../matrix.md` — row `3-D-BRT-IST`                              |
| Results index             | `../results.md § Session 2026-04-01 (IST)`                      |
| Bug #5 analysis           | `../analysis.md` — Bug #5 (Inconsistent Developer API — fake Z) |
| Bug #6 analysis           | `../analysis.md` — Bug #6 (Invalid Date for empty Config D)     |
| Sibling: same-TZ BRT-BRT  | [tc-3-D-BRT-BRT.md](tc-3-D-BRT-BRT.md)                          |
| Sibling: same-TZ Config A | [tc-3-A-BRT-BRT.md](tc-3-A-BRT-BRT.md)                          |
| Sibling: same-TZ Config C | [tc-3-C-BRT-BRT.md](tc-3-C-BRT-BRT.md)                          |
| Inverse: IST→BRT Config D | matrix.md — row `3-D-IST-BRT` (PENDING)                         |
| Round-trip drift tests    | matrix.md — rows `9-D-IST-*`                                    |
| Field config reference    | `../../CLAUDE.md` — Test Form Fields table                      |
