# LifeIndex 4.0 性能采集

状态：第五候选构建完整49+2采样已通过冻结自动门槛，见[正式报告](release/2026-09-29-performance/REPORT.md)。[独立性能复核](release/2026-09-29-performance/INDEPENDENT_REVIEW.md)已签收通过。依据冻结的 [TEST_STRATEGY 第6节](TEST_STRATEGY.md)，本文件不提高或替换其门槛；浏览器模拟不等于物理 iPhone 验收。

## 执行边界

独立配置为 `playwright.v4-performance.config.ts`，代码位于 `tests/v4-performance/`。配置不执行构建，不启动服务，不复用 QA 的 4173 端口。先由主协调确认 QA 已结束、CPU 空闲、最终生产 `dist` 已构建，再启动 4190 的静态预览。禁止与构建、全量测试或另一性能批次同时运行。

在独立终端启动已批准构建：

```sh
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4190 --strictPort
```

确认静态服务对应本次构建，再在项目根目录执行：

```sh
LIFEINDEX_V4_PERF_BUILD_LABEL='填写实际构建来源与协调确认' \
  node node_modules/@playwright/test/cli.js test --config playwright.v4-performance.config.ts
```

默认地址为 `http://127.0.0.1:4190` 加 `dist/index.html` 的真实 base path。非默认地址可设 `LIFEINDEX_V4_PERF_URL`，必须包含同一 base path；脚本拒绝路径不一致。不要把示例来源文字当实际证据，也不要使用 Vite 开发服务。`dist` hash 在采集前后必须一致。环境元数据记录当前 Git commit/dirty、构建逐文件 hash；它们不会自动证明某个未提交构建来自某个 commit，构建来源仍由协调日志说明。

## 固定样本与门槛

Chromium 采用 Playwright 的 iPhone 13 设备参数，覆盖 viewport 为 390×664 CSS px，DPR、UA 和触控参数完整入报告；语言 zh-CN、时区 Asia/Shanghai、浅色系统偏好、reduced-motion reduce。每样本全新 context、SW block、CPU4× 在导航前启用、无网络降速、单 worker、零重试。每次只有一个编辑器首次打开。

| 顺序组 | 每组样本 | FCP中位数 | ready中位数 | chooser中位数 | editor中位数 |
| --- | ---: | ---: | ---: | ---: | ---: |
| F0 支出、F0 体重、F0 运动 | 各7 | ≤400ms | ≤1400ms | ≤350ms | 各≤350ms |
| F1 支出、F1 体重、F1 运动 | 各7 | ≤400ms | ≤1400ms | ≤350ms | 各≤350ms |
| F3 支出 | 7 | ≤400ms | ≤2000ms | ≤350ms | ≤350ms |

总计49条预算样本；F3继续使用共同FCP/chooser上限，只有ready采用冻结的长历史上限。七组分别出中位数、min/max、原始数值和失败情况。功能错误、缺少样本或日期跨越导致组不一致均不能通过；缺失值保持null，不能填0或从分母中删除。预算失败不会提前终止后续样本采集。

在49条之后另做F1支出正常动效、F1支出纯键盘激活各一条，编号50/51，单列 `observations`，不混入预算。键盘路径通过Tab找到真实入口、Enter打开；不会调用字段focus。它们证明路径可完成并保留观察数据，不替代独立完整键盘/动效QA。

资源上限：递归全部生产JS逐文件gzip之和≤256000B，CSS≤16384B；根目录SW、动态chunk和生产辅助脚本一并计入。HTML内联脚本另列且加进JS判断，非JS后缀的HTML脚本入口直接失败。字体/图片不占JS/CSS额度，但必须列出raw/gzip、请求时序、实际传输和预缓存大小。

## 合成数据与冷启动

固定fixture版本 `lifeindex-v4-synthetic-1`、seed4029。每样本的真实浏览器日期和时间作为 `baseDate/capturedAt`，不冻结Date或performance时钟。

