# TC-2.4 — Config D, SetFieldValue, BRT: Bug #5 drift = TZ offset magnitude; UTC- backward, UTC+ forward

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

> **Note**: This is a cross-timezone analytical test. The live steps below verify the drift mechanism in BRT using JS computations. The derived values for other timezones (London, Mumbai, Los Angeles) follow from the same JS rules and cannot be directly verified without changing the system timezone.

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

| #   | Action                                                   | Test Data                                                                                                                                                                                                                        | Expected Result                                                                                    | ✓   |
| --- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --- |
| 1   | Complete setup                                           | See Preconditions P1–P6                                                                                                                                                                                                          | All P1–P6 checks pass                                                                              | ☐   |
| 2   | Set initial value on the target field (identified in P6) | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')`                                                                                                                                                                   | No error returned                                                                                  | ☐   |
| 3   | Verify display shows correct date (BRT)                  | Read the target field input                                                                                                                                                                                                      | `03/15/2026 12:00 AM`                                                                              | ☐   |
| 4   | Capture raw stored value                                 | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                                                                                                                                                                   | `"2026-03-15T00:00:00"`                                                                            | ☐   |
| 5   | Capture GetFieldValue (fake Z)                           | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                                                                                                                                                                          | `"2026-03-15T00:00:00.000Z"` — fake Z (Bug #5)                                                     | ☐   |
| 6   | Verify no-Z string is parsed as local time               | `new Date("2026-03-15T00:00:00").toISOString()`                                                                                                                                                                                  | `"2026-03-15T03:00:00.000Z"` — no-Z treated as BRT local midnight (+3h to UTC)                     | ☐   |
| 7   | Verify fake-Z parses as UTC midnight (the drift source)  | `new Date("2026-03-15T00:00:00.000Z").toString()`                                                                                                                                                                                | `"Sat Mar 14 2026 21:00:00 GMT-0300 (Brasilia Standard Time)"` — UTC midnight = March 14 21:00 BRT | ☐   |
| 8   | Verify drifted storage value (BRT round-trip result)     | ``(()=>{const d=new Date("2026-03-15T00:00:00.000Z");const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;})()`` | `"2026-03-14T21:00:00"`                                                                            | ☐   |
| 9   | Verify environment (isoRef)                              | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                                                                                                                                                                   | `"2026-03-15T03:00:00.000Z"` — confirms BRT active                                                 | ☐   |

> **Drift formula**: Bug #5 drift per round-trip = the browser's UTC offset applied to UTC midnight. For timezone offset `N` hours from UTC: fake-Z value `"2026-03-15T00:00:00.000Z"` becomes local time `2026-03-15 00:00 UTC + N hours`. If N is negative (UTC-), the result crosses back into March 14. If N is positive (UTC+), the result moves forward into March 15 at a later hour.
>
> **Derived cross-timezone table** (all values computed from the same formula, not live-tested except BRT):
>
> | Timezone            | Offset | Fake-Z parsed as local | Drift per trip  | Trips to shift 1 day |
> | ------------------- | ------ | ---------------------- | --------------- | -------------------- |
> | Sao Paulo (UTC-3)   | −3h    | 2026-03-14T21:00:00    | −3h (backward)  | 8                    |
> | London (UTC+0)      | 0h     | 2026-03-15T00:00:00    | 0h (no drift!)  | ∞                    |
> | Mumbai (UTC+5:30)   | +5.5h  | 2026-03-15T05:30:00    | +5.5h (forward) | ~4–5                 |
> | Tokyo (UTC+9)       | +9h    | 2026-03-15T09:00:00    | +9h (forward)   | ~3                   |
> | Los Angeles (UTC-8) | −8h    | 2026-03-14T16:00:00    | −8h (backward)  | 3                    |
>
> The BRT row is live-verified in steps 7–8. The London row confirms no drift occurs at UTC+0 because the fake Z is accidentally correct. Mumbai was additionally verified in a live cross-timezone session (see results.md Test 2.5).

---

## Fail Conditions

**FAIL-1 (Wrong timezone — step 6 returns UTC midnight):**
Step 6 returns `"2026-03-15T00:00:00.000Z"` (no shift — UTC).

- Interpretation: The browser is running in UTC, not BRT. In UTC, no-Z strings are treated as UTC midnight, and isoRef would also return `"2026-03-15T00:00:00.000Z"`. Abort, re-do P1–P3, and restart the test.

**FAIL-2 (No drift in BRT — Bug #5 absent or fixed):**
Step 7 returns a string showing March 15 00:00 in local time (no shift from midnight).

- Interpretation: `getCalendarFieldValue()` no longer appends a fake Z. Step 5 would also return `"2026-03-15T03:00:00.000Z"` (proper UTC) instead of fake midnight Z. Verify the build number matches `20260304.1` and re-run P5.

**FAIL-3 (V2 active — wrong code path):**
P5 returns `true`.

- Interpretation: V2 is active. This TC documents V1 behavior. Verify the form is opened via the template URL in P4, not an Object View URL with `?ObjectID=`. If V2 is confirmed, create a separate V2 TC.

**FAIL-4 (Step 8 returns a value other than `"2026-03-14T21:00:00"`):**
Step 8 returns e.g. `"2026-03-14T16:00:00"` (−8h) or `"2026-03-15T05:30:00"` (+5.5h).

- Interpretation: The system timezone is not BRT. The drift magnitude in step 8 equals the actual timezone offset. Check P3 confirms `GMT-0300`. The expected values in this TC are specific to UTC-3.

---

## Related

| Reference                                           | Location                                                                                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Source test block                                   | `tasks/date-handling/forms-calendar/test/results.md` — Test 2.4 (Cross-Timezone Impact Analysis)                                       |
| Live IST verification                               | `tasks/date-handling/forms-calendar/test/results.md` — Test 2.5 (Mumbai UTC+5:30)                                                      |
| Bug #5 analysis                                     | `tasks/date-handling/forms-calendar/analysis.md` — Bug #5: Inconsistent Developer API Behavior (`getCalendarFieldValue()` line 104114) |
| Field config reference                              | `tasks/date-handling/CLAUDE.md` — Test Form Fields table                                                                               |
| Sibling TC (BRT round-trip, single trip)            | `tasks/date-handling/forms-calendar/test/tc-2-3-roundtrip-brt.md`                                                                      |
| Sibling TC (calendar popup establishing base state) | `tasks/date-handling/forms-calendar/test/tc-2-2-calendar-popup-brt.md`                                                                 |
