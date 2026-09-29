# LifeIndex 4.0 应用壳与工作流独立代码审核

审核人：`/root/design_director`，2026-09-29。本轮切换为其他作者代码的独立审核人；不审核或签收本人负责的领域页面、`Category*`、领域样式。遵循 requesting-code-review 的只读审核流程，只写本报告，未改被审实现。基于 HEAD `10eb5b841771e6f160d6d1321ce732d26d559466` 加工作区当前生产源码；正在进行的修订不能仅凭作者说明解除。

初审结论（历史）：五项需修复后复查。**最终独立复查：原S01–S05及接续领域D01–D03均已关闭，本报告范围的代码/定向交互审核通过。** 由`/root/review_release`独立复验签收，具体证据和环境边界见下文；完整生产双引擎、PWA A/B、性能及线上验收仍以各自独立报告为准。

## 范围与已经核对的实现

已读 `src/app/v4/**`、`src/shared/ui/v4/**`、`src/shared/v4/**`、`src/features/records/v4/**`、`src/features/settings/v4/**`（排除本人 Category 文件），并追到 PwaProvider 和必要的 core 命令合同。依据冻结设计、架构 v3、TEST_STRATEGY、IMPLEMENTATION_HANDOFF。

- Flow 使用内存 return token 保存来源 location、筛选状态、滚动和语义焦点；记录回执用真实保存结果 ID，异日保存不静默改变来源日期。
- RecordEditor 在内部捕获初始 stamp；数值走核心整数解析，日期记录未合成精确发生时间。只读详情与编辑、删除明确分开。
- BackupV4 文件读取有代次与卸载检查，取消使迟到预览失效；同文件可重新选择；完整八类预览、两级确认、未结束会话说明齐全，业务替换仍由核心原子事务负责。
- Modal 当前源码已显式处理初始焦点、所有 Tab/Shift+Tab 循环和上层确认；Safari 修订的独立双引擎结果由 QA 执行，不以源码存在替代结果。
- PWA 的 setFormDirty/applyUpdate 同时覆盖入口与命令边界；普通表单与删除/恢复业务接了 busy，专注的遗漏见 S03。

## 需修复问题

### S01 · P1 · Live query 删除结果会卸载未保存草稿

位置：`src/features/records/v4/RecordRoute.tsx:39`–40；同类生命周期风险在 `src/features/records/v4/NewRecordRoute.tsx:27`–35。

RecordRoute 用当前查询的 `record` 是否存在来决定是否挂载 RecordEditor，尽管编辑器内部捕获了 initial source。在另一标签删除该记录、或恢复到不含该记录的备份后，最新查询返回 null，父组件会直接卸载编辑器，丢弃未保存输入。NewRecordRoute 在已打开草稿后查询从 ready 转 failed 也会切回 Feedback 并卸载草稿。

**实际复现**：4188 开发服务、Chromium、新隔离 context；用真实 UI 保存体重63.2，A标签编辑为72.345但不保存；B标签打开同一记录并确认删除。A标签立即只显示“记录已经不存在”，草稿输入框数0、丢弃确认数0。此数值仅为测试合成输入。

**修复条件**：点击编辑或首次创建源加载成功时建立独立的草稿会话/冻结 source；后续 live query 删除、恢复或读取失败不能卸载已有草稿。提交以原 generation/ref 进入冲突，保留可复制输入，并给明确重新打开路径。需要编辑记录在另一标签删除/恢复，以及新建草稿后分类读取失败的回归。

证据：`test-results/v4-shell-review/findings.json` 中 S01、`draft-disappears-after-other-tab-delete.png`。临时复现脚本 `/tmp/lifeindex-v4-shell-review.mjs`；不替代独立 QA 持久回归。

### S02 · P1 · 旧专注确认可能结束或放弃另一个新会话

位置：`src/app/v4/FocusController.ts:236`–251（finish/complete）、337–353（discard），以及 observe 的会话身份变化分支。

