# LifeIndex V2 Test Plan

> 2026-09-21：3.1.0 按 ADR-0021 完成自动化后发布，再由用户真机验证。新增报表双主题窄屏/可访问性/上下文回归、结构化编辑器滚动条回归、今天返回上下文与各域草稿失败保护；更新专注测试的按钮定位而不降低计时及间距要求。当前证据见 [3.1.0](../releases/v3.1.0.md)，不是物理 iPhone 验证。

> **2026-09-14 · V2.1 amendment:** V2.1 adds `tests/integration/cessation.test.ts` and `tests/e2e/cessation.spec.ts`: conflict/rollback, legacy restore, additive schema upgrade, fixed-zone DST, complete/partial-day semantics, history/hiding, 320/390 layouts, light/dark axe checks and offline save. Current evidence/status: [V2_1_PLAN](../../V2_1_PLAN.md). Physical-iPhone and live V2.1 acceptance remain unverified; ADR-0008 applies only to V2.

**Status:** Automated release acceptance authorized; physical-only follow-up deferred under ADR-0008

For V2 only, [ADR-0008](../adr/0008-v2-automated-acceptance.md) supersedes the mandatory physical sign-off below. All automated gates remain required; simulated results are never recorded as hardware evidence.

**Last updated:** 2026-09-06

V2.1 publication gate: `tests/deployed/pages.spec.ts` now asserts app 2.1.0 from package metadata, native IndexedDB 30/twelve stores, and synthetic cessation plan/snapshot/smoking persistence plus privacy. This supplements the eight new local cessation E2E scenarios. G2 is authorized without a backup under ADR-0010; real iPhone evidence is still pending.

## 1. Quality objective

Prove that V2 preserves all V1 local records and critical workflows while adding the approved mobile UI, weight/activity records, backup format V2, and additive schema upgrade. Automation provides repeatable evidence; the owner's installed-iPhone report remains required and is not inferred.

## 2. Test layers

| Layer | Environment | Primary proof |
| --- | --- | --- |
| Static | Prettier, ESLint, TypeScript | formatting, contracts, unsafe patterns |
| Unit/component | Vitest + jsdom | parsers, projections, state, forms, navigation, accessibility contracts |
| Integration | Vitest + fake-indexeddb | V1→V2 upgrade, repositories, references, backup migration/rollback |
| Browser E2E | Playwright Chromium | production workflows, offline/update, compact UI |
| WebKit approximation | Playwright Mobile Safari | iOS-like touch/browser behavior |
| Deployed smoke | Real GitHub Pages HTTPS | exact version, base path, routes, manifest, worker, offline artifact |
| Physical acceptance | Owner's installed iPhone PWA | real upgrade/data continuity, Files handoff, suspension, safe areas |

V1's final automated/release evidence remains in `docs/releases/v1.0.0.md`; it is the regression baseline, not V2 proof.

