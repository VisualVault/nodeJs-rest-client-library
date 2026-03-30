# TC-2.9 — Configs A/C/D, Form Load (Server Reload), BRT: no date shift; initial-value fields change format

---

## Environment Specs

| Parameter                | Value                                                                                                                                                                                                                                                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Browser**              | Google Chrome, latest stable (V8 engine)                                                                                                                                                                                                                                                                                    |
| **System Timezone**      | `America/Sao_Paulo` — UTC-3, Brasilia Standard Time. No DST (Brazil abolished DST in 2019).                                                                                                                                                                                                                                 |
| **Platform**             | VisualVault FormViewer, Build `20260304.1`                                                                                                                                                                                                                                                                                  |
| **VV Code Path**         | V1 — `useUpdatedCalendarValueLogic = false` (verified at runtime via P5)                                                                                                                                                                                                                                                    |
| **Target Field Configs** | Config A: `enableTime=false`, `ignoreTimezone=false`, `useLegacy=false` (with and without `enableInitialValue=true`); Config C: `enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`, `enableInitialValue=false`; Config D: `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`, `enableInitialValue=false` |
| **Scenario**             | DateTest-000004 saved 2026-03-27 in BRT; reopened as Rev 1 via `DataID` URL; BRT midnight reference `2026-03-15T00:00:00-03:00` = `2026-03-15T03:00:00Z` UTC                                                                                                                                                                |

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

**P4 — Open DateTest-000004 Rev 1** (saved record — do NOT use the template URL for this TC):

```text
https://vvdemo.visualvault.com/FormViewer/app?DataID=2ae985b5-1892-4d26-94da-388121b0907e&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939
```

Wait for the tab title to become `DateTest-000004 Rev 1` before continuing.

> **Why a saved record, not the template**: This TC documents server-reload behavior — what the form looks like after a complete save/reload cycle. The template URL creates an unsaved form with no server-returned values. DateTest-000004 was saved from BRT on 2026-03-27 and provides the stable reference record for this scenario.

**P5 — Verify code path** (DevTools console after form loads):

```javascript
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// PASS: false  → V1 is active, proceed
// NOTE: the DataID URL does not trigger V2 — only ?ObjectID= does
// ABORT: true  → V2 is active unexpectedly; verify URL and account server flag
```

**P6 — Locate all target fields by configuration** (DevTools console):

```javascript
({
    configA_currentDate: Object.values(VV.Form.VV.FormPartition.fieldMaster)
        .filter(
            (f) =>
                f.fieldType === 13 &&
                f.enableTime === false &&
                f.ignoreTimezone === false &&
                f.useLegacy === false &&
                f.enableInitialValue === true &&
                f.initialValueMode === 0
        )
        .map((f) => f.name),
    configA_preset: Object.values(VV.Form.VV.FormPartition.fieldMaster)
        .filter(
            (f) =>
                f.fieldType === 13 &&
                f.enableTime === false &&
                f.ignoreTimezone === false &&
                f.useLegacy === false &&
                f.enableInitialValue === true &&
                f.initialValueMode === 1
        )
        .map((f) => f.name),
    configD: Object.values(VV.Form.VV.FormPartition.fieldMaster)
        .filter(
            (f) =>
                f.fieldType === 13 &&
                f.enableTime === true &&
                f.ignoreTimezone === true &&
                f.useLegacy === false &&
                f.enableInitialValue === false
        )
        .map((f) => f.name),
    configC: Object.values(VV.Form.VV.FormPartition.fieldMaster)
        .filter(
            (f) =>
                f.fieldType === 13 &&
                f.enableTime === true &&
                f.ignoreTimezone === false &&
                f.useLegacy === false &&
                f.enableInitialValue === false
        )
        .map((f) => f.name),
    configA: Object.values(VV.Form.VV.FormPartition.fieldMaster)
        .filter(
            (f) =>
                f.fieldType === 13 &&
                f.enableTime === false &&
                f.ignoreTimezone === false &&
                f.useLegacy === false &&
                f.enableInitialValue === false
        )
        .map((f) => f.name),
});
// Expected:
// { configA_currentDate: ["DataField1","DataField3"], configA_preset: ["DataField2","DataField4"],
//   configD: ["DataField5"], configC: ["DataField6"], configA: ["DataField7"] }
//
// Use the first element of each list:
//   configA_currentDate[0] → <FIELD_A_CD>   (Config A, CurrentDate mode)
//   configA_preset[0]      → <FIELD_A_P>    (Config A, Preset mode)
//   configD[0]             → <FIELD_D>      (Config D)
//   configC[0]             → <FIELD_C>      (Config C)
//   configA[0]             → <FIELD_A>      (Config A, no initial value)
```

