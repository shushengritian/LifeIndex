# Ocean 重设计 LLD 与实现契约

P5-07b：check-habit/start-focus 的 ActionPage 提交使用同步 ref 锁并在事务前登记独立 busy token，取消/站内离开及更新受保护。成功先释放本 token 再导航；失败保留预览并释放；路由生命周期代次使卸载后完成不得再导航或释放新代次保护。预览绑定完整 ParsedAction 对象身份，而非仅 actionId；同 ID 更换参数必须等待新 inspect，不能显示旧习惯而执行新习惯。已提交事务不会因页面卸载自动撤销，收据去重仍由 ActionService 原子保证。

P5-06f：原生开发候选消费配置 V1，逐项核对 ID、层级、可用性与收支；超过 1000 项时显式停止，避免双层遍历耗时失控。原生类型转换尚待设备确认，不把 JS 模型视为严格原生 schema 校验已通过。URL 仅含 actionId/amount/occurredAt/categoryId/type，分别编码后拼入固定站点 hash，不传分类名/OCR。每次运行生成一次数字组成的小写 UUID v4 格式请求标识；不是认证密钥，也不按截图去重。最终数据库有效性仍由 ActionService 执行时检查，配置文件不赋予写入权限。

P5-06b：`ActionService.inspect(action, allowCategoryRepair=false)` 可选择返回 ready/categoryUnavailable，不更改 execute 校验或 actionReceipt 原子写入。TransactionActionEditor 复用 ParsedAction 契约，修正字段时不改 actionId，URL 字段仍沿用旧严格协议、未知字段继续拒绝；预览分类显示完整路径。guard release 标记防止保存结束 effect 重建已消费草稿保护。输入时间未变则保留 parser 生成的 occurredAt/localDate/offset，变更才按设备本地语义重建。

P5-06a：分类配置格式与备份版本分离：`format: lifeindex-shortcut-categories`、`version: 1`、`categories` 数组。每项仅 `id/domain=finance/type=expense|income/name/parentId=null|string/available=true`。数组按同级 sortOrder/ID 稳定排序，父项先于子项；归档及父级归档项排除，层级损坏或无可用项拒绝生成。导出不会创建 actionReceipt 或修改账目；最终保存仍以当前数据库校验为准，配置不具备授权效力。文件名固定为 `lifeindex-shortcut-categories.json`。

P5-05c：SettingsDetailPage 严格白名单解析 section（appearance/export/restore/about/shortcuts），未知值回设置；以 section 为 key 隔离临时预览/错误，跨页前由既有 NavigationGuard 阻止忙碌跳转或确认放弃预览。业务仓储和备份服务复用；不新增存储。视图日志仅使用白名单视图名。快捷说明尚不生成链接或写入记录。

P5-05b：SettingsPage operationLock 在首个 await 前获取，finally 释放；与 working/global busy 同步。恢复确认仅成功后关闭，事务失败保留同一预览 token 供重试；恢复成功后的外观读取错误不进入事务失败提示。导出交接成功后的 lastSuccessfulExportAt 写失败作为独立元数据故障处理。无 schema/备份格式变更，恢复仍使用 BackupService 全表原子事务和预览 TTL。

P5-05a：`/finance/new` 以 FinanceNewPage 包装 FinancePage initialNew 参数，仅控制首次表单打开，不另建保存路径。Today 数据仍由三个独立 liveQuery 投影，习惯写锁与 PWA busy 保护保持一致；错误状态不参与零值汇总。

P5-04k：戒烟 mutate 返回是否成功，确认仅在成功后关闭；失败留原确认动作供重试。ref 锁串行化本页命令，busy 登记全局导航保护。草稿确认使用 body 顶层 dialog，Escape 由打开的确认消费，避免双层退出。仓储冲突/无烟状态规则不变。

P5-04j：WeightTrendChart 为只读派生视图，按 localDate 聚合且保留 measuredAt 最大值；过滤 `[today-29,today]`。SVG 数据坐标不存储、不进入日志；趋势线不做插值或健康判断。健康首页视觉使用现有主题 token/CategoryIcon，不新增依赖。

