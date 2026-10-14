Bridge.startup = async rootURI => {
  Bridge.stopping = false;
  await Zotero.initializationPromise;
  const dir = PathUtils.join(Zotero.DataDirectory.dir, "llm-automation-bridge");
  await IOUtils.makeDirectory(dir, { ignoreExisting: true });
  Bridge.configPath = PathUtils.join(dir, "prompt.json");
  Bridge.config = await IOUtils.exists(Bridge.configPath) ? await IOUtils.readJSON(Bridge.configPath)
    : { schema: 1, prompt: Bridge.defaultPrompt, promptVersion: 1 };
  if (Bridge.config.schema !== 1 || typeof Bridge.config.prompt !== "string" || !Bridge.config.prompt.trim()
      || !Number.isInteger(Bridge.config.promptVersion) || Bridge.config.promptVersion < 1)
    throw new Bridge.WorkflowError("Bridge Prompt 设置无效；原文件保留");
  if (!await IOUtils.exists(Bridge.configPath)) await IOUtils.writeUTF8(Bridge.configPath, JSON.stringify(Bridge.config),
    { tmpPath: Bridge.configPath + ".tmp" });
  Bridge.store = new Bridge.StateStore(IOUtils, PathUtils.join(dir, "state.json"));
  Bridge.state = await Bridge.store.load();
  Bridge.save = () => Bridge.store.save(Bridge.state);
  Bridge.engine = new Bridge.TriggerEngine(Bridge.state, Bridge.settings);
  Bridge.adapter = new Bridge.LLMAdapter(Zotero);
  const papers = [];
  for (const library of Zotero.Libraries.getAll()) {
    if (!library.editable || library.libraryType === "feed") continue;
    papers.push(...await Zotero.Items.getAll(library.libraryID, true, false));
  }
  Bridge.engine.baseline(papers);
  await Bridge.migrateNotes();
  Bridge.queue = new Bridge.TaskQueue({ state: Bridge.state, save: Bridge.save,
    getItem: (libraryID, key) => Zotero.Items.getByLibraryAndKeyAsync(libraryID, key),
    controller: () => {
      const Controller = Zotero.getMainWindow()?.AbortController;
      if (!Controller) throw new Bridge.WaitingLLM("等待 Zotero 主窗口就绪");
      return new Controller();
    },
    adapter: Bridge.adapter, writer: new Bridge.NoteWriter(Zotero), enabled: () => Bridge.settings().enabled });
  Bridge.installWatcher();
  await Bridge.save();
  Bridge.paneID = Zotero.PreferencePanes.register({ pluginID: "llm-automation-bridge@xiqing.local",
    id: "llm-automation-bridge", label: "LLM Automation Bridge", src: "chrome://llm-automation-bridge/content/preferences.xhtml" });
  Bridge.schedule();
  Bridge.kick();
};
Bridge.storageFailure = () => {
  Bridge.fatalError = "Bridge 状态保存失败，自动化已停止；原状态文件保留";
  Bridge.queue?.stop();
};
Bridge.kick = () => {
  if (Bridge.stopping || Bridge.fatalError || !Bridge.queue) return;
  if (!Zotero.ZoteroStyle || Zotero.Prefs.get("extensions.zotero.zoterostyle.ratingColumn.storage", true) === "tag") return;
  if (Bridge.queue.busy) return;
  Bridge.work = Bridge.queue.pump().catch(() => Bridge.storageFailure());
};
Bridge.schedule = () => {
  if (Bridge.stopping) return;
  Bridge.timer = setTimeout(() => { Bridge.kick(); Bridge.schedule(); }, 10000);
};
Bridge.status = () => {
  if (Bridge.fatalError) return Bridge.fatalError;
  if (!Zotero.ZoteroStyle) return "Style 未就绪，评分触发暂不可用";
  if (Zotero.Prefs.get("extensions.zotero.zoterostyle.ratingColumn.storage", true) === "tag") return "Style 当前使用标签评分；请在 Style 中选择 Extra 存储模式";
  try { Bridge.adapter.api(); } catch (error) { return Bridge.safeError(error); }
  return Bridge.settings().enabled ? "自动化已启用：评分从低于 5 变为 5 时入队" : "自动化已暂停";
};
Bridge.retry = async id => {
  if (!Bridge.queue.retry(id)) return;
  const job = Bridge.state.jobs.find(row => row.id === id);
  if (!job.answer) job.modelEntryId = Bridge.settings().modelEntryId;
  await Bridge.save(); Bridge.kick();
};
Bridge.shutdown = async () => {
  Bridge.stopping = true;
  clearTimeout(Bridge.timer);
  if (Bridge.observerID) Zotero.Notifier.unregisterObserver(Bridge.observerID);
  await Bridge.queue?.stop();
  await Bridge.work;
  await Bridge.store?.tail;
};