V2 implementation commit `2162c32` passed the complete Ubuntu branch gate in [CI run 34033594594](https://github.com/shushengritian/LifeIndex/actions/runs/34033594594). This is independent remote verification of install, peer, static, unit/integration, build, Chromium, and WebKit checks; it is not Pages or physical-device evidence.

Candidate commit `55706aa` passed [Pages run 34034416695](https://github.com/shushengritian/LifeIndex/actions/runs/34034416695): 22 files / 125 Vitest tests, 35 runnable production browser scenarios, configured `/LifeIndex/` deployment, and 11 runnable live HTTPS scenarios all passed. The two recorded skips are the same documented WebKit offline full-page reload limitation at the local and deployed layers. Physical-iPhone evidence remains separate.

After the first owner review, iPhone-polish commit `fc0cd7f` passed [branch CI run 34036136865](https://github.com/shushengritian/LifeIndex/actions/runs/34036136865), and persistence-wait hardening commit `09debca` passed [branch CI run 34036951739](https://github.com/shushengritian/LifeIndex/actions/runs/34036951739). [Pages run 34037198731](https://github.com/shushengritian/LifeIndex/actions/runs/34037198731) then passed formatting, ESLint, strict TypeScript, 22 files / 125 Vitest tests, production build, 37 runnable Chromium/Mobile Safari-WebKit scenarios, configured `/LifeIndex/` deployment, and 11 runnable live HTTPS scenarios without retry or flaky results. Each browser layer retains only the same documented WebKit offline full-page reload skip. Physical-iPhone evidence remains separate.

## 3. Data and migration gate

**Evidence recorded 2026-09-06:** `tests/integration/database.test.ts`, `healthRepositories.test.ts`, `health-ui.test.tsx`, `backup.test.ts`, and retained repository tests pass. The current full Vitest suite passes 22 files / 125 tests. Prettier, ESLint, strict TypeScript, the production build, and real Pages automation pass. Physical-device claims remain pending.

- Fresh V2 creates nine stores, 21 stable categories, and the existing three default Settings rows.
- Reopen is idempotent and does not overwrite renamed/archived category values.
- A schema-V1 fixture with representative rows in all seven stores upgrades in place to version 2.
- Every pre-upgrade row remains logically equal; new stores are empty; stable Activity categories are added only after open.
- Forced/open migration failure blocks initialization and never invokes database deletion or clear.
- Weight accepts exactly 20,000–500,000 integer grams and rejects fractional/out-of-range values.
- Activity accepts exactly 1–1,440 integer minutes and `light|moderate|hard`.
- Activity create/update validates category domain/archive policy atomically.
- CRUD and bounded/date-ordered reads pass for Weight and Activity repositories.
- Logger capture for every new path contains no IDs, values, dates tied to records, notes, category labels, or payloads.

## 4. Backup gate

- Current V2 round trip reproduces all nine stores and optional weight target.
- V0 migrates through V1 to V2; V1 migrates to V2; both add empty Health collections only.
- Frozen legacy schemas reject historically invalid unions independently of the current schema.
- Invalid JSON, oversize, future version, count mismatch, duplicate keys, invalid Health values, dangling Activity category, invalid settings, receipt mismatch, and multiple active Focus rows begin no write.
- Preview exposes only safe metadata and uses cancelable, expiring, one-time tokens.
- Forced failure during replacement aborts all nine stores and retains the complete previous snapshot.
- Serialization ordering is deterministic.

## 5. Unit and component matrix

### Shared shell

- Five destinations are Today/Finance/Focus/Health/Settings in order; `/habits` redirects to `/health`.
- Internal icons have accessible labels through their controls and no network dependency.
- Finance and Health add controls render geometric SVG icons; the Weight and Activity entries expose accessible names without visible “记录” text.
- Light/dark/system, reduced motion, fatal startup, PWA status, and update/dirty-form behavior remain correct.

### Finance

- Month grid handles leading/trailing days, leap year, Monday-first weekdays, month change, day clamp, and today/selected state.
- Daily and monthly totals use exact minor units; empty days omit amounts.
- Calendar selection changes the ledger without persistence.
- New/edit sheet keeps drafts on validation/write failure, blocks duplicate save, and closes after commit only.
- Existing transaction/category/report domain tests remain green.

### Health

- Exact kg text parsing to grams, one-decimal display, boundary values, and invalid separators.
- Latest/trailing-30-day trend handles 0/1/multiple entries and local-date boundaries.
- Current Monday–Sunday Activity count/duration and newest ordering.
- Independent Weight/Activity/Habit loading/error/empty states.
- Add chooser has exactly Weight/Activity/Habit actions.
- Habit schedule, check-in/undo, pause, streak, rate, total, and new fourteen-week heatmap states.
- Save failure keeps Weight/Activity drafts and restores Habit completion state.

### Focus, Today, Settings

- Existing timestamp-derived Focus state/reload/finish/cancel/history tests remain green with refreshed UI.
- Today reflects Finance/Habit/Focus mutations and keeps projection failures distinct.
- Settings renders Categories, Appearance, Data & security, Other in exact order.
- Category management is collapsed on first render and becomes operable after explicit disclosure expansion.
- Activity category lifecycle and optional target persistence are covered.

## 6. Browser/E2E matrix

**Local evidence recorded 2026-09-06:** the production build passes 37 Chromium/Mobile Safari-WebKit scenarios; the single skip is the documented WebKit automation limitation for offline full-page reload. Health create/edit/delete, target set/clear, Activity and Weight persistence, Finance calendar/CRUD, Habit continuity, Focus reconciliation, Settings order/categories/theme, backup replacement, URL Actions, offline mutation, privacy, accessibility, add-icon optical centering, native date/time width, and default-collapsed Category management pass in both engines.

The configured-base candidate was also built and served at `/LifeIndex/`; its deployed-smoke suite passes 11 scenarios with the same single WebKit skip. Final Pages run 34037198731 repeats those 11 runnable checks against the real HTTPS deployment, proving base path, routes, manifest/worker scope, nine-store persistence, Health reload, offline mutation, and fragment privacy.

Run the production build in Chromium and Mobile Safari/WebKit with isolated synthetic profiles:

- first launch and direct navigation to all five routes;
- legacy `#/habits` redirect;
- Finance select-day, add, edit, delete, report, reload persistence, and failed-save draft;
- Health add/edit/delete Weight, set/clear target, trend, add/edit/delete Activity, weekly summary, Activity archive history;
- existing Habit create/check/reload/undo/pause/detail/heatmap journey inside Health;
- Focus start/background-like reload/reconcile/finish/history;
- Settings group order, theme persistence, export, V1 backup preview/migrate/restore, V2 restore;
- offline launch/reload/mutation where engine support allows;
- URL Actions remain fragment-private and idempotent;
- waiting update remains explicit and blocked by dirty forms.
- persistence/reload assertions first wait for committed UI state: the appearance selector's persisted `aria-pressed` value or the saved Health row returned by its IndexedDB live query;
- at 390 × 844, Finance/Health circular add icon centers differ from their button centers by no more than 0.5 CSS px;
- Finance, Weight, and Activity native date/time controls differ from their adjacent reference input widths by no more than 1 CSS px.

The documented Playwright WebKit internal offline-reload limitation may remain an explicit skip only if unchanged and every runnable scenario passes; physical iPhone covers the real behavior.

## 7. Visual and accessibility gate

**Local evidence recorded 2026-09-06:** Axe reports zero detectable violations on the five ready routes and the Finance/Health sheets. Automated 320 × 568 checks report no horizontal overflow, preserve 44 × 44 main controls and calendar targets, and honor reduced motion. Direct 390 × 844 inspection covers Finance and Health in light appearance and Settings in dark appearance. Physical safe-area/keyboard behavior remains pending.

- 320 × 568 and 390 × 844 light/dark screenshots for every primary destination and sheet.
- No horizontal overflow or bottom-navigation/safe-area obstruction.
- Main targets at least 44 × 44 CSS px; form text at least 16 px.
- Category management is collapsed by default; Health card add controls look actionable while retaining VoiceOver names.
- Calendar selection, signed amounts, completion, trend, and intensity are not color-only.
- Headings, landmarks, labels, dialog names, error summaries/live regions, focus return, and keyboard order are valid.
- Axe has no detectable violations on primary ready/empty/form/error states.
- Reduced motion disables nonessential transitions.

## 8. Privacy and artifact gate

- Central logger allowlist and tracked-source scan reject sensitive context.
- Runtime capture shows no Health/Finance/Habit/Focus values in console/network URLs.
- Cache Storage contains app-shell resources only.
- Production artifact contains no source maps, backup-like JSON, IndexedDB export, fixture data, credential, or remote telemetry endpoint.
- Git status and ignore checks show no backup/personal/generated build files.

## 9. Commands

```bash
pnpm peers check
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Deployed candidate:

```bash
LIFEINDEX_DEPLOYED_URL=https://shushengritian.github.io/LifeIndex/ pnpm test:deployed
```

The GitHub Pages workflow must reproduce the full configured gate on the exact candidate commit.

## 10. Physical-iPhone acceptance

After the candidate is deployed, the owner explicitly reports:

- installed V1 updates to V2 and every existing representative record remains present;
- Health Weight, Activity, and Habit records persist across kill/reopen;
- Finance and Focus critical paths remain usable;
- offline cold reopen and offline mutation survive return online;
- light/dark/system, keyboard, safe areas, touch targets, and Home Screen display feel correct;
- export to Files/iCloud and V2 import preview/replace work with explicit replacement warning;
- a subsequent candidate update appears and activates without discarding a dirty form.
- the correction candidate centers Finance/Health add icons, keeps date/time fields full width, initially collapses Category management, and uses icon-only Weight/Activity card actions.

Only reported results are marked pass. A defect that risks data loss/privacy or blocks core offline capture blocks `v2.0.0`.

## 11. Evidence recording

`V2_PLAN.md` records milestone commands/counts/commits. `REQUIREMENTS_TRACEABILITY.md` maps requirements to named source/tests and changes `planned` to `verified` only after evidence exists. Release notes link the exact GitHub Actions and deployed-smoke runs; iPhone evidence is recorded separately.
# 操作体验首批验证增量（2026-09-20）

按 [开发计划](../development/OPERATION_REFRESH_DEV.md)验证生产 Sheet、记账 CRUD/失败/草稿与新报表。原型的 14 组检查不能作为生产测试结果；新域函数/图表单测、fake IndexedDB 集成、浏览器实际几何/返回/键盘分别记录。数据库/备份仍 V4，不触碰用户真实数据或将模拟测试冒充 iPhone。下文历史版本记录不代表本次已通过。
# 2026-09-21 操作体验滚动回归补充

所有页面、报表、Portal 弹层及 `.sheet-form-body` 统一隐藏滚动指示条，但保留原生滚动。检查 320/390/430 宽度、短屏、深浅主题、触摸及鼠标输入；长内容可达尾部，保存仍可操作，关闭后底栏仍可达。`tests/e2e/mobile-polish.spec.ts` 新增内部编辑器覆盖；尚未执行新增浏览器用例，不作为真机修复证明。系统菜单/文件选择器另做 iPhone 专项。
