# TC-7-A-dateObj-IST — Config A, SetFieldValue Date object, IST: Bug #7 double-shift stores -2 days in UTC+

## Environment Specs

| Parameter               | Required Value                                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                                        |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST. No DST.                                                                        |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                                        |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                                        |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false`                       |
| **Scenario**            | `2026-03-15`, IST midnight — `2026-03-15T00:00:00+05:30` = `2026-03-14T18:30:00Z` UTC; Date object double-shift |

---

## Preconditions

Complete all steps in order. Do not proceed if any verification fails.

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
// PASS: output contains "GMT+0530"
// FAIL: any other offset — abort, re-check P1 and P2
```

**P4 — Open the DateTest form template** (creates a fresh instance):

```
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
// Expected: ["DataField7"]
```

---

## Test Steps

| #   | Action                                       | Test Data                                                    | Expected Result                                    | ✓   |
| --- | -------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------- | --- |
| 1   | Complete setup                               | See Preconditions P1–P6                                      | All P1–P6 checks pass                              | ☐   |
| 2   | Set value via Date object (DevTools console) | `VV.Form.SetFieldValue('DataField7', new Date(2026, 2, 15))` | Field displays `03/15/2026`                        | ☐   |
| 3   | Capture raw stored value (DevTools console)  | `VV.Form.VV.FormPartition.getValueObjectValue('DataField7')` | `"2026-03-15"`                                     | ☐   |
| 4   | Capture GetFieldValue (DevTools console)     | `VV.Form.GetFieldValue('DataField7')`                        | `"2026-03-15"` — correct date, no shift            | ☐   |
| 5   | Confirm browser timezone (DevTools console)  | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`               | `"2026-03-14T18:30:00.000Z"` — confirms IST active | ☐   |

---

## Fail Conditions

**FAIL-1 (Bug #7 — date shifted -2 days):** Step 3 returns `"2026-03-13"` instead of `"2026-03-15"`.

- Interpretation: Bug #7 double-shift confirmed. In `normalizeCalValue()`: (1) `new Date(2026, 2, 15)` creates IST midnight; (2) `.toISOString()` → `"2026-03-14T18:30:00.000Z"`; (3) the "T" and time are stripped → `"2026-03-14"`; (4) `moment("2026-03-14").toDate()` parses as IST midnight on Mar 14 = `2026-03-13T18:30:00Z`; (5) `getSaveValue()` extracts UTC date = March 13. Two timezone crossings produce a -2 day shift. String inputs only cross once (FAIL-1 in `tc-7-A-dateOnly-IST.md` shifts by -1 day).

**FAIL-2 (Bug #7 — date shifted -1 day only):** Step 3 returns `"2026-03-14"` instead of `"2026-03-15"`.

- Interpretation: Only one shift occurred, not two. The Date-to-ISO-to-strip-to-reparse double-shift may have been fixed in V2, but the single-shift (moment local midnight) may persist.

**FAIL-3 (Wrong timezone):** Step 5 does not return `"2026-03-14T18:30:00.000Z"`.

- Interpretation: System timezone is not IST. Re-do P1 and P2.

**FAIL-4 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path active. Verify this test applies to V2 before continuing.

**FAIL-5 (Field not found):** P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config A flags.

---

## Related

| Reference              | Location                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| Matrix row             | `../matrix.md` — row `7-A-dateObj-IST`                                                     |
| Bug #7 analysis        | `../analysis.md` — Bug #7 (double-shift section)                                           |
| BRT control: Config D  | [`tc-7-D-dateObj.md`](tc-7-D-dateObj.md) — Config D Date obj, no Bug #7                    |
| Sibling: date string   | [`tc-7-A-dateOnly-IST.md`](tc-7-A-dateOnly-IST.md) — single-shift variant                  |
| BRT date string        | `tc-7-A-dateOnly.md` (if exists) — same string input in BRT                                |
| Field config reference | `research/date-handling/CLAUDE.md` — Config A (`enableTime=false`, `ignoreTimezone=false`) |
