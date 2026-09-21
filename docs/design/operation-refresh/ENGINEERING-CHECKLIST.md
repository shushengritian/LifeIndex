# 全应用操作优化：独立工程检查清单 C

日期：2026-09-20。状态：初始清单完成，第一轮原型审核未开始。查阅时 HEAD：`41066c3`；当前产品 3.0.0，数据库/备份 V4。

仅查阅 AGENTS、baseline、PLAN、BRIEF、生产核心页面、Sheet/ConfirmDialog/AppShell/NavigationGuard 及相关测试；未读本轮 DESIGN.md 或另一审核员报告。只写本文件，不设计 UI、不评价审美、不改原型、不 commit。未运行 Impeccable、Browser 或产品测试，未访问生产站点或实际业务数据。

已收到后续服务地址 [4176](http://127.0.0.1:4176)、[审稿板](http://127.0.0.1:4176/operations-review.html)、[原型入口](http://127.0.0.1:4176/operation-refresh/index.html)。原型仍在实现；这些是用户提供的入口，本次未访问，待另行发起第一轮审核。

用户补充的隔离方案为 **opaque sandbox iframe，禁止存储**；本次仅记录该方案，尚未实测。不存在生产数据访问授权。

## 证据口径

- 下列现有依据均为源码/测试断言查阅，**不表示本次测试通过**；PLAN 的历史发布证据不自动适用于新原型。
- 所有复选项目前均为**原型待测**。后续区分“原型模拟通过 / 不符合 / 未覆盖 / 未测”；生产契约和真机待确认单独记录。
- 浏览器操作内存样本只能证明原型交互；截图只能证明所呈现的布局和可见状态，不能证明焦点循环、重复提交、滚动恢复、事务或持久化。
- WebKit/iPhone viewport、模拟时钟、contextmenu/文件 cancel 事件不等于物理 iPhone。软键盘、长按拖动、Files/分享、VoiceOver、后台计时及主屏幕离线持久化未测不得记通过。
- 优先级：P0 为真实数据/隐私或授权边界突破，停止相关操作并报告；P1 为状态/数据语义错误、草稿丢失或关键操作受阻；P2 为非阻断的可复现反馈/布局问题。下文未标级别的项目优先按 P1 检查，实际发现按后果定级。

| 审核层级 | 本轮要求 |
| --- | --- |
| 可交互设计应保持的契约 | 优先高频任务闭环、草稿保护、单次提交、失败后可恢复、焦点与导航；使用合成内存状态验证，不要求生产数据层。 |
| 生产能力专项 | 完整 V4 校验/跨表原子事务、50 MiB 文件上限、15 分钟一次性令牌、真实文件交付、后台持久化、SW/离线及迁移只列兼容边界。未模拟不作为原型缺陷，不要求重建，不计入本轮原型通过率。 |

## 当前证据索引

| 编号 | 已查阅依据 | 能支持的事实及局限 |
| --- | --- | --- |
| E0 | [AGENTS](../../../AGENTS.md)、[baseline](../../../LifeIndex-Project-Baseline.md)、[PLAN](../../../PLAN.md)、[BRIEF](BRIEF.md) | 当前五导航以 PLAN/BRIEF 为准；本轮仅隔离原型和文档、合成内存样本、刷新重置，不授权生产或发布。 |
| E1 | [AppShell](../../../src/app/AppShell.tsx)、[App 路由](../../../src/app/App.tsx)、[NavigationGuard](../../../src/app/NavigationGuard.tsx)、[useDirtyForm](../../../src/pwa/useDirtyForm.ts)；[navigationGuard 测试](../../../tests/unit/navigationGuard.test.tsx)、[form-write-guard](../../../tests/unit/form-write-guard.test.tsx) | 草稿留在/放弃、history POP、busy 阻止离开、更新/刷新拦截、各表单独立释放保护。jsdom 不证明原生焦点。 |
| E2 | [Sheet](../../../src/shared/ui/Sheet.tsx)、[ConfirmDialog](../../../src/shared/ui/ConfirmDialog.tsx)；[accessibility-matrix](../../../tests/e2e/accessibility-matrix.spec.ts)、[settings-recovery](../../../tests/e2e/settings-recovery.spec.ts) | 背景 inert、Tab 循环、顶层确认、安全初始焦点及 preventScroll 恢复。完整键盘链主要覆盖记账；contextmenu/文件取消为模拟。 |
| E3 | [TodayPage](../../../src/features/today/TodayPage.tsx)、[FinancePage](../../../src/features/finance/FinancePage.tsx)；[finance-confirmation](../../../tests/integration/finance-confirmation.test.tsx)、[app-shell](../../../tests/e2e/app-shell.spec.ts) | 快捷记账返回今天、失败保留、原生日期提交、异日保存不切浏览日期；跨模块摘要与链接边界有测试。 |
| E4 | [FinanceCategoryPicker](../../../src/features/finance/FinanceCategoryPicker.tsx)、[CategoryManager](../../../src/features/settings/CategoryManager.tsx)；[分类选择测试](../../../tests/unit/finance-category-picker.test.tsx)、[层级测试](../../../tests/integration/category-hierarchy.test.ts)、[二级改名测试](../../../tests/integration/category-name-only.test.tsx) | 两级、归档继承、历史引用、父子汇总一次；二级仅名称不意味着清除旧字段。 |
| E5 | [HealthPage](../../../src/features/health/HealthPage.tsx)、[HabitsPage](../../../src/features/habits/HabitsPage.tsx)；[health-history](../../../tests/integration/health-history.test.tsx)、[healthRepositories](../../../tests/integration/healthRepositories.test.ts)、[habit-ui](../../../tests/integration/habit-ui.test.tsx)、[历史滚动测试](../../../tests/e2e/health-history-scroll.spec.ts) | 数值/日期、40 条历史、失败保护、只读习惯统计；滚动测试断言的是 window.scrollY，不是新原型的内部容器。 |
| E6 | [FocusPage](../../../src/features/focus/FocusPage.tsx)、[useFocusCompletion](../../../src/features/focus/useFocusCompletion.ts)；[focus-confirmation](../../../tests/integration/focus-confirmation.test.tsx)、[focus-completion](../../../tests/integration/focus-completion.test.tsx)、[focus-write-guard](../../../tests/integration/focus-write-guard.test.tsx)、[focus-progress](../../../tests/e2e/focus-progress.spec.ts) | 固定结束点重试、取消/保存区分、时间事实不可编辑；模拟时钟不证明 iOS 后台。 |
| E7 | [CessationPage](../../../src/features/health/cessation/CessationPage.tsx)、[CessationForms](../../../src/features/health/cessation/CessationForms.tsx)、[useCessation](../../../src/features/health/cessation/useCessation.ts)；[cessation](../../../tests/integration/cessation.test.ts)、[native-time](../../../tests/unit/cessation-native-time.test.tsx)、[draft-confirmation](../../../tests/unit/cessation-draft-confirmation.test.tsx) | 快照/完整日不同，同日吸烟撤销确认，删除不重建；跨域隔离及原生日期、嵌套 Escape 有断言。 |
| E8 | [SettingsPage](../../../src/features/settings/SettingsPage.tsx)、[BackupService](../../../src/data/backup/BackupService.ts)；[settings-safety](../../../tests/integration/settings-safety.test.tsx)、[backup](../../../tests/integration/backup.test.ts) | 先校验预览再替换、原子回滚、令牌、锁、主题回退、提交后异常。E3 的 WebKit 备份恢复用合成输入，不证明 Files 往返。 |
| E9 | [logger](../../../src/shared/logging/logger.ts)、[日志测试](../../../tests/unit/logger.test.ts)；[样式](../../../src/styles/global.css)、[Playwright 配置](../../../playwright.config.ts)、[mobile-polish](../../../tests/e2e/mobile-polish.spec.ts) | 日志键白名单不自动脱敏值；现有浏览器测试有 320px/双主题/减少动画覆盖，mobile-safari 是设备模拟。 |

## 可验证清单

### 授权、数据与原型隔离（E0、E8、E9）

- [ ] **B01 · P0** 查原型加载链和会话请求：不加载生产初始化/仓储/备份服务，不打开 LifeIndexDB，不读写 IndexedDB、localStorage、sessionStorage 或业务缓存，不注册 SW；样本、主题与状态仅内存，修改后刷新重置，新标签页不承接旧业务状态。
- [ ] **B02 · P0** 核对用户指定的 opaque sandbox iframe：sandbox 不开放 allow-same-origin，子页不经父页桥接访问存储、生产数据或文件操作；核查父页加载链和消息处理边界，不用不同路径/端口代替 sandbox 证据。不得以验证隔离为由读取个人数据库、尝试真实写入或清理生产数据/SW；备份等明确模拟，不要求真实文件。
- [ ] **B03 · P0** 不改 src/public、依赖、版本、schema、存储、SW、部署/发布配置；不运行迁移、发布或 commit，不推进评审门槛。C 只写本文件，保留其他代理的并行改动。
- [ ] **B04** 五导航仍为今天/健康/专注/记账/设置，保留 Ocean 双主题及既有范围；不增加账户/后端/云同步、外部记账、专注暂停、健康建议或跨域自动写入。习惯暂停不能扩展为专注暂停。

### 共用状态、草稿和结果（E1–E8）

适用于记账、体重/目标、运动、习惯、专注、戒烟计划/事件/原因、分类编辑与恢复；一个表单通过不能推及其余表单。

- [ ] **S01** 每个适用流程覆盖加载、空、读取失败、干净/脏表单、校验失败、保存中、写失败、成功；读取失败不能显示为零或无记录，失败不能发出成功回执。
- [ ] **S02** 输入后尝试取消、返回、Escape、已有遮罩/手势出口、底栏、子页及浏览器返回：所有可达出口守住同一草稿保护；继续填写保留全部值，明确放弃只丢草稿。仅改日期/分类/计划日等也应判脏，干净表单正常返回。
- [ ] **S03** 用模拟延迟连续点击保存/删除/打卡并立刻返回：只有一次结果；保存中不能编辑、放弃或离开；完成后不自动执行此前被拒绝的导航。不得暗示放弃能撤回正在提交的操作。
- [ ] **S04** 模拟失败后保留原记录和草稿，释放 busy，可重试/明确放弃；不留永久禁用按钮。嵌套流程只释放自身保护，退出全部层级后无残留遮罩/inert/滚动锁。
- [ ] **S05** 成功后重开目标记录核对字段，关联列表、今天和统计同步；返回正确来源，保留适用日期/筛选/位置。刷新/更新保护属于生产衔接边界，原型刷新仍重置，不为演示添加持久化或 SW。
- [ ] **S06** 删除、替换、清除目标、结束计划等仍明确说明对象和后果；确认前/取消后不变更样本，失败不移除目标。改变入口形式不减掉原有保护。

### 键盘与焦点（E1、E2、E7、E9）

- [ ] **A01** 图标按钮、更多/返回/删除、输入均有可访问名称及必要上下文；控件语义正确、可键盘激活。日历/热力图可读取日期与状态，选中/展开/禁用/当前导航有对应语义。
- [ ] **A02** 逐种打开编辑、管理和统计面板：初始焦点可见且合理；Tab/Shift+Tab 留在当前层，隐藏/禁用控件不参与循环，背景不能点击或聚焦。
- [ ] **A03** 二次确认优先聚焦安全动作；Escape 只处理最上层，不穿透丢弃草稿，busy 时不能绕过保护。取消确认回原编辑控件；关闭面板回触发器；触发器被删除则回可见合理位置，不落在 body/失效节点/inert 区。
- [ ] **A04** 成功/错误可供辅助技术读取，错误关联字段且不只短暂闪现；计时不每秒播报，焦点两主题均清晰，状态不只靠颜色。自动扫描不能证明 VoiceOver 通过。

### 手机滚动、320px、双主题及减少动态（E0、E2、E5、E9）

- [ ] **M01** 320×568、390×844、430×932，浅/深主题检查五首页、子页、最长表单、预览与确认：无页面横向溢出/重叠/关键动作遮挡；长标题/备注/分类/错误/时长仍可用；触控区保持项目既有至少 44×44 要求，包括七列日历。
- [ ] **M02** 指定内部容器滚到两端，底栏独立、末项不被安全区或底栏遮挡；弹层滚动不穿透背景。40 条体重/运动历史打开最老条目，保存/取消/放弃/删除返回后保留原条目或合理邻项；记录实际容器位置，不仅测 window.scrollY。
- [ ] **M03** 短视口下日期/数字输入、底部备注和确认动作仍可到达；退出弹层后焦点恢复不推动页面或底栏。缩小浏览器视口只标短视口模拟，不当作 iPhone 软键盘、Safari 工具栏/visualViewport 验证。
- [ ] **M04** 已知设置路径“长按恢复→拖动→点空白→返回/切换导航”独立记录底栏位置及可操作性；文件取消和 contextmenu 若为事件模拟须标明。PLAN 中真机问题仍待确认，不因模拟正常宣布修复。
- [ ] **M05** 浅/深/跟随系统覆盖 focus、选中、disabled、busy、error 和确认；切主题不丢草稿/筛选/计时。减少动态时去除或缩短装饰运动，保留状态反馈，不依赖 animationend 才完成操作；文字放大后关键流程仍可完成。

### 业务语义（E3–E8）

- [ ] **F01** 今天记一笔成功才返回并更新摘要，干净取消/明确放弃无写入；普通记账保留日历上下文。异日保存不切浏览日期，明确查看记录才跳往保存日期；月汇总与所选日列表各按正确范围计算。
- [ ] **F02** 金额正数、最多两位小数、计算用整数分；日期用本地日历语义，原生日期立即提交采用可见值且失败保留。切换收支不保留不匹配分类。
- [ ] **F03** 一级/可选二级/不细分对应正确记录，最多两级；归档不影响旧账原引用，新账不可选归档分类。一级彩色图标、二级仅名称不重写已有字段；父子汇总不重复，父级恢复不解除子级独立归档。
- [ ] **H01** 体重/目标维持 20–500 公斤及克精度，运动为 1–1440 整数分钟、合法强度/分类；不改单位或新增健康评判。全部历史可达，误填未来日期的旧记录仍可纠正；删除/清目标失败保留原值。
- [ ] **H02** 习惯每日/按星期/开始日期影响可打卡范围；今天与健康同步，双击不把新打卡立即撤销，显式撤销仅影响目标日期。
- [ ] **H03** 习惯统计/热力图点击只查询，不补打卡或改历史；暂停/恢复保留历史，失败不假装切换。
- [ ] **O01** 专注有效标题、25/50/自定义、1–240 分钟，最多一个活动会话，无暂停；剩余/已专注/目标分明，未满分钟表达秒数。跨页不重启；模拟时间跃迁不算后台验证，刷新仍重置原型。
- [ ] **O02** 提前结束保存实际时长，取消不留会话；未满一秒不生成有效历史。到点/提前结束写失败可重试，结束点固定、时长不增加且只保存一次；明确返回计时才放弃待重试的手动结束操作。
- [ ] **O03** 今天/本周/历史仅统计完成并保存的会话，不计活动/取消/失败；历史只编辑标题/分类/备注，不改时间事实；删除成功才扣统计。
- [ ] **C01** 无计划/未来/进行中/已结束或取消动作正确，最多一个未结束计划，起点/时区/估算基线固定；隐藏不删除，设置可进入并恢复健康入口，结束保留历史。
- [ ] **C02** 经过时间不称连续无烟证明；截至现在、待确认、完整日、未记录不同，今天及不足全天首日不计完整日；节省仅按确认完整日估算，不生成账目。
- [ ] **C03** 新增/移动吸烟记录撤销目标日确认，删除不自动恢复；烟瘾不自动生成打卡/专注。日期遵守计划范围/时区、拒绝未来事件，失败重试不重复；外部支持入口不带个人参数、不扩为医疗建议。

### 设置、备份模拟与日志（E0、E4、E8、E9）

- [ ] **D01** 设置保留分类/外观/数据与安全/其他及完整返回路径；分类改名/排序/归档/恢复保留身份与历史引用；主题保存模拟失败回原选择。关于页区分现有产品契约与原型，不宣称改变应用/库版本。
- [ ] **D02** 合成恢复顺序为选择→解析校验→预览→明确替换确认→处理中→结果；预览可核对版本、时间、模块数量，明确全部替换非合并、提醒先备份。选择/预览/取消不能修改样本。
- [ ] **D03** 用代表性的“校验失败/替换失败”合成状态验证错误反馈及恢复路径：原样本不变；替换中阻止双击/重选/离开，失败保留可重试预览，成功才完成闭环。不要求逐类重建完整校验器、真实令牌或跨表事务，未模拟的生产机制仅记边界。
- [ ] **D04** 替换成功后的外观读取失败不能报“原数据已保留”；导出区分取消、失败、交给系统和时间记录失败，交付系统不等于已存入 Files/iCloud。不得新增合并/V5/降级能力；保留历史回执不等于恢复外部记账入口。
- [ ] **L01** 关键逻辑/分支/状态转换有解释责任或原因的注释，日志覆盖进入、关键分支、状态、失败；只用受控操作/状态/失败类和必要数量，计时不每秒记录。
- [ ] **L02 · P0** 查调用及原型日志/请求：不含金额、体重、标题、备注、戒烟原因/诱因、输入日期、记录标识、文件内容、原始错误或带业务参数 URL。白名单 reason/operation 也不能塞个人值；日志不成为持久化/遥测旁路，截图与报告只含合成数据。

## 重要风险与后续审核

目前没有新原型缺陷结论。第一轮优先核实：内部滚动使旧 window.scrollY 测试失效；Sheet 不统一负责调用方的 autofocus/Escape/退出保护；简化确认削弱 busy/失败重试；专注重绘改变结束点/统计；戒烟快照误称全天；备份模拟误称真实能力。键盘完整链目前主要有记账证据，不能推及全部面板；已知 iPhone 长按/底栏问题仍待真机确认。

收到第一轮指令后先核查隔离，再优先走通高频任务闭环、草稿/单写保护、焦点/导航，随后检查尺寸/主题和低频管理。每项发现记录：编号、清单 ID、位置、原型修订、浏览器或截图来源、尺寸/主题、合成前置状态、步骤、预期/实际、证据路径、严重度及契约修正建议。截图不能证明的交互保留未测；未模拟的生产能力仅记边界，不据此要求原型实现。真机事实单列，无证据的推测只列风险。

第一轮不先读设计师自评或另一审核员意见。汇总修改后最多一次复审，核对修订及必要关联回归；C 不修原型、不代设计师勾选、不推进生产/发布。未覆盖或分歧如实交主代理与用户决定，本清单不改变 PLAN 的里程碑或真机状态。
