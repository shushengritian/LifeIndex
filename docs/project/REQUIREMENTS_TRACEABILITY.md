# 当前版本需求与验证映射

| 范围 | 实现位置 | 验证 |
| --- | --- | --- |
| 今天聚合 | src/features/today | 当日数据与保存后刷新 |
| 健康与习惯 | src/features/health、src/features/habits | 体重、运动、计划日、打卡唯一性与历史 |
| 专注 | src/features/focus | active 唯一、计时恢复、完成保存与汇总 |
| 收支与报表 | src/features/finance | 整数金额、分类引用、日历范围与空态 |
| 设置 | src/features/settings | 外观、分类、备份预览与确认 |
| 数据库 | src/data/db、src/data/repositories | 新建 V5、原生 40→50、记录保持与失败回滚 |
| 备份 | src/data/backup | V0/V1/V2/V5、拒绝版本、九表原子恢复 |
| PWA | src/pwa、src/sw.ts | 外壳缓存、更新保护、离线及子路径 |

需求见 [PRD](../product/PRD.md)，具体门槛见 [测试计划](../testing/TEST_PLAN.md)。本表为定位索引，不声明测试已通过。
