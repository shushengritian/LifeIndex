# LifeIndex 4.0 插件与 Skill 选型

日期：2026-09-28。修订：零新增工具费用方案。状态：10 项新增 Skills 已安装并通过校验；Penpot 2.18.0 与官方 MCP 已完成本地安装、图形读写、持久化和 PNG 导出验证。详情见 [安装记录](V4_TOOL_INSTALLATION.md)。尚未进行同题设计比较或启动开发。

## 选型范围与证据

按用户最新要求，从零评估候选，不把本机是否已安装作为加分项。本轮只选择工具；项目组、开发目标、执行模式、完整提示词和目标启动属于后续步骤。

依据为作者仓库、公开 Skill 内容、官方 MCP 文档和插件目录。没有覆盖互联网全部工具，也没有进行同题产出比较，因此不能证明某个候选为“全网第一”。本报告的主选是对 LifeIndex 场景的工程判断，不是市场排名。

选择重点：移动端日常操作的适用性、真实参考与完整状态设计、可编辑及可实现产出、独立验证能力、Codex 接入路径、账户和运行依赖、与其他 Skill 的重复或冲突。关注源仓库与官方文档，不以下载量、星标或宣传图代替质量证据。

用户新增硬约束：不为插件或 Skill 付费。不得购买订阅、付费素材、额外模型 API 或收费服务来完成本次工作；不把试用额度当成长期可用能力。以下组合替代上一版含付费条件的主选。模型推理仍受用户已有服务的额度约束；工具免费不等于模型无限量。联网研究、GitHub 等服务也仍有各自限流。

## 主选：工具与外部连接

| 候选 | 决策 | 在 LifeIndex 的职责 | 接入及使用边界 |
| --- | --- | --- | --- |
| 公开产品资料 + 浏览器 | 主选，替代 Mobbin MCP | 研究产品官网、应用商店公开截图、官方演示和帮助文档，建立带来源的参考板 | 不购买或绕过付费图库；公开资料不等价于 Mobbin 的完整流程库，整理参考会多花研究时间 |
| 本地 HTML/React 交互原型 | 主选，承载三轮具体方案评审 | 展示布局、组件和真实交互状态，在浏览器中评审并保存截图；原型文件随 Git 管理 | 原型与生产实现分开，采用合成数据；本地预览无设计 SaaS 调用额度 |
| Penpot + 官方 MCP | 已本地安装并验证的可编辑设计画布 | 页面、组件、变量、原型及设计稿协作 | 使用自托管免费版 Penpot 2.18.0 及其内置官方 MCP；软件和 MCP 免费，仍需本机资源及维护。图形读写、保存和 PNG 导出已验证；使用时保持设计标签页打开并连接 |
| 框架及库官方文档 | 主选，替代 Context7 必需依赖 | 查阅与锁定版本相符的官方文档、源码与发布说明 | 不需要额外文档服务订阅；联网获取仍受普通网络限制 |
| Git / GitHub 官方连接 | 保留，限免费能力 | 代码审查、CI 状态和发布证据 | 不购买插件或 Actions 额度；GitHub 自身服务限制仍存在，发布阶段核对项目适用范围 |

素材优先使用许可明确的免费图标、字体与原创代码绘制的矢量元素。只有用户已有图像生成能力可用且无需新增购买时，才按需制作栅格素材；不追加付费图像 API。最终页面仍由真实组件构成，图像不是可操作页面的替代品。

交互验收需包含浏览器实际操作和可重复测试。浏览器控制遵循宿主的受支持接口；独立自动化采用 Playwright Test 与 axe-core。Microsoft Playwright CLI Skill 列为外部独立测试环境的选项，不同时堆叠多套浏览器控制服务。Playwright 和 axe-core 是测试工具，不是审美 Skill。

