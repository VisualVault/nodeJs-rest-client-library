# Form Fields Reference

Runtime behavior, configuration properties, and debugging methods for VisualVault form fields.

---

## Field Type Enum

Known `fieldType` values in `VV.Form.VV.FormPartition.fieldMaster`:

| `fieldType` | Field Kind      | XML `xsi:type`                     | Example                                          |
| ----------- | --------------- | ---------------------------------- | ------------------------------------------------ |
| `3`         | Text / textarea | `FieldTextbox3` / `FieldTextArea3` | `WSAction`, `WSResult`, `Subscription Pack Name` |
| `13`        | Calendar / date | `FieldCalendar3`                   | `Field7`, `Start Date`                           |
| `17`        | Button          | `FormButton`                       | `btnSave`, `btnCallWS`                           |
| —           | Label           | `FieldLabel`                       | `Label5`, `Label22`                              |
| —           | Dropdown        | `FieldDropDownList3`               | `Status`, `Type`                                 |
| —           | Checkbox        | `FieldCheckbox`                    | `Bool`, `Admin Override`                         |
| —           | Cell/Numeric    | `CellField`                        | `Numero`                                         |
| —           | Upload          | `UploadButton`                     | `UploadButton35`                                 |
| —           | Auto-ID Stamp   | `FormIDStamp`                      | `Subscription Pack ID`                           |
| `103`       | Container       | `FieldContainer`                   | `Container1`, `Con_Title`                        |

Runtime `fieldType` numbers for non-DateTest types have not been verified — they were only observed via XML export. The XML `xsi:type` column shows the element type used in template XML exports.

---

## Calendar / Date Field

**`fieldType`:** `13`

### Configuration Properties

Each calendar field has the following boolean config flags. These are readable at runtime from `VV.Form.VV.FormPartition.fieldMaster`.

