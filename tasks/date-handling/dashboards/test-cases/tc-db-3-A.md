# TC-DB-3-A — Config A, Wrong Date Detection: Bug #7 stores 3/14 instead of 3/15

## Environment Specs

| Parameter          | Value                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| **Browser**        | Google Chrome, latest stable                                                  |
| **Dashboard URL**  | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component** | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Relevance**   | None — server-rendered values are TZ-independent                              |
| **Target Field**   | `Field7` — Config A (`enableTime=false, ignoreTZ=false, useLegacy=false`)     |
| **Bug Under Test** | Bug #7 — date-only fields store wrong day for UTC+ timezones                  |

## Preconditions

P1 — Create a test record via WS-1 API with Bug #7 simulated value:

```bash
node testing/scripts/run-ws-test.js --action WS-1 --configs A --input-date "2026-03-14"
```

The value `"2026-03-14"` represents what Bug #7 stores when a UTC+5:30 (IST) user intends `"2026-03-15"`. Bug #7 mechanism: `moment("2026-03-15").toDate()` at IST midnight = `2026-03-14T18:30:00Z` → `getSaveValue()` extracts UTC date → `"2026-03-14"`.

P2 — Open the DateTest Dashboard and verify the record appears.

P3 — Set page size to 200 if needed.

## Test Steps

| #   | Action                | Test Data                        | Expected Result                                       | ✓   |
| --- | --------------------- | -------------------------------- | ----------------------------------------------------- | --- |
| 1   | Complete setup        | See Preconditions P1–P3          | Dashboard loaded, test record visible                 | ☐   |
| 2   | Read Field7 grid cell | DateTest-001077, column "Field7" | `3/14/2026` — shifted date (intended 3/15, Bug #7 -1) | ☐   |

## Fail Conditions

1. **FAIL-1 (Correct date shown):** Field7 shows `3/15/2026` instead of `3/14/2026`.
    - Interpretation: Bug #7 has been fixed upstream, or the server is correcting the stored value during rendering. Re-verify the stored value via API.

## Related

| Reference              | Location                                      |
| ---------------------- | --------------------------------------------- |
| Matrix row             | `matrix.md` — row `db-3-A`                    |
| Run history            | `summaries/tc-db-3-A.md`                      |
| Bug analysis           | `analysis.md` § 3 (Bug #7 — Wrong Date)       |
| Bug #7 mechanism       | `../forms-calendar/analysis.md` § Bug #7      |
| Cross-reference (DB-2) | `test-cases/tc-db-2-A.md` — accuracy baseline |
