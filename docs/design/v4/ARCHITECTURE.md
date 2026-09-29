> 历史设计参考：4.0已撤回，当前产品为3.3.0。本文的定稿、实现与验收描述仅代表当时状态，不是当前实施指令。原型代码未恢复；历史原文件可在Git提交 `cea0d8b53c3686cdefb2b99f824d80e08bda5d8c` 中查看。

# LifeIndex 4.0 架构方案

日期：2026-09-28。作者：架构负责人 `/root/architecture_lead`。状态：**R3/R4唯一架构契约提案 v3（A03/A04与实施接口收口），等待独立签收；未冻结，不代表生产实现或验收通过。** 至少完成第三轮架构审查，存在关键问题则继续专题轮次，不能因轮数达到而放行。当前由R2挑战方向D「日常调频」继续深化，动作采用[R4整行回应](ROUND_4_CONTROLS.md)候选；尚未完成独立冻结。

## 最新决策与任务边界

用户已明确：**不用考虑旧版；不用考虑历史数据；大胆尝试、大胆设计；设计可以超过三轮。** 这些决策优先于尚未同步的旧文档。旧页面、路由、组件、API、DB5、备份V5、功能假设和相对改善指标均不限制新版。历史测量只存档，不再要求“不得退步”或“至少三项胜过3.3”；旧数据迁移与旧备份兼容不属于4.0交付前提。

架构为新版体验服务。可以重定路由、实体、状态、库名和备份格式；可靠现有代码可以按新契约验证后复用，但不是必须复用的约束。不读取、迁移或清空旧数据库来实现新版；“不考虑历史数据”不等于清理用户设备。

