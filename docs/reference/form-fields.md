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

| Property             | Type         | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enableTime`         | boolean      | If `true`, the field stores and displays a datetime (date + time). If `false`, date only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `ignoreTimezone`     | boolean      | **Affects display only, NOT storage.** `getSaveValue()` produces identical DB values for `ignoreTZ=true` and `false` given the same Date object (empirically verified via DB dump, 2026-04-06). When `true`, the Kendo picker displays the stored time without TZ conversion; when `false`, it converts UTC→local. On the V1 load path, `ignoreTZ=true` causes `initCalendarValueV1` to strip Z before parsing (affects rawValue), while `ignoreTZ=false` preserves Z (triggers UTC interpretation). **No-op for date-only fields** (`enableTime=false`). Only meaningful for DateTime fields (`enableTime=true`).                                                                                                                                                      |
| `useLegacy`          | boolean      | If `true`, activates the legacy calendar control. Changes save/read pipeline. The field renders as a **plain HTML text input** (not the Kendo masked DatePicker used by modern configs) — type the full `MM/dd/yyyy` string in one pass; there are no auto-advancing date segments. The popup path stores a full UTC ISO datetime string (e.g., `"2026-03-15T03:00:00.000Z"`) even when `enableTime=false`, unlike the modern path which stores a date-only string (`"2026-03-15"`). See Bug #2. **Read-back**: `GetFieldValue()` for legacy DateTime fields returns the raw stored value without transformation — no UTC conversion (unlike Config C) and no fake Z (unlike Config D / Bug #5). See [GetFieldValue return by config](#getfieldvalue-return-by-config). |
| `enableInitialValue` | boolean      | If `true`, the field pre-populates with an initial value (current date or preset date) on form load.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `initialValueMode`   | number       | `0` = CurrentDate (uses live `new Date()` at load time); `1` = Preset (uses a configured fixed date). Only relevant when `enableInitialValue=true`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `initialValue`       | string\|null | The preset date value. `null` when using current date or when initial value is disabled.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `mask`               | string\|null | Display/input format mask (e.g., `"MM/dd/yyyy"`). Present in XML exports as `<Mask>`. Controls what the user sees in the input field. **Does not affect the value processing pipeline** (`normalizeCalValue`, `getSaveValue`, `getCalendarFieldValue`) — those are driven solely by the three boolean flags. Not all fields have this property; DateTest fields omit it (uses platform default).                                                                                                                                                                                                                                                                                                                                                                        |
| `placeholder`        | string\|null | Placeholder hint text shown when the field is empty. Present in XML exports as `<Placeholder>`. Purely cosmetic.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

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

**Legacy (`useLegacy=true`) — Kendo calendar with plain input wrapper:**

- The field is a plain `<input>` inside `<div class="d-picker">`. Users can type the date directly.
- A calendar icon (`<span class="k-icon k-i-calendar cal-icon">`) exists next to the input. It does NOT have the Kendo `aria-label="Toggle calendar"` attribute — it's a plain span with the `cal-icon` class. Clicking it opens a **Kendo calendar popup** (same `<kendo-popup>` + `<kendo-calendar>` structure as non-legacy date-only fields). The toggle mechanism differs from non-legacy but the popup DOM is identical. Confirmed via Playwright DOM inspection (2026-04-06).
- For DateTime legacy fields (`enableTime=true`), the popup closes immediately on day click without showing a Time tab — time defaults to midnight.
- The popup stores raw `toISOString()` UTC via `calChangeSetValue()`, bypassing `getSaveValue()` (see Bug #2). This results in different DB values than typed input — see Bug #2 DB evidence.

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

// Safe round-trip (zero drift, even for Config D which drifts -3h/trip via GFV):
VV.Form.SetFieldValue('FieldName', VV.Form.GetDateObjectFromCalendar('FieldName').toISOString());

// Empty field handling — returns undefined (not null, not "Invalid Date"):
var d = VV.Form.GetDateObjectFromCalendar('FieldName');
// d === undefined (falsy) — safe for: if (!d) { /* field is empty */ }
// Contrasts GetFieldValue() which returns "Invalid Date" (truthy!) for empty Config D fields (Bug #6)
```

### GetFieldValue return by config

`GetFieldValue()` applies an output transformation via `getCalendarFieldValue()`. The transformation depends on the field's config flags:

