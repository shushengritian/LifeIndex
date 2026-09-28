# 4.0 实施分工与组件接口

本文件补充已审核设计/架构契约的代码接线，不改变产品或存储语义。设计独立冻结前只准备交接，冻结后按以下文件所有权并行实施。

## 所有权

- 架构负责人：`src/core/**`、`tests/unit/v4/**`、`tests/integration/v4/**`、相应数据开发文档。先提交准确类型/工厂签名，再填充分批实现。不开页面、不改依赖/Git。
- 设计/领域开发：新增 `src/features/{today,health,finance,habits,focus}/*V4.tsx` 与所需 v4 子模块、`src/styles/v4-features.css`，领域页面及其状态/图表/习惯管理。保持旧文件用于历史测试，不从新版入口引用旧页面。
- 根协调：`src/app/v4/**`、`src/shared/ui/v4/**`、`src/shared/v4/**`、`src/features/records/v4/**`、`src/features/settings/v4/**`、其他 v4 样式、入口/PWA/品牌资源、版本/集成/CI/发布。
- 独立审核：独立代码/设计审核、生产浏览器测试及验收证据。不能签收自己实现的修复；问题交对应作者修复。

生产入口最终切换到 AppV4；旧源码及测试暂保留为明确历史验证，不能用其通过数量代替新产品证据。浏览器验收须按新契约改写并建立能力覆盖表，不能静默跳过旧失败。

## 根协调提供的公开 UI 接口

`@/app/v4/Services`：`useV4Services(): LifeIndexServices`。服务按架构唯一契约，页面不得访问 Dexie 表。

`@/app/v4/useQuery`：`useV4Query<T>(query: () => Promise<Snapshot<T>>)` 返回 `{status:'loading'|'ready'|'failed', snapshot:Snapshot<T>|undefined, error:DomainError|undefined, retry():void}`。调用方用 `useCallback` 固定 query 身份；失败不自动变空数据。

`@/app/v4/Flow`：`useFlow()` 返回 `openComposer()`、`openCreate(kind:'expense'|'weight'|'activity', options?:{defaultDate?:string})`、`openRecord(kind:'transaction'|'weight'|'activity'|'focus'|'habitCheck', id:string)`、`notify(message:string)`。方法在真实事件中捕获来源路由、滚动与 data-focus-key。默认日期总为当前本机今天，只有明确日期动作传 defaultDate。

`@/app/v4/Confirmation`：`useConfirm()` 返回 `(options:{title:string;description:string;confirmLabel?:string;cancelLabel?:string}) => Promise<boolean>`。确认层处理焦点；调用方仍负责真实命令及失败显示。

`@/app/v4/FocusRuntime`：`useFocusRuntime()` 返回 `{status:'loading'|'ready'|'failed',snapshot:Snapshot<FocusSession|null>|undefined,session:FocusSession|null,elapsedSeconds:number,remainingSeconds:number,awaitingSave:boolean,busy:boolean,error:string|null,start(minutes:number):Promise<void>,pause():Promise<void>,resume():Promise<void>,finish():Promise<void>,retry():Promise<void>,discard():Promise<void>}`。finish/discard由controller统一确认，页面不自建ticker、prepare/finalize effect或另写专注会话。失败留在原状态，错误文案由controller映射固定码。

`@/shared/ui/v4/Icon`：`Icon({name:IconKey|'write'|'settings'|'play'|'pause'|'back'|'close'|'download'|'upload'|'sun'|'shield',size?:number})`，装饰 SVG，调用者给控件命名。

`@/shared/ui/v4/Elements`：`PageHeading({title,description?,action?})`、`SectionHeading({title,children?})`、`Feedback({kind:'loading'|'empty'|'error',title,children?,onRetry?})`、`Rosette({className?})`。允许领域页面自行使用语义HTML，不为共享而扩成万能组件。

`@/shared/ui/v4/RecordList`：`RecordList({items:RecordView[],emptyText?:string})` 只读列表，显式点击后经Flow打开详情；日期精度按实体语义。

`@/shared/v4/format`：`formatMoney(minor:number)`（只数字，调用方标单位）、`formatDuration(ms:number)`、`formatClock(seconds:number)`、`localDate(clock:ClockSnapshot)`、`monthRange(month:string)`、`weekRange(date:string)`、`commandContext(stamp:Stamp):CommandContext`、`errorMessage(error:unknown):string`。

## 领域页面出口

命名导出：`TodayV4`、`HealthV4`、`FinanceV4`、`FinanceReportV4`、`FocusV4`、`FocusHistoryV4`、`WeightHistoryV4`、`ActivityHistoryV4`、`HabitsV4`，每页真实独立模块。习惯详情/计划编辑由HabitsV4所在领域维护（`/health/habits/:id`），今日/健康的详情用语义链接到此路径，不调用习惯完成命令。

今天视图 query `view=timeline`；记账 `month=YYYY-MM&day=YYYY-MM-DD&view=list|calendar`；月报使用同一month query；历史提供分页并保留范围。导航用Link/NavLink，行为用button。data-focus-key为可复用语义字符串，返回恢复不记录业务内容到日志。

tokens由root提供：`--canvas --surface --soft --ink --muted --line --accent --on-accent --focus-entry --focus-room --on-focus-room --finance-space --habit-space --on-habit --habit-muted --habit-action --completed-surface --on-completed --focus-on-habit --focus-on-completed --danger --success`。输入/按钮/字段共用 `.button .button.secondary .text-button .field .field-error .numeric`；专用布局由领域CSS负责。旧原型CSS仅参考，不整段复制未使用样式进产品。

生产检查按冻结 TEST_STRATEGY。每批关键逻辑补注释、隐私安全日志和文档；类型接线差异先协调，不各自发明同名DTO。原型通过不是生产验收。
