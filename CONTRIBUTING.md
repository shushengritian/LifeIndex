# Contributing to LifeIndex

LifeIndex is currently a single-user personal project, but changes still follow a reviewable engineering workflow.

## Before changing code

1. Read `LifeIndex-Project-Baseline.md`, `AGENTS.md`, and `PLAN.md`.
2. Identify the requirement and acceptance criteria affected by the change.
3. Confirm that the change remains inside the V1 scope or record an approved decision first.

## Change workflow

- Keep `main` releasable and use short-lived `feat/`, `fix/`, or `docs/` branches once remote collaboration begins.
- Prefer small vertical changes that include implementation, tests, and documentation.
- Use Conventional Commit subjects such as `feat(finance): add transaction entry`.
- Do not rewrite shared history or commit generated output, credentials, backups, or personal data.

## Required validation

Run the narrowest relevant checks while iterating, followed by the documented full quality gate before a release. Exact commands will be maintained in `docs/development/DEV.md` after the engineering scaffold exists.

## Documentation

Update affected product, architecture, data, development, test, and operations documents in the same commit. Record milestone evidence and plan changes in `PLAN.md`.