P5-04i：HabitsPage 的 embedded 只影响首页呈现，数据查询/统计算法保持同一份；管理路由 `/health/habits`。HabitForm 通过 Sheet 隔离背景，字段组统一禁用；打卡/状态操作用 ref 串行，busy 登记全局导航保护。状态确认失败不关闭，不删除历史；统计 Sheet 仅只读展示。

P5-04h：HealthHistoryList 为纯展示/选择组件，保留仓储顺序，以 localDate 分组；只把 ID 返回父级，不写库、不记录 ID。详情删除仍由 HealthPage 的写锁/ConfirmDialog 执行，成功删除同时关闭详情。无持久化字段变化。

P5-04g：TargetForm 保存/清除共用同步 ref 锁；清除只删除 settings.weightTarget，不触碰体重历史。取消草稿需确认，失败不关闭 Sheet；无数据模型变化。

P5-04f：WeightForm/ActivityForm 的同步写锁与 UI saving 对应，表单退出走共享确认；表单原生时间控件提供 name 并以提交时 FormData 为准，不依赖延迟 change 的 React 状态。保留本地日期键/时区偏移与整数单位契约。

P5-04e：健康历史使用 `/health/weight-history`、`/health/activity-history` 子路由，复用 HealthPage 的 history 视图参数和表单/仓储契约。体重读取全日期，趋势函数保持最近 30 天过滤；历史不再 slice。删除确认持有类型/ID 但日志不输出 ID；确认写入通过 ref 串行，失败保持原项。无新增数据结构。

P5-04d：FocusStage 仅由 planned/remaining 推导进度，不设独立计时器；开始表单用同步 ref 防重并禁用字段，失败保留原输入。可选字段使用原生 details，未展开不影响已有受控状态与提交。记录图标使用既有 CategoryIcon 注册表，无 SVG 字符串注入。

P5-04c：FocusEditForm 以 Sheet 隔离背景，描述保存/历史删除共享 ref 写锁；ConfirmDialog 承载放弃和删除确认。手动结束使用首次确认 ISO 时间，失败重试不重新采样；useFocusCompletion 新增可选 suspended 参数，手动待处理状态暂停本页自然完成。用户放弃待处理命令后恢复原计划，失败命令不作为新持久化字段，不引入 schema 修改；多标签页仍以仓储事务中 active 状态校验为准。

P5-04b：`/focus/history` 复用 FocusPage 的本地查询/恢复逻辑但不渲染开始表单；主页面不渲染历史明细。历史日期筛选是视图状态，不写库；分类汇总与记录共享筛选数组，本周按既有本地周定义计算。展示保留秒，不改变持久化时长。

2026-09-19 · 受影响文件映射；“待实施”不代表代码已经存在。

## 第一批：主题与外壳（已落源码，验证另记）

- `src/styles/global.css`：沿用现有变量名，映射已验收 Ocean 值；浅色默认、显式深色、跟随系统三条路径。`--canvas` 对应原型 `--bg`，`--surface-muted` 对应 `--raised`，`--accent-soft` 对应 `--soft`，`--destructive` 对应 `--danger`。避免新增第二套样式覆盖源。页面结构在各模块批次迁移。
- `src/app/AppShell.tsx`：导航今天/健康/专注/记账/设置，路由不变。`NavLink` 保留 active 与 aria-current。仅用 routeTitle 白名单输出导航事件，不输出 pathname、fragment 或查询数据。
- `src/shared/ui/Icon.tsx`：导航 SVG 使用 24×24 与 1.7px 圆线；设置复用已验收对称齿轮。纯图形组件无副作用日志，入口由外壳负责。
- `tests/unit/app.test.tsx`：断言顺序、真实导航与当前项、导航安全日志、旧 habits 书签跳转。

## 第二批：公共交互与记账（待实施）