- F0：setup页不创建任何库。应用首次导航才真实初始化默认分类、偏好和meta；所有业务表为空。
- F1：6个每天计划习惯，2完成4待做；30笔交易（24支出6收入），30体重、12运动、14完成专注。交易包含今天、昨天和本月可用日期；每月1日不会编造尚未到来的当月日期。
- F3：10000交易跨730日、730体重、500运动、24习惯、365日范围的8748条完成事实（今天12项，其余364日各24项）、1000完成专注。没有运行中会话，避免把F4状态夹具混进本组。

记录全部为明确的合成数据；UUID、整数单位、日期精度、引用、类别、状态和备份形状经过真实V4严格校验器检查。习惯补记采用day精度；已完成专注使用过去日期真实合法的instant。数据正文不写日志或报告，仅保存计数和数据库摘要。

每个context先访问**同源被拦截的极简空白HTML**，该文档不引用任何应用JS、CSS、字体或SW。F1/F3在此页用原生IndexedDB建立LifeIndexV4/native10九表及生产相同索引，完整事务预置；F0检查不存在库。请求断言必须只有空白文档本身，否则样本失败。撤销拦截后才添加观察器、导航应用；setup阶段不加载应用来预热。Node侧读取schema/校验器不产生浏览器请求。

## 真正可用的时间

所有时间点由浏览器 `performance.now()` / Performance paint条目计算，Playwright只读取结果。触控开始由capture阶段的真实pointerdown记录；键盘观察用Enter/Space keydown。点击坐标来自当前矩形，点击前要求完整位于viewport内、44px命中框且未被覆盖；就绪命中检查使用中心及四条边的内侧中点，避开圆角矩形实际不可命中的角落，同时保留多点遮挡检查；不使用自动滚动后的locator点击作为主采集动作。

ready固定包含shell、today-habits、today-finance、focus-runtime、today-records五区域，后者在短屏折叠线下仍纳入。每区 `data-state=ready`、`html[data-theme-state=ready]`、新版身份、导航、设置、模式和中央入口全部可操作；习惯整行动作可命中。还检查真实fixture对应的习惯进度、交易数量/支出、最近记录行数、真实idle专注内容，不接受默认空占位。出现loading/error遮挡不发布成功时间。

脚本保存首次共同满足时间 `readyFirst`，后续两帧几何位置稳定才发布 `ready`，同时保存 `readyConfirmed`。预算使用首次合格帧，确认等待不会伪装成应用工作。类型选择和编辑器同样保存首次合格帧，并下一帧稳定后才发布；`chooserConfirmed/editorConfirmed`保留验证时刻。几何变化阈值为0.5 CSS px，变化会重置候选帧。

chooser需正确选择层和三个可命中类型按钮。最终类型激活独立作为editor起点，两个动作之间的宿主通信/选择间隙另记，不塞入或扣除任何业务指标。测试不会hover、主动预取或人为等待资源变暖。

editor需正确dialog、分类依赖、主字段label/单位、enabled、非readOnly、真实 `document.activeElement` 为主字段，字段及取消/保存都可命中。取得时间后才执行实际键盘输入并断言值变化、截图、取消/确认放弃；比较取消前后九表完整SHA256摘要和fixture计数，证明未误写。测试不会调用字段focus或用fill弥补应用焦点。

观察器在应用代码前安装，rAF检查具有固定采集开销；不事后扣除这部分开销。ready全部条件确认后停止首屏检查，editor确认后停止热循环。字体ready在window load后订阅，并监听后续FontFaceSet loadingdone（惰性渲染可能在load后才请求字体）；`fontCompletions`保留所有完成快照，`fontsReady`记录最新完成时间。记录ready和字体完成前后目标几何、字体资源请求；晚加载位移需要独立看图核查，不能只因预算通过忽略遮挡。所有计时完成后才截图与读数据库摘要。

## 证据与失败处理

输出：`test-results/v4-performance/<UTC-runId>/`。此目录受既有.gitignore排除，不提交原始构建或数据库导出。

