# Document Library Date Handling — Initial Investigation

**Status**: Initial findings from API-level testing
**Date**: 2026-04-09
**Environment**: vvdemo (EmanuelJofre/Main)
**Build context**: FormViewer 20260304.1 (v0.5.1), Platform 5.1.20210525.1, DB 3041

---

## Index Field Types

Document index fields are metadata fields attached to documents, defined globally and assigned to folders. Unlike form calendar fields, they have **no date-specific configuration flags** (no `enableTime`, `ignoreTimezone`, `useLegacy`).

| Property      | Value                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------- |
| Field type    | `4` (`fieldTypeName: "Date Time"`)                                                                |
| Configuration | Label, required, default value — no timezone or date-only flags                                   |
| Assignment    | Global definition → assigned to folders via `/indexfields/{id}/folders/{folderId}`                |
| API read      | `GET /documents/{id}/indexfields` → `value` field                                                 |
| API write     | `PUT /documents/{id}/indexfields` with `{ indexFields: JSON.stringify({ 'FieldLabel': value }) }` |

## Round-Trip Test Results

Test: write a date value via the API, then read it back.

| Input Format         | Input Value                 | Stored Value          | Behavior                               |
| -------------------- | --------------------------- | --------------------- | -------------------------------------- |
| ISO date-only        | `2026-03-15`                | `2026-03-15T00:00:00` | Appends `T00:00:00`, no Z              |
| US date              | `03/15/2026`                | `2026-03-15T00:00:00` | Parsed, normalized to ISO              |
| EU date              | `15/03/2026`                | `2026-03-15T00:00:00` | **Correctly parsed** as day/month      |
| ISO datetime (naive) | `2026-03-15T14:30:00`       | `2026-03-15T14:30:00` | **Preserved exactly**                  |
| ISO datetime UTC     | `2026-03-15T14:30:00Z`      | `2026-03-15T14:30:00` | **Z stripped silently**                |
| ISO datetime -03:00  | `2026-03-15T14:30:00-03:00` | `2026-03-15T17:30:00` | **Converted to UTC**, Z stripped       |
| ISO datetime +05:30  | `2026-03-15T14:30:00+05:30` | `2026-03-15T09:00:00` | **Converted to UTC**, Z stripped       |
| US datetime 12h      | `03/15/2026 2:30 PM`        | `2026-03-15T14:30:00` | Parsed and normalized                  |
| US datetime 24h      | `03/15/2026 14:30`          | `2026-03-15T14:30:00` | Parsed and normalized                  |
| Midnight UTC         | `2026-03-15T00:00:00Z`      | `2026-03-15T00:00:00` | Z stripped — looks like local midnight |
| Midnight BRT         | `2026-03-15T00:00:00-03:00` | `2026-03-15T03:00:00` | Converted to 03:00 UTC, Z stripped     |
| Invalid (`2026`)     | —                           | Previous value kept   | Silent failure                         |
| Empty string         | —                           | Previous value kept   | **Cannot clear the field**             |

## Confirmed Issues

### DOC-BUG-1: Timezone Offset Silently Converted + Z Stripped

**Severity**: High

When a timezone-offset datetime is written (e.g., `2026-03-15T14:30:00-03:00`), the server:

1. Converts to UTC (`14:30 - (-03:00) = 17:30`)
2. Strips the Z suffix from the result
3. Returns `2026-03-15T17:30:00` — a timezone-ambiguous value

This is the same class of problem as form fields, but with a different mechanism:

- **Forms**: Mixed storage — some values are UTC (with Z), some are local (without Z)
- **Index fields**: ALL values are stored as UTC with Z stripped — consumers cannot distinguish UTC from local

**Impact**: Scripts reading index field dates have no way to know the value is UTC. If they treat it as local time, they'll display the wrong time. If they convert from UTC, they'll be correct — but only if ALL values were written with offsets. Values written as naive datetimes (`2026-03-15T14:30:00`) are stored as-is — and might represent local time.

### DOC-BUG-2: Cannot Clear a Date Index Field

**Severity**: Medium

Writing an empty string (`""`) to a date index field fails silently — the previous value is retained. Writing an invalid value (`"2026"`) also fails silently. There is no documented way to clear a date index field once set.

### Notable: EU Date Format Parsed Correctly

Unlike the forms REST API (WS-BUG-2, WS-BUG-3), the document index field API **correctly parses** `15/03/2026` as March 15. This suggests the index field parser has better locale-aware date parsing than the forms API.

