# 部署审计

审计日期：2026-08-26

## V2 运行验证

- AI Butler：3.8.5.2 本地补丁版，已包含评分解析、缺失 L1 补做与 L3 队列唤醒修复。
- 真实条目已验证：Style 写入 `rate: 5` 后，自动运行 L2，完成后自动运行 L3。
- L1 与 L2 固定使用 Qwen 27B；L3 固定使用 Gemma 31B。
- L2、L3 均追加到现有 AI Note；成功后分别存在 `AI:L2`、`AI:L3` 标签。
- 已评分但没有 `AI:L1` 的条目会先运行 L1，再按评级继续 L2 或 L3。
- 最新回退包保存在 `backup/zotero-ai-butler-3.8.5-codex-rated-l1-l2-l3-chain-*.xpi`。

## Zotero

- Zotero：9.0.6。
- 本地 API：已启用，`/api` 返回 200。
- Connector：运行正常，返回 200。
- Profile：已识别；部署前已备份到本目录的忽略目录。
- 数据库：未直接读取、修改或写入。

## 插件与解析

- Zotero-AI-Butler：3.8.1 本地补丁版，已安装。
- llm-for-zotero：3.9.1，已安装，Agent Mode 已启用。
- MinerU：AI Butler 全局 PDF 模式为 MinerU；现有缓存抽样含有 Methods、Results、Tables 和 Figure legends。
- AI Butler：已存在 L1、L2、L3 自定义提示词，支持多供应商优先级路由、失败切换、队列和多轮总结。
- llm-for-zotero：现有内置 Skills 已保留；自定义 `research-literature-tagging` 已安装，重启 Zotero 后加载并进行界面验收。

## 模型服务（只读检查）

| 节点 | 目标模型 | `/models` | 普通 Chat | 长文本基础检查 | 工具调用 |
| --- | --- | --- | --- | --- | --- |
| Computer A | Gemma4 12B | PASS | PASS | 未要求 | API 与插件 Tag Agent 均 PASS |
| Computer B primary | Qwen3.6 27B | PASS | PASS | PASS | 不测试、不启用 |
| Computer B secondary | Qwen3.6 27B | UNREACHABLE | 未测 | 未测 | 不适用 |
| Computer C | Gemma4 31B | PASS | PASS | PASS | 不要求 |

Qwen 服务返回的实际 `max_model_len` 是 245,760。部署按这一实际值记录，不修改服务端参数。

## 发现与处置

- Qwen 备用地址在本次检查中超时；主地址可用，已在 AI Butler 的启用 Qwen profile 中设为主地址。
- AI Butler 的停用 Reviewer profile 已更新为实际 Gemma31 模型 ID；运行 L3 前手动启用它并停用 Qwen。
- AI Butler 的现有 L2/L3 提示词结构已覆盖方案要求，因此未覆盖。
- 实测默认分析可完成 L1。已实施最小补丁：右键新增“运行阅读层级”子菜单，包含 L1/L2/L3；所选自定义提示词会保存到任务内，避免队列运行时改用全局默认提示词。
- AI Note 出现无关标签的根因是 Actions & Tags 的结构化同步规则被误设为“添加标签”，脚本文本被逗号拆分后写入 Note。规则现已改为“执行脚本”。
- 已在唯一受影响的历史 AI Note 上删除 46 个脚本碎片标签，并保留 `AI-Generated`；未改动 Note 内容、父文献或其他条目。
- Zotero 本地 API 的列表读取出现 `ResponseEnded`；未绕过 API，也未访问 SQLite。其余 Zotero 状态检查正常。
- 审计中发现原有插件首选项含有本地保存的凭据字段。未将任何凭据复制到文档或 Git；本次未轮换或迁移这些既有凭据。
- 已备份原 AI Butler 3.8.0 安装包、修复前的 `prefs.js` 和 Zotero 扩展启动缓存；未修改 Zotero SQLite。