| Property             | Type         | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enableTime`         | boolean      | If `true`, the field stores and displays a datetime (date + time). If `false`, date only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `ignoreTimezone`     | boolean      | **Affects display only, NOT storage.** `getSaveValue()` produces identical DB values for `ignoreTZ=true` and `false` given the same Date object (empirically verified via DB dump, 2026-04-06). When `true`, the Kendo picker displays the stored time without TZ conversion; when `false`, it converts UTC→local. On the V1 load path, `ignoreTZ=true` causes `initCalendarValueV1` to strip Z before parsing (affects rawValue), while `ignoreTZ=false` preserves Z (triggers UTC interpretation). **No-op for date-only fields** (`enableTime=false`). Only meaningful for DateTime fields (`enableTime=true`).                                                                                                                                                                                                                                                                                                                                                                                 |
| `useLegacy`          | boolean      | If `true`, activates the legacy calendar control. Changes save/read pipeline. The field renders as a **plain HTML text input** (not the Kendo masked DatePicker used by modern configs) — type the full `MM/dd/yyyy` string in one pass; there are no auto-advancing date segments. The popup path stores a full UTC ISO datetime string (e.g., `"2026-03-15T03:00:00.000Z"`) even when `enableTime=false`, unlike the modern path which stores a date-only string (`"2026-03-15"`). See FORM-BUG-2. **Read-back**: `GetFieldValue()` for legacy DateTime fields returns the raw stored value without transformation — no UTC conversion (unlike Config C) and no fake Z (unlike Config D / FORM-BUG-5). See [GetFieldValue return by config](#getfieldvalue-return-by-config).                                                                                                                                                                                                                    |
| `enableInitialValue` | boolean      | If `true`, the field pre-populates with an initial value (current date or preset date) on form load.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `initialValueMode`   | number       | `0` = CurrentDate (uses live `new Date()` at load time); `1` = Preset (uses a configured fixed date). Only relevant when `enableInitialValue=true`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `initialValue`       | string\|null | The preset date value. `null` when using current date or when initial value is disabled.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `mask`               | string\|null | Display/input format mask (e.g., `"MM/dd/yyyy"`). Present in XML exports as `<Mask>`. Controls the Kendo widget's display format — on Kendo v2, a `MM/dd/yyyy` mask on a DateTime field hides time segments entirely. **Claimed to not affect the value processing pipeline** (`normalizeCalValue`, `getSaveValue`, `getCalendarFieldValue`) — those are driven solely by the three boolean flags — but **empirical verification is pending** (Cat 14 in `forms-calendar/matrix.md`). **vv5dev auto-populates** `<Mask>MM/dd/yyyy</Mask>` on all calendar fields during template creation/import, even if the source XML has no `<Mask>` element — clear it in the Form Designer to restore DateTime time segment display. **WADNR exposure**: 54/137 calendar fields have masks; 8 are DateTime + date-only mask (highest risk — time picker hidden, potential value truncation). See `projects/wadnr/analysis/field-inventory.md`.                                                               |
| `placeholder`        | string\|null | Placeholder hint text shown when the field is empty. Present in XML exports as `<Placeholder>`. Purely cosmetic.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `enableQListener`    | boolean      | If `true`, the field listens for URL query string parameters matching its name. On form load, if a query param `?FieldName=value` is present, the value is captured into `this.data.text` and processed through `initCalendarValueV1/V2`. **V1 URL parameter parsing** (enableQListener path): DateTime+ignoreTZ=true strips Z then `new Date(e)`; DateTime+ignoreTZ=false preserves Z via `new Date(e)`; Date-only truncates at T via `substring(0, indexOf('T'))` then `moment(e).toDate()`. **Key behavior**: Date-only fields are immune to FORM-BUG-7 via URL params — the `substring` truncation produces a correct date string even in UTC+ zones. DateTime fields are affected by inline Z-stripping (FORM-BUG-1 scope — see note below). US-format inputs (e.g., `"03/15/2026"`) are stored as-is without ISO normalization. Legacy fields (`useLegacy=true`) store the value correctly but do not render it visually in the input widget. Present in XML exports as `<EnableQListener>`. |

### Kendo UI Version Differences

VV environments run different Kendo UI versions. The calendar field rendering differs significantly:

| Property                   | Kendo v1 (vvdemo)                                                    | Kendo v2 (vv5dev)                                                                                                                                          |
| -------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Input `role`               | `spinbutton`                                                         | `combobox`                                                                                                                                                 |
| Container classes          | `k-widget k-datepicker`                                              | `k-datepicker k-input k-input-md k-rounded-md k-input-solid`                                                                                               |
| DateTime placeholder       | `MM/dd/yyyy hh:mm a`                                                 | `MM/dd/yyyy hh:mm a` (only if `<Mask>` is empty — see below)                                                                                               |
| Calendar header            | `kendo-calendar-header .k-title`                                     | `kendo-calendar-header button.k-calendar-title`                                                                                                            |
| Time tab active            | `button.k-time-tab.k-state-active`                                   | `button[title="Time tab"][aria-pressed="true"]`                                                                                                            |
| Toggle button              | `<span>` with `role="button"` (date-only)                            | `<button>` with `aria-label="Toggle popup"` or `"Toggle calendar"`                                                                                         |
| `VV.Form.formId`           | Populated (template GUID)                                            | `undefined` — use URL `formid` param instead                                                                                                               |
| `kendo` global             | Available (`kendo.version`, `kendo.parseDate()`, `kendo.toString()`) | **Not defined** — Kendo v2 is bundled as a module, not exposed as a global. Access widget API through Angular DI or `$().data('kendoDatePicker')` instead. |
| `VV.Form` properties       | 25 properties                                                        | 28 properties (adds `LocalizationResources`, `LocalizeString`, `CurrentLanguageCode`, `FormLanguage`)                                                      |
| `[name="FieldN"]` selector | Matches calendar input elements                                      | **Does not match** — v2 DOM structure differs. Use VV.Form JS API for value access instead of DOM selectors.                                               |

**Mask auto-population (vv5dev):** When creating a form template on vv5dev (Kendo v2), the platform auto-populates `<Mask>MM/dd/yyyy</Mask>` on all calendar fields — even if the source XML has no `<Mask>` element. This forces DateTime fields to render as date-only (no time segments). **Fix:** Clear the Mask field in the Form Designer for each affected field. Verified 2026-04-09 on build 20260130.1.

**Automation selectors that work on both versions:**

| Element                  | Cross-version selector                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Toggle button            | `[aria-label="Toggle calendar"], [aria-label="Toggle popup"]`                                                            |
| Calendar header text     | `kendo-calendar-header .k-title, kendo-calendar-header button.k-calendar-title`                                          |
| Time tab active          | `button.k-time-tab.k-state-active, button[title="Time tab"][aria-pressed="true"]`                                        |
| Set button               | `button.k-time-accept` (same on both)                                                                                    |
| Virtualization container | `kendo-virtualization` (same on both)                                                                                    |
| Day cells                | `td[role="gridcell"]` (same on both)                                                                                     |
| Day grid                 | `[role="grid"]` (same on both — `<table>` element)                                                                       |
| Day grid tbodies         | `[role="grid"] tbody` (same on both, tbodies have `role="rowgroup"`)                                                     |
| Month list items         | `[role="grid"] li, kendo-calendar-navigation li` (v1: `li` inside grid; v2: `li` in `kendo-calendar-navigation` sibling) |

### Popup Modal Behavior

Two completely different popup widgets exist depending on the field type:

**Date-only (`enableTime=false`, `useLegacy=false`) — `kendo-datepicker`:**

- Scrollable month list sidebar on the left, day grids (one `<tbody>` per month) on the right
- Toggle button: `[aria-label="Toggle calendar"]` (`<span>` on v1, `<button>` on v2)
- Click a day → value is set immediately (no Set button)

**DateTime (`enableTime=true`, `useLegacy=false`) — `kendo-datetimepicker`:**

- Tabbed interface: **Date** tab (active by default) + **Time** tab
- Date tab: infinite-scroll calendar (`kendo-virtualization`) with month headers in `<tbody role="rowgroup">`
- Toggle button: `[aria-label="Toggle popup"]`
- Clicking a day **automatically advances** to the **Time** tab. Default time: `12:00 AM`
- Time tab: three virtualized columns (hour, minute, AM/PM) + NOW/Cancel/Set buttons
- Clicking **Set** commits the selected date and time

**Legacy (`useLegacy=true`) — Kendo calendar with plain input wrapper:**

- The field is a plain `<input>` inside `<div class="d-picker">`. Users can type the date directly.
- A calendar icon (`<span class="k-icon k-i-calendar cal-icon">`) exists next to the input. It does NOT have the Kendo `aria-label="Toggle calendar"` attribute — it's a plain span with the `cal-icon` class. Clicking it opens a **Kendo calendar popup** (same `<kendo-popup>` + `<kendo-calendar>` structure as non-legacy date-only fields). The toggle mechanism differs from non-legacy but the popup DOM is identical. Confirmed via Playwright DOM inspection (2026-04-06).
- For DateTime legacy fields (`enableTime=true`), the popup closes immediately on day click without showing a Time tab — time defaults to midnight.
- The popup stores raw `toISOString()` UTC via `calChangeSetValue()`, bypassing `getSaveValue()` (see FORM-BUG-2). This results in different DB values than typed input — see FORM-BUG-2 DB evidence.

**Common rules:**

- If the modal is partially off-screen, scroll the **page** to bring it into view. Do NOT scroll inside the time picker column area — that changes the selected time value.

### V1 / V2 Code Path

The calendar component has two initialization paths gated by a service-level flag:

```javascript
// Check which path is active (run in DevTools console on any FormViewer page):
VV.Form.calendarValueService.useUpdatedCalendarValueLogic;
// false → V1 (default for standalone forms)
// true  → V2 (active when ?ObjectID= param is present, modelId is set, or server flag is enabled)
```

This flag is service-level (not per-field) — it applies to all calendar fields on the form simultaneously.

**URL parameter effect on V2:**

- `?formid=` (template URL) → V1 (`false`)
- `?DataID=` (saved record URL) → V1 (`false`) — does **not** trigger V2
- `?ObjectID=` (Object View URL) → V2 (`true`)
- Server flag or non-empty `modelId` → V2 (`true`)
- **Manual console activation**: `VV.Form.calendarValueService.useUpdatedCalendarValueLogic = true` — the flag is writable, enabling V2 testing on standalone forms without needing Object View URLs. Confirmed live 2026-04-03.

**V2 init path limitation**: The flag resets to `false` on page reload. Console activation works for post-load operations (e.g., testing `GetFieldValue` under V2 — see TC-8-V2), but cannot test the V2 **init path** (`initCalendarValueV2`) because the flag must be `true` before the form loads. Testing the init path requires either a valid Object View context (`?ObjectID=` with a real object) or the server-side flag enabled on the account.

**parseDateString is V2-only.** The `CalendarValueService.parseDateString()` function (line ~104126 in main.js) is only called under V2:

- `normalizeCalValue()` (line 102798) — gated by `useUpdatedCalendarValueLogic`
- `initCalendarValueV2()` (lines 102935, 102939, 102948) — V2 init path
- `formatDateStringForDisplay()` → `formatCalendarCell()` (line 164029) — also V2-gated

Under V1, equivalent Z-handling happens through inline code in `initCalendarValueV1()` — not through parseDateString. Verified by Playwright monkey-patch audit: zero parseDateString calls during V1 typed input, SetFieldValue, and popup operations (2026-04-06).

---

## VV.Form Console API

Available in DevTools console on any loaded FormViewer page. Useful for inspecting and manipulating field state during testing or debugging.

### Field discovery

```javascript
// All field definitions (keyed by name)
VV.Form.VV.FormPartition.fieldMaster;

