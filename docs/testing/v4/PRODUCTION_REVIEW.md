# LifeIndex 4.0 独立生产测试与代码审核

负责人：`/root/design_reviewer`。日期：2026-09-29。状态：**首批浏览器验收代码通过静态检查；独立运行的3项FocusController集成回归通过；已独立执行Chromium定向12项（11通过、1失败），完整双引擎验收待跑，不能宣称发布通过。**

设计冻结依据为[REVIEW_R3](../../design/v4/REVIEW_R3.md)与[REVIEW_R4](../../design/v4/REVIEW_R4.md)；实施接口以[交接约定](../../development/v4/IMPLEMENTATION_HANDOFF.md)、[架构v3](../../design/v4/ARCHITECTURE.md)与[测试契约](TEST_STRATEGY.md)为准。本文件跟踪独立执行和缺陷，不修改产品实现，也不代签作者修复。

## 运行与证据规则

- 入口：`node node_modules/@playwright/test/cli.js test --config playwright.v4.config.ts`。运行之前由根协调从待验收V4源码生成生产dist；config不把开发server当生产，也不自动复用已占4173端口。
- 固定localhost4173、Chromium与WebKit、zh-CN/Asia-Shanghai、新context、单worker、retries=0。开始必须见`data-lifeindex-version=4`，旧入口会明确失败而非skip或得到“通过”。根尚未切入口时只做收集和静态检查，执行状态保持待跑。
- 每例仅使用自己的合成IndexedDB；业务主库名LifeIndexV4。原生IDB辅助只读完整新库或向独立context注入明确fixture，不导入生产服务为测试期望，不提供生产fixture入口。读库缺失会拒绝，不创建替代空库。
- 旧库边界测试仅在新context创建名为LifeIndexDB的独立合成哨兵；不读取用户profile、不清空旧库、不调用deleteDatabase。备份来自测试context实际导出，不提交生成备份文件。
- 结果在test-results/v4与playwright-report/v4。失败保留trace/截图，axe保存全部违规；serious/critical自动阻断，其余逐项复查。测试及日志只使用合成数据，记录operation/entityType/count，不输出字段内容。
- 浏览器视口、文字压力模拟和WebKit不是实体iPhone。首次实际运行若遇引擎能力限制，记录原始失败与明确覆盖缺口，不用静默skip、自动retry或旧版通过数量代替。

## 已编写能力映射

以下是能力映射。可访问名称已按接线后的真实组件核对；“待跑”指完整双引擎验收，部分定向执行证据另外列明。

| 能力 | 当前可执行用例 | 数据/体验断言 | 状态 |
| --- | --- | --- | --- |
| V4入口及隔离 | support.enterV4、legacy sentinel | 明确新版身份、新库存在、合成旧库保持原值 | 待V4构建 |
| T1/T2/T3 | records.spec | 全局两次激活到真实获焦主字段；金额分、体重克、分钟精确保存；reload仍在；day不含伪instant | 待跑 |
| 取消/错误 | records.spec | 脏确认继续保留值，放弃不写；体重超精度拒绝且保留草稿 | 待跑 |
| 查看/编辑/删除 | records.spec | 交易/体重/运动详情完整库零写入、编辑保留id/createdAt、取消删除保留、确认后删除且不影响其他领域 | 双引擎待跑 |
| 日期来源 | records.spec | finance异日→health→全局仍为今天；取消恢复来源和焦点 | 待跑；异日保存回执/午夜专项后续补齐 |
| T5习惯 | habits-focus.spec | 整行键盘完成/撤销、instant今日事实、详情零写、reload、计划暂停不删完成 | 待跑 |
| 跨context | habits-focus、backup-offline、failures | 真实共享库完成/撤销广播；另一页写入使预览过期；恢复后旧编辑器generation拒绝且保留输入 | 浏览器待跑；core同时写/命令重放由作者测试并独立读审 |
| T4专注 | habits-focus、failures、v4-review/focus-controller | 真实暂停不累计、收起返回同id、恢复焦点、结束保存一次；finalize失败的持久终点refresh不增长；不足1秒/时钟异常不产生非法提交 | 浏览器待跑；独立controller 3项已通过；自然到期/跨日浏览器专项后续补齐 |
| T6月报 | report-privacy.spec | 当月标题/数值不混上月，返回原month/day/view | 待跑；滚动及语义焦点后续强化 |
| 新备份 | backup-offline、failures | 真实导出身份/无meta、无效文件拒绝、内联预览/取消零写、二级确认换generation、并发预览拒绝；categories已写后在weight强制失败逐九表回滚并重试 | 浏览器待跑；过期/源会话专项后续补齐 |
| 离线 | backup-offline.spec | SW控制后offline reload、首次进入未访问lazy域、保存与再次reload | 两引擎均待实际执行，不预置WebKit跳过 |
| 隐私 | report-privacy.spec | 合成备注确实写库，但不进console参数、请求和shell缓存；无外部请求 | 待跑 |
| axe | accessibility.spec | 深浅主题：11路由、选择层、三编辑器、错误、脏退出确认、详情/删除确认 | 待跑；保留全部违规供人工分类 |
| 响应/触达 | accessibility.spec | 320/390/430/768/1440×深浅×两引擎；200%预采样文字缩放；入口/导航尺寸、命中、导航不重叠、无根横滚、截图 | 待跑；目前主要today/health/focus，其他页面矩阵后续扩充 |
| 键盘 | accessibility.spec、records、habits-focus | 模态Tab隔离、Escape、录入首字段获焦、返回与动作焦点 | 待跑；错误焦点/来源消失后续补齐 |

