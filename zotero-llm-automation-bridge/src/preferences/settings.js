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
