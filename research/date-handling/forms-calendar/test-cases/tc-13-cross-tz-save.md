# TC-13-cross-tz-save — DB Storage: BRT vs IST save produces different values for date-only fields (FORM-BUG-7)

## Environment Specs

| Parameter          | Required Value                                                                    |
| ------------------ | --------------------------------------------------------------------------------- |
| **Browser**        | N/A — REST API verification                                                       |
| **Platform**       | VisualVault REST API (`getForms` endpoint)                                        |
| **VV Code Path**   | N/A — API read-only; original save was via Forms V1 from BRT and IST browsers     |
| **Target Records** | DateTest-000080 (saved from BRT) and DateTest-000084 (saved from IST)             |
| **Scope**          | Config A (date-only) and Config D (DateTime+ignoreTZ) cross-TZ storage comparison |

---

## Preconditions

**P1 — Ensure VV REST API access** via `run-ws-test.js` with valid `.env.json` credentials.

**P2 — Verify test records exist**: DateTest-000080 (BRT-saved, Config A+D set to March 15, 2026) and DateTest-000084 (IST-saved, Config A+D set to March 15, 2026).

**P3 — Read both records** via `run-ws-test.js --action WS-2 --record-id DateTest-000080 --configs A,D --debug` and same for DateTest-000084.

---

## Test Steps

| #   | Action                      | Test Data               | Expected Result                                                 | ✓   |
| --- | --------------------------- | ----------------------- | --------------------------------------------------------------- | --- |
| 1   | Complete setup              | See Preconditions P1–P3 | Both records readable via API                                   | ☐   |
| 2   | BRT record Config A         | 000080 field7           | `"2026-03-15T00:00:00Z"` — date stored correctly from BRT       | ☐   |
| 3   | IST record Config A         | 000084 field7           | `"2026-03-15T00:00:00Z"` — same date, same storage              | ☐   |
| 4   | Compare Config A across TZs | —                       | BRT = IST (same logical date → same DB value)                   | ☐   |
| 5   | BRT record Config D         | 000080 field5           | `"2026-03-15T00:00:00Z"` — DateTime + ignoreTZ from BRT         | ☐   |
| 6   | IST record Config D         | 000084 field5           | `"2026-03-15T00:00:00Z"` — DateTime + ignoreTZ from IST         | ☐   |
| 7   | Compare Config D across TZs | —                       | BRT = IST (Config D immune to TZ-dependent storage differences) | ☐   |

---

## Fail Conditions

**FAIL-1 (Config A TZ divergence — FORM-BUG-7):**
IST record Config A returns `"2026-03-14T00:00:00Z"` instead of `"2026-03-15T00:00:00Z"`.

- Interpretation: FORM-BUG-7 (date-only local midnight parsing) shifted the date by -1 day when saved from IST (UTC+5:30). IST midnight March 15 = March 14 18:30 UTC; `moment("2026-03-15").toDate()` → local midnight IST → `toISOString()` yields March 14 → `getSaveValue()` stores March 14. The same user action (selecting March 15) produces different DB values depending on the browser's timezone.

**FAIL-2 (Config D TZ divergence):**
IST record Config D returns a different value than BRT record Config D.

- Interpretation: Unexpected — Config D (`ignoreTimezone=true`) should store local midnight as-is without UTC conversion. If divergence appears, `getSaveValue()` may have a TZ-dependent path for DateTime configs.

---

## Related

| Reference                    | Location                                                                  |
| ---------------------------- | ------------------------------------------------------------------------- |
| Matrix row                   | `../matrix.md` — row `13-cross-tz-save`                                   |
| FORM-BUG-7 analysis          | `../analysis/bug-7.md`                                                    |
| Cat 3 cross-TZ tests         | TC-3-A-BRT-IST, TC-3-A-IST-BRT — browser-side cross-TZ verification       |
| Companion: query-consistency | [`tc-13-query-consistency.md`](tc-13-query-consistency.md) — query impact |
