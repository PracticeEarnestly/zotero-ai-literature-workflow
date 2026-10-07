var LLMBridgePreferences = {
  init(win) {
    const doc = win.document, bridge = Zotero.LLMAutomationBridge;
    const el = key => doc.getElementById("llm-bridge-" + key);
    if (!bridge?.state) { el("status").textContent = "Bridge 未就绪"; return; }
    const cfg = bridge.settings();
    for (const key of ["enabled", "rerun", "replace"]) el(key).checked = cfg[key];
    for (const key of ["prompt", "noteTitle"]) el(key).value = cfg[key];
    const select = el("model");
    select.replaceChildren();
    const addOption = (value, label) => {
      const option = doc.createElementNS("http://www.w3.org/1999/xhtml", "option");
      option.value = value; option.textContent = label; select.appendChild(option);
    };
    addOption("", "使用 llm-for-zotero 最近选择的模型");
    for (const entry of bridge.adapter.models()) if (!entry.group.authMode || entry.group.authMode === "api_key")
      addOption(entry.id, entry.model);
    if (cfg.modelEntryId && ![...select.options].some(option => option.value === cfg.modelEntryId))
      addOption(cfg.modelEntryId, "已保存模型不可用；请选择新模型");
    select.value = cfg.modelEntryId;
    const render = () => {
      el("status").textContent = bridge.status();
      el("version").textContent = `Prompt version: ${bridge.config.promptVersion}`;
      const jobs = el("jobs"); jobs.replaceChildren();
      const counts = {};
      for (const job of bridge.state.jobs) counts[job.status] = (counts[job.status] || 0) + 1;
      const summary = doc.createElementNS("http://www.w3.org/1999/xhtml", "p");
      summary.textContent = Object.entries(counts).map(([key, count]) => `${key}: ${count}`).join(" | ") || "暂无任务";
      jobs.appendChild(summary);
      for (const job of bridge.state.jobs.slice(-30).reverse()) {
        const row = doc.createElementNS("http://www.w3.org/1999/xhtml", "p");
        row.textContent = `${job.title || job.itemKey} — ${job.status}${job.error ? "：" + job.error : ""}`;
        if (["FAILED", "WAITING_LLM"].includes(job.status)) {
          const button = doc.createElementNS("http://www.w3.org/1999/xhtml", "button"); button.textContent = "使用当前模型重试";
          button.addEventListener("click", async () => {
            button.disabled = true;
            try { await bridge.retry(job.id); render(); } catch (_) { el("feedback").textContent = "重试未保存，请检查状态文件"; }
          }); row.appendChild(button);
        }
        jobs.appendChild(row);
      }
    };
    el("refresh").onclick = render;
    el("save").onclick = async () => {
      el("save").disabled = true;
      try {
        await bridge.updateSettings({ enabled: el("enabled").checked, rerun: el("rerun").checked,
          replace: el("replace").checked, prompt: el("prompt").value, noteTitle: el("noteTitle").value,
          modelEntryId: select.value });
        el("feedback").textContent = "设置已保存"; render();
      } catch (error) { el("feedback").textContent = bridge.safeError(error); }
      finally { el("save").disabled = false; }
    };
    render();
  },
};
