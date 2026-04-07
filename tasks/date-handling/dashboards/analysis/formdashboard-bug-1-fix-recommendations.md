# FORMDASHBOARD-BUG-1: Fix Recommendations

## Workarounds

### No User-Side Workaround

The formatting is controlled by the platform's server-side and client-side rendering engines respectively. Users cannot change either format.

### Support Staff Guidance

When a user reports "the dashboard shows a different date than the form," first check whether it is only a leading-zero difference (this bug, cosmetic) or an actual time shift ([WEBSERVICE-BUG-1](../../web-services/analysis/ws-bug-1-cross-layer-shift.md), data issue). If the date and time values are the same and only the format differs, reassure the user that the data is correct.

---

## Proposed Fix

Change one format string to match the other. The VV platform team needs to decide which format is canonical:

### Option A: Align Dashboard to Forms Format (Add Leading Zeros to .NET)

```
Current:  M/d/yyyy h:mm tt     → "3/15/2026 2:30 PM"
Fixed:    MM/dd/yyyy hh:mm tt  → "03/15/2026 02:30 PM"
```

### Option B: Align Forms to Dashboard Format (Remove Leading Zeros from Angular)

```
Current:  MM/dd/yyyy hh:mm a   → "03/15/2026 02:30 PM"
Fixed:    M/d/yyyy h:mm a      → "3/15/2026 2:30 PM"
```

Either option is a single format-string change in the respective component's configuration.

---

## Fix Impact Assessment

### What Changes If Fixed

- Dashboard and Forms display identical date text for the same record
- Users comparing the two views see consistent formatting
- Support investigations of date discrepancies have one less variable to account for

### Backwards Compatibility Risk: NONE

This is a display-only change. No stored values are affected. The date and time values remain identical — only the text representation changes.

### Regression Risk: LOW

A single format string change in either the Telerik RadGrid column configuration (.NET) or the Kendo date picker format (Angular). No logic change, no data flow change. Visual regression testing should verify the new format renders correctly across all date field types.
