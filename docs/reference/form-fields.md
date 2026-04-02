# Form Fields Reference

Runtime behavior, configuration properties, and debugging methods for VisualVault form fields.

---

## Field Type Enum

Known `fieldType` values in `VV.Form.VV.FormPartition.fieldMaster`:

| `fieldType` | Field Kind      | Example                    |
| ----------- | --------------- | -------------------------- |
| `3`         | Text / textarea | `WSAction`, `WSResult`     |
| `13`        | Calendar / date | `DataField7`, `DataField5` |
| `17`        | Button          | `btnSave`, `btnCallWS`     |
| `103`       | Container       | `Container1`               |

This list is partial — only types observed on the DateTest form are included.

---

## Calendar / Date Field

**`fieldType`:** `13`

### Configuration Properties

Each calendar field has the following boolean config flags. These are readable at runtime from `VV.Form.VV.FormPartition.fieldMaster`.

| Property             | Type         | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `enableTime`         | boolean      | If `true`, the field stores and displays a datetime (date + time). If `false`, date only.                                                                                                                                                                                                                                                                                                                                                                                                        |
| `ignoreTimezone`     | boolean      | If `true`, VV does not apply timezone conversion when storing/retrieving the value. **No-op for date-only fields** (`enableTime=false`) — storage behavior is identical to `ignoreTimezone=false` for those configs, on both the modern path (`useLegacy=false`) and the legacy popup path (`useLegacy=true`). Live-confirmed: Config E and Config F produce identical stored values on the legacy popup (2026-03-31). Only affects the DateTime code path (`enableTime=true`).                  |
| `useLegacy`          | boolean      | If `true`, activates the legacy calendar control. Changes save/read pipeline. The field renders as a **plain HTML text input** (not the Kendo masked DatePicker used by modern configs) — type the full `MM/dd/yyyy` string in one pass; there are no auto-advancing date segments. The popup path stores a full UTC ISO datetime string (e.g., `"2026-03-15T03:00:00.000Z"`) even when `enableTime=false`, unlike the modern path which stores a date-only string (`"2026-03-15"`). See Bug #2. |
| `enableInitialValue` | boolean      | If `true`, the field pre-populates with an initial value (current date or preset date) on form load.                                                                                                                                                                                                                                                                                                                                                                                             |
| `initialValueMode`   | number       | `0` = CurrentDate (uses live `new Date()` at load time); `1` = Preset (uses a configured fixed date). Only relevant when `enableInitialValue=true`.                                                                                                                                                                                                                                                                                                                                              |
| `initialValue`       | string\|null | The preset date value. `null` when using current date or when initial value is disabled.                                                                                                                                                                                                                                                                                                                                                                                                         |

### Popup Modal Behavior

Two completely different popup widgets exist depending on the field type:

**Date-only (`enableTime=false`, `useLegacy=false`) — `kendo-datepicker`:**

- Scrollable month list sidebar on the left, day grids (one `<tbody>` per month) on the right
- Toggle button: `<span role="button" aria-label="Toggle calendar">` inside the kendo wrapper
- Click a day → value is set immediately (no Set button)

**DateTime (`enableTime=true`, `useLegacy=false`) — `kendo-datetimepicker`:**

- Tabbed interface: **Date** tab (active by default) + **Time** tab
- Date tab: infinite-scroll calendar (`kendo-virtualization`) with month headers in `<tbody role="rowgroup">`
- Toggle button: `<span aria-label="Toggle popup">` — **no `role="button"` attribute** (unlike date-only)
- Clicking a day **automatically advances** to the **Time** tab. Default time: `12:00 AM`
- Time tab: three virtualized columns (hour, minute, AM/PM) + NOW/Cancel/Set buttons
- Clicking **Set** commits the selected date and time

**Legacy (`useLegacy=true`) — Angular UI Bootstrap datepicker:**

