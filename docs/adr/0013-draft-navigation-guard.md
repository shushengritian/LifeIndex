# ADR-0013：Hash 路由草稿退出保护

日期：2026-09-19。状态：阶段 5 本地实施决定，属于已批准草稿保护范围，不含发布授权。

## 决定

从声明式 HashRouter 改为 createHashRouter/RouterProvider，沿用当前 React Router 依赖与全部 hash 路径，保留旧 habits 重定向及 Action 入口。使用 useBlocker 统一处理站内链接及 POP；不自行维护第二套浏览器历史。router 在 effect 中创建和 dispose，避免 StrictMode 留下废弃监听。

草稿登记由现有 PWA 表单 token 扩展为 dirty/busy：可放弃草稿弹出应用内确认；记账保存或删除期间拒绝跳转且不排队。刷新、关闭使用 beforeunload 请求系统提示；应用更新同时在按钮和命令边界阻止。没有后端、自动保存草稿、数据库或备份格式变化。

## 边界与验证

保护仅覆盖已登记表单；其他模块 busy 需后续接入。浏览器不保证移动端 beforeunload 执行，不承诺拦截 iOS 强制终止。SPA blocker 不代替页面卸载保护。参考 [React Router useBlocker](https://reactrouter.com/api/hooks/useBlocker)。

150 项测试通过，包括链接取消/放弃、内存路由 POP、busy 拒绝、干净页放行、卸载和更新命令保护；App 导航测试运行于 StrictMode。正式本地浏览器验证专注草稿留下和放弃进入健康。尚未验证真实 iPhone 返回手势与终止行为，未运行完整 E2E。