- `environment.json`：协议、预算、fixture版本，commit/dirty，构建hash/base、逐文件raw/gzip、HTML脚本和SW预缓存资源，Node/pnpm/Playwright/Chromium、机器/电源/负载/内存和设备配置。读取不到的指标写null，不捏造电源或热状态。
- 每次尝试独立JSON、Timing JSON及输入后截图；即使失败也保存当前阶段、固定原因码和能取得的状态/截图。Timing含原始paint/navigation和resource时间线，实际HTTP content-encoding另列，localhost传输不假装线上gzip。
- `samples.json`每完成一条即重写，防中断丢失已采证据。最终 `report.json`收齐49条和2条额外观察、七组统计、产物门槛、所有失败和首屏/交互资源分组。Playwright报告同时附完整JSON。

不得删掉有效慢样本、选择最快七次或用自动重试清洗结果。环境事故需保留旧run、明确原因，修正后重新运行完整49条（当前工具不提供择组拼接功能）；不能混合不同run或build凑中位数。功能缺陷必须修实现再重测，不能改标环境事故。采集前后build变化使整次run失败。若进程被外部终止，已保存的前缀仍保留，但不构成完整验收。

完整报告的 `passed` 只代表自动门槛。独立审核仍要检查极端值、字体/资源位移、截图、采样环境与真实用户路径。正文日志只使用固定事件名、枚举阶段/组名、计数、状态，不记录金额、标题、备注、原始浏览器异常或数据正文。

## 工具准备验证

2026-09-29：无浏览器工具契约4项通过，其中fixture覆盖普通日、月初和闰年边界，F0/F1/F3均通过生产备份校验器；另用临时合成产物验证根SW/嵌套chunk计数、真实引号格式的预缓存清单、base path和构建hash变化。主Playwright配置 `--list` 正确收集1个49样本编排。专用TypeScript、ESLint、Prettier检查通过。此检查不启动浏览器、不请求生产页面，不是性能结果。

```sh
node node_modules/@playwright/test/cli.js test --config tests/v4-performance/fixture-check.config.ts
node node_modules/@playwright/test/cli.js test --config playwright.v4-performance.config.ts --list
node node_modules/typescript/bin/tsc -p tests/v4-performance/tsconfig.json --pretty false
node node_modules/eslint/bin/eslint.js tests/v4-performance playwright.v4-performance.config.ts --max-warnings 0
```

实际生产采集：2026-09-29第五候选构建49+2完整通过，构建前后SHA256一致。独立性能签收：待审核角色复核，详见[正式报告及证据](release/2026-09-29-performance/REPORT.md)。

## 探针诊断修正（2026-09-29）

协议实现版本更新为 `lifeindex-v4-performance-2`，所有冻结预算、CPU4×、SW block、样本数量和真实输入条件不变。原探针在中央88×72圆角按钮矩形的3px角点命中到父级底栏，错误地把实际可点击按钮判为不可达。修正为中心与四边内侧中点，并新增 `readyChecks` 布尔诊断和固定状态日志，避免把文字不匹配、主题、导航、习惯与遮挡错误混在同一原因中。新回归测试证明圆角控件通过，真实覆盖层仍被拒绝。

F0三类编辑器额外诊断均完成真实输入路径；这些非CPU4×调试结果不计入预算。F1曾因第二条习惯在390×664视口与底栏重叠而失败；后续CSS短屏修复的作者注入诊断已通过原就绪门槛，等待统一构建和独立QA，未放宽习惯命中门槛。

证据事故：此前中止批次 `2026-09-29T02-52-58-216Z-40282` 在临时诊断配置未显式隔离Playwright outputDir时被默认输出清理；原始JSON/PNG无法恢复，不将重建结果标为旧证据。旧执行终端日志仍由主协调保留于 `/tmp/lifeindex-v4-performance-first.log`。后续临时诊断配置与输出全部放独立 `/tmp/lifeindex-perf-debug/`；正式及仓库回归配置均有各自显式outputDir。完整验收必须从修复后的统一构建重新采集49+2条，不能拼接此前结果。

探针回归命令（不加载生产页面，不生成性能验收结论）：

```sh
node node_modules/@playwright/test/cli.js test --config tests/v4-performance/probe-check.config.ts
```

字体诊断还发现旧观察器只订阅window load时的fonts.ready，可能早于首个真实字体请求（一次诊断为166ms完成、172.3–230.7ms请求），漏报晚加载位移。协议2同时订阅后续loadingdone并保留完成快照，不改变ready预算定义。
