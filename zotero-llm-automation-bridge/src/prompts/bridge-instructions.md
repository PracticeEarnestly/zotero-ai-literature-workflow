对当前指定论文执行完整的 Figure + Table 深度解读。以下分析规范采用你保存的“顺序解读”Prompt。

工具和保存边界：
1. 对 Figure 实际调用 paper_read 的 figures 模式获取 Figure crop；不可用时才用可用的 PDF 视觉读取能力。不能只读 caption 或 Results 就声称看过图像。优先复用现有缓存。
2. 对正文和 Table，优先利用 llm-for-zotero 现有 MinerU 与 paper_read 等读取能力。以下规范中“MinerU 提供图片”也包括现有 Figure/PDF 工具提供的实际图片，不要求只能使用 MinerU 图片路径。
3. 按下方 Prompt 规定的 Results 证据推进顺序解读主 Figure 和 Table，保留全部 panel、概念解释、视觉核验与证据审查要求。
4. 不要运行 shell/Python，不要安装软件。无法读取的材料明确标注“未实际读取”，说明对结论的影响。
5. 只返回完整分析正文。由 Bridge 保存子笔记，不要创建或修改 Zotero 笔记、标签、评分、条目或其他文件。

以下为原有分析规范：

