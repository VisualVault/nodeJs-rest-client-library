# TC-13-B-storage — DB Storage: Config B identical to Config A; ignoreTZ has no effect on date-only storage

## Environment Specs

| Parameter         | Required Value                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------- |
| **Browser**       | N/A — REST API verification                                                                  |
| **Platform**      | VisualVault REST API (`postForms` + `getForms` endpoints)                                    |
| **VV Code Path**  | N/A — API bypasses Forms client-side code paths                                              |
| **Target Record** | WS-created record with Configs A and B set to same input date via `postForms`                |
| **Scope**         | Config A (Field7: date-only, ignoreTZ=false) vs Config B (Field10: date-only, ignoreTZ=true) |

---

## Preconditions

**P1 — Ensure VV REST API access** via `run-ws-test.js` with valid `.env.json` credentials.

**P2 — Create a test record** with both Config A and Config B set to the same date (`2026-03-15`) via `run-ws-test.js --action WS-1 --configs A,B --input-date 2026-03-15`.

**P3 — Read back the created record** via `run-ws-test.js --action WS-2 --record-id <instanceName> --configs A,B --debug`.

---

## Test Steps

| #   | Action                       | Test Data                 | Expected Result                                                          | ✓   |
| --- | ---------------------------- | ------------------------- | ------------------------------------------------------------------------ | --- |
| 1   | Complete setup               | See Preconditions P1–P3   | WS-1 creates record; WS-2 reads it back successfully                     | ☐   |
| 2   | Verify Config A stored value | field7 from API response  | `"2026-03-15T00:00:00Z"` — date-only stored as midnight                  | ☐   |
| 3   | Verify Config B stored value | field10 from API response | `"2026-03-15T00:00:00Z"` — identical to Config A                         | ☐   |
| 4   | Compare A vs B               | —                         | Values are byte-identical; `ignoreTZ` has no effect on date-only storage | ☐   |

> **Storage path**: Both Config A and Config B go through the same API write path. For date-only fields (`enableTime=false`), the `ignoreTimezone` flag has no observable effect — both store the date as midnight without timezone conversion.

---

## Fail Conditions

**FAIL-1 (B differs from A):**
Config B (field10) returns a different value than Config A (field7) — e.g., a time offset or different date.

- Interpretation: `ignoreTimezone` unexpectedly affects date-only storage. Review the API serialization layer for Config-B-specific handling.

---

## Related

| Reference                 | Location                                                                          |
| ------------------------- | --------------------------------------------------------------------------------- |
| Matrix row                | `../matrix.md` — row `13-B-storage`                                               |
| Companion: initial-values | [`tc-13-initial-values.md`](tc-13-initial-values.md) — UTC storage for presets    |
| Companion: user-input     | [`tc-13-user-input.md`](tc-13-user-input.md) — local time storage                 |
| Companion: C-vs-D-storage | [`tc-13-C-vs-D-storage.md`](tc-13-C-vs-D-storage.md) — DateTime config divergence |