确认前没有保存被确认会话的身份；确认后重新调用 getCurrent，再对届时的当前会话提交。discard 也没有使用确认 AbortSignal。另一标签结束/删除原会话并启动新会话时，旧确认仍可对新实体执行破坏性操作。只在 generation 变化时中止 finish 不足以覆盖同代会话替换。

**实际复现**：A标签开始会话A并打开“放弃这一段”；B标签放弃A、开始新会话B；A旧确认仍在，点击“确认放弃”后B被删除。独立只读查看该隔离库证明 oldId 与 newId 不同，最终 focusSessions 为0。全过程由真实 UI 执行业务写入，没有伪造控制器状态。

**修复条件**：结束/放弃确认绑定当时的 generation、sessionId，以及所需 revision/state。会话身份、代次或使确认失效的状态变化应中止旧确认；确认后重新读取只用于核对，不能替换命令目标。异步检查之后仍需用被确认 ref/stamp 调核心命令，避免检查和提交之间另一次替换。补 finish、discard 两类跨标签替换与恢复代次回归。

证据：`test-results/v4-shell-review/findings.json` 中 S02、`stale-focus-confirmation.png`。

### S03 · P2 · 专注写入 busy 未纳入 PWA/离开保护

位置：`src/app/v4/FocusRuntimeProvider.tsx:8`–14；`src/app/v4/FocusController.ts:57`–59、171–194。

FocusGuard 只订阅 getUnsaved，并调用 useDirtyGuard({dirty})。getUnsaved 仅在内存 pending 尚未持久化时返回 true；start、pause、resume，以及 pending 已持久化后的 finalize 写入期间，控制器虽发布 busy=true，外层 guard 仍没有 busy token。PWA 更新保护和 NavigationGuard 因此不能覆盖这些未决写入。这是明确的静态调用路径，尚未声称完成浏览器更新复现。

**修复条件**：订阅稳定 runtime snapshot 的 busy，将其传给 useDirtyGuard；保留“运行中正常收起无需脏确认”与“正在写入暂不可更新/离开”的区别。用可控的未决 start/pause/finalize Promise 验证 busyFormCount>0、applyUpdate 被拒绝，完成/失败后恢复。

### S04 · P2 · 偏好读取失败被显示成从未导出备份

位置：`src/features/settings/v4/SettingsV4.tsx:15`–17、45–48。

SettingsV4 未判断 query.status，snapshot 缺失时统一显示“还没有导出过新版备份”。初次读取 loading/failed 都会把未知状态冒充已确认的业务事实，且设置页没有该区域的重试入口。其他核心区域已经用显式 loading/failed/ready，当前例外违背相同的真实状态规则。

**修复条件**：仅 ready 且 lastExportedAt 为 null 时显示未导出；读取中显示读取状态，失败显示局部错误和重试，已有时间可明确作为上次已知值而非新成功结果。测试有过导出但本次 preferences 读取失败，不能展示未导出。

### S05 · P2 · 专注详情的时区与列表未保持一致也未标示

位置：`src/features/records/v4/RecordRoute.tsx:111`、115，对照 `src/shared/ui/v4/RecordList.tsx` 的捕获 offset 格式化。

列表按实体捕获的 utcOffsetMinutes 展示 instant，详情开始/结束却直接 toLocaleString 使用查看设备当前时区，无任何时区标签。用户换时区或导入异时区记录时，同一记录会在列表显示29日00:20，在详情显示28日16:20，同时“日期”仍为29日，无法判断哪个是记录发生时刻。时间戳本身没有变，但展示语义不一致。

**修复条件**：详情按捕获 offset 显示并标注该 offset；若选择同时显示查看时区，需明确标注，不覆盖原归属语义。起止跨日仍分别显示真实日期，不把 endedAt 强制截回 localDate。补跨时区 instant 的列表/详情一致性断言。

## 暂不判定与边界

