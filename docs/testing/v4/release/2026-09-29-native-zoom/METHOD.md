# LifeIndex native page zoom verification (executed successfully)

Browser plugin discovery returned no connection. Computer Use shortcut call hung and was interrupted. The coordinator explicitly authorized standalone isolated Chromium fallback after performance sampling. Execution completed and evidence is preserved in result.json and REPORT.md.

Primary documentation:
- https://developer.chrome.com/docs/extensions/reference/api/tabs#method-setZoom — changes a tab's browser zoom factor.
- https://developer.chrome.com/docs/extensions/reference/api/tabs#method-getZoom — reads the current factor.
- https://developer.chrome.com/docs/extensions/reference/api/tabs#type-ZoomSettingsMode — automatic mode delegates actual scaling to the browser, unlike manual content scaling.
- https://playwright.dev/docs/chrome-extensions — persistent context and bundled Chromium channel support extensions, including headless Chromium.

The temporary MV3 extension is local-only and has no content script. The test creates a new /tmp profile via mkdtemp; no existing user data is read. Browser scaling uses tabs.setZoomSettings({mode:'automatic',scope:'per-tab'}) then tabs.setZoom(2). No CSS mutations, deviceScaleFactor override, mobile emulation, pinch or CDP scaling.

Evidence must show getZoom=2; at fixed window viewport size, CSS innerWidth halves relative to getZoom=1; visualViewport.scale remains 1; CSS zoom/root font size remain unchanged. The script checks core pages and synthetic UI records at original viewport widths 1280,780,640, plus modal scroll and real target hit tests. This is Chromium desktop native page zoom, not Safari text-only zoom and not physical iPhone verification.

Launch timeout:15s; extension discovery:10s; total watchdog:120s. Unsupported extension is a capability failure, not a pass; no indefinite recovery attempts.

执行脚本与扩展源码以`.txt`原文快照归档（check.mjs.txt、extension/background.js.txt），保留实际执行内容，避免把含本机路径的历史证据当成仓库自动运行脚本。复现时应在新的临时目录恢复对应扩展名并调整仓库路径；不加载任何现有浏览器profile。
