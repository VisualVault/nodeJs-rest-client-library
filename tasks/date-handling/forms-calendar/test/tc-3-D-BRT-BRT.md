# TC-3-D-BRT-BRT — Config D, Server Reload, BRT: local midnight survives reload; GFV appends fake Z (Bug #5)

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, `BRT`. No DST active (BRT abolished DST in 2019).          |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
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
// PASS: output contains GMT-0300
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the DateTest form template** (creates a fresh instance):

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

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

| #   | Action                                                | Test Data                                                      | Expected Result                                                     | ✓   |
| --- | ----------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- | --- |
| 1   | Complete setup                                        | See Preconditions P1–P6                                        | All P1–P6 checks pass                                               | ☐   |
| 2   | Set a DateTime in the target field (identified in P6) | `VV.Form.SetFieldValue('<FIELD_NAME>', '03/15/2026 12:00 AM')` | Display shows `03/15/2026 12:00 AM`                                 | ☐   |
| 3   | Capture raw stored value before save                  | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"`                                             | ☐   |
| 4   | Capture GFV before save                               | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T00:00:00"`                                             | ☐   |
| 5   | Save the form                                         | Click the blue Save button in the toolbar                      | Form saves successfully; title shows instance name + Rev            | ☐   |
| 6   | Open saved record in a new tab                        | Navigate to the saved record URL (DataID from save)            | Tab title shows `DateTest-NNNNNN Rev 1`; form loads with saved data | ☐   |
| 7   | Verify display after reload                           | Visually inspect the target field                              | `03/15/2026 12:00 AM`                                               | ☐   |
| 8   | Capture raw stored value after reload                 | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"`                                             | ☐   |
| 9   | Capture GFV after reload                              | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T00:00:00"`                                             | ☐   |
| 10  | Verify BRT timezone active                            | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active                  | ☐   |

> **Note on Bug #5**: Step 9 Expected shows correct/intended behavior — GFV should return the raw stored value unchanged. Bug #5 causes `getCalendarFieldValue()` to append a fake `[Z]` suffix for Config D fields, producing `"2026-03-15T00:00:00.000Z"` instead. This fake Z misrepresents local midnight as UTC midnight. If a developer then passes this value to `SetFieldValue()`, it will be parsed as UTC and shifted by -3h in BRT, causing progressive drift. See FAIL-3.

## Fail Conditions

**FAIL-1 (Wrong timezone active):**
`new Date().toString()` does not contain `GMT-0300`.

- Interpretation: System timezone is not BRT. The test cannot proceed because all date behavior depends on the local timezone offset. Re-run P1 and P2 before continuing.

**FAIL-2 (V2 code path active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 is active instead of V1. This test documents V1 behavior. V2 may produce different results for the form load path. Verify the test applies to V2 before continuing.

**FAIL-3 (Bug #5 — GFV appends fake Z):**
Step 9 returns `"2026-03-15T00:00:00.000Z"` instead of `"2026-03-15T00:00:00"`. The `.000Z` suffix is appended by `getCalendarFieldValue()` (line ~104114) which uses `moment(value).toISOString()` for Config D fields (`enableTime=true && ignoreTimezone=true && !useLegacy`). This converts the local midnight Date object to a UTC ISO string with Z suffix, but does NOT apply timezone conversion — the hours remain `00:00:00`, making the Z a lie. Expected shows correct behavior (`"2026-03-15T00:00:00"`); the buggy system produces `"2026-03-15T00:00:00.000Z"`.

- Interpretation: Bug #5 confirmed on reload path. The raw stored value is correct (`"2026-03-15T00:00:00"` without Z), but any code reading via `GetFieldValue()` receives the fake Z. A `SetFieldValue(GetFieldValue())` round-trip will cause -3h drift per trip in BRT (8 trips = full day lost). This is the primary Config D bug surface.

**FAIL-4 (Raw value shifts on reload):**
Step 8 returns a value other than `"2026-03-15T00:00:00"`.

- Interpretation: The server reload path is transforming the stored value. This would indicate a bug in `initCalendarValueV1` or `parseDateString` for DateTime strings. The stored value should pass through unchanged since it has no Z suffix to strip.

**FAIL-5 (Display shows wrong time):**
Step 7 shows a time other than `12:00 AM` (e.g., `09:00 PM` or `03:00 AM`).

- Interpretation: The display component is misinterpreting the stored local time string. Investigate the display rendering path for Config D DateTime fields.

## Related

| Reference                  | Location                                                        |
| -------------------------- | --------------------------------------------------------------- |
| Matrix row                 | `matrix.md` — row `3-D-BRT-BRT`                                 |
| Results index              | `results.md § Session 2026-03-31 (BRT)`                         |
| Bug #5 analysis            | `../analysis.md` — Bug #5 (Inconsistent Developer API — fake Z) |
| Bug #6 analysis            | `../analysis.md` — Bug #6 (Invalid Date for empty Config D)     |
| Sibling: same-TZ Config A  | [tc-3-A-BRT-BRT.md](tc-3-A-BRT-BRT.md)                          |
| Sibling: same-TZ Config C  | [tc-3-C-BRT-BRT.md](tc-3-C-BRT-BRT.md)                          |
| Sibling: cross-TZ Config D | [tc-3-D-BRT-IST.md](tc-3-D-BRT-IST.md)                          |
| Round-trip drift tests     | matrix.md — rows `9-D-BRT-*`                                    |
| Field config reference     | `../../CLAUDE.md` — Test Form Fields table                      |
