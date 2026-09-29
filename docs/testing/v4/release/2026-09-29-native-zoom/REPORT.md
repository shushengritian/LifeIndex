# 原生200%页面缩放独立验收

**通过。** `/root/review_release`于2026-09-29实际执行，最终6.86秒、exit0、隔离context已关闭。方法、官方来源及能力边界见[METHOD](METHOD.md)，完整原生API/尺寸及24路径结果见[result.json](result.json)。

1280/780/640宽窗口使用真正chrome.tabs.setZoom自动模式设为2，getZoom均为2、innerWidth分别640/390/320、visualViewport.scale始终1；CSS zoom1和rootFont16px未改变。5核心页×3档、金额/体重/运动弹层×3档通过，弹层滚动到备注后仍能输入，9次合成UI保存成功，关键按钮44px以上且中心可命中。未用CSS字体放大、deviceScaleFactor或pinch冒充。

每次使用全新/tmp空profile及仅localhost权限的临时扩展，不读取用户profile。本目录保留实际执行脚本与扩展源；脚本保留当时本机绝对依赖路径，迁移环境运行需调整项目位置。没有复制浏览器profile或真实数据库。

首次fullPage截图在原生缩放下截取左半，未用作视觉通过依据；已改为viewport截图并实际重跑，最终两张最窄图保留在本目录。本审核实际查看后确认完整宽度与可滚动录入布局。结果是Chromium原生页面缩放，不等于Safari仅文字缩放或实体iPhone验证。

- [320CSS px原生缩放专注页](width-640-focus-200.png)
- [320CSS px滚动后录入弹层](width-640-expense-dialog-200.png)

本次4190服务容忍/LifeIndex/路径回退，但被测产物实际base为/；Pages子路径资源由独立上线验收负责。产物index哈希保存在dist-index-sha256.txt，与该次本地构建关联。

执行脚本与扩展源码以`.txt`原文快照归档（check.mjs.txt、extension/background.js.txt），保留实际执行内容，避免把含本机路径的历史证据当成仓库自动运行脚本。复现时应在新的临时目录恢复对应扩展名并调整仓库路径；不加载任何现有浏览器profile。
