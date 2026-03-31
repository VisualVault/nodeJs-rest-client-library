# TC-3-A-BRT-BRT — Config A, Server Reload, BRT: date-only string survives save/reload; GFV unchanged

## Environment Specs

| Parameter               | Required Value                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                  |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, `BRT`. No DST active (BRT abolished DST in 2019).            |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                  |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                  |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, BRT midnight — `2026-03-15T00:00:00-03:00` = `2026-03-15T03:00:00Z` UTC     |

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
            f.enableTime === false &&
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField7"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

## Test Steps

| #   | Action                                            | Test Data                                                      | Expected Result                                                     | ✓   |
| --- | ------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- | --- |
| 1   | Complete setup                                    | See Preconditions P1–P6                                        | All P1–P6 checks pass                                               | ☐   |
| 2   | Set a date in the target field (identified in P6) | `VV.Form.SetFieldValue('<FIELD_NAME>', '03/15/2026')`          | Display shows `03/15/2026`                                          | ☐   |
| 3   | Capture raw stored value before save              | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15"`                                                      | ☐   |
| 4   | Capture GFV before save                           | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15"`                                                      | ☐   |
| 5   | Save the form                                     | Click the blue Save button in the toolbar                      | Form saves successfully; title shows instance name + Rev            | ☐   |
| 6   | Open saved record in a new tab                    | Navigate to the saved record URL (DataID from save)            | Tab title shows `DateTest-NNNNNN Rev 1`; form loads with saved data | ☐   |
| 7   | Verify display after reload                       | Visually inspect the target field                              | `03/15/2026`                                                        | ☐   |
| 8   | Capture raw stored value after reload             | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15"`                                                      | ☐   |
| 9   | Capture GFV after reload                          | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15"`                                                      | ☐   |
| 10  | Verify BRT timezone active                        | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active                  | ☐   |

> **Note on raw type**: Before save, `getValueObjectValue()` may return a Date object or string depending on the input method. After server reload, the server returns date values as strings in `"yyyy-MM-dd"` format for date-only fields. The type change (Date → string) is expected and does not affect correctness — only the date value matters.

## Fail Conditions

**FAIL-1 (Wrong timezone active):**
`new Date().toString()` does not contain `GMT-0300`.

- Interpretation: System timezone is not BRT. The test cannot proceed because all date behavior depends on the local timezone offset. Re-run P1 and P2 before continuing.

**FAIL-2 (V2 code path active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 is active instead of V1. This test documents V1 behavior. V2 may produce different results for the form load path. Verify the test applies to V2 before continuing.

**FAIL-3 (Date shifts on reload):**
Step 8 returns a value other than `"2026-03-15"` (e.g., `"2026-03-14"` or `"2026-03-15T03:00:00.000Z"`).

- Interpretation: The server reload path is transforming the stored value. If the date shifted backward by one day, Bug #7 may be active on the load path (`initCalendarValueV1` parsing the stored string via `moment(e).toDate()` as local midnight). If the format changed to include a time component, the server may be returning a different format than what was saved. Investigate `initCalendarValueV1` and `parseDateString` for the specific transformation.

**FAIL-4 (GFV differs from raw after reload):**
Step 9 returns a value different from Step 8.

- Interpretation: `getCalendarFieldValue()` is transforming the stored value on output. For Config A (`enableTime=false`), Bug #5 (fake Z) should not apply. If GFV returns a different format, investigate `getCalendarFieldValue()` for unexpected date-only transformations.

## Related

| Reference                  | Location                                                              |
| -------------------------- | --------------------------------------------------------------------- |
| Matrix row                 | `matrix.md` — row `3-A-BRT-BRT`                                       |
| Results index              | `results.md § Session 2026-03-31 (BRT)`                               |
| Bug #1 analysis            | `../analysis.md` — Bug #1 (Timezone Marker Stripping)                 |
| Bug #7 analysis            | `../analysis.md` — Bug #7 (Date-only SetFieldValue wrong day in UTC+) |
| Sibling: same-TZ DateTime  | [tc-3-C-BRT-BRT.md](tc-3-C-BRT-BRT.md)                                |
| Sibling: same-TZ Config D  | [tc-3-D-BRT-BRT.md](tc-3-D-BRT-BRT.md)                                |
| Sibling: cross-TZ Config A | matrix.md — row `3-A-BRT-IST` (PENDING)                               |
| Field config reference     | `../../CLAUDE.md` — Test Form Fields table                            |