// Find calendar fields by configuration
Object.values(VV.Form.VV.FormPartition.fieldMaster)
    .filter((f) => f.fieldType === 13 && f.enableTime === true && f.ignoreTimezone === true && f.useLegacy === false)
    .map((f) => ({ name: f.name, enableInitialValue: f.enableInitialValue }));
```

### Locating calendar field elements in the DOM

Non-legacy calendar fields are rendered by Kendo and use **Kendo-internal GUIDs** as their `name` attribute (e.g., `k-c8505310-993b-4929-...`). They do **not** use the VV field name (`Field11`) or the VV field GUID from `fieldMaster`. The `aria-label` attribute is on the **Kendo wrapper** element (`<kendo-datepicker aria-label="Field7">` or `<kendo-datetimepicker aria-label="Field6">`), with the actual `<input>` nested inside.

**Legacy fields** (`useLegacy=true`) have a completely different DOM structure: the `aria-label` is directly on a plain `<input>` element inside `<div class="d-picker">`. There is no Kendo wrapper. `document.querySelector('[aria-label="Field13"]')` returns the `<input>` itself, not a container — using `.querySelector('input')` on it would fail.

To locate the correct `fd-cal-container` for a known field name:

```javascript
// Sort all calendar fields by layout position, then match index to DOM order
const calFields = Object.values(VV.Form.VV.FormPartition.fieldMaster)
    .filter((f) => f.fieldType === 13)
    .sort((a, b) => a.layoutTop - b.layoutTop || a.layoutLeft - b.layoutLeft);

