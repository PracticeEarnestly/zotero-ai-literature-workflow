# Zotero AI 文献阅读部署

本目录记录本机 Zotero 文献阅读流程的部署状态与可复现配置。

当前可执行方案请以 [第二版部署说明](Zotero_AI_Literature_L1_L2_L3_Codex_Deployment_V2.md) 为准；第一版方案仅保留作设计记录。

用于后续升级的可编辑 V2 源码基线见 [SOURCE_BASELINE.md](SOURCE_BASELINE.md)。

在另一台电脑从零部署，请阅读 [OTHER_COMPUTER_DEPLOYMENT_GUIDE.md](OTHER_COMPUTER_DEPLOYMENT_GUIDE.md)。

## 使用方式

1. 新加入且 PDF 已就绪的文献会自动运行 `L1：One Sentence`，并把 L1 输出中的结构化标签写回父文献。
2. Ethereal Style 的“评级”字段为 1 星时，文献保持在 L1；对于尚未完成 L1 的已评分文献，2–4 星会依次运行 L1、L2，5 星会依次运行 L1、L2、L3。对于已有 L1 的文献，2–4 星只追加 L2，5 星按 L2 后 L3 的顺序继续。完成后分别写入 `AI:L1`、`AI:L2`、`AI:L3` 标签，避免重复运行。
3. 对任意 Collection 右键，选择“L1 批量文献总结并打标签”，可处理该分类的直接子文献；已有 AI Note 会追加新的 L1 结果。
4. L3 Deep Reading 可在 AI Butler 文献右键菜单手动入队，也可在 llm-for-zotero 的单篇论文对话中输入 `L3`（或“深度阅读”）调用；给文献评为 5 星时也会自动触发。

模型路由：L1 可在 AI Butler 的 Zotero 偏好设置中选择服务器 Qwen 27B（默认）或本地 LM Studio 的 Gemma4 12B；L2 固定使用服务器 Qwen 27B；AI Butler L3 与 llm-for-zotero L3 共用 Gemma 31B（`gemma-4-31b-it-claude-opus-distill-v2`）。已入队任务会保留入队时的端点。
5. 在 llm-for-zotero Agent Mode 中使用 `research-literature-tagging` 管理科研用途标签。

如果同一条目含有多个 PDF，工作流会跳过失效的旧附件，选择第一个本地路径可用的 PDF；不会因旧附件缺失而阻止 L1 或 L2。

首次使用自定义标签 Skill 前，重启 Zotero 一次，使插件重新扫描 Skills 目录。

L1/L2/L3 自定义 Skill 位于 llm-for-zotero 的实际用户 Skills 目录；新增或修改后同样需要重启 Zotero 一次。

模型 endpoint、密钥和局域网地址仅保存在 Zotero 本地设置或被忽略的本地文件中，不写入 Git。

现有 AI Butler 提示词名称与本目录的对应关系：

| 已有名称 | 流程名称 |
| --- | --- |
| `L1：One Sentence` | `01_L1_OneSentence` |
| `L2：Evidence Card` | `02_L2_EvidenceCard` |
| `L3：Deep Reading` | `03_L3_DeepReading` |

自定义 AI Butler 3.8.5.25 已移除官方更新地址，日常不会自动被上游版本覆盖。本地补丁提供自动 L1、评级触发的自动 L2/L3、L3 队列交接唤醒、失败任务手动重跑、Collection 批量 L1，llm-for-zotero MinerU 缓存复用与 Zotero 原生 ZIP 后备读取。工作流层级采用 Literature Flow 的精简规则：只使用固定阶段标签、结果追加到已有 AI Note，且非 L1 的旧 AI Note 不会阻止新 PDF 自动进入 L1。详见 [3.8.5.25 发布说明](RELEASE_3.8.5.25.md)、[LITERATURE_FLOW_ALIGNMENT.md](LITERATURE_FLOW_ALIGNMENT.md) 与 [UPGRADE_GUARD.md](UPGRADE_GUARD.md)。

详见 [DEPLOYMENT_AUDIT.md](DEPLOYMENT_AUDIT.md)、[DEPLOYMENT_COMPLETE.md](DEPLOYMENT_COMPLETE.md) 和 [ROLLBACK.md](ROLLBACK.md)。
