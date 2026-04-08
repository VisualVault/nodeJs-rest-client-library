# TC-9-GDOC-A-IST-1 — Config A, GDOC Round-Trip, IST: double FORM-BUG-7 shifts date -3 days (FORM-BUG-7)

## Environment Specs

| Parameter               | Required Value                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                  |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST. No DST active (India does not observe DST).              |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                  |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                  |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, IST midnight — `2026-03-15T00:00:00+05:30` = `2026-03-14T18:30:00.000Z` UTC |

---

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

**P4 — Open the DateTest form template** (creates a fresh instance):

```text
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

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
            f.enableTime === false &&
            f.ignoreTimezone === false &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected: ["Field7"]
```

---

## Test Steps

| #   | Action                                      | Test Data                                                                                                | Expected Result                                    | ✓   |
| --- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                                                                  | All P1–P6 checks pass                              | ☐   |
| 2   | Set baseline value (DevTools console)       | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')`                                           | Field displays `03/15/2026`                        | ☐   |
| 3   | Capture baseline raw (DevTools console)     | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                                           | `"2026-03-15"`                                     | ☐   |
| 4   | Get GDOC ISO value (DevTools console)       | `var d = VV.Form.GetDateObjectFromCalendar('<FIELD_NAME>'); d.toISOString()`                             | `"2026-03-14T18:30:00.000Z"`                       | ☐   |
| 5   | Execute GDOC round-trip (DevTools console)  | `VV.Form.SetFieldValue('<FIELD_NAME>', VV.Form.GetDateObjectFromCalendar('<FIELD_NAME>').toISOString())` | No error                                           | ☐   |
| 6   | Capture post-trip raw (DevTools console)    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')`                                           | `"2026-03-15"` — correct: should preserve date     | ☐   |
| 7   | Capture post-trip GFV (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                                                                  | `"2026-03-15"`                                     | ☐   |
| 8   | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                                                           | `"2026-03-14T18:30:00.000Z"` — confirms IST active | ☐   |

> **Note on the failure mechanism**: GDOC itself returns a correct Date object (`new Date("2026-03-14T18:30:00.000Z")` which represents Mar 15 00:00 IST). The failure is in SetFieldValue's date-only parsing — `normalizeCalValue` strips the ISO Z string to just the date portion `"2026-03-14"` (the UTC date), then parses it as local IST midnight, triggering FORM-BUG-7 again. The compound effect is: initial SFV loses -1 day, then the GDOC round-trip loses another -1 day from each re-parse.

---

## Fail Conditions

**FAIL-1 (Bug #7 on initial SFV):** Step 3 returns `"2026-03-14"` instead of `"2026-03-15"`.

- Interpretation: `normalizeCalValue()` parses `"2026-03-15T00:00:00"` as local midnight IST → `toISOString()` extracts UTC date `"2026-03-14"`. This is FORM-BUG-7 on the initial SetFieldValue. The baseline is already corrupted before the GDOC round-trip begins.

**FAIL-2 (Double Bug #7 on GDOC round-trip):** Step 6 returns `"2026-03-12"` instead of `"2026-03-15"`.

- Interpretation: GDOC ISO `"2026-03-13T18:30:00.000Z"` (from the already-shifted Mar 14 baseline) → `normalizeCalValue` strips to `"2026-03-13"` → parses as IST midnight → stores `"2026-03-12"`. Compound -3 day shift from the original intended date.

**FAIL-3 (Wrong timezone):** Step 8 does not return `"2026-03-14T18:30:00.000Z"`.

- Interpretation: System timezone is not IST. Re-do P1 and P2.

**FAIL-4 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path active.

**FAIL-5 (Field not found):** P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config A flags.

---

## Related

| Reference                   | Location                                                                |
| --------------------------- | ----------------------------------------------------------------------- |
| Matrix row                  | `matrix.md` — row `9-GDOC-A-IST-1`                                      |
| BRT sibling: 9-GDOC-A-BRT-1 | [tc-9-GDOC-A-BRT-1.md](tc-9-GDOC-A-BRT-1.md) — PASS, 0 drift            |
| GDOC value source: 8B-A-IST | `matrix.md` — row `8B-A-IST` (GDOC returns correct Date object)         |
| Bug #7 analysis             | `analysis/overview.md` — FORM-BUG-7: date-only midnight parsing in UTC+ |
| Field config reference      | `matrix.md` — Field Configurations table, Config A                      |