- 本人领域、习惯动作及分类实现：有作者利益冲突，由 `/root/design_reviewer` 独立负责；已收到 T5 焦点时序缺陷，将不在本报告自签修订。
- 生产双引擎72项、离线和性能：由指定 QA/主代理执行，开发服务定向复现仅说明发现与根因。
- 实体 iPhone 与系统文件保存结果：此环境未实机确认，不以 Chromium/WebKit 模拟冒充。
- 旧库兼容、旧备份迁移：用户明确取消交付要求；没有据此阻断新版。
- 不以新的审美方向、个人代码风格或无证据的性能猜测追加门槛。当前五项是本轮完整发现集合，后续只复查修复及其直接影响。

## 复查要求

修复后记录新源码 hash，逐项附原触发路径的行为证据。S01/S02 必须证明未保存输入与新会话没有被旧操作误伤；S03 必须覆盖实际 provider guard；S04/S05 需真实错误/异时区测试。通过后更新本报告状态，不按修订声明自动关闭。

## 接续独立复查（/root/review_release）

2026-09-29由新独立审核人接续，未参与生产实现。先按协调要求只读源码、准备定向复验脚本；性能采样独占期间没有运行浏览器或构建。以下状态尚不等于最终签收。

- S01/S02既有修订证据由前独立审核人保存于`test-results/v4-shell-review/corrections.json`；新建草稿读取失败原脚本误用全页面alert选择器，已收窄到dialog内，待执行。
- S04准备真实UI导出后注入preferences原生IDB读取失败，检查局部错误、重试和真实导出时间恢复。
- S05准备UTC浏览器查看捕获UTC+08:00的跨日专注，检查列表23:59与详情起止28日23:59/29日00:01及offset标签。
- 已读分类UI及core实现，确认类别引用删除保护、归档改名/重新启用同名校验、固定领域与顺序引用校验；尚未发现可证明的core事务安全缺陷。
- 已独立查看现存真实截图`light-390-today.png`、`focus-compact-running.png`和`light-390-finance-report.png`；冻结的整行习惯回应与笔形“留一笔”已落实，未据此发起新审美方向。完整交互与双引擎检查仍以QA独立报告为准。

领域只读检查另发现待实证的S01同类边界：`HabitPlanEditor`在记录删除或query失败后卸载`PlanForm`；`WeightTargetEditor`在query失败后卸载`TargetForm`。两者内层虽然冻结source，但不能阻止外层卸载。需复现或修订后验证未保存名称/目标仍留在界面，保存仍使用原身份拒绝冲突。另核查HabitDetail删除完成导航是否受自身busy guard拦截，不以静态猜测作最终缺陷结论。

### 实际定向复验结果

以下由`/root/review_release`独立执行，4188开发服务、Chromium、每项新隔离context；2026-09-29。先遇沙箱Mach端口启动拒绝，再经工具批准启动；原4188服务已停，重启Vite后才获得以下行为证据。不是生产双引擎结论。

| 项目 | 实际结果 | 证据 |
| --- | --- | --- |
| S01 新建草稿读取失败及重试 | **通过**：读取失败后72.345仍在；恢复读取并重试后仍在 | `test-results/v4-shell-review/new-draft-read.json`及`new-draft-after-read-retry.png` |
| S04 偏好读取失败 | **通过**：真实UI导出后注入IDB preferences getAll失败，显示局部错误，无“从未导出”；解除失败重试恢复上次导出时间 | `independent-recheck.json`及`S04-explicit-failure.png` |
| S05 捕获时区跨日 | **通过**：UTC浏览器查看隔离合成UTC+08:00专注，列表28日23:59；详情28日23:59至29日00:01并明确UTC+08:00 | `independent-recheck.json`及`S05-cross-timezone-detail.png` |
| 分类UI/core连接 | **通过**：真实UI创建图标、重复名称保留输入、取消再继续/放弃、排序、归档编辑重启、未引用删除、四领域、引用删除需再确认归档；pageerror空 | `categories-independent.json`；复跑脚本`/tmp/lifeindex-v4-domain-check.mjs` |

### D01 · P1 · 习惯编辑在跨标签删除后丢弃未保存草稿

