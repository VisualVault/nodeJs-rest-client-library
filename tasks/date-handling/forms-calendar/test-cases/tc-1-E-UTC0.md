# TC-1-E-UTC0 — Config E, Calendar Popup, UTC+0: legacy UTC datetime stored; date correct (no shift); GFV same

## Environment Specs

| Parameter               | Value                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                 |
| **System Timezone**     | `GMT` — UTC+0, GMT (Greenwich Mean Time). No DST (GMT is fixed UTC+0).                   |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                 |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=true`, `enableInitialValue=false` |
| **Scenario**            | 2026-03-15, UTC+0 midnight — 2026-03-15T00:00:00+00:00 = 2026-03-15T00:00:00Z UTC        |

## Preconditions

**P1 — Set system timezone to `GMT`:**

macOS:

```bash
sudo systemsetup -settimezone GMT
```

Windows (run as Administrator):

```bat
tzutil /s "UTC"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "UTC"
```

Linux:

```bash
sudo timedatectl set-timezone GMT
```

> **macOS note**: Use `GMT` (not `UTC` or `Etc/UTC` — those are not valid timezone names for `systemsetup`). `GMT` gives fixed UTC+0 with no DST. Do NOT use `Europe/London` — it observes BST (UTC+1) from late March through October.

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains GMT+0000
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
| 5   | Capture raw stored value                                            | `` `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` ``                           | `"2026-03-15"`                                                                                        | ☐   |
| 6   | Capture GetFieldValue                                               | `` `VV.Form.GetFieldValue('<FIELD_NAME>')` ``                                                  | `"2026-03-15"`                                                                                        | ☐   |
| 7   | Capture isoRef and confirm timezone                                 | `` `new Date(2026, 2, 15, 0, 0, 0).toISOString()` ``                                           | `"2026-03-15T00:00:00.000Z"` — confirms UTC+0 active                                                  | ☐   |

> The legacy popup path closes immediately on day selection for `enableTime=false` fields — there is no time tab.

> For UTC+0, local midnight = UTC midnight. The isoRef check (`"2026-03-15T00:00:00.000Z"`) confirms UTC+0 is active — the date component is the same in both local and UTC. This is the control scenario: any date shift would indicate a bug unrelated to timezone offset.

## Fail Conditions

**FAIL-1 (Legacy UTC datetime stored — format wrong, date correct):**
Raw value is `"2026-03-15T00:00:00.000Z"` instead of `"2026-03-15"`. GetFieldValue also returns `"2026-03-15T00:00:00.000Z"`.

- Interpretation: Legacy popup stores raw `toISOString()` (full UTC datetime with Z) instead of the date-only string that the modern path (Config A) produces. At UTC+0, the date component is correct (March 15 in both local and UTC), so there is no date shift — only a format discrepancy. Same legacy format bug as BRT (`"2026-03-15T03:00:00.000Z"`) and IST (`"2026-03-14T18:30:00.000Z"`), but the UTC+0 case is unique in that the stored date component is still correct. The correct storage for a date-only field is `"2026-03-15"`.

**FAIL-2 (TZ not UTC+0):**
`new Date(2026, 2, 15, 0, 0, 0).toISOString()` returns a value other than `"2026-03-15T00:00:00.000Z"`.

- Interpretation: System timezone is not `GMT`. BRT would return `"2026-03-15T03:00:00.000Z"`, IST would return `"2026-03-14T18:30:00.000Z"`. Abort, re-run P1 and P2 in full.

**FAIL-3 (V2 active):**
`VV.Form.calendarValueService.useUpdatedCalendarValueLogic` returns `true`.

- Interpretation: V2 code path is active. This test was written for V1 behavior. Check that the form URL has no `?ObjectID=` parameter and re-verify the account's server flag.

**FAIL-4 (date shifted):**
Raw value contains `"2026-03-14"` or `"2026-03-16"` as the date portion.

- Interpretation: Unexpected date drift at UTC+0. Since UTC+0 midnight = UTC midnight, Bug #7 shift should be zero. A date shift would indicate a bug unrelated to timezone. Escalate to analysis.md.

**FAIL-5 (invalid or empty value):**
Raw value is `""`, `null`, `"Invalid Date"`, or `undefined`.

- Interpretation: The day click did not register. Close the popup, clear the field if needed, and retry from step 2.

## Related

| Reference                                         | Location                                           |
| ------------------------------------------------- | -------------------------------------------------- |
| Matrix row                                        | `../matrix.md` — row `1-E-UTC0`                    |
| Run 1 results                                     | `runs/tc-1-E-UTC0-run-1.md`                        |
| Summary                                           | `summaries/tc-1-E-UTC0.md`                         |
| Bug #4 (legacy save format strips Z)              | `analysis.md` § Bug #4                             |
| Sibling — Config E, BRT                           | `tc-1-E-BRT.md`                                    |
| Sibling — Config E, IST                           | `tc-1-E-IST.md`                                    |
| Sibling — Config F, UTC+0 (ignoreTZ, pending)     | `tc-1-F-UTC0.md` (pending)                         |
| Control — Config A, UTC+0 (non-legacy, date-only) | `tc-1-A-UTC0.md`                                   |
| Field config reference                            | `tasks/date-handling/CLAUDE.md` § Test Form Fields |
