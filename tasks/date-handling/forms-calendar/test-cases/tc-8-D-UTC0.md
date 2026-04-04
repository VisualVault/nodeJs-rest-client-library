# TC-8-D-UTC0 — Config D, GetFieldValue, UTC0: fake Z coincidentally correct at UTC+0 (Bug #5)

## Environment Specs

| Parameter               | Required Value                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Browser**             | Google Chrome, latest stable (V8 engine)                                                |
| **System Timezone**     | `Etc/GMT` — UTC+0. No DST.                                                              |
| **Platform**            | VisualVault FormViewer, Build 20260304.1                                                |
| **VV Code Path**        | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                |
| **Target Field Config** | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**            | `2026-03-15T00:00:00`, UTC+0 — set via SetFieldValue, then read via GetFieldValue       |

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
            f.ignoreTimezone === true &&
            f.useLegacy === false &&
            f.enableInitialValue === false
    )
    .map((f) => f.name);
// Expected on current test form: ["Field5"]
// Record the returned name — use it as <FIELD_NAME> in the test steps
```

---

## Test Steps

| #   | Action                                      | Test Data                                                      | Expected Result                                        | ✓   |
| --- | ------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------ | --- |
| 1   | Complete setup                              | See Preconditions P1–P6                                        | All P1–P6 checks pass                                  | ☐   |
| 2   | Set value (DevTools console)                | `VV.Form.SetFieldValue('<FIELD_NAME>', '2026-03-15T00:00:00')` | Field displays `03/15/2026 12:00 AM`                   | ☐   |
| 3   | Capture raw stored value (DevTools console) | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_NAME>')` | `"2026-03-15T00:00:00"`                                | ☐   |
| 4   | Capture GetFieldValue (DevTools console)    | `VV.Form.GetFieldValue('<FIELD_NAME>')`                        | `"2026-03-15T00:00:00"` — raw value with no Z appended | ☐   |
| 5   | Confirm browser timezone (DevTools console) | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T00:00:00.000Z"` — confirms UTC+0 active   | ☐   |

> The Expected Result for step 4 reflects correct behavior: GFV should return the raw stored value unchanged. Bug #5 adds a fake `.000Z` suffix, producing `"2026-03-15T00:00:00.000Z"` instead. At UTC+0, this fake Z is coincidentally numerically correct (local time = UTC), but the value is still structurally wrong — it was not computed from a real UTC conversion. Compare with 8-D-BRT and 8-D-IST where the fake Z produces visibly incorrect UTC values.

---

## Fail Conditions

**FAIL-1 (Bug #5 — fake Z appended):**
Step 4 returns `"2026-03-15T00:00:00.000Z"` instead of `"2026-03-15T00:00:00"`.

- Interpretation: Bug #5 confirmed at UTC+0. `getCalendarFieldValue()` adds fake `[Z]` via `moment(value).format("YYYY-MM-DD[T]HH:mm:ss.SSS[Z]")`. At UTC+0, the fake Z is coincidentally correct numerically, but the bug is structurally present. This is the invisible manifestation of Bug #5 — only detectable by comparing with BRT/IST results where the same operation produces visibly wrong values.

**FAIL-2 (Wrong timezone):**
Step 5 does not return `"2026-03-15T00:00:00.000Z"`.

- Interpretation: System timezone is not UTC+0. Re-do P1 and P2.

**FAIL-3 (V2 active):**
P5 returns `true`.

- Interpretation: V2 code path active. Under V2, GFV returns raw value unchanged (no fake Z).

**FAIL-4 (Field not found):**
P6 returns no matching fields.

- Interpretation: DateTest form does not have a field with Config D flags.

---

## Related

| Reference              | Location                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------- |
| Matrix row             | `../matrix.md` — row `8-D-UTC0`                                                       |
| Bug #5                 | `../analysis.md` — Bug #5: Fake [Z] in GetFieldValue                                  |
| Sibling (BRT)          | [`tc-8-D-BRT.md`](tc-8-D-BRT.md) — fake Z visible (-3h drift per round-trip)          |
| Sibling (IST)          | [`tc-8-D-IST.md`](tc-8-D-IST.md) — fake Z visible (+5:30h drift per round-trip)       |
| Config C comparison    | [`tc-8-C-UTC0.md`](tc-8-C-UTC0.md) — real UTC (identical output at UTC+0)             |
| Config H comparison    | [`tc-8-H-BRT.md`](tc-8-H-BRT.md) — useLegacy=true prevents Bug #5                     |
| Field config reference | `tasks/date-handling/CLAUDE.md` — Config D (`enableTime=true`, `ignoreTimezone=true`) |
