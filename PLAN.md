# LifeIndex V1 Delivery Plan

> P5-07m：CI 35451922363 失败（233/234），原因是记账失败注入测试早于异步分类校验后的真实写入；现等待 add spy 后注入失败，并断言零写入。CI=true 本地全量 47 文件/234 项、类型与相关 lint 通过，待新提交远端 CI 验证。没有修改生产保存逻辑或降低检查门槛。

> P5-07l：本地候选 f71fe7f 已推送 origin/codex/g5-ocean-implementation，触发 [CI 35451922363](https://github.com/shushengritian/LifeIndex/actions/runs/35451922363)。依赖安装与 peer 检查已通过；最终失败及修复见 P5-07m。未合并 main、未部署 Pages。剩余系统/手机验收见 [设备验收单](docs/operations/OCEAN_DEVICE_ACCEPTANCE.md)，快捷安装许可仍待回复。

> P5-07k 本地检查点：最新完整 47 文件/234 项 Vitest、61 项浏览器通过/1 原有专项跳过；全仓 lint/类型/格式、3 个快捷构建检查与4个原型行为检查通过。准备在 codex/g5-ocean-implementation 保存实现和文档检查点，不包含 AGENTS.md 独立本地改动、构建/私有数据或原生快捷安装文件；不推送、不标记发布。快捷指令原生安装许可/运行、系统放大与读屏/真机、最终版本/CI/线上验证仍未完成。

> P5-07j 补充：实页复现戒烟原生日期已改但保存初始时间的问题；PlanForm/SmokingForm 改为提交前捕获 FormData 并同步状态供失败重试。2 项新单测+4 项集成通过，实页同输入从错误 0 天变为正确 1 天 11 小时，截图留证。未发布。

> P5-07j：戒烟对照收口，日确认主按钮与吸烟/烟瘾次级入口分层；历史整行图标进入详情，删除移入详情确认，成功关闭/失败保留；空态加入语义图标。4 项集成和 8 项双引擎浏览器测试通过，本机合成计划截图已核对。未改变模型或医学文案含义，未发布。

> P5-07i：习惯管理改为彩色图标整行入口，编辑/暂停/今日操作进入详情，移除管理页重复今日列表，健康首页直接打卡保留。相关集成与 10 项双引擎回归通过，本机390px列表/详情已核对；补适配习惯旧图标键，避免“完成”显示为购物袋。未发布，戒烟对照及系统/快捷指令门槛继续。

> P5-07h：原型对照发现习惯热力图日期检查遗漏，已从纯色块补为可点击/键盘查看的 98 个日期，带状态播报和选中反馈，点击不补打卡；44px 局部横向滚动、默认当前周。集成只读断言及双主题双引擎浏览器检查通过，未发布。习惯管理的列表/详情层级仍需对照收口，不能将热力图修复等同整个健康视觉完成。

> P5-07g：对照 G4 发现记账遗漏月汇总下方的每日支出曲线，已补 DailyExpenseChart，使用真实本月账目、选中日向前最多 7 天且月初截断；六个月折叠统计保留。3 项新单测、6 项双主题/双引擎矩阵通过，类型/相关 lint/构建通过；本机合成账目截图已核对。其余视觉对照、快捷模板原生和上线门槛仍待完成，未发布。

> P5-07f：最近焦点修复后的完整 Vitest 45 文件/229 项通过，完整 Chromium/WebKit 57 通过/1 原有离线重载专项跳过。V3→V4 迁移测试补强为 12 张表全部非空并走 initialize 实际启动路径，逐表记录保持一致；相关 5 项重跑通过。未修改存储实现，未发布；快捷模板原生许可/验证及剩余人工验收仍待完成。

> P5-07e：15 页 × 双主题 × 双引擎的 320px/axe 初始状态矩阵通过；发现并修复同时关闭确认框与 Sheet 时抢走入口焦点的问题，键盘回归两引擎通过。本批浏览器 6 项、相关集成 16 项、构建/类型/相关 lint 通过。原生放大、读屏、真机与快捷模板验证仍未完成，未发布。

> P5-07d：以 `/LifeIndex/` 构建隔离候选并运行完整 deployed smoke，13 通过/1 原有 WebKit 离线重载专项跳过。修复部署测试仍从健康首页读取运动明细的旧断言，改为等待提交结束后进入完整历史核对，再返回健康核对体重。子路径资源/manifest/SW scope、V4、新界面、隐私边界、离线写入与刷新持久化通过；这是本机候选，不是 GitHub 已上线证据。未发布。

> P5-07c：新增健康历史真实浏览器滚动回归，体重/运动各 40 条，Chromium/WebKit 共 4 项通过。最早记录编辑保存/取消后保留列表上下文；不代表跨路由恢复或真机验收。未改变产品代码，未发布；快捷指令安装许可及 G5 剩余门槛继续待完成。

> P5-07b 收尾：Action P1/P2 均修复并通过独立复审；最新完整 45 文件/229 测试、Chromium/WebKit 47 通过/1 原有专项跳过，构建/类型/lint/格式/diff 通过。快捷指令本机安装测试许可待用户回复；其余视觉/无障碍及最终上线检查继续，目标未完成，未推送或发布。

> P5-07b：独立只读审查发现非记账 URL Action 保存期间可取消/离开的 P1；已补同步提交锁、全局 busy、取消禁用及卸载后抑制跳转，新增两类动作并发/失败/卸载测试。健康历史覆盖扩大为每类 40 条并编辑、失败删除/重试最早记录。统一测试版本来源，将快捷构建检查接入 CI。当前发布门槛与缺口统一见 [G5 审计](docs/project/G5_RELEASE_AUDIT.md)，整版未发布。

> P5-06g：R2 原生预览确认 OCR 文本连接修复，但发现空替换/日期/重复项目及动态字典比较仍有兼容风险；R3 使用显式文本 token、原生 Repeat Item 变量和文本比较转换，共 289 动作，签名成功。尚未安装或执行，已询问用户是否允许添加本机测试候选；手机同账本确认仍待完成。

> P5-06f：完整截图记账开发候选已串起输入、核对、分类配置/一级二级选择与 URL 转交，共 278 个原生动作；系统 plist 校验和完整候选 Apple 签名成功。新增 19 项模型/真实 App parser 联测。原生 R1 导入预览发现文本输入占位未绑定，R2 已改文本 token 并重签；R2 原生复核及实际运行仍待完成。未安装、未发布，不把模型/签名当作真机通过。

> P5-06e：开发候选已加入原生金额/交易时间核对，完整输入候选为 63 个动作。规则断言、生成动作分支模型、文本变量 UTF-16 引用与脚本 lint 通过；模型不代表 Apple OCR/编辑器运行。分类配置消费、一级/二级选择、唯一 actionId 和 URL 转交仍未接入，不开放安装，未发布。

> P5-06d：原生快捷指令构建器与图片/截屏/OCR 输入阶段已生成，序列化检查和系统 plist 校验通过；仅开发阶段产物，不进入 public、不开放安装。金额/时间核对、配置消费、URL 转交和设备验证仍待接入，目标未完成。

> P5-06c：已实测本机 Apple 签名链路，最小合成指令成功生成非空签名产物；新增项目签名脚本和构建/设备验收说明。它不是记账模板，未开放安装。真实模板、iPhone iOS 版本与同账本验证仍继续，不以签名成功代替运行/真机验收。

> P5-07a：完整 Chromium/WebKit E2E 重跑结果 47 通过、1 原有 WebKit 壳离线重载专项跳过。全仓 lint、格式、类型与 diff 检查通过，四份原型行为检查通过。未安装/重装依赖；修复预览启动方式和旧路径断言。快捷指令真实模板、最终视觉/无障碍专项、版本发布文档及部署仍未完成，目标继续，未发布。

> P5-06b：快捷记账改为可核对/修正草稿，失效分类允许补选一级/二级，保存保留原 actionId 并由事务最终校验。补齐草稿退出、写入防重与导航互斥，43 文件/202 测试、类型/相关 lint/构建通过；安装模板/系统 OCR 与真机同库门槛尚未完成，未发布。

> P5-06a：快捷记账分类配置 V1 与设置导出入口已接入，只导出真实可用收支分类，保留一/二级稳定 ID，拒绝损坏层级。42 文件/198 测试、类型/相关 lint/构建通过。导出不含账目，不代表快捷指令已安装；模板/确认页修正与真机同库验证继续，未发布。

> P5-05c：设置首页四组长条入口与 appearance/export/restore/about/shortcuts 独立详情路由已接通；分类保持默认折叠，其他组提供戒烟入口。41 文件/192 测试、类型/相关 lint/构建通过；首页/外观两主题三宽度无横向溢出。快捷指令页目前为真实可用状态说明，安装模板/分类配置仍在 P5-06，完整 E2E 与发布待完成。

> P5-05b：设置恢复改为应用内确认，外观/导出/预览/恢复串行防重；区分恢复提交与外观同步、文件交接与导出时间记录的结果。41 文件/191 测试、类型/相关 lint/构建通过；设置分组详情布局与快捷指令仍待完成，未发布。

> P5-05a：今天页接入主记账入口、专注状态入口、今日习惯与精简摘要；记一笔直达 `/finance/new` 复用现有受保护表单，今日打卡增加防重/写入保护。40 文件/186 测试与构建通过，浏览器直达表单/取消路径通过；完整视觉矩阵仍待完成，未发布。

> P5-04k：戒烟删除/结束计划与草稿放弃替换为应用内确认；命令与表单使用同步防重，失败保留，写入中登记导航保护并禁用输入。185 测试及构建通过，仍未发布。

> P5-04j：健康首页改为 Ocean 体重趋势面板及轻量运动/戒烟/习惯分区；真实近 30 天趋势按每日末次记录绘制，不补缺失值、不包含未来数据。182 测试/构建通过，两主题三宽度检查通过；仍未发布。

> P5-04i：健康首页习惯区仅保留今日打卡，完整管理移到 `/health/habits`；新增/编辑及统计进入 Sheet，草稿确认、写入防重、暂停恢复确认已接入。180 测试/构建通过，浏览器新增/统计及浅色三宽度检查通过。完整健康视觉与后续交付继续，未发布。

> P5-04h：健康完整历史接入日期分组、彩色图标和整行编辑；删除移入详情、成功关闭、失败保留。179 测试/构建通过，浅色三宽度与浏览器详情路径验证通过；完整回归仍继续，未发布。

> P5-04g：体重目标保存/清除共享防重锁，清除和放弃修改均使用应用内确认，失败保留输入与原目标。178 测试、类型/相关 lint/构建通过。继续整版实施，未发布。

> P5-04f：体重/运动草稿退出使用应用内确认；保存有同步防重锁、禁用输入和失败保留，并从原生时间控件当前值提交，避免移动端 change 延迟。177 测试/类型/相关 lint/构建通过。仍继续健康视觉与后续发布工作，未上线。

> P5-04e：体重/运动独立完整历史路由已实现，取消原首页 3/4 条截断列表；未来日期体重也能进入编辑。删除使用应用内确认、防重和失败重试。全量 175 测试与构建通过，浏览器路由检查通过；日期分组、详情操作布局及其余健康视觉仍在推进，未发布。

> P5-04d：专注首页已接入已验收 Ocean 弧线、长时钟、折叠可选字段、无嵌套卡片摘要和彩色分类图标；全量 35 文件/173 测试通过，首页两主题三宽度无溢出。后续健康与交付工作继续，未发布。

> P5-04c：专注详情 Sheet、只读时间事实、草稿放弃/删除确认及失败重试已实现；提前结束/取消使用应用内确认，重试固定首次确认时间，写入防重。仍在阶段 5，完整视觉、健康与后续交付继续，未发布。

> P5-04b：专注历史拆为 `/focus/history`，首页保留计时和今日/本周摘要；历史支持全部/今天/本周/本月，分类汇总与记录共用本地日期窗口，时长保留秒。全量 33 文件/168 测试通过；浏览器验证入口/筛选/返回及三宽度空态，完整视觉、详情 Sheet 与健康模块仍待完成，未发布。

> P5-04a：专注/今天页的到点保存已改为显式失败恢复，共用完成状态逻辑；失败保留原 active 行，重试使用原定结束点，不延长或重复计时。专注历史独立页、首页布局和健康重设计仍待完成，目标保持 active，未上线。

> P5-03c：记账下拉已替换为一级/二级图标网格，可选“不细分”；历史归档引用保留，账目行显示完整分类路径。新增选择器状态测试，并更新 E2E/线上烟雾测试选择器（本批尚未运行两者）。继续其余模块与最终交付；未发布。

> P5-03b：42 个正式 SVG 图标与 8 组选择器、分类一级→二级管理、名字/图标/颜色编辑已接入 IndexedDB；记账记录行使用真实分类图标。弹层改为 body portal 修复祖先变换导致的裁切。见 [验证记录](docs/design/reviews/p5-03b/README.md)。记账表单两级选择、其余模块和上线仍继续；未发布。

> 当前长期目标已获授权：完成剩余重设计计划并部署上线；发布前仍执行完整质量门槛，真机结果不得推定。P5-03a 已落分类层级与 V4 存储/备份底座，分类 UI/42 图标、其他页面、快捷指令和上线验证继续推进。下方“未授权发布”为历史状态，不再是本轮发布阻碍。

> P5-02d：体重/运动/目标、习惯、戒烟、专注开始/描述编辑和备份操作接入独立 busy 导航保护；专注描述新增保存锁、失败保留与重试。见 [开发记录](docs/development/REDESIGN_DEV.md#p5-02d-跨模块写入保护2026-09-19)。仍有原型布局、分类管理与 V4 迁移待实现，不宣称全部操作已防护；未发布。

> P5-02c：增加已登记草稿的站内导航确认、记账写入期间导航锁、刷新/关闭的浏览器提示请求和更新命令保护。150 项测试/26 文件通过，正式页面保留/放弃导航已验证。详见 [证据](docs/design/reviews/p5-02c/README.md)。非真机；其余模块写入状态、完整表单布局及 P5-03 分类仍待推进，未发布。

> P5-02b：正式记账改为紧凑可点击记录行、图标删除和粘性表单操作区；跨日期保存保留日历并提供查看记录，修复原生日期事件延迟的提交值读取。见 [证据](docs/design/reviews/p5-02b/README.md)。P5-02 仍有导航草稿与完整布局待办，P5-03 分类未开始；未发布。

> 阶段 5 第二批进展：P5-02a 已接入记账应用内放弃/删除确认、失败重试、保存防重与输入锁定、Sheet Tab 边界。25 文件/143 测试通过，浏览器确认框双主题三宽度检查通过。见 [证据](docs/design/reviews/p5-02a/README.md)。P5-02 完整布局与跨日期反馈仍在后续，不宣称整批完成；未发布。

> 阶段 5 首批结果：P5-01 Ocean 主题/导航基础完成，24 文件/140 测试通过，类型/相关 lint/构建通过，正式应用五页双主题三宽度检查通过。见 [P5-01 证据](docs/design/reviews/p5-01/README.md)。下一批 P5-02 公共表单与记账布局；不是整版完成，未发布。

> 最新（2026-09-19）：阶段 5 已获用户授权并开始正式实施，本地分支 `codex/g5-ocean-implementation`。已形成 HLD/LLD/DEV 增量，Ocean 主题/导航/齿轮第一批源码已修改。详见 [阶段 5 任务与证据](docs/development/REDESIGN_DEV.md)。整版与二级分类尚未完成，未推送、未发布。

> 当前重设计状态（2026-09-19）：用户明确原型验收完成，G1–G4 用户审核已通过；设计基线冻结，下一步阶段 5 开发规格与实现待授权。尚未完成的工程/真机专项不视为通过或豁免，快捷指令模板仍待交付。见[重设计主计划](docs/project/REDESIGN_PLAN.md)及 [G4 批准记录](docs/adr/0011-redesign-scope-and-review-gates.md)。以下旧状态保留历史；未修改生产、推送或发布。

> 2026-09-19 快捷记账方向已确认：截图 OCR 识别金额/交易时间→指令内选一级/二级分类→打开 LifeIndex 确认保存。采用系统 OCR 与规则，不上云；新增[配置与开发方案](docs/design/SHORTCUT_SCREENSHOT_SPEC.md)。需实现分类配置、失败回退及验证 Safari/PWA 同库，真实安装模板与真机测试仍待完成；未授权跨过 G4 生产/发布门禁。

> 2026-09-19 图标扩充：G4 分类图标扩为 42 个、8 个分组，分组切换保留选择；已验证保存回显与窄屏，见 [图标证据](docs/design/reviews/g4-icons/README.md)。快捷指令内选分类可作为后续方案；当前 PWA 不支持指令直接后台写本机账本，原生/云端方案未经批准。不改变 G4 审核与发布门禁。

> 2026-09-19 分类管理修订：按用户反馈改为一级列表→一级详情中的二级列表→新增名字/图标，移除父级下拉。新增与失败重试、父级归档恢复、返回位置及双主题三宽度已检查。见 [分类管理证据](docs/design/reviews/g4-category-drilldown/README.md)。仍为待整体审核原型，未修改线上产品。

> 2026-09-19 范围补充：交换健康/记账导航，记账加入二级分类原型，设置新增快捷记账安装说明。见 [ADR-0012](docs/adr/0012-finance-hierarchy-and-shortcut-onboarding.md)。细则、快捷草稿协议升级及真实指令交付纳入 G4 审稿与后续开发；当前安装按钮待提供，不宣称已有可下载指令。未改生产或发布。

> 2026-09-19 G4 D2 进展：修复重绘丢焦点和弹窗 Tab 越界，补验运动空分类、习惯暂停/非计划日、戒烟撤销/原因/多计划/三分钟休息。见 [D2 证据](docs/design/reviews/g4-d2/README.md)与[整体审稿清单](docs/design/G4_REVIEW.md)。原生 200% 放大及全应用最终独立审查未完成；G4 未整体验收，未进入生产或发布。

> 2026-09-19 G4 D1：补齐离线/更新/快捷入口的独立交互模拟，五主页双主题三宽度检查无横向溢出；新增交付状态规则测试并重跑 C1/C2/C3。D2 仍待完整空/长状态、200% 放大、键盘/焦点及最终审查，G4 尚未整体验收，不进入生产开发或发布。见 [D1 证据](docs/design/reviews/g4-d/README.md)。

> 2026-09-19 G4 C3：四类分类管理已接通记账/专注/运动选项；新增、改名、归档恢复、失败保留与历史引用已检查。下一阶段 D 为全应用回归与交付状态设计，G4 仍未整体验收。见 [C3 证据](docs/design/reviews/g4-c3/README.md)。仅内存原型，无生产修改或发布。

> 2026-09-19 G4 C2：戒烟计划/日确认/吸烟与烟瘾记录、编辑删除和隐藏恢复原型已形成，冲突回滚与主要路径已检查。下一步 C3 分类管理（G2 既定范围）与 D 全量验收。原型为固定上海时区、合成内存数据，未修改生产或部署。见 [C2 证据](docs/design/reviews/g4-c2/README.md)。

> 2026-09-19 G4 C1：完成专注完整字段、秒级计时/失败重试、独立历史和描述编辑/删除原型。C 拆成 C1 专注、C2 戒烟；后续仍有分类管理与 D 全量状态检查。见 [C1 验证](docs/design/reviews/g4-c1/README.md)。仅设计原型，未改线上应用。

> 2026-09-19 G4 B2：体重目标修改/清除、习惯新增编辑/暂停恢复、连续统计与 14 周热力图原型已形成并做浏览器验证。仅内存样本；下一批 C 戒烟和专注完整流程，之后 D 全量验收。G4 尚未完成，未进入生产开发或发布。见 [B2 证据](docs/design/reviews/g4-b2/README.md)。

> 2026-09-19 G4 第二批：推进记账编辑删除与体重/运动独立历史、编辑删除。原 B 拆分为 B1 记录闭环与 B2 目标/习惯；原型以合成内存验证，不改生产，不发布。详见 [G4 进度](docs/design/G4_PROGRESS.md)。

> 2026-09-19 最新：用户要求“继续下一步”，G3 海蓝方向通过并进入 [G4 分批原型](docs/design/G4_PROGRESS.md)。首批为今天/设置及五导航联通；G4 整体进行中，生产实现与发布均未授权。下方旧阶段状态为历史记录。

> 2026-09-19 R4 细节修订：按用户反馈移除记账页重复日期跳转控件，保留日历选日；重绘对称设置齿轮。仅设计原型，G3 仍待审核，未改生产或发布。

> 当前工作（2026-09-18，R4）：用户选择 A（Tide Guide）为主、B（Moonlitt）为辅，否定 C 的贴纸风，并确认继续出稿。已形成[海蓝方向](docs/design/G3_OCEAN_DIRECTION.md)和[三模块双主题交互样板](docs/design/G3_OCEAN_REVIEW.md)。方向已确认不等于视觉验收；G3 待本稿审核，G4 未开始。未修改生产代码、依赖或存储，未发布。

> 当前工作（2026-09-18）：按用户要求暂停页面继续打磨，先完成[五款近两年获奖 App 的真实界面参考板](docs/design/APP_REFERENCE_BOARD.md)，等待用户选择主方向。此前 G3 R1/R2/R3 保留为历史探索，不作为已确认的视觉方向；G3 仍未通过，G4 未开始，本轮未修改生产代码或发布。

> 当前审稿为 [G3 R3 石墨白](docs/design/G3_FINANCE_R3.md)：用户反馈 R2 布局和颜色仍需打磨，现保留 R2、另出 R3；参考 Things、Copilot、Apple Wallet 官方资料。G3 仍待审核，不进入生产实现。

> G3 最新补充：按用户“继续打磨，参考 moze”及“不必保留松绿主色”，记账单页已形成雾紫/中性灰双主题 R2；修正固定底栏并保留 R1 对比，详见[修订记录](docs/design/G3_FINANCE_REVISION.md)。仍待审核，未开始 G4 或生产实现。

> 当前工作（2026-09-16）：[产品体验审计与重设计计划](docs/project/REDESIGN_PLAN.md)的 **G1、G2 已确认；用户对首版 G3 质感不满意，现新增[记账单页修订样板](docs/design/G3_FINANCE_REVISION.md)，等待审核**。已安装固定版本 Impeccable 技能，仅手动参考，不运行引擎或自动钩子。本次基线为已发布 2.1.1 / `74ef3ff`；未授权生产实现或发布，G4 未开始。下文 V1/V2 历史状态保持归档。

> 2026-09-15: owner authorized publishing phone scrollbar and cessation entry corrections as V2.1.1; tracked in V2_1_PLAN.md. Normal Pages release gates remain required; no data migration.

> V1 is archived. V2 is also delivered; its completed design and delivery plan is [V2_PLAN.md](V2_PLAN.md). Future feature work requires a new version plan.

> 2026-09-14: [V2.1 plan](V2_1_PLAN.md) tracks lightweight smoking cessation. The owner has authorized direct publication and waived this release's backup prerequisite because there is no data to back up; see ADR-0010. V1/V2 remain archived.

**Status:** Completed — owner-accepted V1 with explicitly deferred physical verification
**Started:** 2026-09-03
**Current checkpoint:** v1.0.0 live and published at 40eb947; owner-approved physical-test deferrals archived, no further V1 feature work
**Source of truth:** `LifeIndex-Project-Baseline.md`

## Objective

Deliver a tested, documented, local-first LifeIndex V1 as an installable iPhone PWA and deploy its static application shell through GitHub Pages. On 2026-09-04 the owner explicitly accepted the current delivery, deferred unfinished physical-iPhone checks, and authorized `v1.0.0` publication and goal closure after final automated checks. [ADR-0005](docs/adr/0005-v1-owner-acceptance.md) supersedes the original pre-release physical gate for this release only.

## Definition of Done

The goal is complete only when all of the following are verified:

- The local Git repository has an understandable, reviewable history and a clean worktree.
- PRD, information architecture, UX/UI, HLD, LLD, data model, backup schema, DEV, test, deployment, iPhone installation, recovery, and troubleshooting documents match the implementation.
- Finance, Habits, Focus, Today, Settings, IndexedDB persistence, migration, backup/restore, offline app shell, and safe URL Actions meet their acceptance criteria.
- Formatting, linting, type checking, automated tests, production build, mobile WebKit E2E checks, and deployed smoke checks pass.
- The approved GitHub repository, CI workflow, and GitHub Pages deployment are live.
- The owner's V1 acceptance and explicit physical-check deferral are recorded accurately. Only phone-browser opening is user-confirmed; other physical results remain unverified in the follow-up register.
- Final documents, changelog, traceability evidence, tag `v1.0.0`, and release handoff are complete.

## Baseline and current assumptions

- The repository began with one 523-line baseline document and no Git metadata or application code.
- The product is a PWA for iPhone Safari/Home Screen, not a native SwiftUI app.
- IndexedDB is the sole primary data store. No backend, login, sync, analytics, or external telemetry is allowed in V1.
- GitHub Pages will host only the static app shell. The user created and pushed public `shushengritian/LifeIndex` and explicitly approved enabling its GitHub Actions Pages source on 2026-09-04. No project license has been selected; do not add one without the owner's decision.
- Physical-device actions require user participation and cannot be substituted with simulator or desktop browser results.
- The owner answered “接受” to accepting current delivery, deferring uncompleted physical tests, and publishing `v1.0.0` after documentation and automated checks. This is an accepted release exception, not a passed test. Unselected licensing remains unchanged with no license grant added.
- Initial technical candidate: React + TypeScript + Vite, Dexie, Zod, a Workbox-backed PWA integration, Vitest, and Playwright. M2 ADRs will confirm or adjust this after a bounded comparison.
- Default user-facing language is Chinese while the product name remains `LifeIndex`. Locale, currency, minimum iOS version, and GitHub visibility will be made explicit in product/architecture decisions.

## Milestones

| ID  | Milestone                                 | Status      | Exit evidence                                                                          |
| --- | ----------------------------------------- | ----------- | -------------------------------------------------------------------------------------- |
| M0  | Discovery, local Git, governance          | verified    | Inventory recorded, repository initialized, governance files committed                 |
| M1  | PRD, IA, UX direction, traceability       | verified    | Numbered V1 requirements and acceptance criteria reviewed for baseline consistency     |
| M2  | HLD, LLD, data model, backup schema, ADRs | verified    | Architecture and state transitions are implementation-ready                            |
| M3  | Engineering scaffold and DEV workflow     | verified    | Reproducible install, checks, build, local preview, and CI-ready scripts               |
| M4  | IndexedDB, migrations, backup/restore     | verified    | Migration and transactional backup round-trip tests pass                               |
| M5  | Finance, Habits, Focus, Today, Settings   | verified    | Each vertical slice passes its mapped unit, integration, and E2E checks                |
| M6  | PWA, offline, iPhone polish, URL Actions  | accepted_with_deferral | Automated evidence retained; remaining physical checks deferred by ADR-0005 |
| M7  | Data-safety and release hardening         | verified    | Full local quality gate and production smoke suite pass                                |
| M8  | GitHub, CI, GitHub Pages                  | verified | Owner-approved remote, successful full 1.0.0 workflow and version-aware live smoke |
| M9  | Owner acceptance, deferred device checks, V1 release | accepted_with_deferral | ADR-0005, published v1.0.0, release evidence and named unverified follow-ups |

## Work breakdown

### M0 — Discovery, local Git, governance

- [x] `verified` M0.1 Read the complete product baseline and inventory workspace files.
  - Evidence: one baseline file, 523 lines, 11,006 bytes; no project-level config or AGENTS file existed.
- [x] `verified` M0.2 Inspect the initial toolchain.
  - Evidence: Git 2.39.5, Node 20.19.5, npm 10.8.2, pnpm 11.19.0; Yarn and Bun absent.
- [x] `verified` M0.3 Initialize a local Git repository on `main`.
  - Evidence: `git init -b main` completed on 2026-09-03.
- [x] `verified` M0.4 Add privacy-safe ignore rules, repository guidance, living plan, contribution and security policies.
  - Evidence: `.gitignore`, `.editorconfig`, `AGENTS.md`, `README.md`, `PLAN.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, and `SECURITY.md` are present and populated.
- [x] `verified` M0.5 Validate files, inspect the diff, and create the initial atomic commit.
  - Evidence: staged whitespace check passed; commit `f7303b4` created on `main`.

### M1 — Product design

- [x] `verified` M1.1 Write numbered functional and non-functional V1 requirements in `docs/product/PRD.md`.
  - Evidence: 53 unique functional/non-functional requirements with explicit acceptance criteria and release gates.
- [x] `verified` M1.2 Define navigation, user journeys, empty/error states, and iPhone interaction model.
  - Evidence: `docs/product/INFORMATION_ARCHITECTURE.md` defines all five destinations, routes, state flows, and interaction budgets.
- [x] `verified` M1.3 Define the calm, minimal visual system and accessibility expectations.
  - Evidence: `docs/design/UX_UI_GUIDE.md` covers layout, tokens, components, module behavior, accessibility, and visual review states.
- [x] `verified` M1.4 Establish requirement-to-design-to-code-to-test traceability and the initial risk register.
  - Evidence: traceability matrix covers every requirement group; risk register records 14 initial product, data, platform, security, and release risks.

### M2 — Architecture and detailed design

- [x] `verified` M2.1 Decide the frontend, storage wrapper, validation, PWA, state, routing, and test stack in bounded ADRs.
  - Evidence: ADR-0001 through ADR-0004 accept the stack, persistence, private actions, and deployment/update strategy with alternatives and sources.
- [x] `verified` M2.2 Write HLD diagrams, boundaries, data flows, privacy, logging, offline, deployment, and update architecture.
  - Evidence: `docs/architecture/HLD.md` contains context/container/deployment diagrams, startup/restore sequences, module boundaries, and failure/observability rules.
- [x] `verified` M2.3 Write LLD interfaces and Finance, Habit, Focus, restore, service-worker, and URL-action state transitions.
  - Evidence: `docs/architecture/LLD.md` defines source ownership, service/repository contracts, algorithms, state machine, logging allowlist, and test seams.
- [x] `verified` M2.4 Define IndexedDB schema v1, indexes, migrations, date/money semantics, and versioned backup schema.
  - Evidence: seven-store schema, referential rules, migrations, full backup envelope, validation pipeline, atomic replace, and compatibility policy are normative.

### M3 — Engineering scaffold

- [x] `verified` M3.1 Scaffold the selected TypeScript PWA without unrelated demo content.
  - Evidence: the React/Vite shell exposes the five approved hash routes, iPhone-first navigation, version metadata, and production PWA registration without implementing out-of-scope modules.
- [x] `verified` M3.2 Add formatting, lint, typecheck, unit/integration, build, preview, and E2E commands.
  - Evidence: peer validation, Prettier, ESLint, strict TypeScript, 6 Vitest checks, production build, and 4 Chromium/WebKit E2E checks pass on the pinned dependency graph.
- [x] `verified` M3.3 Add shared logging/error boundaries and verify logs exclude personal values.
  - Evidence: runtime context allowlisting, event-name rejection, message-free exception serialization, and four logger privacy tests guard the initial app/PWA failure paths.
- [x] `verified` M3.4 Document setup, directory ownership, code standards, migration, Git, release, and rollback workflows.
  - Evidence: `docs/development/DEV.md` and `docs/testing/TEST_PLAN.md` define reproducible commands and distinguish automated, deployed, and physical-iPhone proof.

### M4 — Data-safety foundation

- [x] `verified` M4.1 Implement IndexedDB schema v1, repositories, seed categories/settings, and migration framework.
  - Evidence: Dexie creates the seven normative stores/indexes, inserts 15 stable categories plus 3 typed settings idempotently, and exposes validated category/settings repository boundaries.
- [x] `verified` M4.2 Implement schema-validated, versioned JSON export and preview-first transactional restore.
  - Evidence: `BackupService` reads a consistent sorted snapshot, emits V1 JSON, accepts only validated previews, and replaces all seven stores in one transaction using a one-time in-memory token.
- [x] `verified` M4.3 Prove backup round trip, invalid-input preservation, rollback, and old-fixture migration.
  - Evidence: 10 integration checks cover schema/indexes, idempotent seeds, repositories, full round trip, malformed/oversized/count/reference rejection, forced rollback, V0 migration, and token consumption; all 36 Vitest checks pass.

### M5 — Core vertical slices

- [x] `verified` M5.1 Finance: transaction/category workflows, time filters, and scoped summaries.
  - Evidence: transaction create/edit/confirmed-delete, local Today/Week/Month/History filters, exact totals, monthly categories, six-month trend, reload persistence, and category create/rename/reorder/archive/restore pass repository checks plus Chromium/WebKit flows.
- [x] `verified` M5.2 Habits: lifecycle, daily check-in, calendar, streaks, and completion statistics.
  - Evidence: create/edit, daily/weekday plans, active/pause transitions, idempotent check-in/undo, current/longest streak, monthly rate/calendar, and history-preserving pause pass six focused tests plus Chromium/WebKit reload persistence.
- [x] `verified` M5.3 Focus: 25/50/custom timer, resilient timestamp state, session history, and summaries.
  - Evidence: transactional single-active start, timestamp-derived display, delayed natural reconciliation, early finish, sub-second/cancel removal, description-only edits, confirmed history deletion, local summaries, and category distribution pass seven focused tests plus Chromium/WebKit reload recovery.
- [x] `verified` M5.4 Today: date summary and high-frequency actions without dashboard overload.
  - Evidence: local date, one-tap habit check-in, two-tap Finance/Focus entry, independent module failure states, daily summaries, active Focus, midnight rollover, and cross-feature updates pass Chromium/WebKit production-preview flow.
- [x] `verified` M5.5 Settings: data management, categories/habits, appearance, backup status, and version information.
  - Evidence: immediate/persisted system-light-dark appearance, Finance category lifecycle, Habits management route, app/storage/privacy status, versioned browser export, safe preview, explicit replace confirmation, and restored appearance pass 58 Vitest checks plus 16 dual-engine E2E checks.

### M6 — PWA and iPhone experience

- [x] `verified` M6.1 Implement manifest, icons, standalone metadata, safe areas, mobile navigation, themes, and reduced motion.
  - Evidence: original production icon master plus 32/180/192/512/maskable outputs, complete manifest and Apple metadata, safe-area navigation, light/dark/system themes, and reduced-motion CSS pass root and synthetic `/LifeIndex/` builds.
- [x] `verified` M6.2 Implement offline app-shell caching and an explicit, recoverable update flow.
  - Evidence: custom precache contains only allowlisted static paths; real connectivity status uses a body-free same-origin HEAD probe; update activation requires a user click and is disabled while any registered form/backup draft is dirty.
- [x] `verified` M6.3 Implement validated, idempotent URL Actions using fragments by default; document any compatibility exception.
  - Evidence: all three action types strictly parse fragment-local fields, preview without writes, revalidate references, atomically write entity plus receipt, deduplicate, and scrub routes; 13 parser/service checks and dual-engine E2E flows pass.
- [ ] `deferred_by_owner` M6.4 Complete physical input, touch, offline, refresh, and update verification in PV1-01–06; not a passed test.
  - Automated evidence: Mobile Safari/WebKit passes navigation, CRUD, backup, manifest, all action flows, and offline mutation/persistence; Chromium passes full offline shell reload and mutation. Playwright WebKit cannot automate offline reload. Physical airplane-mode reload and update activation remain unverified, explicitly deferred under ADR-0005 rather than blocking this release.

### M7 — Hardening

- [x] `verified` M7.1 Cover migrations, restore failures, money/date boundaries, suspended timers, repeated actions, and corrupted data.
  - Evidence: 84 unit/integration tests include V0 migration, future/corrupt backup rejection with unchanged-data proof, restore rollback, exact money/calendar boundaries, timestamp reconciliation, action deduplication, and an injected IndexedDB failure that retains the draft.
- [x] `verified` M7.2 Exercise empty and representative larger datasets, accessibility, visual states, and production preview.
  - Evidence: 500 transactions round-trip exactly; 33/34 browser checks pass with one documented WebKit-tool skip; all primary/entry/dark states pass axe; 320 px touch/reduced-motion automation and 320 × 568 / 390 × 844 visual review pass.
- [x] `verified` M7.3 Run and record the complete local release gate.
  - Evidence: peers, formatting, lint, strict TypeScript, 18-file/84-test Vitest suite, root and `/LifeIndex/` production builds, dependency audit, secret/artifact/ignore scans, and 33-pass/1-skip dual-engine E2E gate are green on 2026-09-03.

### M8 — GitHub and deployment

- [x] `recorded` M8.1 Record approved owner/repository/public Pages model and unchanged, unselected licensing status; PV1-07 retains the owner's future decision.
  - Evidence: user-created public `shushengritian/LifeIndex`, successful user push, and explicit Pages-source authorization confirm the target and hosting route. License choice remains open; no MIT or other grant is inferred. V1 closure preserves this state rather than adding a license without approval.
- [x] `verified` M8.2 Create/configure the remote and push only reviewed source and documentation.
  - Evidence: `origin` is `https://github.com/shushengritian/LifeIndex.git`; local `main` tracks `origin/main` at `7755346` with a clean worktree before the CI repair. GitHub run 33830831321 checked out that exact commit.
- [x] `verified` M8.3 Configure least-privilege CI and Pages deployment gated by successful checks.
  - Local evidence: current official action contracts were reviewed and SHA-pinned; CI is content-read-only, Pages grants write/OIDC only to the dependent deploy job, frozen install/full quality/dual-engine gates precede artifact upload, and a read-only post-deploy job runs live Chromium/WebKit smoke. The deployed suite passes 9 checks with one documented WebKit-tool skip against both `/` and `/LifeIndex/`.
  - Incident and repair evidence: first run 33830831321 failed at frozen install (`ERR_PNPM_IGNORED_BUILDS`, sharp 0.33.5). The exact-version script approval passes a local empty-store frozen install and both later complete Linux runs. Pages confirms **GitHub Actions** as its saved source.
  - First green run: 33832099931 deployed `60b0676` (0.1.0). Current application run [33833052946](https://github.com/shushengritian/LifeIndex/actions/runs/33833052946) deployed `ff7d443` (0.1.1) and completed successfully at `2026-09-04T03:29:21Z`: 19 files / 92 unit/integration tests, 33 browser checks / 1 documented skip, and 9 live checks / 1 documented skip including exact app-version validation.
- [x] `verified` M8.4 Inspect workflow evidence and validate the live subpath, assets, manifest, worker, console, mobile view, and offline reload.
  - Evidence: `https://shushengritian.github.io/LifeIndex/` passes the 0.1.1 live suite. Manual browser inspection covers 390 × 844 Today and 320 × 568 Settings/offline-shell readiness; a real 0.1.0-to-0.1.1 browser transition verifies the waiting prompt, dirty-form disabled state, canceled draft, explicit activation, and final version without creating a record. This does not prove physical Safari acceptance.

### M9 — Physical iPhone and release

- [x] `accepted_with_deferral` M9.1 Record owner acceptance: phone-browser opening confirmed; installation and further physical checks explicitly deferred under ADR-0005.
- [ ] `deferred_by_owner` M9.2 Files/iCloud restore and real Shortcuts checks retained in PV1-04–05; no pass is claimed.
- [ ] `deferred_by_owner` M9.3 Remaining physical verification and any resulting fixes move to PV1-01–06 when the owner resumes them. This does not waive a known critical defect.
- [x] `published` M9.4 Final local gate and complete remote run 33849576847 pass; tag `v1.0.0` resolves to `40eb947`, and its GitHub Release is published. Final evidence and handoff are archived in `docs/releases/v1.0.0.md`; synchronize this documentation-only closure without moving the release tag.

## Risks and blockers

| ID    | Risk or blocker                                                                   | Impact                               | Mitigation / trigger                                                                      |
| ----- | --------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------- |
| R-001 | Safari may remove site data after user action, uninstall, or storage pressure     | Loss of long-lived records           | First-class backups, clear warnings, restore tests, and recurring backup guidance         |
| R-002 | GitHub Pages project subpaths can break routes, manifest, or service-worker scope | Installed/offline app fails          | Base-path-aware build plus deployed manifest/worker smoke tests                           |
| R-003 | URL query actions can leak sensitive values to the host/history                   | Privacy breach                       | Prefer fragments; validate, deduplicate, scrub, and document any exception                |
| R-004 | iOS suspends timers and JavaScript callbacks in the background                    | Incorrect focus duration             | Derive elapsed time from persisted timestamps and test resume/reload transitions          |
| R-005 | Static Pages has no authentication                                                | App shell is accessible by URL       | Confirm this model before remote deployment; keep all records local and ship no user data |
| R-006 | GitHub CLI is unauthenticated, but Git push and the signed-in browser/connector work | CLI-only administration unavailable | Use existing authorized Git/browser/connector surfaces; do not copy tokens or require redundant login |
| R-007 | Physical iPhone cannot be operated by the agent                                   | Final acceptance cannot be automated | Provide one concise test action at a time and require user confirmation before release    |
| R-008 | New dependency versions can introduce unreviewed install scripts | Future CI installs may stop | Current sharp incident resolved by exact-version approval and verified Linux runs; retain fail-closed checks and review upgrades |
| R-009 | Owner accepted V1 before full physical-device verification | Device-only issues may remain undetected | Explicit ADR-0005 exception, PV1-01–06 follow-ups, retained automated gates, independent backups; never label deferred checks passed |
| R-010 | Supplemental current npm advisory lookup timed out | Fresh security-advisory result unavailable | Do not claim a fresh clean audit; unchanged dependency graph and successful configured gates retained. Record PV1-08 for recheck before future dependency changes |

## Decisions

- No architecture decisions are final until their ADR is written in M2.
- The baseline architecture and product non-goals are already approved and do not require a new ADR.
- ADR-0005 records the owner's later acceptance-gate change. Database/backup remain V1; future ideas are not authorized work until separately requested.

## Recently completed

- Read the complete baseline and confirmed a greenfield repository.
- Established the long-running delivery goal.
- Inspected the initial local toolchain and GitHub authentication state.
- Initialized the repository on `main`.
- Added the initial privacy-safe governance and planning files.
- Completed M0 in local commit `f7303b4` and began translating the product baseline into testable M1 requirements.
- Verified M1 with 53 unique requirements, complete interaction/visual direction, traceability coverage, and 14 registered risks.
- Began M2 with four bounded decisions covering the web stack, IndexedDB/validation, private URL Actions, and controlled PWA deployment.
- Verified M2 with four accepted ADRs and implementation-ready architecture, data, backup, timer, action, logging, and PWA contracts.
- Locked the M3 dependency graph after resolving a TypeScript 7 peer conflict by selecting compatible TypeScript 6.0.3.
- Verified M3: the five-route app shell, safe logger, error boundary, custom service worker build, local workflows, and Chromium/WebKit accessibility smoke tests all pass.
- Verified M4: the seven-store IndexedDB foundation and preview-first atomic backup replacement pass static, 36-test, production-build, and two-engine browser gates.
- Implemented the Finance transaction slice against real IndexedDB with exact projections and a production-preview CRUD/reload journey in both browser engines.
- Verified the Habits slice with schedule-aware statistics, reversible compound-key check-ins, pause-with-history semantics, monthly progress UI, and dual-engine persistence evidence.
- Verified the Focus slice with timestamp-derived countdown, single-active transactional transitions, reload recovery, history maintenance, and dual-engine early-finish evidence.
- Verified Today as a calm projection-only surface with independent Finance/Habits/Focus subscriptions and dual-engine cross-feature evidence.
- Verified Settings and completed M5 with persisted appearance, Finance category lifecycle, transparent local-storage status, and browser backup/preview/atomic replace flows; the complete gate passes 58 Vitest checks and 16 Chromium/WebKit E2E checks.
- Split feature routes into lazy production chunks, reducing the main JavaScript chunk from the warning threshold to about 339 kB before gzip.
- Implemented M6 installability and controlled update infrastructure with an original PWA icon set, base-path-safe metadata, static-only precaching, trustworthy offline status, and shared dirty-form protection.
- Implemented all three strict fragment URL Actions with no-write previews, atomic receipt coordination, retry deduplication, safe route scrubbing, and an iOS Shortcuts operations contract.
- Closed the automated M6 gate with 75/75 Vitest checks and 25 passed / 1 documented WebKit-tool skip across 26 production-preview E2E scenarios; Chromium passes the complete offline reload path.
- Completed M7 hardening with 84/84 Vitest checks, 33 passed / 1 documented WebKit-tool skip across 34 production-preview E2E scenarios, zero known production dependency vulnerabilities, privacy-safe artifacts, and verified root/project-path builds.
- Found and fixed dark-theme primary-control contrast plus compact touch-target gaps during the M7 accessibility pass.
- The user pushed the existing history and deployed-smoke commit `7755346` to public `shushengritian/LifeIndex` without rewriting history.
- Enabled Pages with the user's explicit instruction and verified the saved GitHub Actions source through the signed-in browser.
- Inspected the first remote run and isolated the clean-install failure to sharp's unresolved build-approval placeholder; no application deployment occurred.
- Verified the sharp repair with a separate empty-store frozen install, all 84 unit/integration checks, production/PWA build, and 33 passed / 1 documented skipped browser checks on 2026-09-04.
- Verified first public deployment in run 33832099931 with 9 live smoke passes and one documented WebKit-tool skip; opened the live mobile layout and confirmed offline shell readiness.
- Identified a gap between the installed-update checklist and startup-only discovery; 0.1.1 adds guarded foreground/reconnect discovery without changing the activation/dirty-form contract.
- Verified 0.1.1 locally with 19 test files / 92 tests and 33 passed / 1 documented skipped browser checks. Added an exact candidate-version assertion to deployed smoke to distinguish the new release from a healthy cached predecessor.
- Verified 0.1.1 in complete GitHub run 33833052946 (including 9 live checks / 1 documented skip) and manually exercised the explicit dirty-form-safe browser upgrade from 0.1.0. No physical-device result is inferred.
- Recorded the owner's phone-browser opening feedback and explicit acceptance of V1 with deferred physical checks. Prepared version-only `1.0.0`, release notes, and named post-V1 follow-ups without altering storage or runtime business logic.
- Published `v1.0.0` at `40eb947` after local 92-test / 33-browser-pass checks and complete GitHub run 33849576847 with 9 live passes / 1 documented skip. Tag and Release are verified; the unavailable supplemental advisory recheck is disclosed rather than reported as passed.

## Closure and next-version boundary

1. This archived plan records V1 closure against the verified tag, Release, and application workflow. The final archive-only main push still uses the normal full workflow; goal completion requires that check and a clean, synchronized worktree.
2. Preserve the published tag and release. No feature work or recurring monitoring remains authorized in this goal.
3. The owner will provide later version ideas. Deferred checks and administrative follow-ups remain in `docs/project/POST_V1_BACKLOG.md`, not falsely completed requirements.

## Plan change log

| Date       | Change                                                                                                                   | Reason and impact                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-03 | Created the first executable V1 plan and milestone evidence model.                                                       | Converts the approved baseline into a living delivery contract; no product-scope change.                                                                          |
| 2026-09-03 | Recorded fragment-based URL Actions as the default design direction.                                                     | Protects privacy by keeping action payloads out of HTTP requests; requires ADR validation in M2.                                                                  |
| 2026-09-03 | Defined V1 habit schedules as daily or selected weekdays and restore as preview-first replace, not merge.                | Satisfies the baseline with testable, data-safe scope while deferring ambiguous scheduling and merge conflict rules.                                              |
| 2026-09-03 | Defined Focus V1 without pause/resume intervals.                                                                         | Keeps timestamp recovery reliable and avoids turning Focus into project management; early finish and cancel remain supported.                                     |
| 2026-09-03 | Accepted React/TypeScript/Vite, pnpm, Dexie 4, Zod, hash routing, custom Workbox service worker, Vitest, and Playwright. | Provides a typed static PWA, Safari-aware data layer, explicit update control, and layered validation without a backend or heavyweight global state/UI framework. |
| 2026-09-03 | Added `actionReceipts` as the seventh V1 store.                                                                          | Durable idempotency is necessary to prevent Shortcuts retries from duplicating records; receipts contain no payload and are included in full backup.              |
| 2026-09-03 | Pinned TypeScript 6.0.3 instead of the available 7.0.2.                                                                  | `typescript-eslint` 8.69.0 requires TypeScript below 6.1; resolving the peer contract keeps lint/type evidence trustworthy.                                       |
| 2026-09-03 | Completed M3 with a production-built PWA shell and two-engine browser gate.                                              | Establishes a reproducible implementation loop before persisted data is introduced; WebKit remains an approximation until physical-iPhone acceptance.            |
| 2026-09-03 | Added a supported V0-to-V1 backup migration that initializes empty action receipts.                                   | Gives the migration pipeline a real older fixture without inventing business data; V1 remains the only emitted format.                                           |
| 2026-09-03 | Completed M4 with a seven-store atomic replace-restore boundary.                                                       | Data is fully validated before writes and any insertion failure rolls the whole replacement back, establishing the safety base for feature development.           |
| 2026-09-03 | Completed all five M5 vertical slices and introduced route-level lazy loading.                                          | Settings closes category and backup handoff workflows; 58 unit/integration checks and 16 dual-engine E2E checks pass while the production main chunk stays bounded. |
| 2026-09-03 | Completed M6 implementation while deferring one WebKit automation gap to physical acceptance.                           | Install metadata, offline mutation, update safety, and URL Actions are automated; Playwright WebKit cannot perform offline reload, so M9 retains the real-device release gate. |
| 2026-09-03 | Completed M7 local release hardening and advanced the checkpoint to M8.                                                  | Corruption, failure, volume, privacy, accessibility, compact-layout, dependency, root/subpath build, and dual-engine gates pass; only deployed and physical-device evidence remains. |
| 2026-09-04 | Recorded the public GitHub push, approved Pages source, and first CI failure. | Remote evidence revealed an unresolved sharp install-script decision masked by the warm local environment; repair reproducibility before deployment, with no product-scope change. |
| 2026-09-04 | Verified first Pages deployment and added 0.1.1 update-discovery work before M9 sign-off. | All remote gates pass for 0.1.0, but a long-lived installed app needs foreground/reconnect checks to discover later releases predictably; activation remains explicit. |
| 2026-09-04 | Verified the 0.1.1 deployment and a real browser upgrade; advanced to user-performed M9 checks. | Linux, live HTTPS, candidate version, and dirty-form activation evidence now pass; iPhone and licensing decisions remain user-owned and unverified. |
| 2026-09-04 | Owner explicitly accepted V1 and deferred uncompleted physical checks; formal release preparation started. | ADR-0005 updates the acceptance gate transparently. Keep all automated gates and evidence limits; do not claim physical pass or change database schema. |
| 2026-09-04 | Published owner-accepted v1.0.0 and archived the handoff. | Complete workflow 33849576847 and live version-aware smoke pass; tag/Release identify 40eb947. Keep deferred tests, unselected license, and unavailable supplemental advisory lookup explicit. |