## 独立代码审查与未完成门槛

core作者负责tests/unit/v4与tests/integration/v4，本角色已独立读取事务范围、generation/revision、A05创建重放、habit父revision、focus两阶段/墙钟、备份严格union及其作者测试。当前未发现可证明的core原子恢复缺陷；不将代码阅读当真实浏览器验收。根另行授权本角色维护tests/integration/v4-review，使用真实服务与独立合成fake-indexeddb；浏览器failures.spec在原生IDB边界注入明确写故障，保留生产验证/命令流程。

49条性能采样、资源gzip预算、真实构建/CI、PWA更新保护、完整能力边界、线上Pages产物与实体iPhone均未完成。历史tests/e2e及其3.3 DOM断言继续保留；根协调负责明确CI的新旧分界，本文件不静默跳过或删除旧失败。

## 本次检查记录

2026-09-29完成首批静态检查：

- `playwright test --config playwright.v4.config.ts --list`：6个spec、36种用例×2引擎，共72项成功收集；此命令没有启动浏览器/服务，不能读作72项通过。初批56项后增加6种真实故障与冲突场景、2种健康记录编辑删除。
- 对新config与tests/v4-e2e独立执行TypeScript严格检查：通过。TS6命令必须带`--ignoreConfig`才能显式检查文件；初次检查发现配置中的reducedMotion应归contextOptions，已修正并复查通过。
- 新config与目录的ESLint检查：零warning/error；Prettier格式化完成。首次运行的V4生产构建、commit、实际结果、失败及复测记录仍待追加。

静态检查使用已安装工具，不新增依赖。新测试和config的项目级tsconfig/CI接线由根协调负责；本角色只维护授权文件，不修改其他配置。任何源码存在或收集数量都不计为生产验收通过。

## 独立发现与解除证据

| 编号 | 独立发现与责任 | 当前证据与范围 |
| --- | --- | --- |
| QA-C01 | FocusController提前结束不足1秒时先建立pending，core Validation拒绝后界面永久冻结为待保存；根负责修复 | 修订后独立真实服务测试验证0ms不写/不留pending，随后1200ms可完成，已解除controller缺陷；浏览器入口仍待执行 |
| QA-C02 | Controller检测相邻墙钟跳变仅显示error，仍可调用pause把10秒片段写成5秒；根负责冻结/拒绝/显式校正重试 | 独立测试验证倒退5秒后pause/finish零写、未校正retry拒绝、校正后保存10250ms。designer补可见校正重试入口，UI仍待浏览器复查 |
| QA-C03 | prepare真实写失败必须区别确定性校验失败，保留首个固定终点，不因重试等待增时 | 独立在IDBObjectStore.put抛QuotaExceededError，验证整行未改、退出保护启用、10秒后只保存3250ms且单实体，已通过controller范围 |

2026-09-29执行 `node node_modules/vitest/vitest.mjs run tests/integration/v4-review --reporter=dot`，1个文件3项通过，exit0。这是jsdom+fake-indexeddb集成验证，并非Chromium/WebKit或真实iPhone结果。新的TS严格检查、ESLint零警告、Playwright72项收集在扩充后复跑通过；文档每次报告明确区分收集、静态检查、作者结果和独立执行。

