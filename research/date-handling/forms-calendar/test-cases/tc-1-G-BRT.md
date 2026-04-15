# TC-1-G-BRT — Config G, Calendar Popup, BRT: legacy DateTime popup closes without Time tab; raw UTC BRT midnight stored; GetFieldValue returns same

## Environment Specs

| Parameter               | Value                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                                 |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT (Brasilia Standard Time). No DST active (Brazil abolished DST in 2019). |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                                 |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=true`, `enableInitialValue=false`                  |
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
            f.enableTime === true &&
            f.ignoreTimezone === false &&
            f.useLegacy === true &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["DataField14"]
// Record the returned name — use it as <FIELD_NAME> in all console steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field with this configuration — stop and report.

## Test Steps

| #   | Action                                                              | Test Data                                                                                      | Expected Result                                                                                      | ✓   |
| --- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --- |
| 1   | Complete setup                                                      | See Preconditions P1–P6                                                                        | All P1–P6 checks pass                                                                                | ☐   |
| 2   | Click the calendar icon next to the target field (identified in P6) | Calendar icon (`.k-icon.k-i-calendar`) in `.fd-cal-container` adjacent to `<FIELD_NAME>` input | Calendar popup opens; March 2026 visible                                                             | ☐   |
| 3   | Navigate popup to March 2026 if not already shown                   | —                                                                                              | Month header reads "March 2026"                                                                      | ☐   |
| 4   | Click day 15                                                        | Cell with title "Sunday, March 15, 2026"                                                       | Popup closes immediately (no Time tab — see note); target field input displays `03/15/2026 12:00 AM` | ☐   |
| 5   | Capture raw stored value                                            | `` `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` ``                           | `"2026-03-15T03:00:00.000Z"`                                                                         | ☐   |
| 6   | Capture GetFieldValue                                               | `` `VV.Form.GetFieldValue('<FIELD_NAME>')` ``                                                  | `"2026-03-15T03:00:00.000Z"`                                                                         | ☐   |
| 7   | Capture isoRef and confirm timezone                                 | `` `new Date(2026, 2, 15, 0, 0, 0).toISOString()` ``                                           | `"2026-03-15T03:00:00.000Z"` — confirms BRT active                                                   | ☐   |

> Unlike modern DateTime configs (C/D), the legacy DateTime popup (`useLegacy=true`, `enableTime=true`) closes immediately on day click — **there is no Time tab**. The time is forced to midnight local time (00:00:00 BRT). If the popup does not close after clicking the day and instead advances to a Time tab, the field is not using the legacy popup path — verify P6 returned the correct field name and that `useLegacy=true` is set in the field config.

> The raw stored value is a full UTC ISO datetime string `"2026-03-15T03:00:00.000Z"` — the same storage pattern as Configs E and F (date-only legacy). The in-memory partition value retains the full UTC ISO string with Z suffix; Bug #4 (`getSaveValue()` Z-stripping) is inert on this path. The getSaveValue() format transformation (`"2026-03-15T00:00:00"`, no Z) would only apply at form submission to the server, not to the in-memory value read by `getValueObjectValue()`.

> The field input display shows `03/15/2026 12:00 AM` — the time component is shown because `enableTime=true`, but it is always forced to midnight since the popup does not provide time selection.

## Fail Conditions

**FAIL-1 (TZ not BRT):**
isoRef returns `"2026-03-15T00:00:00.000Z"` (UTC+0) or `"2026-03-14T18:30:00.000Z"` (IST) instead of `"2026-03-15T03:00:00.000Z"`.

- Interpretation: System timezone is not America/Sao_Paulo. Abort, re-run P1 and P2 in full.

**FAIL-2 (Time tab appeared — legacy path not active):**
Popup did not close after clicking day 15 — it advanced to a Time tab instead.

- Interpretation: The field is not using the legacy DateTime popup path. Either `useLegacy=true` is not set on this field, or the field lookup in P6 resolved to a non-legacy field. Verify P6 returned the correct field name and that `useLegacy=true` is confirmed in the field config.

**FAIL-3 (Bug #4 active — Z stripped by getSaveValue):**
Raw value is `"2026-03-15T00:00:00"` — full datetime present but no Z suffix, and time is local midnight (00:00 not 03:00).

- Interpretation: The popup path routed through `getSaveValue()` before storing in the partition. `getSaveValue()` uses `moment(input).format("YYYY-MM-DD[T]HH:mm:ss")` in legacy mode, which formats as local time without Z. This would mean Bug #4 IS active on this path. Document the actual value and note the deviation from the E/F-BRT pattern (where Z was retained).

**FAIL-4 (UTC midnight stored instead of BRT midnight):**
Raw value is `"2026-03-15T00:00:00.000Z"` — UTC midnight instead of BRT midnight (03:00 UTC).

- Interpretation: The popup handler used UTC midnight instead of local midnight. This would mean the field is not picking up the local timezone for the Date object construction. Verify system timezone with P3 and P1.

**FAIL-5 (date shifted):**
Raw value contains `"2026-03-14"` or `"2026-03-16"`.

- Interpretation: Unexpected date drift. BRT (UTC-3) midnight is 03:00 UTC — same calendar day, so Bug #7 does not cause shifts. A -1 day shift would indicate an unexpected UTC+ behavior in the Date object path. Escalate to analysis.md before proceeding.

**FAIL-6 (invalid or empty value):**
Raw value is `""`, `null`, `"Invalid Date"`, or `undefined`.

- Interpretation: The day click did not register or was intercepted. Close the popup, clear the field if needed, and retry from step 2. If using JS `.click()` on the calendar icon, verify the correct element was targeted.

## Related

| Reference                                           | Location                                              |
| --------------------------------------------------- | ----------------------------------------------------- |
| Matrix row                                          | `../matrix.md` — row `1-G-BRT`                        |
| Live test session                                   | `results.md` § Test 9.4                               |
| Bug #2 (inconsistent popup vs typed handlers)       | `analysis.md` § Bug #2                                |
| Bug #4 (legacy save format strips Z)                | `analysis.md` § Bug #4                                |
| Sibling — Config E (date-only, same legacy pattern) | `tc-1-E-BRT.md`                                       |
| Sibling — Config F (date-only + ignoreTZ)           | `tc-1-F-BRT.md`                                       |
| Sibling — Config H (DateTime + ignoreTZ, pending)   | `tc-1-H-BRT.md` (pending)                             |
| Sibling — Config G IST (Bug #7 risk, pending)       | `tc-1-G-IST.md` (pending)                             |
| Field config reference                              | `research/date-handling/CLAUDE.md` § Test Form Fields |
