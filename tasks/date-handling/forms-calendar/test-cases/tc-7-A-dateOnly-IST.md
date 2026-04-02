# TC-7-A-dateOnly-IST — Config A, SetFieldValue date string, IST: Bug #7 stores -1 day in UTC+ timezone

## Environment Specs

| Parameter               | Required Value                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                  |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST. No DST.                                                  |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                  |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                  |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, IST midnight — `2026-03-15T00:00:00+05:30` = `2026-03-14T18:30:00Z` UTC     |

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
| 2   | Set value via date string (DevTools console) | `VV.Form.SetFieldValue('DataField7', '2026-03-15')`          | Field displays `03/15/2026`                        | ☐   |
| 3   | Capture raw stored value (DevTools console)  | `VV.Form.VV.FormPartition.getValueObjectValue('DataField7')` | `"2026-03-15"`                                     | ☐   |
| 4   | Capture GetFieldValue (DevTools console)     | `VV.Form.GetFieldValue('DataField7')`                        | `"2026-03-15"` — correct date, no shift            | ☐   |
| 5   | Confirm browser timezone (DevTools console)  | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`               | `"2026-03-14T18:30:00.000Z"` — confirms IST active | ☐   |

---

## Fail Conditions

**FAIL-1 (Bug #7 — date shifted -1 day):** Step 3 returns `"2026-03-14"` instead of `"2026-03-15"`.

- Interpretation: Bug #7 confirmed. In `normalizeCalValue()`, `moment("2026-03-15").toDate()` parses the date-only string as local IST midnight = `2026-03-14T18:30:00Z`. Then `getSaveValue()` extracts the UTC date portion = March 14. The user set March 15 but March 14 is stored. This affects all date-only fields in UTC+ timezones. BRT control (`tc-7-A-dateOnly.md`) passes because UTC- local midnight is still the same UTC day.

**FAIL-2 (Wrong timezone):** Step 5 does not return `"2026-03-14T18:30:00.000Z"`.

- Interpretation: System timezone is not IST. Re-do P1 and P2.

**FAIL-3 (V2 active):** P5 returns `true`.

- Interpretation: V2 code path active. Verify this test applies to V2 before continuing.

**FAIL-4 (Field not found):** P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config A flags.

---

## Related

| Reference              | Location                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------- |
| Matrix row             | `../matrix.md` — row `7-A-dateOnly-IST`                                                 |
| Bug #7 analysis        | `../analysis.md` — Bug #7 (SetFieldValue date-only stores wrong day in UTC+)            |
| BRT control            | `tc-7-A-dateOnly.md` (if exists) — same test in BRT, expected PASS                      |
| Sibling: Date object   | [`tc-7-A-dateObj-IST.md`](tc-7-A-dateObj-IST.md) — Date object double-shift             |
| Field config reference | `tasks/date-handling/CLAUDE.md` — Config A (`enableTime=false`, `ignoreTimezone=false`) |
