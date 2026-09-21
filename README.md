# LifeIndex

Index your life.

LifeIndex 是面向 iPhone 的本地优先生活记录 PWA，包含今天、健康（体重、运动、习惯）、专注、记账和设置。数据保存在本机 IndexedDB；应用外壳支持离线，JSON 备份由用户自行保存和恢复。

当前版本标识：**3.3.0**；内部包版本：`3.3.0`。本次发布验证状态见 [交付计划](PLAN.md)，版本标识不代表已经部署或通过真机验收。

## 开发

需要 Node.js ≥20.19.0 和 package.json 指定的 pnpm。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

质量检查：`pnpm quality`；浏览器验证：`pnpm test:e2e`。生产 PWA 行为使用构建预览验证，详见 [开发指南](docs/development/DEV.md)。

## 文档

- [产品基线](LifeIndex-Project-Baseline.md)与[范围决策](docs/adr/0001-current-product-scope.md)
- [产品需求](docs/product/PRD.md)与[信息架构](docs/product/INFORMATION_ARCHITECTURE.md)
- [架构](docs/architecture/HLD.md)、[详细设计](docs/architecture/LLD.md)、[数据模型](docs/architecture/DATA_MODEL.md)、[备份契约](docs/architecture/BACKUP_SCHEMA.md)
- [设计指导](docs/design/UX_UI_GUIDE.md)、[当前 UI 实现](docs/development/CURRENT_UI.md)与[视觉资源](docs/design/assets/README.md)
- [测试计划](docs/testing/TEST_PLAN.md)、[PWA 使用](docs/operations/PWA.md)、[部署](docs/operations/DEPLOYMENT.md)、[iPhone 验收](docs/operations/IPHONE_ACCEPTANCE.md)

数据仅在当前设备和浏览器来源内保存。定期导出备份；更新时沿用原入口，不清除网站数据。备份文件不进入仓库。
