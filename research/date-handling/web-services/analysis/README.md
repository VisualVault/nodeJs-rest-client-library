# Web Services — Date Handling Findings

Root-cause analysis documents for each confirmed finding in the VisualVault REST API date handling layer. Organized by type: bugs (software defects), design flaws (architectural gaps), and undocumented behaviors.

## Overview

See [`overview.md`](overview.md) for the comprehensive analysis including executive summary, all confirmed behaviors (CB-1 through CB-32), hypothesis resolution, developer guidance, and design observations.

## Findings by Type

### Bugs (defects — software produces incorrect/unexpected results)

| ID               | Document                                                             | Severity | Title                                             | Evidence |
| ---------------- | -------------------------------------------------------------------- | -------- | ------------------------------------------------- | -------- |
| WEBSERVICE-BUG-1 | [`ws-bug-1-cross-layer-shift.md`](ws-bug-1-cross-layer-shift.md)     | **HIGH** | postForms Z suffix causes datetime shift in Forms | `[LIVE]` |
| WEBSERVICE-BUG-2 | [`ws-bug-2-latam-data-loss.md`](ws-bug-2-latam-data-loss.md)         | **HIGH** | DD/MM/YYYY formats silently stored as null        | `[LIVE]` |
| WEBSERVICE-BUG-5 | [`ws-bug-5-silent-null-formats.md`](ws-bug-5-silent-null-formats.md) | LOW      | Compact/epoch formats silently stored as null     | `[LIVE]` |

### Design Flaws (architectural gaps — systemic inconsistencies, not single-point failures)

| ID   | Document                                                                       | Severity | Title                                                  | Evidence   |
| ---- | ------------------------------------------------------------------------------ | -------- | ------------------------------------------------------ | ---------- |
| WS-4 | [`ws-bug-4-endpoint-format-mismatch.md`](ws-bug-4-endpoint-format-mismatch.md) | **HIGH** | postForms vs forminstance/ serialization inconsistency | `[LIVE]`   |
| WS-6 | [`ws-bug-6-no-date-only-enforcement.md`](ws-bug-6-no-date-only-enforcement.md) | MEDIUM   | No server-side date-only type enforcement              | `[DESIGN]` |

### Undocumented Behaviors (valid design decisions that need documentation)

| ID   | Document                                                     | Severity | Title                                       | Evidence |
| ---- | ------------------------------------------------------------ | -------- | ------------------------------------------- | -------- |
| WS-3 | [`ws-bug-3-ambiguous-dates.md`](ws-bug-3-ambiguous-dates.md) | MEDIUM   | US-biased date parsing for ambiguous inputs | `[LIVE]` |

## Additional Findings

| Finding                        | Location                                                                       | Description                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Node.js library passthrough    | [overview.md § Infrastructure Baseline](overview.md#3-infrastructure-baseline) | Zero date transformation in the client library — all behavior is server-side or Forms-side |
| TZ-safe/unsafe script patterns | [overview.md § Developer Guidance](overview.md#7-developer-guidance)           | 4 safe and 7 unsafe date patterns for production scripts                                   |

## Evidence Tags

- `[LIVE]` — Confirmed via API test execution across BRT, IST, UTC + browser verification
- `[CODE]` — Confirmed via source code analysis of upstream Node.js client library
- `[DESIGN]` — Systemic design inconsistency confirmed across multiple test categories
