# LifeIndex 4.0 数据层

日期：2026-09-29。状态：冻结契约已实现为真实服务，作者单元/集成检查已通过；独立审核、浏览器数据测试、性能与发布验收另行记录，本文不代签。

## 公开入口与接线

- `src/core/types.ts`：完整实体、状态联合、输入DTO、Snapshot/CommandContext、查询读模型与LifeIndexServices。
- `src/core/services.ts`：createLifeIndexServices(options?)、deriveFocusDisplay、createCompletionAttempt、captureDateSelection及类型再导出。
- `src/core/validation.ts`：LIMITS、ICON_KEYS、CATEGORY_SCOPES、parseMoneyInput（元→整数分）、parseWeightInput（kg→整数克）、parseMinutesInput、captureDateSelection。十进制字符串转换超精度拒绝，不做浮点舍入。

生产默认库LifeIndexV4，Dexie逻辑schema1（原生IndexedDB版本为Dexie对应版本10）。不枚举、打开、迁移或清空旧库。测试显式注入独立库名、时钟、UUID生成器；生产没有fixture开关。App shell持有一个稳定服务，初始化完成后开放页面。方法内部也能确保初始化；database.close仅关闭本连接，不删除数据。

每次查询返回`{data,stamp:{generation,revision}}`。页面使用services.observe订阅，卸载退订，失败单独呈现；组合不同查询时核对stamp，不把两代数据合并。observe先在订阅范围外初始化，再以显式async进入Dexie liveQuery，使native await之后的读取仍受观测。错误均为固定DomainError code，可选field只指字段，不展示原始数据库异常。

create/update/remove等接口及全部字段以[架构v3](../../design/v4/ARCHITECTURE.md)为准。偏好getAll返回values和revisions；键为appearance、weightTarget、lastExportedAt、localNoticeSeen，初值system/null/null/false。services.database不向UI暴露表；测试可直接实例化内部V4Database检查状态。

## 事务与幂等

`database.ts`集中处理首建、读取快照和写入闸门。首建在包含meta的事务内只播种19个固定合法UUID分类与4个偏好；meta存在后不重复补种。初始化失败保留库并允许重试。

当前服务的显式事务覆盖九表，meta提供跨连接串行化；查询实际读取按领域日期索引限制，liveQuery跟踪实际访问。所有实际业务变化递增meta.revision；无变化不递增。每个命令携带commandId、expectedGeneration、expectedRevision；编辑另携实体revision。generation先校验，恢复后的旧草稿不可写入新代。

创建实体ID取commandId：实体仍存在、同命令/同规范化payload重试返回原结果；ID不存在时必须匹配创建意图原expectedRevision。已创建后被删除的旧请求不能复活事实。保守代价是无关写入也可能使未提交创建意图冲突，UI必须保留草稿并提示重新检查，不能静默换stamp重提。

习惯check与父habit revision同事务更新；撤销后旧完成请求被父revision挡住，scheduleEffectiveFrom不被check改动。所有完成调用传desired，而不是可被重复反转的toggle。分类归档保留引用；activate重新验证同域active规范名唯一，冲突不合并。删除使用中的分类拒绝，UI改走归档。

## 日期与读模型

交易/体重/运动只保存day精度localDate及所选日的offset语义，不制造消费/测量时刻。createdAt只表示录入时间；修改保留createdAt。今日习惯完成记录instant，过去补记为day；跨午夜保存仍使用可见所选日。专注按startedAt捕获日归属。

Today返回独立habits/finance/records快照。习惯进度为scheduledCompletedCount/scheduledCount；completedCount包括当天全部完成事实，计划外不进入计划分子。历史只展示事实，不回推当前计划缺勤。记录有timed/dayOnly两个分组与recent3；getRecords默认每组20，用户展开可增加正安全整数limit至完整日期范围，hasMore真实反映截断。常规历史分页默认50、最大100，游标绑定generation。

体重趋势按localDate取当日createdAt/id最后录入，完整历史保留全部；最近值按事实日优先，排除相对本机今天仍未来的导入记录。月收支、周运动按明确日期半开区间查询；统计不能用分页长度代替总数。

## 专注与备份

clock.ts只做时钟快照和纯计算。app级FocusController负责ticker、可见性恢复与reconcile。domain提供start/pause/resume和prepareCompletion/finalizeCompletion两个真实事务：prepare先持久paused+pending，finalize转换同一行completed。首阶段失败由controller保留固定CompletionAttempt重试；第二阶段失败的pending可重开恢复。自然结束使用原目标终点，暂停时间不累计，毫秒保留；显示两整数秒互补，不能分别floor。completed编辑只改标题/分类/备注；remove只删completed，discard只删未结束。

备份为lifeindex-v4-backup/formatVersion1/schemaVersion1，包含八业务表和所有持久专注状态，不包含meta。原始文件上限50MiB，预览15分钟单调时间TTL。backup-schema.ts先严格验证字段/范围/引用/唯一性/精度与专注union；预览绑定目标generation/revision。返回UI的预览与内部候选隔离，修改UI对象不能改变恢复内容或stamp。

restore在同一九表读写事务中再次检查stamp、验证候选、clear/add、核对数量并更换generation；中途失败回滚全部业务表与meta。其他连接写先则预览失效，恢复先则旧命令generation冲突。导出一致只读快照，只得到完整一代。实际文件交付由UI完成，成功后才单独更新lastExportedAt；取消分享不更新。预览正文/token只在内存，不进入URL、缓存或日志。

## 日志与检查证据

core/errors.ts使用运行时枚举白名单过滤日志，仅operation、阶段、固定failureClass；不记录标题、备注、金额、体重、日期、实体ID、token、正文或原始error.message。命令进入、无变化、成功、异常分支均有日志，提交成功只在事务真正完成后记录。关键事务/重放/精度/订阅边界有说明责任的注释。

本作者测试位于tests/unit/v4、tests/integration/v4，全部合成数据。故障测试修改真实IDBObjectStore.add/put的执行分支，恢复用例确认categories已写入后在weightEntries注入失败，随后关闭/重开逐九表比对，未用一个mock reject代替回滚证据。

已发现并修复：liveQuery同步外壳丢失await后的观测上下文；关闭连接后直接观察会将初始化写事务放进liveQuery只读范围。两者都有先失败、后修复的回归，覆盖同服务/peer写入通知与退订。

验证命令：

```sh
pnpm exec vitest run tests/unit/v4/ tests/integration/v4/
pnpm exec eslint src/core tests/unit/v4 tests/integration/v4 --max-warnings 0
pnpm exec prettier --check src/core tests/unit/v4 tests/integration/v4 docs/development/v4/CORE.md
pnpm exec tsc -p tsconfig.app.json --pretty false --incremental false
```

测试路径末尾的`/`用于限定本作者目录，不把独立审核的v4-review结果混为作者套件。2026-09-29首轮6文件22项通过；扩充到29项时订阅回归首次失败并修复，随后筛选曾含独立controller3项、共32项通过。最新本作者限定目录完整运行于2026-09-29 00:15：6文件30项全部通过；同批ESLint、Prettier和全项目TypeScript检查均为0错误。源码仍需独立审查以及真实浏览器IndexedDB/离线、全产品QA与冻结性能预算验证，不用fake-indexeddb通过替代这些门槛。