- The field is a plain `<input>` inside `<div class="d-picker">`. Users can type the date directly.
- A calendar icon button exists next to the input, but it does NOT have the Kendo `aria-label="Toggle calendar"` or `aria-label="Toggle popup"` attributes. The icon opens an Angular UI Bootstrap popup (`uib-datepicker-popup`), which has completely different DOM from the Kendo popup (no `[role="grid"]` month list, different navigation).
- The popup (if triggered via icon) stores raw `toISOString()` UTC (see Bug #2).

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

Non-legacy calendar fields are rendered by Kendo and use **Kendo-internal GUIDs** as their `name` attribute (e.g., `k-c8505310-993b-4929-...`). They do **not** use the VV field name (`DataField11`) or the VV field GUID from `fieldMaster`. The `aria-label` attribute is on the **Kendo wrapper** element (`<kendo-datepicker aria-label="DataField7">` or `<kendo-datetimepicker aria-label="DataField6">`), with the actual `<input>` nested inside.

**Legacy fields** (`useLegacy=true`) have a completely different DOM structure: the `aria-label` is directly on a plain `<input>` element inside `<div class="d-picker">`. There is no Kendo wrapper. `document.querySelector('[aria-label="DataField13"]')` returns the `<input>` itself, not a container — using `.querySelector('input')` on it would fail.

To locate the correct `fd-cal-container` for a known field name:

```javascript
// Sort all calendar fields by layout position, then match index to DOM order
const calFields = Object.values(VV.Form.VV.FormPartition.fieldMaster)
    .filter((f) => f.fieldType === 13)
    .sort((a, b) => a.layoutTop - b.layoutTop || a.layoutLeft - b.layoutLeft);

const idx = calFields.findIndex((f) => f.name === 'DataField11');
const containers = document.querySelectorAll('.fd-cal-container');
const icon = containers[idx]?.querySelector('.k-icon.k-i-calendar');
icon?.click(); // opens the calendar popup for DataField11
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

// Safe round-trip (zero drift, even for Config D which drifts -3h/trip via GFV):
VV.Form.SetFieldValue('FieldName', VV.Form.GetDateObjectFromCalendar('FieldName').toISOString());
```

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

Documented in detail in `tasks/date-handling/forms-calendar/analysis.md`. Summary:

| Bug # | Name                                                   | Config                                                                 | Severity                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----- | ------------------------------------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #2    | Inconsistent popup vs typed handlers for legacy fields | `useLegacy=true`, any TZ                                               | Medium — same field, same date: popup stores full UTC datetime (`"2026-03-15T03:00:00.000Z"`), typed input stores date-only string (`"2026-03-15"`); format diverges in `calChangeSetValue()` vs `calChange()`. **Typed input is correct** — stores the expected format for all 8 configs across BRT + IST (confirmed Cat 2: 8 PASS in BRT, 8 configs including legacy). Popup is the buggy path for legacy fields.                                                                                                                                                                                                                                                                                                                                                                          |
| #5    | Fake-Z in GetFieldValue                                | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`            | High — causes date drift on every `SetFieldValue(GetFieldValue())` round-trip. **Drift = -(timezone offset) per trip**: BRT -3h/trip, IST +5:30h/trip, UTC+0 0/trip (masked — fake Z coincidentally correct). **Boundary severity is TZ-sign-dependent**: UTC- users (BRT) cross year/month boundaries backward (Jan 1→Dec 31 2025, Feb 29→Feb 28); UTC+ users (IST) drift forward preserving boundaries but cross midnight sooner (any value after 18:30 IST crosses day in 1 trip). Workaround: use `SetFieldValue(field, GetDateObjectFromCalendar(field).toISOString())` instead (zero drift, confirmed TC-9-GDOC-D-BRT-1). `useLegacy=true` is immune — confirmed in BRT same-TZ (TC-8-H-BRT, TC-9-H-BRT-1), BRT→BRT reload (TC-3-H-BRT-BRT), and IST cross-TZ reload (TC-3-H-BRT-IST). |
| #6    | GetFieldValue fails for empty DateTime fields          | `enableTime=true`, `useLegacy=false` (ALL non-legacy DateTime configs) | High — **scope expanded (2026-04-01):** affects Config C AND Config D, not just D. Config D (`ignoreTimezone=true`): returns truthy string `"Invalid Date"`. Config C (`ignoreTimezone=false`): **THROWS `RangeError: Invalid time value`** — crashes scripts without try/catch. Root cause: no empty-value guard in `getCalendarFieldValue()`. Config A (`enableTime=false`) returns `""` correctly. `useLegacy=true` predicted safe (untested).                                                                                                                                                                                                                                                                                                                                            |
| #7    | Wrong day stored for UTC+ timezones                    | Date-only fields, all configs (`enableTime=false`)                     | High — UTC+ users store previous day on every SetFieldValue call; field display shows the user-typed date, masking the shift until form reload. `ignoreTimezone=true` does NOT prevent it — Config B (ignoreTZ) behaves identically to Config A (TC-3-B-IST-BRT confirmed). **Scope (2026-04-01):** ALSO fires on preset form-init path via `initCalendarValueV1` → `moment(e).toDate()` (TC-5-A-IST confirmed — preset shows correct display but internal UTC date is wrong day). Same-TZ reload IS safe (TC-3-A-BRT-BRT, TC-3-G-BRT-BRT confirmed). Current Date default (`new Date()` path) is the only correct initialization — skips `moment` parsing entirely (TC-6-A-IST confirmed).                                                                                                  |

| #8 | Silent data loss for DD/MM/YYYY and epoch formats (API) | All configs — server-side | High — the VV REST API silently accepts records with unparseable date formats (DD/MM/YYYY, epoch ms, compact ISO) and stores `null` instead of the value. No error in the response. Also: ambiguous dates like `"05/03/2026"` are always interpreted as MM/DD (May 3), not DD/MM (March 5). Affects CSV imports from LATAM and European systems using day-first formats. See [api-date-patterns.md](api-date-patterns.md) for accepted formats and workarounds. |

### Calendar Field Mixed Timezone Storage

Confirmed via direct SQL query on `DateTest-000004` (saved from BRT, UTC-3). Fields with `enableInitialValue=true` store **UTC**; user-input fields store **local time** with no timezone marker.

| Field type                                 | Config                                          | DB storage                       | Example                                                       |
| ------------------------------------------ | ----------------------------------------------- | -------------------------------- | ------------------------------------------------------------- |
| Initial value — CurrentDate                | `enableInitialValue=true`, `initialValueMode=0` | UTC timestamp                    | `3/27/2026 8:02:51 PM` = time of save expressed as UTC        |
| Initial value — Preset                     | `enableInitialValue=true`, `initialValueMode=1` | UTC equivalent of local midnight | `3/1/2026 3:00:00 AM` = BRT midnight March 1 in UTC           |
| User input — any config (C, D, A w/o init) | `enableInitialValue=false`                      | Local time, no offset            | `3/15/2026 12:00:00 AM` = BRT midnight March 15, stored as-is |

The database stores no timezone context — there is no suffix distinguishing a UTC value from a local value. A SQL query or report filtering `WHERE DataField5 = '3/15/2026 12:00:00 AM'` from a UTC+ machine would match, but the meaning of that timestamp differs per field type. Reports or scheduled scripts that join or compare dates across field types will silently produce incorrect results.
