# 全应用操作原型：独立工程审核 C · R1

日期：2026-09-20。结论：本次集中首审完成，保留 **2 项 P1、3 项 P2**，交设计代理修订后一次 R2 复核；不代表生产或真机验收通过。

## 范围与证据口径

依据 [工程检查清单](ENGINEERING-CHECKLIST.md)、AGENTS、baseline、PLAN、BRIEF 及生产页面/组件/相关测试。未读 DESIGN、UX 库存/报告或 COORDINATOR-R1；不评价审美、不修改原型。

**执行者是主代理的 Browser；C 独立阅读原始 DOM、用 view_image 看图，并交叉审查源码，并非 C 独立实操。** C 的 Browser 实例不可用；此前替代引擎尝试已终止，其截图与结果不计入本报告。没有进一步启动独立浏览器或切换工具绕过。Impeccable 仅采用手工技术审核参考，未运行 context/launcher/engine/hooks，不作正式 critique 或全量评分。

| 标识 | 原始证据 | 使用边界 |
| --- | --- | --- |
| O1–O17 | [r1-raw-operations.json](../reviews/operation-refresh/r1-raw-operations.json)，按数组顺序编号 | 主代理连续模拟操作及完整 DOM 状态；不是 C 的操作或生产写入证据。 |
| X1–X5 | [r1-extra-operations.json](../reviews/operation-refresh/r1-extra-operations.json)，按数组顺序编号 | 二级分类保存、今日打卡、历史日期、设置到戒烟管理往返；历史日期只采集到操作入口，未执行补打卡。 |
| K1–K4 | [r1-keyboard.json](../reviews/operation-refresh/r1-keyboard.json)，按数组顺序编号 | 主代理 Browser 的 320 深色二级分类新建代表键盘链；不泛化为全表单焦点测试。 |
| B | [r1-boards.json](../reviews/operation-refresh/r1-boards.json) | 五模块 390 双主题 DOM；320/430 外层 frame 尺寸与导航存在记录。320/430 均记录高 844，不是 320×568 或真机。 |

已逐张看五模块的 `*-pair-r1.png`、`*-320-r1.png`，以及 finance-failure、focus-pending、category-menu、finance-board、habit-history 和 keyboard-return-320 补充图，均在 [证据目录](../reviews/operation-refresh/)。全页图存在底部重复片段，不能把拼接现象当原型缺陷。430 的外层尺寸记录不替代内层几何/滚动截图。

查阅时生产 HEAD 为 `41066c3`，冻结原型 SHA-256 前 12 位：`index.html 3f2bdb44be63`、`app.html 088addaa7a2f`、`review.js 9235038c3ba4`、`app.js d88d51c4dbb7`、`app.css 6b23b20f18b9`。以下行号对应此稿。生产测试只读断言，未重新执行；O/X 共 22 个原始状态，另有 K 的 4 个状态，不换算为等量测试通过。

## 关键发现（最多五项）

### C-R1-01 · P1：历史习惯查询扩展成补打卡/撤销历史写入

- 契约：H03。现有 [HabitsPage](../../../src/features/habits/HabitsPage.tsx:728) 明示“点击只查看，不补打卡”；[habit-ui 测试](../../../tests/integration/habit-ui.test.tsx:82) 保持查询不写记录。
- 原始 UI：X3 与 [habit-history-r1.png](../reviews/operation-refresh/habit-history-r1.png) 显示“阅读 20 分钟”选择 2026-09-14 后，出现可用的“完成这一天”。浅色独立入口，截图内原型约 430×664。
- C 静态结论：[app.js](../prototypes/operation-refresh/app.js:170) 对所有符合计划的所选日展示写按钮；[checkHabit](../prototypes/operation-refresh/app.js:410) 使用 `habitDay` 添加/删除历史 `checks`，没有限定今天。故不是仅文案相似的只读入口。X3 尚未点击该按钮，**历史实际变更未作 UI 验证**。
- 复现路径：健康 → 阅读详情 → 日期 9月14日 → 完成这一天；已完成的历史日则显示撤销。影响是查询流程引入未批准的历史数据修改语义。
- 修订验收：过去日期仅查询，不提供/执行补打卡或历史撤销；今天仍可显式打卡/撤销，查询前后累计不变。无需引入生产仓储。

