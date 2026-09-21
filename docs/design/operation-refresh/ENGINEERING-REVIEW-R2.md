# 全应用操作原型：独立工程审核 C · R2

日期：2026-09-20。唯一一次 R2 已完成。**C-R1-01–05 在本轮所采集的代表流程中均已解决；新增报表保留 1 项 P2 空态契约问题。** 不据此宣称全应用、生产能力或物理 iPhone 验收通过，不启动第三轮。

## 审核对象与方法

本轮只读自己的 [R1](ENGINEERING-REVIEW-R1.md)、[BRIEF](BRIEF.md)、冻结原型和主代理提供的原始证据；未读 DESIGN、DESIGN-RESPONSE、另一审核员报告、COORDINATOR 或主结论。新增报表按用户追加授权审查，不视为范围扩展。

主代理 Browser 是全部 UI 操作与截图的执行者；**C 独立阅读 DOM、查看截图和审查源码，不是 C 独立浏览器实操**。未尝试 Browser/替代引擎。Impeccable 仅采用手工技术审查参考，未运行 context/launcher/engine/hooks，不作正式 critique 或自动评分。源码/合成样本复算与 UI 证据分别注明，未使用设计师自测替代原始证据。

开始和收尾均用只读 `git hash-object` 核对冻结版本一致：

- `app.js`：`8207f0997acd9debca2f62b5f280aa2a6e1593e1`
- `app.css`：`42ad0f7099724d0950221c79f9929c463a370107`

下文 A/B/C 对应 [r2-operations-1](../reviews/operation-refresh/r2-operations-1.json)、[2](../reviews/operation-refresh/r2-operations-2.json)、[3](../reviews/operation-refresh/r2-operations-3.json)，使用其中的 step 前缀定位；例如 B/O8。短屏证据对应 [r2-short-1](../reviews/operation-refresh/r2-short-1.json)、[2](../reviews/operation-refresh/r2-short-2.json)、[3](../reviews/operation-refresh/r2-short-3.json)。共 33 个操作快照、9 项短屏记录（其中一项为几何），不等于 42 项测试通过。

另纳入 [320 主页 DOM](../reviews/operation-refresh/r2-boards-320.json)、[390 主页 DOM](../reviews/operation-refresh/r2-boards-390.json)、[报表补充 DOM](../reviews/operation-refresh/r2-report-extra.json)。已用 view_image 查看用户提供的 10 张 320/390 双主题主页图、4 张短屏失败/返回表单顶部图、5 张报表图以及 focus-pending、category-menu、habit-history 图。全页板图的拼接重复不判为真实双底栏；报表/失败单视口图按实际可见区域判断，不推测屏外布局。

## R1 逐项复核

“已解决”限于下列代表路径及交叉验证，不自动覆盖其余表单、尺寸或输入组合。

