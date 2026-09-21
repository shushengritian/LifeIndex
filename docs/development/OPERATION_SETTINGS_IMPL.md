# I5 设置、分类与备份交互实施

日期：2026-09-21。依据 [操作设计](../design/operation-refresh/DESIGN.md)与[交接契约](../design/operation-refresh/HANDOFF.md)，沿用 Ocean 双主题。Impeccable 仅手动参考 Operate/craft-floor；未运行 launcher、engine 或 hooks。

## 实现范围

- `src/features/settings/CategoryManager.tsx`：分类编辑器接入现有 structured Sheet；标题和关闭按钮固定，字段在 `.sheet-form-body` 滚动，保存/取消在固定底部。关闭按钮、取消、Escape 共用 dirty 检查；正在保存时同步锁阻止退出与重复写入。原生确认框打开时由其处理 Escape，避免同时关闭草稿。
- 一级分类保留彩色图标库及颜色选择，二级仅编辑名称；隐藏的旧图标/颜色仍保留，新增二级继承父类，不更改 V4 数据契约。紧凑列表、三点菜单、排序、归档及历史引用保持原行为。
- 分类校验/写入失败不卸载表单；错误获得 `preventScroll` 焦点，只把字段滚动容器回到顶部，原始输入仍可直接重试。复用全局隐藏滚动条规则，没有增加局部覆盖或禁止正常滚动。
- `src/features/settings/SettingsPage.tsx`：保留最后一次成功读取的显示快照，后续 live query 失败时不卸载分类编辑器或已校验的备份预览；失败明确提示并提供“重试读取”。该快照不写入存储、不替代 IndexedDB；重新读取成功后更新显示。
- 外观写入失败回退到最后成功读取的选择。设置操作失败焦点移到错误提示，但替换确认框打开时不抢走原生对话框焦点。取消预览清除操作错误并记录固定事件。

## 不变的安全流程

备份仍经过：文件大小/格式/版本与内容检查 → 服务端无关的本地 token 预览 → 明确确认替换 → 原子恢复。无自动恢复、合并或撤销功能；导出系统交接成功与时间戳记录失败仍区分。恢复失败保留同一预览供重试，恢复提交成功后外观读取失败不能声称数据回滚。本次没有修改 BackupService、数据库 schema、shared、global.css、PLAN、版本或依赖。

日志仅增加固定操作、状态、失败类别；不记录分类名称、备注、备份内容或其他个人记录。

## 验证与交接

定点命令：`node node_modules/vitest/vitest.mjs run tests/integration/category-name-only.test.tsx tests/integration/settings-safety.test.tsx tests/integration/backup.test.ts tests/integration/category-hierarchy.test.ts --silent --maxWorkers=1`。

结果：4 文件 / 30 项通过。其中新增：结构化编辑器关闭与 Escape 草稿保护、保存中关闭锁定及失败保留；分类草稿跨设置读取失败；备份预览跨读取失败/重试/取消不执行恢复。现有备份校验、原子性、主题回退与分类引用回归通过。

全项目 `tsc -b --pretty false`、本分工文件 ESLint（零警告）、Prettier 和 `git diff --check` 通过。并行测试复跑曾有一项触及默认 5 秒超时；未扩大超时或改变断言，限制单 worker 后 30 项全部通过。全量测试仍由主代理执行。

JSDOM 测试对原生 dialog 生命周期作替身，不证明 CSS 几何或原生焦点隔离。尚未进行本批真实浏览器短屏/双主题、滚动条可见性、iPhone 键盘、长按、文件选择与分享验收；全量回归、发布与真机清单由主代理负责。本分工不提交、不推送、不发布。