> If any list is empty, the test form does not have a field with that configuration — stop and report.

---

---

## Test Steps

| #   | Action                                                                                 | Test Data                                                      | Expected Result                                                            | ✓   |
| --- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | --- |
| 1   | Complete setup                                                                         | See Preconditions P1–P6                                        | All P1–P6 checks pass                                                      | ☐   |
| 2   | Verify display — Config A, CurrentDate mode field (identified as `<FIELD_A_CD>` in P6) | —                                                              | `03/27/2026`                                                               | ☐   |
| 3   | Capture raw stored value — Config A, CurrentDate                                       | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_A_CD>')` | `"03/27/2026 20:02:51"` — string; was a Date object before server save     | ☐   |
| 4   | Capture GetFieldValue — Config A, CurrentDate                                          | `VV.Form.GetFieldValue('<FIELD_A_CD>')`                        | `"03/27/2026 20:02:51"`                                                    | ☐   |
| 5   | Verify display — Config A, Preset mode field (identified as `<FIELD_A_P>` in P6)       | —                                                              | `03/01/2026`                                                               | ☐   |
| 6   | Capture raw stored value — Config A, Preset                                            | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_A_P>')`  | `"03/01/2026 03:00:00"` — 03:00 is the UTC time of BRT midnight on March 1 | ☐   |
| 7   | Capture GetFieldValue — Config A, Preset                                               | `VV.Form.GetFieldValue('<FIELD_A_P>')`                         | `"03/01/2026 03:00:00"`                                                    | ☐   |
| 8   | Verify display — Config D field (identified as `<FIELD_D>` in P6)                      | —                                                              | `03/15/2026 12:00 AM`                                                      | ☐   |
| 9   | Capture raw stored value — Config D                                                    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_D>')`    | `"2026-03-15T00:00:00"` — no shift from server reload                      | ☐   |
| 10  | Capture GetFieldValue — Config D                                                       | `VV.Form.GetFieldValue('<FIELD_D>')`                           | `"2026-03-15T00:00:00.000Z"` — fake Z (Bug #5)                             | ☐   |
| 11  | Verify display — Config C field (identified as `<FIELD_C>` in P6)                      | —                                                              | `03/15/2026 12:00 AM`                                                      | ☐   |
| 12  | Capture raw stored value — Config C                                                    | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_C>')`    | `"2026-03-15T00:00:00"` — no shift from server reload                      | ☐   |
| 13  | Capture GetFieldValue — Config C                                                       | `VV.Form.GetFieldValue('<FIELD_C>')`                           | `"2026-03-15T03:00:00.000Z"` — proper UTC conversion (no Bug #5)           | ☐   |
| 14  | Verify display — Config A, no initial value field (identified as `<FIELD_A>` in P6)    | —                                                              | `03/15/2026`                                                               | ☐   |
| 15  | Capture raw stored value — Config A, no initial value                                  | `VV.Form.VV.FormPartition.getValueObjectValue('<FIELD_A>')`    | `"2026-03-15"` — no shift from server reload                               | ☐   |
| 16  | Capture GetFieldValue — Config A, no initial value                                     | `VV.Form.GetFieldValue('<FIELD_A>')`                           | `"2026-03-15"`                                                             | ☐   |
| 17  | Verify environment (isoRef)                                                            | `new Date(2026, 2, 15, 0, 0, 0).toISOString()`                 | `"2026-03-15T03:00:00.000Z"` — confirms BRT active                         | ☐   |

> **Config A initial-value format change**: Before saving, the CurrentDate and Preset fields store Date objects (e.g., `2026-03-27T20:02:51.472Z`). After server save and reload, the server returns them as `"MM/dd/yyyy HH:mm:ss"` strings (e.g., `"03/27/2026 20:02:51"`). This format change is transparent to end users — the display remains correct — but affects code that reads `getValueObjectValue()` directly, which receives a different type and format depending on whether the record has been saved.
>
> **Preset "03:00:00" explained**: The Preset field was configured for March 1, 2026. Before saving, `initCalendarValueV1()` parsed the preset as local midnight BRT, producing a Date object at `2026-03-01T03:00:00.000Z` (midnight BRT = 03:00 UTC). After save/reload, the server returns `"03/01/2026 03:00:00"` in `MM/dd/yyyy HH:mm:ss` format — the UTC timestamp without a timezone suffix. The display still shows `03/01/2026` because on reload `initCalendarValueV2()` calls `.startOf("day")` for date-only fields, anchoring to midnight regardless of the time component.
>
> **Bug #5 confined to Config D**: Config D (`enableTime=true`, `ignoreTimezone=true`) GetFieldValue returns fake Z (`"2026-03-15T00:00:00.000Z"`). Config C (`enableTime=true`, `ignoreTimezone=false`) GetFieldValue correctly converts to UTC (`"2026-03-15T03:00:00.000Z"`). Config A date-only fields return the raw string unchanged. Server reload does not trigger Bug #5 — the bug is in `GetFieldValue()`, not the load path itself.

---

## Fail Conditions

**FAIL-1 (Date shift on reload for Config D or C):**
Step 9 or step 12 returns a value other than `"2026-03-15T00:00:00"`.

- Interpretation: The server load path shifted the stored value. In BRT (UTC-3), Bug #3 (hardcoded `enableTime=true` in `initCalendarValueV2()` for the server path) does not produce a visible shift because UTC-3 midnight still lands on the same local date. If a shift is observed in BRT, the code path has changed or V2 is active. Verify P5 returns `false`.

**FAIL-2 (Bug #5 absent — Config D GetFieldValue returns proper UTC):**
Step 10 returns `"2026-03-15T03:00:00.000Z"` (proper UTC for BRT midnight) instead of `"2026-03-15T00:00:00.000Z"`.

- Interpretation: `getCalendarFieldValue()` no longer appends a fake `Z` to the local time string. Verify the build number matches `20260304.1`. If the build changed, Bug #5 may have been fixed.

**FAIL-3 (Config A initial-value fields still show Date objects — not reloaded from server):**
Step 3 returns a Date object string such as `"Fri Mar 27 2026 17:02:51 GMT-0300 (Brasilia Standard Time)"` instead of `"03/27/2026 20:02:51"`.

- Interpretation: The form has not gone through a server save/reload cycle. This happens if P4 navigated to the template URL (which creates a fresh unsaved form) instead of the saved record URL. Verify the tab title shows `DateTest-000004 Rev 1`, not `DateTest-XXXXXX`. If a template was loaded, re-navigate to the DataID URL in P4.

**FAIL-4 (V2 active — wrong code path):**
P5 returns `true`.

- Interpretation: V2 (`useUpdatedCalendarValueLogic=true`) is active. The `?DataID=` URL parameter does not trigger V2, but an account-level server flag or a `?ObjectID=` URL would. Verify the record was opened via the DataID URL in P4. If V2 is confirmed active on this account, this TC does not apply.

**FAIL-5 (Wrong timezone — isoRef shows UTC midnight):**
Step 17 returns `"2026-03-15T00:00:00.000Z"` (midnight UTC, no offset shift).

- Interpretation: The browser is running in UTC, not BRT. Abort, re-do P1–P3, and restart the test.

---

## Related

| Reference                                                   | Location                                                                                                                               |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Source test block                                           | `tasks/date-handling/forms-calendar/test/results.md` — Test 2.9 (Scenario 3 — Save and Reload)                                         |
| Database evidence                                           | `tasks/date-handling/forms-calendar/test/results.md` — Test 2.10 (Database Evidence — Actual Stored Values)                            |
| Bug #3 analysis                                             | `tasks/date-handling/forms-calendar/analysis.md` — Bug #3: Hardcoded Parameters in initCalendarValueV2()                               |
| Bug #5 analysis                                             | `tasks/date-handling/forms-calendar/analysis.md` — Bug #5: Inconsistent Developer API Behavior (`getCalendarFieldValue()` line 104114) |
| Field config reference                                      | `tasks/date-handling/CLAUDE.md` — Test Form Fields table                                                                               |
| Sibling TC (Config D round-trip — Bug #5 drift)             | `tasks/date-handling/forms-calendar/test/tc-2-3-roundtrip-brt.md`                                                                      |
| Sibling TC (Config A baseline — initial form load pre-save) | `tasks/date-handling/forms-calendar/test/tc-2-1-form-load-brt.md`                                                                      |
