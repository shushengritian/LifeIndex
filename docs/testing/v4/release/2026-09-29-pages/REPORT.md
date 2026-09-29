# LifeIndex 4.0 实际 Pages 独立验收

**8项通过，0失败、0跳过、0重试，47.7秒。** 独立执行者：`/root/qa_release`。执行时间：2026-09-29 04:12:12–04:13:00 UTC。目标：[实际 GitHub Pages](https://shushengritian.github.io/LifeIndex/)。

开跑前本地HEAD为`57f4a2fface997c8dbbcedd3cbe64293f87da147`，每个用例的ready断言核对线上`data-app-build`为同一完整SHA，版本`4.0.0`。工作区当时存在root正在整理的发布文档变更，本验收未修改应用或测试源码。部署流水线[36519399083](https://github.com/shushengritian/LifeIndex/actions/runs/36519399083)的deploy job已完成后才开始运行；本报告记录独立本地浏览器访问线上结果，不替代或冒充云端smoke结果。

执行命令：

```sh
LIFEINDEX_DEPLOYED_URL=https://shushengritian.github.io/LifeIndex/ LIFEINDEX_EXPECTED_BUILD_ID=57f4a2fface997c8dbbcedd3cbe64293f87da147 node node_modules/@playwright/test/cli.js test --config playwright.v4-deployed.config.ts --output=/tmp/lifeindex-v4-pages-results --reporter=line,json
```

| 验证项 | Chromium | WebKit |
| --- | --- | --- |
| 构建身份、深路由、首页axe、manifest/icon/font资源及SW scope | 通过，实际HTTPS | 通过，实际HTTPS |
| 三类真实录入、精确值持久化、回执详情返回来源、隐私哨兵检查 | 通过，实际HTTPS | 通过，实际HTTPS |
| 专注启动、暂停、继续、完成且仅保存一次 | 通过，实际HTTPS | 通过，实际HTTPS |
| 离线刷新、未访问lazy页、本地写入、备份导出及再刷新 | 通过，实际HTTPS origin | 通过，已发布字节的本地代理origin |

所有context均新建，只有合成记录，无用户profile、真实个人数据或服务器业务写入。公开资源采样HTTP均200；HTML的8个资源引用均在`/LifeIndex/`下；manifest id、scope、start_url均为`/LifeIndex/`，实际HTTPS SW scope在两个引擎的身份用例中均匹配目标URL。

## 离线及设备边界

Chromium使用实际`https://shushengritian.github.io/LifeIndex/`来源，通过浏览器离线模拟后断言未缓存探针请求失败，再执行刷新、写入、导出及reload。

WebKit仅离线专项使用`http://127.0.0.1:60619/LifeIndex/`代理：上游取自同一已发布HTTPS URL，保留子路径；SW就绪后断开TCP，探针失败并实际拒绝16次请求，随后离线业务断言通过。由于已记录的WebKit引擎`setOffline + reload`限制，**此项不宣称验证了发布HTTPS origin的WebKit离线刷新**。WebKit其余3项直接访问实际HTTPS，代理在finally关闭。

这是桌面Playwright Chromium及WebKit验证。**实体iPhone未测试，主屏安装、系统后台/存储回收行为不在本次签收范围。** 两引擎线上专项通过不把旧历史失败改写为通过，也不扩大为全部线上功能矩阵。

## 可复核证据

- [完整运行日志](deployed.log.txt)：原始line与JSON输出，保留版本、各例和离线方式日志。
- [结构化结果](results.json)：8个实际用例、时长、零skip/retry统计及附件。
- [来源证据](origin-evidence.json)：published/effective origin、断网方式和拒绝请求数量。
- [公开资源快照](resources.json)：采样时间、URL、HTTP状态、SHA256、资源引用及manifest。

线上index SHA256：`c6a64805b0d6af993e31660f86091e0ad6f8fc903c4ee9305c3e57ee769e127b`。线上SW SHA256：`41b0cc338edd054a6dc562ce81d27a579e28b6afe277dd2d54deceaca9e9dffc`。

浏览器执行已正常退出。没有常驻预览进程，也未提交生成构建、IndexedDB或备份文件。
