# 五款获奖 App 真实手机界面参考板

研究日期：2026-09-18。状态：**参考选型待用户确认；暂停 LifeIndex 页面继续打磨，G3 未通过，G4 未开始。**

## 交付与阅读

- [打开参考板](prototypes/app-reference-board.html)：五款并排总览、逐项分析、可放大的原图、两段官方视频。
- [静态总览](prototypes/app-reference-board-overview.png)：浏览器渲染的参考板首屏，非重新绘制的 App UI。
- 这是独立研究文档，不是 LifeIndex 新 UI 原型；没有改动产品代码、依赖、数据库、部署配置或在线版本。
- 原图链接需要联网；本次不下载、复制第三方资产到生产应用。浏览器中的 App Store 地区跳转影响截图收集，因此使用 Apple / 开发者官方展示素材。Watch Duty 官网 CDN 直接访问被工具安全策略拒绝，未绕过；采用独立的 Apple 获奖视频封面及演示。
- Apple 图像含官方设备机框；CapWords 图像为官网展示的手机截图。所有界面均有来源，不是 AI 生成或仿制。当前官网素材不保证等于获奖当年的版本。
- 奖项采用 2025、2026 两届，均为获奖者，不混用入围称号。
- Impeccable 只用于手动梳理任务、证据与审核边界；未执行引擎或自动钩子。

## 五款与证据

### A · Tide Guide

