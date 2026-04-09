# Tasks — Cross-Cutting Investigations

Platform-level investigations that apply to any VV environment. Each task gets its own subfolder with analysis, methodology, and test evidence.

## Sharing Rules

Tasks produce both **shared** and **personal** artifacts:

| Content                                      | Shared? | Reason                                                       |
| -------------------------------------------- | ------- | ------------------------------------------------------------ |
| `analysis/` (bug reports, RCA, fix strategy) | Yes     | Platform knowledge — true for all environments               |
| `matrix.md` (test methodology)               | Yes     | Reproducible coverage tracker                                |
| `test-cases/` (TC specifications)            | Yes     | Anyone can run these                                         |
| `runs/` (execution records)                  | **No**  | Reference environment-specific data (record IDs, timestamps) |
| `summaries/` (per-TC status)                 | **No**  | Personal tracking state                                      |
| `results.md` (raw evidence)                  | **No**  | Raw session evidence                                         |

## Relationship to Projects

Tasks hold **platform truth** ("FORM-BUG-5 adds a fake Z"). Projects hold **customer-specific impact** ("WADNR has 119 Config B fields exposed"). When an investigation reveals customer impact, the assessment goes in `projects/{customer}/analysis/`, not in the task folder.

## Active Tasks

| Task                   | Description                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `date-handling/`       | Cross-platform date bug investigation (Forms, WS, Dashboards) — 14 confirmed bugs       |
| `form-templates/`      | VV form template XML analysis, format documentation, template generation                |
| `export-optimization/` | Export pipeline speed + reliability — parallel extraction, revision tracking, API-first |
