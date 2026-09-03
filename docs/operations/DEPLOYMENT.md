# LifeIndex GitHub Pages Deployment Runbook

**Status:** Local workflow ready; remote repository and live deployment pending owner approval

**Last reviewed:** 2026-09-03

## 1. Deployment contract

GitHub Pages hosts only the compiled static application shell. Finance records, habits, Focus sessions, settings, action receipts, and backups are never included in the repository or Pages artifact; they remain in each browser profile's IndexedDB unless the user explicitly exports a backup.

The Pages URL may expose the application shell to anyone allowed by the selected repository/Pages plan. It is not authenticated storage and must not be described as a private account. Repository visibility, Pages accessibility, owner, name, and license are release decisions made before remote creation.

## 2. Workflows

| File                            | Trigger                                  | Authority                                      | Result                                                                  |
| ------------------------------- | ---------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------- |
| `.github/workflows/ci.yml`      | Pull request, non-`main` push, manual    | Read repository contents                       | Frozen install, peers, full local gate, Chromium and WebKit checks      |
| `.github/workflows/pages.yml`   | `main` push or manual                    | Build reads contents; deploy writes Pages/OIDC | Same full gate, configured-base build, artifact upload, gated deployment |

The deployment job depends on the verification/build job, so it cannot publish a failed build. Checkout credentials are not persisted. No application secret is required. Reports and local data are not uploaded.

The Pages build reads `steps.pages.outputs.base_path` from GitHub's configuration action and passes it to `LIFEINDEX_BASE_PATH`. This keeps HTML assets, manifest `id`/`start_url`/`scope`, icons, and service-worker scope aligned for project sites, user sites, or a future custom domain.

## 3. One-time remote setup

Do not run these steps until the user confirms the GitHub owner, repository name, visibility, license, and static-shell access model.

1. Authenticate GitHub CLI with the intended account and verify it with `gh auth status`.
2. Add the approved license, if any, before the first public push.
3. Create the empty repository from this existing local history and set `origin` without rewriting commits.
4. In **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**. The normal workflow token intentionally does not have repository-administration permission to enable Pages itself.
5. Push `main` and inspect the `Deploy GitHub Pages` run. Do not proceed after a skipped, canceled, or partially green run.

## 4. Live smoke gate

Record the repository, commit SHA, workflow run, deployment URL, time, and result. At the live HTTPS URL verify:

1. The response is successful and every JavaScript, CSS, manifest, icon, and worker request remains under the configured base URL.
2. Today is the default route; all five destinations and an invalid hash route behave as documented.
3. `manifest.webmanifest` has the deployed `id`, `start_url`, and `scope`; the worker controls the same scope.
4. Browser console has no application error and network requests contain no business/action fragment values.
5. A synthetic Finance record survives refresh; no repository or artifact changes as a result.
6. After one controlled online load, the application launches and reads that synthetic record with browser networking disabled, then writes another local synthetic record.
7. A fresh browser profile starts empty, proving data is not served by Pages.

The live gate uses synthetic values only. Never upload or paste a real backup into CI, an issue, a workflow artifact, or a screenshot.

## 5. Rollback and incident response

- Application rollback: revert the faulty source change in a new commit, run the complete gate, and let the normal Pages workflow deploy it. Do not force-push `main` or deploy an unverified local `dist` directory.
- Data compatibility: never roll application code back below the oldest IndexedDB/backup version it can safely read. Ship a forward-compatible repair instead of asking users to clear Safari data.
- Suspected disclosure: stop sharing URLs/screenshots, disable Pages in repository settings if the shell itself is the concern, preserve local records, export a test-safe backup if possible, and follow `SECURITY.md`.
- Workflow outage: the last successful static deployment remains the reference. Do not bypass checks; diagnose the failed job and rerun only after the source or external failure is understood.

## 6. Official references

- [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub Pages limits and availability](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [pnpm/setup](https://github.com/pnpm/setup)
- [Vite public base path](https://vite.dev/guide/build#public-base-path)

Action releases were checked against their official pages on 2026-09-03 and pinned by full commit SHA in workflow source: `actions/checkout` v7.0.1, `pnpm/setup` v2.1.0, `actions/configure-pages` v6.0.0, `actions/upload-pages-artifact` v5.0.0, and `actions/deploy-pages` v5.0.1. Updating a pin requires another release/source review.
