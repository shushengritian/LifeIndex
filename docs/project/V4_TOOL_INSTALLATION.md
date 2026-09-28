# LifeIndex 4.0 免费工具安装记录

日期：2026-09-28。范围：开发工具安装和可用性核验。没有启动 4.0 目标、产品设计、开发或上线。

同日启动准备复核：10 项新增 Skill 的 SKILL.md SHA-256 与安装锁全部一致；Penpot 8 个容器运行，PostgreSQL 与 Valkey 健康，重新完成 MCP 握手及四项工具发现。本轮宿主原生工具目录仍未暴露 `penpot-local`；已验证的本地 MCP 协议连接可用，不以目录刷新作为必须由用户操作的前置条件。项目组、目标及启动方式见 [执行约定](V4_EXECUTION_BRIEF.md)。

## Skills

新增 10 项，安装目录为 `/Users/fh/.codex/skills`。通过 Codex 自带 Skill Installer 从作者仓库的固定提交安装；没有安装完整 Superpowers 插件或自动 hooks。

| 作者仓库 | 固定提交 | 已安装 Skill |
| --- | --- | --- |
| `nextlevelbuilder/ui-ux-pro-max-skill` | `09170eec67eefd46a7ae85de61b40c194020f997` | `ui-ux-pro-max` |
| `emilkowalski/skills` | `d16ebe60d09a5ba2afcb7054ede9d0a10c9f6128` | `emil-design-eng`、`mobile-native`、`review-animations` |
| `vercel-labs/agent-skills` | `063bee94c3f4df8453406c830b0a7df0f2860278` | `web-design-guidelines`、`vercel-react-best-practices`、`vercel-composition-patterns` |
| `obra/superpowers` | `8ca22dba9a94f28898bbce59f2537ff4d87c747d` | `systematic-debugging`、`requesting-code-review`、`verification-before-completion` |

已有 `impeccable` 4.3.1 原样保留，继续遵守项目 AGENTS 的 manual-reference 边界。未执行其 launcher、engine 或 browser bridge。

安装包含三个兼容修正，均未修改上游脚本：

1. UI UX Pro Max 的 11 个 Claude 插件命令路径改为本机 Codex Skill 的绝对路径，使用 `python3`。
2. `review-animations` 的上游显式调用设置转换为 Codex `agents/openai.yaml` 中的 `allow_implicit_invocation: false`；由审核角色明确调用。
3. `systematic-debugging` 改为引用已安装的 `verification-before-completion`；故障复现采用项目现有测试框架，不要求安装完整 Superpowers 测试工作流。

来源、安装路径、上游与安装后的 SKILL.md SHA-256 记录在 `/Users/fh/.local/share/lifeindex-design-tools/skills-lock.json`。仓库根目录有许可证文件的安装包已补齐许可证；Vercel 技能保留原始许可元数据和内容。

## 已完成核验

- 官方 `quick_validate.py`：10/10 通过；校验用 PyYAML 6.0.3 仅放在 `/tmp/lifeindex-skill-validation-deps`，未改动项目依赖或系统 Python。
- 全部安装资源与固定提交逐文件核对：没有缺失，内容差异仅为上述三个 SKILL.md 兼容修正。
- UI UX Pro Max：触摸目标检索和 React 性能检索均返回相关结果；数据校验覆盖 12 个领域文件、22 个技术栈文件及推理规则，全部通过。
- 已有 `@playwright/test` 1.62.1、`@axe-core/playwright` 4.13.0 可加载，Chromium/WebKit 浏览器文件存在，不重复安装。此核验不代表已运行 4.0 功能验收或真机测试。
- 新 Skills 在下一轮对话加载。安装通过不等于已证明设计产出质量；同题设计比较和产品审查留待项目组及目标确定后进行。

## Penpot 本地画布

