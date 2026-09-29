# LifeIndex 视觉资源

当前应用图标源文件为 [lifeindex-ocean-icon.svg](lifeindex-ocean-icon.svg)，是仓库原创几何矢量。深海蓝背景、青色 L、蓝色索引线与琥珀色圆点构成品牌标记，前景位于可遮罩安全区内。

`scripts/generate-app-icons.mjs` 使用已锁定的资源工具渲染 `public/icons/` 的运行时 PNG。图标更新需同步全部目标尺寸并验证 manifest 与缓存版本；不提交 dist。

[lifeindex-icon-master.png](lifeindex-icon-master.png) 为原创图标探索母稿，仅供素材溯源，不作为当前运行时图标源。资源不包含用户业务数据。

iOS 主屏幕图标可能单独缓存；不能通过清除本机业务数据强制刷新。交互和视觉原则见 [设计指导](../UX_UI_GUIDE.md)。
