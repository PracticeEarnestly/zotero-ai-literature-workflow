# Zotero LLM Automation Bridge 0.1.7

一个独立的 Zotero 插件。Style 的 Extra 评分从低于 5 变为 5，或现有五星论文从未自动化时，它把论文加入串行队列，通过 llm-for-zotero 的公开 Agent API 分析图表，再保存论文子笔记。

本项目没有修改、替换或打补丁到 Style、llm-for-zotero 或 AI Butler。

## 安装与首次使用

1. 在 Zotero 的“工具 → 插件”中选择“从文件安装插件”，打开 [Release 中的 XPI](https://github.com/PracticeEarnestly/zotero-ai-literature-workflow/releases/tag/bridge-v0.1.7)。已在 Windows Zotero 10.0.6 注册并加载；真实验证见下方记录。
2. 确认 Style 使用 Extra 评分模式，llm-for-zotero 使用原生 Agent 对话系统。
3. 在 Zotero 设置中的 **LLM Automation Bridge** 面板选择已配置的 API 模型。模型必须支持工具调用和图像输入。
4. 检查 Prompt 和保存选项。默认启用自动化。启动时，现有五星论文只要没有任何 Bridge 任务记录，也没有同步到本机的 Bridge 自动笔记，就会进入队列。
5. 用一篇有本地 PDF 的论文验收：把评分从 4 改为 5，刷新队列，检查 `QUEUED → RUNNING → COMPLETED` 和子笔记内容。

Bridge 不保存新的模型密钥。它在执行时只读 llm-for-zotero 已配置的模型与凭据；密钥不会复制到队列、Prompt、XPI 或 Bridge 日志。空模型选项采用 llm-for-zotero 最近选择的模型；选择具体模型后则固定其 ID。

## 已实现的规则

- 监听 Zotero item 通知。只处理普通论文，不处理笔记、附件和已删除条目。`5 → 5` 的重复通知不入队。
- 启动重新建立全部可编辑文库的评分基线，并补录从未自动化的现有五星论文。已有任何任务状态，或已有 Bridge 自动笔记的论文不会重复入队。
- 连续进入五星分别建立任务，按顺序运行。取消“降星后再次升至五星时重新分析”后，成功完成的论文不再自动重跑。
- 不改评分、标签、其他插件的笔记，也不直接解析 PDF/MinerU。只调用 `Zotero.LLMForZotero.api.agent`。
- 使用公开 Gateway 解析明确的父条目、文库和 PDF 附件。无需打开 llm-for-zotero 侧栏或选中目标论文。
- 模型不支持工具调用或视觉输入时不调用模型。不把没有成功图像读取记录的回答保存成完成的视觉精读。
- Prompt 内置“顺序解读”独立模板，保留其 Results 证据顺序、逐 panel 解析和证据审查要求。前面加了工具调用和 Bridge 保存说明。安装后可在 Bridge 设置中修改。
- 设置面板读取 llm-for-zotero 当前的 API 模型和自定义 Prompt。可选择一个自定义 Prompt 并载入 Bridge；保存后形成独立副本和新版本，不会反向修改 llm-for-zotero，也不会在上游变化时静默覆盖 Bridge 配置。
- 设置里可编辑 Prompt。正文变化后版本号自动增加。每个任务保存入队时的 Prompt、版本和保存方式。
- 默认更新 Bridge 自己生成的上一份笔记；可取消此选项保留历史版本。标题相同的普通笔记不会被覆盖。
- 先保存分析正文，再写笔记。笔记写入失败后重试不会再次调用模型。同一 job 的笔记标记用于处理笔记已写入、状态尚未落盘的中断。
- Agent 请求额外确认时明确拒绝，任务失败，不自动授予写入或系统命令权限。
- 后端缺失或初始化时保留 `WAITING_LLM`，每 10 秒检查。失败任务没有自动模型重试；可在面板手动重试。手动重试采用当前保存的模型选择，保留原任务的 Prompt。
- 设置面板用表格显示最近 30 个任务，包括状态、文献、评分变化、Prompt 版本、模型、尝试次数、更新时间和详情。失败或等待后端的任务可直接在表格中重试。
- 设置面板提供“重新扫描未处理的五星论文”按钮。补录任务的评分来源显示为“现有 5”。
- 禁用或卸载时移除监听器、清理定时器、取消运行。Prompt 和队列文件保留。

0.1.5 起会自动迁移完成任务所关联的旧版纯文本笔记。迁移前将原始 HTML 和 Markdown 备份到 `llm-automation-bridge/markdown-backups/`，保留笔记 ID、任务记录和生成信息，不调用模型。已经转换的笔记和其他插件/人工笔记不会再次转换。

## 本地文件

插件运行时在 `{ZoteroDataDir}/llm-automation-bridge/` 保存：

- `prompt.json`：独立 Prompt 和版本。
- `state.json`：评分基线、任务、运行状态和笔记 ID。任务中的完整 Prompt 用于追溯；失败的笔记写入会暂存分析正文。

文件通过临时文件原子写入。状态损坏时停止自动化并保留原文件。队列是单机状态，不通过 Zotero 同步。

本版本采用手动更新；清单中的 `example.invalid` 是占位地址，尚未发布自动更新源。后续版本从本仓库 Releases 下载，再通过 Zotero 原生插件管理器安装。

## 当前限制

- 本版本支持 llm-for-zotero 的 API 模型与原生 Agent。Claude Code、Codex App Server、网页聊天或登录授权模型尚未接入；不会悄悄改用另一个后端。
- `runTurn()` 的公开接口没有模型配置读取函数，因此 adapter 额外只读 `modelProviderGroups`、`lastUsedModelEntryId` 和 `conversationSystem` 偏好。它们是一个额外的兼容点，不能声称只依赖两个接口。
- 修改事件不能可靠区分本机点击与同步带来的评分变化。同步也可能产生真实的“低于 5 → 5”。已有 Bridge 笔记可帮助补录去重，但任务状态仍是本机文件；笔记尚未同步时仍可能重复。建议只在一台电脑启用，不提供跨设备锁。
- 能核对工具是否成功返回图像，并核对运行是否成功结束；不能仅凭工具事件保证每张图、每个 panel 和每个表都已正确分析。应检查结果的图表清单和缺失说明。没有图像读取的纯表格论文会失败，需要人工处理。
- 子笔记将 Markdown 标题、加粗、列表、表格、代码块和链接转换为富文本，公式使用 Zotero 原生 math 标记。原始 HTML 作为文字保留，图像不会由 Bridge 再复制或联网加载。
- 很长的全文和完整 Prompt 可能达到所选模型或 Agent 的上下文、输出或轮数上限。未正常结束时不写成完成笔记，失败运行可在 llm-for-zotero 记录中检查。
- 首次升级到 0.1.7 时可能一次加入较多历史五星论文。队列严格串行，可先暂停自动化，检查表格后再启用。
- 清单支持 Zotero 7.0–10.0；真实宿主验证覆盖 Windows Zotero 9.0.6 和 10.0.6。

## 构建与测试

需要 Node.js 18+（测试）和 Python 3（打包）。运行和打包无需安装 npm 依赖，已固定内置 Marked 18.1.0，附带许可证。

```bash
npm test
npm run build
```

源代码按 rating、automation、adapters、prompts、notes、storage、preferences 分开。构建只合并本项目代码，不 import llm-for-zotero 源码。所有第三方插件的运行时访问集中在 `src/adapters/llmForZoteroAdapter.js`。

验证详情见 [docs/VALIDATION.md](docs/VALIDATION.md)。安装后的验收步骤见 [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md)。
