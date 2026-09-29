# LifeIndex 备份契约

当前版本导出格式：`lifeindex-backup`，`formatVersion: 5`。导入支持 V0、V1、V2、V5。

## 文件结构

UTF-8 JSON，文件名 `lifeindex-backup-YYYY-MM-DD-HHmm.json`。解析前限制 50 MiB。顶层字段：

| 字段 | 内容 |
| --- | --- |
| format | 固定为 lifeindex-backup |
| formatVersion | 导出固定为 5 |
| appVersion | 内部应用版本，仅供说明，不决定兼容性 |
| exportedAt | ISO 导出时间 |
| source | timezoneOffsetMinutes、locale |
| counts | 当前九个数据集合的数量 |
| data | categories、transactions、habits、habitRecords、focusSessions、settings、actionReceipts、weightEntries、activitySessions |

集合字段见 [数据模型](DATA_MODEL.md)。快照在一致读事务内取得，集合按主键排序，计数重新计算；使用与导入相同的校验规则后序列化。

## 支持版本

| 输入格式 | 规范化 |
| --- | --- |
| V0 | 冻结 schema 校验，补空 actionReceipts 成 V1 |
| V1 | 冻结 schema 校验，补空 weightEntries/activitySessions 成 V2 |
| V2 | 校验当前公共数据，规范化为 V5 |
| V5 | 直接执行严格结构和完整性校验 |

V3、V4 及其他不支持的版本在任何数据库写入前返回明确的不支持版本错误；不静默舍弃数据。支持格式的规范化仅在内存中进行，不创建用户业务记录。

## 验证与预览

依次检查大小、JSON、格式/版本、字段类型、数量、主键和习惯日期唯一性、分类/习惯/业务回执引用、当前设置键及最多一个 active 专注会话。任何不一致均拒绝，当前数据库不变。

校验通过生成仅在内存保存、有效期 15 分钟的随机预览 token；展示来源版本、导出时间与记录计数。预览和取消都不写库。未知、过期或已消费 token 不可恢复。

## 确认恢复

用户确认后重验规范化数据，在一个覆盖九表的读写事务内替换，按依赖顺序写入并核对计数；任何失败中止事务，原数据保持。成功后消费 token 并刷新视图。恢复是完整替换，不是合并。

导出文件由浏览器分享或下载交给用户保存；最近导出时间不代表文件已进入云端。取消系统菜单不能显示恢复成功。对象 URL 使用后释放，日志不得记录备份内容或个人字段。

## 验证要求

覆盖 V5 往返、V0/V1/V2 导入、版本拒绝前不写库、无效字段/计数/引用拒绝、预览到期/重复消费、强制事务失败的全表回滚。测试只使用合成数据；执行结果见[发布记录](../releases/v3.3.0.md)。
