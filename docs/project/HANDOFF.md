# LifeIndex 4.0 会话交接

更新：2026-09-29。当前版本 **4.0.0「日常调频」**。PR已合并，最终候选CI、Pages三阶段及独立线上8项全部通过，**升级交付完成**。以下状态是本次交接时快照，继续工作前应核对Git与流水线实时结果。

## 当前进度与下一步

- 用户已授权自主完成新版设计、实现、独立验收、PR合并及既有GitHub Pages部署，无需为常规继续工作重复确认。
- 最终候选`bf7862c`的两条CI成功：[36518030462](https://github.com/shushengritian/LifeIndex/actions/runs/36518030462)、[36518026896](https://github.com/shushengritian/LifeIndex/actions/runs/36518026896)。根协调已读日志确认294项单元/集成、86项浏览器测试通过。
- [PR #1](https://github.com/shushengritian/LifeIndex/pull/1)已合并为`57f4a2fface997c8dbbcedd3cbe64293f87da147`，本地main已同步。
- [Pages 36519399083](https://github.com/shushengritian/LifeIndex/actions/runs/36519399083)已成功完成构建、部署和云端8项线上检查。既有入口：[LifeIndex](https://shushengritian.github.io/LifeIndex/)。独立线上8项也已通过，版本4.0.0及完整SHA匹配。
- 发布详情见[发布记录](../releases/v4.0.0.md)、[PLAN](../../PLAN.md)和[独立线上报告](../testing/v4/release/2026-09-29-pages/REPORT.md)。后续文档归档提交不改变线上源码SHA；没有新的用户需求时不自行重做或重新发布。
- 实体iPhone与系统文件保存结果仍未实机确认，不把WebKit模拟、原生桌面页面缩放或CPU4×性能测试表述为真机通过。

## 新会话阅读顺序

1. 阅读根目录[AGENTS](../../AGENTS.md)、[PLAN](../../PLAN.md)、[4.0范围](../product/V4.md)与[ADR 0002](../adr/0002-v4-autonomous-experience-upgrade.md)。用户明确取消旧库迁移、旧备份兼容作为新版交付前提，不重新引入旧版约束。
2. 核对`git status --short`及最近提交，保留当前工作区修改；不要假设交接快照等于实时状态。
3. 设计以[冻结决定](../design/v4/FREEZE.md)、[设计系统](../design/v4/DESIGN_SYSTEM.md)和[架构](../design/v4/ARCHITECTURE.md)为准。整行习惯回应、笔形“留一笔”已定稿，不重启审美方向讨论。
4. 实现与证据见[Core](../development/v4/CORE.md)、[Shell](../development/v4/SHELL.md)、[领域实现](../development/v4/FEATURES.md)、[验收矩阵](../testing/v4/ACCEPTANCE_MATRIX.md)及[独立生产验收](../testing/v4/PRODUCTION_REVIEW.md)。

## 当前代码定位

| 领域 | 当前入口 | 变更时重点 |
| --- | --- | --- |
| 应用入口、路由与壳 | `src/main.tsx`、`src/app/v4/AppV4.tsx`、`AppProviders.tsx`、`AppShell.tsx` | Hash Router；主导航PUSH归顶；Flow返回保留上下文 |
| 录入、详情与返回 | `src/features/records/v4/`、`src/app/v4/FlowProvider.tsx` | 冻结草稿source/ref/stamp；跨标签删除/恢复不能丢输入；真实保存ID回执 |
| 共享弹层、查询与保护 | `src/shared/ui/v4/`、`src/app/v4/useQuery.ts`、`useDirtyGuard.ts`、`NavigationGuard.tsx` | loading/failed/ready事实；键盘焦点；dirty与busy；成功导航前释放保护 |
| 今天、记账与报表 | `src/features/today/TodayV4.tsx`、`src/features/today/v4/`、`src/features/finance/*V4.tsx`、`src/features/finance/v4/` | 整数金额、当地日期、月份/日期筛选、报表返回位置 |
| 健康与习惯 | `src/features/health/HealthV4.tsx`、`src/features/health/v4/`、`src/features/habits/HabitsV4.tsx`、`src/features/habits/v4/` | 整数克、草稿读取失败保留、整行回应、真实完成历史及焦点恢复 |
| 专注 | `src/app/v4/FocusController.ts`、`FocusRuntimeProvider.tsx`、`src/features/focus/*V4.tsx`、`src/core/focus.ts` | 单一会话；确认绑定身份；固定完成终点；墙钟异常；未决写入保护 |
| 分类、设置与备份UI | `src/features/settings/v4/` | 单层四领域分类；历史引用；归档/重启；同名校验；文件读取代次 |
| 数据与业务合同 | `src/core/services.ts`、`types.ts`、`validation.ts`、`database.ts`及其领域模块 | generation/revision、幂等命令、整数数值、只读一致快照与事务 |
| 备份校验与恢复 | `src/core/backup.ts`、`backup-schema.ts` | 完整校验后预览；八类数据原子替换；失败保持当前库；旧预览失效 |
| 视觉资源与样式 | `src/styles/v4-*.css`、`src/shared/ui/v4/Icon.tsx`、`public/` | 冻结深浅主题、44px触点、短屏/大字/原生缩放、离线本地字体 |
| PWA与发布 | `src/pwa/`、`src/sw.ts`、`vite.config.ts`、`.github/workflows/` | 仅外壳缓存；批准后接管刷新；失败重试；Pages base path与构建标识 |

`src/app/`、`src/data/`及未标V4的旧模块仍有历史代码；当前入口不使用旧数据层。不要依据旧文件名把3.x实现误当新版主流程。

## 数据与实现纪律

新版数据库为`LifeIndexV4`、schemaVersion1；业务备份为专用`lifeindex-v4-backup`、formatVersion1。八类数据加meta共九张表；旧库独立保留，不读取、不迁移、不删除。分类是支出/收入/运动/专注四个领域的单层结构，不沿用旧两级分类约束。

保持IndexedDB主存储与本地优先，不引入账号、后台、分析或云数据库；不使用localStorage存核心业务数据。已有真实用户数据须保全，不清库、不要求卸载或清理站点数据来处理更新问题。先完整校验备份，再允许原子恢复。未来破坏性schema变更必须有明确且实测的迁移路径。

新改关键逻辑/状态转移须同时更新注释、隐私安全日志与对应文档；日志不记录金额、名称、备注、日期/实体ID或备份正文。生成构建、凭据、真实数据及备份不进入Git。正式性能采样须CPU独占，临时Playwright配置必须指定独立outputDir，避免清理其他证据。

## 验证与已有证据

常规命令：`pnpm quality`执行格式、lint、类型、单元/集成、构建；`pnpm test:e2e`指向V4双引擎；`pnpm test:deployed`指向V4部署冒烟。`test:e2e:legacy`与`test:deployed:legacy`仅保留历史用途，不替代新版验收。Node及pnpm版本以package.json/锁文件为准。

- [代码/交互独立审核](../testing/v4/SHELL_CODE_REVIEW.md)：S01–S05、D01–D03关闭；不把作者自测冒充独立签收。
- [正式性能报告](../testing/v4/release/2026-09-29-performance/REPORT.md)及[独立重算](../testing/v4/release/2026-09-29-performance/INDEPENDENT_REVIEW.md)：第五候选49+2完整样本通过；指定产物哈希与本地模拟条件，不是公网或实体iPhone速度。
- [原生200%页面缩放](../testing/v4/release/2026-09-29-native-zoom/REPORT.md)：隔离Chromium官方tabs.setZoom，24路径通过；不是CSS放大或Safari仅文字缩放。
- [页面截图](../releases/v4.0.0-screenshots/README.md)：仅合成数据的真实页面证据。

历史3.x交付仅作存档，见[3.3.0发布记录](../releases/v3.3.0.md)；其数据库、备份格式、视觉和测试数量不定义4.0当前合同。