根协调补全A04后，架构、设计和独立审核已恢复协作。本阶段架构职责只维护本文件与[测试策略](https://github.com/shushengritian/LifeIndex/blob/cea0d8b53c3686cdefb2b99f824d80e08bda5d8c/docs/testing/v4/TEST_STRATEGY.md)，不改生产源码、依赖、锁文件或Git。项目授权和阶段由[执行约定](https://github.com/shushengritian/LifeIndex/blob/cea0d8b53c3686cdefb2b99f824d80e08bda5d8c/docs/project/V4_EXECUTION_BRIEF.md)、[ADR 0002](https://github.com/shushengritian/LifeIndex/blob/cea0d8b53c3686cdefb2b99f824d80e08bda5d8c/docs/adr/0002-v4-autonomous-experience-upgrade.md)、[PLAN](../../../PLAN.md)跟踪；后续产品决策以最新用户要求及正式评审为准。

## 1. 新架构的目标

新版可以像一个完整产品一样有自己的信息节奏：今天决定接下来做什么；记录流程专心完成一次输入；回看聚合已经发生的事实；运行中的专注有明确生命期；设置负责偏好与数据控制。呈现可以采用行动台、时间书页、领域工作台等不同方向，持久层不预设首页只能长成某种卡片堆。

架构分成三类责任：

- **领域事实**：金额、体重、运动、习惯完成、专注会话及其时间。只在IndexedDB持久化，经过领域命令验证。
- **阅读投影**：今天的记录、习惯进度、月收支、健康趋势等，由事实计算；首页不建立独立统计表，不用假数据补齐空态。
- **体验状态**：当前浏览范围、编辑草稿、打开的详情、返回位置、动效与布局。尽可能局部、短期；持久化只在新版任务确有需要时设计。

这种分离支持大胆换布局、换导航或同时呈现两个领域，不需要为每种首页添加一份数据副本，也不会让纯视觉变化进入备份格式。

## 2. 硬约束与可以重新选择的部分

| 硬约束 | 必须落实 |
| --- | --- |
| 本地优先 | IndexedDB为业务主库；不引入后端、账号、云库、分析追踪；不使用localStorage存核心记录 |
| 零新增工具费用 | 不购买素材、字体、API或部署资源；免费依赖也需有明确必要性与体积证据 |
| 新版数据安全 | 读取/预览零破坏；恢复先完全解析验证，用户确认后事务替换；失败保留新版库原数据 |
| 事实准确 | 金额整数最小单位、体重整数克；自然日与实际时间分开；未完成专注不进入完成统计 |
| 交互安全 | 写入防重复；失败保留输入；未保存离开可取消；删除明确确认；忙碌状态不假装完成 |
| 应用外壳缓存 | Service Worker仅缓存版本化静态资产，业务数据仍在IndexedDB；离线入口和应用更新需要实测 |
| 可访问性 | 关键触点至少44×44、输入字号至少16px、清晰名称与焦点、完整键盘路径、减少动态效果 |
| 证据可信 | 测试全合成、上下文隔离；不采集真实记录；浏览器WebKit不冒充物理iPhone验收 |

本次唯一提案采用D「日常调频」、中央记录、独立新版库、扁平分类、真实暂停、详情与编辑分离。以下表/字段/命令/页面API作为R3审查对象，不再把并行选项留给实施者临时决定；独立审核提出具体矛盾时在本轮修订，未签收不写生产代码。

## 3. 新版存储与备份边界

### 库名、schema与实现边界

使用 `LifeIndexV4`、初始Dexie schema逻辑版本1，九张表：categories、transactions、weightEntries、activitySessions、habits、habitChecks、focusSessions、preferences、meta。前八张是备份业务数据；meta是跨上下文一致性控制，不从备份文件接受覆盖。没有外部动作链接，也没有commandReceipts表；实体身份、命令身份、revision与事务负责幂等。

新版不扫描、不读取、不迁移、不删除 `LifeIndexDB` 或其他库。首次建库在初始化事务创建必要分类与偏好，只有meta尚不存在时播种；重开不得把用户删除的默认分类补回来。无个人业务样例。初始化失败保留库并提供重试，不能删库重建。以后本产品自身schema提升需要真实迁移/回滚验证，不涉及3.x兼容。

数据实现归 `src/core/`，提供types、validation、date/money、database、repositories、backup与services；页面继续在 `src/features/`，共享组件在 `src/shared/ui/`，root负责App服务注入。域组件只依赖 `src/core/services.ts` 和公开类型，不直接打开Dexie表。

### 公共规范

- 身份为小写、标准连字符形式的合法UUID v4（版本位4、variant位8/9/a/b），命令、completion token和generation同样遵守；生产新ID使用crypto.randomUUID。`EntityBase`包括id、revision（从1递增的安全整数）、lastCommandId、createdAt/updatedAt（UTC ISO毫秒精度、以Z结尾，createdAt≤updatedAt）。名称trim后保存，备注保留内部换行。
- 业务自然日统一为有效 `YYYY-MM-DD`，年份1000–9999。时间字段统一UTC ISO，不混数字epoch与带不同offset的字符串；比较时解析为epoch。`utcOffsetMinutes`为当地相对UTC的东正偏移，中国为+480，范围−840..+840。只有timePrecision=instant的事实要求localDate与业务instant及捕获offset一致；day精度没有业务instant，不由午夜或createdAt拼造。
- 新录入/修正的instant不能晚于命令捕获的设备当前instant；day精度的localDate不能晚于该命令捕获的设备今天，过去补录允许。备份分别验证instant≤exportedAt，或day localDate≤按记录utcOffsetMinutes换算的exportedAt日期，不用导入设备当前日重划归属。浏览未来日期可为空，不制造计划事实。
- money使用CNY整数分1..9999999999；weight使用整数克1000..1000000；activity durationMinutes为1..1440整数。非法数值、NaN、Infinity、非安全整数与未知字段拒绝。所有汇总使用安全整数加法并检查溢出。
- category name为1..30，habit name为1..40，focus title为1..80；备注最多1000。长度统一按JavaScript字符串UTF-16 code units计算，与HTML maxlength一致；名称先trim，备注不裁剪内容。weightTarget与weightGrams同为1000..1000000整数克。UI与schema共享边界定义，错误保留原输入。

### 表、字段与索引

除特别注明外，业务实体继承EntityBase。以下索引是schema1契约；可追加索引必须在同轮说明与验证，不能靠扫描全部历史替代已设计的范围查询。

| 表 | 数据字段与约束 | 索引 |
| --- | --- | --- |
| categories | scope为expense/income/activity/focus；name、normalizedName、status(active/archived)、sortOrder非负整数、iconKey（共享已声明图标键） | id主键；scope、status、[scope+status]、sortOrder |
| transactions | type expense/income；amountMinor、currency固定CNY、categoryId、timePrecision固定day、localDate、utcOffsetMinutes、可选note | id；localDate、[localDate+createdAt]、categoryId、[localDate+type] |
| weightEntries | weightGrams、timePrecision固定day、localDate、utcOffsetMinutes、可选note | id；localDate、[localDate+createdAt] |
| activitySessions | categoryId、durationMinutes、intensity(light/moderate/hard)、timePrecision固定day、localDate、utcOffsetMinutes、可选note | id；localDate、[localDate+createdAt]、categoryId |
| habits | name、iconKey、scheduleWeekdays（1..7，周一=1，非空/唯一/排序）、status(active/paused)、scheduleEffectiveFrom、可选note | id；status、scheduleEffectiveFrom |
| habitChecks | habitId、localDate、utcOffsetMinutes；严格union：timePrecision=instant时有completedAt，timePrecision=day时禁止completedAt；不额外储存派生统计 | id；唯一[habitId+localDate]、habitId、localDate |
| focusSessions | 第6节严格union、公共字段与completion token；最多一个running/paused（含待保存） | id；status、localDate、startedAt、categoryId；可选字段completionToken唯一 |
| preferences | key主键；value按key严格校验；revision/lastCommandId/updatedAt。key为appearance(system/light/dark)、weightTarget（整数克或null）、lastExportedAt（ISO或null）、localNoticeSeen（boolean） | key |
| meta | 仅key=state；schemaVersion=1、generation(UUID)、revision（全库安全整数，从0起）；仅初始化/命令/恢复服务可改 | key |

平面分类没有parentId。scope内active normalizedName唯一（trim、NFKC、拉丁大小写折叠），由包含categories+meta的事务检查；不同scope可同名。排序影响选择器，不影响引用身份。新建记录不能选归档类；编辑可保留原已归档引用，不可切换到另一归档项。使用中的分类删除动作转为归档，历史继续解析该稳定实体；未使用才可真正删除。允许activate重新启用归档类，同scope的active规范名冲突则拒绝并保持归档，提示先改名；可修改归档项名称后重试，不能默默合并实体/引用。改名会同步显示在引用它的历史中，不把一条“快照旧名”冒充永不变化的分类。

默认分类是必要结构而非演示数据：支出餐饮/交通/购物/居家/健康/娱乐/其他，收入工资/奖金/其他，运动步行/跑步/力量/骑行/其他，专注工作/学习/创作/其他。按上述顺序使用19个固定合法UUID：前缀`30000000-0000-4000-8000-`加从1至19的12位小写十六进制编号（末尾000000000001至000000000013）；不允许`food`或`cat-1`等ID例外。用户可管理名称/图标/顺序。实体IconKey固定为today/health/focus/finance/activity/weight/leaf/book/cup/bag/arrow，分类和习惯共用；动作图标write/play/pause等属于独立UI枚举，不能通过add=write的全局别名改变实体语义。备份中的未知实体键明确拒绝。

### 日期、聚合与习惯事实

`本月`取所显示月份的第一日至下月首日前，不把数据库全表总数配上月标题；`本周`固定周一至下周一前，按本地日键归属。今天摘要只取今天事实。未来事实不能新写，但完整历史需显式呈现导入后相对本机当前日为未来的合法异时区事实，而非删除它。

交易、体重、运动都是日期事实：三类表单只收集localDate，timePrecision固定day，schema禁止occurredAt/measuredAt。createdAt/updatedAt只用于录入与修改审计，不能显示为实际消费、测量或运动时刻。utcOffsetMinutes捕获本次选择日期时的设备时区语义，不宣称是历史发生地的时区；只改数值时保留，修改日期时重新捕获。日期输入跨午夜仍保留已选日，不自动跟随今天。

同日所有体重保留在完整历史与Today轨迹。趋势每天取createdAt最后的一条，相同createdAt按id稳定排序，文案明确“当日最后录入”；编辑不重置createdAt。最近值先按localDate、再按createdAt/id，今天补记过去日期不会冒充最新测量日；少于两个不同日期点不连线。相对本机今天为未来的导入记录不进入“最近体重”，完整历史明确列出，不能静默删除。目标只展示带单位的差值，不给健康好坏评价。

习惯计划是当前计划，不伪造历史缺勤。创建/修改/暂停/恢复从命令当日生效，scheduleEffectiveFrom更新为当日，已存在habitChecks永不因计划改动删除。当天完成事实仍显示于今日轨迹；暂停会从待做列表移除，但不能把今天已发生完成从统计/轨迹擦掉。历史日历只显示真实完成和已知当前状态，不用当前weekdays回推过去“应做”或计算没有计划快照支持的完成率。

历史补记/撤销必须显式动作，允许任意结构有效的过去日期和今天，不限制为创建之后；不得写未来习惯完成。非计划日补记是用户确认的事实，不推导缺勤。命令捕获时仍为今天的完成捕获真实completedAt与timePrecision=instant；所选日已是过去则为day精度，禁止拼造时分。跨午夜不把昨日条目偷偷改成今日完成。撤销后再次完成是新事实；同一完成命令幂等重放不改时间。相同habitId+localDate唯一；完成命令表示desired=true，撤销表示desired=false，不用重试会反转结果的toggle命令。

setCheck与计划操作都携带expectedHabitRevision；实际增加/撤销check时，同事务更新父habit的revision/lastCommandId/updatedAt和meta，不改变scheduleEffectiveFrom。这使撤销后重放旧完成命令报EntityConflict，而非重新造出已撤销事实；同一命令立即重试、或新命令发现desired状态已满足时返回现状且不增revision。检查顺序是generation→同命令结果→revision→desired状态。已删除习惯如需删除历史，必须在确认文案中明确级联范围并在同事务删除habitChecks；普通暂停不删除历史。

### meta、备份预览与恢复隔离

所有业务写事务都包含meta，提交前校验调用方捕获的expectedGeneration；改变业务事实/偏好时全库revision加1，幂等无变化不递增。单实体修改另校验expectedEntityRevision，防止同generation下旧编辑器覆盖另一上下文的更新。读模型携带generation/revision，编辑器在打开时捕获，不能在提交前悄悄刷新generation绕过冲突。

新版备份身份 `format: lifeindex-v4-backup`、`formatVersion: 1`、`schemaVersion: 1`，含appVersion、exportedAt、source(utcOffsetMinutes/locale)、八集合counts与data。不包含meta；恢复不能信任文件自带generation。原始文件上限50MiB、内存预览TTL15分钟、全量替换上述八业务表，不合并；仅接受这个新格式，不要求旧文件兼容。

预览在完整解析/字段/引用/唯一性/计数/时间/专注union验证后生成内存token。随后以一次一致读事务取得目标库generation、revision与被替换数量，展示并绑定token；预览阶段不持锁，也不阻止正常使用。期间任何业务写入使revision改变，确认时token失效，必须重新预览，不能静默覆盖新事实。

确认恢复在包含八业务表+meta的**同一个读写事务**中重读generation/revision并与token绑定值严格比较，再重验已规范化快照。变化则在任何删除之前抛PreviewStale；不变才替换、核对计数、生成全新generation并增加revision。IndexedDB跨上下文对同一meta读写事务的串行化提供互斥；所有repository都必须遵守meta范围，React busy只是当前页面反馈。

并发顺序可证明：先发生业务写→restore看到revision变化并拒绝；restore先提交→排在后的旧命令expectedGeneration失效并拒绝。恢复后旧草稿保留输入供查看/复制，提示“数据已恢复，这份草稿属于恢复前的数据，请重新打开记录”；不能自动换generation并重提。旧预览提示“本机记录已变化，请重新检查备份”，保留原库并回预览入口。设计必须覆盖两种冲突状态。

token只在恢复成功后消费；失败可在TTL内按规则重试，失败事务的所有表及meta回滚。主动取消预览释放token，不能取消已经开始的原子提交；提交中按钮禁用并清楚说明。并发第二次确认通过服务内锁立即拒绝，同时事务检查保证另一个服务/context无法绕过。跨上下文导出在覆盖业务表+meta的一致读事务内取得快照，排在恢复前则拿到完整旧代、排在后则拿到完整新代，绝不混代；无需持久“恢复锁”导致崩溃后永久卡死。

导出不把业务数据写入缓存/日志；分享取消不宣称文件已进入云端。完整验证后得到的snapshot才序列化，文件名不含用户标题。成功实际交付后才更新lastExportedAt；该设置变更也遵守meta revision，因此会使先前恢复预览过期。token/文件正文保存在内存，不进URL。

## 4. 组件、路由与代码包

依赖方向：`页面与流程 → feature controller/view → domain/repository → IndexedDB`。共享UI不访问数据库，repository不依赖React。稳定服务注入不承载输入字符串或每秒计时，使一处输入不引起整应用刷新。

实施按以下责任组织，不保留混合新建/详情/历史的大页面模式组件：

```text
app/                     Shell、路由、服务注入、会话/退出保护
styles/                  设计变量、基础行为、响应布局
shared/ui/               标题、操作、字段、反馈、模态框、确认层
shared/navigation/       浏览会话、受限返回上下文
features/today/          任务入口、当前状态、跨领域记录投影
features/records/        只读记录路由分派（不包办各领域命令）
features/finance/        记账工作台、交易详情/录入、月历、报表
features/health/         健康工作台、体重/运动详情与录入、趋势
features/habits/         计划、详情、完成控件、日历
features/focus/          会话设置、运行控制、详情、历史
features/settings/       偏好、分类、备份恢复、数据说明
```

共同外观通过组合共享，业务由显式组件表达。EditorSheet与DetailsSheet共享模态基础，但不扩展成含 `isDetail/isFinance/isHistory/isEditing` 的万能组件。复杂表单若需共享状态，局部provider按 `state/actions/meta` 暴露；简单表单用props/children，不为抽象而增加全局context。

- `PageHeading/SectionHeading`只负责层级和布局，返回目的地由流程提供。
- `ActionLink`用于导航、`ActionButton`用于当前行为，统一外观但保留语义。
- `Field`负责label、说明和错误关联；领域Fields负责金额、时间、分类等输入与校验转换。
- `Feedback`明确区分loading/empty/error/success，错误有恢复动作。
- `RecordRow`提供布局结构；各领域Row拥有单位、时间和数值语义。R4习惯整行动作面负责desired完成/撤销，独立“详情”只读；两者是相邻兄弟控件，不在button内嵌另一个button。整行含名称，不能继续以“名称一定只读”作为旧约束；状态用文字与整行反馈，不以加号/勾选作为动作。
- `ChartFrame`共享标题、图例、摘要和空态；领域图表保留不同的计算与图形表达，不能以一套默认图表抹平差异。
- 每页与编辑流程是实际独立模块；`lazy()`指向同一个含全部模式的大文件不视为分包。

### R3路由与页面API

采用Hash Router适配静态Pages；以下为新版路由契约，不兼容旧URL。中央记录是模态动作，直接URL负责可刷新/链接回退。

| 任务 | 新版路径 | 责任 |
| --- | --- | --- |
| 今天和领域工作台 | `/today`、`/health`、`/focus`、`/finance` | 各自拥有浏览上下文，导航结构可调整 |
| 直接录入 | `/new/expense`、`/new/weight`、`/new/activity` | 按类型直接进入可编辑界面，不加载完整领域主页 |
| 中央“记录”动作 | `/new`直接访问落点；正常点击为选择模态 | 选择expense/weight/activity后进入同一流程；保留来源会话 |
| 记录详情 | `/records/:kind/:id` | 验证kind/id，只读加载；显式编辑与删除，不把访问URL当写入命令 |
| 历史/报表 | `/health/weight`、`/health/activity`、`/health/habits`、`/focus/history`、`/finance/report` | 显式范围、分组与返回上下文；报表月份不偷换当前浏览日期 |
| 设置/备份 | `/settings`、`/settings/appearance`、`/settings/categories`、`/settings/backup`、`/settings/about` | 显式文字入口；偏好、分类、备份按需加载 |

移动可以将同一路由显示为sheet，桌面显示为侧面详情或居中工作区；这属于呈现选择。直接访问与刷新必须有完整页回退，不能依赖不存在的背景页面。后退/关闭恢复来源、选择、适用滚动和焦点；记录不存在时提供稳定落点。

D方向的录入日期契约：中央全局记录一律在打开时捕获设备当地今天，不继承finance曾选日期；只有明确的“记下这一天”领域动作继承可见所选日，编辑使用记录原业务日。该日期始终可见并可改，保存前跨午夜不偷偷改掉已显示日期。特别测试finance选异日→today/health→中央记录的跨域路径。

浏览状态使用有限内存会话，不向localStorage存业务内容。跨领域返回令牌只存允许的来源/焦点目标/滚动，消费一次；不接受任意外部跳转。草稿内容不放URL，恢复查询不重复抢焦点。保存后渲染可能重建原DOM节点，返回用稳定语义key重新解析触发器；不能仅调用已卸载element引用的focus。异日保存回执可去正确记录，但不默改来源页面的日期/月。页面/模态状态用 `closed/details/create/edit/confirmDelete` 等可辨识联合，不允许多个彼此矛盾的布尔标记。

### 服务与页面公开接口

数据包公开 `createLifeIndexServices({databaseName,clock,idGenerator})` 与LifeIndexServices，持有database、clock、today、transactions、weights、activities、habits、categories、focus、preferences、backup及observe。生产默认databaseName为LifeIndexV4；测试注入专用名称/时钟/ID，生产不暴露fixture开关。

所有读取返回 `Snapshot<T> {data, stamp:{generation,revision}}`；每个领域workspace query在必要表+meta的一致只读事务中读取数据，Dexie liveQuery只订阅实际读取表。写入的CommandContext为 `{commandId, expectedGeneration, expectedRevision}`，编辑/删除另传expectedEntityRevision。expectedRevision是用户意图创建时捕获的全库revision，只在创建实体时作为额外前置条件；普通更新用实体revision，不能因无关记录变化一律拒绝。commandId与该stamp跨重试保持，创建实体id等于commandId。

创建在同事务中先检查generation；同ID实体仍存在且lastCommandId/规范化payload匹配时幂等返回，不因当前全库revision已变而误报失败。ID不存在时要求expectedRevision等于当前meta.revision，否则EntityConflict；重复ID但payload不同也报冲突。这样“create已成功→另一context删除→旧意图重试”不能复活已删除事实。代价是草稿期间有其他写入可能导致首次创建冲突；保留输入并明确提示重新检查/重新打开，不静默换stamp。该规则覆盖三种记录、分类、习惯、focus.start；setCheck由父habit revision保护，不新增回执表。

公开命令：Transaction/Weight/Activity的create/update/remove；Category的create/update/reorder/archive/activate/removeUnused；Habit的create/update/setStatus/setCheck/remove；Focus的start/pause/resume/prepareCompletion/finalizeCompletion/discard/updateDetails/remove；Preferences的set；Backup的inspectFile/cancelPreview/restore/exportSnapshot。reconcile是root运行controller组合读取/两阶段命令的流程，不是另一条绕过两阶段的写入API。UI不调用表put/clear，不拼另一套备份。错误码固定为Validation、NotFound、ReadFailure、WriteFailure、Busy、EntityConflict、GenerationConflict、PreviewStale、PreviewExpired、UnsupportedBackup、ClockChanged；日志只记固定码。

创建入口CreateKind为expense/weight/activity；expense编辑器支持切换income，持久实体kind统一transaction。RecordKind为transaction/weight/activity/focus/habitCheck，详情分派根据kind明确领域。Focus只能由运行命令创建，通用编辑器只编辑completed元信息，不能伪造手工专注时长。

页面经AppServicesContext取得稳定服务，不通过props注入整库。页面通用 `onCreate(kind, {source, defaultDate, datePolicy})`、`onOpenRecord({kind,id}, returnContext)` 由root流程路由器提供。RecordEditor接受 `{mode:'create'|'edit', kind, entityId?, initialSnapshot, commandContext, onSaved, onCancelled}`；领域Fields接受局部 `{values,onChange,errors,disabled}`，不发命令。Details接受Snapshot+onEdit/onDelete/onClose，保持只读。

ReturnContext为 `{sourceRoute, sourceView, selectedDate?, selectedMonth?, filter?, scrollY, focusKey}`，只包含白名单路径和内存浏览状态。root拥有FormSession/GlobalComposer/Confirmation与guard；领域页提供语义focusKey，不传易失DOM对象作为唯一返回凭据。保存返回结果含 `{kind,id,localDate,stamp}`，它用于真实回执与打开详情；页面再次query而不是手工把乐观记录塞进多个数组。

`FocusRuntimeController`由root挂载、调用数据服务，公开只读 `{session,displayElapsedSeconds,displayRemainingSeconds,busy,error,awaitingSave}` 与明确actions；设计页不另建第二个ticker或保存effect。显示两数来自同一clock snapshot。领域页面与全局记录可共用轻量Fields，但不能因导入Fields带入整页/图表。

### 并行实施接口清单

本节是上述职责的具体DTO收口，不增加页面能力。`src/core/types.ts`导出表实体、联合类型与以下DTO，`src/core/validation.ts`导出共享LIMITS/IconKey/解析函数，`src/core/services.ts`导出服务工厂与接口。UI只依赖这三个公开入口。database只暴露open/close生命周期，不把Dexie tables交给页面。每个异步方法返回Promise，失败抛带固定code与可选field键的DomainError；UI按code映射文案，不能展示原始数据库错误。

```ts
type Stamp = { generation: string; revision: number };
type Snapshot<T> = { data: T; stamp: Stamp };
type CommandContext = { commandId: string; expectedGeneration: string; expectedRevision: number };
type EntityRef = { id: string; expectedEntityRevision: number };
type DateSelection = { localDate: string; utcOffsetMinutes: number };
type DateRange = { from: string; toExclusive: string };
type PageQuery = DateRange & { limit?: number; cursor?: string };
type Page<T> = { items: T[]; nextCursor: string | null; totalCount: number };
type TransactionInput = DateSelection & {
  type: 'expense' | 'income'; amountMinor: number; categoryId: string; note?: string;
};
type WeightInput = DateSelection & { weightGrams: number; note?: string };
type ActivityInput = DateSelection & {
  categoryId: string; durationMinutes: number;
  intensity: 'light' | 'moderate' | 'hard'; note?: string;
};
type CategoryInput = { scope: CategoryScope; name: string; iconKey: IconKey };
type HabitInput = { name: string; iconKey: IconKey; scheduleWeekdays: number[]; note?: string };
type FocusDetailsInput = { title: string; categoryId?: string; note?: string };
type CompletionAttempt = EntityRef & { token: string; requestedAt: string };
```

string日期/UUID在运行时严格验证，不靠TypeScript别名保证有效。create的实体id取ctx.commandId，UI不提交revision/createdAt/updatedAt/timePrecision/currency；服务写出固定字段。update提交完整可编辑值，不是任意Partial<Entity>，未提供note表示清空。update保留createdAt；未改localDate须保留原offset，改日期使用当前DateSelection。核心导出`captureDateSelection(clockSnapshot,localDate?)`在打开或实际改变日期时捕获本机offset；Repository再次验证day≤命令时今天。金额输入最多2位小数、体重公斤输入最多3位小数，用十进制字符串解析到整数，超精度拒绝而非四舍五入；解析结果/字段错误共享，UI不各自用parseFloat×100。

通用记录接口对transactions/weights/activities同形：`create(input,ctx)→Snapshot<Entity>`；`getById(id)→Snapshot<Entity|null>`；`update(ref,input,ctx)→Snapshot<Entity>`；`remove(ref,ctx)→Snapshot<{id,removed}>`；`list(query)→Snapshot<Page<Entity>>`。remove对已不存在的同ID返回removed=false，不产生额外写入；存在时必须检查revision。数据命令结果是实际持久实体，root由它提取之前约定的保存回执。没有任意表名CRUD或任意字段patch。

| 服务/方法 | 具体输入与输出 |
| --- | --- |
| today.getHabits(date) | Snapshot<{date,items:[{habit,check或null,scheduled}],scheduledCount,scheduledCompletedCount,pendingCount,completedCount}>；items为当天应做与当天已完成的并集，scheduledCompletedCount只计scheduled与check的交集；completedCount含非计划日事实，不伪装成当前计划完成率 |
| today.getFinance(date) | Snapshot<{date,incomeMinor,expenseMinor,netMinor,transactionCount}>；日期范围查询，空库明确0，读取失败抛错 |
| today.getRecords(date,{limit}) | Snapshot<{date,timed:RecordView[],dayOnly:RecordView[],recent:RecordView[],totalCount,hasMore}>；timed/dayOnly按第5节各自排序，recent为录入顺序；totalCount不受limit影响 |
| transactions.getMonth(month) | month为YYYY-MM；Snapshot<{month,range,incomeMinor,expenseMinor,netMinor,days:[{date,incomeMinor,expenseMinor,count}],categories:[{category,type,amountMinor,count}]}>；所有月份视图复用同一范围规则，明细使用list(range) |
| weights.getTrend(range) | Snapshot<{points:[{localDate,entry}],latest:WeightEntry或null,targetGrams:number或null}>；points每天最后录入且升序，latest为整个库截至设备今天的最近日期记录 |
| activities.getSummary(range) | Snapshot<{range,count,totalMinutes,byIntensity}>；不混专注数据；明细使用list(range) |
| habits.list()/getById(id) | Snapshot<Habit[]>/Snapshot<Habit或null>；list包含暂停计划；习惯日历getChecks(habitId,range)返回Snapshot<HabitCheck[]>，getCheckById(id)返回Snapshot<HabitCheck或null> |
| habits.create/update/setStatus | create(input,ctx)、update(ref,input,ctx)、setStatus(ref,'active'或'paused',ctx)均返回Snapshot<Habit>；新建为active，status改变不重写历史checks |
| habits.setCheck/remove | setCheck({habitId,expectedHabitRevision,date,desired},ctx)→Snapshot<{habit,check:HabitCheck或null}>；remove(ref,{deleteChecks:true},ctx)→Snapshot<{id,removed,deletedChecksCount}>，UI先明确级联确认 |
| categories.list/create/update | list({scope?,includeArchived})→Snapshot<Category[]>；create(input,ctx)/update(ref,input,ctx)→Snapshot<Category>；已有scope不可改，update只接受相同scope |
| categories.reorder/archive/activate/removeUnused | reorder(scope,[EntityRef],ctx)→Snapshot<Category[]>，列表须包含该scope全部active实体且不重复；archive(ref,ctx)/activate(ref,ctx)→Snapshot<Category>，activate重新检查active规范名唯一；removeUnused(ref,ctx)→Snapshot<{id,removed}>，引用存在则Validation供UI改走归档确认 |
| focus.getCurrent/getById/list/getSummary | current返回Snapshot<未结束会话或null>；getById返回Snapshot<FocusSession或null>；list(range)只列completed；summary(range)返回Snapshot<{count,totalDurationMs}>，按开始日归属 |
| focus.start/pause/resume | start({targetDurationMs,title?,categoryId?},ctx)、pause(ref,ctx)、resume(ref,ctx)→Snapshot<FocusSession>；start缺省title为自由专注，重复启动返回Busy，不偷偷替换现有会话；pause恰到期时返回已持久pending，由controller继续finalize |
| focus.prepareCompletion/finalizeCompletion | prepareCompletion(attempt,ctx)→Snapshot<待保存或已completed会话>；finalizeCompletion({id,token},ctx)→Snapshot<completed会话>；token保留但不记录日志 |
| focus.discard/updateDetails/remove | discard(ref,ctx)只删除未结束；remove(ref,ctx)只删除completed，两者返回Snapshot<{id,removed}>；updateDetails(ref,details,ctx)→Snapshot<completed会话>，仅元信息可编 |
| preferences.getAll/set | getAll()→Snapshot<{values:PreferenceValues,revisions:各key的revision}>；set({key,value,expectedEntityRevision},ctx)→Snapshot<Preference>；不允许未知key、禁止把业务草稿放这里 |
| backup.inspectFile/cancelPreview | inspectFile(file:Blob)→BackupPreview，含token/expiresAt/sourceCounts/targetCounts/targetStamp/sourceFocus/targetFocus；取消同步释放对应token，不写库 |
| backup.restore/exportSnapshot | restore(token)→Snapshot<{counts}>；exportSnapshot()→{blob,filename,exportedAt,stamp,counts}，从一致读快照导出；调用方交付文件成功后另用preferences.set更新lastExportedAt |

Today计划仅解释设备今天：scheduled由active、scheduleEffectiveFrom和weekday共同决定，scheduledCompletedCount/scheduledCount是计划进度，分母为0时显示无计划而非0/0。pendingCount=scheduledCount−scheduledCompletedCount；completedCount始终为该日全部真实checks。items以habit.createdAt/id升序稳定排列，完成不挪动行。请求过去日时只返回实际checks，所有计划相关计数为0，UI不展示计划完成率或回推缺勤。

RecordView是按kind可辨识的`{kind,entity,category?或habit?}`联合：交易/运动附被引用分类，专注附可选分类，habitCheck附习惯；不把金额/重量/时长混成无单位value。query在单个只读事务中解析引用，UI不为每行单独请求分类。分页默认50、最大100；游标是不透明的localDate/createdAt/id与generation组合，排序为日倒序、createdAt倒序、id字典倒序，跨generation游标报GenerationConflict。Today默认limit20分别限制两个分组，recent最多3；完整数量仍读取真实范围。历史/报表页可通过分页取全，不能把限额当事实总量。

`services.observe(query,{next,error})→unsubscribe`封装Dexie liveQuery；query为上述Promise<Snapshot<T>>查询函数。首次成功前为loading，error不转为[]/0；重新订阅重试，卸载调用unsubscribe。五个首屏区域分别订阅自己的query，不能用一个大Promise失败抹掉全部数据。FocusRuntimeController的reconcile先getCurrent，若到期或已有pending则调用两阶段命令；共享纯函数`createCompletionAttempt(session,clockSnapshot,token)`捕获requestedAt，首次prepare失败后保留整个attempt重试，服务重新校验revision、requestedAt≤当前时刻与合法终点。controller使用同一注入clock，不自己拼终点或逐秒写库。

以下是供root/领域页面直接依赖的公开签名。表实体名称固定为Category、Transaction、WeightEntry、ActivitySession、Habit、HabitCheck、FocusSession；字段由第3/6节定义，运行状态细分导出RunningFocusSession、PausedFocusSession、CompletedFocusSession。文档中的类型签名在第一批core交付时成为真实types/services，后续如发现必须变更，先同步调用方而非各自保留同名异形DTO。

```ts
type CategoryScope = 'expense' | 'income' | 'activity' | 'focus';
type IconKey = 'today' | 'health' | 'focus' | 'finance' | 'activity' | 'weight'
  | 'leaf' | 'book' | 'cup' | 'bag' | 'arrow';
type PreferenceValues = {
  appearance: 'system' | 'light' | 'dark';
  weightTarget: number | null;
  lastExportedAt: string | null;
  localNoticeSeen: boolean;
};
type PreferenceKey = keyof PreferenceValues;
type DomainErrorCode = 'Validation' | 'NotFound' | 'ReadFailure' | 'WriteFailure'
  | 'Busy' | 'EntityConflict' | 'GenerationConflict' | 'PreviewStale'
  | 'PreviewExpired' | 'UnsupportedBackup' | 'ClockChanged';
type DomainError = Error & { code: DomainErrorCode; field?: string };
type Preference<K extends PreferenceKey = PreferenceKey> = {
  key: K; value: PreferenceValues[K]; revision: number;
  lastCommandId: string; updatedAt: string;
};
type PreferencesSnapshot = {
  values: PreferenceValues; revisions: Record<PreferenceKey, number>;
};
type Mutation<T> = Promise<Snapshot<T>>;
type Removal = { id: string; removed: boolean };
type RecordView =
  | { kind: 'transaction'; entity: Transaction; category: Category }
  | { kind: 'weight'; entity: WeightEntry }
  | { kind: 'activity'; entity: ActivitySession; category: Category }
  | { kind: 'focus'; entity: CompletedFocusSession; category?: Category }
  | { kind: 'habitCheck'; entity: HabitCheck; habit: Habit };
type TodayHabits = {
  date: string; items: { habit: Habit; check: HabitCheck | null; scheduled: boolean }[];
  scheduledCount: number; scheduledCompletedCount: number; pendingCount: number; completedCount: number;
};
type FinanceTotals = { incomeMinor: number; expenseMinor: number; netMinor: number };
type TodayFinance = FinanceTotals & { date: string; transactionCount: number };
type TodayRecords = {
  date: string; timed: RecordView[]; dayOnly: RecordView[]; recent: RecordView[];
  totalCount: number; hasMore: boolean;
};
type MonthSummary = FinanceTotals & {
  month: string; range: DateRange;
  days: (FinanceTotals & { date: string; count: number })[];
  categories: { category: Category; type: 'expense' | 'income'; amountMinor: number; count: number }[];
};
type WeightTrend = {
  points: { localDate: string; entry: WeightEntry }[];
  latest: WeightEntry | null; targetGrams: number | null;
};
type ActivitySummary = {
  range: DateRange; count: number; totalMinutes: number;
  byIntensity: Record<'light' | 'moderate' | 'hard', { count: number; totalMinutes: number }>;
};
type BackupTable = 'categories' | 'transactions' | 'weightEntries' | 'activitySessions'
  | 'habits' | 'habitChecks' | 'focusSessions' | 'preferences';
type BackupCounts = Record<BackupTable, number>;
type BackupFocusSummary = {
  running: number; paused: number; awaitingSave: number; completed: number;
};
type BackupPreview = {
  token: string; expiresAt: string; exportedAt: string; appVersion: string;
  sourceCounts: BackupCounts; targetCounts: BackupCounts; targetStamp: Stamp;
  sourceFocus: BackupFocusSummary; targetFocus: BackupFocusSummary;
};
type BackupExport = {
  blob: Blob; filename: string; exportedAt: string; stamp: Stamp; counts: BackupCounts;
};
type ClockSnapshot = { nowMs: number; utcOffsetMinutes: number };
type LifeIndexClock = {
  now(): number; utcOffsetMinutes(epochMs: number): number; monotonicNow(): number;
};
type FocusDisplay = {
  elapsedMs: number; displayElapsedSeconds: number; displayRemainingSeconds: number;
  expired: boolean; clockChanged: boolean;
};
interface RecordService<E, I> {
  create(input: I, ctx: CommandContext): Mutation<E>;
  getById(id: string): Mutation<E | null>;
  update(ref: EntityRef, input: I, ctx: CommandContext): Mutation<E>;
  remove(ref: EntityRef, ctx: CommandContext): Mutation<Removal>;
  list(query: PageQuery): Mutation<Page<E>>;
}
interface LifeIndexServices {
  database: { open(): Promise<void>; close(): void };
  clock: { capture(): ClockSnapshot };
  observe<T>(query: () => Mutation<T>, observer: {
    next(value: Snapshot<T>): void; error(error: DomainError): void;
  }): () => void;
  today: {
    getHabits(date: string): Mutation<TodayHabits>;
    getFinance(date: string): Mutation<TodayFinance>;
    getRecords(date: string, options?: { limit?: number }): Mutation<TodayRecords>;
  };
  transactions: RecordService<Transaction, TransactionInput> & {
    getMonth(month: string): Mutation<MonthSummary>;
  };
  weights: RecordService<WeightEntry, WeightInput> & {
    getTrend(range: DateRange): Mutation<WeightTrend>;
  };
  activities: RecordService<ActivitySession, ActivityInput> & {
    getSummary(range: DateRange): Mutation<ActivitySummary>;
  };
  habits: {
    list(): Mutation<Habit[]>;
    getById(id: string): Mutation<Habit | null>;
    getChecks(habitId: string, range: DateRange): Mutation<HabitCheck[]>;
    getCheckById(id: string): Mutation<HabitCheck | null>;
    create(input: HabitInput, ctx: CommandContext): Mutation<Habit>;
    update(ref: EntityRef, input: HabitInput, ctx: CommandContext): Mutation<Habit>;
    setStatus(ref: EntityRef, status: 'active' | 'paused', ctx: CommandContext): Mutation<Habit>;
    setCheck(input: { habitId: string; expectedHabitRevision: number; date: string; desired: boolean },
      ctx: CommandContext): Mutation<{ habit: Habit; check: HabitCheck | null }>;
    remove(ref: EntityRef, options: { deleteChecks: true }, ctx: CommandContext): Mutation<Removal & { deletedChecksCount: number }>;
  };
  categories: {
    list(options: { scope?: CategoryScope; includeArchived: boolean }): Mutation<Category[]>;
    create(input: CategoryInput, ctx: CommandContext): Mutation<Category>;
    update(ref: EntityRef, input: CategoryInput, ctx: CommandContext): Mutation<Category>;
    reorder(scope: CategoryScope, refs: EntityRef[], ctx: CommandContext): Mutation<Category[]>;
    archive(ref: EntityRef, ctx: CommandContext): Mutation<Category>;
    activate(ref: EntityRef, ctx: CommandContext): Mutation<Category>;
    removeUnused(ref: EntityRef, ctx: CommandContext): Mutation<Removal>;
  };
  focus: {
    getCurrent(): Mutation<RunningFocusSession | PausedFocusSession | null>;
    getById(id: string): Mutation<FocusSession | null>;
    list(query: PageQuery): Mutation<Page<CompletedFocusSession>>;
    getSummary(range: DateRange): Mutation<{ count: number; totalDurationMs: number }>;
    start(input: { targetDurationMs: number; title?: string; categoryId?: string }, ctx: CommandContext): Mutation<FocusSession>;
    pause(ref: EntityRef, ctx: CommandContext): Mutation<FocusSession>;
    resume(ref: EntityRef, ctx: CommandContext): Mutation<FocusSession>;
    prepareCompletion(attempt: CompletionAttempt, ctx: CommandContext): Mutation<PausedFocusSession | CompletedFocusSession>;
    finalizeCompletion(input: { id: string; token: string }, ctx: CommandContext): Mutation<CompletedFocusSession>;
    discard(ref: EntityRef, ctx: CommandContext): Mutation<Removal>;
    updateDetails(ref: EntityRef, input: FocusDetailsInput, ctx: CommandContext): Mutation<CompletedFocusSession>;
    remove(ref: EntityRef, ctx: CommandContext): Mutation<Removal>;
  };
  preferences: {
    getAll(): Mutation<PreferencesSnapshot>;
    set<K extends PreferenceKey>(input: { key: K; value: PreferenceValues[K]; expectedEntityRevision: number },
      ctx: CommandContext): Mutation<Preference<K>>;
  };
  backup: {
    inspectFile(file: Blob): Promise<BackupPreview>;
    cancelPreview(token: string): void;
    restore(token: string): Mutation<{ counts: BackupCounts }>;
    exportSnapshot(): Promise<BackupExport>;
  };
}
declare function createLifeIndexServices(options?: {
  databaseName?: string; clock?: LifeIndexClock; idGenerator?: () => string;
}): LifeIndexServices;
declare function deriveFocusDisplay(session: FocusSession | null,
  clock: ClockSnapshot, previousWallMs?: number): FocusDisplay;
declare function createCompletionAttempt(session: RunningFocusSession | PausedFocusSession,
  clock: ClockSnapshot, token: string): CompletionAttempt;
declare function captureDateSelection(clock: ClockSnapshot, localDate?: string): DateSelection;
```

上面工厂/纯函数由services入口导出；deriveFocusDisplay(null)返回零值/false，由controller负责在ClockChanged时保留上一可见快照。BackupFocusSummary的paused只计普通paused，awaitingSave单列，四项互不重叠；source/target总未结束数为前三项之和。TTL用注入clock.monotonicNow校验已过时长，expiresAt仅用于展示，系统时钟倒跳不能延长15分钟有效期。偏好初始化四个key均存在，revision=1，初值system/null/null/false；导入缺失key拒绝，避免页面自行补默认后掩盖无效文件。

### 首屏原则

新版六项核心任务由最终设计维护，架构保证高频录入至可编辑界面不超过两次点按；可见习惯上一触完成；查看不会触发业务命令。390×664、六习惯等代表布局仅作为新版压力样本，不作为历史竞赛。

D「日常调频」采用今日概览/今日轨迹、鲜明领域工作区和固定中央记录。要求是：可变内容不挤走关键录入，不出现假播放按钮，视图失败不能显示0。320px与200%文字允许自然增高，但触点不缩小、关键操作不遮挡、不意外横滚。

## 5. 查询、命令和编辑状态

每个领域独立读取与失败；一个领域内部无依赖的读取并行。汇总与明细复用同一份查询结果，不为每个数字创建重复订阅。Today只读所需时间范围，完整历史由历史流程负责；显示前N条与统计全部数据必须分开，不能拿截断列表当总数。

今日轨迹包含五类真实事实（交易、体重、运动、习惯完成、已完成专注）。带时刻的习惯和专注按completedAt/startedAt升序，专注仍按开始日归属；同instant用类型/ID字典升序稳定排序。仅日期的记录单独显示“当日记录 · 未记录具体时刻”，按createdAt/id升序列出录入顺序，不插入伪造的午夜/当前分钟。分组限额各保留最新N项再按上述顺序呈现。首页“刚刚留下的”按createdAt/id倒序，只表达录入顺序，副文案对day精度仅显示日期。完整历史先按localDate倒序再按领域内确定顺序；只展示真实可知的时间精度。

`loading`不是空结果，`failed`不是0。保留上一次数据时明示尚未更新；一个区域失败不阻断其他成功区域。查询状态和占位布局不得反复卸载已输入表单。

编辑流程：`editing → validating → saving → saved`；校验/保存失败回可编辑状态并保留输入。依赖数据在打开时建立快照，保存时repository再验引用，防止分类/记录在编辑中变化。同步ref锁防止同一渲染周期多次提交，事务约束负责跨页面/上下文不变量；disabled只是反馈，不能代替防重。

脏表单关闭进入放弃确认，取消回同一草稿；保存中不允许抛弃正在写入的状态。保存成功后解除guard、卸载草稿，再导航和显示回执，避免路由保护竞态。成功文案只由真实命令完成触发，不以路由state伪装写入成功。删除失败保留详情与原数据，成功后还原有效焦点。

动作日志记录进入、关键分支、状态跳变、成功与失败，不记录每次输入或计时tick。事件和上下文是固定枚举，只允许operation/entityType/fromState/toState/reason/failureClass/count等；不含金额、体重、标题、备注、选中日期、记录ID、文件内容或原始error.message。注释解释锁、快照、事务、guard和返回责任，不逐行翻译代码。

## 6. R3专注状态、时间与原子性提案

总协调与设计方已确定新版采用真实暂停：**running / paused / completed持久状态**；暂停不计时间，收起只导航并保持当前状态。idle表示不存在未结束会话，awaiting-save是待完成意图的UI投影，不等于已保存记录。默认25分钟，预设15/25/45分钟；默认名称“自由专注”，开始不要求先填写标题，完成后可编辑名称/备注。范围与具体交互仍须独立审核后实施。

### 持久字段与状态不变量

FocusSession继承完整EntityBase（含lastCommandId），公共业务字段为title、可选categoryId/note、timePrecision固定instant、startedAt、localDate、utcOffsetMinutes、targetDurationMs。localDate只要求与startedAt和捕获offset一致，不要求跨日endedAt仍为该日。目标按完整分钟输入，首版15/25/45预设；schema允许整数1–1440分钟以容纳将来明确的自定义入口，但本次不因此承诺自定义UI。所有毫秒整数有安全整数/范围校验。

| 持久状态 | 必需字段/约束 | 不得出现 |
| --- | --- | --- |
| running | accumulatedMs为此前已结算运行段总和；segmentStartedAt为本段起点；0≤accumulatedMs<targetDurationMs | pausedAt、durationMs、endedAt、pendingCompletion |
| paused（普通） | accumulatedMs固定；pausedAt；0≤accumulatedMs<targetDurationMs | segmentStartedAt、durationMs、endedAt |
| paused（待保存投影） | accumulatedMs固定；pausedAt；pendingCompletion含token、kind(timer/early)、durationMs、endedAt | segmentStartedAt；普通resume入口 |
| completed | durationMs、endedAt、completionKind、completionToken；0<durationMs≤targetDurationMs | accumulatedMs、segmentStartedAt、pausedAt、pendingCompletion |

在最终schema里用严格可辨识联合校验字段，不把旧status字符串凑入新模型。paused待保存允许accumulatedMs等于目标；其pendingCompletion.durationMs必须等于accumulatedMs。timer完成恰好等于目标，early完成小于目标；所有会话同时最多一条running或paused（含待保存）；completed.durationMs至少1000ms，提前结束未满1秒明确拒绝且保持原状态。毫秒累计避免多次不足一秒的暂停段被每次取整丢失；UI先取同一快照的elapsedMs，令displayElapsedSeconds=floor(elapsedMs/1000)，displayRemainingSeconds=targetDurationMs/1000−displayElapsedSeconds；不能对remainingMs再独立floor。两数之和恒等目标整秒，总计先累加整数毫秒再格式化。

状态时间还须满足startedAt≤各转移时刻≤updatedAt，startedAt=createdAt；普通paused的accumulatedMs不超过pausedAt−startedAt，running已结算累计不超过segmentStartedAt−startedAt。pending的pausedAt=固定endedAt，pending/completed的durationMs至少1000且不超过endedAt−startedAt；最终completed不再保留accumulatedMs。审计updatedAt是实际提交命令时刻，可晚于自然到期endedAt，不能据此把自然结束时刻改成恢复时刻。

### 时间计算与跨日

运行段有效时间为 `min(remainingTargetMs, max(0, nowMs - segmentStartedAtMs))`；已用=accumulatedMs+本段有效时间，剩余=targetDurationMs-已用。暂停时不再读墙钟差来增长accumulatedMs。自然到期的endedAt是本段起点加剩余目标，不是应用从后台恢复的时刻；因此晚返回不增长额外时长。

会话归属日明确采用**startedAt捕获时的localDate**。跨日暂停/继续不拆分会话、不迁移归属；今日/本周已保存专注按该归属日筛选，详情同时显示完整开始/结束日期。只统计completed；running、paused和awaiting-save均不进入已保存次数/时长。开始发生在昨日、今日完成的会话在今日运行区可见，但属于昨日完成事实汇总；相应文案必须说明开始日，不能让用户猜测。

设备墙钟是离线恢复的时间依据，performance.now仅用于前台平滑显示/异常诊断，不序列化进备份。发生可检测倒跳（相邻wall样本倒退或now早于段起点/已提交转移时间）时，冻结当前显示并呈现“设备时间发生变化，请校正后重试”；拒绝会产生负时长或逆序时间的pause/resume/finish/reconcile，保留原记录，不私自把异常写成0秒完成。校正后重新按持久起点计算。正常长时间后台/关闭后，正向墙钟差计入running并封顶目标；paused始终不累计。

没有外部可信时钟时，应用无法区分关闭期间的真实经过时间与设备向前改时；以设备时间到达目标即自然完成、最多计目标时长，是明确的产品取舍，不承诺精确测量被改动的物理时间。前台检测到不连续变化要显示说明；前后端不存在隐形校时服务。所有命令使用同一时间策略，不能显示用一套、写库用另一套。

### 命令与事务边界

| 命令 | 原子责任 | 重入/失败规则 |
| --- | --- | --- |
| start | 在focusSessions+categories+meta读写事务内查询未结束会话、验证分类、创建running | 同命令重试返回自身会话；不同意图已有未结束则Busy，陈旧创建stamp则EntityConflict，不再建一条 |
| pause | 校验revision与running；先判断是否已到期，未到期才结算本段并写paused | 双击不重复加时；到期优先进入完成流程；失败保持原持久running并显示失败 |
| resume | 校验普通paused，设置新的segmentStartedAt、清除pausedAt并增revision | pendingCompletion禁止resume；重复命令返回当前结果，不重新设置段起点 |
| prepareCompletion | 同事务取得确定终点/时长、结算为paused并持久pendingCompletion；到期归timer，否则early | 意图一旦提交便停止累计；现有意图优先返回，不覆盖终点；写失败保留原会话和本地完成输入 |
| finalizeCompletion | 同事务校验pending token、改同一行completed、写duration/endedAt/completionToken、清除意图 | 失败保留durable awaiting-save；重复同token返回同一completed，不能生成第二条 |
| discard | 明确确认后删除未结束会话/待保存意图 | 失败保留会话；取消确认不改状态；与完成竞争按revision重新读取 |
| edit completed | 仅修改允许的标题/分类/备注，不重算计时事实 | 失败保留输入；编辑不能绕成重新创建完成会话 |
| remove completed | 明确删除确认后校验revision，只删除completed同一行 | 失败保留记录；已不存在为无变化；不能调用discard删除完成历史 |

两阶段完成是有意的责任划分：第一事务持久“已停止但待保存”，第二事务将它发布为已完成事实。它不是部分恢复或假成功；首阶段后UI只能显示awaiting-save，不能显示已完成或更新汇总。自然到期/提前结束共用这条路径，跨标签页通过读写事务和revision/token约束串行化，不仅靠组件busy。手动“结束”弹出确认时running继续累计；在用户确认保存那一刻捕获结束意图，取消确认不改变状态。若等待确认期间自然到期，以timer完成优先并刷新确认层，不能再重复保存early。

若连prepare写入都失败，本地完成尝试保留固定token/终点/时长并停止该UI累计，重试使用同一意图，页面内导航不丢失；此时必须明确尚未持久化，并启用未保存退出保护。强制关闭后不能承诺未写入的数据已保存；原会话仍在。若prepare成功而finalize失败，刷新/重开可从pendingCompletion恢复固定结果，绝不能恢复成继续计时。自动重试每个controller生命周期最多一次；失败后只接受明确重试，不每秒循环。

任何冲突先重新读取当前状态：另一上下文已完成则返回事实并更新UI；已discard则报告不存在；已提交不同状态revision不得用陈旧时长覆盖它。完成意图token保留在completed用于幂等，但永不记录日志/URL。各命令入口、分支、成功/失败有隐私安全状态日志。

一个app级FocusRuntimeController负责活动查询、ticker、visibility恢复和完成流程，因为D的状态需要在导航后继续存在。组件只消费读模型；每秒tick不触发全应用服务context或逐秒写库。pause/resume重渲染后焦点回同一个语义控制位（按钮名称变为继续/暂停），不能掉回body。运行恢复与用户详情读取分别测试；打开详情不发start/pause/resume/finish命令。

### 专注备份校验与恢复

新备份必须校验上述union、非负安全整数、目标/累计关系、终点合法、类别引用、唯一未结束会话和pending/completed token约束。completed不能伪带running字段；pending.timer时长必须等于目标。导出包含paused及待保存意图；导出本身不自动完成或暂停会话。

恢复对普通paused保留暂停，对pending恢复awaiting-save并沿同token重试；running按备份保存的段起点与设备当前时间恢复，离开备份时刻之后的墙钟差计入至目标封顶，不把导入时刻当新的起点。预览分别列出备份源和当前目标库的未结束会话数/状态，明确提示运行会话可能已到期、暂停会话保持暂停。目标存在未结束会话时，替换确认直说将替换当前会话，提供取消回到专注的路径，不强制用户先保存或放弃；“仅已保存”是统计口径，不表示从备份遗漏持久会话。确认之前不推进导入数据的计时写入，目标本身的正常生命周期若变化会使revision失效并要求重预览。导入事务原子完成之后才启动运行controller，避免它与替换事务竞态。

专注每个写事务也包含meta并校验generation/revision；恢复事务前controller不可推进写入，恢复后旧代完成意图拒绝。上述提案需独立审核时钟异常、两阶段失败、跨日文案和恢复预览；[测试策略](https://github.com/shushengritian/LifeIndex/blob/cea0d8b53c3686cdefb2b99f824d80e08bda5d8c/docs/testing/v4/TEST_STRATEGY.md)给出可执行断言，未签收前不进入生产实现。

## 7. 设计系统、样式边界与加载

由最终方向建立唯一设计变量源：语义颜色、字体层级、间距、圆角、阴影、触点、内容宽度、层级和动效。深浅主题覆盖相同语义变量；领域色提供辅助区分，不成为唯一状态信息。可使用原创CSS/SVG纹理或鲜明排版，但不能让装饰推迟输入、降低对比度或填入假信息。

| 样式层 | 内容 |
| --- | --- |
| tokens | 唯一深浅主题与设计变量；不沿用不适合新版的旧色名 |
| base | reset、字体、focus-visible、输入基础、文本选择、减少动态效果 |
| shell | 安全区、底栏/侧栏、页面宽度、全局反馈 |
| shared UI | 字段、按钮、Sheet、确认、行与标题的组件邻近CSS Modules |
| feature | 领域专属布局、图表、日历与计时器，不跨领域依赖内部DOM |

Vite已有CSS Modules支持，优先使用现有构建能力。首入口只导入必要基础/外壳；领域样式随代码加载。现有global.css有3526行历史规则，**不把它当新版样式基础继续叠补丁**。在独立新版界面建立明确层次，替换完成后移除无用旧规则。确需短期并存时，全部旧规则进入低优先级legacy layer，不能让未分层旧样式意外胜出；交付不留两套设计系统。

删除旧样式前检查动态class、图标映射与响应分支，不能仅凭rg无字面命中判断。safe-area、100dvh、键盘、16px输入、44px触点、可见焦点、滚动/文本选择都由新版重新验证，不靠“以前支持”推断通过。

路由、编辑器、历史、重图表、分类与备份分别按需加载。Today不静态导入其他完整页面；领域Fields和commands可共享。只用类型的导入标为import type，避免barrel把整片模块带入入口。系统字体、原生SVG和CSS足以先完成设计，不默认增加外部字体或大UI/图表/动画库。

空闲预取是否采用由绝对性能测量决定；测试和生产使用相同策略，不能将预取工作移出计时制造结果。SW须预缓存新版所有离线入口依赖的惰性chunk；拆包减少首屏执行，不等于可以舍弃离线可达性。

## 8. 新版绝对性能提案与测量契约

历史3.3测量归档，不作为新版比较门槛。R3提交的唯一门槛为FCP400ms、ready1400ms、三类editor各350ms、chooser350ms、JS250KiB/CSS16KiB，配合[测试策略](https://github.com/shushengritian/LifeIndex/blob/cea0d8b53c3686cdefb2b99f824d80e08bda5d8c/docs/testing/v4/TEST_STRATEGY.md)的42样本协议；由独立审核签收后冻结。冻结后不得因结果失败放宽数字或重定义指标。

| 新版指标 | 绝对上限提案 | 观测条件 |
| --- | --- | --- |
| 七样本FCP中位数 | 400ms | 浏览器paint entry；只证明首个内容出现，不能单独代表应用可用 |
| 七样本首页首屏可用中位数 | 1400ms | navigation start到快捷入口可操作，首屏摘要/习惯/活动专注区域完成真实读取且稳定呈现；失败不算有效就绪 |
| 七样本首次编辑器可输入中位数 | 350ms | 实际pointerdown/键盘激活到编辑器可见、主字段enabled且可编辑、焦点交付及下一帧呈现；包含代码与依赖读取 |
| 全量生产JS gzip | 256000B（250KiB） | 所有JS chunk逐文件Node gzip求和；不得改变目录或分母隐藏代码 |
| 全量生产CSS gzip | 16384B（16KiB） | 所有生产CSS求和，避免新旧系统长期叠加 |

完整42样本协议及资源统计见[测试策略](https://github.com/shushengritian/LifeIndex/blob/cea0d8b53c3686cdefb2b99f824d80e08bda5d8c/docs/testing/v4/TEST_STRATEGY.md#6-新版性能协议)。中央选择层另提案350ms，避免在第一步隐藏加载。

D的criticalReadyRegions固定为五个：shell（含theme解析、导航/设置/中央记录与视图模式）、today-habits、today-finance、focus-runtime、today-records。每个区域有data-state=ready且实际读取/初始化完成，不以标记自报代替断言；today-records在窄屏可能位于折叠线下，但仍纳入同一协议，不能移动布局逃避计时。仅完整历史/完整轨迹后续页与未打开编辑器可延迟；它们另受首次交互预算。ready标记从真实查询/控件条件派生，不加测试专用延时或把不可操作按钮提前标ready。三种录入分别测量；全部采用350ms可输入门槛，数据集、初始状态和预取条件按TEST_STRATEGY执行。

固定生产构建、机器/浏览器版本、iPhone13 viewport、Chromium CPU4×、localhost无网络降速、单worker、七次新context、SW blocked、reduced-motion；空库与代表数据分别报告，不能混算。正常动效、WebKit、离线热启动另列专项。F3长历史加七样本，ready中位数≤2000ms、首次支出editor中位数≤350ms；资源观察不另设字体/图像体积硬上限，但其真实首屏/交互影响必须包含在同样计时中，记录许可、请求与预缓存总量。保存全部原始样本、范围与中位数，不择优重试；记录提交、机器、电源/负载状态、浏览器、时区和实际服务dist。

已审查历史采集代码，有四项必须避免带入新版的偏差：

1. 旧ready只等记账空态并包含Playwright轮询/协议开销，未证明所有首屏区域；新版取真实状态标记。
2. 旧editor只等dialog可见及下一帧，没有实际验输入焦点；新版要测“可输入”而非“出现一个壳”。
3. 新context不排除宿主文件缓存/温度；CPU4×不是真iPhone、localhost不是公网、Chromium不是WebKit。报告不得外推。
4. 旧gzip脚本仅遍历dist/assets，可能遗漏目录外SW；新版完整统计生产JS/CSS，并另报入口链和预缓存总量。reuseExistingServer须确认服务的是待测构建。

旧204/1067.10/254.80ms与222903B/11374B只说明预算量级有可行性参考，不能和新定义的指标直接计算改善百分比。FCP可能是启动占位，reduced-motion不覆盖常规动画；正常动画也必须可打断、不能延迟输入。性能标记只在本地测量，不新增用户分析上传。

## 9. 新版验证矩阵

旧测试可作为有价值的边界案例来源，但不作为新API/DOM必须保留的规范。新断言应直接证明新任务与新数据契约，不能删除行为测试只留下截图。

| 变更面 | 新版必须证明 | 证据方式 |
| --- | --- | --- |
| Shell/导航 | 所有任务路径、当前位置、跳主内容、后退；设置有明确文字 | 路由集成、键盘与焦点测试；手机/桌面独立走查 |
| 快速记录 | 三种录入≤2次至可编辑；保存/取消/失败；来源恢复；首屏稳定 | 合成任务脚本、录入组件集成、浏览器操作与布局测量 |
| 详情/编辑/删除 | 查看零业务写入；命令明确；不存在记录可恢复；删除失败数据保持 | repository调用断言、库快照、完整失败流程 |
| 表单/Sheet/确认 | 防双击与重复提交、错误保留、脏退出、busy保护、焦点隔离/恢复 | 控制Promise的集成测试；Chromium/WebKit键盘与短屏 |
| 今日记录投影 | 不同领域和日期准确；读失败不为0；相同时刻/不同offset稳定排序；截断不改总数 | 纯函数/查询测试、混合合成数据与领域单独失败 |
| 习惯 | 一触完成/撤销、唯一性、防连击、计划变化不伪造事实、详情只读 | 命令事务测试、跨日/启停/计划状态浏览器流程 |
| 专注 | 选定运行/暂停契约、重复完成、后台/刷新、系统时钟变化、跨日、失败恢复 | 注入时钟单元/事务测试与visibility/重载浏览器测试 |
| 记账/报表 | 收支整数计算、分类引用、范围/月历/报表、零数据；返回来源和月份 | 领域计算、只读写入spy、范围与回退测试 |
| 健康 | 单位、目标、同日多次、趋势、运动强度与时长、完整详情/修正/删除 | 边界fixture、图表可访问摘要、流程测试 |
| 新schema | 新库只建声明表/索引；无旧库访问；初始化失败不重建；唯一/引用约束 | fake IndexedDB与真实浏览器；设置旧库哨兵验证未触碰 |
| 新版备份 | 格式/大小/引用/数量校验；预览取消/到期；原子替换；失败全表回滚 | 新版合成文件、强制事务失败前后逐表比较 |
| 样式/响应 | 320/390/430/768/1440、深浅、200%文字、长内容、正常/减少动态，无横滚/遮挡 | 全页面与状态截图、axe无serious/critical、人工焦点/对比度复核 |
| 离线/更新 | 首次安装后所有核心入口离线可达；新版数据保留；有草稿/写入时更新保护 | 独立上下文SW生命周期与离线流程 |
| 性能/交付 | 冻结绝对预算、同待发布源码的检查、Pages与线上版本/冒烟一致 | 保存原始性能附件、CI链接、部署与独立线上验证 |

物理iPhone保持“待用户实际执行并确认”；不能把自动化截图或WebKit通过写成真机证据。测试不从用户设备提取数据库、备份或真实截图。

## 10. 实施与冻结条件

设计冻结前不写生产UI。冻结后按依赖组织小批量：新版schema与命令/验证基础 → 设计变量与外壳/公共交互 → 直接录入和只读详情 → Today投影与领域工作台 → 全状态/离线/备份 → 完整验收与发布。具体先后可由开发/QA按新方案调整，不需要逐步迁移旧视觉。

每批补关键逻辑注释、隐私安全日志和对应文档，运行最窄相关检查；最终完整验证再发布。文档必须同步新版字段、路径、单位、时间、备份、配置和操作方式，不能留下旧API说明冒充新行为。PLAN、产品基线与ADR由总协调在决策/里程碑处统一更新。

R3签收清单（决定已收敛，剩余是独立审查与状态证据，不交给开发临时选型）：

| 契约 | 当前决定与签收责任 |
| --- | --- |
| 体验/导航 | D日常调频；中央记录与明确日期来源；详情先读后编；设计方交完整状态和响应稿 |
| 数据 | LifeIndexV4/schema1，八业务表+meta；平面分类；无外部动作和无关回执表；架构/审核核对约束及创建stamp防复活 |
| 习惯/健康 | 当前计划从今天生效，历史只存事实；同日体重全部保留、趋势当日最后录入；设计文案与QA覆盖一致 |
| 专注 | running/paused/completed及paused+pending；毫秒累计、互补秒显示、开始日归属、两阶段完成；审核失败/恢复可解释性 |
| 备份 | 新format1、50MiB/15分钟、全量替换；meta revision绑定预览、generation拦旧草稿；审核跨context与冲突UI |
| 组件/API | root流程/共享组件、designer领域页、core数据服务；统一Snapshot/CommandContext/ReturnContext接口 |
| 性能 | CPU4×，F0/F1×3类×7；400/1400/350/350ms和250/16KiB；严格真实ready/可输入/全资源观察 |
| 独立通过 | 至少第三轮且全部阻断关闭，必要时继续专题轮；作者不代签，不在签收前写生产src |

**R3提案已收敛为单一可实施契约；仍须独立审核确认完整状态、数据不变量与性能协议后冻结。**
