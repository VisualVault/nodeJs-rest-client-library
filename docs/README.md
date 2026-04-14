# Documentation

Shared documentation for the VisualVault platform — architecture, standards, guides, and reference material.

## Structure

```
docs/
  architecture/          # Platform architecture, component diagrams, data flow
  standards/             # Coding standards, patterns, conventions
  guides/                # How-to guides, onboarding, troubleshooting
  reference/             # API reference, config options, field types
```

## Contents

### Architecture

- [visualvault-platform.md](architecture/visualvault-platform.md) — URL structure, navigation map, admin tools, user menu, Enterprise Tools, FormsAPI, authentication, version/build discovery, service architecture (per-service behavioral config, FormSettings), dual-app UI framework stack (admin ASP.NET + FormViewer Angular detection), REST API resources, localization API, FormViewer feature map, document index field date handling, auto-save finding, demo + WADNR environment references, Form Designer URL/workflow, template revision lifecycle

### Standards

- [bug-report-standard.md](standards/bug-report-standard.md) — Bug report structure, writing principles, severity levels, companion doc format, field configuration appendix pattern
- [form-template-standard.md](standards/form-template-standard.md) — 18 atomic form template standards (naming, accessibility, tab order, calendar config, script hygiene, orphan refs) with pass/fail definitions

### Guides

- [dev-setup.md](guides/dev-setup.md) — **Canonical setup guide** — environment setup, Playwright, credentials, code quality, troubleshooting
- [playwright-testing.md](guides/playwright-testing.md) — Playwright patterns, architecture, extension guide
- [scripting.md](guides/scripting.md) — Node.js server data flow, script contracts, API field casing, date passthrough behavior, FormsAPI access, `response.json()` vs `postCompletion()` execution flow

### Reference

- [form-fields.md](reference/form-fields.md) — Calendar field config properties, popup modal behavior, V1/V2 code path, VV.Form console API, known bugs summary
- [vv-form-api.md](reference/vv-form-api.md) — Full VV.Form object structure: properties, methods, sub-objects, field definitions, automation patterns
- [api-date-patterns.md](reference/api-date-patterns.md) — Correct datetime handling for web services: CSV imports, TZ offsets, safe patterns, common pitfalls
- [form-template-xml.md](reference/form-template-xml.md) — Form template XML export format: field types, groups/conditions, script library, built-in control GUIDs
