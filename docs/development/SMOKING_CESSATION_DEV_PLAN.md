# 戒烟模块开发与验证计划

**状态：** G1 已通过，本地实现阶段。2026-09-14。实际目录与冻结规则见 [CESSATION_V3](../architecture/CESSATION_V3.md)，下方目录树为原设计拆分建议，不是实际文件清单。
**输入：** [PRD](../product/SMOKING_CESSATION_PRD.md)、[UI](../design/SMOKING_CESSATION_UI.md)、[ADR-0009](../adr/0009-lightweight-smoking-cessation.md)。

## 1. 当前证据

已上线 HealthPage 使用 WeightRepository、ActivityRepository 与嵌入式 HabitsPage；复用 Sheet、Icon、useDirtyForm、useLiveQueryState、privacy-safe logger。数据/备份 V2，9 个存储；React/TypeScript/Vite/Dexie/Zod/Vitest/Playwright 已就绪。没有理由为戒烟引入新框架、后台或第三方 SDK。

## 2. 拟议目录与责任（尚未创建）

```text
src/features/health/cessation/
  CessationCard.tsx            健康内摘要，不承担存储逻辑
  CessationPage.tsx            详情、子流程组合
  PlanForm.tsx                开始计划与输入校验反馈
  CravingSheet.tsx            短时支持与结果保存
  SmokingForm.tsx             吸烟事件与更正
  CessationCalendar.tsx       日状态/日详情
  cessationDomain.ts         纯函数统计与状态推导
  supportContent.ts          自有简短文案与核验后的来源
src/data/repositories/CessationRepository.ts
src/data/db/{schema,LifeIndexDatabase}.ts
src/data/backup/{schema,BackupService}.ts
src/shared/domain/types.ts
tests/unit/cessationDomain.test.ts
tests/integration/cessationRepository.test.ts
tests/integration/cessationBackup.test.ts
tests/e2e/cessation.spec.ts
```

以上仅为目录方案。组件随职责需要拆分，不为每个按钮增加框架；日历优先复用已有语义/日期工具，不抽象整个应用。路由沿现有 Hash 路由增设健康子路径，具体路径在 M2 核对 App 路由后冻结。

## 3. 数据方案与必要不变量

数据库与备份格式均升级至 V3，新增三个 store；保留 V1/V2 声明及全部旧数据。最终字段已冻结在 CESSATION_V3 和 types.ts：下方概念字段中的 offset 由计划级不可变 IANA timeZone 替代，日/事件不重复存 offset。

| 存储 | 概念字段 | 索引/规则 |
| --- | --- | --- |
| cessationPlans | id、startAt/startLocalDate/offset、可选 endAt/endLocalDate/offset、reason、可选日均支数/每包支数/价格分/CNY、审计时间 | id、startAt；跨页事务保证最多一个未结束计划。历史区间不重叠 |
| cessationDays | id、planId、localDate、kind(snapshot/fullDay)、reportedAt、offset、审计时间 | 唯一 [planId+localDate]；只记录肯定确认，缺失不等于成功 |
| cessationEvents | id、planId、kind(smoking/craving)、occurredAt、localDate、offset、smoking.count 或 craving.outcome、可选 trigger、审计时间 | [planId+localDate]、[planId+occurredAt]；判别联合，禁止不适用字段 |

“准备/进行中/已结束”和时长、节省、日状态均为派生数据，不持久化计数器。隐藏入口为 settings 中一个明确的类型化偏好，不用 localStorage。

关键规则：

- 新建计划在事务中检查活跃计划；用户必须先明确结束旧计划，再新建，不隐式关闭。生成操作 UUID 支持重复提交幂等，不依赖按钮禁用保证一致性。
- smoking 写入/编辑与受影响日期确认撤销在同一事务内完成；跨日修改须核对旧、新两日。删除事件后保持未确认，绝不自动制造“全天无烟”。
- fullDay 仅可作用于已结束且完整在计划内的本地日；snapshot 只代表 reportedAt 之前，跨日需人工确认。计划开始/结束的部分日单独标记。
- 正在进行计划不能记录未来事件；历史计划更正只能落在原区间。计划创建即冻结起点/基线；原因可编辑。跨时区归属使用计划时区日期键，不因显示设备变更而移动事实。
- 货币只用整数分；舍入一次；范围、日期合法性、引用、重复键、唯一活跃计划、日状态矛盾都在 Repository 与备份验证层检查。
- 不记录自由文本症状/病史、地理位置或药物；日志仅事件代码、操作类型和错误分类，不含日期、原因、诱因、支数、价格、时长或原始异常内容。

## 4. 实施顺序与关联文档