| R1 项 | R2 状态 | 主代理原始 UI 证据 | C 源码复核 / 限制 |
| --- | --- | --- | --- |
| C-R1-01 历史习惯可写 | 已解决 | C/H4→H5 选择 9月14日，只改变查询日期/状态；累计仍为 5 次，历史区域明确只读。今日动作独立标为“完成今天”；H7 返回 Today 后显示今日已完成。 | [app.js:192](../prototypes/operation-refresh/app.js:192) 分离今天写入和历史查询；[504 行](../prototypes/operation-refresh/app.js:504) 对非 TODAY 写入直接拒绝。H6 是提交中，不当作成功。未用合成事件尝试绕过写入守卫。 |
| C-R1-02 空标题专注 | 已解决 | A/O1、O2 分别拒绝空/纯空白事项，焦点在事项输入；B/O10 清空历史事项也被拒绝，原历史标题仍保留。 | [startFocus](../prototypes/operation-refresh/app.js:524) 和 [editFocus](../prototypes/operation-refresh/app.js:520) 均校验 trim 后非空；开始时字段禁用。B/O3 是“正在开始”，实际运行由 B/O4 证明。 |
| C-R1-03 失败 Sheet 遮挡 | 已解决（所采集的短屏双主题链） | L2、D2 失败保留 12.34、正餐、日期/时间；浅/深失败图均能看见面板标题、关闭、备注标签、错误及保存。两张 top 图显示返回金额输入后头尾仍分离，无 R1 的表单穿过保存栏现象。L3→L4 第二次 Escape 仅关闭确认，保留草稿；D3 完成后焦点回“记一笔”，D4 设置导航可用。 | [CSS:193](../prototypes/operation-refresh/app.css:193) 改为封闭外层的三行网格，中间 div 滚动；[app.js:376](../prototypes/operation-refresh/app.js:376) 以 preventScroll 聚焦并只调整内容区。外层 320×568 已记录，内层 appFrame 为 null；不声称内层精确尺寸、全过程几何或真键盘通过。 |
| C-R1-04 专注截秒 | 已解决 | B/O5→O6→O7 均为 51 秒的提交/待保存结果；B/O8 成功后 Today 为 25分51秒、本周 1小时15分51秒；O9 历史条目 51秒，今日 2 次/本周 3 次。C/O11 取消另一会话后数值与次数不增。 | [durationLabel](../prototypes/operation-refresh/app.js:47)、[汇总](../prototypes/operation-refresh/app.js:250)、历史行统一保留秒。**O7 虽名为“重试后专注汇总”，DOM 仍是提交中**，成功结论取后续 O8/O9；固定结束点见 550 行，不外推后台/任意延迟。 |
| C-R1-05 异日保存切日/月 | 已解决 | A/F4 已保存 8月19日账目，浏览仍为 9月20日；点击“查看记录”后 F5 才切至 8月19日，出现唯一新增的 12.34 账目。 | [保存](../prototypes/operation-refresh/app.js:470) 只记结果链接，不写浏览日期/月；[显式查看](../prototypes/operation-refresh/app.js:593) 才跳转。F2/F3 都是繁忙状态，不把当时未关闭面板报成失败。新增跨月有 UI，编辑跨月分支仅源码复核。 |

Sheet 关键图：[浅色失败](../reviews/operation-refresh/finance-failure-320-light-r2.png)、[浅色顶部](../reviews/operation-refresh/finance-failure-top-320-light-r2.png)、[深色失败](../reviews/operation-refresh/finance-failure-320-dark-r2.png)、[深色顶部](../reviews/operation-refresh/finance-failure-top-320-dark-r2.png)。普通滚动区边缘裁切不与 R1 的跨 footer 重叠混淆。

## 新增轻量记账报表

| 检查点 | 独立结论与证据 |
| --- | --- |
| 入口与范围 | A/F1 与 320/390 主页图显示独立“报表”入口；日历每日金额、月结余/支出/收入、每日支出趋势和流水仍存在。分类详情移入报表，未增加底栏项。 |
| 月份、收支与聚合 | A/R1：9月支出 1,014.00 元/22 笔；餐饮 1,008.00 元/21 笔/99.4%，交通 6.00 元/1 笔/0.6%。A/R2：收入 12,800.00 元/1 笔，工资 100.0%。C 根据源码合成样本独立算术复算，均相符；这不是对运行时内部数据的读取。 |
| 二级去重 | [app.js:301](../prototypes/operation-refresh/app.js:301) 先按月及收支筛选，每笔只按一级 `entry.category` 加一次，`child` 不再额外累加；合成样本中的正餐/咖啡/公共交通/月薪与上述 UI 总额一致。归档分类不被该聚合过滤，属于源码结论；实际归档后报表没有本轮 UI 证据。 |
| 趋势与文字 | [report-trend](../reviews/operation-refresh/report-trend-r2.png) 有日期范围及零起点说明；DOM 图名列明各日期金额。9月报表范围为 1日至样本今日20日；主页为14日至20日。金额先用整数分求和，再格式化。空态有下述 P2。 |
| 返回上下文 | A/R1→R2→R3 报表内改为8月收入，再 R4 返回仍是9月20日，焦点回“报表”。源码用独立 `reportMonth`（590–592 行），[导航](../prototypes/operation-refresh/app.js:132) 保存来源/滚动。**日期和焦点有 UI，精确滚动恢复仅源码支持，未测位置值。** |
| 双主题、长内容 | [浅色](../reviews/operation-refresh/report-expense-r2.png)、[深色](../reviews/operation-refresh/report-dark-r2.png) 样本金额和条形图一致；[长内容深色](../reviews/operation-refresh/report-long-dark-r2.png) 显示长分类名、12,346,668.90 元及“不足0.1%”。在该单视口可见区域未见金额互压；不能推及320报表长内容或所有屏外区域。百分比四舍五入可能显示100.0%与不足0.1%并存，不等于重复计数。 |

