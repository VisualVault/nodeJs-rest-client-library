# WS-4 — Batch Run 1 | 2026-04-02 | BRT+IST | 2 PASS, 6 FAIL

**Matrix**: [matrix.md](../matrix.md) | **Analysis**: [analysis.md](../analysis.md)

## Environment

| Parameter      | Value                                                     |
| -------------- | --------------------------------------------------------- |
| Date           | 2026-04-02                                                |
| Execution Mode | Hybrid: Script (API create) + Playwright (browser verify) |
| API Server TZ  | `America/Sao_Paulo` — UTC-3 (default)                     |
| Browser TZs    | `America/Sao_Paulo` (BRT), `Asia/Calcutta` (IST)          |
| Code Path      | V1 (`useUpdatedCalendarValueLogic=false`)                 |

## API Step — Record Creation

| Record          | Configs | Input Sent              | API Stored               |
| --------------- | :-----: | ----------------------- | ------------------------ |
| DateTest-000930 |    A    | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` |
| DateTest-000931 |  C,D,H  | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` |

## Browser Step — Forms Verification

### BRT (UTC-3)

| ID         | Config | API Stored               | Display               | GetFieldValue                | rawValue                | Status |
| ---------- | :----: | ------------------------ | --------------------- | ---------------------------- | ----------------------- | :----: |
| ws-4-A-BRT |   A    | `"2026-03-15T00:00:00Z"` | `03/15/2026`          | `"2026-03-15"`               | `"2026-03-15"`          |  PASS  |
| ws-4-C-BRT |   C    | `"2026-03-15T14:30:00Z"` | `03/15/2026 11:30 AM` | `"2026-03-15T14:30:00.000Z"` | `"2026-03-15T11:30:00"` |  FAIL  |
| ws-4-D-BRT |   D    | `"2026-03-15T14:30:00Z"` | `03/15/2026 02:30 PM` | `"2026-03-15T11:30:00.000Z"` | `"2026-03-15T11:30:00"` |  FAIL  |
| ws-4-H-BRT |   H    | `"2026-03-15T14:30:00Z"` | `03/15/2026 02:30 PM` | `"2026-03-15T11:30:00"`      | `"2026-03-15T11:30:00"` |  FAIL  |

### IST (UTC+5:30)

| ID         | Config | API Stored               | Display               | GetFieldValue                | rawValue                | Status |
| ---------- | :----: | ------------------------ | --------------------- | ---------------------------- | ----------------------- | :----: |
| ws-4-A-IST |   A    | `"2026-03-15T00:00:00Z"` | `03/15/2026`          | `"2026-03-15"`               | `"2026-03-15"`          |  PASS  |
| ws-4-C-IST |   C    | `"2026-03-15T14:30:00Z"` | `03/15/2026 08:00 PM` | `"2026-03-15T14:30:00.000Z"` | `"2026-03-15T20:00:00"` |  FAIL  |
| ws-4-D-IST |   D    | `"2026-03-15T14:30:00Z"` | `03/15/2026 02:30 PM` | `"2026-03-15T20:00:00.000Z"` | `"2026-03-15T20:00:00"` |  FAIL  |
| ws-4-H-IST |   H    | `"2026-03-15T14:30:00Z"` | `03/15/2026 02:30 PM` | `"2026-03-15T20:00:00"`      | `"2026-03-15T20:00:00"` |  FAIL  |

## Outcome

**2 PASS, 6 FAIL** — Date-only (Config A) displays correctly in both TZs. DateTime configs (C, D, H) show cross-layer time shift caused by API Z normalization + Forms V1 UTC interpretation.

## Findings

### Config A (date-only) — PASS in both TZs

- API stores `"2026-03-15T00:00:00Z"`. Forms V1 load strips the time component and displays `03/15/2026`.
- Bug #7 does **not** manifest on the display/load path in IST. The Kendo date picker displays the local date from the Date object (local March 15), which is correct. Bug #7 only affects the **save** path (where `getSaveValue()` extracts the UTC date).
- **H-6 partially refuted**: IST display is correct for date-only fields loaded from API.

### Config C (DateTime, ignoreTZ=false) — FAIL: UTC→Local time shift

- API normalizes by appending Z: `"2026-03-15T14:30:00"` → stored as `"2026-03-15T14:30:00Z"`.
- Forms V1 interprets the Z as real UTC and converts to local time on load.
- BRT: 14:30 UTC → 11:30 AM local (display and rawValue shifted by -3h).
- IST: 14:30 UTC → 8:00 PM local (display and rawValue shifted by +5:30h).
- GetFieldValue preserves the original UTC value (`T14:30:00.000Z`) — correct but inconsistent with rawValue.
- **Root cause**: The API blindly appends Z to all datetime values (CB-7). Forms treats that Z as a real UTC indicator. The original value `T14:30:00` was intended as local time, not UTC.

### Config D (DateTime, ignoreTZ=true) — FAIL: Storage shifted, display preserved

- Same rawValue shift as Config C (storage converted UTC→local).
- But display shows the original 2:30 PM — the `ignoreTimezone` flag prevents the Kendo picker from applying TZ conversion on display.
- GetFieldValue adds Bug #5 fake Z to the shifted local time: BRT `"T11:30:00.000Z"`, IST `"T20:00:00.000Z"` — these are wrong UTC values.
- The combination of API Z normalization + Bug #5 creates doubly-misleading data.

### Config H (legacy DateTime, ignoreTZ=true) — FAIL: Same as D minus fake Z

- Same rawValue shift and display preservation as Config D.
- GetFieldValue returns without Z (legacy path doesn't add fake Z): `"T11:30:00"` / `"T20:00:00"`.

### New Finding: CB-8 — API Z Normalization Causes Cross-Layer DateTime Shift

When a datetime value is written via API without Z suffix (e.g., `"2026-03-15T14:30:00"` intended as local time), the VV server appends Z on storage (`"2026-03-15T14:30:00Z"`). When Forms loads this value, V1 `initCalendarValueV1` interprets the Z literally:

- `ignoreTZ=false`: `moment("2026-03-15T14:30:00Z").toDate()` → UTC 14:30 → local display shifts by TZ offset
- `ignoreTZ=true`: strips Z first → `moment("2026-03-15T14:30:00").toDate()` → local 14:30 → display correct, but `getSaveValue()` stores UTC-converted time

**Impact**: Any datetime written via API is permanently shifted when opened in Forms (unless the user is in UTC+0). This affects all production scripts that create/update datetime fields.
