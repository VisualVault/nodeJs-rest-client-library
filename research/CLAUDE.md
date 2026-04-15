# Tasks — Cross-Cutting Investigations

Platform-level investigations that apply to any VV environment. Each task gets its own subfolder with analysis and methodology.

## What Belongs Here

Tasks hold **platform truth** — content that is true regardless of which customer or environment you're looking at.

| Content                                      | Example                                    |
| -------------------------------------------- | ------------------------------------------ |
| `analysis/` (bug reports, RCA, fix strategy) | "FORM-BUG-5 adds a fake Z suffix"          |
| `matrix.md` (methodology + expected values)  | Test slot definitions, expected behavior   |
| `test-cases/` (TC specifications)            | Reproducible specs anyone can run anywhere |

Everything here is **shared** (pushed to team repo).

## What Does NOT Belong Here

Execution output bound to a specific customer or environment — actual observed values, record IDs, execution timestamps, pass/fail status. These go in `projects/{customer}/testing/{task}/{component}/`.

| Artifact type    | Location                                                    |
| ---------------- | ----------------------------------------------------------- |
| Run files        | `projects/{customer}/testing/{task}/{component}/runs/`      |
| Per-task rollup  | `projects/{customer}/testing/{task}/status.md`              |
| Per-env status   | `projects/{customer}/testing/{task}/{component}/status.md`  |
| Session evidence | `projects/{customer}/testing/{task}/{component}/results.md` |
| Customer impact  | `projects/{customer}/analysis/`                             |

## Active Tasks

| Task                      | Description                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `date-handling/`          | Cross-platform date bug investigation (Forms, WS, Dashboards, Document Library) — 16 confirmed bugs    |
| `form-templates/`         | VV form template XML analysis, format documentation, template generation                               |
| `extract-optimization/`   | Extract pipeline speed + reliability — parallel extraction, revision tracking, API-first               |
| `ws-naming/`              | Web service naming — valid character investigation (`_`, `-`, special chars)                           |
| `scheduled-process-logs/` | Scheduled process execution mechanics: response.json vs postCompletion, platform timeout, log behavior |
| `standards-review/`       | Deterministic standards compliance tool for VV components (form templates, web services, dashboards)   |
