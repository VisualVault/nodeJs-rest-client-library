# TC-13-C-vs-D-storage — DB Storage: Config C stores real UTC, Config D stores local midnight; API path stores both uniformly

## Environment Specs

| Parameter          | Required Value                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------- |
| **Browser**        | N/A — REST API verification + Cat 3 browser evidence                                         |
| **Platform**       | VisualVault REST API (`getForms` endpoint) + Forms V1 browser evidence from Cat 3 run files  |
| **VV Code Path**   | V1 (`useUpdatedCalendarValueLogic = false`) for browser-saved records                        |
| **Target Records** | DateTest-001915 (WS-created) + Cat 3 browser-saved records (BRT, March 15 input)             |
| **Scope**          | Config C (DateTime, ignoreTZ=false) vs Config D (DateTime, ignoreTZ=true) storage comparison |

---

## Preconditions

**P1 — Ensure VV REST API access** via `run-ws-test.js` with valid `.env.json` credentials.

**P2 — Create a WS test record** with both Config C and D set to `2026-03-15` via `run-ws-test.js --action WS-1 --configs C,D --input-date 2026-03-15`.

**P3 — Read back the WS record** via `run-ws-test.js --action WS-2 --record-id <instanceName> --configs C,D --debug`.

**P4 — Cross-reference Cat 3 run files** for browser-saved raw values: `tc-3-C-BRT-BRT-run-4.md` and `tc-3-D-BRT-BRT-run-4.md`.

---

## Test Steps

| #   | Action                        | Test Data                                       | Expected Result                                                      | ✓   |
| --- | ----------------------------- | ----------------------------------------------- | -------------------------------------------------------------------- | --- |
| 1   | Complete setup                | See Preconditions P1–P4                         | API access confirmed; Cat 3 run files available                      | ☐   |
| 2   | WS record Config C            | DateTest-001915 field6 (API-written)            | `"2026-03-15T00:00:00Z"` — API stores midnight directly              | ☐   |
| 3   | WS record Config D            | DateTest-001915 field5 (API-written)            | `"2026-03-15T00:00:00Z"` — API stores midnight directly              | ☐   |
| 4   | Compare C vs D (API path)     | —                                               | C = D (API path stores uniformly, no config-specific transformation) | ☐   |
| 5   | Browser-saved Config C raw    | Cat 3 run file: `getValueObjectValue('Field6')` | `"2026-03-15T03:00:00.000Z"` — real UTC (BRT midnight = 03:00 UTC)   | ☐   |
| 6   | Browser-saved Config D raw    | Cat 3 run file: `getValueObjectValue('Field5')` | `"2026-03-15T00:00:00.000Z"` — local midnight with fake Z            | ☐   |
| 7   | Compare C vs D (browser path) | —                                               | C ≠ D — Config C stored 3 hours ahead of Config D for the same input | ☐   |

> **Two write paths, two outcomes**: The API write path (`postForms`) sends the date string directly — the server stores it without config-specific transformation. The browser save path passes through Forms Angular `getSaveValue()` which applies different logic: Config C (`ignoreTimezone=false`) stores `toISOString()` → real UTC; Config D (`ignoreTimezone=true`) strips Z → stores local time. This creates mixed timezone values in the same database table.

---

## Fail Conditions

**FAIL-1 (Browser path C ≠ D — expected, confirms mixed storage):**
Step 7 shows Config C stored `"2026-03-15T03:00:00.000Z"` while Config D stored `"2026-03-15T00:00:00.000Z"`.

- Interpretation: Mixed timezone storage confirmed at the DB level. Config C contains a real UTC timestamp (3 hours ahead of local midnight for BRT), while Config D contains local midnight with a misleading Z suffix. SQL queries cannot reliably compare or filter across these configs without knowing which code path stored the value.

**FAIL-2 (API path C ≠ D — unexpected):**
Steps 2–3 show different values for C and D via the API write path.

- Interpretation: The API server applies config-specific date transformation, contrary to expectations. Would mean the API path also contributes to mixed storage.

---

## Related

| Reference             | Location                                                             |
| --------------------- | -------------------------------------------------------------------- |
| Matrix row            | `../matrix.md` — row `13-C-vs-D-storage`                             |
| Cat 3-C-BRT-BRT run 4 | `../runs/tc-3-C-BRT-BRT-run-4.md` — browser-saved Config C raw value |
| Cat 3-D-BRT-BRT run 4 | `../runs/tc-3-D-BRT-BRT-run-4.md` — browser-saved Config D raw value |
| Companion: ws-input   | [`tc-13-ws-input.md`](tc-13-ws-input.md) — API path uniform storage  |
| Analysis              | `../analysis/overview.md` — mixed timezone storage section           |
