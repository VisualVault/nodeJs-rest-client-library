# WS-5 — Batch Run 1 | 2026-04-02 | BRT | 23 PASS, 9 FAIL

**Matrix**: [matrix.md](../matrix.md) | **Analysis**: [analysis.md](../analysis.md)

## Environment

| Parameter              | Value                                 |
| ---------------------- | ------------------------------------- |
| Date                   | 2026-04-02                            |
| Execution Mode         | Script (`run-ws-test.js`)             |
| Server TZ              | `America/Sao_Paulo` — UTC-3 (default) |
| Harness serverTimezone | `America/Sao_Paulo`                   |

## Results — Config A (date-only, DataField7)

| ID            | Format | Input Sent                    | Accepted | Stored                   | Notes                        |
| ------------- | :----: | ----------------------------- | :------: | ------------------------ | ---------------------------- |
| ws-5-A-ISO    |  ISO   | `"2026-03-15"`                |   Yes    | `"2026-03-15T00:00:00Z"` | Baseline; API adds T+Z       |
| ws-5-A-US     |   US   | `"03/15/2026"`                |   Yes    | `"2026-03-15T00:00:00Z"` | US format normalized         |
| ws-5-A-DT     |   DT   | `"2026-03-15T14:30:00"`       |   Yes    | `"2026-03-15T14:30:00Z"` | Time preserved in date-only! |
| ws-5-A-DTZ    |  DTZ   | `"2026-03-15T14:30:00Z"`      |   Yes    | `"2026-03-15T14:30:00Z"` | Z kept as-is                 |
| ws-5-A-DTBRT  | DTBRT  | `"2026-03-15T14:30:00-03:00"` |   Yes    | `"2026-03-15T17:30:00Z"` | Offset → UTC (+3h)           |
| ws-5-A-DTIST  | DTIST  | `"2026-03-15T14:30:00+05:30"` |   Yes    | `"2026-03-15T09:00:00Z"` | Offset → UTC (-5:30h)        |
| ws-5-A-DB     |   DB   | `"3/15/2026 12:00:00 AM"`     |   Yes    | `"2026-03-15T00:00:00Z"` | DB storage format accepted   |
| ws-5-A-DTMS   |  DTMS  | `"2026-03-15T14:30:00.000Z"`  |   Yes    | `"2026-03-15T14:30:00Z"` | Milliseconds stripped        |
| ws-5-A-LATAM1 | LATAM  | `"15/03/2026"` (DD/MM/YYYY)   |  Silent  | `null`                   | **Data loss — no error!**    |
| ws-5-A-LATAM2 | LATAM  | `"15-03-2026"` (DD-MM-YYYY)   |  Silent  | `null`                   | **Data loss — no error!**    |
| ws-5-A-LATAM3 | LATAM  | `"15.03.2026"` (DD.MM.YYYY)   |  Silent  | `null`                   | **Data loss — no error!**    |

## Results — Config C (DateTime, DataField6)

| ID            | Format | Input Sent                    | Accepted | Stored                   | Notes                     |
| ------------- | :----: | ----------------------------- | :------: | ------------------------ | ------------------------- |
| ws-5-C-ISO    |  ISO   | `"2026-03-15"`                |   Yes    | `"2026-03-15T00:00:00Z"` | Date-only → DateTime: T+Z |
| ws-5-C-US     |   US   | `"03/15/2026"`                |   Yes    | `"2026-03-15T00:00:00Z"` | US → DateTime: normalized |
| ws-5-C-DT     |   DT   | `"2026-03-15T14:30:00"`       |   Yes    | `"2026-03-15T14:30:00Z"` | Baseline; API adds Z      |
| ws-5-C-DTZ    |  DTZ   | `"2026-03-15T14:30:00Z"`      |   Yes    | `"2026-03-15T14:30:00Z"` | Z kept as-is              |
| ws-5-C-DTBRT  | DTBRT  | `"2026-03-15T14:30:00-03:00"` |   Yes    | `"2026-03-15T17:30:00Z"` | BRT offset → UTC (+3h)    |
| ws-5-C-DTIST  | DTIST  | `"2026-03-15T14:30:00+05:30"` |   Yes    | `"2026-03-15T09:00:00Z"` | IST offset → UTC (-5:30h) |
| ws-5-C-DB     |   DB   | `"3/15/2026 2:30:00 PM"`      |   Yes    | `"2026-03-15T14:30:00Z"` | DB format accepted        |
| ws-5-C-DTMS   |  DTMS  | `"2026-03-15T14:30:00.000Z"`  |   Yes    | `"2026-03-15T14:30:00Z"` | Milliseconds stripped     |
| ws-5-C-LATAM1 | LATAM  | `"15/03/2026"` (DD/MM/YYYY)   |  Silent  | `null`                   | **Data loss — no error!** |
| ws-5-C-LATAM2 | LATAM  | `"15-03-2026"` (DD-MM-YYYY)   |  Silent  | `null`                   | **Data loss — no error!** |

## Results — Additional Format Variants (Config A)