## Comparison with Forms API

| Behavior            | Forms API (`postForms`)               | Document Index Fields             |
| ------------------- | ------------------------------------- | --------------------------------- |
| Date-only input     | Stored as-is or with `T00:00:00.000`  | Normalized to `T00:00:00`         |
| UTC (Z) indicator   | Present in API responses (`Z` suffix) | **Stripped** — no Z in responses  |
| Timezone conversion | No conversion — stored as-is          | **Converts to UTC** and strips Z  |
| EU date format      | Silently swapped (WS-BUG-2)           | **Correctly parsed**              |
| Empty/clear         | Sets to null                          | **Cannot clear** — silent failure |
| Configuration flags | enableTime, ignoreTimezone, useLegacy | None — single "Date Time" type    |

## UI Investigation Results

**Document Detail URL**: `/app/{customer}/{db}/DocumentDetails?DhID={dhId}&hidemenu=true`
Opens in a popup window with 11 tabs: Details, Parent, Children, Related, Forms, Projects, ID Card, **Index Fields**, Revisions, History, Security.

### Index Fields Tab

| Property        | Value                                                  |
| --------------- | ------------------------------------------------------ |
| Control         | Telerik **RadDateTimePicker** (calendar + clock icons) |
| Display format  | US 12h: `3/15/2026 2:30 PM`                            |
| Internal format | Telerik dash-separated: `2026-03-15-14-30-00`          |
| Min date        | 1600-01-01                                             |
| Max date        | 9900-12-31                                             |
| Disabled state  | Input is disabled when document is checked out         |

### Full Data Pipeline

```
API write: "2026-03-15T14:30:00"     (ISO naive datetime)
    ↓ server stores
API read:  "2026-03-15T14:30:00"     (same, no Z)
    ↓ UI loads
UI hidden: "2026-03-15-14-30-00"     (Telerik RadDateTimePicker internal)
    ↓ UI renders
UI display: "3/15/2026 2:30 PM"      (US format, 12h time)
```

### Document Check-In/Out Behavior

- Index field editing is **blocked in the UI** when the document is checked out (datepicker disabled)
- The **API can still update** index fields while checked out — no check-in required
- This creates a potential inconsistency: scripts can write dates that the UI prevents

### Document Detail Page Tabs

| Tab              | Content                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------- |
| Details          | Title, Description, Folder Path, Document ID, Revision, Keywords, Comments, Permanent Links |
| Parent           | Parent document relationship                                                                |
| Children         | Child document relationships                                                                |
| Related          | Related document links                                                                      |
| Forms            | Related form records                                                                        |
| Projects         | Related projects                                                                            |
| ID Card          | Document ID card display                                                                    |
| **Index Fields** | Editable index field values (RadDateTimePicker for dates)                                   |
| Revisions        | Document revision history                                                                   |
| History          | Activity/audit history                                                                      |
| Security         | Access permissions                                                                          |

### Built-in Date Fields on Documents

Documents have built-in date fields (separate from index fields):

| Field               | Example Value              | Source                         |
| ------------------- | -------------------------- | ------------------------------ |
| `reviewDate`        | `2025-01-07T17:18:28.787Z` | System-generated, includes Z   |
| `expireDate`        | `2025-04-07T17:18:28.787Z` | System-generated, includes Z   |
| `createDate`        | `2024-04-12T17:18:28.797Z` | System-generated, includes Z   |
| `modifyDate`        | `2024-04-12T17:18:31.48Z`  | System-generated, includes Z   |
| `checkOutDate`      | `2024-04-12T17:18:28.803Z` | System-generated, includes Z   |
| Checkin Date (grid) | `6/10/2021 4:53 PM`        | Displayed in US format in grid |

Note: built-in dates INCLUDE the Z suffix (UTC). Index field dates do NOT. This is inconsistent within the same document.

## Next Steps

1. **UI save round-trip test** — Check in the document (or create fresh), edit date via UI datepicker, save, read back via API. Verify what format the UI sends.
2. **WADNR impact** — WADNR scripts use `putDocumentIndexFields()` with date values. Check if they write with timezone offsets (DOC-BUG-1 risk).
3. **Cross-timezone UI test** — View the same document from BRT and IST browsers. Does the displayed date change? (It shouldn't if stored as naive datetime, but might if the server applies timezone logic.)
4. **Playwright regression spec** — Create automated tests for the document date data pipeline.