`HabitPlanEditor`按实时query是否存在记录决定挂载PlanForm。实际A创建习惯后编辑名称但不保存，B通过UI删除同一习惯，A名称输入框消失；没有草稿离开确认。`domain-draft-findings.json`与`D01-finding.png`记录原触发路径。应由独立编辑会话持有source，保存沿原ref/stamp拒绝已删除实体，并保留输入。待修复复查。

### D02 · P2 · 体重目标读取失败会卸载未保存目标

`WeightTargetEditor`按query.status决定挂载TargetForm。实际A目标输入60.123，注入仅A的原生preferences.getAll读取失败，B创建分类触发实时重读后，A目标输入框消失。`domain-draft-findings.json`与`D02-finding.png`。应保留已建立的目标草稿会话，局部读取失败不替换整个编辑器，重试也应保留输入。待修复复查。

### D03 · P2 · 习惯删除成功后的返回导航被自身busy保护拦截

`HabitDetail.command('remove')`成功后调用navigate，但没有释放`useDirtyGuard`；删除事务确已结束，仍存在busy token。实际UI创建后删除，5秒后仍停原实体URL并显示不存在，无确认层。证据`habit-delete.json`、`D03-habit-delete.png`。应成功后同步release再返回列表，失败维持原页及错误。待修复复查。

新增三项均为明确冻结行为合同问题，没有增设审美或历史兼容要求。本轮独立最终签收仍等待D01–D03修复复查及S03实际provider证据。

### 附件清理事件及安全重跑

并行性能诊断的临时Playwright配置遗漏outputDir，默认清理了`test-results`根目录；因此早先引用的视觉截图及部分原发现附件已丢失。本文保留历史实际观察，不声称丢失原件仍可访问。根协调已制止此配置，后续独立复验输出改到`/tmp/lifeindex-v4-release-review`。

清理后本审核人重新实际执行S01编辑跨标签删除、S01新建读取失败/重试、S02旧放弃确认、新S04读取失败/重试、S05跨日时区，全部通过；新的`corrections.json`、`new-draft-read.json`、`independent-recheck.json`和PNG都在该安全目录。D01/D02旧失败也重新实际复现并保存于该目录，D03及分类证据在清理后生成并已复制到安全目录。上述是新执行的证据，不是对旧附件的伪重建。关键来源SHA-256另保存为`review-source-sha256.json`。

### S03 独立provider证据已通过

独立QA `/root/qa_release`执行`node node_modules/vitest/vitest.mjs run tests/integration/v4-review/focus-provider.test.tsx --reporter=dot`，6项通过，2.37秒，日志`/tmp/lifeindex-v4-qa-provider.log`。本审核人读取测试及日志，确认是实际`PwaProvider + V4ServicesContext + FocusRuntimeProvider`组合，不是单测getBusy返回值：start/pause/finalizeCompletion分别延迟并成功/失败，未决期间busyFormCount/dirtyFormCount大于0，applyUpdate不调用更新handler，结束后恢复0；持久running态不持续标脏。因此S03关闭。此证据是jsdom+真实服务/fake-indexeddb的provider接线验收，不冒充真实SW A/B更新测试；后者由QA另行验证。

### D项第一轮修复复验

根作者修订后，独立原触发路径复验：D01通过（跨标签删除后名称仍在，提交NotFound且不丢输入）；D03通过（删除成功确实返回习惯列表）。HabitDetail完成、撤销完成、暂停、恢复的按钮焦点在Chromium和WebKit都通过，见安全目录`habit-detail-focus.json`。

D02输入保留已通过，但重试Feedback被放在TargetForm的Modal外侧，实际点击“重新读取”被dialog拦截直到超时；这不是选择器歧义，Playwright日志明确命中按钮但被dialog覆盖。因此D02仍需把错误/重试放入活动modal-content，不能以源码有按钮宣称重试可用。`domain-draft-before-fix.json`保留旧卸载失败，`domain-draft-findings.json`保留本次通过D01/失败D02结果。


