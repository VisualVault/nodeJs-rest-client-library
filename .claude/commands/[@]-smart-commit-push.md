---
allowed-tools: Bash, Git(git commit:*)
description: Analyze pending changes, create, and push atomic commits.
---

# Smart Commit-Push

Follow the `Workflow` creating tasks with TodoWrite for each workflow step to intelligently analyze pending changes and create atomic commits with clear, descriptive messages.

## Workflow

1. **Collect Changes**: Gather all staged, unstaged, and untracked files
2. **Classify Sharing**: Classify each changed file as **shared** or **personal** using the Sharing Rules below
3. **Analysis**: Analyze the changes contextually to understand relationships
4. **Group Formation**: Create logical commit groups based on features and dependencies following the `Grouping Principles`. Keep shared and personal artifacts in separate commits.
5. **Message Generation**: Generate clear, descriptive commit messages following the `Message Style Guidelines`. Personal commits get a `[personal]` prefix.
6. **Execute Commits**: Create the commits (shared first, personal second)
7. **Push Check**: Before pushing, identify the target remote and apply Sharing Rules
8. **Push Changes**: Push to the remote repository, respecting sharing boundaries

## Sharing Rules

This repo uses a three-tier Git model (see CLAUDE.md § "Repository Architecture & Sharing Model"). Files are classified as:

### Personal (never push to shared team repo)

| Pattern     | Reason                                                |
| ----------- | ----------------------------------------------------- |
| `projects/` | Customer/env-bound data (extracts, testing, analysis) |
| `.env.json` | Machine-specific credentials (already gitignored)     |

### Shared (safe to push to team repo)

Everything else: `lib/`, `docs/`, `scripts/`, `tools/`, `testing/`, `tasks/` (analysis, matrix, test-cases), config files, CLAUDE.md.

### Push Behavior

Before pushing, check the target remote:

```bash
git remote get-url origin
```

- If `origin` points to **`emanueljofre/nodeV2`** (the shared team repo):
    - Only push **shared** commits
    - If personal commits exist, warn: "Skipping N personal commit(s) — push these to your private remote instead"
    - List the skipped commits
- If `origin` points to a **private repo**:
    - Push all commits (shared + personal)
- If unsure, **ask the user** before pushing

## Grouping Principles

1. **Sharing boundary first**: Never mix shared and personal files in the same commit
2. **Feature Completeness**: Group related files that implement a complete feature together
3. **Test Integration**: Keep test files with their corresponding implementation files
4. **Documentation**: Group documentation updates with the features they document, or separately if standalone
5. **Configuration**: Keep configuration changes in separate commits unless directly tied to a feature
6. **Dependencies**: Group files that depend on each other functionally

## Message Style Guidelines

- Use clear, descriptive language that explains what changed
- Start with an action verb (Add, Update, Fix, Remove, Refactor, etc.)
- Personal commits: prefix with `[personal]` (e.g., `[personal] Add WS-2 run files for BRT regression`)
- Be specific about what was modified or implemented
- Keep messages concise but informative
- Avoid technical jargon when simple language works

## Report

Output for each commit:

- 💬 **Message**: The commit message created
- 📁 **Files**: List of files included
- 🔒 **Sharing**: `shared` or `personal`

At the end, before pushing:

- 🎯 **Target remote**: URL and classification (shared team repo / private)
- 📤 **Will push**: N shared commits + N personal commits (or "N personal commits skipped")
