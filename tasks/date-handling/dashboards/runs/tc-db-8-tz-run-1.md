# TC-DB-8-TZ — Run 1 | 2026-04-02 | PASS

**Spec**: [tc-db-8-tz.md](../test-cases/tc-db-8-tz.md) | **Summary**: [summary](../summaries/tc-db-8-tz.md)

## Environment

| Parameter      | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Date           | 2026-04-02                                                                  |
| Dashboard URL  | FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25 |
| Grid Component | Telerik RadGrid (server-rendered)                                           |
| Test Method    | Playwright headless Chrome (`explore-dashboard.js --compare`)               |
| Page Size      | 200                                                                         |
| Total Records  | 272                                                                         |
| TZ Contexts    | BRT (America/Sao_Paulo), IST (Asia/Calcutta), UTC0 (Etc/GMT)                |

## Step Results

| Step # | Expected                          | Actual                                    | Match |
| ------ | --------------------------------- | ----------------------------------------- | ----- |
| 1      | Dashboard loaded (BRT)            | Grid loaded, date values captured         | PASS  |
| 2      | Dashboard loaded (IST)            | Grid loaded, date values captured         | PASS  |
| 3      | Dashboard loaded (UTC0)           | Grid loaded, date values captured         | PASS  |
| 4      | All values identical across 3 TZs | 10 records × all fields: BRT ≡ IST ≡ UTC0 | PASS  |
| 5      | 0 mismatches                      | 0 mismatches                              | PASS  |

## Records Compared

| Record          | Fields with Values | BRT ≡ IST | BRT ≡ UTC0 |
| --------------- | :----------------: | :-------: | :--------: |
| DateTest-001081 |         2          |     ✓     |     ✓      |
| DateTest-001080 |         2          |     ✓     |     ✓      |
| DateTest-001079 |         1          |     ✓     |     ✓      |
| DateTest-001078 |         1          |     ✓     |     ✓      |
| DateTest-001077 |         4          |     ✓     |     ✓      |
| DateTest-001073 |         1          |     ✓     |     ✓      |
| DateTest-001072 |         1          |     ✓     |     ✓      |
| DateTest-001071 |         1          |     ✓     |     ✓      |
| DateTest-001070 |         1          |     ✓     |     ✓      |
| DateTest-001069 |         1          |     ✓     |     ✓      |

## Outcome

**PASS** — Browser timezone has zero effect on dashboard date values. BRT, IST, and UTC0 contexts produce byte-identical grid output for all 10 records across all date fields.

## Findings

- **TZ independence confirmed**: The dashboard is 100% server-side rendered — the browser's timezone (set via Playwright context `timezoneId`) has no effect on displayed values
- **Validates single-TZ testing**: All DB-1 through DB-7 tests correctly used a single TZ (BRT) since TZ is irrelevant for dashboard display
- **Architecture explanation**: Telerik RadGrid renders HTML on the ASP.NET server before sending to the browser. No client-side JavaScript date parsing occurs in the grid. The `timezoneId` Playwright option affects `Date.prototype.toString()` and similar JS APIs, but the grid cells contain pre-rendered text.
- **Consistent with preliminary result**: 2026-04-02 exploratory session confirmed BRT ≡ IST for DateTest-000472 and DateTest-000471 across 19 non-empty fields each. This formal test extends to 10 records × 3 TZs.
