# TC-2.6 — Config D, Typed Input, BRT: storage matches popup; fake Z in GetFieldValue (Bug #5)

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

| #   | Action                                          | Test Data                                                      | Expected Result                                                                  | ✓   |
| --- | ----------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------- | --- |
| 1   | Complete setup                                  | See Preconditions P1–P6                                        | All P1–P6 checks pass                                                            | ☐   |
| 2   | Click the target field input (identified in P6) | —                                                              | Field focused; cursor on month segment; input shows `MM/dd/yyyy hh:mm a`         | ☐   |
| 3   | Type month segment                              | `03`                                                           | Month fills to `03`; cursor advances to day; input shows `03/dd/yyyy hh:mm a`    | ☐   |
| 4   | Type day segment                                | `15`                                                           | Day fills to `15`; cursor advances to year; input shows `03/15/yyyy hh:mm a`     | ☐   |
| 5   | Type year segment                               | `2026`                                                         | Year fills to `2026`; cursor advances to hour; input shows `03/15/2026 hh:mm a`  | ☐   |
| 6   | Type hour segment                               | `12`                                                           | Hour fills to `12`; cursor advances to minute; input shows `03/15/2026 12:mm a`  | ☐   |
| 7   | Type minute segment                             | `00`                                                           | Minute fills to `00`; cursor advances to AM/PM; input shows `03/15/2026 12:00 a` | ☐   |
| 8   | Type AM/PM                                      | `a`                                                            | AM/PM sets to `AM`; input shows `03/15/2026 12:00 AM`                            | ☐   |
| 9   | Press Tab to confirm                            | `Tab`                                                          | Focus moves to next field; target field input finalizes as `03/15/2026 12:00 AM` | ☐   |
| 10  | Capture raw stored value                        | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"`                                                          | ☐   |
| 11  | Capture GetFieldValue                           | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T00:00:00"` — same as raw, no transformation                         | ☐   |
| 12  | Verify environment (isoRef)                     | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active                               | ☐   |

> **Kendo DateTimePicker segment entry**: After clicking the input, the cursor lands on the month segment. Each two-digit segment (month, day, hour, minute) auto-advances when filled. The year segment requires all four digits before advancing. The AM/PM segment accepts `a` (AM) or `p` (PM). Do not type slashes, colons, or spaces — the format mask handles separators automatically. Press Tab once all segments are filled to commit the value to the form field and trigger the change handler.
>
> **Key finding — Bug #2 absent**: Step 10 returns `"2026-03-15T00:00:00"`, identical to the raw value stored by the calendar popup in TC-2.2. The `calChange()` (typed input) and `calChangeSetValue()` (calendar popup) handlers produce the same output with `useLegacy=false`. Bug #2 (inconsistent handlers) is not reproduced in this build.

---

## Fail Conditions

**FAIL-1 (Bug #2 present — typed input stores differently than popup):**
Step 10 returns a value other than `"2026-03-15T00:00:00"` — e.g., `"2026-03-15T03:00:00"` or `"2026-03-15T00:00:00.000Z"`.

- Interpretation: The `calChange()` handler (typed input) is using a different code path than `calChangeSetValue()` (calendar popup), producing a divergent stored value. This confirms Bug #2. Verify the build number matches `20260304.1`. If the build matches, document the discrepancy — Bug #2 may manifest in specific configurations not covered by this test.

**FAIL-2 (Bug #5 active — fake Z in GetFieldValue):**
Step 11 returns `"2026-03-15T00:00:00.000Z"` — fake Z appended to local time.

- Interpretation: `getCalendarFieldValue()` is appending a literal `Z` to the local time string. Correct return is `"2026-03-15T00:00:00"` matching the raw stored value. This is Bug #5. Round-trip drift will occur if this value is fed back via `SetFieldValue()` — each trip shifts the stored time by −3h in BRT (see TC-2.3).

**FAIL-3 (V2 active — wrong code path):**
P5 returns `true`.

- Interpretation: V2 (`useUpdatedCalendarValueLogic=true`) is active. This TC documents V1 behavior. Verify the form is opened via the template URL in P4, not an Object View URL with `?ObjectID=`. If V2 is confirmed active, this TC does not apply — create a separate V2 TC.

**FAIL-4 (Wrong timezone — isoRef shows UTC midnight):**
Step 12 returns `"2026-03-15T00:00:00.000Z"` (midnight UTC, no offset shift).

- Interpretation: The browser is running in UTC, not BRT. In UTC, no-Z strings are treated as UTC midnight, and the isoRef would return the same value without any offset. Abort, re-do P1–P3, and restart the test.

**FAIL-5 (No value stored — raw returns empty string):**
Step 10 returns `""`.

- Interpretation: The typed input was not committed. The change handler did not fire — most likely because Tab was not pressed after entering the last segment (AM/PM). Re-do steps 2–9, ensuring Tab is pressed after typing `a` in step 8. Alternatively, click outside the field to trigger the blur event.

---

## Related

| Reference                                                                      | Location                                                                                                                               |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Source test block                                                              | `tasks/date-handling/forms-calendar/test/results.md` — Test 2.6 (Scenario 2 — Typed Input Comparison)                                  |
| Bug #5 analysis                                                                | `tasks/date-handling/forms-calendar/analysis.md` — Bug #5: Inconsistent Developer API Behavior (`getCalendarFieldValue()` line 104114) |
| Bug #2 analysis                                                                | `tasks/date-handling/forms-calendar/analysis.md` — Bug #2: Inconsistent User Input Handlers (`calChangeSetValue()` vs `calChange()`)   |
| Field config reference                                                         | `tasks/date-handling/CLAUDE.md` — Test Form Fields table                                                                               |
| Sibling TC (calendar popup — establishes popup baseline for Bug #2 comparison) | `tasks/date-handling/forms-calendar/test/tc-2-2-calendar-popup-brt.md`                                                                 |
| Sibling TC (round-trip — Bug #5 drift after typed input)                       | `tasks/date-handling/forms-calendar/test/tc-2-3-roundtrip-brt.md`                                                                      |
