# I4 健康操作体验实现

更新：2026-09-21。依据已批准的 [设计契约](../design/operation-refresh/DESIGN.md)和 [交接稿](../design/operation-refresh/HANDOFF.md)。本增量仅健康、习惯、戒烟源码、对应测试与本文档；未提交、推送或发布。共享工作区其他修改保持原样。

## 实现

- 体重、运动、目标、习惯、戒烟开始计划、吸烟、烟瘾与原因编辑由表单持有 structured Sheet。统一使用已有 `sheet-form--structured`、`sheet-form-body`、`sheet-form-fields`、`sheet-form-footer`，固定头尾、仅内容区滚动；不新增全局 CSS，沿用隐藏滚动条规则与 Ocean 双主题。
- 顶部关闭、Escape、取消共用草稿判定；保存期间锁定控件和退出。原生确认拥有 Escape，不再另挂戒烟 document 键盘处理器。
- 体重、运动、戒烟记录的删除位于详情内，原确认/失败重试保留；删除确认期间锁定底层编辑器，避免保存与删除竞争。仓储、ID、数据版本及吸烟撤销同日确认的语义不改。
- 体重/运动/目标打开时保留编辑依赖快照；后台重读失败不会卸载输入。戒烟保留计划快照，读取失败时不提前返回并卸载编辑层；关闭后可用原读取重试入口。
- 错误反馈使用 `HealthFormError`：焦点进入本地错误提示，以 preventScroll 避免移动页面，仅调整编辑内容区滚动；有原生确认时不抢焦点。日志不含输入内容。
- 健康内习惯名称为详情链接，独立右侧按钮执行今天打卡/撤销；更新后主动重读。统计关闭支持顶部关闭/Escape，保留 `todayReturnKey` 的原有今天返回实现；历史热力格仍只读。
- 戒烟子页接受封闭来源 `location.state.from === 'settings'` 返回设置，否则返回健康。主流程已在 SettingsRow 接入该状态，并加入浏览器往返回归；不接受任意跳转 URL。

## 文件

- `src/features/health/HealthPage.tsx`
- `src/features/health/HealthFormError.tsx`（新）
- `src/features/health/cessation/CessationForms.tsx`
- `src/features/health/cessation/CessationPage.tsx`
- `src/features/habits/HabitsPage.tsx`（保留本批之前的今天返回改动）
- `tests/integration/health-history.test.tsx`、`health-ui.test.tsx`、`habit-ui.test.tsx`、`cessation-ui.test.tsx`
- `tests/unit/cessation-draft-confirmation.test.tsx`

## 验证与边界

定点覆盖：体重/运动/目标创建编辑和失败、删除确认失败重试、结构化 footer 与关闭锁、后台读取失败保留体重/运动草稿、习惯详情/打卡分离及原 todayReturnKey 返回、戒烟保存失败同 ID 重试、输入锁与删除锁、Escape 分层、原生时间输入值保留。

最终定点复验（含错误焦点断言）：7 文件 / 24 项通过，10.32 秒；类型、健康/习惯源码及本批测试 scoped lint、git diff --check 通过。最初全局类型检查遇到其他工作区设置测试的 ByRoleOptions exact 问题，没有越界修改；随后类型复跑通过。

健康历史 activity 删除曾在主流程并发全量执行时超时；本批单独复跑和后续 7 文件串行运行通过，未调高测试超时。戒烟旧断言原本要求没有任何 dialog，已修为取消确认后保留编辑器。

DOM 测试不证明真实布局/软键盘/浏览器滚动/VoiceOver。主流程负责真实浏览器短屏、双主题、底栏、隐藏滚动条、主屏更新与最终发布；物理 iPhone 验收由用户完成，不记为通过。没有修改 schema、仓储、共享控件、Today/Focus/Finance、样式、版本或计划。