### C-R1-02 · P1：空标题可启动并保存专注，偏离现有有效输入契约

- 契约：O01。生产 [FocusPage](../../../src/features/focus/FocusPage.tsx:144) 要求去空白后的标题；[schema](../../../src/shared/validation/schemas.ts:183) 使用非空 `normalizedText(100)`，不是可选字段。
- 原始 UI：O8 明确未填事项却开始倒计时；O12 保存后历史名为“专注”。B 的两主题 DOM 和专注截图也将事项标成“可选”。
- C 静态结论：[app.js](../prototypes/operation-refresh/app.js:200) 宣告可选；[startFocus](../prototypes/operation-refresh/app.js:428) 只校验分钟，保留空 `title`；历史展示用回退文字掩盖空值，并未产生有效标题。详情编辑同样没有非空限制（426 行）。
- 复现路径：专注 → 留空事项 → 开始 → 提前结束并保存。空白字符串也能绕过。提案承诺了现有生产命令会拒绝的成功路径，实施时容易被迫改动业务约束。
- 修订验收：开始及详情编辑保持有效标题要求；无效时指出字段、保留草稿且不开始/改写会话。这是交互契约修订，不要求原型接入 schema 或持久化；若要放开标题，须另行取得产品范围决策。

### C-R1-03 · P2：记账失败后的 Sheet 保存栏遮挡表单，错误聚焦未守住内部滚动边界

- 契约：A03/A04、M02/M03、S04。
- 原始 UI：O2–O3（12.34、餐饮/正餐、日期 9月19日、模拟写失败）与 [finance-failure-r1.png](../reviews/operation-refresh/finance-failure-r1.png)。浅色独立入口，外层截图 1280×720、原型约 430×664。日期/时间输入被保存栏压住；备注输入出现在保存按钮下方而标签不可见；面板标题和关闭按钮不在可见区域。**这是失败状态的可见遮挡，不等于 DOM 中删除了控件或证明无法滚回。**
- C 源码交叉验证：[表单结构](../prototypes/operation-refresh/app.js:270) 本应为头部 → 可滚动 fieldset（含错误）→ footer；[失败处理](../prototypes/operation-refresh/app.js:294) 直接对错误 `focus()`，未防止外层自动滚动；[CSS](../prototypes/operation-refresh/app.css:158) 同时限制 dialog/form 高度、让 fieldset 滚动，但未明确封住 dialog 外层滚动。具体是哪一层滚动/裁切，尚无内层几何记录，不能把推测写成已定位根因。
- 修订验收：沿 O1–O4 同一路径失败后，输入、错误与保存栏不互相覆盖；内部内容可滚到两端，关闭/重试可达，背景/底栏不被带动。R2 只需补此链的 320 短视口与双主题检查，不要求重建手机键盘。

### C-R1-04 · P2：专注统计截掉秒数，短会话保存后总时长看似未增加

- 契约：O01/O03、S05。
- 原始 UI：O10–O12，提前结束固定在 33 秒，失败重试后出现“33 秒”历史、次数由 1 变 2，但“今天已存”仍为“25 分钟”，未表达应有的 25分33秒。
- C 静态结论：[app.js](../prototypes/operation-refresh/app.js:201) 对总秒数直接 `Math.floor(.../60)`；今天首页（141 行）、历史汇总（195 行）亦如此，记录行满一分钟后也丢余秒（204 行）。生产 [durationLabel](../../../src/features/focus/FocusPage.tsx:95) 明确保留秒数，汇总复用该规则（715 行）。
- 复现路径：已有 25 分钟样本 → 新会话提前结束于不足一分钟 → 保存成功 → 比较历史与摘要。空样本仅保存 33 秒会显示“0 分钟”是**源码可推导、未采集 UI**的分支。
- 修订验收：历史与汇总对同一已保存时长使用一致的准确单位，短会话可见秒数；不把运行、取消或失败会话计入。不要求模拟后台计时。

### C-R1-05 · P2：异日记账成功会静默移动浏览日期/月

