# 健康模块 Icon-first R1.1 实施交接

2026-09-21。用户已授权开发与部署；本分工仅在共享工作区实施健康、习惯及对应测试，不提交、不发布。基线和 PLAN 中此前的设计待批准状态由本次明确授权推进，计划、版本和发布记录由主代理统一维护。

## 实施范围

- 健康首页体重、运动标题只保留新增加号，数值／趋势区域为独立原生查看按钮；箭头装饰，不单独聚焦，无嵌套按钮和卡片点击代理。
- 历史页保留实时静态摘要，不使用禁用查看按钮，不隐藏最新体重／运动统计；记录编辑、删除及日期分组保持原实现。
- 无活动戒烟计划时，整卡一次点击进入创建表单，不在导航时写数据。有计划时标题加号进入事件选择，内容按钮进入计划详情；未来计划不允许新增事件。详情页标题加号与独立计划管理内容行分开。
- 事件选择保留“截至现在未吸烟／记录吸烟／记录烟瘾”的业务文字与原有确认口径；快照成功关闭选择层，失败保留错误并允许重试。
- 习惯名称详情和行尾打卡为兄弟控件；“全部习惯”改为内容导航行，健康习惯标题增加单一新增按钮。
- 体重、运动、目标、习惯、戒烟计划、吸烟、烟瘾和原因编辑均接入共享 `Sheet.headerAction`。`useId` 对应真实 form，外置 ✓ 使用原生 form 关联执行原有提交；关闭仍走原草稿与忙碌保护。
- 烟瘾的两个“结果＋保存”按钮拆为可见“现在的感受”字段和单一 ✓，保存同一 outcome 枚举；失败保留选择，重试沿用同一记录 ID。
- 体重目标清除、记录删除、放弃草稿和结束计划等破坏性操作保留文字及原确认。无体重目标时不渲染空 footer 或横线。

## 实现文件与依赖

本次生产文件：

- `src/features/health/HealthPage.tsx`
- `src/features/health/HealthSaveAction.tsx`（新增，统一原生表单关联按钮）
- `src/features/health/health.css`（新增，仅健康／习惯及健康编辑器布局）
- `src/features/health/WeightTrendChart.tsx`
- `src/features/health/cessation/CessationCard.tsx`
- `src/features/health/cessation/CessationForms.tsx`
- `src/features/health/cessation/CessationPage.tsx`
- `src/features/habits/HabitsPage.tsx`

主代理提供 `Sheet.headerAction: ReactNode` 及共享 `icon-action`、`content-entry`、`content-entry-copy` 样式；本分工没有修改共享 Sheet、global.css、版本或 PLAN。健康局部选择器提高 specificity，覆盖原有健康规则，不依赖 feature CSS 最后导入。

Impeccable 采用手动 SKILL／operate／craft／craft-floor 参考，落实既有 Ocean、可见字段、状态保护和局部间距；未运行启动器、下载器或 hooks。最新用户授权与 R1.1 操作区分离契约优先于历史提案的固定双按钮描述。

## 样式与数据安全

标题和内容相隔16px，内容触点最小64px、gap16px；独立图标按钮由共享样式保证44px。习惯行、目标分隔区保留16px留白。未重新引入滚动条或创建额外滚动容器。

按钮内体重图表使用 span／SVG／span caption，外部图表仍可使用 figure／figcaption。图表不包含交互控件；没有记录不绘制合成点，空态仍可进入真实历史。历史摘要是静态 div，保留 `.weight-overview` 的真实数值。

IndexedDB repositories、schema、备份、整数体重单位、日期和备注持久化保持原契约。未迁移原型的模拟数据或丢字段行为。原有写锁、PWA busy guard、草稿确认、失败保留及删除确认继续有效。新增日志只含动作、实体类型或状态，不输出体重、金额、名称、备注或戒烟感受值。

## 测试与集成名称

本分工实际执行：

- `./node_modules/.bin/tsc -b --pretty false`：通过。
- 健康／习惯源码及新增测试、四个健康相关 E2E 文件的 ESLint：通过。
- 定点 Vitest：7文件25项通过，包括下列7个文件。
  - `tests/integration/health-ui.test.tsx`
  - `tests/integration/health-history.test.tsx`
  - `tests/integration/habit-ui.test.tsx`
  - `tests/integration/cessation-ui.test.tsx`
  - `tests/integration/icon-first-health.test.tsx`（新增5项：空历史、整卡创建、读写分离、两种烟瘾结果失败重试）
  - `tests/unit/form-write-guard.test.tsx`
  - `tests/unit/cessation-draft-confirmation.test.tsx`

更新但未由本分工独立执行的浏览器测试：`mobile-polish.spec.ts` 的健康入口部分、`cessation.spec.ts`、`health-history-scroll.spec.ts`、`habit-heatmap.spec.ts`。保留原业务断言，仅同步入口、页头表单关联及可访问名称；`mobile-polish` 改验整卡最小64px、gap16px、无嵌套动作和单击创建，不再要求旧文字按钮居中或二次创建。

主代理反馈：整版 unit 275项通过；全量 E2E 已启动，结果以主代理最终记录为准。本分工不将其运行中状态写为通过，也不宣称真机、实际误触率或全尺寸视觉通过。

| 场景 | 保存按钮名称 |
| --- | --- |
| 体重 | 保存体重 |
| 目标 | 保存体重目标 |
| 运动 | 保存运动 |
| 习惯 | 保存习惯 |
| 戒烟计划 | 保存戒烟计划 |
| 吸烟 | 保存吸烟记录 |
| 烟瘾 | 保存烟瘾记录 |
| 原因 | 保存戒烟原因 |

忙碌时以上名称追加“，保存中”；关闭统一“关闭编辑器”。新增习惯为“新增习惯”；无计划整卡为“创建戒烟计划”；体重／运动查看由 link 改为 button，名称仍为“查看体重历史／查看运动历史”；全部习惯 link 为“查看全部习惯”。新增事件先打开“记录戒烟事件”选择层，之后再选择具体类型。保存按钮在 sheet header，测试不能再在 form 内查询保存按钮，应查询 dialog 或 screen 并核对 `button.form`。

`tests/e2e/app-shell.spec.ts`、`tests/deployed/pages.spec.ts` 由主代理更新，本分工未写入。历史页 `.weight-overview` 数值断言继续有效。

## 冻结与剩余验收

生产文件已冻结，后续仅处理主代理全量 E2E 提供的具体失败。整合构建、全量浏览器回归、发布和版本升级由主代理负责。iPhone 键盘、安全区、长按、VoiceOver 和真机误触检查仍须实际验证，不能以 DOM 测试替代。