## 首次生产浏览器执行与测试校正

根作者首跑Chromium34项：21通过、13失败（`/tmp/lifeindex-v4-browser-first.log`，原始产物`test-results/v4`）。本审核人没有把作者执行称作独立执行。检查失败证据后分出：

- 浅色今日习惯区进度文字#706572在#2d2638上对比2.62，serious axe违规；领域作者已修改，等待新build实测。
- 十个布局用例原先hash切页保留html/body/nav内联放大值，导致health400%、focus800%；这是QA夹具污染。每页真实reload重置后再施加一次200%，没有放宽溢出或44px标准。
- 专注finalize故障用例在异步start提交前快进3秒，可能把开始时刻也推迟；增加真实IDB running前置后再快进，没有改变产品计时语义。
- 模态键盘第4次Tab离开dialog为真实缺陷，根作者负责首尾循环；独立复测仍失败，未提前解除。

随后本审核人独立执行：`playwright test --config playwright.v4.config.ts --project=v4-chromium --grep 'layout and 200|keyboard stays|focus completion failure' --output=test-results/v4-independent-initial --reporter=line`。2026-09-29结果**11通过/1失败，40.9秒，exit1**。10组宽度×深浅×today/health/focus放大布局均通过，原生IDB finalize失败固定终点及refresh恢复通过；唯一失败仍是第4Tab。日志`/tmp/lifeindex-v4-independent-initial.log`，失败trace/截图保留在独立目录，没有覆盖作者证据。第一次启动受sandbox loopback绑定EPERM阻止，工具自动批准提权后才实际启动，不记为产品失败。

在完整复测前补齐反向Shift+Tab、可见时钟校正重试入口、原生文件选择器value重置（保证同文件可重选），保留PNG到outputPath。新增项不是已通过证据；当前等待含修复的新生产dist，之后执行72项双引擎。


## QA交接后的扩展（尚待执行）

独立QA接手原测试资产，保留旧失败与产物；新增测试不能视为通过。U09布局扩展覆盖17个页面状态、四类带长备注的记录详情及三种编辑器，五宽×两主题×两引擎，默认与200%字号独立reload避免累乘。代表数据包含合法上限数值、30条各领域历史、长习惯名称/专注标题/备注。另新增320/390专注开始/运行/暂停主控首屏与命中检查，异日保存回执查看及返回原日期筛选，controller旧finish/discard确认不误操作替代会话及busy防重。

WebKit离线夹具通过本地TCP拒绝连接替代其`context.setOffline()+reload`内部引擎错误：保留真实生产SW与缓存，先验证未缓存网络请求失败，再reload、首次访问lazy域、实际保存和再次reload。Chromium仍用浏览器offline。两者不skip；TCP方法不能声称navigator.onLine变成false，测试附件明确注明传输层边界。

新增A/B更新用例在临时目录构建两份真实产物，以公开`data-app-build`标识区别版本，同源静态服务器从A切到B，真实registration.update触发安装等待。断言脏编辑禁用更新且输入未丢、保存后更新可用、实际加载B且已存事实相等。不伪造updateReady/worker消息，也不修改生产dist。上述新增代码当前等待性能采样释放CPU后执行。

## 第二次独立生产检查（2026-09-29）

补录交接前完整双引擎72项：53通过/19失败，5.2分钟，日志`/tmp/lifeindex-v4-independent-full.log`、产物`test-results/v4-independent-full`保留。失败包括浅色axe、习惯重渲染失焦、WebKit来源焦点/模态Tab，以及WebKit的offline reload引擎错误；没有批量skip或删除失败。修复后的证据另列，不覆盖本轮失败。

新QA执行独立controller集成6项全通过（1.74秒），日志`/tmp/lifeindex-v4-qa-controller-second.log`。新增旧finish/discard确认不得操作替代会话，以及pending start busy防重均用真实core/fake-indexeddb验证；不等于真实浏览器或真iPhone。新增测试严格TS和ESLint检查通过。

最新第三次生产构建上的双引擎定向14项：**12通过/2失败，27.7秒**，日志`/tmp/lifeindex-v4-independent-second-targeted.log`、产物`test-results/v4-independent-second-targeted`。Tab/反向Tab、习惯完成撤销焦点、离线reload与未访问lazy域写入、390专注三态首屏、自然到期跨午夜/开始日归属/刷新幂等、异日回执查看返回均通过。两项失败同源：320×568专注开始按钮落在dock下，被命中测试和截图共同证明遮挡；尚待修复。

