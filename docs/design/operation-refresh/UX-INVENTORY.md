# LifeIndex 初始操作库存：独立体验审核 B

2026-09-20。状态：库存完成，等待完成原型与浏览器截图后独立操作审核。本文不是原型缺陷报告或验收结论。

## 范围与证据

已读 [AGENTS.md](../../../AGENTS.md)、[Baseline](../../../LifeIndex-Project-Baseline.md)、[PLAN](../../../PLAN.md)、[BRIEF](BRIEF.md)，查阅当前 `src/features`、`src/app` 及直接关联的公共弹层、PWA、备份代码。观察基准为工作区 `HEAD 41066c3`、应用版本 `3.0.0`。

已查看 [v3-focus](../reviews/v3-focus/README.md) 深浅主题图、[settings-icons](../reviews/settings-icons/README.md) 设置/外观/图标图、[category-compact](../reviews/category-compact/README.md) 一级/菜单/二级图及对应 README。设计参考限已查阅的 SCREEN_FLOW_INVENTORY、G2_INTERACTION_SPEC、V2_UI_INTERACTION、G4_COMPONENT_NOTES、SMOKING_CESSATION_UI、G3_OCEAN_TOKENS；未穷尽旧文档，旧导航、旧配色和拟议能力不覆盖当前源码及简报。

Impeccable 仅手动读取技能及 Operate 参考，用于区分任务可达性、状态一致性与表达偏好；未运行 launcher、engine、hook 或完整 critique。未读设计代理 `DESIGN.md`、未完成代码或另一审核员评审。未运行产品/原型，未访问用户数据库或真实备份；只写本文件，不提交。

下表限 **30 条核心动作**。“现状”来自已查源码或截图；“审核步骤”全部待实测，不能当作发现。P0 表示优先核对数据保护与事实语义，P1 表示任务闭环与恢复，P2 表示发现性与效率；这是审核顺序，不表示当前存在同等级故障。建议是候选操作模式，不是设计定稿。

## 可执行清单

### 共用、今天与健康

