# LifeIndex 开发指南

需要 Node.js ≥20.19.0 和 package.json 声明的 pnpm。依赖使用锁文件安装，无后端、密钥或原生工程要求。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

| 命令 | 用途 |
| --- | --- |
| pnpm format:check | 格式检查 |
| pnpm lint | ESLint |
| pnpm typecheck | TypeScript |
| pnpm test | 单元与集成测试 |
| pnpm build | 类型检查与生产构建 |
| pnpm preview | 构建预览 |
| pnpm test:e2e | Chromium/WebKit 用户流程 |
| pnpm test:deployed | 指定线上 URL 的验证 |
| pnpm quality | 格式、lint、类型、单元集成与构建 |

生产 Service Worker 通过 build/preview 测试。项目子路径构建使用 `LIFEINDEX_BASE_PATH=/LifeIndex/ pnpm build`。Playwright 浏览器需要与锁定依赖匹配；安装依赖执行脚本按 pnpm-workspace.yaml 的许可处理，不为通过检查而放宽策略。

## 代码约束

- 修改产品行为前读根目录 AGENTS、基线和计划；需求变化记录 ADR。
- 仓储封装持久化，纯函数表达规则；IndexedDB 为唯一业务主数据源。
- 关键逻辑、分支及状态转换增加解释原因的注释；日志覆盖入口、分支、成功状态与失败，禁止个人字段。
- 金额用整数分，体重用整数克，自然日用本地日期键。
- 数据结构修改须有明确升级和合成数据测试；备份恢复先校验后写入。
- 每次实现同步相关需求、设计、测试及使用文档；验证范围与改动匹配。

源码分为 app、features、data、shared、pwa、styles，职责见 [HLD](../architecture/HLD.md)。数据契约见 [数据库](../architecture/DATA_MODEL.md)和[备份](../architecture/BACKUP_SCHEMA.md)。

## 协作与发布

保护用户已有改动，不提交真实记录、备份、凭据或 dist。文件所有权由任务分配约束；文档整理不代表 UI/数据实现已通过检查。发布与真机状态写入 [计划](../../PLAN.md)，不能复用先前版本的测试结论。

当前 UI 实现和交接见 [CURRENT_UI](CURRENT_UI.md)。
