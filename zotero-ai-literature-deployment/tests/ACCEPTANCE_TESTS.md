# 验收测试

先创建测试 Collection：`AI-Literature-Pipeline-Test`，放入以下五类论文各一篇：临床观察、scRNA-seq、动物实验、体外功能实验、复杂多组学或空间论文。

| 测试 | 通过标准 |
| --- | --- |
| MinerU | 每篇可读到 Methods、Results 和基本 Figure legends；优先复用缓存。 |
| L1 | 5/5 成功；Qwen 输出严格一句中文；不把相关写成因果；AI Note 正常生成。 |
| Collection L1 | 未分析论文可加入 Queue；不重复处理；结束后可识别 AI Note。 |
| L2 | 至少两篇；Evidence Card 完整；只有一个 Evidence 等级；不编造定量结果。 |
| L3 | 至少一篇功能/机制论文；输出 Demonstrated、Associated、Predicted、Speculative、Why not higher 与 Claims to Avoid。 |
| Tag Agent | 在测试条目依次验证 `Status:Core` → `Status:Maybe`（前者移除）→ `Grant:Hypothesis`；测试结束后删除测试标签。 |

Qwen 不发送 `tools`、`tool_choice` 或任何 Agent schema。L3 使用 Gemma31；Gemma12 仅用于 Agent/标签与 L1 备用。
