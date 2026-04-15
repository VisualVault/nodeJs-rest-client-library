# TC-13-ws-input — DB Storage: API write path stores all configs uniformly; no C/D divergence via postForms

## Environment Specs

| Parameter         | Required Value                                                                       |
| ----------------- | ------------------------------------------------------------------------------------ |
| **Browser**       | N/A — REST API verification                                                          |
| **Platform**      | VisualVault REST API (`postForms` + `getForms` endpoints)                            |
| **VV Code Path**  | N/A — API bypasses Forms client-side code paths                                      |
| **Target Record** | WS-created record with Configs A, B, C, D all set to same input date via `postForms` |
| **Scope**         | All 4 modern configs (A–D) to verify uniform storage via API write path              |

---

## Preconditions

**P1 — Ensure VV REST API access** via `run-ws-test.js` with valid `.env.json` credentials.

**P2 — Create a test record** with all 4 configs set to the same date (`2026-03-15`) via `run-ws-test.js --action WS-1 --configs A,B,C,D --input-date 2026-03-15`.

**P3 — Read back the created record** via `run-ws-test.js --action WS-2 --record-id <instanceName> --configs A,B,C,D --debug`.

---

## Test Steps

| #   | Action                       | Test Data                 | Expected Result                                                              | ✓   |
| --- | ---------------------------- | ------------------------- | ---------------------------------------------------------------------------- | --- |
| 1   | Complete setup               | See Preconditions P1–P3   | WS-1 creates record; WS-2 reads it back successfully                         | ☐   |
| 2   | Verify Config A stored value | field7 from API response  | `"2026-03-15T00:00:00Z"` — date-only via API                                 | ☐   |
| 3   | Verify Config B stored value | field10 from API response | `"2026-03-15T00:00:00Z"` — date-only + ignoreTZ via API                      | ☐   |
| 4   | Verify Config C stored value | field6 from API response  | `"2026-03-15T00:00:00Z"` — DateTime via API                                  | ☐   |
| 5   | Verify Config D stored value | field5 from API response  | `"2026-03-15T00:00:00Z"` — DateTime + ignoreTZ via API                       | ☐   |
| 6   | Compare all configs          | —                         | All 4 values identical; API path stores dates uniformly regardless of config | ☐   |

> **Key distinction**: The API write path (`postForms`) sends the date string directly to the server without passing through the Forms Angular `getSaveValue()` pipeline. This means no `toISOString()` conversion for Config C and no Z-stripping for Config D — the API normalizes all inputs to the same format. This contrasts with browser-saved records where Config C stores real UTC (e.g., `T03:00:00` for BRT midnight) and Config D stores local midnight (`T00:00:00`).

---

## Fail Conditions

**FAIL-1 (Configs diverge via API path):**
Any config returns a different timestamp than the others — e.g., Config C returns `"2026-03-15T03:00:00Z"`.

- Interpretation: The API server is applying config-specific date transformation (similar to Forms `getSaveValue()`). This would mean the API path also contributes to mixed timezone storage. Review the `postForms` endpoint handler.

---

## Related

| Reference                 | Location                                                                       |
| ------------------------- | ------------------------------------------------------------------------------ |
| Matrix row                | `../matrix.md` — row `13-ws-input`                                             |
| Companion: C-vs-D-storage | [`tc-13-C-vs-D-storage.md`](tc-13-C-vs-D-storage.md) — browser path divergence |
| WS-1 test category        | `../../web-services/matrix.md` — WS-1 (API Set Date)                           |
| WS-2 test category        | `../../web-services/matrix.md` — WS-2 (API Get Date)                           |
