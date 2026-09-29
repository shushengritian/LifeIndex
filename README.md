# LifeIndex

Index your life.

LifeIndex 是面向 iPhone 的本地优先生活记录 PWA，包含今天、健康（体重、运动、习惯）、专注、记账和设置。数据保存在本机 IndexedDB；应用外壳支持离线，JSON 备份由用户自行保存和恢复。

开发版本：**4.0.0「日常调频」**，正在独立验收，尚未部署。既有入口为[LifeIndex](https://shushengritian.github.io/LifeIndex/)，当前线上仍为3.3.0。最终部署与验证证据见[4.0发布记录](docs/releases/v4.0.0.md)和[交付计划](PLAN.md)。

## 开发

需要 Node.js ≥20.19.0 和 package.json 指定的 pnpm。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

质量检查：`pnpm quality`；浏览器验证：`pnpm test:e2e`。生产 PWA 行为使用构建预览验证，详见 [开发指南](docs/development/DEV.md)。

## 文档

4.0 当前实现以[新版使用与范围](docs/product/V4.md)、[冻结设计](docs/design/v4/FREEZE.md)、[架构](docs/design/v4/ARCHITECTURE.md)、[数据服务](docs/development/v4/CORE.md)、[应用流程](docs/development/v4/SHELL.md)、[领域页面](docs/development/v4/FEATURES.md)和[验收矩阵](docs/testing/v4/ACCEPTANCE_MATRIX.md)为准。以下未标V4的历史产品/架构文档描述3.x，不是新版兼容要求。

- [新会话交接与代码定位](docs/project/HANDOFF.md)
- [产品基线](LifeIndex-Project-Baseline.md)与[范围决策](docs/adr/0001-current-product-scope.md)
- [产品需求](docs/product/PRD.md)与[信息架构](docs/product/INFORMATION_ARCHITECTURE.md)
- [架构](docs/architecture/HLD.md)、[详细设计](docs/architecture/LLD.md)、[数据模型](docs/architecture/DATA_MODEL.md)、[备份契约](docs/architecture/BACKUP_SCHEMA.md)
- [设计指导](docs/design/UX_UI_GUIDE.md)、[当前 UI 实现](docs/development/CURRENT_UI.md)与[视觉资源](docs/design/assets/README.md)
- [测试计划](docs/testing/TEST_PLAN.md)、[PWA 使用](docs/operations/PWA.md)、[部署](docs/operations/DEPLOYMENT.md)、[iPhone 验收](docs/operations/IPHONE_ACCEPTANCE.md)

数据仅在当前设备和浏览器来源内保存。定期导出备份；更新时沿用原入口，不清除网站数据。备份文件不进入仓库。
