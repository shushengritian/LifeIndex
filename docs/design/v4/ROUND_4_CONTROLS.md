> 历史设计参考：4.0已撤回，当前产品为3.3.0。本文的定稿、实现与验收描述仅代表当时状态，不是当前实施指令。原型代码未恢复；历史原文件可在Git提交 `cea0d8b53c3686cdefb2b99f824d80e08bda5d8c` 中查看。

# R4：重新设计动作与完成反馈

日期：2026-09-28。作者：根协调。状态：**三个可操作方案，主推整行回应；尚未独立签收，不是生产定稿。**

## 输入与范围变化

用户直接指出：“为什么还是这种对号，加号的按钮，真的没有其他设计思路了吗”。R2方向通过不代表这组控件获得认可。本轮重新设计习惯动作面、完成反馈与全局记录入口；保留准确数据、一步完成、详情不写入、两步到编辑器等任务要求。R1/R2历史稿与评审记录保留，R3剩余契约问题继续解决，不以第四轮编号替代第三轮独立审核。

本轮使用Impeccable手册的人工上下文方式和Emil交互原则。项目限制禁止运行launcher/engine/hooks，未运行、未安装额外依赖、未调用收费素材或API。Skill中要求用户逐项选择的默认流程由本次已授权的自主决策替代，不新增确认步骤。

## 三种真实交互

[三方案对照页](https://github.com/shushengritian/LifeIndex/blob/cea0d8b53c3686cdefb2b99f824d80e08bda5d8c/docs/design/v4/prototype-r4/compare.html)将同一套完整原型并排展示。每个页面保留全部领域及可操作记录流程，全部是隔离内存合成数据，刷新重置。页面通过相对路径复用R3状态代码、字体和样式，以便修订共享事实规则而不复制三份业务逻辑。

| 方案                                                          | 动作和完成状态                                                                                        | 取舍                                                                                             |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [整行回应](https://github.com/shushengritian/LifeIndex/blob/cea0d8b53c3686cdefb2b99f824d80e08bda5d8c/docs/design/v4/prototype-r4/index.html) | 整条习惯是明确标注的完成动作面；点按后整行变为完成底色，并显示“今天已记下 · 点按撤销”。独立“详情”只读 | 主推方向：触区更大，变化发生在内容本身；需清楚文案避免把标题动作误认为详情                       |
| [完成纸签](https://github.com/shushengritian/LifeIndex/blob/cea0d8b53c3686cdefb2b99f824d80e08bda5d8c/docs/design/v4/prototype-r4/index.html)   | 名称负责查看；文字纸签“做到了／记录完成”变为“已记下／点按撤销”                                        | 操作分工最熟悉，但仍保留列表旁的独立动作区；不作为默认方案                                       |
| [轻推留痕](https://github.com/shushengritian/LifeIndex/blob/cea0d8b53c3686cdefb2b99f824d80e08bda5d8c/docs/design/v4/prototype-r4/index.html)   | 可向右轻推完成，底层出现动作提示；仍可单击或按Enter；未过阈值/取消不写入                              | 具有触摸特点；手势是补充入口，不能成为必需操作。当前仅鼠标拖动模拟验证，不宣称真实触摸或真机完成 |

全局入口改成有明确动词的“留一笔”，采用原创笔形几何SVG辅助识别。加号不再承担中心动作。习惯完成不使用加号、对号或仿复选框。详情、撤销、输入焦点和错误恢复继续明确存在。

## 修订与自测

| Before                                | After                                                    | Why                                                                |
| ------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| 列表旁统一加号/勾选，主要依靠变色区分 | 三种不同动作范围与回执，主推整行显现状态                 | 用户反对的不是图标颜色；必须调整点击区域、动作语言与状态反馈       |
| 中心按钮放大加号                      | “留一笔”文案与笔形图标，仍为动作而非第五个路由           | 清楚表达要做的事，维持任意领域两步进入编辑                         |
| 仅看根节点无横滚就判断大字布局        | 增加内部计时文本裁切与导航遮挡焦点断言                   | 首轮200%截图确实暴露内部裁切和固定导航遮挡，根横滚检查不能证明可用 |
| 200%下专注与财务仍强制双列            | 根据可容纳的文字宽度自动改为单列，放大后的计时数完整显示 | 不通过缩小字体隐藏放大问题                                         |
| 完成后只恢复焦点，不检查被导航遮住    | 仅当新节点超出可视范围或被固定导航覆盖时滚到可见处       | 保留语义焦点，同时保证用户能看见反馈与当前控件                     |

运行入口：`node scripts/v4-prototype-controls-review.mjs`，需本机4187服务提供 `docs/design/v4/`。验证只操作合成原型，不打开用户存储。程序失败会退出非零，未以重试掩盖失败。

已执行三种方案的Chromium完成/键盘撤销/焦点恢复、详情只读、全局两次点按输入；轻推另测完成阈值、未过阈值和垂直拖动不误写。布局批次涵盖Chromium/WebKit × 320/390/430/768/1440 × 深浅主题，共20个上下文，每个还检查200%根字号压力；准确结果见[动作观察](prototype-r4/screens/author-observations.json)与[布局观察](prototype-r4/screens/layout-observations.json)。这属于作者验证，不能代替独立验收、axe扫描、全产品状态或物理iPhone。

实际截图：[对照板](prototype-r4/screens/comparison-board.png)、[整行浅色390](prototype-r4/screens/surface-390.png)、[纸签390](prototype-r4/screens/paper-390.png)、[轻推390](prototype-r4/screens/slide-390.png)、[深色](prototype-r4/screens/surface-390-dark.png)、[桌面](prototype-r4/screens/surface-1440-light.png)、[320文字200%](prototype-r4/screens/surface-320-text200.png)。固定输入哈希见[source-hashes](prototype-r4/screens/source-hashes.json)。

## 决策与未完成项

根协调选择“整行回应”继续深化，另外两稿保留为实际比较输入。独立审核需重点检查动作/查看边界、意外完成与撤销、焦点、色彩对比、关键操作遮挡及与其他页面的一致性；若发现具体阻断继续修订。

三个工作代理先前因额度上限中断，现已恢复原角色协作。设计和架构交付唯一契约，独立审核正在复查最后产物；根协调没有代签。Goal仍追踪完整4.0上线目标。

## R4 收尾修订

独立审核要求恢复健康完整习惯列表的暂停/非计划日副文案，完成回执不能遮蔽计划状态；已在真实计划操作后截图验证。底栏在窄宽度或大字时改为两层，保留全部文字。完成底的焦点环改用专用深色，未完成底采用专用浅色；动作面横向内边距至少 8px，保证内部描边不贴文字。

按照 [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md)（2026-09-28读取）复查，并运行 `scripts/v4-prototype-a11y-review.mjs`：11种页面/表单状态×深浅主题共22次axe扫描，最初3个严重对比度问题修复后均为0。修复为未选收支文字用ink、分类选中用accent/on-accent；人工另查焦点与大字。扫描未覆盖全部详情/错误/二级确认，不等于完整WCAG符合认证。正式路由将使用语义链接，原型按钮导航不直接复制到产品。

新增[视口焦点图](prototype-r4/screens/surface-focus-viewport.png)、[健康计划状态](prototype-r4/screens/surface-health-schedules.png)、[文件竞态](prototype-r4/screens/file-race-observations.json)、[最终定向观察](prototype-r4/screens/final-review-observations.json)、[axe观察](prototype-r4/screens/a11y-observations.json)。全页截图可能把负top的固定skip链接收入画布；实际视口测量其非焦点bottom=-38px，另有视口截图确认无覆盖。