改用官方稳定版 Penpot 2.18.0 的 Docker Compose，包含官方 MCP 服务，省去旧版独立 MCP 源码构建。来源：[官方安装文档](https://help.penpot.app/technical-guide/getting-started/docker/)、[2.18.0 发布版本](https://github.com/penpot/penpot/releases/tag/2.18.0)、[官方 MCP 接入说明](https://help.penpot.app/mcp/)。

配置已写入 `/Users/fh/.local/share/lifeindex-design-tools/penpot/compose.yaml`：

- 独立 Compose 项目 `lifeindex-design`；与 LifeIndex 产品代码、IndexedDB 和线上部署分离。
- 设计服务与本地邮件预览端口仅绑定 `127.0.0.1`；关闭遥测。
- 随机生成的本地服务凭据存于同目录 `.env`，权限 `0600`，不写入项目或版本库。
- Penpot 版本固定为 `2.18.0`，容器策略为 `unless-stopped`。

当前状态：**安装及本地读写验证完成**。8 个容器均在运行，数据库和 Valkey 健康检查通过。没有扩容 Docker，仍使用原来的 128 GiB 上限。

### 入口与连接

- 网页：<http://localhost:9001/>。
- 本地专用账户：`designer@lifeindex.local`。随机密码存于 `/Users/fh/.local/share/lifeindex-design-tools/penpot/local-account.json`，权限 `0600`；这是本机设计账户，不是外部云账户。
- 已向 Codex 注册 `penpot-local`，使用本地 `/mcp/stream` 端点。连接密钥存于同目录 `mcp-connection.json` 及 Codex 配置，未写入项目或对话。
- MCP 协议握手、工具发现和直接协议调用已实测。新注册的宿主 MCP 工具待下一轮加载；若宿主未刷新，可在 MCP 设置中重启该连接。
- 使用 MCP 时需要保持设计文件在浏览器中打开并连接。已经保留本次安装验证的画布标签页。

### 验证证据

1. 本地页面返回 HTTP 200，浏览器可登录并创建空白设计文件。
2. MCP 返回四项工具：`execute_code`、`high_level_overview`、`penpot_api_info`、`export_shape`。
3. 在 `Installation verification` 页面创建一个 160 × 96 的合成测试矩形，单独调用 MCP 读取其尺寸和颜色，结果一致。
4. 浏览器显示已保存；刷新页面后再次通过 MCP 读取，图形仍存在且尺寸一致。
5. PNG 导出返回有效 PNG 数据，已保存到同目录 `verification-shape.png`，验证结果在 `verification.json`。
6. 首次导出暴露了 Nginx 启动时缓存错误容器地址的问题；重载 Nginx 后重新导出成功。这属于首次部署修复，没有修改 LifeIndex 产品。

测试文件仅包含安装验收图形，不是 4.0 产品设计稿。未使用真实业务数据，也未开启付费试用。

### Docker 空间处理

用户删除历史镜像后，构建缓存仍占约 117.9GB。安装中先回收超过 7 天未使用的缓存；随后用户明确要求“全部回收 Docker 缓存空间”，已执行 `docker buildx prune --builder desktop-linux --all --force`。

最终 `docker system df` 显示 **Build Cache：0 项、0B**，Docker 内部可用容量约 **109.96 GiB**。宿主机 `df -h` 显示可用空间约 **190 GiB**，Docker.raw 实际占用约 5.9GiB。最后一次全量回收报告释放 95.92GB；此前两次定向回收分别报告 5.294GB、11.06GB。保留了本次安装的 8 个镜像、8 个容器和 2 个 Penpot 数据卷。未修改 Docker 磁盘上限。

### 启停与固定版本

8 个已验证镜像的不可变摘要保存在 `images.lock.yaml` 和 `images-lock.json`，后续启动使用锁定文件：

```sh
cd /Users/fh/.local/share/lifeindex-design-tools/penpot
docker compose -p lifeindex-design -f compose.yaml -f images.lock.yaml up -d
```

暂时不用时停止服务，保留画布数据：

```sh
cd /Users/fh/.local/share/lifeindex-design-tools/penpot
docker compose -p lifeindex-design -f compose.yaml -f images.lock.yaml stop
```

设计数据位于独立的 `lifeindex-design_penpot_postgres_v15` 和 `lifeindex-design_penpot_assets` 卷。常规停机不要使用删除卷的选项。Docker Desktop 需保持运行才能访问本地画布。

## 使用与费用边界

本次没有购买插件、订阅、素材、额外模型 API 或云服务。新 Skills 的本地使用不需要新增服务账户；联网参考服务仍可能限流，模型本身仍消耗现有额度。

下一阶段仍是设计项目组与明确开发目标，再决定执行模式及完整提示词。用户本次“开始安装”仅推进工具安装，不自动启动 4.0 开发。
