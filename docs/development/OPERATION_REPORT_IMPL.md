# Operation-refresh：只读记账报表侧车

2026-09-20。用户授权按已收尾设计开发；本子任务仅负责领域投影、报表组件与共享日报图。FinancePage/路由、共享 Sheet、全局样式、主计划、集成与发布由主任务负责。本文件记录实际实现与检查，不将原型验收等同于生产验收。

## 数据契约

- `buildFinanceMonthReport(transactions, categories, monthDate, today, type)`：按完整本地月份与类型投影 `totalMinor`、`recordCount`、一级 `categories`；提供 `monthRange` / `trendRange`。日期均为有效 `YYYY-MM-DD`，不是裸 `YYYY-MM`。当前月趋势截止父组件提供的真实本地 `today`；其他月（含未来月份）为整月。月汇总仍统计该整月，趋势与月汇总的日期范围明确分开。
- `buildDailyTransactionSeries(transactions, { from, to }, type)`：范围含首尾，依据 `localDate` 而非 UTC `occurredAt`。返回计数、整数分总计、最大值与每日 `days`。范围/类型无记录时 `days=[]`；有记录的范围才补零，单日允许一个点。
- 一级与二级每条只归属一次；归档不排除历史记录。缺失父类按原父 ID 保留历史分类桶，缺失/循环/跨域/错类型引用不递归、不丢失金额，使用「历史分类」和安全默认图标。
- 分类按金额降序，等额按 ID 稳定排序；占比展示一位小数，正数且小于 0.1% 显示「不足 0.1%」。条形长度用未舍入的比例，不为了可见性夸大小项。四舍五入后的文字比例不保证相加严格等于 100.0%。
- 求和复用 `sumMoneyMinor`，全月、分类和日报均不允许超过安全整数；失败抛 `RangeError`，不静默取整/截断/钳制金额。输入数组、分类和记录不被修改。没有存储、请求、路由或写入副作用。
- `formatFinanceReportMoney` 使用整数分拆出的 BigInt 元/分和既有 CNY 本地化样式，避免 `Number.MAX_SAFE_INTEGER / 100` 格式化丢失最后一分；仅为显示投影，不改变金额存储或全局 money helper。
- 日志仅固定事件、操作、类型、结果分支和异常类；不输出金额、日期、分类名称/ID、备注或记录内容。

## 组件与集成契约

`FinanceReport` 导出以下受控接口，不自有路由、不读库、不操作焦点/滚动：

```ts
interface FinanceReportProps {
  transactions: Transaction[]
  categories: Category[]
  monthDate: string
  today: string
  type: TransactionType
  onTypeChange: (type: TransactionType) => void
  onMonthChange: (delta: number) => void
}
```

父层负责标题/返回入口、来源记账月日与滚动恢复、整月账目与全部历史分类的读取、loading/read-error、真实本地日期更新。只在读取成功时挂载组件；不要以 `[]` 代替读取失败。点击切月回调只传 `-1`/`1`，收支按钮仅请求新选择，由父层更新 props。组件呈现成功读取后的无记录空态；聚合溢出/非法日期单独显示计算错误，不显示错误的零值。

月份上下界与父路由统一为 `1000-01` 至 `9999-12`，到边界禁用对应方向按钮；月份合法但金额溢出时仍可切月。日报循环到末日即退出，不会再从 `9999-12-31` 向后推进。主页七日窗口先判断月初裁剪，再执行减日，避免 `1000-01-01` 回退产生三位数年日期键。

`DailyExpenseChart` 原 `transactions` / `selectedDate` 调用兼容；新增可选 `fromDate`（显式起日）与 `type`（缺省支出）。无 `fromDate` 时保留“最多七日且裁剪到本月初”，报表传月起日和趋势终日。二者使用同一日报领域投影，空范围不生成 SVG，非空单日仅一个点，多日折线保留零基线。日报文本替代保留每天金额。

### 样式交接

遵循 Impeccable 手动 Operate 规范，继承已验收 Ocean 视觉；不运行 launcher/engine、设计扩展或独立浏览器验收。本子任务不改 CSS。