const idx = calFields.findIndex((f) => f.name === 'Field11');
const containers = document.querySelectorAll('.fd-cal-container');
const icon = containers[idx]?.querySelector('.k-icon.k-i-calendar');
icon?.click(); // opens the calendar popup for Field11
```

The `fd-cal-container` NodeList order matches the `layoutTop`/`layoutLeft` sort order of fields in `fieldMaster`. Confirmed on the DateTest form (26 calendar fields, 2026-03-31).

### Reading field values

```javascript
// Raw stored value — what is physically in the form partition (no transformation)
VV.Form.VV.FormPartition.getValueObjectValue('FieldName');

// Processed API return — applies output transformation logic (may add fake-Z, etc.)
VV.Form.GetFieldValue('FieldName');
```

### Writing field values

```javascript
// Set a field value — goes through normalizeCalValue() → calChange() → getSaveValue()
VV.Form.SetFieldValue('FieldName', '2026-03-15');
VV.Form.SetFieldValue('FieldName', '2026-03-15T00:00:00.000Z');
```

### Reading as Date object

```javascript
// Returns a real JS Date object (not a string) — bypasses getCalendarFieldValue() transformation
VV.Form.GetDateObjectFromCalendar('FieldName');

// .toISOString() produces real UTC (not the fake-Z string from GetFieldValue)
VV.Form.GetDateObjectFromCalendar('FieldName').toISOString();
// → "2026-03-15T03:00:00.000Z" in BRT (real UTC = local midnight + 3h)
// vs GetFieldValue → "2026-03-15T00:00:00.000Z" (fake Z — local time mislabeled as UTC)

// Safe round-trip for DateTime fields (zero drift, even for Config D which drifts -3h/trip via GFV):
VV.Form.SetFieldValue('FieldName', VV.Form.GetDateObjectFromCalendar('FieldName').toISOString());
// Confirmed: D-BRT 0 drift (TC-9-GDOC-D-BRT-1), D-IST 0 drift (TC-9-GDOC-D-IST-1), C-BRT 0 drift (TC-9-GDOC-C-BRT-1)
// WARNING: UNSAFE for date-only fields in UTC+ timezones! GDOC.toISOString() returns the UTC date
// (e.g., "2026-03-14T18:30:00.000Z" for Mar 15 IST midnight), and SFV re-parses through
// normalizeCalValue which triggers FORM-BUG-7 on the UTC date portion — double shift.
// TC-9-GDOC-A-IST-1: Mar 15 → stored "2026-03-14" (Bug #7 on SFV) → GDOC ISO "2026-03-13T18:30Z"
// → SFV stores "2026-03-12" (-3 days total). BRT is immune (UTC- midnight = same UTC day).

// Empty field handling — returns undefined (not null, not "Invalid Date"):
var d = VV.Form.GetDateObjectFromCalendar('FieldName');
// d === undefined (falsy) — safe for: if (!d) { /* field is empty */ }
// Contrasts GetFieldValue() which returns "Invalid Date" (truthy!) for empty Config D fields (FORM-BUG-6)
```

### GetFieldValue return by config

`GetFieldValue()` applies an output transformation via `getCalendarFieldValue()`. The transformation depends on the field's config flags:

| Flags                                                              | GFV Return                                        | Example (stored `"2026-03-15T00:00:00"` in BRT) |
| ------------------------------------------------------------------ | ------------------------------------------------- | ----------------------------------------------- |
| `enableTime=false` (any config — A/B/E/F)                          | Raw date string, no transformation                | `"2026-03-15"`                                  |
| `enableTime=true`, `ignoreTZ=false`, `useLegacy=false` (Config C)  | Converts local→UTC, appends real Z                | `"2026-03-15T03:00:00.000Z"`                    |
| `enableTime=true`, `ignoreTZ=true`, `useLegacy=false` (Config D)   | Appends fake Z to local time (**FORM-BUG-5**)     | `"2026-03-15T00:00:00.000Z"`                    |
| `enableTime=true`, `ignoreTZ=false`, `useLegacy=true` (Config G)   | Raw value returned, no conversion                 | `"2026-03-15T00:00:00"`                         |
| `enableTime=true`, `ignoreTZ=true`, `useLegacy=true` (Config H)    | Raw value returned, no fake Z                     | `"2026-03-15T00:00:00"`                         |
| **V2 code path** (`useUpdatedCalendarValueLogic=true`, any config) | Raw value returned — all transformations bypassed | `"2026-03-15T00:00:00"` (same as raw partition) |

**Key implication**: `useLegacy=true` skips the entire `getCalendarFieldValue()` transformation — no UTC conversion, no fake Z. This makes legacy DateTime configs immune to FORM-BUG-5 round-trip drift, but also means GFV doesn't produce real UTC strings (unlike Config C). Developers must handle timezone conversion themselves for legacy DateTime fields.

**V2 code path** (confirmed live 2026-04-03): Under V2, `GetFieldValue()` returns the raw partition value for ALL configs — no UTC conversion (Config C loses its real-UTC output), no fake Z (Config D's FORM-BUG-5 is resolved). V2 GFV is functionally equivalent to `getValueObjectValue()`. Tested in IST where Config C V1 returns `"2026-03-14T18:30:00.000Z"` (real UTC) but V2 returns `"2026-03-15T00:00:00"` (raw).

### Environment checks

```javascript
// Verify active browser timezone (check GMT offset in result)
new Date().toString();

