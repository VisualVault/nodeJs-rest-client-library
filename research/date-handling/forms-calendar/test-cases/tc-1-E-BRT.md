# TC-1-E-BRT — Config E, Calendar Popup, BRT: legacy path stores UTC datetime string (not date-only); GetFieldValue returns same UTC datetime, no drift

## Environment Specs

| Parameter               | Value                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                                 |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT (Brasilia Standard Time). No DST active (Brazil abolished DST in 2019). |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                                 |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=true`, `enableInitialValue=false`                 |
| **Scenario**            | 2026-03-15, BRT midnight — 2026-03-15 00:00:00 BRT (UTC-3) = 2026-03-15T03:00:00Z UTC                    |

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

```
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

Wait for the tab title to change from "Viewer" to "DateTest-XXXXXX" before continuing.

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

| #   | Action                                                              | Test Data                                                                                      | Expected Result                                                                                       | ✓   |
| --- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --- |
| 1   | Complete setup                                                      | See Preconditions P1–P6                                                                        | All P1–P6 checks pass                                                                                 | ☐   |
| 2   | Click the calendar icon next to the target field (identified in P6) | Calendar icon (`.k-icon.k-i-calendar`) in `.fd-cal-container` adjacent to `<FIELD_NAME>` input | Calendar popup opens; March 2026 visible                                                              | ☐   |
| 3   | Navigate popup to March 2026 if not already shown                   | —                                                                                              | Month header reads "March 2026"                                                                       | ☐   |
| 4   | Click day 15                                                        | Cell with title "Sunday, March 15, 2026"                                                       | Popup closes immediately (no time tab — `enableTime=false`); target field input displays `03/15/2026` | ☐   |
| 5   | Capture raw stored value                                            | `` `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` ``                           | `"2026-03-15T03:00:00.000Z"`                                                                          | ☐   |
| 6   | Capture GetFieldValue                                               | `` `VV.Form.GetFieldValue('<FIELD_NAME>')` ``                                                  | `"2026-03-15T03:00:00.000Z"`                                                                          | ☐   |
| 7   | Capture isoRef and confirm timezone                                 | `` `new Date(2026, 2, 15, 0, 0, 0).toISOString()` ``                                           | `"2026-03-15T03:00:00.000Z"` — confirms BRT active                                                    | ☐   |

> The legacy popup path closes immediately on day selection for `enableTime=false` fields — there is no time tab. If the popup does not close after clicking the day, the wrong field or wrong config is being tested.

> The raw stored value is a full UTC ISO datetime string — not the date-only string `"2026-03-15"` produced by the modern path (Configs A/B). This is expected behavior for the legacy path.

## Fail Conditions

**FAIL-1 (TZ not BRT):**
isoRef returns `"2026-03-15T00:00:00.000Z"` (UTC+0) or `"2026-03-14T18:30:00.000Z"` (IST) instead of `"2026-03-15T03:00:00.000Z"`.

- Interpretation: System timezone is not America/Sao_Paulo. Abort, re-run P1 and P2 in full.

**FAIL-2 (modern path stored date-only):**
Raw value is `"2026-03-15"` — no time component.

- Interpretation: The `useLegacy=true` flag is not active on this field, or the field lookup in P6 resolved to a modern-path field. Verify P6 returned the correct field name and that `useLegacy=true` is set in the field config.

**FAIL-3 (date shifted):**
Raw value contains `"2026-03-14"` or `"2026-03-16"`.

- Interpretation: Unexpected date drift. For BRT (UTC-3), Bug #7 does not cause shifts — UTC-3 midnight is still the same UTC day. A -1 day shift would indicate the code is treating the field differently (e.g., applying a UTC+ offset). A +1 day shift would indicate an unexpected forward shift. Escalate to analysis.md before proceeding.

**FAIL-4 (Z stripped by legacy save path):**
Raw value is `"2026-03-15T03:00:00.000"` — full datetime present but Z suffix absent.

- Interpretation: Bug #4 (Legacy Save Format — getSaveValue strips Z from DateTime) is active on this path. The popup stored the UTC datetime but the save path removed the Z. Document the actual value and update the TC Expected accordingly. Note this means Bug #4 does interact with the legacy popup path.

**FAIL-5 (invalid or empty value):**
Raw value is `""`, `null`, `"Invalid Date"`, or `undefined`.

- Interpretation: The day click did not register or was intercepted. The popup may have auto-advanced to a time tab that does not exist for `enableTime=false` fields, causing an inconsistent state. Close the popup, clear the field if needed, and retry from step 2.

## Related

| Reference                                     | Location                                              |
| --------------------------------------------- | ----------------------------------------------------- |
| Matrix row                                    | `../matrix.md` — row `1-E-BRT`                        |
| Live test session                             | `results.md` § Test 9.1                               |
| Bug #2 (inconsistent popup vs typed handlers) | `analysis.md` § Bug #2                                |
| Bug #4 (legacy save format strips Z)          | `analysis.md` § Bug #4                                |
| Bug #7 (SetFieldValue wrong day UTC+)         | `analysis.md` § Bug #7                                |
| Sibling — modern path BRT                     | `tc-1-A-BRT.md`, `tc-1-B-BRT.md`                      |
| Sibling — legacy IST                          | `tc-1-E-IST.md` (pending)                             |
| Sibling — legacy BRT datetime                 | `tc-1-G-BRT.md` (pending)                             |
| Field config reference                        | `research/date-handling/CLAUDE.md` § Test Form Fields |
