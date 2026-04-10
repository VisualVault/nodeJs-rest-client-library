# WS-9 — Batch Run 1 | 2026-04-02 | BRT+IST+UTC | 17 PASS, 6 FAIL

**Matrix**: [matrix.md](../matrix.md) | **Analysis**: [analysis.md](../analysis.md)

## Environment

| Parameter      | Value                                                       |
| -------------- | ----------------------------------------------------------- |
| Date           | 2026-04-02                                                  |
| Execution Mode | Script (`run-ws-test.js`) with `TZ=` env var per invocation |
| Server TZs     | BRT (`America/Sao_Paulo`), IST (`Asia/Calcutta`), UTC       |

## Results — TZ Safety Classification

### TZ-Safe Patterns (produce identical stored values in all TZs)

| Pattern            | Code                            | Serialized                   | Stored                   | Why safe                                     |
| ------------------ | ------------------------------- | ---------------------------- | ------------------------ | -------------------------------------------- |
| **ISO parse**      | `new Date("2026-03-15")`        | `"2026-03-15T00:00:00.000Z"` | `"2026-03-15T00:00:00Z"` | ISO date-only → UTC midnight (spec behavior) |
| **Date.UTC()**     | `new Date(Date.UTC(2026,2,15))` | `"2026-03-15T00:00:00.000Z"` | `"2026-03-15T00:00:00Z"` | Explicit UTC construction                    |
| **UTC arithmetic** | `setUTCDate(getUTCDate()+30)`   | `"2026-04-14T00:00:00.000Z"` | `"2026-04-14T00:00:00Z"` | UTC methods avoid local TZ                   |
| **Safe string**    | `toISOString().split('T')[0]`   | `"2026-04-14"`               | `"2026-04-14T00:00:00Z"` | Extracts UTC date as string                  |

### TZ-Unsafe Patterns (produce different stored values per TZ)

| Pattern                                     | BRT serialized         | IST serialized         | UTC serialized   | Problem                               |
| ------------------------------------------- | ---------------------- | ---------------------- | ---------------- | ------------------------------------- |
| **US parse** `new Date("03/15/2026")`       | `T03:00:00.000Z`       | `Mar14 T18:30:00.000Z` | `T00:00:00.000Z` | Local midnight varies                 |
| **Constructor parts** `new Date(2026,2,15)` | `T03:00:00.000Z`       | `Mar14 T18:30:00.000Z` | `T00:00:00.000Z` | Same as US                            |
| **toLocaleDateString**                      | `"3/14/2026"` (wrong!) | `"3/15/2026"`          | `"3/15/2026"`    | UTC midnight = prev local day in UTC- |

### Local Arithmetic — Coincidentally Safe for ISO Base

| TZ  | `getDate()` on `new Date("2026-03-15")`         | `setDate(getDate()+30)` → toJSON | Same result? |
| --- | ----------------------------------------------- | -------------------------------- | :----------: |
| BRT | 14 (prev day: UTC midnight = Mar 14 9pm BRT)    | `setDate(44)` → Apr 14 T00:00Z   |     Yes      |
| IST | 15 (same day: UTC midnight = Mar 15 5:30am IST) | `setDate(45)` → Apr 14 T00:00Z   |     Yes      |
| UTC | 15                                              | `setDate(45)` → Apr 14 T00:00Z   |     Yes      |

All three produce April 14 — but by different paths! BRT: day 14 + 30 = 44 → Apr 13 + overflow = Apr 14. IST: day 15 + 30 = 45 → Apr 14. This is coincidence, not safety. With a different base time, BRT and IST would diverge.

## Outcome

**17 PASS, 6 FAIL** — H-11 and H-12 confirmed.

## Findings

1. **H-11 confirmed**: Date objects serialized with Z suffix are stored correctly. The server handles the `.000Z` milliseconds by stripping them.

2. **H-12 confirmed**: `new Date("03/15/2026")` produces different UTC values per TZ — IST stores previous day (`2026-03-14`), BRT stores correct day but wrong time (`T03:00:00Z`).

3. **`new Date(year, month, day)` is equally unsafe**: Same behavior as US format — creates local midnight, which serializes to different UTC values per TZ.

4. **`toLocaleDateString()` hazard**: For UTC-negative timezones (BRT), a Date at UTC midnight shows the previous calendar day locally. `toLocaleDateString('en-US')` returns `"3/14/2026"` in BRT for a March 15 UTC date — storing the wrong date.

5. **Local `setDate(getDate()+30)` is accidentally safe for ISO-parsed dates**: Because `new Date("2026-03-15")` is UTC midnight, the `setDate()` overflow arithmetic happens to produce the same UTC result in all tested TZs. This is NOT guaranteed for non-midnight base times.

6. **Recommended patterns for production scripts**:
    - Always use `new Date("ISO-string")` (not US format or constructor parts)
    - Use `Date.UTC()` for explicit UTC construction
    - Use `setUTCDate/getUTCDate` for arithmetic (not `setDate/getDate`)
    - Use `toISOString().split('T')[0]` to extract date strings (not `toLocaleDateString`)
    - Never pass Date objects directly to the API when timezone matters — convert to string first
