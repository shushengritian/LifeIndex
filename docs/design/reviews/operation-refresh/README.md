# 全应用操作体验 — 浏览器证据

仅合成内存原型；不是生产数据或 iPhone 真机证明。

第一轮：主代理用 Browser 采集原始截图/DOM。体验与工程审核员没有各自 Browser 实例，各自独立阅读相同原始证据和源码，未自行操作。未使用原计划中的 ux-r1/、engineering-r1/ 子目录。最终结论以 [审核处置](../../operation-refresh/REVIEW.md) 为准。

R1 原始记录：r1-raw-operations.json 17 项、r1-extra-operations.json 5 项、r1-keyboard.json 4 项；r1-boards.json 保存五模块和外层展示尺寸。截图按 r1 后缀保存，失败面板另有两张非整页定点复现图。DOM 存在不证明控件视觉可达；整页拼接重复不作实际双底栏证据。

## R2 原始证据

原型 app.js Git blob `8207f0997acd9debca2f62b5f280aa2a6e1593e1`，app.css `42ad0f7099724d0950221c79f9929c463a370107`。采集开始和冻结交接后 hash 一致；业务脚本未在采集中变更。审稿壳增加尺寸/工具显示选择，不触碰原型状态实现。

- [连续操作 1](r2-operations-1.json)、[2](r2-operations-2.json)、[3](r2-operations-3.json)：共 33 个状态，包含报表收支/空月/返回、异月保存和显式查看、专注校验/跨页/51 秒结束失败及重试/秒级汇总/历史校验/取消、体重同时间排序、习惯历史查看和今日打卡、戒烟来源返回、分类范围/菜单。部分状态是繁忙中，不把快照数量视为通过用例数量。
- [短屏 1](r2-short-1.json)、[2](r2-short-2.json)、[3](r2-short-3.json)：9 项记录，含浅深色失败/字段保留/重试、草稿两次 Escape、导航和外层 320×568。审稿工具占用部分高度，无法读取 opaque 内层几何，记录为 null；不能把 320×568 宣称为 App 实际内容视口或真实 iPhone。
- [320 主页](r2-boards-320.json)、[390 主页](r2-boards-390.json)：各五模块双主题 DOM，截图 `模块名-宽度-r2.png`。每张代表对应主页，不证明长表单、全部控件几何或全部流程。
- [报表长内容/空数据](r2-report-extra.json)：对应 report-long-dark-r2.png、report-empty-r2.png。普通样本另有 report-expense-r2.png、report-dark-r2.png、report-trend-r2.png。
- 关键截图：finance-failure-320-light-r2.png、finance-failure-top-320-light-r2.png 及 dark 两张；focus-pending-r2.png、category-menu-r2.png、habit-history-r2.png。

主代理还通过 DOM 读取初次载入外层 `scrollY: 0`、`activeElement: BODY`、390×844 两 frame；没有把初始截图位置推断为全程焦点正确。错误 selector 曾使用“提前结束”而实际 accessible name 为“提前结束专注”，读取新 DOM 后更正；第一次 selector 未执行动作，不算产品故障。

报表样本：支出 1,014.00 元/22 笔，餐饮 1,008.00、交通 6.00；收入 12,800.00 元/1 笔。长样本 12,346,668.90 元、小分类显示“不足 0.1%”；这些全为合成值，不是用户记录。报表百分比有显示舍入，真实比例用于条长。

证据已完成 B/C 一次独立复核，两轮到此结束。两份报告各自关闭首轮问题，并保留同一项报表空态 P2；详见 [最终处置](../../operation-refresh/REVIEW.md)，不由快照数量或代理共识代替用户验收。

## 用户要求后的 OPEN-01 定点收尾

2026-09-20 用户要求「开始收尾」后，主代理修复空趋势并采集新证据；没有第三轮自动代理审核。以上 R1/R2 记录按当时事实保留。

- [收尾原始记录](closeout-evidence.json)：5 个 Browser 状态，浅色空八月 → 切回九月支出 → 九月收入缺项日补零；深色全空收入 → 切换空支出。空态无趋势图像，汇总、月份/收支控件与五导航保留。
- [浅色空月份](closeout-empty-light.png)、[深色空样本](closeout-empty-dark.png)：可见视口截图，确认空态提示和导航可见，不是全尺寸或 iPhone 验证。
- 原型 `app.js` blob `ca5cead7d100dd9b87927add813f7be66718858e`；CSS 与 R2 相同。14 组 DOM 检查结果及测试边界见 [收尾记录](../../operation-refresh/CLOSEOUT.md)。原型已记录问题完成处置，用户最终验收仍待确认。

## 边界

整页板图包含截图工具拼接的重复底部片段，不作为应用真实双底栏的证明。失败态与报表关键图使用可见视口截图。无真实文件、IndexedDB、离线更新、后台持久化、系统弹框、软键盘、VoiceOver 或物理 iPhone 通过结论。原型热力触点与窄屏日期格小于44px的限制仍需在生产实现时评估，未伪装为全触控通过。

截图文件按审核轮次保留。不同轮次不能混用为同一修订通过的证明；最终交付后在此补充本轮实际检查范围与未测边界。
