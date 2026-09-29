# LifeIndex PWA 使用与数据安全

首次通过 HTTPS 联网打开，完成应用外壳缓存后可离线使用核心记录。iPhone 可在 Safari 添加到主屏幕；浏览器与安装入口应保持同一来源。业务记录存于 IndexedDB，Service Worker 仅缓存应用外壳。

## 日常使用

今天查看概览；健康记录体重、运动和习惯；专注开始计时并在结束后保存；记账记录收支和查看报表；设置管理外观、分类及备份。公开版本显示「3.3.0」。

定期在设置导出 JSON，并自行确认文件已保存到 Files 或 iCloud Drive。恢复先选择文件、查看有效预览，再明确确认完整替换。支持格式和失败保证见 [备份契约](../architecture/BACKUP_SCHEMA.md)。

## 更新

联网打开原入口，在更新提示出现后保存当前输入并确认更新。应用发现更新与激活更新分开处理。不要通过卸载或清网站数据处理显示问题；该操作可能影响本地记录。图标也可能受 iOS 安装缓存影响。

## 链接操作

支持习惯打卡和开始专注。链接参数位于 fragment，打开后先严格校验，再由用户明确确认；业务结果与回执原子保存，重复操作不重复写入，完成或取消后清理输入。链接包含个人信息时不得放入日志、截图或公开问题报告。

入口为 `#/action/check-habit?...` 或 `#/action/start-focus?...`，不是远端 HTTP API。参数使用 URL 编码；未知字段、重复字段、无效编码和无效类型均拒绝。

| 操作 | 参数 | 约束 |
| --- | --- | --- |
| 两种操作 | actionId | 必填，小写 UUID；持久回执保证幂等 |
| check-habit | habitId | 必填，小写 UUID；习惯须可用且当日符合计划 |
| check-habit | localDate | 可选，YYYY-MM-DD；默认当前本地日期 |
| start-focus | title | 必填，trim 后 1–100 字符，NFC 规范化 |
| start-focus | durationMinutes | 可选，整数 1–240，默认 25 |
| start-focus | categoryId | 可选，可用的专注分类 UUID 或内置分类 ID |
| start-focus | note | 可选，trim 后 1–500 字符，NFC 规范化 |

已有 active 专注时不能重复开始。链接预览不写入；仓储会再次检查引用、计划与状态，防止预览后数据变化。详细实现契约在 `src/app/actions/actionParser.ts` 和 `ActionService.ts`。

## 排查

离线外壳未就绪时先联网完成一次加载；存储失败时保留输入并检查可用空间；备份不支持或无效时选用支持格式文件，不改变当前数据库。系统文件菜单取消应回到应用并可继续操作。

真机主屏幕、后台计时、系统文件及更新的结果见 [验收清单](IPHONE_ACCEPTANCE.md)，未确认项不能视为通过。
