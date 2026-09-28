# LifeIndex 4.0 设计与架构冻结

决定：在独立 REVIEW_R3/REVIEW_R4 均通过后，由根协调冻结唯一“日常调频＋整行回应＋留一笔”，进入 M4 实现。纸签/轻推仅保留比较证据；后续改变语义需复查受影响问题，不继续无目的换风格。

独立签收输入：

- DESIGN_SYSTEM：`d01b47a67915a364bef478c6306744f2272562bfec5d5c83a0624f559987f031`
- ROUND_3_DESIGN：`6d7e84e5732c5f3d7d2f3c1efa5a5ed5079a1af642be8fadab7fc302b8699248`
- ARCHITECTURE：`cf6f2599a106ec56441da6b70904333b4678795a1e09bd0c5453f9d8037001ac`
- TEST_STRATEGY：`3b42349fc3efbf88b1ce59ba8d2f7d9a0ef69520bf9acc3b7e25460f9b1824bb`
- 原型9源码清单：`prototype-r4/screens/source-hashes.json`；清单SHA256 `e7c2d056a8d80060a896b0ac08d8203c8da21e75d3a4c5b3bdbafaa174e777ec`。

前述文档中的“待冻结”是评审输入状态，保留原文和hash，本决定推进阶段。独立报告给出具体异议、修订与解除证据；原型作者测试只支持设计门槛，不冒称生产验收。

## 实施前性能预算

按已签收 TEST_STRATEGY 冻结：FCP中位数≤400ms；首屏五区域就绪≤1400ms；选择器/编辑器可用≤350ms；全部JavaScript（含SW）gzip≤250KiB、全部CSS gzip≤16KiB。F0空库/F1代表数据×3入口×7次共42样本；F3长列表7样本首屏≤2000ms、编辑器≤350ms。环境为本地生产构建、Chromium、390×664、CPU4x、zh-CN、Asia/Shanghai、SW阻断、减少动态、单worker零重试。字体/预缓存/总资产另外报告。不得在测量失败后降低阈值。

## 实施与验收

按 IMPLEMENTATION_HANDOFF 分工，先core准确接口、再页面/应用流程集成。新版独立LifeIndexV4/Schema1，旧数据库不读、不迁移、不删除；正式版本与备份标4.0.0。所有核心行为、数据故障、响应/无障碍、离线、性能、CI、Pages和线上真实版本另验。真iPhone仍待用户执行并确认；不阻塞用户已授权的浏览器/WebKit发布。
