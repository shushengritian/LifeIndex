# LifeIndex — Project Baseline

> **Index your life.**

## 1. 文档目的

本文档定义 **LifeIndex** 当前已经确认的产品基线，作为后续在 Codex 中进行产品设计、UI/UX、架构设计、数据建模和开发工作的统一上下文。

除非后续明确形成新的决策，否则项目应保持与本文档一致。

---

## 2. 产品定义

### 名称

**LifeIndex**

统一使用 `LifeIndex` 作为产品名、项目名和代码仓库中的正式名称，不再使用此前讨论过的临时名称。

### Tagline

**Index your life.**

### 定位

LifeIndex 是一个 **Local-First 的私人生活索引应用**。

它不只是记账 App、习惯 App、专注 App 或日记 App。长期目标是围绕“时间”组织个人的结构化数据与非结构化记录，逐渐形成一个可回顾、可检索、可长期保存的个人生活档案。

当前首先记录三个维度：

1. **Finance** — 钱去了哪里？
2. **Focus** — 时间和注意力去了哪里？
3. **Habits** — 长期坚持了什么？

未来可继续扩展日记、长文、照片、Timeline、Insights 等内容。

### 当前使用场景

- 单人、私人使用
- iPhone 为主要设备
- 不发布 App Store
- 不依赖 Apple Developer Program
- 不要求后端服务或自定义域名
- 面向多年长期使用
- 核心功能支持离线

---

## 3. 核心原则

### Local First
用户主数据保存在本机。首次安装/加载完成后，即使没有网络，也应能够打开 LifeIndex 并完成核心操作。

### Privacy First
V1 尽量避免把个人数据发送到外部服务，不引入不必要的云端数据库和账号体系。

### Data Ownership
用户必须能够完整导出和恢复自己的数据。完整备份采用版本化 JSON。

### Fast Daily Interaction
记一笔账、完成一次打卡、开始一次专注等高频动作必须尽量快速。

### Extensible, Not Overbuilt
V1 保持克制，但数据模型和代码架构不能阻碍未来加入 Journal、Writing、Timeline 和 Insights。

---

## 4. 技术架构

- **Frontend:** Progressive Web App (PWA)
- **Primary target:** iPhone / Mobile Safari / 添加到主屏幕
- **Primary database:** IndexedDB
- **Offline:** Service Worker
- **Hosting:** HTTPS 静态托管，例如 GitHub Pages
- **Backend:** V1 不需要

`localStorage` 不作为核心业务数据存储。

```text
                    LifeIndex
                        │
                        ▼
                   PWA Web App
                        │
          ┌─────────────┴─────────────┐
          │                           │
       UI / 业务逻辑              Service Worker
          │                         离线缓存
          ▼
       IndexedDB
       本地主数据库
          │
          │ Export / Backup
          ▼
   LifeIndex JSON Backup
          │
          ▼
       iCloud Drive
```

**IndexedDB 是唯一主数据源。** iCloud Drive 只用于备份/恢复，不作为实时数据库。

---

## 5. 数据与备份

完整备份建议命名：

```text
lifeindex-backup-YYYY-MM-DD-HHmm.json
```

概念结构：

```json
{
  "version": 1,
  "backupAt": "2026-09-03T20:00:00+08:00",
  "transactions": [],
  "categories": [],
  "habits": [],
  "habitRecords": [],
  "focusSessions": [],
  "journals": [],
  "articles": [],
  "settings": {}
}
```

最终字段由后续数据模型设计确定。

### 恢复流程

1. 选择 LifeIndex JSON 备份。
2. 校验文件格式与 schema version。
3. 覆盖/合并现有数据前明确提示。
4. 恢复至 IndexedDB。
5. 显示恢复结果。

通过 iOS Files / Share 将备份保存至 iCloud Drive。后续可研究 iOS Shortcuts 辅助定期备份，但备份机制本身不能依赖 Shortcuts 才能工作。

---

## 6. iOS Shortcuts

从架构上预留 URL Action 机制，使快捷指令/Siri 能触发高频操作。

```text
iOS Shortcut
     │
     ├── Amount: 35
     ├── Category: Food
     └── Note: Lunch
     │
     ▼
Open LifeIndex URL
     │
     ▼
?action=addTransaction&amount=35&category=food&note=Lunch
     │
     ▼
LifeIndex 校验 Action
     │
     ▼
IndexedDB
```

未来可支持：

- 快速记账
- 快速打卡
- 开始/结束专注
- 快速日记
- 快速记录想法

实现时考虑输入校验、重复提交和 URL 参数安全。

---

# 7. V1 信息架构

```text
LifeIndex
│
├── Today
├── Finance
├── Focus
├── Habits
└── Settings
```

**Today 是统一首页，不是独立业务数据域。**

三个核心业务模块为 Finance、Focus、Habits。

---

# 8. Today

回答：**我的今天是什么状态？**

作为默认首页，汇总：

- 当前日期
- 今日支出/收入摘要
- 今日专注时长与次数
- 今日习惯完成情况
- 高频快捷入口

Today 优先追求清晰和可操作性，不做信息过载的大屏 Dashboard。

---

# 9. Finance

回答：**我的钱去了哪里？**

### V1

记账至少支持：

- 支出 / 收入
- 金额
- 分类
- 日期/时间
- 备注

支持查看今天、本周、本月及历史记录。

统计逐步支持：

- 月度支出
- 月度收入
- 收支结余
- 分类占比
- 消费趋势

V1 暂不重点实现复杂预算、多账户、资产负债、专业财务报表等完整会计能力。

---

# 10. Focus

回答：**我的时间和注意力去了哪里？**

### V1

专注计时：

- 25 分钟
- 50 分钟
- 自定义

Focus Session 记录：

