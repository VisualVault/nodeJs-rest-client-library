# TC-7-C-dateObj — Config C, SetFieldValue Date Object, BRT: local midnight stored; GFV returns real UTC

## Environment Specs

| Parameter               | Required Value                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                 |
| **System Timezone**     | `America/Sao_Paulo` — UTC-3, BRT. No DST active (abolished 2019).                        |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                 |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15`, BRT midnight — `2026-03-15T00:00:00-03:00` = `2026-03-15T03:00:00Z` UTC    |

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

| #   | Action                                       | Test Data                                                      | Expected Result                                           | ✓   |
| --- | -------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------- | --- |
| 1   | Complete setup                               | See Preconditions P1–P6                                        | All P1–P6 checks pass                                     | ☐   |
| 2   | Set value via Date object (DevTools console) | `VV.Form.SetFieldValue('<FIELD_NAME>', new Date(2026, 2, 15))` | Field displays `03/15/2026 12:00 AM`                      | ☐   |
| 3   | Capture raw stored value (DevTools console)  | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"`                                   | ☐   |
| 4   | Capture GetFieldValue (DevTools console)     | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T03:00:00.000Z"` — correct UTC reconstruction | ☐   |
| 5   | Confirm browser timezone (DevTools console)  | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active        | ☐   |

> `new Date(2026, 2, 15)` creates a Date at local BRT midnight. Config C stores local time and GFV reconstructs real UTC. Unlike date-only configs (A/B), DateTime configs handle Date objects without the double-shift problem (Bug #7 is absent).

---

## Fail Conditions

**FAIL-1 (GFV does not return correct UTC):**
Step 4 returns a value other than `"2026-03-15T03:00:00.000Z"`.

- Interpretation: Config C's UTC reconstruction is broken. Expected: GFV converts local stored value back to UTC.

**FAIL-2 (Wrong timezone):**
Step 5 does not return `"2026-03-15T03:00:00.000Z"`.

- Interpretation: System timezone is not BRT. Re-do P1 and P2.

**FAIL-3 (V2 active):**
P5 returns `true`.

- Interpretation: V2 code path active. Verify this test applies to V2 behavior before continuing.

**FAIL-4 (Field not found):**
P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config C flags.

---

## Related

| Reference              | Location                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| Matrix row             | `../matrix.md` — row `7-C-dateObj`                                                        |
| Analysis               | `../analysis.md` — no bugs for Config C                                                   |
| Sibling (ISO+Z)        | [`tc-7-C-isoZ.md`](tc-7-C-isoZ.md)                                                        |
| Sibling (ISO no Z)     | [`tc-7-C-isoNoZ.md`](tc-7-C-isoNoZ.md)                                                    |
| Sibling (Date string)  | [`tc-7-C-dateOnly.md`](tc-7-C-dateOnly.md)                                                |
| Sibling (US format)    | [`tc-7-C-usFormat.md`](tc-7-C-usFormat.md)                                                |
| Sibling (US+time)      | [`tc-7-C-usFormatTime.md`](tc-7-C-usFormatTime.md)                                        |
| Sibling (Epoch)        | [`tc-7-C-epoch.md`](tc-7-C-epoch.md)                                                      |
| Field config reference | `research/date-handling/CLAUDE.md` — Config C (`enableTime=true`, `ignoreTimezone=false`) |