## 最终独立复查签收

2026-09-29，`/root/review_release`，未编写本次被审生产源码。原S01–S05及接续D01–D03全部关闭；未发现剩余可证明的本报告范围阻断。D02最后一轮已把错误/重试移入活动modal-content，原失败路径实际可点击重新读取，输入60.123从读取失败到恢复始终保留。最终`domain-draft-findings.json`为D01/D02通过；上一轮不可点击错误保留在`domain-draft-first-recheck.json`，没有覆盖成不存在的历史通过。D03成功返回列表、双引擎详情四动作焦点通过已在前文列明。

安全证据目录：`/tmp/lifeindex-v4-release-review`。最终相关源码哈希保存在`final-source-sha256.json`。初审/中间失败的描述保留为审计过程，读当前状态请以本节及最终JSON为准。分类8个真实UI路径独立复跑通过；此前已实际查看的冻结视觉实现符合整行习惯回应和笔形留一笔方向，历史截图清理边界已明确，不将该观察称作完整生产布局验收。

另只读审核了`registerPwa`批准后controllerchange刷新修订，并对照项目已安装vite-plugin-pwa实现核对onNeedReload合同。它覆盖插件自动刷新入口，仅批准调用后监听controller身份切换，先监听后发送skipWaiting，失败/30秒超时清理listener及批准回调。实际首访A→B更新仍由QA负责，不以源码审查代签。批准与实际接管之间的新草稿竞态尚无本轮实证，已提醒协调与QA留意现有beforeunload保护边界。

本签收不包含实体iPhone、系统文件保存结果、正式性能预算及线上部署结果；不以开发服务器的定向复验替代这些门槛。

## 最终增量静态复核：更新失败与短屏修订

`/root/review_release`在QA完整84项执行期间仅作源码阅读与既有截图检查，没有启动浏览器、构建或CPU重任务。重新核对`registerPwa.ts`、`pwaStore.ts`、`app/v4/AppShell.tsx`：发送失败/30秒未接管会reject并清理监听，store解除applying，状态栏捕获拒绝Promise，明确显示“更新暂未完成”及“重试更新”；重试仍受dirty/applying禁用和provider命令边界保护。此增量静态复核未发现阻断，实际SW更新结果仍由独立QA报告。

只读检查`v4-features.css`与`v4-shell.css`短屏规则：仅限760px宽/700px高内，缩减外围间距、标题及装饰雕塑，不降低按钮的44px目标合同。已实际查看`/tmp/lifeindex-perf-debug/focus-patched.png`、`today-patched.png`：带PWA状态提示的专注开始按钮仍完整处于dock上方，今日整行习惯回应保留。该观察只支持现有截图状态；200%文本、全部宽度和running/paused状态以正在执行的完整矩阵为准。新增五个文件的最终SHA-256已更新到安全证据目录，未修改生产代码。

文档一致性抽查：README、旧版PWA/DEV及HANDOFF明确3.x存档与4.0当前入口；候选发布记录明确未部署，没有提前宣称上线。发现发布记录的“S01–S05复查中”和PLAN末段“F1待修复”落后于当前修订，已通知根协调在本轮证据收口时更新；这些是状态滞后，不是虚构通过。

批准更新至实际接管间再创建草稿的竞态依现有beforeunload保护，本轮未实测，不追加新阻断。若后续增强，建议在真正reload时再次读取当前guard并延迟刷新到草稿释放，保持worker已接管与页面尚未重载两个事实分开；不要把批准瞬间的无草稿永久视作之后仍无草稿。本轮增量签收保留此未测边界。

## 原生200%页面缩放：能力阻塞，未签收

按TEST_STRATEGY要求，原生浏览器文字/页面缩放独立于CSS文字压力模拟。本审核人读取Browser技能并初始化其官方运行时；`getForUrl('http://127.0.0.1:4190/LifeIndex/')`返回`No browser is available`，再按bootstrap-troubleshooting只读发现一次，`agent.browsers.list()`返回空数组。没有可用Browser连接，也未取得任何native zoom接口。

