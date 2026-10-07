Bridge.WaitingLLM = class extends Error {};
Bridge.LLMAdapter = class {
  constructor(zotero) { this.zotero = zotero; }
  api() {
    const api = this.zotero.LLMForZotero?.api?.agent;
    if (!api || typeof api.runTurn !== "function" || typeof api.getZoteroGateway !== "function")
      throw new Bridge.WaitingLLM("llm-for-zotero unavailable — queued tasks will not run.");
    try { api.getZoteroGateway(); } catch (_) { throw new Bridge.WaitingLLM("llm-for-zotero 正在初始化"); }
    return api;
  }
  // The public turn API does not expose a model selector. All compatibility
  // reads of llm-for-zotero preferences stay here; never import its runtime.
  models() {
    const raw = this.zotero.Prefs.get("extensions.zotero.llmforzotero.modelProviderGroups", true);
    let groups;
    try { groups = JSON.parse(raw || "[]"); } catch (_) { return []; }
    if (!Array.isArray(groups)) return [];
    return groups.flatMap(group => (Array.isArray(group.models) ? group.models : [])
      .filter(row => row.id && typeof row.model === "string" && row.model.trim())
      .map(row => ({ id: row.id, model: row.model.trim(), group, row })));
  }
  model(id) {
    const last = this.zotero.Prefs.get("extensions.zotero.llmforzotero.lastUsedModelEntryId", true);
    const entries = this.models();
    const entry = entries.find(row => row.id === (id || last));
    if (!entry) throw new Bridge.WaitingLLM("请在 Bridge 设置中选择 llm-for-zotero 已配置的模型");
    const { group, row } = entry;
    const authMode = group.authMode || "api_key";
    // Native external chat runtimes need a separate host contract. Fail closed
    // rather than silently route a request to a different backend.
    if (authMode !== "api_key") throw new Bridge.WaitingLLM("此版本支持 API 模型；请选择 llm-for-zotero 中已配置的 API 模型");
    if (!group.apiBase) throw new Bridge.WaitingLLM("所选模型未配置 API 地址");
    return { model: entry.model, apiBase: group.apiBase, apiKey: group.apiKey || "", authMode,
      providerProtocol: row.providerProtocol || group.providerProtocol || "openai_chat_compat" };
  }
  async run(item, job, signal) {
    this.progress = { phase: "PREPARING", events: 0, images: 0, updatedAt: new Date().toISOString() };
    const api = this.api();
    const system = this.zotero.Prefs.get("extensions.zotero.llmforzotero.conversationSystem", true);
    if (system && system !== "upstream") throw new Bridge.WaitingLLM("请将 llm-for-zotero 对话系统切换为原生 Agent；此版本尚未接入外部运行时");
    const model = this.model(job.modelEntryId);
    const attachment = await item.getBestAttachment();
    if (!attachment || !attachment.isPDFAttachment()) throw new Bridge.WorkflowError("当前论文没有可读取的 PDF 附件");
    const context = await api.getZoteroGateway().resolvePaperContextTarget({ itemId: item.id, contextItemId: attachment.id });
    if (!context || context.itemId !== item.id || context.contextItemId !== attachment.id)
      throw new Bridge.WorkflowError("公开 Gateway 无法解析指定论文的 PDF 上下文");
    const request = { conversationKey: job.conversationKey, mode: "agent", conversationKind: "paper",
      scopeType: "paper", activeItemId: item.id, item, libraryID: item.libraryID,
      activePaperContext: { ...context, libraryID: item.libraryID },
      fullTextPaperContexts: [{ ...context, libraryID: item.libraryID }],
      userText: job.prompt, history: [], ...model };
    if (typeof api.getCapabilities !== "function" || typeof api.resolveConfirmation !== "function"
        || typeof api.getRunTrace !== "function") throw new Bridge.WorkflowError("llm-for-zotero 公开 API 版本不兼容");
    const cap = await api.getCapabilities(request);
    if (!cap.toolCalls) throw new Bridge.WorkflowError("所选模型不支持 Agent 工具调用");
    if (!(cap.contentInputs?.images ?? cap.multimodal)) throw new Bridge.WorkflowError("所选模型不支持视觉输入，无法完成真实读图");
    let confirmation = false, terminalStatus, visualImageCount = 0;
    this.progress.phase = "RUNNING_AGENT";
    const result = await api.runTurn(request, event => {
      this.progress.events++; this.progress.updatedAt = new Date().toISOString();
      this.progress.lastEvent = event.type;
      if (["tool_call", "tool_result"].includes(event.type) && /^[a-z_]+$/.test(event.name || ""))
        this.progress.lastTool = event.name;
      if (event.type === "tool_result" && event.ok === true && ["paper_read", "file_io"].includes(event.name))
        visualImageCount += (event.artifacts || []).filter(artifact => artifact.kind === "image").length;
      this.progress.images = visualImageCount;
      if (event.type === "provider_event" && event.providerType === "agent_run_stop") terminalStatus = event.payload?.status;
      if (event.type === "confirmation_required") {
        confirmation = true;
        // A background workflow has no approval surface. Decline, never grant
        // Agent write/command authority merely to make automation continue.
        api.resolveConfirmation(event.requestId, false);
      }
    }, { signal });
    if (signal?.aborted) throw new Bridge.WorkflowError("运行已停止");
    if (confirmation) throw new Bridge.WorkflowError("Agent 请求额外确认；已拒绝并停止保存，请在 llm-for-zotero 中人工检查");
    if (result?.kind !== "completed" || typeof result.text !== "string" || !result.text.trim())
      throw new Bridge.WorkflowError("Agent 未返回完整分析");
    // `kind: completed` alone also occurs on failed terminal runs in upstream.
    const trace = await api.getRunTrace(result.runId);
    if ((trace?.run?.status || terminalStatus) !== "completed") throw new Bridge.WorkflowError("Agent 未正常完成；分析未写入笔记");
    if (!visualImageCount) throw new Bridge.WorkflowError("未观测到成功的图像读取；请检查 Figure/PDF 工具及模型，不将仅图注解读保存为深度精读");
    return { text: result.text.trim(), runId: result.runId, model: model.model, visualImageCount };
  }
};
