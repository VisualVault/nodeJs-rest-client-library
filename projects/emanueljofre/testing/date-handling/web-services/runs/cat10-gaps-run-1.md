# Cat 10 Gap Tests — Run 1 | 2026-04-02 | BRT+IST | 3 PASS, 3 FAIL

Closes gaps between Forms Cat 10 and WS matrix. Tests formats and scenarios not previously covered.

**Matrix**: [matrix.md](../matrix.md) | **Forms Matrix**: [../../forms-calendar/matrix.md](../../forms-calendar/matrix.md)

## Environment

| Parameter      | Value                                                     |
| -------------- | --------------------------------------------------------- |
| Date           | 2026-04-02                                                |
| Execution Mode | Hybrid: Script (API create) + Playwright (browser verify) |
| API Server TZ  | `America/Sao_Paulo` — UTC-3                               |
| Browser TZs    | `America/Sao_Paulo` (BRT), `Asia/Calcutta` (IST)          |

## Test 1: .NET Format `+00:00` Offset (Cat 10-D-ws-dotnet)

**Input**: `"2026-03-15T00:00:00.000+00:00"` → Config D

| Step         | Result                                                            |
| ------------ | ----------------------------------------------------------------- |
| API accepted | Yes                                                               |
| API stored   | `"2026-03-15T00:00:00Z"` — `+00:00` converted to Z (equivalent)   |
| **Status**   | **PASS** — `.NET` offset format handled identically to `Z` suffix |

## Test 2: Epoch Milliseconds (Cat 10-D-ws-epoch)

**Input**: `1773532800000` (= `2026-03-15T00:00:00.000Z`)

| Variant                    |     API Accepted     | Stored                        |
| -------------------------- | :------------------: | ----------------------------- |
| Numeric (`1773532800000`)  | Yes (record created) | `null` — **silent data loss** |
| String (`"1773532800000"`) | Yes (record created) | `null` — **silent data loss** |

**Status**: **FAIL** — Epoch format silently stored as null. Same pattern as Bug #8 (DD/MM/YYYY). Server accepts the record but cannot parse the value.

## Test 3: Midnight-Crossing `T02:00:00Z` (Cat 10-D-ws-midnight-cross)

**Input**: `"2026-03-15T02:00:00"` → Config D (ignoreTZ=true)
**API stored**: `"2026-03-15T02:00:00Z"`

### Browser verification

| TZ             | Display               | rawValue                | GetFieldValue                |   Date Crossed?   |
| -------------- | --------------------- | ----------------------- | ---------------------------- | :---------------: |
| BRT (UTC-3)    | `03/15/2026 02:00 AM` | `"2026-03-14T23:00:00"` | `"2026-03-14T23:00:00.000Z"` | **Yes — Mar 14!** |
| IST (UTC+5:30) | `03/15/2026 02:00 AM` | `"2026-03-15T07:30:00"` | `"2026-03-15T07:30:00.000Z"` |   No — same day   |

**Status**: **FAIL** — CB-8 midnight-crossing variant confirmed.

### Analysis

Display shows the correct original time (`02:00 AM`) because `ignoreTZ=true` prevents display conversion. But the rawValue stored in the form is the UTC→local converted time:

- BRT: `02:00 UTC - 3h = 23:00 Mar 14` — **date crossed to previous day**
- IST: `02:00 UTC + 5:30h = 07:30 Mar 15` — same day (no crossing)

If a BRT user saves this form, `"2026-03-14T23:00:00"` gets persisted — the wrong date. GetFieldValue adds Bug #5 fake Z to this shifted value, creating `"2026-03-14T23:00:00.000Z"` which is doubly wrong (fake UTC + wrong date).

**Impact for CSV imports**: Any datetime between `T00:00:00Z` and `T02:59:59Z` will display the correct time but store the **previous day** for BRT users. This is a data corruption vector: the import looks correct in Forms but the underlying stored date is wrong.

## Findings Summary

| Test             | Status | Finding                                                 |
| ---------------- | :----: | ------------------------------------------------------- |
| .NET `+00:00`    |  PASS  | Equivalent to Z — CB-12 confirmed for `.NET` format     |
| Epoch number     |  FAIL  | Silent null — same as Bug #8                            |
| Epoch string     |  FAIL  | Silent null — same as Bug #8                            |
| Midnight BRT     |  FAIL  | rawValue crosses to Mar 14 — CB-8 date-crossing variant |
| Midnight IST     |  PASS  | Same day — no crossing                                  |
| Midnight display |  PASS  | Display correct (ignoreTZ) — but deceptive              |
