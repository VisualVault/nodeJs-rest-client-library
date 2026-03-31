# TC-2.8 — Config D, Round-Trip × 10, BRT: -3h drift per trip; full day lost after 8 trips (Bug #5)

---

## Environment Specs

| Parameter               | Value                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                    |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, Brasilia Standard Time. No DST (Brazil abolished DST in 2019). |
| **Platform**            | VisualVault FormViewer, Build `20260304.1`                                                  |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                    |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false`     |
| **Scenario**            | 2026-03-15, BRT midnight — `2026-03-15T00:00:00-03:00` = `2026-03-15T03:00:00` UTC          |

---

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

---

---

## Test Steps

| #   | Action                                                                     | Test Data                                                      | Expected Result                                          | ✓   |
| --- | -------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------- | --- |
| 1   | Complete setup                                                             | See Preconditions P1–P6                                        | All P1–P6 checks pass                                    | ☐   |
| 2   | Set initial value on the target field (identified in P6) — Trip 0 baseline | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')` | No error returned                                        | ☐   |
| 3   | Capture Trip 0 raw stored value                                            | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"`                                  | ☐   |
| 4   | Capture Trip 0 GetFieldValue                                               | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T00:00:00"` — same as raw, no transformation | ☐   |
| 5   | Execute 10 sequential round-trips; capture raw value after each            | JS loop (see blockquote below)                                 | 10-element array: all `"2026-03-15T00:00:00"` — no drift | ☐   |
| 6   | Verify display value at Trip 10                                            | Read the target field input                                    | `03/15/2026 12:00 AM` — unchanged, no drift              | ☐   |
| 7   | Capture raw stored value at Trip 10                                        | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"` — unchanged, no drift            | ☐   |
| 8   | Capture GetFieldValue at Trip 10                                           | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T00:00:00"` — same as raw, no transformation | ☐   |
| 9   | Verify environment (isoRef)                                                | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active       | ☐   |

