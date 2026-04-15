# FORM-BUG-2: Calendar Popup and Typed Input Store Different Values for the Same Date

## What Happens

Calendar fields accept dates two ways: clicking a date in the **calendar popup**, or **typing** the date directly into the input field. When a field is configured with legacy mode, these two methods store different values in the database — even though both show the same date on screen.

For example, entering March 15, 2026 in São Paulo (UTC-3): the popup stores the equivalent of 3:00 AM while typing stores midnight. The form displays the correct date after reload in both cases, but the underlying database values differ by 3 hours — meaning SQL queries, reports, and dashboards that filter by date may return inconsistent results depending on how the date was originally entered.

---

## When This Applies

Three conditions must all be true:

### 1. The field must be configured with legacy mode (`useLegacy=true`)

Non-legacy fields are not affected. The `useLegacy` flag is a per-field configuration — a form can have both legacy and non-legacy fields side by side. See [Why Non-Legacy Fields Are Safe](#why-non-legacy-fields-are-safe) for the technical explanation.

### 2. The date was entered via the calendar popup

Typed input stores the correct value. The inconsistency only appears when a date is entered through the calendar popup.

### 3. The user's timezone is not UTC+0

At UTC+0, the two stored values are numerically identical — the bug exists but is invisible. The magnitude of the difference equals the user's UTC offset (e.g., 3 hours in São Paulo, 5.5 hours in Mumbai). See [What Gets Stored](#what-gets-stored--side-by-side) for the full breakdown.

**Field configuration scope** — the `ignoreTimezone` and `enableTime` flags have no effect on whether this bug occurs. All four legacy configs are affected equally:

| Config | Field   | enableTime | ignoreTimezone | useLegacy | Affected?  |
| ------ | ------- | ---------- | -------------- | --------- | ---------- |
| E      | Field12 | —          | —              | ✅        | ✅ **Yes** |
| F      | Field11 | —          | ✅             | ✅        | ✅ **Yes** |
| G      | Field14 | ✅         | —              | ✅        | ✅ **Yes** |
| H      | Field13 | ✅         | ✅             | ✅        | ✅ **Yes** |
| A      | Field7  | —          | —              | —         | ❌ No      |
| D      | Field5  | ✅         | ✅             | —         | ❌ No      |

---

## Severity: MEDIUM

The format difference translates to an actual data difference in the SQL Server `datetime` column — a 3-hour offset in São Paulo, 5.5 hours in Mumbai. The form display normalizes correctly on reload (V1's init path re-parses the value), so end users re-opening the form see the correct date. However, any consumer that reads the raw database value — web service scripts, SQL queries, reports, dashboards — gets the un-normalized value and will see the offset. The impact is limited to legacy fields, which are the older configuration path.

---

## How to Reproduce

1. Set system timezone to `America/Sao_Paulo` (BRT, UTC-3) and restart the browser
2. Open the DateTest form template URL (creates a new empty form)
3. On **Field12** (Config E: date-only, legacy), click the calendar icon and select March 15, 2026
4. In the browser console, check the stored value:
    ```javascript
    VV.Form.VV.FormPartition.getValueObjectValue('Field12');
    // Returns: "2026-03-15T03:00:00.000Z"  (popup path — raw UTC)
    ```
5. Clear the field
6. Type `03/15/2026` in the same field and press Tab
7. Check the stored value again:
    ```javascript
    VV.Form.VV.FormPartition.getValueObjectValue('Field12');
    // Returns: "2026-03-15"  (typed path — formatted by getSaveValue)
    ```

**Expected**: Both input methods store the same value.
**Actual**: Popup stores `"2026-03-15T03:00:00.000Z"`, typed stores `"2026-03-15"` — these become different `datetime` values in the database.

This bug report is backed by a supporting test repository containing Playwright automation scripts, additional per-bug analysis documents, raw test data, and test case specifications. Access can be requested from the Solution Architecture team.

```bash
npx playwright test testing/specs/date-handling/cat-1-legacy-popup.spec.js --project=BRT-chromium
```

---

## The Problem in Detail

### Two Different Save Paths

The calendar field has two separate handler functions for user input:

1. **Calendar popup handler** (`calChangeSetValue`): When the user clicks a date in the popup, this function converts the selected Date object to a string via `.toISOString()` and stores it directly — bypassing the formatting step that other paths use.

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

### Popup Widget Architecture

Legacy and non-legacy fields use the **same underlying Kendo calendar popup widget**. The only difference is how the popup is triggered:

- **Non-legacy**: `<kendo-datepicker>` wrapper with a toggle button (`<span role="button" aria-label="Toggle calendar">`)
- **Legacy**: Custom wrapper (`<div class="d-picker">`) with an icon trigger (`<span class="k-icon k-i-calendar cal-icon">`)

Both open the same `<kendo-popup>` → `<kendo-calendar>` structure. The bug is not in the popup itself — it's in which handler function receives the selection.

### Post-Save Display vs Database

After saving, the form reloads and the V1 initialization path normalizes the in-memory value. A popup-entered Field12 post-save becomes `"2026-03-15"` (normalized from the UTC string). The **display normalizes on next load**, but the **database retains the original UTC time**. Any consumer reading the raw database value — web service scripts, SQL queries, reports, dashboards — sees the un-normalized value with the timezone offset.

### Relationship to Other Bugs

| Bug        | Relationship                                                                                                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FORM-BUG-4 | `getSaveValue()` strips the Z suffix — this is the function the popup handler skips, creating the format divergence. FORM-BUG-2 is the popup skipping FORM-BUG-4's formatting step. |
| FORM-BUG-7 | Date-only fields in UTC+ store the wrong day regardless of input method — FORM-BUG-7 affects both handlers equally. FORM-BUG-2 is independent of FORM-BUG-7.                        |

---

## Verification

Verified on the demo environment at `vvdemo.visualvault.com` across São Paulo/BRT (UTC-3) and Mumbai/IST (UTC+5:30) using both manual browser testing and automated Playwright scripts (Chromium). Manual results (2026-03-31) and Playwright results (2026-04-06) produced identical values, confirming reproducibility.

All 4 legacy configs (E, F, G, H) confirmed buggy via popup — stored values differ from typed input. Non-legacy Config A (control) produces identical values from both input methods, confirming the bug is legacy-only. The typed path is correct for all configs; the popup path is the defective one. Database comparison confirms the format difference translates to a real `datetime` difference (3-hour offset in São Paulo). Overall: Category 1 (popup) 20/20 complete — 7 PASS, 13 FAIL; Category 2 (typed) 16/16 complete — 11 PASS, 5 FAIL.

This bug report is backed by a supporting test repository containing Playwright automation scripts, per-test results, database comparison scripts, and raw test data. Access can be requested from the Solution Architecture team.

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

---

## Appendix: Field Configuration Reference

The test form has 8 field configurations referred to by letter throughout this document:

| Config | Field   | enableTime | ignoreTimezone | useLegacy | Description                 |
| ------ | ------- | ---------- | -------------- | --------- | --------------------------- |
| A      | Field7  | —          | —              | —         | Date-only baseline          |
| B      | Field10 | —          | ✅             | —         | Date-only + ignoreTZ        |
| C      | Field6  | ✅         | —              | —         | DateTime UTC (control)      |
| D      | Field5  | ✅         | ✅             | —         | DateTime + ignoreTZ         |
| E      | Field12 | —          | —              | ✅        | Legacy date-only            |
| F      | Field11 | —          | ✅             | ✅        | Legacy date-only + ignoreTZ |
| G      | Field14 | ✅         | —              | ✅        | Legacy DateTime             |
| H      | Field13 | ✅         | ✅             | ✅        | Legacy DateTime + ignoreTZ  |

---

## Workarounds and Fix Recommendations

See [bug-2-fix-recommendations.md](bug-2-fix-recommendations.md) for workarounds, proposed code fix, and fix impact assessment.