来源：[Penpot MCP](https://penpot.app/ai/mcp-server)、[Penpot 自托管免费版](https://penpot.app/pricing/self-host)、[Penpot 自托管指南](https://help.penpot.app/technical-guide/getting-started/)、[Penpot MCP 源码](https://github.com/penpot/penpot-mcp)、[GitHub MCP](https://github.com/github/github-mcp-server)、[Playwright CLI](https://github.com/microsoft/playwright-cli)。旧候选的限制来源：[Mobbin MCP](https://mobbin.com/mcp)、[Figma 权限与额度](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/)、[Context7](https://github.com/upstash/context7)。

## 主选：设计与工程 Skills

| 来源与具体范围 | 决策与职责 | 不承担的职责 |
| --- | --- | --- |
| `pbakaus/impeccable` — `impeccable` | 主导视觉方法：产品语境、视觉方向、信息层级、排版、系统化设计与审查 | 不根据内置审美禁令机械覆盖最终产品方向；不自动开启运行引擎或钩子 |
| `nextlevelbuilder/ui-ux-pro-max-skill` — `ui-ux-pro-max` 免费开源版 | 交互模式、色彩/字体候选、可访问性和平台规则的本地检索参考；不购买 Premium | 不和 Impeccable 同时生成两套最终设计系统；生成规则不等于用户研究结论 |
| `emilkowalski/skills` — `emil-design-eng`、`mobile-native`、`review-animations` | 设计工程：触摸反馈、移动浏览器细节、弹层与动效；以高频日常使用为前提决定是否动画 | 不把动效数量作为质量指标；网页触感不能宣称等同原生系统能力 |
| `vercel-labs/agent-skills` — `web-design-guidelines` | 独立实现审查：语义、焦点、表单、触摸、主题、导航与性能 | 不取代截图评审或实际用户测试 |
| `vercel-labs/agent-skills` — `vercel-react-best-practices`、`vercel-composition-patterns` | 支持组件架构和渲染性能；仅使用与 React/Vite 客户端适用的规则 | 不因 Skill 含有 Next.js 服务端规则就迁移框架 |
| `obra/superpowers` — `systematic-debugging`、`requesting-code-review`、`verification-before-completion` | 选用调试、评审及交付证据方法 | 暂不把完整 Superpowers 设为流程控制器；其 brainstorming 默认有多次人工确认，需与后续自主执行约定统一 |

以上只选作者公开提供的免费技能内容及本地能力，不购买增强版。这些 Skill 的指令文件本身不按调用次数收费；若某个可选执行路径调用外部模型、素材或云服务，必须遵守零新增工具费用约束，不能因 Skill 开源就默认其全部依赖免费。

选择 Impeccable 的理由来自此次公开能力比较，而不是因为它已安装。LifeIndex 的 AGENTS 仍限制其 launcher/engine/browser bridge 与自动 hooks；选型不改变这一边界。后续安装方案应明确文档层与可执行层的范围。

来源：[Impeccable](https://github.com/pbakaus/impeccable)、[UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)、[Emil Skills](https://github.com/emilkowalski/skills)、[Vercel Agent Skills](https://github.com/vercel-labs/agent-skills)、[Superpowers](https://github.com/obra/superpowers)。

## 比较后未设为主选的候选

| 候选 | 已核实的能力 | 本次取舍 |
| --- | --- | --- |
| Google Stitch 官方 MCP + Skills | 根据文本/图片生成页面、编辑和生成变体；有官方 Codex 接入说明 | 其当前免费额度及持续可用条件本轮未充分核实，不设为核心依赖，不为生成额度付费 |
| Pencil / pen.dev | 可编辑 `.pen` 文档及 Codex MCP 接入；官方定价页称当前免费，认证页也提及 Pro 模型及外部模型提供商 | 不认定为永久免费、无需账户或没有推理费用。仅作后备；新方案优先开源 Penpot 或本地原型 |
| Anthropic `frontend-design` | 轻量、明确的视觉方向与排版指导 | 优秀候选，但与 Impeccable 的职责重叠，本次不叠加为第二个视觉主导 |
| Taste Skill | 设计变化、动效和信息密度控制，包含图像参考流程 | 作为挑战方案备选；作者当前默认 v2 标注 experimental，不能据演示和热度直接定为全站生产规范 |
| gstack | 从产品和设计评审到 QA、发布的角色化工作流；已有 Codex 适配 | 整体流程与将要设计的项目组织大幅重叠，且引入独立运行时/浏览器/外部评审依赖；本轮不整套采用，不以“仅支持 Claude”错误排除它 |
| ibelick `baseline-ui` / `fixing-motion-performance` | UI 基线约束及动效性能审查 | 性能专项可作候补；baseline 对 Tailwind、动画栈和样式有较强默认约束，不先于 LifeIndex 架构与设计决定引入 |

来源：[Stitch Skills](https://github.com/google-labs-code/stitch-skills)、[Pencil/pen.dev](https://docs.pencil.dev/getting-started/installation)、[frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design)、[Taste Skill](https://github.com/Leonxlnx/taste-skill)、[gstack](https://github.com/garrytan/gstack)、[UI Skills](https://github.com/ibelick/ui-skills)。

Pencil 的费用核查：[当前定价](https://www.pen.dev/pricing)、[账户与 AI 提供商认证](https://docs.pencil.dev/getting-started/authentication)。当前免费不作为长期无额度保证。

## 使用组合原则

1. 研究工具提供参考证据，交互规范确定任务流程，视觉主导形成唯一设计系统，专项 Skill 处理触摸/动效/实现细节。
2. 每个角色按任务加载必要 Skill，不把全部技能塞入每个代理。最终目标及已批准设计高于候选工具的风格偏好。
3. 流程类 Skill 的人工确认点与后续授权方式应在总提示词中明确；不能等开始无人值守执行后反复停下确认。
4. 安装阶段固定来源和可复现版本/提交，核对技能依赖并验证本地可用性。设计读取/写入待画布接通后验证；代表性产品实现留待开发启动后进行。安装授权不自动授权外部付费账户或产品开发。
5. 连接设计服务时采用合成设计内容；不上传 LifeIndex 真实记录或备份。插件、Skill、素材、额外模型 API 预算为零；遇到付费门槛更换免费实现，不购买。自托管设计工具属于开发设施，不给 LifeIndex 产品引入业务后端。

## 后续步骤

用户以“开始安装”将工具安装提前，现已完成本地安装验证。[项目组、开发目标与执行模式](V4_EXECUTION_BRIEF.md)和[完整启动提示词](V4_LAUNCH_PROMPT.md)已准备，按用户“输入提示词后开始”的顺序待提交启动。不把工具安装测试、筹备角色建议或此前 3.3.0 测试证据当作 4.0 正式设计评审及产品验收证据。
