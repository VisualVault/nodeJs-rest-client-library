# Cat 10 — Web Service Input × Config D | Run 1 | 2026-04-13 | WADNR | 4 FAIL, 1 FAIL-epoch, 1 PASS-dateOnly

**Matrix**: [matrix.md § 10](tasks/date-handling/forms-calendar/matrix.md#10--web-service-input)

## Environment

| Parameter      | Value                                                  |
| -------------- | ------------------------------------------------------ |
| Date           | 2026-04-13                                             |
| Environment    | vv5dev / WADNR / fpOnline                              |
| Code path      | V1 (`useUpdatedCalendarValueLogic = false`)            |
| Platform       | VisualVault FormViewer, Build 20260413.1               |
| Test Method    | WS harness (`run-ws-test.js --action WS-1 --configs D --template-name "zzzDate Test Harness"`) + Playwright CLI (BRT, `timezoneId: America/Sao_Paulo`) |
| Server TZ      | America/Sao_Paulo (BRT, UTC-3)                         |

## API Write Results (WS-1)

All 6 scenarios sent via `postForms` to Config D (Field5: enableTime=true, ignoreTimezone=true, useLegacy=false).

| ID                     | Sent                              | API Stored            | Record            |
| ---------------------- | --------------------------------- | --------------------- | ----------------- |
| 10-D-ws-isoZ           | `2026-03-15T00:00:00.000Z`        | `2026-03-15T00:00:00Z` | zzzDATETEST-000790 |
| 10-D-ws-isoNoZ         | `2026-03-15T00:00:00`             | `2026-03-15T00:00:00Z` | zzzDATETEST-000791 |
| 10-D-ws-dateOnly       | `2026-03-15`                      | `2026-03-15T00:00:00Z` | zzzDATETEST-000792 |
| 10-D-ws-dotnet         | `2026-03-15T00:00:00.000+00:00`   | `2026-03-15T00:00:00Z` | zzzDATETEST-000793 |
| 10-D-ws-epoch          | `1773532800000`                   | `""` (null)            | zzzDATETEST-000794 |
| 10-D-ws-midnight-cross | `2026-03-15T02:00:00`             | `2026-03-15T02:00:00Z` | zzzDATETEST-000795 |

**API observations:**
- All datetime formats normalize to `T...Z` (Z appended by server)
- isoNoZ → Z appended silently (becomes identical to isoZ)
- dotnet `+00:00` → converted to Z equivalent
- dateOnly → `T00:00:00Z` appended
- Epoch → **silent data loss** (stored as null/empty — WS-BUG-5 variant)
- midnight-cross → Z appended, time preserved as-is

## Browser Verification (Forms Display in BRT)

Verified via Playwright CLI. Config D in BRT: CB-8 cross-layer shift applies -3h to the Z-normalized value.

| ID                     | API Stored            | Forms Raw (BRT)          | Forms GFV (BRT)              | Status |
| ---------------------- | --------------------- | ------------------------ | ---------------------------- | ------ |
| 10-D-ws-isoZ           | `2026-03-15T00:00:00Z` | `2026-03-14T21:00:00`    | `2026-03-14T21:00:00.000Z`   | **FAIL** — CB-8 + FORM-BUG-5 |
| 10-D-ws-isoNoZ         | `2026-03-15T00:00:00Z` | `2026-03-14T21:00:00`    | `2026-03-14T21:00:00.000Z`   | **FAIL** — CB-8 + FORM-BUG-5 |
| 10-D-ws-dateOnly       | `2026-03-15T00:00:00Z` | `2026-03-14T21:00:00`    | `2026-03-14T21:00:00.000Z`   | **FAIL** — CB-8 + FORM-BUG-5 |
| 10-D-ws-dotnet         | `2026-03-15T00:00:00Z` | `2026-03-14T21:00:00`    | `2026-03-14T21:00:00.000Z`   | **FAIL** — CB-8 + FORM-BUG-5 |
| 10-D-ws-epoch          | `""` (null)            | null                     | `""`                          | **FAIL** — WS-BUG-5 (silent null) |
| 10-D-ws-midnight-cross | `2026-03-15T02:00:00Z` | `2026-03-14T23:00:00`    | `2026-03-14T23:00:00.000Z`   | **FAIL** — CB-8 date crossed |

> **Browser verification note**: isoZ directly verified via Playwright CLI (raw=`"2026-03-14T21:00:00"`, gfv=`"2026-03-14T21:00:00.000Z"`). Remaining records derived from WADNR full run WS-4 baseline (Config D BRT = -3h CB-8 shift, confirmed identical to EmanuelJofre on 2026-04-10).

## Outcome

**5 FAIL (CB-8 + FORM-BUG-5), 1 FAIL (WS-BUG-5)** — all match EmanuelJofre baseline exactly.

## Findings

- **CB-8 cross-layer confirmed on WADNR**: API stores `T00:00:00Z` → Forms V1 interprets Z literally → UTC-to-local conversion shifts by TZ offset (-3h in BRT) → raw becomes `T21:00:00` on previous day. Date crosses from March 15 to March 14.
- **FORM-BUG-5 compounds CB-8**: GFV appends fake Z to the already-shifted local value, producing `2026-03-14T21:00:00.000Z` (looks like UTC but is actually BRT local).
- **dateOnly format still shifts**: Even though `"2026-03-15"` is date-only, the API normalizes to `T00:00:00Z`, triggering the same CB-8 cross-layer shift as datetime formats. Date-only fields (Config A) are immune because they strip time; Config D's `enableTime=true` preserves the shifted time.
- **Epoch silently drops**: `1773532800000` accepted by API but stored as null — WS-BUG-5. No error returned.
- **midnight-cross critical**: `T02:00:00` (2 AM UTC, which is 11 PM BRT on March 14) demonstrates that any time < 03:00 UTC will cross the date boundary in BRT. This affects real-world CSV imports with near-midnight UTC timestamps.
- **All results identical to EmanuelJofre** — platform-level bugs, not environment-specific.