- 风格判断：数据优先 · 深色仪表。
- [获奖事实](https://www.apple.com/newsroom/2026/06/apple-reveals-winners-of-the-2026-apple-design-awards/)：2026 · 视觉与图像。
- [美区 App Store](https://apps.apple.com/us/app/tide-guide-charts-tables/id1406371071)：4.7 / 约 9,900 条，满分 5。分数不是设计专项分数。
- 用户评价：Captain_Jeremy（2023-09-18）赞赏外观、自定义与快速查看信息，也提出希望固定首选指标。注意：这是较早的 UI 评价，不等于对 2026 版本的实测。
- 证据强度：有具体 UI 好评，但样本较旧。
- 我的观察：日期是骨架，曲线是主角，图标与数值形成紧凑的辅助层。底部导航与内容分离，但没有把每个数值都装进大卡片。
- 对 LifeIndex 的借鉴建议：记账的日历与每日收支层级；健康的体重趋势。学信息密度与图表标注，不照搬海洋主题。
- 不照搬：不要把所有页面做成深色天气仪表盘；财务数字仍需比装饰图形更醒目。
- [按日期组织的潮汐图表页 · Apple 官方展示图](https://www.apple.com/newsroom/images/2026/06/apple-reveals-winners-of-the-2026-apple-design-awards/article/Apple-WWDC26-Apple-Design-Awards-Tide-Guide_inline.jpg.large.jpg)

### B · Moonlitt

- 风格判断：沉浸焦点 · 场景化控制。
- [获奖事实](https://www.apple.com/newsroom/2026/06/apple-reveals-winners-of-the-2026-apple-design-awards/)：2026 · 交互。
- [美区 App Store](https://apps.apple.com/us/app/moonlitt-moon-phase-tracker/id6444718902)：4.7 / 869 条，满分 5。分数不是设计专项分数。
- 用户评价：商店可见评论肯定月相与事件信息的实用性；本轮没有找到足够直接、具体的用户 UI 赞誉。交互质量的强证据来自 Apple 的获奖说明，不拿总分冒充 UI 评分。
- 证据强度：专业交互认可强；用户 UI 专项证据有限。
- 我的观察：一个全屏主场景，少量悬浮控件，时间标记直接附着在对象上。主内容不被一层层面板打断。
- 对 LifeIndex 的借鉴建议：专注进行中的单一焦点；健康详情页的主趋势。把主要操作放在任务附近。
- 不照搬：不复制摄影背景和重透明玻璃到记账列表；可读性和 PWA 性能优先。
- [月亮轨迹与时间标注 · Apple 官方展示图](https://www.apple.com/newsroom/images/2026/06/apple-reveals-winners-of-the-2026-apple-design-awards/article/Apple-WWDC26-Apple-Design-Awards-Moonlitt-Moon-Phase-Tracker_inline.jpg.large.jpg)

### C · CapWords

- 风格判断：生活手账 · 轻量趣味。
- [获奖事实](https://www.apple.com/newsroom/2025/06/apple-unveils-winners-and-finalists-of-the-2025-apple-design-awards/)：2025 · 趣味。
- [美区 App Store](https://apps.apple.com/us/app/capwords-ai-language-tutor/id6738896465)：4.7 / 513 条，满分 5。分数不是设计专项分数。
- 用户评价：Jeff RR（2025-09-02）明确赞赏美感和动画；Rafael David González（2025-06-04）肯定制作闪卡的简单流程。它在这组中有较直接的视觉与操作好评。
- 证据强度：有具体视觉、动画和易用性好评。
- 我的观察：真实对象变成视觉内容，日期和留白组织页面。趣味来自素材与完成反馈，而非把普通文字按钮一律换成图标。
- 对 LifeIndex 的借鉴建议：健康打卡完成后的轻反馈；日历回顾中的少量视觉锚点。保留成人工具的克制。
- 不照搬：不把记账分类做成满屏贴纸；不复制其插画、照片或品牌资产。
- [单日词语收藏 · 开发者官网手机截图](https://framerusercontent.com/images/mG7Df1O5jISgy7XrGDQq7UJbE.png?scale-down-to=2048&width=1206&height=2622)
- [补充：拍摄确认界面](https://framerusercontent.com/images/kEhswH2ti1L5L23WQxr5uPtYPM.png?scale-down-to=2048&width=1206&height=2622)
- [官方交互视频](https://www.apple.com/newsroom/videos/2025/autoplay/06/apple-wwdc25-design-awards-capwords/large_2x.mp4)

### D · grug

- 风格判断：手绘极简 · 情绪陪伴。
- [获奖事实](https://www.apple.com/newsroom/2026/06/apple-reveals-winners-of-the-2026-apple-design-awards/)：2026 · 趣味。
- [美区 App Store](https://apps.apple.com/us/app/grug/id6751649802)：4.8 / 约 3,100 条，满分 5。分数不是设计专项分数。
- 用户评价：ItsJustOwen007（页面显示 May 21）明确称赞简单有效，并提到交互和设计超出预期；Greatapptbh（Jun 3）肯定易懂表达与个性化绘画。页面未显示年份，不补写。
- 证据强度：有明确设计、交互及简单易懂的好评。
- 我的观察：统一的手绘笔触、短文案和一整块颜色构成个性。内容很少，但每个元素属于同一种视觉语言。
- 对 LifeIndex 的借鉴建议：专注完成页或戒烟鼓励的语气与节奏；在一个关键时刻表达温度。
- 不照搬：不把全 App 字体改成手写体，不把金融数值和中文正文牺牲给个性。
- [每日内容与日期导航 · Apple 官方展示图](https://www.apple.com/newsroom/images/2026/06/apple-reveals-winners-of-the-2026-apple-design-awards/article/Apple-WWDC26-Apple-Design-Awards-grug_inline.jpg.large.jpg)

### E · Watch Duty

- 风格判断：实用清晰 · 内容驱动。
- [获奖事实](https://www.apple.com/newsroom/2025/06/apple-unveils-winners-and-finalists-of-the-2025-apple-design-awards/)：2025 · 社会影响。
- [美区 App Store](https://apps.apple.com/us/app/watch-duty-wildfire-floods/id1574452924)：4.9 / 约 51,000 条，满分 5。分数不是设计专项分数。
- 用户评价：CuriosityDrawsMe（2025-01-09）肯定点击图标后能获得清晰信息；MoBubs（2024-09-21）认可事件和图层间切换容易。肯定的是理解与操作，不是华丽视觉。
- 证据强度：有具体操作好评；获奖类别不是视觉。
- 我的观察：地图承担主要信息，工具按钮同时保留图标和文字，底部搜索有明确入口。不是最装饰化的一款，而是操作清晰的对照样本。
- 对 LifeIndex 的借鉴建议：健康记录和设置中的可发现性；图标与文字共同说明操作；状态不能只靠颜色。
- 不照搬：不引入地图或警报式视觉；社会影响奖不能描述成视觉大奖。
- [地图与明确工具入口 · Apple 官方视频封面](https://www.apple.com/newsroom/videos/2025/autoplay/06/apple-wwdc25-design-awards-watch-duty/posters/Apple-WWDC25-Design-Awards-Watch-Duty.jpg.large_2x.jpg)
- [官方交互视频](https://www.apple.com/newsroom/videos/2025/autoplay/06/apple-wwdc25-design-awards-watch-duty/large_2x.mp4)

## 选型建议与后续门槛

优先比较 A 的数据秩序与 C 的生活感。B 和 D 可作为专注、完成反馈的辅助参考；E 是操作清晰度的参照，不是品牌美术模板。这里不选择主色、不决定新的页面布局，也不推导新功能或重型系统。

需要用户确认：
1. 最喜欢的两款和具体局部。
2. 最不喜欢的一款及原因。
3. 日常使用期望：清晰利落、温暖轻松、安静沉浸，或其他描述。

确认之后才继续：
1. 用用户选择形成一页视觉方向说明，确定主参考、辅助参考、不采用项。
2. 补齐所选方向的完整流程样本（入口、输入、确认、完成、回看），而非只继续孤立首页。
3. 完成 LifeIndex 一条核心流程的浅色/深色高保真设计，并再次审核。
4. 设计通过后再制定实现任务；本轮不是生产实现或发布授权。

## 证据限制

专业奖项不等于用户共同审美。公开评论只是少量样本，有选择偏差；Moonlitt 的用户 UI 专项证据仍有限，Tide Guide 的直接 UI 好评样本较旧。未安装这些 App，也没有宣称在真实 iPhone 上测试；静态图片与官方视频不足以验证触觉反馈、无障碍和实际性能。

## 本地查看

可直接在浏览器打开 HTML，或从已有仅服务 prototypes 目录的本地预览访问 `/app-reference-board.html`。无需构建 LifeIndex，无需连接其 IndexedDB。

## 本轮校验

- 浏览器确认 11 个图片元素（含重复总览与隐藏补充图）均成功加载，未出现页面错误日志。
- 默认桌面宽度与 390px 手机宽度均未出现文档级横向溢出；这只是参考板排版检查，不是 iPhone App 实测。
- 官方视频使用原生显式播放控件，未自动播放；未验证完整视频播放和音频。
- `git diff --check` 通过。仅新增研究文档、静态参考板和总览截图，并更新计划检查点；未运行生产测试，因为没有改动生产逻辑。