P5-02b 已实现：记账列表改为分隔线行，整行按钮打开编辑、独立 44px 删除图标；长备注在列表截断，编辑保留全文。当前使用通用账目 SVG，完整分类图标绑定待 P5-03。表单底部保存/取消使用粘性操作区。跨日期保存只设置 savedDate 及成功提示，不改变 selectedDate；点击“查看记录”才切换日历，后一次成功保存替换前一次回看目标。日期提交读取命名控件 FormData，避免原生选择器 change 延迟造成旧值写入；金额等领域转换仍由既有方法处理。

P5-02a 已实现：新增 `ConfirmDialog`，以原生 dialog top layer 隔离背景、默认聚焦安全取消操作、Escape 按 busy 拦截；通过 portal 避免嵌套表单，关闭回触发点，已消失则尝试主内容。记账放弃/删除接入它，删除失败保留确认和重试。`Sheet` 添加可见可用控件的 Tab 首尾边界，存在原生确认时让出键盘处理。其他模块暂未替换默认 confirm。记账保存/删除用 ref 同步锁防重复，保存中冻结字段与退出；PWA dirty 同时覆盖 pending 写入。

本批只完成这些公共交互和记账日历去卡片边框/移除英文 eyebrow。后续仍需完整记录行/图标、表单布局、站内导航草稿协议和保存到其他日期的查看入口，不将以下整批规格视为已全部实现。

`shared/ui/Sheet.tsx` 增量扩展公共弹层/确认，保留兼容调用签名，逐页迁移；不一次重写所有表单。状态：closed→editing→saving→closed；校验/写入失败回 editing 保留原值；dirty 退出进入 discard-confirm，取消回 editing。saving 禁止重复提交和退出。嵌套确认只允许顶部弹层捕获 Tab/Escape，关闭回到触发点，失效触发点回页面标题。不可用读屏访问背景。

`pwa/useDirtyForm.ts`、`AppShell.tsx`、各 feature 共同处理站内导航退出，浏览器关闭只能使用系统允许的提示，不能承诺阻止系统杀进程。保持“运行计时”和“未保存草稿”区别。固定事件日志覆盖请求、取消、提交、失败，不能包含字段值。

`FinancePage.tsx`：日历唯一选日入口，月汇总位于日历下；新增继承选日，保存非当前日保留查看记录入口。列表与表单共享 categoryId 解析与图标映射。读失败显示重试，不伪装空记录。复用 financeDomain 的金额与本地日历算法。

## 第三批：分类 V4（待实施）

P5-03c：FinanceCategoryPicker 由 categoryId 推导当前根级，不保存第二个可能漂移的父级字段。选择根级即可记账，子级可选，“不细分”回根级；收支切换清空旧选项。历史原值的归档父级仅用于定位，不可改选。categoryDisplayName 复用领域查找生成完整路径；写入最终仍由 repository 校验，UI 不替代事务边界。

P5-03b：`categoryIcons.ts` 为稳定 ID/标签/分组/旧别名，`CategoryIcon.tsx` 以静态 JSX 渲染，不插入存储中的 SVG。V4 schema 支持旧标识与新 42 标识，V3 图标联合不变。`CategoryIconPicker` 的分组状态独立于选中值。`CategoryManager` 抽出 Settings，finance 根级点击进入子级，非 finance 直接编辑；编辑器 Sheet 用 ref 锁提交、dirty 确认与失败保留。`Sheet` 使用 body portal 绕开页面动画 containing block，并隔离背景、退出还原 inert；先前页面内定位实现由此替代。记账可用分类筛选采用继承归档规则，列表图标通过分类 ID 解析。

P5-03a 已实现数据底座：Category.parentId、独立 V4 索引、冻结 categorySchemaV3 与 V4 备份迁移、父级完整性、有效归档状态、不可改父级与同父级排序。TransactionRepository 与 ActionService 拒绝新选不可用子级，历史编辑可保留原归档引用；expenseByCategory 汇总到根级。交易更新固定原 id/createdAt/currency，避免运行时额外字段改变身份。分类 UI 和新图标尚未接入，不把下面表格视作整体完成。

