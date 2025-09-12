# Collaboration Rules (StoryForge)

## Branch Strategy
- `main` = stable, deployable. **All work must come via Pull Request (PR). No direct pushes.**
- Feature branches: `feature/<short-name>` or `fix/<short-name>`. One issue/story per branch, small and short-lived.

## Pull Requests
- Target **`main`** for every PR.
- Link the issue in the PR description (e.g., `Fixes #46`).
- Keep PRs small (aim ≤ ~300 lines of diff). Split big changes.
- **CI must be green** (build, tests, lint). If red → do not merge.
- Add screenshots for UI changes when useful.

## Reviews
- At least **1 approval** before merge.
- Be kind, specific, and actionable.
- Review for correctness, tests, accessibility, performance, security, and consistency.

## Keeping Branches Fresh (avoid conflicts)
- Update your feature branch **daily**:
  ```bash
  git fetch origin
  git switch feature/<short-name>
  git rebase origin/main  # or: git merge origin/main
  ```
- If two people need the same file/area, coordinate early.

## Commits
- Clear, imperative messages:
  - `Feature[Auth]: sign-up flow`
- Group related changes; avoid drive-by edits.

## Merging
- Prefer **Squash & Merge** with a clean title (auto-closes linked issues).
- Delete the branch after merge (history remains clean on `main`).

## Releases
- `main` is always deployable. Tag releases after a green build.

## Security & Secrets
- Never commit secrets! Use environment variables and `.env.local` (gitignored).
- E.g. database connection string, API Key!
