# 快捷指令模板构建与验证

## 当前状态

最新 P5-06g：R2 原生只读预览确认 OCR 文本输入和 URL 编码已连接；同时发现日期占位、空替换默认值、循环项目及字典比较问题。R3 修正为显式文本 token、Repeat Item/Repeat Item 2 和比较前文本转换，现为 289 动作，已签名。R3 尚未运行或完成原生复核；已向用户询问是否允许添加本机候选做合成测试，不能点击添加或运行来替代确认。下方 R1/R2 与 278 动作为历史构建证据，不是当前正式模板。

2026-09-19：macOS 15.2 / Shortcuts 3218.0.4.100 完成最小合成文本指令签名探针，系统命令退出 0，生成 21,635 字节签名文件。探针位于临时目录，不进入 public，也不是记账模板。没有安装或运行该探针，没有访问账目、照片或用户快捷指令列表。

真实截图记账模板、导入编辑器核查、系统 OCR、分类配置消费及 iPhone 同账本验证仍未完成；不得因探针签名成功开放正式安装按钮。

## 项目签名命令

### 完整候选（P5-06f，尚未开放安装）

```sh
node scripts/build-shortcut.mjs /tmp/lifeindex-candidate.xml
plutil -lint /tmp/lifeindex-candidate.xml
node scripts/sign-shortcut.mjs /tmp/lifeindex-candidate.xml /tmp/lifeindex-candidate.shortcut
node_modules/.bin/vitest run tests/unit/shortcut-template.test.js
```

构建器拒绝覆盖目标。完整候选 278 动作，包含本地文件选择、两级分类、每次运行新 actionId 和五字段 URL 转交。当前每次运行选配置文件，不持久缓存路径，也不读取 iCloud 以外的服务器配置；选择 iCloud Drive 文件可能由系统同步，用户可选“我的 iPhone”。配置超过 1000 项显式停止，失效引用最终仍由 App 拦截/补选。

R1/R2 已生成非空系统签名文件。R1 在 macOS 导入动作预览中发现替换/匹配文本输入未绑定；R2 改用文本 token 并重签，尚待重新预览和执行。预览无需添加；没有添加或运行候选，没有检查用户已有快捷指令的内容。不要使用 R1；R2 也不是发布件。后续安装候选进行运行测试前须征得本次安装确认，设备权限由用户选择。

当前测试模型使用合成配置/截图文本，不启动系统 OCR，日期和随机输出模拟。模型只验证生成动作的分支/参数映射及生产 App parser 接受 URL；不能证明 Apple 参数兼容、字典布尔/空值转换、随机输出格式、文件权限和取消行为。原生输入参考 [Apple 动作参数公开研究资料](https://github.com/viticci/shortcuts-playground-plugin/blob/main/codex/skills/shortcuts-playground/data/toolkit-v78-first-party-parameter-keys.json)，新旧系统有差异，未以该资料替代目标系统实测。

### 模板源码构建（开发中）

`scripts/shortcut-plist.mjs` 提供原生 action/output/variable、UTF-16 文本占位引用及 XML 序列化；`scripts/build-shortcut-input.mjs` 已构建共享图片→无输入截屏→系统 OCR→金额/交易时间核对阶段，尚未接分类配置与 URL。因此它刻意以 Nothing 结束，不转交识别全文、不记账，不允许作为正式模板发布。多图片选择/拒绝、权限失败和输入连接仍需编辑器/真机核实。

```sh
node scripts/check-shortcut-plist.mjs
node scripts/check-shortcut-payment.mjs
node scripts/check-shortcut-confirmation.mjs
node scripts/build-shortcut-input.mjs /tmp/lifeindex-input-candidate.xml
plutil -lint /tmp/lifeindex-input-candidate.xml
```

已验证：序列化/引用/元数据、金额/时间规则与生成动作分支的合成断言通过；当前候选生成 63 个原生动作（先前输入阶段为 11 个）。分支模型模拟日期检测，不能证明 Apple 对日期或 OCR 的实际解析。未签名或安装此阶段候选，语法通过不证明原生动作参数连接正确。旧版动作 ID 参考公开 toolkit-v63 标识目录；OCR 使用旧版 `WFImage` 输入方式，未来系统版本需要按用户 iOS 实测。

文本变量格式参考作者公开的 [Variable Reference System](https://github.com/viticci/shortcuts-playground-plugin/blob/main/codex/skills/shortcuts-playground/VARIABLES.md)，金额默认值采用文本占位引用；本地检查包含中文和 emoji 的 UTF-16 位置以及未绑定占位拒绝。参考资料不是 Apple 的兼容承诺，仍须编辑器实测；没有安装/执行该插件。

仅使用无私人数据的项目模板。`anyone` 签名会使用 Apple 服务，不应将私人分类配置、截图、账目或用户导出的个人指令作为源码签名。

```sh
node scripts/sign-shortcut.mjs path/to/template.xml path/to/candidate.shortcut
```

脚本验证元数据，将 plist 规范化为 XML 内容、`.shortcut` 扩展名的临时输入，然后调用系统签名器；已有目标文件会被拒绝，避免覆盖候选。日志只报告步骤/失败，不打印模板正文。系统诊断文本不作为成功标准；退出成功且输出非空才算签名成功。临时输入保留在系统临时目录供诊断。

本机实测：不完整元数据/`.xml` 输入，以及初次二进制尝试均得到格式错误；补齐 `WFWorkflowMinimumClientVersionString`、`WFWorkflowHasOutputFallback`、`WFWorkflowOutputContentItemClasses` 并规范为 `.shortcut` 后成功。此结果不声称已隔离单个根因，也不代表其他 OS 必须使用同样组合。

## 后续强制门槛

1. 原始模板可审查，动作只包含本地截图/OCR、规则、用户选择、文件读取与打开 LifeIndex URL；无上传截图、云 AI、后台支付监听。
2. 分类配置严格检查 format/version/层级/有效性；同名分类按稳定 ID 区分，无有效分类停止。
3. 金额多候选/歧义及交易时间缺失必须核对；完整 OCR、图片、订单号不进入 URL 或日志。
4. 安装后在快捷指令编辑器检查所有字段连接，不能只用 plist 校验或签名证明运行正确。
5. iPhone 验证截屏入口、权限拒绝/取消、分类选择、重复请求去重及 Safari/主屏幕同账本；记录用户当前 iOS 版本。
6. 门槛通过后才复制正式签名产物到静态发布目录、开放安装，并核验部署响应与文件大小。

参考：[Apple 命令行快捷指令指南](https://support.apple.com/en-md/guide/shortcuts-mac/-apd455c82f02/mac)。文件结构核对另参考开源作者的 [plist 实现资料](https://github.com/viticci/shortcuts-playground-plugin/blob/main/codex/skills/shortcuts-playground/PLIST_FORMAT.md)，未安装其插件或执行其脚本。
