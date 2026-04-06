# FORM-BUG-2: Calendar Popup and Typed Input Store Different Values for the Same Date

## What Happens

When a user enters a date into a legacy calendar field, the value stored in the database depends on **how** the date was entered — even though both methods produce the same visual result. Selecting March 15, 2026 via the **calendar popup** stores a UTC datetime string like `"2026-03-15T03:00:00.000Z"`, while **typing** the same date stores a local format like `"2026-03-15"`. Because the database column is a `datetime` type (not a date-only type), these two strings become two different datetime values: `2026-03-15 03:00:00.000` vs `2026-03-15 00:00:00.000` — a 3-hour difference in São Paulo (UTC-3).

The form **displays the correct date** after reload regardless of input method (the load path normalizes both formats). But the underlying database values differ, which means SQL queries, reports, and dashboards that filter by date may return inconsistent results depending on how the date was originally entered.

This only affects fields configured with **legacy mode enabled** (`useLegacy=true`). Non-legacy fields are immune — both input methods produce identical stored values.

---

## Severity: MEDIUM

Upgraded from Low after confirming that the format difference translates to an actual data difference in the SQL Server `datetime` column (3-hour offset in São Paulo, 5.5-hour in Mumbai, etc.). Originally classified as Low because it appeared to be a cosmetic format difference.

---

## Who Is Affected

- **End users** entering dates in legacy calendar fields — the stored value depends on whether they clicked the popup or typed the date, but they have no way to know which format was stored
- **Reports and SQL queries** that filter by date ranges — a query like `WHERE Field12 = '2026-03-15'` matches typed values but misses popup values (which are stored with a time component)
- **Dashboards** displaying the stored datetime — popup-entered dates show a time offset that typed dates don't
- **All timezones** — the format inconsistency exists everywhere, though the magnitude of the datetime difference equals the user's UTC offset

Non-legacy fields are **not affected**. In non-legacy mode, an upstream normalization step (`normalizeCalValue()`) processes the Date object before it reaches the divergent handlers, ensuring both paths produce the same stored value.

---

## Which Fields Are Affected

VisualVault calendar fields have three configuration flags that control their behavior:

| Flag             | What It Controls                                                           |
| ---------------- | -------------------------------------------------------------------------- |
| `enableTime`     | Whether the field stores time in addition to date (date-only vs date+time) |
| `ignoreTimezone` | Whether timezone conversion is skipped (treat value as display time)       |
| `useLegacy`      | Whether the field uses the older rendering/save code path                  |

FORM-BUG-2 affects **only fields with `useLegacy=true`** — regardless of the other two flags. In the test form, these are Fields 11-14 (referred to as Configs E, F, G, H in the testing matrix):

| Field   | Config | enableTime | ignoreTimezone | useLegacy | Affected? |
| ------- | :----: | :--------: | :------------: | :-------: | :-------: |
| Field12 |   E    |    off     |      off       |  **yes**  |  **Yes**  |
| Field11 |   F    |    off     |      yes       |  **yes**  |  **Yes**  |
| Field14 |   G    |     on     |      off       |  **yes**  |  **Yes**  |
| Field13 |   H    |     on     |      yes       |  **yes**  |  **Yes**  |
| Field7  |   A    |    off     |      off       |    no     |    No     |
| Field5  |   D    |     on     |      yes       |    no     |    No     |

The `ignoreTimezone` flag has **no effect** on this bug — Configs E and F behave identically, as do G and H.

---

## The Problem in Detail

### Two Different Save Paths

The calendar field has two separate handler functions for user input:

1. **Calendar popup handler** (`calChangeSetValue`): When the user clicks a date in the popup calendar, this function converts the selected Date object to an ISO string via `.toISOString()` and stores it directly — bypassing the formatting step that other paths use.