| 工作包 | 依赖 | 实现内容 | 同步文档 | 退出检查 |
| --- | --- | --- | --- | --- |
| D0 规格冻结 | 用户通过 G1 | 确认状态、日边界、未来计划、结束重启、隐藏入口、价格口径与备份版本 | PRD/IA/HLD/LLD/DATA_MODEL/BACKUP_SCHEMA/ADR/追踪矩阵 | 每条 SQ 有代码责任与测试映射，无未决数据规则 |
| D1 数据纯函数 | D0 | elapsed/dayStatus/estimate、有效区间/日期校验 | LLD/TEST_PLAN | 未记录/部分日/夏令时/月底/闰年/时区/舍入测试 |
| D2 Repository 与备份 | D1 | 三存储、事务不变量、旧格式迁移、恢复原子性 | DATA_MODEL/BACKUP_SCHEMA/DEV | V2 实库升级、旧备份迁移、冲突拒绝与失败回滚 |
| D3 计划与每日记录 | D2 | 卡片、详情、计划表单、快照/全日确认/撤销、隐藏 | UI/PRD | 正常/错误/重复提交/跨日回归，体重运动习惯不退化 |
| D4 烟瘾与吸烟 | D3 | 可选诱因、短休息、保存结果、吸烟事件、更正 | UI/LLD | 不写 Focus/习惯，互斥事务、后台时间重算、保存失败保留 |
| D5 回顾/支持/管理 | D4 | 月历、来源、估算、历史计划、结束/重启 | PRD/操作指南 | 无基线/未知日不显示假收益，外链不含个人数据 |
| D6 全量回归 | D5 | format/lint/typecheck/unit/integration/build/e2e/axe/隐私/升级 | TEST_PLAN/追踪矩阵/风险清单 | 无既有回归，双主题/窄屏/离线/备份通过 |
| D7 发布与归档 | G2、D6 | 正常 CI/Pages/线上冒烟、验收、tag/Release | DEPLOYMENT/CHANGELOG/Release/计划 | 实际版本与提交一致，专项限制明确，不自动套用 V2 豁免 |

## 5. 迁移与恢复验收（不得省略）

1. 在真实 V2 数据库夹具中填入 9 个存储的合成记录 → 升级 V3 → 原记录/设置/索引语义不变，三个新 store 为空。
2. V0/V1/V2 备份先在内存迁移到 V3，新增字段为明确空集合而不是虚构戒烟记录。旧备份恢复是全量替换：预览必须说明将移除当前戒烟记录，用户确认后才执行。
3. V3 全量导出/恢复，含隐藏设置、未来/历史计划、快照、全日确认与事件；嵌入合法性/引用/互斥校验；篡改、孤儿引用、多活跃计划、未来事件、重复键等不能覆盖现库。
4. 恢复中模拟失败：所有旧/新 stores 全部回滚，不能只恢复原九表。更新备份最大体积/条数与“实际记录数”展示。
5. V2 不能读取 V3 备份：必须说明降级风险，不以重新部署旧代码作为数据库降级。恢复只能走有验证的协议；发布前再次确认 V2 当前备份。

## 6. 自动化映射

| 需求 | 核心自动化 |
| --- | --- |
| SQ-01–03 | 新/已有用户入口；仅一个未结束计划；过去/未来范围；隐藏恢复；结束新建保留历史 |
| SQ-04–05 | 今日快照非全天；午夜后待确认；未记录不算成功；开始结束部分日；补记/撤销/幂等 |
| SQ-06 | 诱因可跳过；关闭无写入；结果保存；时间前进/挂起恢复；Focus 数据不变 |
| SQ-07–08 | 次数边界；吸烟撤销确认；跨日编辑；删除不伪造确认；事务并发/重试/失败 |
| SQ-09–10 | 历史数据重算；月份跳转；无数据/不完整基线；估算整数与舍入；无 Finance 写入 |
| SQ-11–12 | 静态支持离线；外链无个人参数；日志无隐私；旧库升级/备份验证/失败回滚 |

浏览器：Chromium + WebKit，320/390 宽度，浅/深色、44 px 触点、表单等宽、键盘导航/焦点/无障碍、错误注入、取消保留与加载错误。保留现有已知 WebKit 整页离线刷新限制，新增离线写入与重开覆盖。Pages 测试检查 `/LifeIndex/` 路径和实际候选版本。

真实 iPhone 的系统键盘、桌面离线冷启动、后台冻结、Files/iCloud 与存储清理行为仍独立标注。本版本是否以自动化验收并延期专项，需在发布阶段明确记录。

## 7. Git 与开发纪律

G1 前只保留可审阅文档，不动 src/package/schema/工作流。批准后从干净基线创建 `codex/v2.1-smoking-cessation`（若已存在先检查），按 D0–D7 小步提交；不覆盖用户未提交修改、不强推 main。注释解释关键分支和状态，日志只发允许的业务类别，文档与每次代码变更同批更新。发布前审查忽略规则，禁止将个人数据、备份和生成构建提交仓库。