| 文件 | 输入/输出及不变量 |
| --- | --- |
| `shared/domain/types.ts` / `validation/schemas.ts` | Category 可选 parentId；类型、时间、颜色和稳定 ID 约束保留；图标兼容旧标识 |
| `data/db/schema.ts` / `LifeIndexDatabase.ts` | 固定 V3 声明，新增 V4 声明与 parentId 索引，旧类别根级语义不改 |
| `CategoryRepository.ts` | create 新增 parentId；父级在同一事务校验存在、根级、同收支类型且有效；update 不允许移动父级；reorder 限同父级 |
| `TransactionRepository.ts` / `ActionService.ts` | 提交时检查有效父级；历史原引用可保留；相同 actionId 仍只产生一个结果 |
| `data/backup/schema.ts` / `BackupService.ts` | 冻结历史格式，转换 V4，校验父级缺失、环、自引用、第三级、跨域，覆盖仍为全库原子事务 |
| `SettingsPage.tsx` | 一级列表→子级列表→名字/图标编辑；父级从上下文固定；根层与子层的归档筛选和返回位置独立 |
| 新分类图标注册表 | 转写 G4 SVG 为类型化 React 数据；覆盖旧枚举别名，不用不受信任 HTML 注入；未知旧值安全回退并记录固定事件 |

分类详情展示只引用 ID 查当前名称；改名不重写交易，根级总额并集不重复累加。配置导出只含分类版本/ID/父级/域/名称与状态，不混入用户交易。

## 后续模块契约（待实施）

P5-04a：FocusPage 与 TodayPage 通过 useFocusCompletion 共用到点处理。每个挂载实例按活动 ID 自动尝试一次，失败保留可重试状态，ref 防重入；repository 保证原定结束点与事务幂等。拒绝 Promise 被捕获并输出固定业务事件，不再发生未处理拒绝。正在写入纳入 busy 导航保护；失败 active 行已经持久化，可离开后再次恢复。其余 C1 页面结构仍待迁移。

- `HealthPage.tsx`、`HabitsPage.tsx`、`cessation/*`：摘要/历史分层；体重/运动表单、习惯热力图与戒烟各沿用现有 repository/domain。历史查询不得静默截断，分页需明确可继续加载；返回保留来源位置。
- `FocusPage.tsx`：计时使用真实时间差，保持后台恢复语义，不加暂停；保存失败冻结已完成结果，重试不重复或继续增长。
- `TodayPage.tsx`：聚合只读投影，快捷操作调用现有命令，不建立 Today 存储。
- `SettingsPage.tsx`：分类/外观/数据与安全/其他四组，备份先解析预览再原子替换；主题写入失败恢复已保存主题。
- `app/actions/*`：原有金额、时间、分类、actionId 协议先保持；确认页支持修正与无效分类恢复需另加明确用例，绝不通过 URL 自动提交。

## 测试映射

P5-02d 补充：现有健康三表单、习惯、戒烟、专注开始、备份操作已登记 busy；新增专注描述编辑 saving 状态，提交期间禁用编辑/取消/再次提交，catch 保留草稿，finally 解除写入锁。P5-02c 以下关于其他模块 busy 尚未接入的记载由本记录更新；分类、外观及页面级结束/删除等尚未统一接入。不改变 repository API、字段、时长或备份 V3。

P5-02c 已实现：`useDirtyForm(dirty, busy = false)` 每个表单持有独立 token；PwaProvider 统计受保护表单及不可放弃写入数，命令层拒绝受保护时更新。`NavigationGuard` 拦截 pathname/search 改变，草稿支持 reset/proceed，busy 直接 reset（完成后不自动离开）。记账保存/删除已区分 busy；其他模块现有 dirty 登记保留，busy 接入仍待逐个完成。beforeunload 仅请求系统提示，不能确保 iOS 终止进程时执行，不持久化草稿。路由生命周期见 ADR-0013；Sheet 关闭时原触发元素消失则聚焦主内容。