随后按Computer Use技能尝试预装Chrome的原生UI：只读应用列表确认Chrome已运行后，发送Cmd+Shift+N打开隔离无痕窗口，拟再获取新窗口状态。此调用约579秒未返回，被中止，未获得窗口/截图/200%菜单值。不能确认快捷键是否实际执行，因此不盲目关闭未知用户窗口。本审核人没有导航到4190测试页，没有读取用户profile、session、cookies或现有标签内容，也未新启动Playwright/browser进程；已告知根协调停止工具尝试，避免干扰性能独占。

结论：**原生200%缩放未验证，当前是工具连接/执行能力阻塞。** 不以deviceScaleFactor、CDP pinch、CSS放大或已有84项文字压力测试冒充此项通过，不降低原验收标准。若后续恢复可用原生控制或由用户执行，需要实际菜单缩放值、核心页/录入弹层重排及可滚动证据后才能签收。本节限制不撤销此前已完成且范围明确的代码及定向交互审核。

## 原生缩放能力恢复与实际验收通过

根协调明确批准免费隔离Chromium扩展方案后，本审核人依[Chrome官方Tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-setZoom)及[automatic缩放模式](https://developer.chrome.com/docs/extensions/reference/api/tabs#type-ZoomSettingsMode)，使用真正的`chrome.tabs.setZoom(2)`；[Playwright官方扩展说明](https://playwright.dev/docs/chrome-extensions)提供persistent context和`channel: chromium`启动方式。扩展仅具localhost host permission，没有content script；每次mkdtemp创建空profile，未访问用户profile。此前Browser/Computer Use能力阻塞是真实历史，现由这一明确授权且验证成功的方法解除原生页面缩放验收阻塞。

2026-09-29对第五生产构建4190实际执行：窗口1280/780/640宽、1328高，100%原生getZoom=1时innerWidth同窗口；200%原生getZoom=2时innerWidth分别640/390/320，innerHeight664，visualViewport.scale始终1，CSS zoom始终1，rootFont始终16px。这证明是浏览器页面缩放导致布局视口变化，不是CSS字体放大、deviceScaleFactor、移动模拟或CDP pinch。原生getZoom、settings、前后尺寸完整保存在`/tmp/lifeindex-native-zoom/result.json`。

五核心页（今天/健康/专注/记账/设置）×三档、三录入弹层（金额/体重/运动）×三档，共24路径通过：根文档无横向溢出；全局录入及保存目标尺寸至少44CSS px、中心实际命中；弹层可滚动到备注并填入合成文本，九次真实UI保存成功。最终独立执行6.86秒，exit0，context已关闭。脚本、扩展、官方方法说明、最终日志、100%/200%截图及dist/index.html哈希保存在`/tmp/lifeindex-native-zoom`。

首次fullPage截图在原生缩放下触发Playwright截取左半的截图限制，未据此签收视觉；切换viewport截图实际重跑，并补充滚动到备注与清除回执遮挡后得到完整画面。本审核人实际查看最窄录入和专注截图；最终`width-640-expense-dialog-200.png`清楚呈现滚动后的日期/备注与完整固定保存栏，所有PNG使用viewport方法。此项通过覆盖Chromium原生200%页面缩放；不声称Safari仅文字缩放或物理iPhone已验。

## c15269c 主导航复位增量审核

只读核对`c15269c0fdd4ab9c830c47695daab95141a2b0f8`：仅带navigationStart标记的主导航/品牌/设置入口PUSH归零滚动并聚焦可聚焦main；Flow保存/取消返回使用REPLACE，浏览器后退为POP，均不触发此分支。对照FlowProvider及报表返回保存合同，范围明确，有原因注释及隐私安全日志，未发现新阻断。实际双引擎主导航2项与返回10项由QA执行签收，不冒充本人的执行。最终AppShell源码哈希已更新到`/tmp/lifeindex-v4-release-review/final-source-sha256.json`。
