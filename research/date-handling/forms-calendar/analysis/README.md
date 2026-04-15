# Forms Calendar — Bug Analysis

Individual root-cause analysis documents for each confirmed bug in the VisualVault Forms calendar field component. Each document is structured for direct conversion into a product bug ticket.

## Overview

See [`overview.md`](overview.md) for the comprehensive analysis including all scenarios, configuration matrix, test coverage, workarounds, and recommended solutions.

## Bug Documents

| Bug # | Document                                                           | Severity | Title                                                 | Evidence   |
| ----- | ------------------------------------------------------------------ | -------- | ----------------------------------------------------- | ---------- |
| 1     | [`bug-1-timezone-stripping.md`](bug-1-timezone-stripping.md)       | Medium   | parseDateString() strips Z suffix                     | `[CODE]`   |
| 2     | [`bug-2-inconsistent-handlers.md`](bug-2-inconsistent-handlers.md) | Low      | Popup vs typed input use different save paths         | `[LEGACY]` |
| 3     | [`bug-3-hardcoded-params.md`](bug-3-hardcoded-params.md)           | Medium   | initCalendarValueV2() ignores field settings          | `[CODE]`   |
| 4     | [`bug-4-legacy-save-format.md`](bug-4-legacy-save-format.md)       | Medium   | getSaveValue() strips timezone on save                | `[CODE]`   |
| 5     | [`bug-5-fake-z-drift.md`](bug-5-fake-z-drift.md)                   | **HIGH** | GetFieldValue adds fake [Z] causing progressive drift | `[LIVE]`   |
| 6     | [`bug-6-invalid-date-empty.md`](bug-6-invalid-date-empty.md)       | Medium   | GetFieldValue returns "Invalid Date" for empty fields | `[LIVE]`   |
| 7     | [`bug-7-wrong-day-utc-plus.md`](bug-7-wrong-day-utc-plus.md)       | **HIGH** | Date-only fields store wrong day for UTC+ users       | `[LIVE]`   |

## Additional Findings

| Finding                   | Location                                                                                           | Description                                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Database Mixed TZ Storage | [overview.md — Structural Finding](overview.md#database-mixed-timezone-storage-structural-finding) | Initial-value fields store UTC, user-input fields store local time — no metadata to distinguish |

## Evidence Tags

- `[LIVE]` — Confirmed via browser testing across BRT, IST, UTC0
- `[CODE]` — Confirmed via source code analysis, not independently reproduced live
- `[LEGACY]` — Confirmed only for `useLegacy=true` field configurations

## Key Source Files

- Production code: `forms-calendar/main.js` (~13 MB Angular bundle)
- Key functions: `parseDateString()` (line ~104126), `getSaveValue()` (line ~104100), `getCalendarFieldValue()` (line ~104114), `normalizeCalValue()` (line ~102793)
- Test matrix: [`../matrix.md`](../matrix.md) — 242 slots, 130P/72F/37 pending
