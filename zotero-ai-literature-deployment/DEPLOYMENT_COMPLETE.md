# 部署完成状态

更新日期：2026-08-24

## 已完成

- 完成 Zotero、插件、MinerU 缓存和模型 endpoint 的只读审计。
- 备份现有 Profile、AI Butler 设置和 llm-for-zotero Skills。
- 验证 Qwen 主节点与 Gemma31 的 OpenAI-compatible chat/completions。
- 将 AI Butler 启用的 Qwen Reader 指向已验证的主节点。
- 将 AI Butler 的停用 Reviewer profile 更新为 Gemma31；L3 前需人工切换。
- 生成三层提示词、标签 Skill、标签分类和验收清单。
- 将 `research-literature-tagging` 安装到实际 llm-for-zotero Skills 目录。
- 重启后在插件界面完成 Tag Agent 验收：`Status:Core` 可互斥替换为 `Status:Maybe`，并成功添加 `Grant:Hypothesis`。
- 已创建 `IBD/AI-Literature-Pipeline-Test` 测试 Collection；当前尚未放入测试条目。
- 已在 IBD 的人群观察研究 *Analysis of microplastics in human feces...* 完成 1 篇 L1 端到端运行：Qwen 生成中文单句摘要、写入 `AI:L1` 结构化标签 JSON，并生成 AI Note 和 MinerU 缓存。
- 未修改 Zotero SQLite，未修改模型服务、端口、上下文或启动参数。
- 已实施本地 AI Butler 3.8.1 最小补丁：右键增加“运行阅读层级”菜单，包含 L1/L2/L3；任务保存对应提示词，避免执行时误用全局默认提示词。
- 已修复 AI Note 无关标签根因：Actions & Tags 规则原先被设为“添加标签”，导致脚本文本被逗号拆分后写入 Note；现已改为“执行脚本”。
- 已清理该历史 L1 AI Note：删除 46 个脚本碎片标签，保留正常的 `AI-Generated` 标签；未删除 Note、父文献或其他标签。
- 已备份原始 AI Butler 3.8.0 安装包、修复前 `prefs.js` 和启动缓存；未修改 Zotero SQLite。
- 已在 Plugins Manager 中将 AI Butler 的自动更新恢复为 Default；未来官方升级可能覆盖本地自动 L1 和 Collection 批量入口。
- 已保留 `scripts/Test-AiButlerPatch.ps1`、补丁安装包和 `UPGRADE_GUARD.md`，用于检查与恢复本地工作流。
- 已在 llm-for-zotero 的用户 Skills 目录中创建 `zotero-literature-l1`、`zotero-literature-l2` 和 `zotero-literature-l3`；它们分别对应一句话阅读、证据卡和深度阅读，重启 Zotero 后加载。

## 日常流程与待验收

- 已安装并重启 3.8.5 本地包：新增带 PDF 文献自动 L1 → 结构化标签回写；任意 Collection 右键批量 L1 → 结构化标签回写；已有 AI Note 追加新结果。
- 为 `AI-Literature-Pipeline-Test` 确认并放入五类测试论文。
- 再完成 4 篇 L1 验收。
- L2 Evidence Card 与 L3 Deep Reading 已移为 llm-for-zotero 的备用能力，不再是日常流程的验收前置条件。

## 当前阻碍

- 待在下一篇 AI Note 上完成端到端确认：Note 本身不再产生脚本碎片标签，父文献只获得 JSON 中定义的结构化科研标签。

这些步骤会向 Zotero 新建 Collection、Notes 或 Tags。L2/L3 可能替换已有 AI Note，因此应在测试样本确认后执行。验收标准见 [tests/ACCEPTANCE_TESTS.md](tests/ACCEPTANCE_TESTS.md)。