## 实际剩余问题（1 项）

### C-R2-01 · P2：零记录报表仍生成逐日零值折线，空态语义未落实

- 契约：[BRIEF](BRIEF.md) 明确“空数据不画假趋势”。应区分“没有记录可形成趋势”与“有记录月份中的某日金额为零”。
- 主代理 UI：A/R3 的8月收入是 0 笔，却有包含31个零值日期的趋势图 DOM；`r2-report-extra.json` 的“空样本报表”同样显示 0 笔及9月1–20日逐日零值图名。[report-empty-r2.png](../reviews/operation-refresh/report-empty-r2.png) 证明分类区正确显示暂无支出；该图未拍到下方趋势，**不声称截图已经展示零折线**。
- C 静态证明：[dailyExpenseChart](../prototypes/operation-refresh/app.js:282) 不检查记录为空，每天生成 amount=0 的点，随后无条件画点、在点数大于1时画 polyline；[报表调用](../prototypes/operation-refresh/app.js:309) 即使 total=0 也执行。并非仅保留一个不可见图表占位。
- 可复现路径：报表切到无记录月份/收支类型，或选择全空样本再打开报表。影响是用实际数据点/连线形式表达不存在的记录趋势；汇总零值本身正确，未发现金额错误或真实数据写入。
- 最小处置建议：所选月/类型没有记录时，保留零汇总及切换入口，趋势区表达暂无记录，不生成数据点/连线；有记录月份的缺项日仍可按既有统计口径补零。交用户/主代理处置，不另开第三轮，也不要求在原型中增加生产能力。

## 保留的证据边界

- 320/390 五主页两主题有原始 DOM 和图；全页图仅证明对应呈现，不证明全部内部滚动。短屏几何明确是外层 frame 320×568、采集视口810×798，两个 `appFrame` 都为 null，且工具区占用展示高度，不能称“内层320×568实测”。本轮未补430全模块矩阵。
- L3/L4 是实际 Browser 的记账代表嵌套 Escape 链，失败后重试也有结果；没有完整 Tab/Shift+Tab 循环、所有表单焦点、双击压力、保存中所有导航出口、减少动态系统切换的证据，不能泛化通过。恢复替换失败/重试仍未测，不用生产事务缺省冒充该交互通过。
- C/H7、S2、S3 分别显示回 Today、回设置及回戒烟概览；同时间体重 B/H2/H3 摘要/历史均以68.1在前。它们是有限正向证据，不扩大成全模块返回/排序验收。
- 只读静态检查仍为 opaque sandbox（无 allow-same-origin）、父子消息来源/通道校验、内存样本，未发现新增存储/网络/文件 API 调用；日志只见受控事件/模块。**未做运行时网络/存储审计，不存在生产数据访问授权。** 未见新增预算、账户、报表导出或 backend。
- V4事务/校验、50 MiB、15分钟令牌、真实文件交付、后台持久化、迁移/SW/离线不在本轮模拟能力要求内；未重建不列缺陷。系统软键盘、VoiceOver、物理iPhone及后台均未测。

本轮仅新建本报告，未修改 R1、原型、生产、PLAN、依赖、版本或其他代理文件，未运行产品测试、未 commit。两轮独立审核到此结束；剩余 P2 和未测边界交用户决策，本报告不授予生产实施或发布权限。
