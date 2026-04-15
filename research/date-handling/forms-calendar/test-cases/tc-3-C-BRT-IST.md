# TC-3-C-BRT-IST — Config C, Server Reload, BRT→IST: DateTime reinterpreted as IST local; GFV shifts 8.5h (Bug #1 + Bug #4)

## Environment Specs

| Parameter               | Required Value                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                         |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, `IST`. No DST (India does not observe DST).                          |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                         |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                         |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false`         |
| **Scenario**            | BRT-saved record (`2026-03-15T00:00:00` = BRT midnight = `2026-03-15T03:00:00Z`) reloaded in IST |

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

**P4 — Open the BRT-saved record** (DateTest-000106 Rev 1):

```text
https://vvdemo.visualvault.com/FormViewer/app?DataID=6d2f720d-8621-4a97-a751-90c4cc8588b6&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

> This record was saved from BRT (UTC-3, 2026-04-01) with Config C field (DataField6) set to `03/15/2026 12:00 AM`. The stored value is `"2026-03-15T00:00:00"` (BRT local midnight, Z stripped by Bug #4). This test verifies the DateTime string's behavior on cross-TZ reload.

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

| #   | Action                             | Test Data                                                      | Expected Result                                    | ✓   |
| --- | ---------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                     | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Verify form loaded with saved data | Tab title shows record name + Rev                              | `DateTest-000106 Rev 1`                            | ☐   |
| 3   | Verify display after IST reload    | Visually inspect the target field (identified in P6)           | `03/15/2026 8:30 AM`                               | ☐   |
| 4   | Capture raw stored value           | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"`                            | ☐   |
| 5   | Capture GFV                        | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T03:00:00.000Z"`                       | ☐   |
| 6   | Verify IST timezone active         | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-14T18:30:00.000Z"` — confirms IST active | ☐   |

> **Note on Expected values**: Steps 3 and 5 reflect correct/intended behavior for a timezone-aware field (`ignoreTimezone=false`). BRT midnight = `2026-03-15T03:00:00Z`. In IST, this moment is 8:30 AM on March 15. The display should reflect the IST-local representation; GFV should return the same UTC value regardless of the viewer's timezone. Step 4 (raw stored value) documents the ambiguous string from the server — the same string as saved, but its semantic meaning shifts when loaded in a different timezone.

## Fail Conditions

**FAIL-1 (Wrong timezone active):**
`new Date().toString()` does not contain `GMT+0530`.

- Interpretation: System timezone is not IST. The test cannot proceed because the reload behavior depends on the local timezone. Re-run P1 and P2 before continuing.

**FAIL-2 (V2 code path active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 is active instead of V1. This test documents V1 behavior. V2 may produce different results for the form load path. Verify the test applies to V2 before continuing.

**FAIL-3 (Display shows 12:00 AM instead of 8:30 AM — Bug #1 + Bug #4):**
Step 3 shows `03/15/2026 12:00 AM` instead of `03/15/2026 8:30 AM`. The stored value `"2026-03-15T00:00:00"` was BRT midnight (03:00Z), but the display treats it as IST local midnight.

- Interpretation: Bug #4 (`getSaveValue()`) stripped the Z suffix on save, producing an ambiguous local-time string. On reload in IST, `parseDateString()` (Bug #1) receives a string with no timezone marker and `new Date("2026-03-15T00:00:00")` parses it as IST midnight instead of BRT midnight. The 8.5-hour difference (BRT UTC-3 to IST UTC+5:30) is lost. The display looks correct superficially (same date, midnight) but represents a different moment in time.

**FAIL-4 (GFV returns IST-based UTC instead of BRT-based UTC — Bug #1 + Bug #4):**
Step 5 returns `"2026-03-14T18:30:00.000Z"` instead of `"2026-03-15T03:00:00.000Z"`. GFV applied UTC conversion to the IST-reinterpreted value (IST midnight = 18:30Z previous day) instead of the original BRT value (BRT midnight = 03:00Z).

- Interpretation: Downstream consequence of FAIL-3. The `getCalendarFieldValue()` function correctly converts the in-memory Date to UTC via `toISOString()`, but the Date was already wrong — it represents IST midnight instead of BRT midnight. The 8.5-hour shift in GFV output (from `T03:00:00Z` to `T18:30:00Z` previous day) directly reflects the BRT→IST offset. Contrast with tc-3-C-BRT-BRT where GFV correctly returns `"2026-03-15T03:00:00.000Z"` because the same-TZ reload reinterprets the ambiguous string in BRT, matching the original save context.

**FAIL-5 (Wrong IST offset in isoRef):**
Step 6 does not return `"2026-03-14T18:30:00.000Z"`.

- Interpretation: IST is not active in the browser's JS engine. The timezone change did not take effect. Abort and re-check P1–P2.

## Related

| Reference                  | Location                                              |
| -------------------------- | ----------------------------------------------------- |
| Matrix row                 | `../matrix.md` — row `3-C-BRT-IST`                    |
| Run history                | [summary](../summaries/tc-3-C-BRT-IST.md)             |
| Bug #1 analysis            | `../analysis.md` — Bug #1 (Timezone Marker Stripping) |
| Bug #4 analysis            | `../analysis.md` — Bug #4 (Legacy Save Format)        |
| Sibling: same-TZ BRT-BRT   | [tc-3-C-BRT-BRT.md](tc-3-C-BRT-BRT.md)                |
| Sibling: cross-TZ Config A | [tc-3-A-BRT-IST.md](tc-3-A-BRT-IST.md)                |
| Sibling: cross-TZ Config D | [tc-3-D-BRT-IST.md](tc-3-D-BRT-IST.md)                |
| Field config reference     | `../../CLAUDE.md` — Test Form Fields table            |