| ID / 核心动作 | 已查现状与入口证据 | 优先级 / 建议模式 | 独立审核步骤（待执行） |
| --- | --- | --- | --- |
| 01 导航、返回、弹层退出 | 五导航顺序已固定；[AppShell:9](../../../src/app/AppShell.tsx#L9)。有[全局草稿拦截](../../../src/app/NavigationGuard.tsx#L8)及 [Sheet 焦点隔离](../../../src/shared/ui/Sheet.tsx#L16)。健康/习惯表单未见记账同样的 Escape 处理。 | P1：统一干净/脏/保存中退出，回实际来源。 | 五模块和子页往返；各表单不改退出、修改后继续/放弃、保存中尝试退出；检查 Escape、浏览器返回、焦点、滚动与底栏。 |
| 02 今天快速记账 | “记一笔”→`/finance/new`→表单→回今天；[Today:110](../../../src/features/today/TodayPage.tsx#L110)、[Finance:279](../../../src/features/finance/FinancePage.tsx#L279)。快捷回执只有成功标志，未带保存日期。 | P1：保留直达与来源返回；跨日保存给日期与回看入口。 | 新增取消回今天；保存刷新对应摘要；改为上月日期保存后能辨认位置并查看记录，不误以为未保存。 |
| 03 今天摘要与专注入口 | 内容行进入专注，活动/待保存有提示；[Today:118](../../../src/features/today/TodayPage.tsx#L118)。账目摘要只显示支出与收支笔数；[249](../../../src/features/today/TodayPage.tsx#L249)。 | P2：导航不等于执行；清楚呈现已有收支事实。 | 空闲/运行/待保存分别进入，不直接建会话；仅收入、仅支出、无记录、读取失败分别检查；专注汇总不含未保存会话。 |
| 04 习惯打卡与撤销 | 今天/健康整行打卡，管理列表整行看详情；[Today:195](../../../src/features/today/TodayPage.tsx#L195)、[Habits:517](../../../src/features/habits/HabitsPage.tsx#L517)、[550](../../../src/features/habits/HabitsPage.tsx#L550)。已有写入锁。 | P1：一步可撤销，打卡与详情目标易辨认；是否拆名称/勾选为候选方案。 | 三处入口完成/撤销状态一致；连点不重复写；失败保持原态；尝试查看详情不应误打卡。误触目前未实测。 |
| 05 健康新增选择 | 页头 +→戒烟/体重/运动/创建习惯；体重运动另有就地 +；[Health:684](../../../src/features/health/HealthPage.tsx#L684)、[879](../../../src/features/health/HealthPage.tsx#L879)。 | P2：动作面板只负责进入任务，就地新增贴近内容。 | 逐一进入四项并取消；仅打开不写记录；无输入的选择面板也能接收焦点、关闭回触发器。 |
| 06 体重新增与编辑 | 体重 +或历史整行→公斤/日期时间/备注表单；[Health:55](../../../src/features/health/HealthPage.tsx#L55)、[710](../../../src/features/health/HealthPage.tsx#L710)。保存只关闭，未见专属成功提示。 | P1：短面板，结果明确，错误指向字段。 | 合法新增/编辑更新摘要与历史；改日期能找回；20–500 公斤范围外拒绝；失败保留输入；编辑不追加记录。 |
| 07 体重趋势与完整历史 | 近30天每日末次曲线→“查看体重历史”；[Health:727](../../../src/features/health/HealthPage.tsx#L727)、[WeightTrendChart:10](../../../src/features/health/WeightTrendChart.tsx#L10)。 | P1：保留完整历史，不补造测量值；章节行/链接是表达偏好。 | 40条跨月样本找到最早一条；近30天为空仍可查旧记录；单点不造完整趋势；精确值不依赖悬停，返回位置明确。 |
| 08 体重目标设置、修改、清除 | 目标行→面板；清除确认明确不删称重；[Health:423](../../../src/features/health/HealthPage.tsx#L423)、[745](../../../src/features/health/HealthPage.tsx#L745)。 | P1：区分保存与清除，保留后果说明。 | 设置→修改取消；清除取消保留，确认只去目标；失败保留旧设置；窄屏取消/保存/清除不混淆。 |
| 09 运动新增与编辑 | 运动 +或历史整行→类型/分钟/强度/日期/备注，默认30分钟、适中；[Health:209](../../../src/features/health/HealthPage.tsx#L209)、[797](../../../src/features/health/HealthPage.tsx#L797)。 | P1：默认值可见可改；无类型时说明已有分类管理路径。 | 合法新增/编辑；非1–1440整数分钟拒绝；旧记录可保留原归档类型，新记录不可选；失败保留；不自动打习惯卡。 |
| 10 运动历史与健康记录删除 | 本周摘要→完整历史；体重/运动编辑内删除→确认；[Health:814](../../../src/features/health/HealthPage.tsx#L814)、[916](../../../src/features/health/HealthPage.tsx#L916)。确认只有类型，没有记录摘要。 | P0：保留删除确认，补可辨认对象。 | 本周为空仍可查上月；分别删指定称重/运动，取消零变化，失败保留；只删目标并更新汇总；最后一条删后为空态，目标和习惯不变。 |
| 11 习惯创建与编辑 | 健康总 +或管理页 +；列表→统计→编辑；[Habits:59](../../../src/features/habits/HabitsPage.tsx#L59)、[372](../../../src/features/habits/HabitsPage.tsx#L372)。编辑会清掉详情选择，保存回列表；[306](../../../src/features/habits/HabitsPage.tsx#L306)、[431](../../../src/features/habits/HabitsPage.tsx#L431)。 | P1：保留已有字段，编辑返回调用上下文。 | 每天/按星期分别建；空名称/无星期具体提示；详情编辑取消/保存后能回原习惯；不丢历史，不增提醒或数量目标。 |
| 12 习惯统计、暂停、恢复 | 管理列表→统计面板，含统计、14周热力图、最近五次；暂停/恢复有确认；[Habits:537](../../../src/features/habits/HabitsPage.tsx#L537)、[581](../../../src/features/habits/HabitsPage.tsx#L581)。 | P1：长内容退路明确，查看不写入；面板或子页是偏好。 | 热力图只查看、不补打卡；横滑早期日期、放大后可退出；暂停保留历史且不参与后续打卡；可恢复，失败不改状态。 |

### 戒烟与专注

| ID / 核心动作 | 已查现状与入口证据 | 优先级 / 建议模式 | 独立审核步骤（待执行） |
| --- | --- | --- | --- |
| 13 戒烟进入与开始计划 | 健康卡/总 +/设置→戒烟；无计划开始，已结束可新建；[CessationCard:7](../../../src/features/health/cessation/CessationCard.tsx#L7)、[Cessation:430](../../../src/features/health/cessation/CessationPage.tsx#L430)。卡片“开始计划”落点也可能先显示旧计划。 | P1：入口用语对应落点；时间必填，原因/估算可选。 | 无计划/未来/只有历史计划分别进入；打开不建计划；只填时间可保存；估算不完整具体提示；保留固定起点、时区、基线语义。 |
| 14 快照、回顾、全天确认 | 主按钮快照；7天/月历→选日→确认/撤销/更多；[Cessation:180](../../../src/features/health/cessation/CessationPage.tsx#L180)、[221](../../../src/features/health/cessation/CessationPage.tsx#L221)、[342](../../../src/features/health/cessation/CessationPage.tsx#L342)。 | P0：快照≠全天，经过时间≠连续无烟，未记录≠无烟。 | 今日快照不计全天；符合条件过去完整日可确认；今天/未来/非完整日不可误确认；有吸烟禁冲突确认；换月、撤销、超过30条加载后日期上下文明确。 |
| 15 吸烟新增、更正、删除 | 次按钮→支数/时间/诱因；日事件整行编辑，删除确认；[SmokingForm:212](../../../src/features/health/cessation/CessationForms.tsx#L212)、[Cessation:471](../../../src/features/health/cessation/CessationPage.tsx#L471)。新增默认现在，不继承所选历史日。 | P0：明确日期及同日确认撤销后果；删后不自动恢复无烟确认。 | 选历史日→辨认/改新建日期→保存；0支/越界时间拒绝；保存吸烟撤销对应确认；编辑不追加；删除取消/失败保留，成功仍不自动变无烟。 |
| 16 烟瘾休息、结果与更正 | 3分钟/重新计时、两种结果保存、不保存返回；旧事件更正复用面板；[CravingForm:302](../../../src/features/health/cessation/CessationForms.tsx#L302)。 | P0：计时与保存分开；旧记录更正目的清楚。 | 不等到期也可保存；到期不自动写；退出零事件；更正保留原时间、不追加；删除不误恢复无烟确认；不生成专注或习惯。 |
| 17 戒烟管理、隐藏恢复、支持 | 管理含原因/隐藏恢复/结束或未来取消/全部计划；支持有需联网外链；[Cessation:530](../../../src/features/health/cessation/CessationPage.tsx#L530)、[602](../../../src/features/health/cessation/CessationPage.tsx#L602)。可见返回固定去健康；[113](../../../src/features/health/cessation/CessationPage.tsx#L113)。 | P0：结束/隐藏/删除分开；P1：设置进入应回实际来源。 | 编辑原因；结束确认后历史保留、不能新增事件；隐藏后从设置恢复原计划；健康/设置分别返回；外链取消不离开，确认才打开且不附记录。 |
| 18 专注准备与开始 | 25/50/自定义1–240分钟，标题必填，可选分类备注折叠；[Focus:114](../../../src/features/focus/FocusPage.tsx#L114)。 | P1：一个主要开始动作；不新增暂停。 | 三种时长开始；空标题/越界拒绝；启动失败保留；连点只一个会话；开始前离页保护草稿，开始后正常导航。 |
| 19 专注运行与返回 | 剩余、已专注、目标分开；[Focus:34](../../../src/features/focus/FocusPage.tsx#L34)；[v3浅色](../reviews/v3-focus/light.png)、[深色](../reviews/v3-focus/dark.png)。旧固定“0分钟”已修正。 | P1：保留已修正事实，不重复报旧问题。 | 61秒后剩余/已用/弧线一致；离页返回同一会话；一小时以上完整可读；不每秒读屏播报。原型模拟不证明真实后台。 |
| 20 提前结束与取消 | 两动作各有确认；失败重试沿用首次确认终点；[Focus:505](../../../src/features/focus/FocusPage.tsx#L505)、[607](../../../src/features/focus/FocusPage.tsx#L607)。 | P0：结束保存实际时间，取消不保留；文字与确认保留。 | 分别取消确认、结束保存、取消本次；仅保存增加汇总；失败重试不额外积时；返回计时明确继续原计划，不假报成功。 |
| 21 到期、待保存、重试 | 自动完成失败提示时长固定并可重试，今天也有入口；[useFocusCompletion:22](../../../src/features/focus/useFocusCompletion.ts#L22)。 | P0：到期≠已保存；失败不能先加汇总或开第二会话。 | 成功一条；失败→待保存→重试仍一条且时长固定；今天/专注结果一致；模拟不冒充真实事务验证。 |
| 22 专注历史、描述编辑、删除 | 历史有全部/今天/周/月及分类汇总，每行独立编辑按钮；[Focus:691](../../../src/features/focus/FocusPage.tsx#L691)、[808](../../../src/features/focus/FocusPage.tsx#L808)。详情时间只读；[271](../../../src/features/focus/FocusPage.tsx#L271)。 | P0：不扩展改时长或补会话；整行详情是可选一致性方案。 | 各范围列表/汇总同口径；关闭详情保留范围；改描述不改时长；删除能辨对象与后果，取消无变，成功移出汇总，失败保留。 |

### 记账、设置与备份

| ID / 核心动作 | 已查现状与入口证据 | 优先级 / 建议模式 | 独立审核步骤（待执行） |
| --- | --- | --- | --- |
| 23 记账日历、摘要、统计 | 月箭头→选日明细；月汇总、近7天支出曲线、折叠分类/近6月趋势；[Finance:524](../../../src/features/finance/FinancePage.tsx#L524)、[650](../../../src/features/finance/FinancePage.tsx#L650)。日历是净额，曲线是支出。 | P1：保留可点日历，口径清楚；跨路由日期恢复待测。 | 换月选日同步明细/摘要/曲线；无记录与收支抵消0可区分；完整金额可读；展开不改选择；离页返回核对日期/位置。 |
| 24 账目新增编辑、两级分类 | +继承选日，整行编辑；[Finance:86](../../../src/features/finance/FinancePage.tsx#L86)、[609](../../../src/features/finance/FinancePage.tsx#L609)。一级彩色、二级名称且可不细分；[Picker:63](../../../src/features/finance/FinanceCategoryPicker.tsx#L63)。 | P1：短表单，失败保留；换类型清分类，改日期给回看入口。 | 历史日新增继承日期；一级/二级分别保存；切收支不偷用旧分类；归档值仅原记录可保留；无分类有退路；编辑不追加；异月保存不静默跳走。 |
| 25 删除账目 | 行末垃圾桶→确认，按钮仅叫“删除”、确认无对象摘要；[Finance:634](../../../src/features/finance/FinancePage.tsx#L634)、[463](../../../src/features/finance/FinancePage.tsx#L463)。并非点击即删。 | P0：保护保留；P1：对象可核对。移进详情是偏好。 | 两条相似账目删指定一条；确认能辨对象；取消零变、失败保留；成功只删目标并更新日/月/趋势。 |
| 26 设置结构与关于 | 分类/外观/数据与安全/其他；关于含运行版本、库版本、存储与离线状态；[Settings:241](../../../src/features/settings/SettingsPage.tsx#L241)、[357](../../../src/features/settings/SettingsPage.tsx#L357)；[截图](../reviews/settings-icons/settings-light.png)。 | P1：四组与信任信息保留；长分类不妨碍其余入口可达。 | 找到四组、关于、隐藏戒烟恢复路径；子页正确返回；运行版本不伪称最新部署；不新增清库、账号、云同步或外部记账入口。 |
| 27 分类浏览、新建编辑、排序、归档恢复 | 四组；财务一级进二级，三点管理；60图标/11组；[CategoryManager:77](../../../src/features/settings/CategoryManager.tsx#L77)、[220](../../../src/features/settings/CategoryManager.tsx#L220)、[320](../../../src/features/settings/CategoryManager.tsx#L320)。已看菜单及二级双主题图。 | P0：归档保留历史与父子语义；P2：紧凑菜单、一级彩色/二级名称。 | 四组往返；新增/改名/换图标颜色；只浏览图标组不算脏；二级只改名；排序首末边界；归档确认、恢复及历史引用正确；底部菜单所有项可达，是否遮挡待测。 |
| 28 外观选择 | 系统/浅/深即时应用保存，失败回滚；[Settings:99](../../../src/features/settings/SettingsPage.tsx#L99)、[252](../../../src/features/settings/SettingsPage.tsx#L252)。已看两主题外观截图。 | P1：保留文字/勾选/高亮，不加多余保存确认。 | 切三项，页面/弹层一致；失败回原选择并说明；忙碌防重复；未模拟系统变化就标未覆盖。 |
| 29 导出与系统交接 | 导出子页→完整JSON→分享/下载；取消、交接失败、时间记录失败有不同结果；[Settings:116](../../../src/features/settings/SettingsPage.tsx#L116)。 | P0：已交系统≠文件已存在；保留 Files/iCloud Drive 核对提示。 | 只模拟交接，不碰真实文件；成功/取消/失败/交接成功但时间未记录分别准确反馈；不能声称已拥有可恢复备份。 |
| 30 校验、预览、替换恢复 | 选文件→校验→预览→最终确认；[Settings:148](../../../src/features/settings/SettingsPage.tsx#L148)、[393](../../../src/features/settings/SettingsPage.tsx#L393)、[499](../../../src/features/settings/SettingsPage.tsx#L499)。预览15分钟过期；[BackupService:140](../../../src/data/backup/BackupService.ts#L140)。界面失败统一提示同一预览重试；旧备份预览显示规范化V4。 | P0：校验/预览/明确替换全部不合并不可删；P1：过期与写入失败分开、旧版缺失域后果具体。 | 合成有效/损坏/超限/旧版/过期样本；取消不写，无效不替换；旧版说明缺失域也被覆盖；过期重新选并校验；写入防重复，失败原数据保留；成功后外观失败不假称全体回滚。 |

## 共同状态与保护

相关动作共同核对：空态、读取失败与重试、具体字段校验、脏草稿、保存中防重复、失败保留、真实成功反馈、返回来源。多数业务读取失败只有文字、未见原地重试，戒烟已有重试；证据如 [Finance:420](../../../src/features/finance/FinancePage.tsx#L420)、[Health:719](../../../src/features/health/HealthPage.tsx#L719)、[useCessation:25](../../../src/features/health/cessation/useCessation.ts#L25)。这是源码差异，尚未实测其影响。

共用层还核对已查阅的 [PWA 提示](../../../src/pwa/PwaStatus.tsx#L20)与[既有链接操作](../../../src/app/actions/ActionPage.tsx#L170)：离线不阻断本地任务，草稿/写入中不能激活更新，失败有恢复路径；链接只保留习惯打卡和开始专注，先预览确认、非法不写、重复不重复创建，不恢复链接记账。原型未模拟则标“未覆盖”，不据此推断产品故障。

危险操作不能为美观删保护：备份替换、记录删除、专注取消/提前结束、戒烟结束、分类归档、目标清除、放弃脏草稿，保留相应对象/后果说明、安全退出和在途保护。快照与全天、到期与已保存、隐藏与删除、归档与删除分别表达。可以降低危险入口视觉权重，不能变成轻触即执行或虚假可撤销。

历史入口改章节行、垃圾桶收进详情、长统计改子页、减轻重复标题均为**主观表达偏好**；不能以“高级感”定缺陷。验收看发现、完成、核对结果与安全退出，允许同等可用方案。Ocean双主题、彩色一级图标、纯文字二级、数据曲线和五导航顺序保持。

## 后续证据边界

本轮仅源码与既有静态截图核对，未运行测试、原型或浏览器审核。误触、菜单裁切、跨页滚动、焦点落点、键盘遮挡、跨日、后台恢复均未实测；物理iPhone、系统文件/分享窗口、VoiceOver未验证。既有截图不替代这些证据。

收到完成原型与截图后，在审核者自己的独立tab、合成内存样本中执行清单；优先数据保护，再日常闭环，最后移动边界。检查320/390/430px双主题、长内容、文字放大、减少动画与键盘可达性，记录实际步骤、预期/实际、位置证据、严重度与建议。未覆盖诚实标注，不把理论清单转成发现；本阶段不再扩展源码、技能或截图查阅。