2. **Typed input handler** (`calChange`): When the user types a date and presses Tab, this function also converts to ISO via `.toISOString()`, but then passes the result through a formatting function called `getSaveValue()` before storing. `getSaveValue()` reformats the value:
    - For date-only fields: extracts just `"YYYY-MM-DD"` (e.g., `"2026-03-15"`)
    - For date+time fields: formats as `"YYYY-MM-DDTHH:mm:ss"` without the Z suffix or milliseconds

### Why Non-Legacy Fields Are Safe

In non-legacy mode, both paths go through a normalization step (`normalizeCalValue()`) that processes the Date object **before** it reaches either handler. This normalization ensures both handlers receive the same pre-processed value. The popup and typed paths converge to identical stored values.

In legacy mode, `normalizeCalValue()` is bypassed — the popup handler receives the raw Date object from the Kendo calendar widget and converts it directly to `.toISOString()`, skipping `getSaveValue()` entirely.

### What Gets Stored — Side by Side

**Date-only legacy field (Config E), user selects March 15 in São Paulo (UTC-3):**

| Input Method   | Handler             | Formatting Applied | Stored Value                 |
| -------------- | ------------------- | ------------------ | ---------------------------- |
| Calendar Popup | `calChangeSetValue` | None (raw ISO)     | `"2026-03-15T03:00:00.000Z"` |
| Typed Input    | `calChange`         | `getSaveValue()`   | `"2026-03-15"`               |

Both represent March 15 from the user's perspective, but the database stores:

- Popup: `2026-03-15 03:00:00.000` (3 AM — the UTC equivalent of midnight São Paulo)
- Typed: `2026-03-15 00:00:00.000` (midnight)

**Date+time legacy field (Config G), same scenario:**

| Input Method   | Handler             | Formatting Applied | Stored Value                 |
| -------------- | ------------------- | ------------------ | ---------------------------- |
| Calendar Popup | `calChangeSetValue` | None (raw ISO)     | `"2026-03-15T03:00:00.000Z"` |
| Typed Input    | `calChange`         | `getSaveValue()`   | `"2026-03-15T00:00:00"`      |

### DOM Discovery: Same Popup Widget, Different Toggle

During testing, we discovered that legacy and non-legacy fields use the **same underlying Kendo calendar popup widget**. The only difference is how the popup is triggered:

- **Non-legacy**: `<kendo-datepicker>` wrapper with a toggle button (`<span role="button" aria-label="Toggle calendar">`)
- **Legacy**: Custom wrapper (`<div class="d-picker">`) with an icon trigger (`<span class="k-icon k-i-calendar cal-icon">`)

Both open the same `<kendo-popup>` → `<kendo-calendar>` structure. The bug is not in the popup itself — it's in which handler function receives the selection.

---

## Steps to Reproduce

1. Open a form with a legacy calendar field (e.g., Field12: `useLegacy=true`, `enableTime=false`)
2. Select March 15, 2026 via the **calendar popup**
3. In DevTools console, check the stored value:
    ```javascript
    VV.Form.VV.FormPartition.getValueObjectValue('Field12');
    // Returns: "2026-03-15T03:00:00.000Z"  (raw toISOString — popup path)
    ```
4. Clear the field
5. **Type** `03/15/2026` in the input field and press Tab
6. Check the stored value again:
    ```javascript
    VV.Form.VV.FormPartition.getValueObjectValue('Field12');
    // Returns: "2026-03-15"  (formatted by getSaveValue — typed path)
    ```

The two values represent the same intended date but are stored differently.

---

## Workarounds

### 1. Standardize Input Method

If a field uses legacy mode, establish a convention (popup only or typed only) to ensure consistent format across all records. This doesn't fix existing data but prevents future inconsistency.

### 2. Switch to Non-Legacy Mode

Setting `useLegacy=false` eliminates this bug entirely — both input methods produce identical stored values. However, non-legacy mode with `enableTime=true` and `ignoreTimezone=true` introduces [FORM-BUG-5](bug-5-fake-z-drift.md) (progressive drift on GetFieldValue round-trips).

### 3. Normalize on Read

