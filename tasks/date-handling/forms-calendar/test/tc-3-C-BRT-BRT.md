# TC-3-C-BRT-BRT — Config C, Server Reload, BRT: local midnight survives reload; GFV returns correct UTC

## Environment Specs

| Parameter               | Required Value                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                 |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, `BRT`. No DST active (BRT abolished DST in 2019).           |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                 |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, BRT midnight — `2026-03-15T00:00:00-03:00` = `2026-03-15T03:00:00Z` UTC    |

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
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField6"]
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
| 4   | Capture GFV before save                               | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T03:00:00.000Z"`                                        | ☐   |
| 5   | Save the form                                         | Click the blue Save button in the toolbar                      | Form saves successfully; title shows instance name + Rev            | ☐   |
| 6   | Open saved record in a new tab                        | Navigate to the saved record URL (DataID from save)            | Tab title shows `DateTest-NNNNNN Rev 1`; form loads with saved data | ☐   |
| 7   | Verify display after reload                           | Visually inspect the target field                              | `03/15/2026 12:00 AM`                                               | ☐   |
| 8   | Capture raw stored value after reload                 | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"`                                             | ☐   |
| 9   | Capture GFV after reload                              | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T03:00:00.000Z"`                                        | ☐   |
| 10  | Verify BRT timezone active                            | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active                  | ☐   |

> **Note on GFV behavior**: Config C (`ignoreTimezone=false`) GFV correctly applies UTC conversion: local midnight `T00:00:00` + BRT offset (+3h) = `T03:00:00.000Z`. This is correct behavior — not Bug #5. Bug #5 only affects `ignoreTimezone=true` fields where a fake `[Z]` is appended to local time without conversion.

## Fail Conditions

**FAIL-1 (Wrong timezone active):**
`new Date().toString()` does not contain `GMT-0300`.

- Interpretation: System timezone is not BRT. The test cannot proceed because all date behavior depends on the local timezone offset. Re-run P1 and P2 before continuing.

**FAIL-2 (V2 code path active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 is active instead of V1. This test documents V1 behavior. V2 may produce different results for the form load path. Verify the test applies to V2 before continuing.

**FAIL-3 (Raw value shifts on reload):**
Step 8 returns a value other than `"2026-03-15T00:00:00"` (e.g., `"2026-03-14T21:00:00"` or `"2026-03-15T03:00:00"`).

- Interpretation: The server reload path is transforming the stored value. If `parseDateString()` stripped a Z suffix and reinterpreted as local time, the value would shift by the timezone offset. For Config C in BRT, the stored value has no Z suffix, so this should not occur. If it does, investigate `initCalendarValueV1` for unexpected transformations on DateTime strings.

**FAIL-4 (GFV returns wrong UTC conversion):**
Step 9 returns a value other than `"2026-03-15T03:00:00.000Z"` (e.g., `"2026-03-15T00:00:00.000Z"` with no offset applied, or a value with fake `[Z]`).

- Interpretation: If GFV returns `"2026-03-15T00:00:00.000Z"` (UTC midnight instead of BRT midnight in UTC), the UTC conversion is being skipped. If GFV returns a value with literal `[Z]`, Bug #5 may have been mischaracterized and affects Config C as well. Investigate `getCalendarFieldValue()` for the specific transformation.

**FAIL-5 (Display shows wrong time):**
Step 7 shows a time other than `12:00 AM` (e.g., `09:00 PM` or `03:00 AM`).

- Interpretation: The display component is interpreting the stored local time string incorrectly. If it shows `03:00 AM`, the stored value may have been converted to UTC and then displayed without converting back. Investigate the display rendering path.

## Related

| Reference                  | Location                                              |
| -------------------------- | ----------------------------------------------------- |
| Matrix row                 | `matrix.md` — row `3-C-BRT-BRT`                       |
| Results index              | `results.md § Session 2026-03-31 (BRT)`               |
| Bug #1 analysis            | `../analysis.md` — Bug #1 (Timezone Marker Stripping) |
| Bug #4 analysis            | `../analysis.md` — Bug #4 (Legacy Save Format)        |
| Sibling: same-TZ Config A  | [tc-3-A-BRT-BRT.md](tc-3-A-BRT-BRT.md)                |
| Sibling: same-TZ Config D  | [tc-3-D-BRT-BRT.md](tc-3-D-BRT-BRT.md)                |
| Sibling: cross-TZ Config C | matrix.md — row `3-C-BRT-IST` (PENDING)               |
| Field config reference     | `../../CLAUDE.md` — Test Form Fields table            |
