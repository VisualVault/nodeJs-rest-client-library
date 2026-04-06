# TC-DB-3-H — Config H, Wrong Date Detection: legacy popup UTC storage unaffected by ignoreTZ

## Environment Specs

| Parameter          | Value                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| **Browser**        | Google Chrome, latest stable                                                  |
| **Dashboard URL**  | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component** | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Relevance**   | None — server-rendered values are TZ-independent                              |
| **Target Field**   | `Field13` — Config H (`enableTime=true, ignoreTZ=true, useLegacy=true`)       |
| **Bug Under Test** | Legacy popup UTC storage — `ignoreTZ=true` provides no protection             |

## Preconditions

P1 — Create a test record via WS-1 API with legacy IST popup simulated value:

```bash
node testing/scripts/run-ws-test.js --action WS-1 --configs H --input-date "2026-03-14T18:30:00"
```

P2 — Open the DateTest Dashboard and verify the record appears.

## Test Steps

| #   | Action                 | Test Data                         | Expected Result                                             | ✓   |
| --- | ---------------------- | --------------------------------- | ----------------------------------------------------------- | --- |
| 1   | Complete setup         | See Preconditions P1–P2           | Dashboard loaded, test record visible                       | ☐   |
| 2   | Read Field13 grid cell | DateTest-001081, column "Field13" | `3/14/2026 6:30 PM` — identical to Config G, ignoreTZ inert | ☐   |

## Fail Conditions

1. **FAIL-1 (Correct date shown):** Field13 shows `3/15/2026` with any time.
    - Interpretation: Legacy popup behavior changed, or `ignoreTZ=true` now affects storage.

## Related

| Reference                | Location                                       |
| ------------------------ | ---------------------------------------------- |
| Matrix row               | `matrix.md` — row `db-3-H`                     |
| Run history              | `summaries/tc-db-3-H.md`                       |
| Bug analysis             | `analysis.md` § 3 (Bug Surface in Dashboards)  |
| Cross-reference (DB-3-G) | `test-cases/tc-db-3-G.md` — same bug, Config G |
