# LifeIndex GitHub Pages Deployment Runbook

**Status:** v1.0.0 deployed; V2 release candidate preparing for Pages deployment

**Last reviewed:** 2026-09-06

## 1. Deployment contract

GitHub Pages hosts only the compiled static application shell. Finance, Health/Habit, Focus, settings, action-receipt, and backup records are never included in the repository or Pages artifact; they remain in each browser profile's IndexedDB unless the user explicitly exports a backup.

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

Before the V2 candidate is merged to `main`, the owner must export the currently installed V1 data to Files/iCloud and confirm that the backup exists. This is a safety prerequisite, not migration evidence. The candidate then follows the normal verified workflow; it must never deploy a checked-in `dist` directory or a manual artifact.

### V2 branch candidate — 2026-09-06

- Application source: `2162c323d1fe4100e917982d3fcea5117b4942bc`, version `2.0.0`, branch `codex/v2-ui-design`.
- Branch workflow: [34033594594](https://github.com/shushengritian/LifeIndex/actions/runs/34033594594), completed successfully on 2026-09-06.
- Proof: frozen dependency installation, peer contracts, static/unit/integration/build gate, and production Chromium/WebKit gate all succeeded on Ubuntu.
- Gate result: the owner explicitly confirmed that the V1 backup file exists; the candidate then advanced to the production deployment below.

### First V2 Pages candidate — 2026-09-06

- Candidate source: `55706aa4f5300ec9cbaf7023398ccba9abccd63d`; application source remains `2162c323d1fe4100e917982d3fcea5117b4942bc`, version `2.0.0`.
- Workflow: [34034416695](https://github.com/shushengritian/LifeIndex/actions/runs/34034416695), completed successfully in 5m 46s.
- Live URL: [LifeIndex](https://shushengritian.github.io/LifeIndex/).
- Linux proof: 22 files / 125 Vitest tests, 35 browser passes / 1 documented skip, successful configured `/LifeIndex/` artifact build and deployment, and 11 live passes / 1 documented skip.
- Manual browser transition: an isolated retained 0.1.1 profile discovered the waiting worker, displayed the explicit update action, updated successfully, and then reported application version 2.0.0 and logical database version 2 with the four approved Settings groups. No personal data was used; this does not substitute for physical-iPhone acceptance.

### V2 iPhone-polish correction candidate — 2026-09-06

- Trigger: first installed-iPhone review reported add-icon alignment, native date/time width, default-expanded Category management, and ambiguous Health card text actions.
- Scope: presentation and interaction affordance only; application version, IndexedDB schema V2, backup V2, repositories, and business data remain unchanged.
- Local proof: formatting, ESLint, strict TypeScript, 22 files / 125 Vitest tests, production build, 37 browser passes / 1 documented skip, configured `/LifeIndex/` build, and 11 local deployed-smoke passes / 1 matching skip.
- Candidate commit, branch workflow, Pages workflow, and live-smoke evidence: pending push and successful workflows.
- Release state: do not tag `v2.0.0`; the owner must retest all four corrections in the installed Home Screen app after live deployment.

The V2 candidate must additionally prove the rendered application version is `2.0.0`, all nine IndexedDB stores open under schema version 2, Finance routes to the semantic month calendar, Health can create/reload synthetic Weight and Activity records, Settings shows its four independent groups, and a V1-format synthetic backup previews/restores as canonical V2. The exact candidate commit, Actions run, Pages deployment, and live smoke results are recorded here before physical acceptance begins.

The `v1.0.0` publication record is maintained in [the release handoff](../releases/v1.0.0.md): application/tag commit `40eb947`, successful full [workflow 33849576847](https://github.com/shushengritian/LifeIndex/actions/runs/33849576847), and [published Release](https://github.com/shushengritian/LifeIndex/releases/tag/v1.0.0). [ADR-0005](../adr/0005-v1-owner-acceptance.md) changes only the owner's physical-acceptance gate; all automated build/deploy/live checks below remain required. The release preserves schema/backup V1, the same URL, and the existing unselected license state. Later evidence-only documentation commits do not move the tag or alter application behavior.

Record the repository, commit SHA, workflow run, deployment URL, time, and result. At the live HTTPS URL verify:

1. The response is successful, the rendered version matches the checked-out `package.json`, and every JavaScript, CSS, manifest, icon, and worker request remains under the configured base URL.
2. Today is the default route; all five destinations and an invalid hash route behave as documented.
3. `manifest.webmanifest` has the deployed `id`, `start_url`, and `scope`; the worker controls the same scope.
4. Browser console has no application error and network requests contain no business/action fragment values.
5. A synthetic Finance record survives refresh; no repository or artifact changes as a result.
6. After one controlled online load, the application launches and reads that synthetic record with browser networking disabled, then writes another local synthetic record.
7. A fresh browser profile starts empty, proving data is not served by Pages.

The workflow automates these checks through `pnpm test:deployed` in ephemeral Chromium and Mobile Safari/WebKit profiles. Playwright WebKit's unsupported offline reload remains explicitly skipped, while offline mutation is exercised in both engines and full offline reload in Chromium. The operator still reviews the workflow evidence and live mobile view before M8 closes.

The V1 deployed suite was validated locally against both `/` and `/LifeIndex/` production previews on 2026-09-03: each target passed 9 scenarios with the documented WebKit offline-reload skip. On 2026-09-06, the V2 `2.0.0` candidate's configured `/LifeIndex/` preview passed its expanded suite with 11 passes and the same single WebKit skip. The V2 result includes Health persistence and the nine-store metadata check; Dexie logical schema version 2 appears as native IndexedDB version 20. Real HTTPS evidence must still be recorded after the owner backup gate and production deployment; it is never inferred from local preview results.

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
