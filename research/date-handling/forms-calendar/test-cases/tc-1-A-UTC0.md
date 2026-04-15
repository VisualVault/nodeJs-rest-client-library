# TC-1-A-UTC0 — Config A, Calendar Popup, UTC+0: correct date stored; no drift (Bug #7 zero-drift control)

## Environment Specs

| Parameter               | Value                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                                              |
| **System Timezone**     | `GMT` — UTC+0, GMT. No DST (GMT zone stays UTC+0 year-round; do not use `Europe/London` — it observes BST in summer). |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                                              |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                                              |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false`                             |
| **Scenario**            | March 15, 2026, GMT midnight — `2026-03-15T00:00:00+0000` = `2026-03-15T00:00:00Z` UTC                                |

## Preconditions

**P1 — Set system timezone to `GMT`:**

macOS:

```bash
sudo systemsetup -settimezone GMT
```

> Note: `Europe/London` is NOT equivalent — it observes BST (UTC+1) from late March through October. Use `GMT` (or `Africa/Abidjan`, `Africa/Accra`) for a fixed UTC+0 zone.

Windows (run as Administrator):

```bat
tzutil /s "GMT Standard Time"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "GMT Standard Time"
```

Linux:

```bash
sudo timedatectl set-timezone GMT
```

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains GMT+0000
// FAIL: any other offset — abort, re-check P1 and P2
```

> `GMT+0100 (British Summer Time)` means `Europe/London` is active and DST is in effect — switch to `GMT` and restart Chrome.

**P4 — Open the DateTest form template** (creates a fresh instance):

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

Wait for the tab title to change from "Viewer" to "DateTest-XXXXXX" before proceeding.

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

| #   | Action                                                              | Test Data                                                            | Expected Result                                                                          | ✓   |
| --- | ------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --- |
| 1   | Complete setup                                                      | See Preconditions P1–P6                                              | All P1–P6 checks pass                                                                    | ☐   |
| 2   | Click the calendar icon next to the target field (identified in P6) | —                                                                    | March 2026 calendar popup opens                                                          | ☐   |
| 3   | Verify popup month header                                           | —                                                                    | `March 2026`                                                                             | ☐   |
| 4   | Click day 15                                                        | —                                                                    | Popup closes immediately; field displays `03/15/2026` (no time tab — date-only Config A) | ☐   |
| 5   | Capture raw stored value                                            | `` `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` `` | `"2026-03-15"`                                                                           | ☐   |
| 6   | Capture GetFieldValue()                                             | `` `VV.Form.GetFieldValue('<FIELD_NAME>')` ``                        | `"2026-03-15"`                                                                           | ☐   |
| 7   | Capture isoRef                                                      | `` `new Date(2026, 2, 15, 0, 0, 0).toISOString()` ``                 | `"2026-03-15T00:00:00.000Z"` — confirms UTC+0 (GMT) active                               | ☐   |

> Steps 5–7 can be combined in a single console call:
>
> ```javascript
> ({
>     raw: VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>'),
>     api: VV.Form.GetFieldValue('<FIELD_NAME>'),
>     isoRef: new Date(2026, 2, 15, 0, 0, 0).toISOString(),
> });
> ```

## Fail Conditions

**FAIL-1 (date shifted -1 day):** Raw stored value is `"2026-03-14"` instead of `"2026-03-15"`.

- Interpretation: Bug #7 is active — local midnight is being interpreted as the previous UTC day. System TZ is not UTC+0. Verify P1: ensure `GMT` is set (not `Europe/London`), confirm with P3 that `new Date().toString()` contains `GMT+0000`, and restart Chrome (P2).

**FAIL-2 (isoRef offset non-zero):** `new Date(2026, 2, 15, 0, 0, 0).toISOString()` returns anything other than `"2026-03-15T00:00:00.000Z"`.

- Interpretation: The browser is not running at UTC+0. A positive offset (e.g., `"2026-03-14T18:30:00.000Z"`) means IST is still active. A negative offset means a UTC- zone is active. Re-check P1 and P2 — timezone change must be followed by a Chrome restart to take effect.

**FAIL-3 (api ≠ raw):** `GetFieldValue()` returns a value different from `getValueObjectValue()` for Config A (e.g., appends a Z suffix).

- Interpretation: `getCalendarFieldValue()` is applying an unexpected transformation for Config A. Config A should not be affected by Bug #5 (which requires `enableTime=true && ignoreTimezone=true`). Verify P6 returned a Config A field — if the wrong field was used, rerun P6 and repeat the test.

## Related

| Reference              | Location                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| Matrix row             | `../matrix.md` — row `1-A-UTC0`                                                                   |
| Live test evidence     | `../results.md § Test 6.1`                                                                        |
| Bug analysis           | `../analysis.md` — Bug #7 (`normalizeCalValue()` ~line 102793)                                    |
| Sibling — IST (FAIL)   | `tc-1-A-IST.md` — same config, IST: stores `"2026-03-14"` (-1 day, Bug #7 confirmed)              |
| Sibling — BRT (PASS)   | `tc-1-1-calendar-popup-brt.md` — same config, BRT: stores `"2026-03-15"` (BRT is UTC-3, no shift) |
| Field config reference | `research/date-handling/CLAUDE.md` — Test Form Fields table                                       |
