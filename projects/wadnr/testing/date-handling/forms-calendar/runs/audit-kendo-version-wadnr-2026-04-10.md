# Audit: Kendo Version — WADNR (vv5dev) — 2026-04-10

**Environment**: vv5dev / WADNR / fpOnline
**Kendo variant**: v2
**progVersion**: 6.1.20240711.1
**FormViewer**: 20260404.1 (v0.5.1)
**Execution**: `audit-kendo-version.spec.js` via `npx playwright test --project BRT-chromium`
**Result**: 7 passed / 9 failed (failures = `kendo` global and DOM selectors not found on v2)

---

## Phase 1: VV Form Framework (PASSED)

### VV.Form Core Properties

| Property | Value |
|----------|-------|
| `formId` | `undefined` (typeof = "undefined") |
| `useUpdatedCalendarValueLogic` | `false` (V1 path active) |
| `calendarValueService` methods | `formatDateStringForDisplay`, `getCalendarFieldValue`, `getSaveValue`, `parseDateString` |
| `LocalizationResources` | exists but **empty object** (`{}`) — no localization configured |
| `VV.Form` property count | 28 |

New properties vs expected v1: `LocalizationResources`, `LocalizeString`, `CurrentLanguageCode`, `FormLanguage`.

### fieldMaster — Config D (Field5)

| Property | Value |
|----------|-------|
| `enableTime` | `true` |
| `ignoreTimezone` | `true` |
| `useLegacy` | `false` |
| `mask` | `""` (empty — cleared) |
| `placeholder` | `""` |
| `enableQListener` | `false` |
| `enableInitialValue` | `false` |
| No `format` or `displayFormat` properties exist |

### fieldMaster — Config C (Field6)

Same structure as Config D. `ignoreTimezone = false`. All mask/format properties empty.

---

## Phase 2: Kendo Widget Internals (FAILED)

### Finding: `kendo` global does NOT exist on v2

```
ReferenceError: kendo is not defined
```

On Kendo v1 (vvdemo), `kendo` is a global object with `.version`, `.culture()`, `.parseDate()`, `.toString()`.
On Kendo v2 (vv5dev), Kendo is loaded as a module — **no global `kendo` object**.

**Impact**: Any code or test that references `kendo.parseDate()` or `kendo.toString()` directly will fail on v2. VV's own code accesses Kendo through Angular's dependency injection, not the global.

### Finding: DOM selectors `[name="FieldN"]` don't match on v2

```json
{"error": "input not found"}
```

On v1, calendar inputs have `name="Field5"`. On v2, the DOM structure is different — inputs may use `aria-label` or be nested differently.

**Impact**: Playwright selectors that target `[name="FieldN"]` need v2 alternatives. The existing regression specs work because they use VV.Form JS API (`SetFieldValue`, `GetFieldValue`, `getValueObjectValue`) which is DOM-independent. Widget-level inspection requires v2-specific selectors.

---

## Phase 3: Kendo Date Parsing (FAILED — no global)

All 5 `kendo.parseDate()` tests failed with `ReferenceError: kendo is not defined`.

**Workaround for future tests**: Access Kendo via the widget instance instead of the global:
```javascript
// v2: get kendo through a widget instance
const widget = angular.element('[data-role="datepicker"]').data('kendoDatePicker');
const kendo = widget.constructor.fn.constructor; // or find via module system
```

---

## Phase 4: Widget Value After SetFieldValue (PASSED — VV level)

VV-level value pipeline works identically to EmanuelJofre:

| Config | Input | `vvRaw` | `vvApi` | Widget value | Display |
|--------|-------|---------|---------|-------------|---------|
| D (Field5) | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00.000Z"` | null (selector failed) | null |
| C (Field6) | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00"` | `"2026-03-15T17:30:00.000Z"` | null (selector failed) | null |
| A (Field7) | `"2026-03-15"` | `"2026-03-15"` | `"2026-03-15"` | null (selector failed) | null |

Config D: GFV appends fake Z (FORM-BUG-5 confirmed on v2).
Config C: GFV applies BRT UTC offset +3h (14:30 → 17:30, expected behavior).
Config A: GFV returns raw (date-only, no transformation).

---

## Phase 5: Mask Properties in fieldMaster (PASSED)

26 calendar fields scanned. Key finding:

| Field | Config | enableTime | mask |
|-------|--------|:----------:|------|
| Field3 | A (dup) | false | **`"MM/dd/yyyy"`** |
| Field4 | A (dup) | false | **`"MM/dd/yyyy"`** |
| All other fields | A-H | varies | `""` (empty) |

**Field3 and Field4 still have masks** despite the "masks cleared" operation on the test harness. These are duplicate Config A fields not used in formal tests. They provide a **natural masked vs unmasked comparison pair** on the same form:

- Field7 (Config A, no mask) vs Field3 (Config A, `MM/dd/yyyy` mask)
- Both are date-only, `enableTime=false`, `ignoreTimezone=false`

No `format` or `displayFormat` properties exist on any field — `mask` is the only format-related property in `fieldMaster`.
