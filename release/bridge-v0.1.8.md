# Zotero LLM Automation Bridge 0.1.8

本版本为任务队列增加工具诊断，并根据真实失败记录修正 Figure 工具调用约束。

## 主要变化

- 任务表格显示工具调用、Figure 调用、图像数量、最后工具、终止状态和脱敏错误。
- 失败诊断随任务保存；手动重试会清除上一轮诊断。
- Figure 没有返回真实图像时拒绝保存纯文字回答。
- `paper_read(mode: figures)` 不再允许 Agent 传入只支持 `visual/capture` 的 selector。
- 首次取图使用 Figure 1、Figure 2 这类完整主图标签；没有裁图时再尝试现有 MinerU 图像或 `visual` 模式。

## 验证

- 46 项自动化测试通过。
- 真实重试分别定位到“Figure 裁图无产物”和 `selector_not_supported_for_mode` 两类失败。
- XPI SHA-256：`67353119b9583a4a43cda3f6b88666b3a95d371cb57dfd1d54345f1216008dde`

本版本没有修改 llm-for-zotero、Style 或 AI Butler。
