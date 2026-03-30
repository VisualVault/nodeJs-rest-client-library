---
allowed-tools: Read, Edit, Write, Glob
description: Extract VV platform knowledge from this session and update docs/architecture/ and related docs.
---

# VV Platform Knowledge Sync

Scan the current conversation for anything new learned about the VisualVault platform — UI behavior, URL patterns, API quirks, field behavior, admin sections, scripting patterns, bugs, etc. — and persist it in the right documentation file.

## Step 1: Extract from conversation

Review the full conversation and identify insights about the VV platform that are worth persisting. Focus on things that aren't obvious from the code alone:

- URL patterns, GUIDs, section paths not yet documented
- UI behavior (how fields, forms, dashboards, or admin sections behave)
- API behavior (undocumented params, return shapes, edge cases)
- Bugs confirmed or ruled out
- How VV components connect to each other or to the Node.js server
- Configuration patterns (form field options, microservice settings, query caching, etc.)
- Cross-platform or cross-timezone behaviors
- Any corrections to what's already documented

If nothing new was learned about VV, stop here and say so.

## Step 2: Check existing docs

Read the files under `docs/` to understand what's already documented:

```
docs/architecture/visualvault-platform.md   ← URL structure, nav map, Enterprise Tools, nodeV2 integration
docs/README.md                              ← index of all docs
```

Read only what's relevant to decide where each insight belongs.

## Step 3: Route each insight to the right file

| Insight type                                                  | Target file                                         |
| ------------------------------------------------------------- | --------------------------------------------------- |
| URL patterns, navigation sections, GUIDs, environment anatomy | `docs/architecture/visualvault-platform.md`         |
| Form field behavior, field types, options, rendering quirks   | `docs/reference/form-fields.md` (create if needed)  |
| Scripting patterns, vvClient usage, script structure          | `docs/guides/scripting.md` (create if needed)       |
| Bugs, known issues, platform limitations                      | `docs/reference/known-issues.md` (create if needed) |
| General how-to for a VV workflow                              | `docs/guides/` (pick or create appropriate file)    |

When creating a new file, add it to `docs/README.md` under the right section.

## Step 4: Update docs

Write only what's new or corrects existing content. Rules:

- Do not duplicate what's already there
- Do not rewrite existing sections unless correcting an error
- Add new facts as new sections or bullet points within the right section
- If correcting something, update in place — don't append a correction note
- Keep the existing tone and format of each file

## Report

Briefly list what was added or corrected and in which files. If nothing was new, say: **No new VV platform knowledge to persist.**
