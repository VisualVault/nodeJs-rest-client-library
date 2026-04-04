# TC-8B-C-BRT — Config C, GetDateObject, BRT: correct Date; toISOString matches GFV real UTC

## Environment Specs

| Parameter               | Required Value                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                 |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                        |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                 |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15T00:00:00`, BRT — `2026-03-15T00:00:00-03:00` = `2026-03-15T03:00:00Z` UTC    |

---

## Preconditions

Complete all steps in order. Do not proceed if any verification fails.

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

Wait for the tab title to change from "Viewer" to "DateTest-XXXXXX" before proceeding.

**P5 — Verify V1 is the active code path** (run in DevTools console after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// ABORT: true  → V2 is active; verify this test applies to V2 behavior before continuing
```

**P6 — Locate the target field by configuration** (run in DevTools console):

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
// Expected on current test form: ["Field6"]
// Record the returned name — use it as <FIELD_NAME> in the test steps
```

> If P6 returns more than one field, use the first result and note the ambiguity.
> If P6 returns no fields, the test form does not have a field matching this configuration — stop and report.

---

## Test Steps

| #   | Action                                                   | Test Data                                                      | Expected Result                                                  | ✓   |
| --- | -------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------- | --- |
| 1   | Complete setup                                           | See Preconditions P1–P6                                        | All P1–P6 checks pass                                            | ☐   |
| 2   | Set a known value on the target field (DevTools console) | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')` | Field displays `03/15/2026 12:00 AM`                             | ☐   |
| 3   | Capture raw stored value (DevTools console)              | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"`                                          | ☐   |
| 4   | Call GetDateObjectFromCalendar (DevTools console)        | `var d = VV.Form.GetDateObjectFromCalendar('<FIELD_NAME>')`    | No error thrown                                                  | ☐   |
| 5   | Verify return is a Date object (DevTools console)        | `d instanceof Date`                                            | `true`                                                           | ☐   |
| 6   | Capture Date toString (DevTools console)                 | `d.toString()`                                                 | Contains `Mar 15 2026 00:00:00 GMT-0300`                         | ☐   |
| 7   | Capture Date toISOString (DevTools console)              | `d.toISOString()`                                              | `"2026-03-15T03:00:00.000Z"`                                     | ☐   |
| 8   | Compare with GetFieldValue (DevTools console)            | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T03:00:00.000Z"` — Config C GFV returns real UTC too | ☐   |
| 9   | Confirm browser timezone (DevTools console)              | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active               | ☐   |

> Config C is the only config where GDOC `.toISOString()` and GFV produce identical output — both return real UTC. This makes Config C the most predictable DateTime configuration for cross-timezone use.

---

## Fail Conditions

**FAIL-1 (GDOC returns non-Date):**
Step 5 returns `false` — GetDateObjectFromCalendar does not return a Date object.

- Interpretation: The function may return a string, null, or other type for DateTime configs. Document the actual return type and value.

**FAIL-2 (GDOC toISOString differs from expected):**
Step 7 returns a value other than `"2026-03-15T03:00:00.000Z"`.

- Interpretation: The Date object does not represent BRT midnight as expected. Document the actual value.

**FAIL-3 (GFV disagrees with GDOC):**
Step 8 returns a value other than `"2026-03-15T03:00:00.000Z"`.

- Interpretation: GFV and GDOC diverge for Config C — unexpected. Document both values.

**FAIL-4 (Wrong timezone):**
Step 9 does not return `"2026-03-15T03:00:00.000Z"`.

- Interpretation: System timezone is not BRT. Re-do P1 and P2.

**FAIL-5 (V2 active):**
P5 returns `true`.

- Interpretation: V2 code path active. Verify this test applies to V2 behavior before continuing.

**FAIL-6 (Field not found):**
P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config C flags.

---

## Related

| Reference              | Location                                                            |
| ---------------------- | ------------------------------------------------------------------- |
| Matrix row             | `../matrix.md` — row `8B-C-BRT`                                     |
| Analysis               | `../analysis.md` — no bugs for DateTime GDOC in BRT                 |
| Sibling (IST)          | [`tc-8B-C-IST.md`](tc-8B-C-IST.md) — same behavior, IST offset      |
| GFV comparison         | [`tc-8-C-BRT.md`](tc-8-C-BRT.md) — Cat 8 Config C GFV (same output) |
| Field config reference | `tasks/date-handling/CLAUDE.md` — Config C                          |
