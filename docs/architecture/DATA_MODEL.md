# LifeIndex 数据模型

当前版本数据库逻辑版本：5（Dexie 对应原生 IndexedDB 版本 50）。本页定义当前契约，验证状态见 [计划](../../PLAN.md)。

| 表 | 主键与主要字段 | 约束 |
| --- | --- | --- |
| categories | id；domain、transactionType、parentId、name、icon、color、sortOrder、archived | domain 为 finance/focus/activity；记账分类最多两级；引用及图标合法 |
| transactions | id；type、amountMinor、currency、categoryId、occurredAt、localDate、timezoneOffsetMinutes、note | 金额为整数最小货币单位；分类匹配收支类型 |
| habits | id；name、icon、color、schedule、startLocalDate、status、pausedAt、note | 每日或指定星期；active/paused |
| habitRecords | id；habitId、localDate、completedAt、timezoneOffsetMinutes、note | habitId 与日期组合唯一，引用存在 |
| focusSessions | id；status、title、categoryId、startedAt、plannedDurationSeconds、expectedEndAt、endedAt、durationSeconds、completionKind、localDate、note | 最多一个 active；completed 具有结束信息；时长以秒计 |
| settings | key、value、updatedAt | 按键类型校验且唯一 |
| actionReceipts | actionId、actionType、handledAt、outcomeEntityId | 与对应业务结果同事务写入；actionId 唯一 |
| weightEntries | id；weightGrams、measuredAt、localDate、timezoneOffsetMinutes、note | 整数克，合法测量时间 |
| activitySessions | id；categoryId、durationMinutes、intensity、occurredAt、localDate、timezoneOffsetMinutes、note | 运动分类有效；强度 light/moderate/hard |

业务实体按类型携带 createdAt/updatedAt；完整字段以 `src/shared/domain/types.ts` 和 `src/shared/validation/schemas.ts` 为准。索引以 `src/data/db/schema.ts` 为准；日期、类别、状态、排序及更新时间支持查询。

当前设置键：appearance（value 为 system/light/dark）、currency（value 为 `{ code: 'CNY' }`）、onboarding、lastSuccessfulExportAt、weightTarget（value 为 `{ weightGrams: number }`，整数克）。

onboarding 的 value 包含 localDataNoticeSeen 与 backupNoticeSeen 两个布尔值；lastSuccessfulExportAt 为 ISO 字符串。focusSessions 同样保留 timezoneOffsetMinutes，completionKind 为 timer/early。所有可选 note 字段不进入日志。

## 升级契约

新建数据库只建立上述九表。对既有数据库，以当前表定义构造版本 5：保留当前表数据、更新必要索引，并依据当前表集合处理非当前存储；设置按当前键白名单整理。升级在版本事务中进行，失败不得留下部分升级数据。

测试使用原生版本 40 的合成数据库（包含当前表和附加测试表），打开后验证版本 50、九表集合、有效数据逐条保持、索引可查、设置键正确及失败回滚。数据库逻辑版本、备份格式版本与应用版本不可混用。