// Compute UTC equivalent of local midnight for a given date
new Date(2026, 2, 15, 0, 0, 0).toISOString();
// → "2026-03-15T03:00:00.000Z" in BRT (UTC-3)
// → "2026-03-14T18:30:00.000Z" in IST (UTC+5:30)
// → "2026-03-15T00:00:00.000Z" in UTC
```

---

## Known Bugs (Calendar Field)

Documented in detail in `tasks/date-handling/forms-calendar/analysis/overview.md`. Summary:

| Bug ID     | Name                                                            | Config                                                                 | Severity                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | --------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FORM-BUG-1 | Timezone marker stripping in parseDateString() / inline Z-strip | All DateTime configs, **V1 + V2**                                      | Medium–High — `parseDateString()` (V2) unconditionally strips the `"Z"` UTC suffix before parsing. **V1 also strips Z** for DateTime+ignoreTZ=true fields via inline `e.replace('Z','')` at lines 102889/102893 — confirmed live via Cat 4 URL parameter tests (2026-04-08) on all DateTime configs (C, D, G, H) in both BRT and IST. Shift = TZ offset (BRT: -3h, IST: +5.5h). **V1 save/reload is self-consistent** because `getSaveValue()` strips Z on save and reload parses Z-less string as local. But **URL parameter input and FillinAndRelate chains are NOT self-consistent** — a Z-suffixed value arriving via URL param loses its UTC semantics. **`.000` residue compounding**: FORM-BUG-5's fake `.000Z` suffix leaves `.000` after Z-strip; `new Date("...T00:00:00.000")` is parsed as **UTC** by V8 (unlike `"...T00:00:00"` which is local), causing FORM-BUG-5+BUG-1 to compound rather than cancel in FillinAndRelate D→D chains. V2 `ignoreTZ=false` recovery branch works for DateTime but **backfires for date-only fields at UTC- timezones**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| FORM-BUG-2 | Inconsistent popup vs typed handlers for legacy fields          | `useLegacy=true`, any TZ                                               | Medium — same field, same date: popup stores full UTC datetime (`"2026-03-15T03:00:00.000Z"`), typed input stores date-only string (`"2026-03-15"`); format diverges in `calChangeSetValue()` vs `calChange()`. **Typed input is correct** — stores the expected format for all 8 configs across BRT + IST (confirmed Cat 2: 8 PASS in BRT, 8 configs including legacy). Popup is the buggy path for legacy fields.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| FORM-BUG-5 | Fake-Z in GetFieldValue                                         | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`            | High — causes date drift on every `SetFieldValue(GetFieldValue())` round-trip. **Drift = -(timezone offset) per trip**: BRT -3h/trip, IST +5:30h/trip, PDT -7h/trip (DST active), JST +9h/trip, UTC+0 0/trip (masked — fake Z coincidentally correct). **Full day loss**: BRT 8 trips, PDT ~3.4 trips, IST ~4.4 trips, JST ~2.7 trips. **Boundary severity is TZ-sign-dependent**: UTC- users (BRT, PST) cross year/month boundaries backward (Jan 1→Dec 31 2025, Feb 29→Feb 28); UTC+ users (IST, JST) drift forward preserving boundaries but cross midnight sooner. **DST note**: America/Los_Angeles is PDT (UTC-7) during March, not PST (UTC-8) — drift is -7h, not -8h. **DST spring-forward anomaly** (confirmed TC-12-dst-US-PST): on DST transition day (Mar 8 2026), V8 advances non-existent 2AM→3AM PDT. The fake Z `"T03:00:00.000Z"` maps to UTC 03:00 which falls in the pre-DST window (before 10:00 UTC when DST starts at 2AM PST) → resolves to PST Mar 7 19:00 (UTC-8). Round-trip crosses both day boundary (Mar 8→7) and DST boundary (PDT→PST), producing -8h drift instead of the expected -7h. **Multi-user compound drift** (confirmed TC-11-roundtrip-cross, TC-11-D-concurrent-IST-edit): drift accumulates across users in different TZs. User A (IST) round-trips +5:30h → User B (BRT) round-trips -3h → net +2:30h from original midnight. Each user independently applies their TZ offset via the fake Z mechanism. Production scenario: IST helpdesk sets date → BRT admin reviews = silent +2:30h corruption. Workaround: use `SetFieldValue(field, GetDateObjectFromCalendar(field).toISOString())` instead (zero drift, confirmed TC-9-GDOC-D-BRT-1). `useLegacy=true` is immune — confirmed in BRT same-TZ (TC-8-H-BRT, TC-9-H-BRT-1), BRT multi-trip (TC-11-H-BRT-roundtrip: 3 trips, 0 drift), BRT→BRT reload (TC-3-H-BRT-BRT), and IST cross-TZ reload (TC-3-H-BRT-IST). **V2 code path is also immune** — V2 GFV returns raw value, no fake Z (confirmed TC-8-V2). |
| FORM-BUG-6 | GetFieldValue fails for empty DateTime fields                   | `enableTime=true`, `useLegacy=false` (ALL non-legacy DateTime configs) | High — **scope expanded (2026-04-01):** affects Config C AND Config D, not just D. Config D (`ignoreTimezone=true`): returns truthy string `"Invalid Date"`. Config C (`ignoreTimezone=false`): **THROWS `RangeError: Invalid time value`** — crashes scripts without try/catch. Root cause: no empty-value guard in `getCalendarFieldValue()`. `null` input via SFV triggers the same behavior as `""` (TC-12-null-input confirmed). Config A (`enableTime=false`) returns `""` correctly (TC-12-empty-Config-A confirmed). `useLegacy=true` confirmed safe (TC-8-H-empty: returns `""`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| FORM-BUG-7 | Wrong day stored for UTC+ timezones                             | Date-only fields, all configs (`enableTime=false`)                     | High — UTC+ users store previous day on every SetFieldValue call; **cumulative in round-trips**: each GFV→SFV cycle loses another day (TC-9-B-IST: "2026-03-15"→"2026-03-14"→"2026-03-13" after 1 trip). Field display shows the user-typed date, masking the shift until form reload. `ignoreTimezone=true` does NOT prevent it — Config B (ignoreTZ) behaves identically to Config A (TC-3-B-IST-BRT confirmed). **Scope (2026-04-01):** ALSO fires on preset form-init path via `initCalendarValueV1` → `moment(e).toDate()` (TC-5-A-IST confirmed — preset shows correct display but internal UTC date is wrong day). **DateTime preset fields bypass this** — they store `new Date(initialDate)` directly without going through `parseDateString` truncation (TC-5-C-BRT/IST confirmed — identical UTC values across all TZs). `useLegacy=true` does NOT protect date-only presets (TC-5-E-IST/5-F-IST confirmed). Same-TZ reload IS safe (TC-3-A-BRT-BRT, TC-3-G-BRT-BRT confirmed). Current Date default (`new Date()` path) is the only fully correct initialization — skips `moment` parsing entirely (TC-6-A-IST confirmed, Cat 6 15/15 13P/2F fully complete).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

| WEBSERVICE-BUG-2/3/5 | Silent data loss for DD/MM/YYYY and epoch formats (API) | All configs — server-side | High — the VV REST API silently accepts records with unparseable date formats (DD/MM/YYYY, epoch ms, compact ISO) and stores `null` instead of the value. No error in the response. Also: ambiguous dates like `"05/03/2026"` are always interpreted as MM/DD (May 3), not DD/MM (March 5). Affects CSV imports from LATAM and European systems using day-first formats. See [api-date-patterns.md](api-date-patterns.md) for accepted formats and workarounds. |

### Calendar Field Mixed Timezone Storage

Confirmed via direct SQL query on `DateTest-000004` (saved from BRT, UTC-3). Fields with `enableInitialValue=true` store **UTC**; user-input fields store **local time** with no timezone marker.

| Field type                                 | Config                                          | DB storage                       | Example                                                                              |
| ------------------------------------------ | ----------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| Initial value — CurrentDate                | `enableInitialValue=true`, `initialValueMode=0` | UTC timestamp                    | `3/27/2026 8:02:51 PM` = time of save expressed as UTC                               |
| Initial value — Preset (date-only)         | `enableInitialValue=true`, `initialValueMode=1` | UTC equivalent of local midnight | `3/1/2026 3:00:00 AM` = BRT midnight March 1 in UTC                                  |
| Initial value — Preset (DateTime)          | `enableInitialValue=true`, `initialValueMode=1` | Raw `initialDate` timestamp      | `3/1/2026 11:28:54 AM` = exact UTC time from field config (bypasses parseDateString) |
| User input — any config (C, D, A w/o init) | `enableInitialValue=false`                      | Local time, no offset            | `3/15/2026 12:00:00 AM` = BRT midnight March 15, stored as-is                        |

The database stores no timezone context — there is no suffix distinguishing a UTC value from a local value. A SQL query or report filtering `WHERE Field5 = '3/15/2026 12:00:00 AM'` from a UTC+ machine would match, but the meaning of that timestamp differs per field type. Reports or scheduled scripts that join or compare dates across field types will silently produce incorrect results.

**Cross-TZ query inconsistency (confirmed 2026-04-08):** Even within the same field type, records saved from different timezones produce different stored values for the same logical date. A BRT user saving March 15 stores `"2026-03-15T00:00:00"` in Config A, but an IST user saving March 15 stores `"2026-03-14T00:00:00"` (FORM-BUG-7). A query `[Field7] eq '2026-03-15'` finds the BRT record but silently misses the IST record. The query engine is correct — the stored data is wrong.

**Bug #5 drift persists to DB (confirmed 2026-04-08):** Round-trip drift from FORM-BUG-5 is not a transient client-side issue — it saves to the database via the normal save pipeline. After 1 BRT round-trip, the API returns `"2026-03-14T21:00:00Z"` (-3h). After 8 round-trips, `"2026-03-14T00:00:00Z"` (-24h, full calendar day lost). Any script that reads and writes back a Config D date value permanently corrupts it.

**API write path is immune (confirmed 2026-04-08):** The REST API `postForms` endpoint stores dates uniformly for all configs — no Config C/D divergence, no FORM-BUG-7, no mixed timezone storage. The mixed storage problem is exclusively a Forms Angular `getSaveValue()` pipeline issue. See [API Write Path](../architecture/visualvault-platform.md#api-write-path-stores-dates-uniformly).

**V1 DateTime save/reload self-consistency (confirmed 2026-04-06):** Despite the inline Z-stripping in V1, DateTime field save/reload is self-consistent **when the UTC offset hasn't changed between save and load**. `getSaveValue()` formats DateTime values as local time without Z (`"YYYY-MM-DDTHH:mm:ss"`). On reload, `initCalendarValueV1()` parses this Z-less string as local time via `new Date()`, which reconstructs the original value. Verified: BRT-saved Config D loaded correctly in BRT, IST, and UTC0.

**Important**: This self-consistency is narrower than "same timezone." DST transitions change the UTC offset within the same named timezone (e.g., EST UTC-5 → EDT UTC-4), so a value saved in winter and loaded in summer shifts by 1 hour even for the same user in the same city. Business travel across timezones and multi-timezone US states (Indiana, Texas, Florida, Tennessee) also break the assumption. Date-only fields do NOT have this property — they are affected by FORM-BUG-7 at the save step, and the incorrect value is then preserved consistently across TZ reloads.

**Cross-TZ form load preserves raw values for ALL configs (confirmed 2026-04-08, all 8 configs verified 2026-04-09):** The server returns stored strings as-is regardless of the loading browser's timezone. Verified for all 8 configs (A–H) across BRT→IST:

- **Date-only (A, B, E, F):** Raw string (e.g., `"2026-03-15"`) survives BRT→IST, IST→BRT unchanged. `GetFieldValue()` also returns the preserved value.
- **DateTime (C, G, H):** Raw string (e.g., `"2026-03-15T00:00:00"`) survives cross-TZ load. Config C's `GetFieldValue()` re-interprets the timezone-ambiguous value in the loading TZ's context (structural limitation of storing local time without offset), but the raw is intact. Legacy configs G and H return raw from `GetFieldValue()` — `useLegacy=true` short-circuits before any transformation.
- **DateTime Config D:** Raw string preserved, but **`GetFieldValue()` appends FORM-BUG-5 fake Z** (`"2026-03-15T00:00:00.000Z"`) on cross-TZ load. Config D is the only config where cross-TZ load exposes a deceptive GFV. Config H (same flags + `useLegacy=true`) returns raw without fake Z — confirming `useLegacy=true` immunity holds across timezone boundaries.
- **Key correction:** FORM-BUG-7 fires at **input/save time** (SFV, typed input, preset init), NOT at form load. The `initCalendarValueV1` load path preserves stored strings — it does not re-parse date-only values through `moment().toDate()` on reload. This was confirmed across 16 cross-TZ reload tests (Cat 11) and is consistent with Cat 3 results.

### Cross-Environment Bug Behavior (vvdemo vs vv5dev)

All 16 known bugs exist on both VV environments but **manifest differently** due to VV version/Kendo version differences. First cross-environment regression: 2026-04-09 (252 tests, 4 TZ × chromium, vv5dev build 20260130.1). Second regression: 2026-04-10 (116 BRT-chromium tests, WADNR test harness — **116/116 PASS, identical to EmanuelJofre**). Cross-environment differential investigation (Cat 14–16) in progress — see `tasks/date-handling/forms-calendar/matrix.md`.

| Bug                             | vvdemo behavior                                             | vv5dev difference                                                                                                         | Tests affected |
| ------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **FORM-BUG-5** (fake Z)         | GetFieldValue appends bare `Z` → raw stored as `T00:00:00`  | GetFieldValue appends `.000Z` → raw stored as `T00:00:00.000Z`                                                            | 24             |
| **FORM-BUG-5** (drift rate)     | Progressive drift at -(TZ offset)/trip                      | **Amplified**: 10 IST round-trips = +55h shift (BRT 10 trips = -30h)                                                      | 6              |
| **FORM-BUG-7** (wrong day UTC+) | Affects IST date-only in Cat 5 preset + Cat 7 SFV(Date obj) | **Expanded scope** — also affects Cat 2 typed, Cat 3 reload, Cat 9 round-trip, Cat 11 cross-TZ for Configs A/B/E/F in IST | 14             |
| **FORM-BUG-6** (empty field)    | Config D empty → `"Invalid Date"`, Config C → RangeError    | Config D IST empty → `"Invalid Date"` where vvdemo returns `""` (TZ-dependent manifestation)                              | 5              |
| **FORM-BUG-4** (save format)    | Config C stores `T00:00:00` (local midnight, no offset)     | Config C BRT stores `T03:00:00.000Z` (UTC conversion applied + Z suffix)                                                  | 3              |
| **Preset init** (Cat 5/6)       | Date-only preset stores date string (`"2026-03-01"`)        | IST date-only preset stores full UTC datetime (`"2026-02-28T18:30:00.000Z"`) — offset conversion + Z suffix               | 6              |

~~FORM-BUG-8 (withdrawn 2026-04-10)~~: Previously reported as `getCalendarFieldValue()` RangeError on Config C via URL params. **Root cause was `enableQListener=false`** on the vv5dev TargetDateTest form — not a platform bug. After enabling enableQListener (template v1.2), all Config C URL param tests pass on both BRT and IST. The RangeError was caused by the field not receiving any value from the URL param, producing an invalid Date object downstream.

**Summary**: 108 of 252 tests behave identically on both environments. The 144 differences break down as: 84 value shifts (bugs manifest differently), ~~19 infrastructure timeouts (Kendo v2 popup detection — test helper issue, not platform)~~ **Fixed 2026-04-10**: month list selector in `selectDateInDatePicker()` updated to include `kendo-calendar-navigation li` (v2 moved `<li>` items outside `[role="grid"]`), ~~32 Cat 4 URL param failures (under investigation)~~ **Fixed 2026-04-10**: all 32 were caused by `enableQListener=false` on the vv5dev TargetDateTest form (template updated to v1.2 with `EnableQListener=true` on all fields — 27/27 BRT+IST tests now pass), 9 other.

### JavaScript `.000` Millisecond Parsing Behavior

Chrome/V8 treats ISO datetime strings differently based on whether milliseconds are present:

```javascript
new Date('2026-03-15T00:00:00'); // → local midnight (no ms → local parse)
new Date('2026-03-15T00:00:00.000'); // → UTC midnight  (.000 → UTC parse)
new Date('2026-03-15T00:00:00.000Z'); // → UTC midnight  (Z → UTC parse)
```

This matters because FORM-BUG-5's fake Z adds `.000Z` to local times. When FORM-BUG-1 strips the `Z`, the `.000` residue remains — and `new Date()` interprets the stripped string as UTC instead of local. This means the two bugs **compound** in chains (e.g., FillinAndRelate D→D transfers) rather than canceling:

| Input to `new Date()`        | Parse mode | BRT result           | IST result           |
| ---------------------------- | ---------- | -------------------- | -------------------- |
| `"2026-03-15T00:00:00"`      | Local      | Mar 15 00:00 local ✓ | Mar 15 00:00 local ✓ |
| `"2026-03-15T00:00:00.000"`  | UTC        | Mar 14 21:00 BRT ✗   | Mar 15 05:30 IST ✗   |
| `"2026-03-15T00:00:00.000Z"` | UTC        | Mar 14 21:00 BRT     | Mar 15 05:30 IST     |

Confirmed via Playwright Cat 4 FillinAndRelate tests (2026-04-08): D→D same-config chains shift midnight by the TZ offset due to this residue.

### FillinAndRelate URL Parameter Chain

The `FillinAndRelateForm` global function (template script) passes date values between forms via URL query parameters. The chain is:

```
Source form: GetFieldValue('field')
    → may add fake Z (FORM-BUG-5 on Config D)
    → URL-encode: &TargetField=<value>
    → Target form: enableQListener parses URL param
    → initCalendarValueV1: may strip Z (FORM-BUG-1 on DateTime)
    → getSaveValue: stores final value
```

**Cross-config transfer behavior** (confirmed 2026-04-08):

| Source → Target | Same TZ | Bug interaction                                               | Result                                   |
| --------------- | ------- | ------------------------------------------------------------- | ---------------------------------------- |
| D → D           | BRT/IST | BUG-5 + BUG-1 compound (`.000` residue)                       | Time shifts by TZ offset                 |
| D → C           | BRT/IST | BUG-5 fake Z treated as real UTC by Config C                  | Wrong moment stored; API "looks correct" |
| C → D           | BRT     | BUG-1 strips real Z, `.000` causes UTC parse → local recovery | Accidentally correct                     |
| A → A           | BRT     | No bugs                                                       | Value preserved                          |
| A → A           | IST     | BUG-7 at source only                                          | Wrong day propagated, target faithful    |
| C → A           | IST     | UTC date portion is previous day                              | Date truncation loses correct date       |
