# Zotero LLM Automation Bridge 0.1.6

本版本修复 Zotero 10 升级后 Bridge 被禁用、模型选项变灰和 Prompt 空白的问题，并加入 llm-for-zotero 自定义 Prompt 的显式导入。

## 主要变化

- 支持 Zotero 7.0–10.0，并在 Windows Zotero 10.0.6 中完成原生更新和加载验证。
- 模型下拉框恢复可用，能读取当前 llm-for-zotero 的 API 模型。
- 保留 Bridge 已保存的 Prompt，不会因更新而清空。
- 可从 llm-for-zotero 的自定义 Prompt 列表选择并载入。载入后仍需保存，形成 Bridge 独立版本；不会修改上游 Prompt。
- 任务队列改为表格，显示状态、文献、评分变化、Prompt 版本、模型、尝试次数、更新时间和详情，并保留手动重试。
- 设置控制器由 Bridge 全局对象提供，减少 Zotero 偏好页脚本作用域造成的初始化失败。

## 验证

- 42 项自动化测试通过。
- 真实设置页读取到 3 个 API 模型和 4 个自定义 Prompt。
- 原有 Bridge Prompt 保持 15,857 个字符、版本 3。
- 真实任务表格显示 3 条历史任务，包括 2 条完成和 1 条失败任务。
- XPI SHA-256：`81972d010fdea998a051ba3eb6bacf57dccef3887e37158f2770e9a1e8947265`

本版本没有修改 llm-for-zotero、Style 或 AI Butler。
