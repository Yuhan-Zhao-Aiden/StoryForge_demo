# Contributing to StoryForge

Thanks for contributing! This project uses a **feature-branch → PR → main** workflow.

## Prerequisites
- Node LTS installed
- MongoDB URI available
- Copy `.env.example` → `.env.local` and fill values
- `npm run dev` to start locally

## Tools
- Typescript
- TailwindCSS
- Shadcn/ui

## Workflow (All PRs target `main`)
1. **Pick an issue** from GitHub issues tab.
2. **Create a branch** from the latest `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/<short-name>
   ```
3. **Commit small, focused changes** with clear messages.
4. **Keep branch up to date**:
   ```bash
   git fetch origin
   git rebase origin/main   # or merge if preferred
   ```
5. **Open a Pull Request** targeting `main`:
   - Link the issue
   - Describe the change & impact
   - Include screenshots for UI changes
6. **Ensure CI is green** (build, tests, lint).
7. **Request review**, address feedback, push updates.
8. **Squash & Merge** when approved and green.

## Coding Standards
- TypeScript strict mode
- ESLint + Prettier must pass (`npm run lint`)
- Tests for logic paths; update/add tests for bug fixes and new behavior
- Avoid large PRs—prefer small, iterative changes

## Commit Message Format (recommended)
Example
- `Feature[Auth]: <summary>`


## PR Checklist
- [ ] Linked issue
- [ ] Scope is small and focused
- [ ] CI green (build/tests/lint)
- [ ] Screenshots for UI changes (if applicable)
- [ ] No secrets or accidental files (check `git status`)

## Communication
- Use GitHub Issues/Projects for planning & status
- Use PR comments for code discussion; summarize decisions in the PR
