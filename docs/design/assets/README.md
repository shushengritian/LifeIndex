# LifeIndex 视觉资源

4.0 当前应用图标源文件为 [lifeindex-v4-icon.svg](lifeindex-v4-icon.svg)，是本项目原创几何矢量：奶油底、陶土色花形和深紫中心，与“日常调频”界面统一。运行时 favicon SVG 使用同一原创构形；PNG 输出包括 16/32/180/192/512 和 512 maskable，前景位于可遮罩安全区内。

3.x 的 [lifeindex-ocean-icon.svg](lifeindex-ocean-icon.svg) 和探索母稿保留为历史资料，不从4.0入口引用。图标不是生成式付费素材，不含第三方商标。

`scripts/generate-app-icons.mjs` 使用已锁定的资源工具渲染 `public/icons/` 的运行时 PNG。图标更新需同步全部目标尺寸并验证 manifest 与缓存版本；不提交 dist。

4.0 的 Manrope 字体随应用本地分发，许可与字体一同保存在 `public/fonts/`，采用 SIL Open Font License 1.1。来源为 Google Fonts 官方仓库，2026-09-28 下载的未修改 TTF 164700 字节；溯源见[原始素材记录](../v4/prototype-r2/assets/README.md)。不运行远程字体请求，中文使用系统字体回退。页面图形和图标均为项目内 SVG/CSS，不新增付费服务或运行时外部素材依赖。

[lifeindex-icon-master.png](lifeindex-icon-master.png) 为原创图标探索母稿，仅供素材溯源，不作为当前运行时图标源。资源不包含用户业务数据。

iOS 主屏幕图标可能单独缓存；不能通过清除本机业务数据强制刷新。交互和视觉原则见 [设计指导](../UX_UI_GUIDE.md)。
