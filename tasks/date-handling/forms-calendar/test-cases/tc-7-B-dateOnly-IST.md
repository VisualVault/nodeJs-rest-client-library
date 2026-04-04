# TC-7-B-dateOnly-IST — Config B, SetFieldValue date string, IST: stores previous day (Bug #7)

## Environment Specs

| Parameter               | Required Value                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                 |
| **System Timezone**     | `Asia/Calcutta` — UTC+5:30, IST. No DST.                                                 |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                 |
| **Target Field Config** | `enableTime=false`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, IST midnight — date-only field, Bug #7 stores `2026-03-14` (-1 day)        |

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
// PASS: output contains GMT+0530
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
            f.enableTime === false &&
            f.ignoreTimezone === true &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected on current test form: ["Field10"]
// Record the returned name — use it as <FIELD_NAME> in the test steps
```

---

## Test Steps

| #   | Action                                       | Test Data                                                      | Expected Result                                    | ✓   |
| --- | -------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- | --- |
| 1   | Complete setup                               | See Preconditions P1–P6                                        | All P1–P6 checks pass                              | ☐   |
| 2   | Set value via date string (DevTools console) | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15')`          | Field displays `03/14/2026` (wrong — Bug #7)       | ☐   |
| 3   | Capture raw stored value (DevTools console)  | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15"`                                     | ☐   |
| 4   | Capture GetFieldValue (DevTools console)     | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15"` — date string, no transformation    | ☐   |
| 5   | Confirm browser timezone (DevTools console)  | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-14T18:30:00.000Z"` — confirms IST active | ☐   |

> Bug #7: `normalizeCalValue()` calls `moment("2026-03-15").toDate()` which creates IST midnight March 15 = UTC March 14 18:30. `getSaveValue()` then extracts the UTC date → `"2026-03-14"` (previous day). The `ignoreTZ` flag has no effect on this code path for date-only fields.

---

## Fail Conditions

**FAIL-1 (Bug #7 — wrong day stored):**
Step 3 returns `"2026-03-14"` instead of expected `"2026-03-15"`.

- Interpretation: Bug #7 confirmed. `moment("2026-03-15").toDate()` in IST → UTC previous day. This is the known defect — identical to Config A dateOnly-IST. The `ignoreTimezone=true` flag does not protect against Bug #7 for date-only fields.

**FAIL-2 (Wrong timezone):**
Step 5 does not return `"2026-03-14T18:30:00.000Z"`.

- Interpretation: System timezone is not IST. Re-do P1 and P2.

---

## Related

| Reference               | Location                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Matrix row              | `../matrix.md` — row `7-B-dateOnly-IST`                                                  |
| Results index           | `../results.md` § Session 2026-04-03                                                     |
| Bug #7 analysis         | `../analysis.md` — Bug #7 fires in UTC+ for all date-only configs                        |
| Config A IST sibling    | [`tc-7-A-dateOnly-IST.md`](tc-7-A-dateOnly-IST.md) — identical behavior (ignoreTZ inert) |
| BRT sibling             | [`tc-7-B-dateOnly-BRT.md`](tc-7-B-dateOnly-BRT.md) — passes in BRT (UTC-)                |
| Date object IST sibling | [`tc-7-B-dateObj-IST.md`](tc-7-B-dateObj-IST.md) — double-shift (-2 days)                |
| Field config reference  | `tasks/date-handling/CLAUDE.md` — Config B (`enableTime=false`, `ignoreTimezone=true`)   |
