Bridge.WaitingLLM = class extends Error {};
Bridge.LLMAdapter = class {
  constructor(zotero) { this.zotero = zotero; }
  resetDiagnostics() {
    this.progress = { phase: "PREPARING", events: 0, toolCalls: 0, toolResults: 0,
      toolErrors: 0, paperReadCalls: 0, figureCalls: 0, figureResults: 0,
      figureFailures: 0, images: 0, failures: [], updatedAt: new Date().toISOString() };
  }
  diagnostics() {
    return this.progress ? JSON.parse(JSON.stringify(this.progress)) : null;
  }
  eventMode(event) {
    const args = event.input || event.arguments || event.args || event.payload?.input
      || event.payload?.arguments || event.payload?.args || {};
    return typeof args.mode === "string" ? args.mode : "";
  }
  diagnosticMessage(event) {
    const value = event.error || event.message || event.content?.error || event.content?.message
      || event.content?.guidance || event.content?.reason;
    if (value === undefined || value === null) return "";
    let text;
    try { text = typeof value === "string" ? value : JSON.stringify(value); }
    catch (_) { text = String(value); }
    return text.replace(/https?:\/\/\S+/gi, "[URL]")
      .replace(/(authorization|api[_-]?key|bearer|token)\s*[:=]?\s*\S+/gi, "$1=[REDACTED]")
      .replace(/[A-Za-z0-9_\-]{48,}/g, "[REDACTED]").slice(0, 240);
  }
  recordEvent(event) {
    const progress = this.progress;
    progress.events++; progress.updatedAt = new Date().toISOString();
    progress.lastEvent = event.type;
    const name = /^[a-z_]+$/.test(event.name || "") ? event.name : "";
    const explicitMode = this.eventMode(event);
    let mode = explicitMode;
    if (event.type !== "tool_call" && !mode && name && name === progress.lastTool)
      mode = progress.lastToolMode || "";
    if (name) progress.lastTool = name;
    if (event.type === "tool_call") progress.lastToolMode = explicitMode;
    else if (mode) progress.lastToolMode = mode;
    if (event.type === "tool_call") {
      progress.toolCalls++;
      if (name === "paper_read") {
        progress.paperReadCalls++;
        if (mode === "figures") progress.figureCalls++;
      }
    }
    if (event.type === "tool_result") {
      progress.toolResults++;
      const imageCount = event.ok === true && ["paper_read", "file_io"].includes(name)
        ? (event.artifacts || []).filter(artifact => artifact.kind === "image").length : 0;
      progress.images += imageCount;
      if (name === "paper_read" && (mode === "figures" || imageCount)) {
        progress.figureResults++;
        if (event.ok === true && !imageCount) {
          this.recordFailure(name, mode, event, false);
        }
      }
      if (event.ok === false) this.recordFailure(name, mode, event);
    }
    if (event.type === "tool_error") this.recordFailure(name, mode, event);
    if (event.type === "provider_event" && event.providerType === "agent_run_stop") {
      progress.terminalStatus = event.payload?.status;
    }
  }
  recordFailure(name, mode, event, countAsToolError = true) {
    if (countAsToolError) this.progress.toolErrors++;
    if (name === "paper_read" && mode === "figures") this.progress.figureFailures++;
    const row = { tool: name || "unknown" };
    if (mode) row.mode = mode;
    const message = this.diagnosticMessage(event);
    if (message) row.message = message;
    this.progress.failures.push(row);
    if (this.progress.failures.length > 8) this.progress.failures.shift();
  }
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
  customPrompts() {
    const raw = this.zotero.Prefs.get("extensions.zotero.llmforzotero.customShortcuts", true);
    let rows;
    try { rows = JSON.parse(raw || "[]"); } catch (_) { return []; }
    if (!Array.isArray(rows)) return [];
    return rows.filter(row => row && typeof row.id === "string" && row.id.trim()
        && typeof row.prompt === "string" && row.prompt.trim())
      .map(row => ({ id: row.id.trim(), label: typeof row.label === "string" && row.label.trim()
        ? row.label.trim() : "Custom Shortcut", prompt: row.prompt.trim() }));
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
    this.resetDiagnostics();
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
      userText: Bridge.agentToolContract + job.prompt, history: [], ...model };
    if (typeof api.getCapabilities !== "function" || typeof api.resolveConfirmation !== "function"
        || typeof api.getRunTrace !== "function") throw new Bridge.WorkflowError("llm-for-zotero 公开 API 版本不兼容");
    const cap = await api.getCapabilities(request);
    if (!cap.toolCalls) throw new Bridge.WorkflowError("所选模型不支持 Agent 工具调用");
    if (!(cap.contentInputs?.images ?? cap.multimodal)) throw new Bridge.WorkflowError("所选模型不支持视觉输入，无法完成真实读图");
    let confirmation = false, terminalStatus;
    this.progress.phase = "RUNNING_AGENT";
    const result = await api.runTurn(request, event => {
      this.recordEvent(event);
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
    this.progress.runId = result.runId;
    // `kind: completed` alone also occurs on failed terminal runs in upstream.
    const trace = await api.getRunTrace(result.runId);
    this.progress.terminalStatus = trace?.run?.status || terminalStatus;
    if (this.progress.terminalStatus !== "completed") throw new Bridge.WorkflowError("Agent 未正常完成；分析未写入笔记");
    this.progress.phase = "VALIDATING_RESULT";
    if (!this.progress.images) {
      if (!this.progress.figureCalls)
        throw new Bridge.WorkflowError("Agent 未调用 Figure 图像读取工具；已拒绝保存仅依据文字或图注的回答");
      if (this.progress.figureFailures || this.progress.toolErrors)
        throw new Bridge.WorkflowError("Figure 图像读取失败或未返回裁图；请查看任务诊断后重试");
      throw new Bridge.WorkflowError("Figure 图像读取没有返回图像；已拒绝保存仅依据文字或图注的回答");
    }
    this.progress.phase = "COMPLETED";
    return { text: result.text.trim(), runId: result.runId, model: model.model,
      visualImageCount: this.progress.images, diagnostics: this.diagnostics() };
  }
};
