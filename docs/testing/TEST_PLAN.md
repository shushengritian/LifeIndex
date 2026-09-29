# 当前版本测试计划

版本：3.3.0。以下为验收要求，执行结果见[发布记录](../releases/v3.3.0.md)；物理 iPhone 待用户确认。

| 层次 | 必须覆盖 |
| --- | --- |
| 静态与构建 | 格式、lint、TypeScript、根路径及 Pages 子路径构建、版本显示 |
| 单元 | 金额精度、本地日期、计划日与打卡、专注计时和完成汇总、报表空态、校验与安全日志 |
| 数据集成 | 新建 V5 九表；原生 40→50 升级保持当前记录与索引；当前设置白名单；升级失败回滚 |
| 备份集成 | V5 往返；V0/V1/V2 导入；V3/V4/未知版本在写入前拒绝；计数/引用/唯一性；原子恢复失败 |
| 交互 | 五入口、记录与编辑、今天联动、查看/写入分离、草稿保护、失败重试、异日回看、焦点返回 |
| 浏览器 | Chromium/WebKit，深浅主题，320–430 宽度，键盘与滚动，离线读写、刷新持久化 |
| PWA | 外壳缓存、子路径、安装元数据、更新发现/确认/草稿保护 |
| 真机 | 主屏幕启动、后台和锁屏、Files/iCloud、系统菜单取消、离线重启、安全区、VoiceOver |

## 数据安全断言

无效备份、预览取消、版本拒绝、失效 token 都不写库。恢复注入中途写入失败后九表与操作前逐项相等。升级不能只验证新空库；使用合成附加表及未知设置键，断言有效数据保持。

专注 active 最多一条，完成保存与汇总一致；链接回执与业务记录原子写入，重复请求不重复创建。日志不得携带个人内容，测试 fixture 不使用真实数据。

## 执行及证据

运行命令见 [DEV](../development/DEV.md)。记录准确命令、日期、引擎、通过/失败/跳过数量和未覆盖边界。失败或跳过必须披露，不以重试隐去不稳定项。版本与源代码一致后，结果填写 [发布记录](../releases/v3.3.0.md)。

真机使用 [iPhone 清单](../operations/IPHONE_ACCEPTANCE.md)，仅用户实际确认后可标通过。浏览器模拟与历史视觉参考不构成本次设备证据。

## 测试运行器边界

Vitest 负责 `tests/unit` 与 `tests/integration`；`tests/e2e`、`tests/deployed`、`tests/performance` 均由各自 Playwright 配置收集。性能采集通过 `playwright test --config playwright.performance.config.ts` 单独执行，不参与 Vitest 的 jsdom 生命周期。

2026-09-28，4.0 草稿 PR 的 [CI 36440973014](https://github.com/shushengritian/LifeIndex/actions/runs/36440973014) 在全部 252 项既有测试通过后，因误收集新增性能 spec 而失败（`Playwright Test did not expect test() to be called here`）。已将性能目录加入 Vitest 的浏览器套件排除项，保留全部测试。修订后本机 Vitest 48 文件 / 252 项通过（17.90 秒），Playwright `--list` 仍收集 9 项性能测试；本次仅验证运行器划分，未重测或宣称 4.0 产品性能通过。
