---
allowed-tools: Bash, TodoWrite, git
description: Synchronize your feature branch with the latest develop branch.
---

# Sync Feature Branch with Develop (Git Flow)

Synchronize your feature branch with the latest `develop` branch using Git Flow best practices. Create tasks in the TodoWrite tool following the `Workflow`.

## Workflow

### 1. Validate Environment and Stash Changes

- Verify we're in a git repository (`git rev-parse --is-inside-work-tree`)
- Check no rebase/merge is in progress (no `.git/rebase-apply`, `.git/rebase-merge`, or `.git/MERGE_HEAD`)
- Validate remote 'origin' exists (`git remote get-url origin`)
- Get current branch name and ensure it's not 'develop'
- **Critical**: If uncommitted changes exist, stash them including untracked files:
  ```bash
  git stash push -u -m "Auto-stash before sync-with-develop - $(date)"
  ```
- Set STASHED flag to track if we need to restore later

### 2. Fetch and Fast-Forward Develop Branch

- Fetch from remote with pruning: `git fetch origin --prune`
- Verify `origin/develop` exists
- Create local develop if missing: `git branch develop origin/develop`
- **Critical Decision**: Fast-forward local develop without checkout using:
  ```bash
  git update-ref refs/heads/develop $(git rev-parse origin/develop)
  ```
- **Exit if**: Local develop has diverged from origin/develop (not fast-forwardable)
- Show how many commits develop advanced

### 3. Determine Integration Strategy

- **Critical Decision Point**: Check if current branch has upstream tracking:
  ```bash
  git rev-parse --abbrev-ref --symbolic-full-name '@{u}'
  ```
- **If NO upstream** (private branch): Strategy = REBASE (clean linear history)
- **If HAS upstream** (published branch): Strategy = MERGE (preserve history)

### 4. Apply Integration to Feature Branch

**For Private Branches (REBASE strategy):**

- Execute: `git rebase develop` (with autostash if supported)
- **On conflict**: Exit with instructions to resolve, add files, and continue
- **Success**: Clean linear history with feature commits on top of latest develop

**For Published Branches (MERGE strategy):**

- Execute: `git merge --no-ff develop`
- **On conflict**: Exit with instructions to resolve, add files, and commit
- **Success**: Merge commit preserving both branch histories

### 5. Restore Stash and Show Final Status

- If STASHED flag is true, restore changes: `git stash pop`
- **Handle stash conflicts**: If pop fails, inform user to run manually
- Display final status:
  - Current branch and HEAD commit
  - Last 3 commits (`git log --oneline -3`)
  - Next steps based on branch state:
    - **Private branch**: Use `git push --force-with-lease` if previously pushed
    - **Published branch**: Use `git push` or `git push --set-upstream` if no upstream

## Report

After completing the sync process, display this concise summary:

### Integration Summary

```
🎉 Sync complete!
📍 Branch: [BRANCH_NAME] ([HEAD_SHORT])
🔧 Strategy: [REBASE|MERGE] ([COMMITS_COUNT] commits from develop)
📦 Stashed changes: [RESTORED|CONFLICT|NONE]
```

### Current State

```
📝 Recent commits:
   [commit1] [message]
   [commit2] [message]
   [commit3] [message]
```

### Critical Flags to Track

- **STASHED**: `true|false` - Whether changes were auto-stashed
- **CONFLICTS**: Display conflict resolution steps if integration failed
- **UPSTREAM**: `true|false` - Whether branch has upstream tracking (determines strategy)