- 开始时间
- 结束时间
- 持续时间
- 事项/标题
- 可选分类/项目
- 可选备注

统计逐步支持：

- 今日/本周专注时间
- 月度趋势
- Session 数量
- 不同事项/分类的时间分布

Focus 保持轻量，不把 LifeIndex 发展成复杂项目管理软件。

---

# 11. Habits

回答：**我长期坚持了什么？**

Habit 可包含：

- 名称
- 图标/视觉标记
- 频率/计划
- 目标
- 开始日期
- 启用/停用状态

Daily Check-In 可记录：

- Habit ID
- 日期
- 完成状态
- 完成时间
- 可选备注

Habits 以日历为重要视觉入口。

统计逐步支持：

- 当前连续天数
- 最长连续天数
- 本月完成率
- 累计完成次数
- 年度 Heatmap

---

# 12. Settings

初始范围：

- 数据导出
- 数据恢复/导入
- 分类管理
- 习惯管理相关入口
- 外观/偏好
- 备份信息
- App / Version 信息

日常高频操作不要藏在 Settings 中。

---

# 13. 初始数据域

IndexedDB 初始至少考虑：

```text
transactions
categories
focusSessions
habits
habitRecords
settings
```

为未来预留自然扩展路径：

```text
journals
articles
attachments / photos
tags
```

不要为了未来可能使用而过早实现大量空数据表，重点是当前模型可自然迁移和扩展。

---

# 14. Phase 2 / 长期模块

## Journal
按日期组织的私人日记。未来可包含正文、心情、Tags、照片、天气，以及用户明确允许时的位置。

## Writing
用于随笔、思考、文章、长期观点等不一定绑定单日的长文本。

- **Journal** = 每日/时间序列记录
- **Writing** = 长文、观点、文章

## Timeline
把 Finance、Focus、Habits、Journal 等不同记录按照时间统一组织。

```text
September 3

08:20  Habit
       Morning reading ✓

09:10  Focus
       Product design · 1h 32m

12:36  Finance
       Lunch · ¥35

20:30  Journal
       Journal entry…
```

Timeline 是 **LifeIndex** 名称最终充分体现价值的核心能力之一。

## Insights
未来可基于长期数据产生消费模式、专注趋势、习惯稳定性、跨维度关联、月度/年度回顾等洞察。AI 搜索与分析可后续研究，不属于 V1 必要架构。

---

# 15. 长期产品结构

```text
LifeIndex
│
├── Today
├── Finance
├── Focus
├── Habits
├── Journal
├── Writing
├── Timeline
├── Insights
└── Settings
```

长期目标：

> **把多年积累的结构化数据、日常行为、文字与记忆组织成属于自己的 Personal Life Index。**

---

# 16. V1 明确非目标

初期不要优先实现：

- App Store 发布
- Swift / SwiftUI 原生 App
- Apple Developer Program
- 多用户、社交、双人共享
- Supabase / Firebase / 云数据库
- 用户注册登录
- Server Backend
- 复杂预算/会计系统
- AI 功能
- 完整 Journal / Writing
- 跨设备实时同步

---

# 17. 开发优先级

遇到取舍时按以下顺序：

1. **Data Safety**
2. **Fast Daily Interaction**
3. **Offline Reliability**
4. **Maintainability**
5. **Long-Term Extensibility**
6. **Visual Quality**
7. **Feature Quantity**

---

# 18. 设计方向

LifeIndex 应更像现代私人产品，而不是企业 Dashboard 或传统财务软件。

关键词：

- Modern
- Minimal
- Calm
- Refined
- Personal
- Data-aware
- 适合长期每日使用
- PWA 但尽可能具有 iPhone 原生感

避免过度装饰、信息密度失控、强烈的“自律焦虑”、企业后台风格和古风 UI。

品牌保持英文 **LifeIndex**，界面内容可以使用中文。

模块使用：

- 今天
- 记账
- 专注
- 习惯
- 设置

---

# 19. Codex 项目规则

1. 本文档是当前产品基线。
2. 不得静默改变产品范围或总体架构。
3. 新需求与基线冲突时，先指出冲突，再决定是否调整。
4. 优先小步、可检查的迭代，不进行无必要的大规模重写。
5. Finance、Focus、Habits、Storage、Backup、PWA Infrastructure 保持模块化。
6. 未明确要求时不要引入 Backend。
7. 未明确批准时不要替换 IndexedDB 主数据库。
8. 数据 schema 变化必须重视旧数据兼容。
9. 必要时建立明确的数据 migration 机制。
10. Backup / Restore 是一级产品能力。
11. 首先优化 iPhone PWA 使用体验。
12. 考虑 Journal、Writing、Timeline、Insights 的未来扩展，但避免过度设计。
13. 不因为技术方便而扩大 V1 产品范围。

---

# 20. 推荐开发顺序

```text
01  Product Baseline          ← 本文档
02  V1 PRD
03  Information Architecture
04  Data Model / IndexedDB Schema
05  UI/UX Direction & Prototype
06  PWA Project Skeleton
07  Storage & Migration Layer
08  Finance
09  Habits
10  Focus
11  Today
12  Backup / Restore
13  Offline / Service Worker
14  iOS Shortcuts Integration
15  Testing & Data Safety
16  Polish / Installable Release
```

不要一开始同时开发所有模块。优先把数据层、迁移和备份机制设计正确，再逐个实现业务模块。

---

# 21. 一句话项目定义

> **LifeIndex 是一个 Local-First 的私人生活索引，通过记录金钱、专注时间与日常习惯，并逐步扩展到日记、文字和时间线，建立一个可长期保存、回顾和理解的个人生活档案。**

---

**Status:** Current Project Baseline
**Product:** LifeIndex
**Version:** Baseline v1.0
**Date:** 2026-09-03