扩展初测Chromium320浅色与A/B更新：**0通过/2失败**，日志`/tmp/lifeindex-v4-independent-expanded-initial.log`、产物`test-results/v4-independent-expanded-initial`。长边界数据健康页200%文字横溢33px，继续收集其余页问题。真实A/B更新中脏草稿阻止更新、保存后解除均通过，但批准后仍停留build A；trace记录waiting→approved→worker activated，没有页面reload。独立源码定位第三方register辅助仅在controlling.isUpdate为true时reload；首访装A时该标志固定false，同会话更新B可复现。此为真实更新分支缺陷，不能给测试加一次reload掩盖。根协调负责生产修订，未解除。

全320浅色布局诊断使用软断言继续收集，仍以失败退出，没有放宽门槛：17路由+四详情+三编辑器共保留47张阶段截图，确认仅三处根横溢：health的1000 kg大数值末尾kg右缘353.016；weight/activity历史月份控件右缘322。其余阶段无根/dialog横滚；这只覆盖Chromium320浅色，不外推全宽全主题。日志`/tmp/lifeindex-v4-independent-expanded-diagnostic.log`。

S03 provider接线专项：执行`node node_modules/vitest/vitest.mjs run tests/integration/v4-review/focus-provider.test.tsx --reporter=dot`，**6项全通过，2.37秒**，日志`/tmp/lifeindex-v4-qa-provider.log`。真实PwaProvider/FocusRuntimeProvider与真实core组合，延迟start/pause/finalizeCompletion的成功/失败两种结局：执行中dirtyFormCount和busyFormCount均>0，applyUpdate不能触发注册handler；结局后两计数回0，正常持久running不保持脏态。此为jsdom provider/真实core集成，不当作A/B更新通过；A/B首访更新不reload问题独立保留。

第二轮完整功能/axe复验：`node node_modules/@playwright/test/cli.js test --config playwright.v4.config.ts --grep-invert 'layout and 200|real A/B|focus primary' --output=test-results/v4-independent-second-functional --reporter=line`，**Chromium/WebKit 56项全通过，2.6分钟，exit0**。日志`/tmp/lifeindex-v4-independent-second-functional.log`，原始产物独立目录保留。此命令只把单独验证的20布局/4首屏/2A/B从本轮分开，没有修改、skip或删除测试；因此不能声称82项全通过。四个axe上下文（两主题×两引擎）各19态未发现任何违规。原72项失败涉及的功能/焦点/备份/离线范围至此全部复验通过；新增布局/320主控/A-B阻断仍未解除。

该轮生产dist指纹：`index.html` SHA256 `255218bd73520a469f6b98ca94bf278622a477f790c317c4335a5c2d5a3fc609`；`sw.js` SHA256 `a6123c9d9e49c4179fa23f1a56c2a707f3a3e9714eaf40d3471c8176e86fbbfe`。工作区源代码正在修订，不把这份已构建字节的结果外推到后续构建或线上。

线上harness由根追加授权接管：`tests/v4-deployed/pages.spec.ts`仅WebKit离线专项用HTTPS上游的已发布字节经随机本地HTTP origin安装SW，保留Pages路径，再断TCP验证未缓存探针失败、reload、lazy备份页、保存/导出及再次reload。附件同时保存published/effective origin与传输方式；**不能称作实际Pages HTTPS origin的WebKit离线刷新证明**。其余三项每引擎仍直连真实target验证身份、资源、记录与专注；Chromium离线也保持真实target。该扩展当前待新dist的本地harness执行以及部署后的真实target执行，不能提前签收线上。

最终构建前新增待跑覆盖：axe扩至17页面态×2主题×2引擎（每组另含8个编辑/确认态，共25态）。A/B增加activation-timeout独立变体：真实B已安装waiting，只在浏览器SW消息传输边界丢一次SKIP_WAITING，31秒可控时钟触发生产30秒超时，核验可见失败、重试按钮、A与记录保留，再重试真正激活B并检查无未捕获异常。正常成功变体仍单独保留。完整浏览器收集应为84项；新增变体当前未执行，静态TypeScript已通过。
