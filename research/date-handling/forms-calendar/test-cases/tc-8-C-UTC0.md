# TC-8-C-UTC0 — Config C, GetFieldValue, UTC0: real UTC equals stored value at UTC+0; no bugs

## Environment Specs

| Parameter               | Required Value                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                 |
| **System Timezone**     | `Etc/GMT` — UTC+0. No DST.                                                               |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                 |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                 |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15T00:00:00`, UTC+0 — set via SetFieldValue, then read via GetFieldValue        |

---

## Preconditions

Complete all steps in order. Do not proceed if any verification fails.

**P1 — Set system timezone to `Etc/GMT`:**

macOS:

```bash
sudo systemsetup -settimezone GMT
```

Windows (run as Administrator):

```bat
tzutil /s "UTC"
```

Windows (PowerShell, run as Administrator):

```powershell
Set-TimeZone -Id "UTC"
```

Linux:

```bash
sudo timedatectl set-timezone Etc/GMT
```

**P2 — Restart Chrome** after the timezone change.

**P3 — Verify browser timezone** (DevTools console):

```javascript
new Date().toString();
// PASS: output contains GMT+0000
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

---

## Test Steps

| #   | Action                                      | Test Data                                                      | Expected Result                                               | ✓   |
| --- | ------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                        | All P1–P6 checks pass                                         | ☐   |
| 2   | Set value (DevTools console)                | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')` | Field displays `03/15/2026 12:00 AM`                          | ☐   |
| 3   | Capture raw stored value (DevTools console) | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"`                                       | ☐   |
| 4   | Capture GetFieldValue (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T00:00:00.000Z"` — real UTC (= stored+Z at UTC+0) | ☐   |
| 5   | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T00:00:00.000Z"` — confirms UTC+0 active          | ☐   |

> At UTC+0, local time equals UTC. Config C's real UTC reconstruction (`new Date(stored).toISOString()`) produces the stored value with `.000Z` appended. This is the boundary case where Config C and Config D (fake Z) produce identical output — distinguish them by comparing with BRT/IST results.

---

## Fail Conditions

**FAIL-1 (GFV does not return stored+Z):**
Step 4 returns a value other than `"2026-03-15T00:00:00.000Z"`.

- Interpretation: Config C's UTC conversion is broken at UTC+0 boundary. The `new Date("2026-03-15T00:00:00").toISOString()` should trivially produce stored+Z at UTC+0.

**FAIL-2 (Wrong timezone):**
Step 5 does not return `"2026-03-15T00:00:00.000Z"`.

- Interpretation: System timezone is not UTC+0. Re-do P1 and P2.

**FAIL-3 (V2 active):**
P5 returns `true`.

- Interpretation: V2 code path active. Under V2, GFV returns raw value unchanged (no `.000Z`).

**FAIL-4 (Field not found):**
P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config C flags.

---

## Related

| Reference              | Location                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| Matrix row             | `../matrix.md` — row `8-C-UTC0`                                                           |
| Analysis               | `../analysis.md` — no bugs for Config C GFV                                               |
| Sibling (BRT)          | [`tc-8-C-BRT.md`](tc-8-C-BRT.md)                                                          |
| Sibling (IST)          | [`tc-8-C-IST.md`](tc-8-C-IST.md)                                                          |
| Config D comparison    | [`tc-8-D-BRT.md`](tc-8-D-BRT.md) — Bug #5 fake Z vs Config C real UTC                     |
| Field config reference | `research/date-handling/CLAUDE.md` — Config C (`enableTime=true`, `ignoreTimezone=false`) |
