# Zotero LLM Automation Bridge 0.1.5

独立的 Zotero 自动化插件：Style 的 Extra 评分由低于 5 进入五星时，将论文加入队列，调用 llm-for-zotero 的公开 Agent API，并保存论文子笔记。

本版修复 Markdown 保存：标题、加粗、列表、表格、代码块及链接转为 Zotero 富文本，公式采用 Zotero 原生 math 标记。更新后自动迁移 Bridge 自己生成的旧版纯文本笔记，迁移前备份原文，不重新调用模型。

## 下载与安装

下载 `zotero-llm-automation-bridge-0.1.5.xpi`，在 Zotero“工具 → 插件 → 从文件安装插件”中安装。需要已安装 Style（Extra 评分模式）和 llm-for-zotero，并配置支持工具调用及图像输入的 API 模型。

首次启动只建立当前评分基线，不批量分析已有五星。设置和队列保存在 Zotero 数据目录的 `llm-automation-bridge/`。本版采用手动更新。

## 验证

- 40 项测试通过；XPI 完整性与确定性构建检查通过。
- Windows Zotero 9.0.6 已实际加载，真实 Agent 调用、子笔记保存和两份旧笔记迁移已验证。
- Style、llm-for-zotero 和 AI Butler 未修改。
- Zotero 7/8、界面截图及跨设备同步尚未验证；全部图表覆盖与科学内容需要人工检查。

SHA-256：`5418681567a6fc1c58fbd38bf983aa6cac984038def88b2d5047a8f3be8b05a1`

[使用说明](https://github.com/PracticeEarnestly/zotero-ai-literature-workflow/tree/main/zotero-llm-automation-bridge) · [验证记录](https://github.com/PracticeEarnestly/zotero-ai-literature-workflow/blob/main/zotero-llm-automation-bridge/docs/VALIDATION.md)
