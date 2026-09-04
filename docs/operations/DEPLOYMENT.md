# LifeIndex GitHub Pages Deployment Runbook

**Status:** Preparing owner-accepted v1.0.0; physical checks deferred under ADR-0005

**Last reviewed:** 2026-09-04

## 1. Deployment contract

GitHub Pages hosts only the compiled static application shell. Finance records, habits, Focus sessions, settings, action receipts, and backups are never included in the repository or Pages artifact; they remain in each browser profile's IndexedDB unless the user explicitly exports a backup.

The Pages URL may expose the application shell to anyone allowed by the selected repository/Pages plan. It is not authenticated storage and must not be described as a private account. Repository visibility, Pages accessibility, owner, name, and license are release decisions made before remote creation.

## 2. Workflows

| File                            | Trigger                                  | Authority                                      | Result                                                                  |
| ------------------------------- | ---------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------- |
| `.github/workflows/ci.yml`      | Pull request, non-`main` push, manual    | Read repository contents                       | Frozen install, peers, full local gate, Chromium and WebKit checks      |
| `.github/workflows/pages.yml`   | `main` push or manual                    | Build/smoke read contents; deploy writes Pages/OIDC | Same full gate, configured-base build, gated deployment, live smoke |

The deployment job depends on the verification/build job, so it cannot publish a failed build. A final read-only job runs the separate deployed suite against the URL returned by `deploy-pages`; the workflow is not green until that live check passes. Checkout credentials are not persisted. No application secret is required. Reports and local data are not uploaded.

The Pages build reads `steps.pages.outputs.base_path` from GitHub's configuration action and passes it to `LIFEINDEX_BASE_PATH`. This keeps HTML assets, manifest `id`/`start_url`/`scope`, icons, and service-worker scope aligned for project sites, user sites, or a future custom domain.

## 3. One-time remote setup

Confirm the GitHub owner, repository name, visibility, and static-shell access model before remote publication. Do not invent a license grant; add a license only when the owner chooses one.

Current instance: the user created the public [shushengritian/LifeIndex](https://github.com/shushengritian/LifeIndex) repository and pushed local `main` through commit `7755346` on 2026-09-04. The user then explicitly requested **GitHub Actions** as the Pages source; the settings page returned **GitHub Pages source saved.** The source is enabled and HTTPS is required for the default domain. A project license has not yet been selected, so no license file has been added. Git push and browser authentication work independently of `gh auth status`; GitHub CLI remains unauthenticated, and the connected GitHub tools/browser are available for workflow inspection/settings.

1. Authenticate the chosen GitHub interface with the intended account. If using GitHub CLI, verify it with `gh auth status`; otherwise verify the signed-in browser or connector and use the existing Git credentials for pushing.
2. Add the approved license, if any, before the first public push.
3. Create the empty repository from this existing local history and set `origin` without rewriting commits.
4. In **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**. The normal workflow token intentionally does not have repository-administration permission to enable Pages itself.
5. Push `main` and inspect the `Deploy GitHub Pages` run. Do not proceed after a skipped, canceled, or partially green run.

### Initial CI installation incident

[Run 33830831321](https://github.com/shushengritian/LifeIndex/actions/runs/33830831321) failed before tests or deployment because the sharp build decision was an unresolved pnpm placeholder. The log reported `ERR_PNPM_IGNORED_BUILDS` for `sharp@0.33.5`. Replace that placeholder with a reviewed, exact-version `allowBuilds` decision while retaining `strictDepBuilds: true`, verify a clean frozen install, and rerun the complete gate. Re-running the unchanged failed commit cannot fix this source configuration issue. No deployment from that run took place.

### First verified deployment — 2026-09-04

- Source: `60b06765c4d84c2892797b1f43eb86e1447b2ea8`, app version `0.1.0`.
- Workflow: [33832099931](https://github.com/shushengritian/LifeIndex/actions/runs/33832099931), completed successfully at `2026-09-04T03:13:39Z`.
- Live URL: [LifeIndex](https://shushengritian.github.io/LifeIndex/).
- Linux proof: successful frozen sharp install, peers/static gates, 18 files / 84 unit/integration tests, 33 passed / 1 documented skipped browser checks, and production build using configured base `/LifeIndex`.
- Deploy proof: `Deploy verified artifact` succeeded and returned the live URL. `Verify live Pages deployment` passed 9 checks and retained the documented single WebKit offline-reload skip.
- Manual browser proof: live Today at 390 × 844 and Settings at 320 × 568 were inspected; Settings reported offline shell ready and no warning/error log was captured. This is not physical-iPhone evidence.
- The subsequent 0.1.1 refinement adds explicit foreground/reconnect discovery; its separate evidence follows.

### Previously verified application — 0.1.1

- Application source: `ff7d443db47fab2283031e58047c9e6396fb7913`.
- Workflow: [33833052946](https://github.com/shushengritian/LifeIndex/actions/runs/33833052946), completed successfully at `2026-09-04T03:29:21Z`.
- Same live URL: [LifeIndex](https://shushengritian.github.io/LifeIndex/).
- All install/static/build gates pass, with 19 files / 92 unit/integration tests, 33 browser passes / 1 documented skip, and 9 live passes / 1 documented skip. The live test asserts version 0.1.1, not just page availability.
- Manual browser transition: retained a 0.1.0 session, reopened online to discover the waiting worker, entered one unsaved synthetic amount, verified `立即更新` became disabled, canceled the draft, confirmed update, and observed 0.1.1 with the empty transaction state preserved. No test record was saved and no personal data was used. Physical installed-Safari update behavior still requires M9.
- Later documentation-only commits do not change this application source or substitute for the recorded release evidence. Any runtime, dependency, build, or workflow change must pass the full gate again.

## 4. Live smoke gate

The `v1.0.0` publication record is maintained in [the release handoff](../releases/v1.0.0.md). [ADR-0005](../adr/0005-v1-owner-acceptance.md) changes only the owner's physical-acceptance gate; all automated build/deploy/live checks below remain required. The release preserves schema/backup V1, the same URL, and the existing unselected license state.

Record the repository, commit SHA, workflow run, deployment URL, time, and result. At the live HTTPS URL verify:

1. The response is successful, the rendered version matches the checked-out `package.json`, and every JavaScript, CSS, manifest, icon, and worker request remains under the configured base URL.
2. Today is the default route; all five destinations and an invalid hash route behave as documented.
3. `manifest.webmanifest` has the deployed `id`, `start_url`, and `scope`; the worker controls the same scope.
4. Browser console has no application error and network requests contain no business/action fragment values.
5. A synthetic Finance record survives refresh; no repository or artifact changes as a result.
6. After one controlled online load, the application launches and reads that synthetic record with browser networking disabled, then writes another local synthetic record.
7. A fresh browser profile starts empty, proving data is not served by Pages.

The workflow automates these checks through `pnpm test:deployed` in ephemeral Chromium and Mobile Safari/WebKit profiles. Playwright WebKit's unsupported offline reload remains explicitly skipped, while offline mutation is exercised in both engines and full offline reload in Chromium. The operator still reviews the workflow evidence and live mobile view before M8 closes.

The deployed suite was validated locally against both `/` and `/LifeIndex/` production previews on 2026-09-03: each target passed 9 scenarios with the documented WebKit offline-reload skip. The real HTTPS evidence is recorded separately above; it must not be inferred from local preview results.

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
