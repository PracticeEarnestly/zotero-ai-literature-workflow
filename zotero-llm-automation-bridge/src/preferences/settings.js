Bridge.prefPrefix = "extensions.zotero.llmAutomationBridge.";
Bridge.pref = (name, fallback) => Zotero.Prefs.get(Bridge.prefPrefix + name, true) ?? fallback;
Bridge.settings = () => ({ enabled: Bridge.pref("enabled", true), rerun: Bridge.pref("rerun", true),
  replace: Bridge.pref("replace", true), noteTitle: Bridge.pref("noteTitle", "📊 Deep Figure & Table Review"),
  modelEntryId: Bridge.pref("modelEntryId", ""), prompt: Bridge.config.prompt, promptVersion: Bridge.config.promptVersion });
Bridge.WorkflowError = class extends Error {};
Bridge.safeError = error => error instanceof Bridge.WorkflowError || error instanceof Bridge.WaitingLLM
  ? error.message : "后端调用或存储失败；请检查 llm-for-zotero 的配置和日志后手动重试";
Bridge.updateSettings = async values => {
  if (!values.prompt?.trim() || !values.noteTitle?.trim()) throw new Bridge.WorkflowError("Prompt 和笔记标题不能为空");
  const next = { ...Bridge.config };
  if (values.prompt !== next.prompt) { next.prompt = values.prompt; next.promptVersion++; }
  await IOUtils.writeUTF8(Bridge.configPath, JSON.stringify(next), { tmpPath: Bridge.configPath + ".tmp" });
  Bridge.config = next;
  for (const key of ["enabled", "rerun", "replace", "modelEntryId", "noteTitle"])
    Zotero.Prefs.set(Bridge.prefPrefix + key, values[key], true);
  if (!values.enabled) Bridge.queue.abort?.abort();
  await Bridge.save();
  Bridge.kick();
};
Bridge.initPreferences = win => {
  const doc = win.document, bridge = Zotero.LLMAutomationBridge;
  const el = key => doc.getElementById("llm-bridge-" + key);
  if (!bridge?.state) { el("status").textContent = "Bridge 未就绪"; return; }
  const cfg = bridge.settings();
  for (const key of ["enabled", "rerun", "replace"]) el(key).checked = cfg[key];
  for (const key of ["prompt", "noteTitle"]) el(key).value = cfg[key];
  const addOption = (select, value, label) => {
    const option = doc.createElementNS("http://www.w3.org/1999/xhtml", "option");
    option.value = value; option.textContent = label; select.appendChild(option);
  };
  const populateModels = () => {
    const select = el("model"), selected = select.value || cfg.modelEntryId;
    select.replaceChildren();
    addOption(select, "", "使用 llm-for-zotero 最近选择的模型");
    const entries = bridge.adapter.models().filter(entry => !entry.group.authMode || entry.group.authMode === "api_key");
    for (const entry of entries) addOption(select, entry.id, entry.model);
    if (selected && !entries.some(entry => entry.id === selected))
      addOption(select, selected, "已保存模型不可用；请选择新模型");
    select.value = selected;
    select.disabled = false;
    el("modelStatus").textContent = entries.length
      ? `已读取 ${entries.length} 个 llm-for-zotero API 模型。` : "没有读取到 API 模型，请先在 llm-for-zotero 中配置。";
  };
  const populatePromptSources = () => {
    const select = el("promptSource"), selected = select.value;
    select.replaceChildren();
    addOption(select, "", "选择 llm-for-zotero 自定义 Prompt");
    const rows = bridge.adapter.customPrompts();
    for (const row of rows) addOption(select, row.id, row.label);
    const preferred = selected && rows.some(row => row.id === selected) ? selected
      : rows.find(row => row.label === "顺序解读")?.id || "";
    select.value = preferred;
    select.disabled = rows.length === 0;
    el("promptSourceStatus").textContent = rows.length
      ? `已读取 ${rows.length} 个自定义 Prompt。导入后仍需点击“保存设置”。`
      : "llm-for-zotero 当前没有可导入的自定义 Prompt。";
  };
  const render = () => {
    el("status").textContent = bridge.status();
    el("version").textContent = `Prompt version: ${bridge.config.promptVersion}`;
    const counts = {};
    for (const job of bridge.state.jobs) counts[job.status] = (counts[job.status] || 0) + 1;
    el("jobsSummary").textContent = Object.entries(counts).map(([key, count]) => `${key}: ${count}`).join(" | ") || "暂无任务";
    const body = el("jobsBody"); body.replaceChildren();
    const statusLabel = { QUEUED: "排队中", WAITING_LLM: "等待后端", RUNNING: "运行中", COMPLETED: "已完成", FAILED: "失败" };
    const cell = (row, value) => {
      const td = doc.createElementNS("http://www.w3.org/1999/xhtml", "td");
      td.textContent = value; td.style = "padding: 6px; border-top: 1px solid rgba(127, 127, 127, 0.25); overflow-wrap: anywhere; vertical-align: top;";
      row.appendChild(td); return td;
    };
    const formatTime = value => {
      if (!value) return "—";
      const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
    };
    if (!bridge.state.jobs.length) {
      const row = doc.createElementNS("http://www.w3.org/1999/xhtml", "tr"), td = cell(row, "暂无任务");
      td.colSpan = 8; body.appendChild(row); return;
    }
    for (const job of bridge.state.jobs.slice(-30).reverse()) {
      const row = doc.createElementNS("http://www.w3.org/1999/xhtml", "tr");
      cell(row, statusLabel[job.status] || job.status);
      const title = cell(row, job.title || job.itemKey); title.title = job.itemKey;
      cell(row, job.triggerSource === "existing-five-star" ? "现有 5" : `${job.previousRating ?? "< 5"} → ${job.triggerRating ?? 5}`);
      cell(row, `v${job.promptVersion ?? "?"}`);
      cell(row, job.model || job.modelEntryId || "最近选择");
      cell(row, String(job.attempts || 0));
      cell(row, formatTime(job.updatedAt || job.completedAt || job.createdAt));
      const detail = cell(row, job.error || (job.noteID ? `笔记 #${job.noteID}` : "—"));
      if (job.diagnostics) {
        const d = job.diagnostics, parts = [
          `工具调用 ${d.toolCalls || 0}`,
          `paper_read ${d.paperReadCalls || 0}`,
          `Figure ${d.figureCalls || 0}`,
          `图像 ${d.images || 0}`,
          `工具错误 ${d.toolErrors || 0}`,
        ];
        if (d.lastTool) parts.push(`最后工具 ${d.lastTool}`);
        detail.appendChild(doc.createElementNS("http://www.w3.org/1999/xhtml", "br"));
        detail.appendChild(doc.createTextNode(`诊断：${parts.join("；")}`));
        for (const failure of d.failures || []) {
          detail.appendChild(doc.createElementNS("http://www.w3.org/1999/xhtml", "br"));
          detail.appendChild(doc.createTextNode(`工具失败：${failure.tool}${failure.mode ? `/${failure.mode}` : ""}${failure.message ? `：${failure.message}` : ""}`));
        }
      }
      if (["FAILED", "WAITING_LLM"].includes(job.status)) {
        detail.appendChild(doc.createElementNS("http://www.w3.org/1999/xhtml", "br"));
        const button = doc.createElementNS("http://www.w3.org/1999/xhtml", "button"); button.textContent = "使用当前模型重试";
        button.addEventListener("click", async () => {
          button.disabled = true;
          try { await bridge.retry(job.id); render(); } catch (_) { el("feedback").textContent = "重试未保存，请检查状态文件"; }
        }); detail.appendChild(button);
      }
      body.appendChild(row);
    }
  };
  try { populateModels(); populatePromptSources(); } catch (error) {
    Zotero.logError(error);
    el("status").textContent = "设置读取失败，请重启 Zotero 后重试";
  }
  el("refreshModels").onclick = () => { populateModels(); populatePromptSources(); };
  el("importPrompt").onclick = () => {
    const source = bridge.adapter.customPrompts().find(row => row.id === el("promptSource").value);
    if (!source) { el("feedback").textContent = "请先选择一个 llm-for-zotero 自定义 Prompt"; return; }
    el("prompt").value = bridge.composeImportedPrompt(source.prompt);
    el("feedback").textContent = `已载入“${source.label}”；点击“保存设置”后生效`;
  };
  el("refresh").onclick = render;
  el("scanExisting").onclick = async () => {
    el("scanExisting").disabled = true;
    try {
      const result = await bridge.scanExistingFiveStars();
      el("feedback").textContent = `扫描 ${result.fiveStar} 篇五星论文；新增 ${result.added} 个任务，已有任务 ${result.existingJob} 篇，已有 Bridge 笔记 ${result.existingNote} 篇`;
      render(); bridge.kick();
    } catch (error) { el("feedback").textContent = bridge.safeError(error); }
    finally { el("scanExisting").disabled = false; }
  };
  el("save").onclick = async () => {
    el("save").disabled = true;
    try {
      await bridge.updateSettings({ enabled: el("enabled").checked, rerun: el("rerun").checked,
        replace: el("replace").checked, prompt: el("prompt").value, noteTitle: el("noteTitle").value,
        modelEntryId: el("model").value });
      el("feedback").textContent = "设置已保存"; render();
    } catch (error) { el("feedback").textContent = bridge.safeError(error); }
    finally { el("save").disabled = false; }
  };
  render();
};
