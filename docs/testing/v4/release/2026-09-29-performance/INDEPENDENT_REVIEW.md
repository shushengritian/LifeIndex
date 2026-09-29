# 第五候选构建性能独立复核

**结论：通过冻结性能门槛的独立复核。** 审核人`/root/review_release`，2026-09-29；没有修改被测生产代码、CSS或性能采集工具。本次是原始证据重算和截图/协议审查，不冒称由本人重跑整批浏览器采样。

## 独立核验

读取本目录REPORT/evidence及TEST_STRATEGY第6节，核对采集源码/profile/probe/artifacts/config，并读取原始report.json与完成日志。原始报告SHA256与保存值一致；长期保留的四PNG字节与原始run目录对应文件完全相等。

原始报告exclusions为空；49预算样本顺序1–49、两额外观察50–51连续，每组repetition1–7，无失败、无删除、无拼组。长期evidence的每条指标/状态/输入及取消结果与原始报告逐条相同，summary也相同。51条预置请求都只有同源blank页；配置单worker/retries0；每次newContext、导航前CPU4×、SW block、无网络限速的代码顺序符合冻结协议。正常动效及键盘分别保留，不混入49条预算。

从49条原值独立重算min/max/median并逐值核对summary，无差异。中位数如下，单位ms：

| 组 | FCP | ready | chooser | editor |
| --- | ---: | ---: | ---: | ---: |
| F0-expense | 240.0 | 731.6 | 35.0 | 101.8 |
| F0-weight | 248.0 | 720.1 | 30.9 | 89.6 |
| F0-activity | 240.0 | 714.1 | 28.7 | 95.1 |
| F1-expense | 232.0 | 681.6 | 31.9 | 95.9 |
| F1-weight | 244.0 | 693.1 | 31.2 | 90.6 |
| F1-activity | 224.0 | 678.9 | 29.4 | 99.6 |
| F3-expense | 308.0 | 788.1 | 33.0 | 103.7 |

FCP≤400；F0/F1 ready≤1400、F3 ready≤2000；chooser/editor≤350，七组均通过。最慢ready997.4为第1条F0支出，最慢editor157.5为第43条F3支出，均保留，未因冷启动较慢排除。原始每条readyChecks、五regionStates、字段label/unit/focused/editable、真实键盘改值、取消后数据库摘要不变全部成立。

## 产物与字体

独立读取当前dist全部42文件，逐文件重新计算SHA256及raw大小，均匹配采集清单；按清单顺序以name/NUL/bytes/NUL重算聚合哈希，得到`dcbe8c5a22a05975fd172d7c5d34edfbc0aca609b38c491974ff30029dd219dc`，同时等于采集前/后值。使用Node原生gzipSync逐文件重新压缩，与报告每文件gzipBytes完全一致。初次用Python gzip尝试交叉核验遇压缩实现差异，因此实际预算核验采用协议明确要求的Node口径，没有改报告值。

独立求和：JS193163B（含SW、动态chunk）<256000B，CSS6932B<16384B；inline脚本0；总raw805779B；precache40项、raw782386B。字体、图标、manifest未从产物清单删除。JS/CSS预算与实际传输口径仍分开：Manrope字体请求为identity；不能把其独立gzip大小冒充实际传输大小。

49条fontShift均0，各条最后fontCompletions时间早于ready。核对探针load-ready及loading-done双来源、就绪几何与后续字体几何比较：第一条字体完成时控件尚未生成，空几何保留，不把空快照伪装为完成布局。证据只支持被测目标在采集窗口内的字体位移为0，不宣称所有未来页面永远不会移动。

## 视觉及范围

实际查看四张保留截图，包括上述最慢ready/editor；金额、体重、运动字段及单位清晰，原生焦点框可见，取消与保存可达，没有发现需要排除样本的功能错误。截图在真实键盘输入后、计时完成后取得，不占用性能测量时间。

宿主load average较高、macOS freeMemory偏低已如实报告；没有据此改阈值或挑选样本。本结论只适用于c15269c第五候选、报告哈希对应产物、localhost/Chromium/iPhone13模拟视口/CPU4×协议。不是物理iPhone、公网延迟或Pages子路径签收；后续生产资源变化需协调判断重采，不能自动把结果转移到未知build。

可机读独立重算结果：[INDEPENDENT_RECALCULATION.json](INDEPENDENT_RECALCULATION.json)。本审核未发现未关闭的性能阻断，允许按原协议推进后续发布门槛。