新增类别覆盖有效父级创建、跨域/自引用/第三级拒绝、父级归档联动、独立子级恢复、历史保留、根级汇总；迁移覆盖 V1/V2/V3 本地库与 V0–V3 备份、恶意父级、部分写入故障回滚。表单覆盖 dirty/clean 退出、失败重试、Tab/Escape、重复提交、返回位置。系统覆盖所有主页两主题与 320/390/430，200% 放大、键盘与读屏、iPhone 输入/主屏幕更新/快捷截图/同库验证。
# P5-07e：叠层关闭焦点契约

ConfirmDialog 与外层 Sheet 同一次卸载时，Sheet 可能先把焦点恢复到页面入口。确认框在原打开者已移除的情况下，仅当 activeElement 为 body 或为空才回退到 main；已有有效焦点必须保留，避免把入口焦点再次抢走。取消确认但保留 Sheet 时，仍回到原确认触发按钮。分支日志只记录 close 操作，不输出元素文本或用户输入。
# P5-07g：每日支出曲线

DailyExpenseChart 消费 FinanceContent 已读取的 monthTransactions，不新增数据库查询或存储。窗口为选中日往前 6 天至选中日，起点不早于本月 1 日（与批准 G4 一致）；只累计 expense 的整数分，收入不抵扣，无记录日期为零支出。单日仅画点，多日画零基线折线与填充，SVG title 提供逐日准确金额；空态明确暂无支出。日志只记录点数和有无支出的状态，不输出金额、日期或账目内容。
# P5-07h：习惯日期检查

习惯统计保留 habitHeatmap 的 14 周/98 日期领域计算。单元格改为只读检查按钮，点击更新统计 Sheet 内的 selectedDate 与状态播报，不调用打卡仓库。未来日期优先显示“未来日期”，其余区分已完成、未完成与非计划日。44px 日期目标放入局部横向滚动容器，初次挂载定位当前周；后续选择不重置滚动。选中态提供轮廓与 aria-pressed，完成态提供对勾，不仅依赖颜色。日志不含习惯名或具体日期。
# P5-07i：习惯详情入口与命令归属

HabitsPage 的非 embedded 分支只呈现完整习惯管理列表；embedded 分支保留健康首页今日打卡。HabitContent 的 selectedHabitId 打开统计 Sheet，列表不直接暴露编辑/暂停命令。详情复用父级同步 operationLock/busy 与仓库操作，编辑时关闭统计再进入编辑 Sheet，暂停/恢复在统计上叠加 ConfirmDialog，写入中禁止关闭。类别图标使用现有 CategoryIcon 安全键映射。
# P5-07j：戒烟事件详情删除

P5-07o 路由补充：`FinanceNewPage` 为今天快捷入口适配层，接收 FinancePage 的 saved/cancelled 完成信号。在子编辑器卸载且 PWA dirty/busy 计数归零后，才 replace 到 /today，避免 onSave 内立即导航被写入保护拒绝。失败不发完成信号；普通 FinancePage 不传回调，保持日历上下文。返回 state 仅携带 financeSaved 布尔结果供 Today 成功播报，不改变业务存储或记录日期。日志仅包含操作与退出原因。

PlanForm 与 SmokingForm 的时间提交以原生控件的 FormData 为准（name=startAt/occurredAt），在 draft.save 禁用字段前读取，并同步回状态。避免 iOS 日期选择器 change 延迟导致保存初始时间；失败重试沿用用户可见值。日期范围合法性仍由仓库最终校验。

事件列表只选择 editing 并打开 SmokingForm/CravingForm；详情 Sheet 的删除按钮捕获已选事件 ID 后进入 ConfirmDialog。确认继续调用同一 repository.removeEvent，由 mutate 同步锁串行化；仅成功后 close，失败保留详情与确认错误。UI 不自动恢复同日无烟确认，不因删除推定无烟。日志只输出事件类型和操作，不输出事件 ID/具体记录。
