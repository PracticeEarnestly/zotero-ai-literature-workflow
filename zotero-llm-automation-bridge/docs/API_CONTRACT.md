# 核对的接口与兼容范围

核对日期：2026-10-15。本机只读检查：Zotero **10.0.6**，llm-for-zotero **3.9.11**，Ethereal Style **6.0.91**。

另外核对了 llm-for-zotero 主分支提交 `52c1604e178012f62db6529c63ec9178ac0cf4e8`。参考源码放在临时目录，未写入现有插件。

## 公开入口

```js
const api = Zotero.LLMForZotero?.api?.agent;
api.getZoteroGateway();
api.getZoteroGateway().resolvePaperContextTarget({ itemId, contextItemId });
api.getCapabilities(request);
await api.runTurn(request, onEvent, { signal });
api.resolveConfirmation(requestId, false);
await api.getRunTrace(runId);
```

`request` 至少包括 `mode: 'agent'`、`conversationKey`、`userText`、`item`、`libraryID`、`activeItemId`、`activePaperContext`、`fullTextPaperContexts` 和模型配置。`pdfPaperContexts` 专用于直接上传原始 PDF，必须与 `localDocuments` 逐一绑定。Bridge 不上传原始 PDF，而通过显式论文上下文调用 `paper_read`；因此使用 `activePaperContext` 与 `fullTextPaperContexts`。这个差异已在真实 Zotero 调用中核对。

Bridge 给每个运行分配独立的大整数 conversationKey，并保存计数；不复用论文侧栏的会话。

结果形状是 `{ kind: 'completed', runId, text }`，但失败终止也可能返回这个形状。因此还要核对 `getRunTrace(runId).run?.status`，或本轮 `agent_run_stop` 事件的 `payload.status` 为 `completed`，不能只查 `kind`。独立 conversationKey 在本机不属于上游会话 ledger，所以 trace 的 `run` 可为空；本机短测试有完整工具事件及成功终止事件，Bridge 使用终止事件核对完成，不写入或伪造上游会话 ledger。

`confirmation_required` 事件包含 `requestId`。后台任务调用公开的 `resolveConfirmation(requestId, false)` 拒绝请求，并禁止保存此次输出。

成功的 `tool_result` 事件可含 `artifacts`。Bridge 统计 `paper_read` / `file_io` 返回的 `kind: 'image'`；没有成功返回图像时不保存为视觉精读。计数不代表全图覆盖或图像理解正确。

## Style 入口

只读取 Zotero Extra 文本的 `rate: N`。本机 Style 的 `ratingColumn.storage` 未设用户覆盖值，插件默认值是 `extra`。

Style 6.0.86 已支持 `tag` 评分存储。因此“Style 总是把评分放在 Extra”并不完整。Bridge 在 `tag` 模式暂停触发，不修改 Style 的设置。

## 额外的只读配置兼容点

公开 Agent API 没有返回当前 UI 模型配置的入口。本版本在 adapter 内读取以下偏好，不写入：

```text
extensions.zotero.llmforzotero.modelProviderGroups
extensions.zotero.llmforzotero.lastUsedModelEntryId
extensions.zotero.llmforzotero.conversationSystem
extensions.zotero.llmforzotero.customShortcuts
extensions.zotero.zoterostyle.ratingColumn.storage
```

`customShortcuts` 只用于列出并显式导入用户已有的自定义 Prompt。导入是单向复制：用户仍需点击“保存设置”，Bridge 才建立自己的新版本；上游 Prompt 后续变化不会静默覆盖 Bridge，也不会发生反向写入。

这意味着依赖面比最初提出的两个接口稍大。未来上游若提供公开模型或 Prompt 配置接口，应优先替换此处的偏好读取。未知配置、外部运行时或缺失模型不会自动选择替代后端。

## 上游来源

- [Agent API](https://github.com/yilewang/llm-for-zotero/blob/52c1604e178012f62db6529c63ec9178ac0cf4e8/src/agent/index.ts)
- [第三方 Extension API](https://github.com/yilewang/llm-for-zotero/blob/52c1604e178012f62db6529c63ec9178ac0cf4e8/src/agent/extensionApi.ts)
- [请求、事件与结果类型](https://github.com/yilewang/llm-for-zotero/blob/52c1604e178012f62db6529c63ec9178ac0cf4e8/src/agent/types.ts)
- [Runtime 结束状态](https://github.com/yilewang/llm-for-zotero/blob/52c1604e178012f62db6529c63ec9178ac0cf4e8/src/agent/runtime.ts)
- [模型配置读取实现](https://github.com/yilewang/llm-for-zotero/blob/52c1604e178012f62db6529c63ec9178ac0cf4e8/src/utils/modelProviders.ts)
- [Zotero 插件与设置面板文档](https://www.zotero.org/support/dev/zotero_7_for_developers)