When reading values via scripts, parse through `new Date()` before comparing — this handles both formats:

```javascript
const raw = VV.Form.VV.FormPartition.getValueObjectValue('Field12');
const normalized = raw ? new Date(raw).toISOString() : '';
```

---

## Test Evidence

Testing conducted across São Paulo/BRT (UTC-3) and Mumbai/IST (UTC+5:30) using both manual browser testing and automated Playwright scripts.

### Automated Verification Results

**Standalone audit script** — Playwright headless Chromium, São Paulo timezone:

| Config      | Field   | Popup Raw                    | Typed Raw               | Raw Match | Bug? |
| ----------- | ------- | ---------------------------- | ----------------------- | --------- | ---- |
| A (control) | Field7  | `"2026-03-15"`               | `"2026-03-15"`          | Yes       | No   |
| E           | Field12 | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15"`          | **No**    | Yes  |
| F           | Field11 | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15"`          | **No**    | Yes  |
| G           | Field14 | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T00:00:00"` | **No**    | Yes  |
| H           | Field13 | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T00:00:00"` | **No**    | Yes  |

Config A (non-legacy control) produces identical values from both input methods — confirming the bug is legacy-only.

**Formal Playwright spec results** — Cat 1 Legacy Popup (`cat-1-legacy-popup.spec.js --project BRT-chromium`):

| Test    | Expected                | Received                     | Result |
| ------- | ----------------------- | ---------------------------- | ------ |
| 1-E-BRT | `"2026-03-15"`          | `"2026-03-15T03:00:00.000Z"` | FAIL   |
| 1-F-BRT | `"2026-03-15"`          | `"2026-03-15T03:00:00.000Z"` | FAIL   |
| 1-G-BRT | `"2026-03-15T00:00:00"` | `"2026-03-15T03:00:00.000Z"` | FAIL   |
| 1-H-BRT | `"2026-03-15T00:00:00"` | `"2026-03-15T03:00:00.000Z"` | FAIL   |

**Cat 2 Typed Input** — all legacy configs pass (typed path stores correct format):

| Test    | Expected                | Received                | Result |
| ------- | ----------------------- | ----------------------- | ------ |
| 2-E-BRT | `"2026-03-15"`          | `"2026-03-15"`          | PASS   |
| 2-F-BRT | `"2026-03-15"`          | `"2026-03-15"`          | PASS   |
| 2-G-BRT | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS   |
| 2-H-BRT | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS   |

**Manual vs automated comparison** — all values identical between manual testing (2026-03-31) and Playwright automation (2026-04-06), confirming reproducibility.

### Database Evidence

Two records created via Playwright with the same date (March 15, 2026), different input methods:

