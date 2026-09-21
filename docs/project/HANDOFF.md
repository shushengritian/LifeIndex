# LifeIndex 会话交接

整理日期：2026-09-21。应用保持 **3.3.0**；本次只整理开发与交接文档，不改变产品行为、数据结构或线上构建。

## 新会话从这里开始

1. 阅读根目录 [AGENTS](../../AGENTS.md)、[产品基线](../../LifeIndex-Project-Baseline.md)、[PLAN](../../PLAN.md)。
2. 执行 `git status --short`、`git log -5 --oneline`，核对实际分支及用户未提交的改动，不假设工作区干净。
3. 按下表定位代码，阅读相关需求、数据契约及测试，再根据用户的新反馈确定范围。
4. 用户未提供新需求时，不自行恢复讨论中的方案、不重做 UI、不升级依赖或重新发布。

本次整理开始时，工作分支为 `codex/g5-ocean-implementation`，HEAD 为 `5e866fe`。`AGENTS.md` 有用户已有的未提交改动，须原样保留。这些是交接时快照，不替代新会话的 Git 检查。

## 运行与交付状态

- 仓库：`https://github.com/shushengritian/LifeIndex.git`。
- 使用入口：[LifeIndex](https://shushengritian.github.io/LifeIndex/)。保持同一主屏幕入口，不清除网站数据。
- 线上应用源码：`388c07774644e94d30999bf81f8ce36d2b5c351e`；部署证据见 [3.3.0](../releases/v3.3.0.md)。
- 五个入口：今天、健康、专注、记账、设置；当前批准范围已经实现，进入日常试用。
- 数据库逻辑版本 5，九张业务表；导出 V5，导入 V0/V1/V2/V5。应用版本、数据库版本、备份版本独立。
- 真机专项仍按 [iPhone 清单](../operations/IPHONE_ACCEPTANCE.md)由用户确认。自动化中的 WebKit 离线整页重载跳过项不算通过。

## 当前分类与范围边界

默认支出是 **餐饮、交通、购物、居家、健康、娱乐、其他支出**，共 7 项；默认收入为工资、奖金、退款、其他收入。分类支持两级，二级分类只填名称、继承一级样式。图标分组用于选择图标，不等于默认业务分类。

会话末讨论过精简到 9 个默认支出分类（餐饮、交通、购物、居家、娱乐、健康、人情、工作、其他支出），但用户尚未确认，**不属于已批准开发任务**。今后若调整，需重新确认；保留稳定分类 ID、用户自定义名称、排序、归档状态及账目引用。初始化只补缺失 ID，修改种子名称不会自动重命名已有分类。

用户选择暂时维持应用内记账，不推进截图识别或外部记账录入。后续会话不要据此前讨论自行开发。

## 代码与变更定位

| 变更领域 | 主要入口 | 联动检查 |
| --- | --- | --- |
| 路由、导航与今日聚合 | `src/app/App.tsx`、`src/app/AppShell.tsx`、`src/app/NavigationGuard.tsx`、`src/features/today/` | 返回来源、焦点、草稿、底部导航与安全区 |
| 记账与报表 | `src/features/finance/`、`src/data/repositories/TransactionRepository.ts` | 金额整数分、分类引用、本地日期、日历返回上下文 |
| 分类与图标 | `src/features/settings/CategoryManager.tsx`、`src/data/repositories/CategoryRepository.ts`、`src/data/db/seeds.ts`、`src/shared/domain/categoryIcons.ts`、`src/shared/ui/CategoryIcon.tsx` | 两级约束、图标校验、备份兼容、种子幂等、排序归档 |
| 健康与习惯 | `src/features/health/`、`src/features/habits/`、`src/data/repositories/WeightRepository.ts`、`ActivityRepository.ts`、`HabitRepository.ts` | 整数克、日期键、计划日、重复打卡、历史编辑 |
| 专注 | `src/features/focus/`、`src/data/repositories/FocusRepository.ts` | 单一 active、时间戳重算、自然完成与提前结束、只汇总 completed |
| 设置、备份与升级 | `src/features/settings/SettingsPage.tsx`、`src/data/backup/`、`src/data/db/`、`src/shared/validation/schemas.ts` | 校验后预览、九表原子恢复、迁移失败回滚 |
| 外壳、主题与弹层 | `src/styles/global.css`、`src/shared/ui/Sheet.tsx`、`src/shared/ui/ConfirmDialog.tsx` | 深浅色、小屏、滚动条、键盘、长按菜单关闭后的导航位置 |
| PWA 更新与发布 | `src/pwa/`、`src/sw.ts`、`vite.config.ts`、`.github/workflows/` | 应用外壳缓存、更新保护、Pages 子路径、安装图标 |

领域类型在 `src/shared/domain/types.ts`，运行时校验在 `src/shared/validation/schemas.ts`，安全日志在 `src/shared/logging/logger.ts`。模块职责见 [HLD](../architecture/HLD.md)，流程见 [LLD](../architecture/LLD.md)。

## 后续实现纪律

- 保持本地优先，不假设用户仍无真实数据；不清库、不重置分类、不要求卸载来解决更新问题。
- 不改变已认可的 Ocean 深浅主题。图标操作保留可访问名称；危险操作保留清晰确认。右侧滚动条、系统菜单取消后的导航位置列为回归重点。
- 关键逻辑同时补注释、安全日志和对应文档，不记录金额、名称、备注或备份正文。
- 常规验证使用 [DEV](../development/DEV.md)；发布按 [部署指南](../operations/DEPLOYMENT.md)。文档整理不等于需要升级版本或重新部署。
- 当前截图目录只作历史视觉参考，不作为最新原型或真机验收证据。

## 本次收尾验证

2026-09-21 在未修改应用源码的基础上重新执行：

| 检查 | 本次结果 |
| --- | --- |
| Prettier、ESLint、TypeScript | 通过 |
| Vitest 全量单元与集成 | 48 文件、252 项通过 |
| Vite 生产构建与 Service Worker | 通过；构建工具报告 `inlineDynamicImports` 弃用警告，不影响构建结果 |
| Playwright Chromium / mobile-safari | 91 项通过、1 项既有 WebKit 离线整页重载跳过，耗时 1.3 分钟 |
| Markdown 本地文件链接 | 48 文件、145 处链接目标存在；不涵盖外部 URL 或页内锚点 |
| Git 差异检查 | `git diff --check` 通过；未改应用源码、依赖锁文件或版本号 |

`pnpm quality` 首次被本机 pnpm 联网/依赖自检阻断，未强制重装；以上结果来自 [DEV](../development/DEV.md) 中的直接工具命令。浏览器日志为本机临时文件 `/tmp/lifeindex-session-close-e2e.log`，不作为跨设备持久证据。本次未重新发布、未重新执行线上验证，也未执行物理 iPhone 验收；历史发布结果仅见发布记录。
