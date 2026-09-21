# 信息架构

五个常驻入口：今天、健康、专注、记账、设置。习惯属于健康，今天只聚合已有业务数据。

| 路由 | 页面 |
| --- | --- |
| `#/today` | 今天概览 |
| `#/health` | 体重、运动、习惯 |
| `#/health/weight-history` | 体重历史 |
| `#/health/activity-history` | 运动历史 |
| `#/health/habits` | 习惯管理与日历 |
| `#/focus` | 专注计时 |
| `#/focus/history` | 专注历史 |
| `#/finance` | 收支日历与流水 |
| `#/finance/new` | 记账表单 |
| `#/finance/report` | 只读报表 |
| `#/settings` | 设置分组 |
| `#/settings/:section` | 分类、外观、数据与安全、关于等详情 |
| `#/action/:actionType` | 习惯或专注链接的校验和确认 |
| `#/action-result` | 链接操作结果 |

根路径进入今天；`#/habits` 导向健康。静态托管使用 Hash 路由。导航保持可访问名称与当前页状态；详情关闭恢复合理的焦点及滚动上下文。未保存输入的退出行为由导航保护统一处理。