| ID           | Format | Input Sent         | Accepted | Stored                   | Notes                             |
| ------------ | :----: | ------------------ | :------: | ------------------------ | --------------------------------- |
| ws-5-A-YS    |   Y/   | `"2026/03/15"`     |   Yes    | `"2026-03-15T00:00:00Z"` | YYYY/MM/DD accepted               |
| ws-5-A-YD    |   Y.   | `"2026.03.15"`     |   Yes    | `"2026-03-15T00:00:00Z"` | YYYY.MM.DD accepted               |
| ws-5-A-USD   |  US-   | `"03-15-2026"`     |   Yes    | `"2026-03-15T00:00:00Z"` | MM-DD-YYYY accepted               |
| ws-5-A-ENG   |  Word  | `"March 15, 2026"` |   Yes    | `"2026-03-15T00:00:00Z"` | English month name accepted       |
| ws-5-A-EUR   |  Euro  | `"15 March 2026"`  |   Yes    | `"2026-03-15T00:00:00Z"` | European word format accepted     |
| ws-5-A-ABBR  |  Abbr  | `"15-Mar-2026"`    |   Yes    | `"2026-03-15T00:00:00Z"` | Abbreviated month accepted        |
| ws-5-A-COMP  |  Comp  | `"20260315"`       |  Silent  | `null`                   | Compact ISO fails silently        |
| ws-5-A-YRDM  | Y-D-M  | `"2026-15-03"`     |  Silent  | `null`                   | Invalid month 15; fails silently  |
| ws-5-A-AMBIG | Ambig  | `"05/03/2026"`     |   Yes    | `"2026-05-03T00:00:00Z"` | **Interpreted as May 3 (MM/DD)!** |

## Outcome

**23 PASS, 9 FAIL** — H-5 confirmed for ISO/US/DB/named formats. Bug #8 and Bug #8b discovered.

## Findings

### Server Format Behavior (all accepted formats)

1. **ISO date-only** (`"2026-03-15"`): Stored with T00:00:00Z appended. Works for both date-only and DateTime fields.
2. **US format** (`"03/15/2026"`): Parsed correctly, normalized to ISO. Both field types.
3. **ISO datetime** (`"2026-03-15T14:30:00"`): Z appended. Time preserved even in date-only fields (no server-side enforcement of enableTime=false).
4. **ISO datetime+Z** (`"2026-03-15T14:30:00Z"`): Stored as-is.
5. **ISO datetime+offset** (`"-03:00"`, `"+05:30"`): **Server converts offset to UTC**. BRT 14:30-03:00 → 17:30Z. IST 14:30+05:30 → 09:00Z. This is correct UTC conversion.
6. **DB format** (`"3/15/2026 12:00:00 AM"`): Parsed and normalized. VV recognizes its own DB format.
7. **ISO datetime+ms** (`".000Z"`): Milliseconds stripped in storage.

### Bug #8 — Silent Data Loss for DD/MM/YYYY Formats (NEW)

**Severity**: HIGH for Latin American developers.

All day-first formats (`15/03/2026`, `15-03-2026`, `15.03.2026`) are:

- **Accepted** by the API (HTTP 200, record created successfully)
- **Stored as `null`** — the date field is empty in the created record
- **No error message** in the response

The VV server's date parser does not recognize DD/MM/YYYY format. Since the day value (15) exceeds 12, it can't be ambiguously interpreted as MM/DD — the server simply fails to parse and silently stores nothing.

**Impact**: Scripts written by Latin American developers using local date conventions will silently lose date data. The API gives no indication of failure. For ambiguous dates (e.g., `03/05/2026` = March 5 or May 3?), the server likely interprets as MM/DD (US format) — potentially storing the wrong date without any error.

### Bug #8b — Ambiguous Date Misinterpretation

For ambiguous dates where day ≤ 12 (e.g., `"05/03/2026"`), the server always interprets as MM/DD (US) — storing May 3rd. A developer intending March 5th (DD/MM) gets the wrong date silently stored. No error, no warning.

### Key Insight: Config Flags are Invisible to API

Configs A (date-only) and C (DateTime) produce **identical stored results** for every format tested. The `enableTime` flag has zero effect on the API write path — the server stores whatever datetime string it can parse, regardless of field configuration.

### Format Acceptance Summary

| Category         | Formats                                                | Status          |
| ---------------- | ------------------------------------------------------ | --------------- |
| **ISO variants** | `YYYY-MM-DD`, `YYYY/MM/DD`, `YYYY.MM.DD`               | Accepted        |
| **US variants**  | `MM/DD/YYYY`, `MM-DD-YYYY`                             | Accepted        |
| **Named month**  | `"March 15, 2026"`, `"15 March 2026"`, `"15-Mar-2026"` | Accepted        |
| **DB format**    | `"3/15/2026 12:00:00 AM"`                              | Accepted        |
| **ISO datetime** | `T14:30:00`, `T14:30:00Z`, `T14:30:00.000Z`, offsets   | Accepted        |
| **DD/MM/YYYY**   | `15/03/2026`, `15-03-2026`, `15.03.2026`               | **Silent null** |
| **Compact**      | `20260315`                                             | **Silent null** |
| **Invalid**      | `2026-15-03` (month 15)                                | **Silent null** |