| Flags                                                              | GFV Return                                        | Example (stored `"2026-03-15T00:00:00"` in BRT) |
| ------------------------------------------------------------------ | ------------------------------------------------- | ----------------------------------------------- |
| `enableTime=false` (any config — A/B/E/F)                          | Raw date string, no transformation                | `"2026-03-15"`                                  |
| `enableTime=true`, `ignoreTZ=false`, `useLegacy=false` (Config C)  | Converts local→UTC, appends real Z                | `"2026-03-15T03:00:00.000Z"`                    |
| `enableTime=true`, `ignoreTZ=true`, `useLegacy=false` (Config D)   | Appends fake Z to local time (**Bug #5**)         | `"2026-03-15T00:00:00.000Z"`                    |
| `enableTime=true`, `ignoreTZ=false`, `useLegacy=true` (Config G)   | Raw value returned, no conversion                 | `"2026-03-15T00:00:00"`                         |
| `enableTime=true`, `ignoreTZ=true`, `useLegacy=true` (Config H)    | Raw value returned, no fake Z                     | `"2026-03-15T00:00:00"`                         |
| **V2 code path** (`useUpdatedCalendarValueLogic=true`, any config) | Raw value returned — all transformations bypassed | `"2026-03-15T00:00:00"` (same as raw partition) |

**Key implication**: `useLegacy=true` skips the entire `getCalendarFieldValue()` transformation — no UTC conversion, no fake Z. This makes legacy DateTime configs immune to Bug #5 round-trip drift, but also means GFV doesn't produce real UTC strings (unlike Config C). Developers must handle timezone conversion themselves for legacy DateTime fields.

**V2 code path** (confirmed live 2026-04-03): Under V2, `GetFieldValue()` returns the raw partition value for ALL configs — no UTC conversion (Config C loses its real-UTC output), no fake Z (Config D's Bug #5 is resolved). V2 GFV is functionally equivalent to `getValueObjectValue()`. Tested in IST where Config C V1 returns `"2026-03-14T18:30:00.000Z"` (real UTC) but V2 returns `"2026-03-15T00:00:00"` (raw).

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

| Bug # | Name                                                   | Config                                                                 | Severity                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----- | ------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #1    | Timezone marker stripping in parseDateString()         | All configs, **V2 code path only**                                     | Medium — `parseDateString()` unconditionally strips the `"Z"` UTC suffix before parsing, causing dates to be reinterpreted as local time. Shift = TZ offset (BRT: +3h, IST: -5.5h). The `ignoreTZ=false` recovery branch (`.tz("UTC",true).local()`) works for DateTime but **backfires for date-only fields at UTC- timezones** — the recovery shifts midnight backward, crosses into the previous day, then `startOf("day")` snaps there (BRT: -1 day). Paradoxically, `ignoreTZ=true` is safer for date-only (keeps correct day, just +3h offset). **V1 is not affected** — parseDateString is never called in V1; equivalent inline code exists at lines 102889/102893 (DateTime+ignoreTZ Z-strip) and 102912 (date-only T-truncation → `moment().toDate()` = Bug #7). V1 DateTime save/reload is self-consistent: `getSaveValue()` strips Z on save, reload parses Z-less string as local, reconstructing the original value. Playwright-verified 2026-04-06 across BRT, IST, UTC0.                                                                                                                                                                                  |
| #2    | Inconsistent popup vs typed handlers for legacy fields | `useLegacy=true`, any TZ                                               | Medium — same field, same date: popup stores full UTC datetime (`"2026-03-15T03:00:00.000Z"`), typed input stores date-only string (`"2026-03-15"`); format diverges in `calChangeSetValue()` vs `calChange()`. **Typed input is correct** — stores the expected format for all 8 configs across BRT + IST (confirmed Cat 2: 8 PASS in BRT, 8 configs including legacy). Popup is the buggy path for legacy fields.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| #5    | Fake-Z in GetFieldValue                                | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false`            | High — causes date drift on every `SetFieldValue(GetFieldValue())` round-trip. **Drift = -(timezone offset) per trip**: BRT -3h/trip, IST +5:30h/trip, PDT -7h/trip (DST active), JST +9h/trip, UTC+0 0/trip (masked — fake Z coincidentally correct). **Full day loss**: BRT 8 trips, PDT ~3.4 trips, IST ~4.4 trips, JST ~2.7 trips. **Boundary severity is TZ-sign-dependent**: UTC- users (BRT, PST) cross year/month boundaries backward (Jan 1→Dec 31 2025, Feb 29→Feb 28); UTC+ users (IST, JST) drift forward preserving boundaries but cross midnight sooner. **DST note**: America/Los_Angeles is PDT (UTC-7) during March, not PST (UTC-8) — drift is -7h, not -8h. Workaround: use `SetFieldValue(field, GetDateObjectFromCalendar(field).toISOString())` instead (zero drift, confirmed TC-9-GDOC-D-BRT-1). `useLegacy=true` is immune — confirmed in BRT same-TZ (TC-8-H-BRT, TC-9-H-BRT-1), BRT→BRT reload (TC-3-H-BRT-BRT), and IST cross-TZ reload (TC-3-H-BRT-IST). **V2 code path is also immune** — V2 GFV returns raw value, no fake Z (confirmed TC-8-V2).                                                                                          |
| #6    | GetFieldValue fails for empty DateTime fields          | `enableTime=true`, `useLegacy=false` (ALL non-legacy DateTime configs) | High — **scope expanded (2026-04-01):** affects Config C AND Config D, not just D. Config D (`ignoreTimezone=true`): returns truthy string `"Invalid Date"`. Config C (`ignoreTimezone=false`): **THROWS `RangeError: Invalid time value`** — crashes scripts without try/catch. Root cause: no empty-value guard in `getCalendarFieldValue()`. Config A (`enableTime=false`) returns `""` correctly. `useLegacy=true` predicted safe (untested).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| #7    | Wrong day stored for UTC+ timezones                    | Date-only fields, all configs (`enableTime=false`)                     | High — UTC+ users store previous day on every SetFieldValue call; **cumulative in round-trips**: each GFV→SFV cycle loses another day (TC-9-B-IST: "2026-03-15"→"2026-03-14"→"2026-03-13" after 1 trip). Field display shows the user-typed date, masking the shift until form reload. `ignoreTimezone=true` does NOT prevent it — Config B (ignoreTZ) behaves identically to Config A (TC-3-B-IST-BRT confirmed). **Scope (2026-04-01):** ALSO fires on preset form-init path via `initCalendarValueV1` → `moment(e).toDate()` (TC-5-A-IST confirmed — preset shows correct display but internal UTC date is wrong day). **DateTime preset fields bypass this** — they store `new Date(initialDate)` directly without going through `parseDateString` truncation (TC-5-C-BRT/IST confirmed — identical UTC values across all TZs). `useLegacy=true` does NOT protect date-only presets (TC-5-E-IST/5-F-IST confirmed). Same-TZ reload IS safe (TC-3-A-BRT-BRT, TC-3-G-BRT-BRT confirmed). Current Date default (`new Date()` path) is the only fully correct initialization — skips `moment` parsing entirely (TC-6-A-IST confirmed, Cat 6 15/15 13P/2F fully complete). |

| #8 | Silent data loss for DD/MM/YYYY and epoch formats (API) | All configs — server-side | High — the VV REST API silently accepts records with unparseable date formats (DD/MM/YYYY, epoch ms, compact ISO) and stores `null` instead of the value. No error in the response. Also: ambiguous dates like `"05/03/2026"` are always interpreted as MM/DD (May 3), not DD/MM (March 5). Affects CSV imports from LATAM and European systems using day-first formats. See [api-date-patterns.md](api-date-patterns.md) for accepted formats and workarounds. |

### Calendar Field Mixed Timezone Storage

Confirmed via direct SQL query on `DateTest-000004` (saved from BRT, UTC-3). Fields with `enableInitialValue=true` store **UTC**; user-input fields store **local time** with no timezone marker.

| Field type                                 | Config                                          | DB storage                       | Example                                                                              |
| ------------------------------------------ | ----------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| Initial value — CurrentDate                | `enableInitialValue=true`, `initialValueMode=0` | UTC timestamp                    | `3/27/2026 8:02:51 PM` = time of save expressed as UTC                               |
| Initial value — Preset (date-only)         | `enableInitialValue=true`, `initialValueMode=1` | UTC equivalent of local midnight | `3/1/2026 3:00:00 AM` = BRT midnight March 1 in UTC                                  |
| Initial value — Preset (DateTime)          | `enableInitialValue=true`, `initialValueMode=1` | Raw `initialDate` timestamp      | `3/1/2026 11:28:54 AM` = exact UTC time from field config (bypasses parseDateString) |
| User input — any config (C, D, A w/o init) | `enableInitialValue=false`                      | Local time, no offset            | `3/15/2026 12:00:00 AM` = BRT midnight March 15, stored as-is                        |

The database stores no timezone context — there is no suffix distinguishing a UTC value from a local value. A SQL query or report filtering `WHERE Field5 = '3/15/2026 12:00:00 AM'` from a UTC+ machine would match, but the meaning of that timestamp differs per field type. Reports or scheduled scripts that join or compare dates across field types will silently produce incorrect results.

**V1 DateTime save/reload self-consistency (confirmed 2026-04-06):** Despite the inline Z-stripping in V1, DateTime field save/reload is self-consistent across timezones. `getSaveValue()` formats DateTime values as local time without Z (`"YYYY-MM-DDTHH:mm:ss"`). On reload, `initCalendarValueV1()` parses this Z-less string as local time via `new Date()`, which reconstructs the original value. This means cross-TZ reload of DateTime fields shows the **same** stored value regardless of the loading user's timezone (verified: BRT-saved Config D loaded correctly in BRT, IST, and UTC0). Date-only fields do NOT have this property — they are affected by Bug #7 at the save step, and the incorrect value is then preserved consistently across TZ reloads.