- 契约：F01、S05。生产 [FinancePage.save](../../../src/features/finance/FinancePage.tsx:339) 保留浏览日，显式“查看记录”才跳转；[对应测试](../../../tests/integration/finance-confirmation.test.tsx:69) 断言这一行为。
- **C 静态发现，非已完成的 UI 复现**：[app.js](../prototypes/operation-refresh/app.js:381) 在新增/编辑成功时无条件赋值 `selectedDate=v.date; month=v.date.slice(0,7)`。后续立即重绘日历，也没有显式查看保存日期的中间选择。
- 复现路径：记账页浏览 9月20日 → 新增账目，日期改 9月19日（或上一月）→ 保存；源码将选中日/月一起移动。用户原有浏览上下文被保存动作隐式改变。
- O4 只证明从“今天”跨日保存后回到“今天”，**不能充当本问题的日历 UI 证据**；其今日支出保持 68.00 是正确的，不能误报摘要漏更新。
- 修订验收：新增/编辑异日账目不改变原浏览日期/月；明确选择查看保存日期后再跳转，保留 Today 快捷入口的来源返回。

## 已有正向证据与未测项

- O1–O4 支持记账脏草稿取消后继续、保存中控件禁用、写失败保留金额/二级分类/日期、重试后回 Today 及触发器焦点；**没有双击次数或每个出口的全链证明**。O6–O7 支持体重 Escape 弹出草稿确认及保存后返回健康；未覆盖健康写失败。
- O8–O12 支持同一运行会话跨健康往返；提前结束失败与重试记录均为 33 秒，失败未增加次数，成功才增加。源码 206、452 行固定结束点；不外推为任意延迟、后台/iOS 验证。取消不计统计的代码路径存在，实际取消后的统计未采集。
- O14–O16 支持模拟预览 → 明确全部替换确认 → 安全取消 → 返回设置；X1/X2 支持二级名称保存及 Today 原位打卡。恢复替换失败/重试、双击/繁忙导航没有原始操作证据，直接记未测。
- K1–K4 与 [keyboard-return-320-r1.png](../reviews/operation-refresh/keyboard-return-320-r1.png) 支持 320 深色的二级分类代表链：输入 → Escape 弹确认并聚焦继续编辑 → 再 Escape 仅关闭顶层、名称及输入焦点保留 → 明确放弃后聚焦原新增入口 → 底部健康导航可操作。这证明该链无残留层阻断，不证明 Tab 循环、所有表单或真机通过。
- 五模块 320/390 两主题首页均有可见呈现证据，B 支持 320/430 外层尺寸及两侧导航存在。它们**不证明**最长表单、内部滚到末项、底栏全程几何稳定、键盘 Tab/Shift+Tab 循环或 320×568 可用。减少动态仅看到 [CSS 声明](../prototypes/operation-refresh/app.css:225)，未切系统偏好验证；VoiceOver、Files、长按拖动、软键盘、物理 iPhone 均未测。

## 隔离、隐私及生产能力边界

静态加载链为审稿板 → [index.html](../prototypes/operation-refresh/index.html:27) → `sandbox="allow-scripts allow-forms"` 的 app.html，无 `allow-same-origin`、下载/弹窗权限；[app.html CSP](../prototypes/operation-refresh/app.html:6) 禁止连接、worker、子 frame、表单外发。主代理 DOM 证明内层已加载并可操作，但没有独立运行时存储/网络审计，**不声称所有浏览器能力均已实测隔离**。

父子消息各校验 `event.source` 和通道，输入为固定审稿动作及 allowlist；`'*'` 用于给 opaque frame 发消息，不因此直接判漏洞。检查整条静态链未发现生产初始化导入、IndexedDB/localStorage/sessionStorage/cache/SW 或文件/网络 API 调用。[日志](../prototypes/operation-refresh/app.js:44) 只输出受控事件和模块；未见将金额、备注、标题或输入值写入日志。上述为源码结果，不是日志抓包或生产数据访问授权。

完整 V4 校验与跨表事务、50 MiB、15 分钟令牌、真实文件交付、后台持久化、迁移/SW/离线均属生产能力专项；未在模拟原型重建**不列缺陷、不要求补做**。只要求交互不改变既有数据语义，失败/取消不冒充成功。

本轮只新增本报告；未改 src/public、原型、依赖、版本、存储、PLAN 或其他代理文件，未运行全量产品 tests、未 commit、未推进发布门槛。现有证据足够完成 R1，不再向主代理追加操作；修订后的唯一一次 R2 聚焦上述五项及已列明的高优先未测链。
