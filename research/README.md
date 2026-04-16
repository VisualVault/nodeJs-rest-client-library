# Research — Cross-Cutting Investigations

Organized workspace for VisualVault platform investigations, testing, and analysis.

## Structure

```
research/
  <task-name>/           # One folder per active investigation
    analysis.md          # Problem analysis, code review, root cause investigation
    test-results.md      # Live test evidence, browser testing logs, DB verification
    plan.md              # Implementation plan, approach decisions
    notes.md             # Working notes, meeting context, decisions
    scripts/             # Test scripts, automation, reproduction steps
  _archive/              # Completed investigations (preserved for reference)
```

## Active

| Task                                          | Status      | Description                                                                              |
| --------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------- |
| [date-handling](date-handling/)               | In Progress | Cross-platform date handling bug investigation — Forms, Web Services, Dashboards         |
| [form-templates](form-templates/)             | Active      | VV form template XML analysis, format documentation, and improved template generation    |
| [extract-optimization](extract-optimization/) | Active      | Extract pipeline speed + reliability — parallel extraction, revision tracking, API-first |
| [standards-review](standards-review/)         | In Progress | Deterministic standards compliance tool for VV components (form templates first)         |

## Complete

| Task                                                       | Description                                                                             |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [ws-naming](_archive/ws-naming/)                           | Web service naming — valid character investigation (`_`, `-` confirmed safe)            |
| [scheduled-process-logs](_archive/scheduled-process-logs/) | SP execution mechanics: response.json vs postCompletion, platform timeout, log behavior |
| [unrelate-forms](_archive/unrelate-forms/)                 | Client-side UnrelateForm script — API verification and reusable global function         |

> **Note:** Customer-specific project work (exports, impact analysis) lives in `projects/`. See [projects/wadnr/](../projects/wadnr/) for the WADNR project.
