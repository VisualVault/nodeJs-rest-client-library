# Form Fields Reference

Runtime behavior, configuration properties, and debugging methods for VisualVault form fields.

---

## Calendar / Date Field

**`fieldType`:** `13`

### Configuration Properties

Each calendar field has the following boolean config flags. These are readable at runtime from `VV.Form.VV.FormPartition.fieldMaster`.

| Property             | Type         | Description                                                                                                                                         |
| -------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enableTime`         | boolean      | If `true`, the field stores and displays a datetime (date + time). If `false`, date only.                                                           |
| `ignoreTimezone`     | boolean      | If `true`, VV does not apply timezone conversion when storing/retrieving the value.                                                                 |
| `useLegacy`          | boolean      | If `true`, activates the legacy calendar control. Changes save/read pipeline.                                                                       |
| `enableInitialValue` | boolean      | If `true`, the field pre-populates with an initial value (current date or preset date) on form load.                                                |
| `initialValueMode`   | number       | `0` = CurrentDate (uses live `new Date()` at load time); `1` = Preset (uses a configured fixed date). Only relevant when `enableInitialValue=true`. |
| `initialValue`       | string\|null | The preset date value. `null` when using current date or when initial value is disabled.                                                            |

### Popup Modal Behavior

- The calendar popup opens on the **Date** tab by default.
- Clicking a day **automatically advances** to the **Time** tab (when `enableTime=true`). The default time is `12:00 AM`.
- The modal is **self-contained** — all controls (date grid, time picker, Set button) are in a single non-scrollable panel.
- If the modal is partially off-screen, scroll the **page** to bring it into view. Do NOT scroll inside the time picker column area — that changes the selected time value.
- Clicking **Set** commits the selected date and time. The button is visible once the full modal fits in the viewport.

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

Documented in detail in `tasks/date-handling/forms-calendar/draft-analysis.md`. Summary:

| Bug # | Name                                                    | Config                                                      | Severity                                                                      |
| ----- | ------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| #5    | Fake-Z in GetFieldValue                                 | `enableTime=true`, `ignoreTimezone=true`, `useLegacy=false` | High — causes date drift on every SetFieldValue(GetFieldValue()) round-trip   |
| #6    | GetFieldValue returns `"Invalid Date"` for empty fields | Same as #5                                                  | Medium — empty check `if (GetFieldValue('f'))` evaluates true for empty field |
| #7    | Wrong day stored for UTC+ timezones                     | Date-only fields, all configs                               | High — UTC+ users store previous day on every SetFieldValue call              |

### Calendar Field Mixed Timezone Storage

Confirmed via direct SQL query on `DateTest-000004` (saved from BRT, UTC-3). Fields with `enableInitialValue=true` store **UTC**; user-input fields store **local time** with no timezone marker.

| Field type                                 | Config                                          | DB storage                       | Example                                                       |
| ------------------------------------------ | ----------------------------------------------- | -------------------------------- | ------------------------------------------------------------- |
| Initial value — CurrentDate                | `enableInitialValue=true`, `initialValueMode=0` | UTC timestamp                    | `3/27/2026 8:02:51 PM` = time of save expressed as UTC        |
| Initial value — Preset                     | `enableInitialValue=true`, `initialValueMode=1` | UTC equivalent of local midnight | `3/1/2026 3:00:00 AM` = BRT midnight March 1 in UTC           |
| User input — any config (C, D, A w/o init) | `enableInitialValue=false`                      | Local time, no offset            | `3/15/2026 12:00:00 AM` = BRT midnight March 15, stored as-is |

The database stores no timezone context — there is no suffix distinguishing a UTC value from a local value. A SQL query or report filtering `WHERE DataField5 = '3/15/2026 12:00:00 AM'` from a UTC+ machine would match, but the meaning of that timestamp differs per field type. Reports or scheduled scripts that join or compare dates across field types will silently produce incorrect results.