- 复用 `month-navigation`、`segmented-control` / `segment-active`、`month-summary`、`content-section`、`empty-state`、`form-error`、`category-glyph` / `tone-*`、`daily-expense-chart` / `daily-expense-axis`。
- 新类：`finance-report-body`、`finance-report-month`、`finance-report-types`、`finance-report-summary`（仅两列）、`finance-report-section`、`finance-report-hint`、`finance-report-empty`、`finance-report-categories`、`finance-report-category`、`finance-report-category-heading`、`finance-report-category-name`、`finance-report-category-count`、`finance-report-values`、`finance-report-bar`、`finance-report-baseline`。
- 主层需为分类列表去除默认缩进、行头弹性布局、图标固定尺寸、名称/金额 `min-width:0; overflow-wrap:anywhere`、金额与百分比可换行、分类之间留白及细分隔线补 CSS。月汇总沿用 `month-summary` 但需覆盖两列；按钮沿用 44px 触控尺寸，Icon 使用现有 `back`/`next`，不使用字符箭头。
- 条形 SVG 自有 `width=100%` / `height=8`，主题色沿用 `tone-*`，背景为 `--surface`。分类图与每日图均有读屏文字替代，不依赖颜色辨义。无新增动画、字体、图片或图表依赖。

## 交付文件

- [FinanceReport.tsx](../../src/features/finance/FinanceReport.tsx)：受控报表内容组件、一级分类横条与月/类型切换请求。
- [financeReportDomain.ts](../../src/features/finance/financeReportDomain.ts)：整月分类投影、共享日报序列、安全金额格式化。
- [DailyExpenseChart.tsx](../../src/features/finance/DailyExpenseChart.tsx)：旧 props 兼容、复用日报投影、空态/计算失败区分。
- [financeReportDomain.test.ts](../../tests/unit/financeReportDomain.test.ts)：26 项领域与金额显示检查。
- [daily-expense-chart.test.tsx](../../tests/unit/daily-expense-chart.test.tsx)：14 项共享图与受控报表组件检查；此文件同时覆盖报表组合，不含真实仓储测试。
- 本说明文件。

上述相对链接以仓库 `docs/development` 为起点；主流程的 PRD/HLD/LLD/DEV/PLAN 与路由/CSS/Sheet 修改不由本子任务承接。

## 实际检查结果

2026-09-20，本子任务最后一次相关检查：

| 命令 | 实际结果 |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run tests/unit/financeReportDomain.test.ts tests/unit/daily-expense-chart.test.tsx` | 2 文件、40 项通过（26 领域 + 14 组件），1.20s |
| `node node_modules/typescript/bin/tsc --project tsconfig.app.json --noEmit --incremental false --pretty false` | exit 0；只做应用项目静态类型检查，无 emit/构建 |
| `node node_modules/eslint/bin/eslint.js src/features/finance/FinanceReport.tsx src/features/finance/financeReportDomain.ts src/features/finance/DailyExpenseChart.tsx tests/unit/financeReportDomain.test.ts tests/unit/daily-expense-chart.test.tsx --max-warnings 0` | exit 0，五个代码/测试文件无警告 |
| `node node_modules/prettier/bin/prettier.cjs --check src/features/finance/FinanceReport.tsx src/features/finance/financeReportDomain.ts src/features/finance/DailyExpenseChart.tsx tests/unit/financeReportDomain.test.ts tests/unit/daily-expense-chart.test.tsx docs/development/OPERATION_REPORT_IMPL.md` | exit 0，五个代码/测试文件格式通过；仓库 `.prettierignore` 排除 `*.md`，本说明不记为格式器已验证 |
| `git diff --check -- src/features/finance/DailyExpenseChart.tsx tests/unit/daily-expense-chart.test.tsx` | 无空白错误；新增文件另用 `git diff --no-index --check /dev/null <file>`，无空白错误输出（差异比较 exit 1 不作为测试失败） |

另以 Node `readFileSync` / `existsSync` 只读检查本说明的5个本地相对链接，全部目标存在。

覆盖：子类和一级一次计数、收支分离、月首/末及前后月排除、当前月/过去月/未来月、闰日与本地日期、缺项补零/空范围不画图、归档/缺失/异常引用、长名、大额微小比例、整月与跨日溢出、精确到分、props 切换、错误恢复、1000/9999 月份边界及末日循环退出。输入数据不变与日志不含敏感字段也有断言。

执行中如实记录：首批领域19项通过；首轮组件测试有3项失败，原因是参数化测试将交易数组展开为独立参数，改为对象用例后通过，未为迎合测试改变空态规则。静态检查曾发现4处 Testing Library `getByRole` 不支持 `exact` 选项，已删去（字符串名称匹配保持精确）并复验。`pnpm exec vitest ...` 因环境自动尝试调整依赖目录而中止（无 TTY）；未确认清理或安装，后续直接运行已有工具入口。

## 待主任务统一验收

本侧车实现交付完成，停止自有打磨。未运行浏览器、全量单元/集成、生产构建或部署；未验证真实 iPhone、CSS 几何/长名换行、系统键盘/VoiceOver、真实数据库读取失败重试、原记账上下文返回及离线。父组件/CSS 接入后的这些证据由主任务记录，不由这40项单测替代。没有提交、推送、版本/依赖/存储变化。