| Record | Method       | Field12 (date-only) pre-save | Field14 (date+time) pre-save |
| ------ | ------------ | ---------------------------- | ---------------------------- |
| Popup  | Legacy popup | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` |
| Typed  | Typed input  | `"2026-03-15"`               | `"2026-03-15T00:00:00"`      |

**Expected database values:**

| Field               | Popup DB Value            | Typed DB Value            | Difference  |
| ------------------- | ------------------------- | ------------------------- | ----------- |
| Field12 (date-only) | `2026-03-15 03:00:00.000` | `2026-03-15 00:00:00.000` | **3 hours** |
| Field14 (date+time) | `2026-03-15 03:00:00.000` | `2026-03-15 00:00:00.000` | **3 hours** |

SQL queries like `WHERE Field12 = '2026-03-15'` match typed but **not** popup values. The 3-hour difference equals the São Paulo UTC offset — different timezones would produce different offsets (e.g., 5.5 hours in Mumbai).

**Post-save normalization**: After saving, the form reloads and the V1 initialization path normalizes the in-memory value. Popup Field12 post-save becomes `"2026-03-15"` (normalized from the UTC string). The **display normalizes on next load**, but the **database retains the original UTC time**.

### Overall Test Counts

- Category 1 (Calendar Popup): 20/20 complete — 7 PASS, 13 FAIL
- Category 2 (Typed Input): 16/16 complete — 11 PASS, 5 FAIL

---

## Technical Root Cause

### The Two Handler Functions

**Popup handler** — `calChangeSetValue()` (line ~102824 in main.js):

```javascript
calChangeSetValue(e) {
    let t = e && !isNaN(e.getDate()) ? e.toISOString() : "";
    this.value = e;
    this.data.text = this.data.value = t;
    this.updateFormValueSubject(this.data.name, t);  // Stores raw toISOString()
}
```

**Typed input handler** — `calChange()` (line ~102824 in main.js):

```javascript
calChange(e, t = true, n = false) {
    let i = e && !isNaN(e.getDate()) ? e.toISOString() : "";
    this.data.text = this.data.value = i;
    let r = this.calendarValueService.getSaveValue(
        this.data.value,
        this.data.enableTime,
        this.data.ignoreTimezone
    );
    this.updateFormValueSubject(this.data.name, r, true, t, n);  // Stores formatted value
}
```

Both handlers receive the same Date object and convert it to ISO string. The difference is that `calChange` passes the result through `getSaveValue()` before storing, while `calChangeSetValue` skips this step entirely.

### What `getSaveValue()` Does

For the default code path (V1):

- **Date-only fields** (`enableTime=false`): Extracts the date portion `"YYYY-MM-DD"`
- **Date+time fields** (`enableTime=true`): Formats as `"YYYY-MM-DDTHH:mm:ss"` — strips Z and milliseconds

The popup handler bypasses this entirely, storing the raw `toISOString()` output (e.g., `"2026-03-15T03:00:00.000Z"` — full UTC datetime with Z suffix and milliseconds).

### What the Fix Should Do

Both handlers should produce identical stored values. The popup handler should route through `getSaveValue()` just like the typed handler:

```javascript
calChangeSetValue(e) {
    let t = e && !isNaN(e.getDate()) ? e.toISOString() : "";
    this.value = e;
    this.data.text = this.data.value = t;

    // Route through getSaveValue() for consistency with calChange()
    let saveValue = this.calendarValueService.getSaveValue(
        this.data.value,
        this.data.enableTime,
        this.data.ignoreTimezone
    );

    this.updateFormValueSubject(this.data.name, saveValue);
}
```

### Interaction with Other Bugs

| Bug        | Relationship                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| FORM-BUG-4 | `getSaveValue()` strips the Z suffix — this is the function the popup handler skips, creating the format divergence |
| FORM-BUG-7 | Date-only fields in UTC+ store the wrong day regardless of input method — FORM-BUG-7 affects both handlers equally  |

---

## Fix Impact Assessment

### What Changes If Fixed

- Popup and typed input produce identical stored values for all legacy configs
- Legacy popup no longer stores raw `toISOString()` with Z suffix and milliseconds
- Reload behavior becomes consistent regardless of how the date was originally entered
- SQL queries return consistent results for the same date regardless of input method

### Backwards Compatibility Risk: LOW

- Existing data stored via legacy popup in raw format still loads correctly (`parseDateString` handles both formats on reload)
- The change only affects future saves — existing records retain their stored format until edited
- No change to the visual date selection experience

### Regression Risk: LOW

- The change is additive (adding a `getSaveValue()` call to the popup path)
- Must verify that `getSaveValue()` produces correct results for all legacy config combinations
- Must verify popup display is not affected (the visual selection itself doesn't change)
- Non-legacy configs are completely unaffected (they already converge through `normalizeCalValue()`)

### Artifacts Created During Investigation

- `testing/helpers/vv-calendar.js` — added `selectDateViaLegacyPopup()` function
- `testing/date-handling/cat-1-legacy-popup.spec.js` — formal Playwright spec for legacy popup tests
- `testing/scripts/audit-bug2-db-evidence.js` — popup vs typed save script for DB comparison
- Run files: `tc-1-{E,F,G,H}-BRT-run-2.md`
