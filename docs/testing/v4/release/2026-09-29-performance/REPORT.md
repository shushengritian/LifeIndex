# 第五候选构建性能采集报告

状态：冻结自动门槛通过；独立性能复核由未修改本次CSS的审核角色执行。本报告不代签该独立复核，不代表物理iPhone或线上验收。

## 构建与方法

- 执行：2026-09-29 11:25:31–11:28:44（Asia/Shanghai）；单批完整49预算样本+2额外观察，零失败、零排除、零重试、无拼接。
- 源码：`c15269c0fdd4ab9c830c47695daab95141a2b0f8`，采集前后相同。dirty 7路径由主协调说明为文档变更；构建标签`fifth-build-c15269c`。
- dist前后SHA256均`dcbe8c5a22a05975fd172d7c5d34edfbc0aca609b38c491974ff30029dd219dc`；实际base path为`/`。若最终Pages使用子路径，需要另做子路径资源和线上验收。
- 协议`lifeindex-v4-performance-2`；夹具`lifeindex-v4-synthetic-1`、seed 4029、真实当地日期2026-09-29；预算`frozen-r3-v3`。预算和判定不因本次结果改变。
- Chromium 151.0.7922.34，Playwright 1.62.1；iPhone13设备参数，390×664、DPR3、触控、zh-CN/Asia/Shanghai、浅色、减少动效。CPU4×在导航前启用，SW block，无网络限速；真实键盘输入后取消并比较九表完整摘要。
- 同源极简页面预置数据不加载应用资源；每样本全新context。五个就绪区域、真实摘要、可达性、编辑器标签/单位/焦点/可编辑性均通过。

## 七组结果

单位ms，均为七个完整样本的中位数。原值及min/max在[evidence.json](evidence.json)；没有丢弃任何慢值。

| 组 | 样本数 | FCP | ready | chooser | editor |
| --- | ---: | ---: | ---: | ---: | ---: |
| F0-expense | 7 | 240.0 | 731.6 | 35.0 | 101.8 |
| F0-weight | 7 | 248.0 | 720.1 | 30.9 | 89.6 |
| F0-activity | 7 | 240.0 | 714.1 | 28.7 | 95.1 |
| F1-expense | 7 | 232.0 | 681.6 | 31.9 | 95.9 |
| F1-weight | 7 | 244.0 | 693.1 | 31.2 | 90.6 |
| F1-activity | 7 | 224.0 | 678.9 | 29.4 | 99.6 |
| F3-expense | 7 | 308.0 | 788.1 | 33.0 | 103.7 |

冻结上限：FCP400；F0/F1 ready1400、F3 ready2000；chooser/editor各350。全部49样本的最大值分别为376、997.4、52.8、157.5ms，也未越过对应门槛。最慢ready来自首条F0支出，最慢editor来自首条F3支出；两条均保留并附合成截图。

额外正常动效路径（第50条）ready681.2、chooser41.8、editor95.8；纯键盘路径（第51条）ready687.5、chooser29.4、editor88.4。两条均完成真实输入与取消后零写入，不混入预算统计。

## 资源与字体

递归JS逐文件gzip合计193163B（上限256000），CSS6932B（上限16384），内联脚本0；根SW与全部动态chunk计入。所有产物合计raw805779B；预缓存40项、raw782386B。完整逐文件hash/raw/gzip清单保存在证据JSON。

本地Vite preview实际对主要JS/CSS响应使用gzip，字体使用identity；并未把传输量当作逐文件预算。首条样本全部resource transfer334794B、encoded330594B、decoded684316B。Manrope.ttf raw164700B、独立gzip68860B，实际transfer165000B。其余图标/manifest均在清单中；此次初屏没有图标资源请求不等于产物未包含它们。

49条字体最终完成均早于ready，ready后目标几何变化均为0 CSS px。探针保留load-ready及后发loading-done快照，避免惰性文本请求漏记。首条字体完成484.2ms、ready997.4ms；字体完成时目标尚未渲染，空几何如实保留。抽查下列真实输入截图，主字段、单位、取消、保存均可读且可达；完整51张原始截图仍保存在本地run目录，独立审核可复看。

- [F0支出／最慢ready](01-F0-expense-1.png)
- [F0体重](08-F0-weight-1.png)
- [F1运动](36-F1-activity-1.png)
- [F3支出／最慢editor](43-F3-expense-1.png)

## 环境与证据边界

M1 Pro 8逻辑核、16GiB、AC100%，thermal为系统命令未报告警告。团队已暂停其他浏览器、构建与测试，但整机load average为起始16.93/15.75/16.72、结束15.63/15.35/16.32；本报告不宣称整机零负载。freeMemory约0.37–0.38GB仅是macOS free字段，不等于全部可用内存或内存压力判断。没有因主机负载删除、重跑或挑选样本。

完整报告：`test-results/v4-performance/2026-09-29T03-25-31-770Z-47552/report.json`；原始报告SHA256：`1be6d437ce885f1bd62856844f56fcd9f15689984d1f038cedc80aa54ef7cbeb`。每条JSON、Timing JSON、PNG、environment.json、samples.json均保留在该目录。执行日志：`/tmp/lifeindex-v4-performance-fifth.log`。长期摘要证据保存在本目录，所有记录均为合成数据，不含真实用户数据。

此前中止批次因临时Playwright默认outputDir清理丢失JSON/PNG，事故说明与剩余日志路径见[采集说明](../../PERFORMANCE.md)。本次是独立完整新批次，没有把重建数据冒充旧证据。

CPU采样已结束并明确释放，可恢复独立原生zoom检查。后续如改变生产JS/CSS，应由协调判断重采范围，不把本报告自动映射到未知构建。
