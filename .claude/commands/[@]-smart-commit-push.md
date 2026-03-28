---
allowed-tools: Bash, Git(git commit:*)
description: Analyze pending changes, create, and push atomic commits.
---

# Smart Commit-Push

Follow the `Workflow` creating tasks with TodoWrite for each workflow step to tntelligently analyze pending changes and create atomic commits with clear, descriptive messages.

## Workflow

1. **Collect Changes**: Gather all staged, unstaged, and untracked files
2. **Analysis**: Analyze the changes contextually to understand relationships
3. **Group Formation**: Create logical commit groups based on features and dependencies following the `Grouping Principles`
4. **Message Generation**: Generate clear, descriptive commit messages from actual change content following the `Message Style Guidelines`
5. **Execute Commits**: Create the commits
6. **Push Changes**: Push the commits to the remote repository

## Grouping Principles

1. **Feature Completeness**: Group related files that implement a complete feature together
2. **Test Integration**: Keep test files with their corresponding implementation files
3. **Documentation**: Group documentation updates with the features they document, or separately if standalone
4. **Configuration**: Keep configuration changes in separate commits unless directly tied to a feature
5. **Dependencies**: Group files that depend on each other functionally

## Message Style Guidelines

- Use clear, descriptive language that explains what changed
- Start with an action verb (Add, Update, Fix, Remove, Refactor, etc.)
- Be specific about what was modified or implemented
- Keep messages concise but informative
- Avoid technical jargon when simple language works

## Report

Output for each commit:

- 💬 **Message**: The commit message created
- 📁 **Files**: List of files included
