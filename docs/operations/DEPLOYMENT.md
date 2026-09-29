# LifeIndex 部署与发布验证

应用部署为 HTTPS 静态站点。当前交付版本为3.3.0。部署和线上验证证据见[发布记录](../releases/v3.3.0.md)；发布必须由用户授权。

## 发布前

核对 [PLAN](../../PLAN.md)、[测试计划](../testing/TEST_PLAN.md)及 package 版本。执行质量、浏览器与数据库/备份验证，检查清洁构建与锁定依赖安装。真实记录、备份、凭据、生成 dist 不提交。

项目路径通过 `LIFEINDEX_BASE_PATH` 传入 Vite，例如：

```sh
LIFEINDEX_BASE_PATH=/LifeIndex/ pnpm build
pnpm preview
```

manifest、图标、Service Worker 路径和 Hash 导航须与 base 一致。仓库流程为 `.github/workflows/ci.yml` 和 `.github/workflows/pages.yml`。

## 发布后证据

记录源码提交、流水线、公开入口、实际版本及本次验证结果；使用 `LIFEINDEX_DEPLOYED_URL` 指向明确站点后运行 `pnpm test:deployed`。线上验证使用隔离浏览器和合成数据。将结果填入 [发布记录](../releases/v3.3.0.md)。

用户沿原入口联网更新，确认设置版本。提醒完成 [iPhone 验收](IPHONE_ACCEPTANCE.md)，不要求卸载或清网站数据。

## 恢复边界

应用文件回滚不能降级 IndexedDB，也不能改变已导出的备份格式。数据异常先保护本地记录及备份，选择兼容当前数据库的修复；不得清库作为升级失败的常规补救。发布失败与未完成验证分别记录，不宣称上线成功。