> **Step 5 — JS snippet** (paste into DevTools console after step 2):
>
> ```javascript
> (() => {
>     const results = [];
>     for (let i = 0; i < 10; i++) {
>         VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetFieldValue('<FIELD_NAME>'));
>         results.push(VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>'));
>     }
>     return results;
> })();
> ```
>
> **Correct 10-element array (Trips 1–10, no drift)**:
>
> ```
> ["2026-03-15T00:00:00","2026-03-15T00:00:00","2026-03-15T00:00:00","2026-03-15T00:00:00",
>  "2026-03-15T00:00:00","2026-03-15T00:00:00","2026-03-15T00:00:00","2026-03-15T00:00:00",
>  "2026-03-15T00:00:00","2026-03-15T00:00:00"]
> ```
>
> **Bug #5 drift reference** (values produced when Bug #5 is active — see FAIL-1):
>
> | Trip         | Raw Stored Value (Bug #5) | Display (Bug #5)                          |
> | ------------ | ------------------------- | ----------------------------------------- |
> | 0 (baseline) | `2026-03-15T00:00:00`     | `03/15/2026 12:00 AM`                     |
> | 1            | `2026-03-14T21:00:00`     | `03/14/2026 09:00 PM`                     |
> | 2            | `2026-03-14T18:00:00`     | `03/14/2026 06:00 PM`                     |
> | 3            | `2026-03-14T15:00:00`     | `03/14/2026 03:00 PM`                     |
> | 4            | `2026-03-14T12:00:00`     | `03/14/2026 12:00 PM`                     |
> | 5            | `2026-03-14T09:00:00`     | `03/14/2026 09:00 AM`                     |
> | 6            | `2026-03-14T06:00:00`     | `03/14/2026 06:00 AM`                     |
> | 7            | `2026-03-14T03:00:00`     | `03/14/2026 03:00 AM`                     |
> | **8**        | `2026-03-14T00:00:00`     | `03/14/2026 12:00 AM` ← **full day lost** |
> | 9            | `2026-03-13T21:00:00`     | `03/13/2026 09:00 PM`                     |
> | **10**       | `2026-03-13T18:00:00`     | `03/13/2026 06:00 PM`                     |
>
> **Drift mechanism per trip (Bug #5)**: `GetFieldValue` appends a literal `Z` to the stored local time (`"2026-03-15T00:00:00"` → `"2026-03-15T00:00:00.000Z"`). When passed back into `SetFieldValue`, JavaScript interprets the `Z` as real UTC midnight and converts to local time: UTC midnight in BRT (UTC-3) = March 14 21:00 local. Each trip compounds this −3h shift. After 8 trips the time reaches the next midnight boundary (March 14 00:00) — the calendar date has moved back by one full day.

---

## Fail Conditions

**FAIL-1 (Bug #5 cumulative drift):**
Step 5 array returns drifting values: `["2026-03-14T21:00:00","2026-03-14T18:00:00",...]`. Step 7 returns `"2026-03-13T18:00:00"`. Step 6 display reads `03/13/2026 06:00 PM`.

- Interpretation: `getCalendarFieldValue()` is appending a fake `Z` to the stored local time, causing each round-trip to shift the stored value by −3h. After 8 trips the date crosses to March 14; after 10 trips it has drifted to March 13 18:00. This is Bug #5. See the Bug #5 drift reference table in the Test Steps blockquote for the full trip-by-trip breakdown.

**FAIL-2 (Wrong drift magnitude — different timezone):**
Step 5 array shows a shift other than -3h per trip — e.g., `"2026-03-14T16:00:00"` after Trip 1 (-8h, PST) or `"2026-03-15T05:30:00"` (+5:30h, IST).

- Interpretation: The browser is not running in BRT (UTC-3). The drift per trip equals the active UTC offset: UTC-8 → -8h, UTC+5:30 → +5:30h. Verify P3 shows `GMT-0300`. If the system timezone was changed since P1, restart Chrome and re-run from P4.

**FAIL-3 (Day boundary crossed at wrong trip):**
Step 5 array shows the date shifting back to March 14 before Trip 8, or not until after Trip 8.

- Interpretation: The starting time was not exactly midnight. Verify step 2 used `'2026-03-15T00:00:00'` as the input string (not a Date object or a different time). Any non-midnight starting time shifts the trip count at which the calendar date boundary is crossed. With a midnight start in BRT, exactly 8 trips are required (8 × 3h = 24h).

**FAIL-4 (V2 active — wrong code path):**
P5 returns `true`.

- Interpretation: V2 (`useUpdatedCalendarValueLogic=true`) is active. This TC documents V1 behavior. Verify the form is opened via the template URL in P4, not an Object View URL with `?ObjectID=`. If V2 is confirmed active, this TC does not apply — create a separate V2 TC.

**FAIL-5 (Wrong timezone — isoRef shows UTC midnight):**
Step 9 returns `"2026-03-15T00:00:00.000Z"` (midnight UTC, no offset shift).

- Interpretation: The browser is running in UTC, not BRT. In UTC, no-Z strings are treated as UTC midnight and the isoRef would have no offset. Abort, re-do P1–P3, and restart the test.

---

## Related

| Reference                                                         | Location                                                                                                                               |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Source test block                                                 | `tasks/date-handling/forms-calendar/test/results.md` — Test 2.8 (Multiple Sequential Round-Trips)                                      |
| Bug #5 analysis                                                   | `tasks/date-handling/forms-calendar/analysis.md` — Bug #5: Inconsistent Developer API Behavior (`getCalendarFieldValue()` line 104114) |
| Field config reference                                            | `tasks/date-handling/CLAUDE.md` — Test Form Fields table                                                                               |
| Sibling TC (single round-trip — establishes single-trip baseline) | `tasks/date-handling/forms-calendar/test/tc-2-3-roundtrip-brt.md`                                                                      |
| Sibling TC (cross-timezone drift analysis)                        | `tasks/date-handling/forms-calendar/test/tc-2-4-cross-tz-brt.md`                                                                       |
| Sibling TC (IST round-trip — forward drift direction)             | `tasks/date-handling/forms-calendar/test/tc-2-5-roundtrip-ist.md`                                                                      |
