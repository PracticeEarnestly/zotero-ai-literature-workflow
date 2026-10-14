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
  Bridge.pendingInitialBackfill = papers;
  Bridge.installWatcher();
  await Bridge.save();
  Bridge.paneID = Zotero.PreferencePanes.register({ pluginID: "llm-automation-bridge@xiqing.local",
    id: "llm-automation-bridge", label: "LLM Automation Bridge", src: "chrome://llm-automation-bridge/content/preferences.xhtml" });
  Bridge.schedule();
  Bridge.kick();
};
Bridge.ratingSourceReady = () => Zotero.ZoteroStyle
  && Zotero.Prefs.get("extensions.zotero.zoterostyle.ratingColumn.storage", true) !== "tag";
Bridge.collectPapers = async () => {
  const papers = [];
  for (const library of Zotero.Libraries.getAll()) {
    if (!library.editable || library.libraryType === "feed") continue;
    papers.push(...await Zotero.Items.getAll(library.libraryID, true, false));
  }
  return papers;
};
Bridge.scanExistingFiveStars = async suppliedPapers => {
  if (!Bridge.settings().enabled) throw new Bridge.WorkflowError("请先启用自动化，再扫描当前五星论文");
  if (!Bridge.ratingSourceReady()) throw new Bridge.WorkflowError("Style Extra 评分来源尚未就绪");
  if (Bridge.backfillWork) return Bridge.backfillWork;
  Bridge.backfillWork = (async () => {
    const result = { fiveStar: 0, existingJob: 0, existingNote: 0, added: 0 };
    const papers = suppliedPapers || await Bridge.collectPapers();
    for (const item of papers) {
      if (!Bridge.isPaper(item) || Bridge.readRating(item) !== 5) continue;
      result.fiveStar++;
      const key = Bridge.identity(item);
      if (Bridge.state.jobs.some(job => job.itemKey === key)) { result.existingJob++; continue; }
      if (await Bridge.hasReviewNote(Zotero, item)) { result.existingNote++; continue; }
      if (Bridge.engine.enqueueExisting(item)) result.added++;
    }
    await Bridge.save();
    return result;
  })();
  try { return await Bridge.backfillWork; }
  finally { Bridge.backfillWork = null; }
};
Bridge.storageFailure = () => {
  Bridge.fatalError = "Bridge 状态保存失败，自动化已停止；原状态文件保留";
  Bridge.queue?.stop();
};
Bridge.kick = () => {
  if (Bridge.stopping || Bridge.fatalError || !Bridge.queue) return;
  if (!Bridge.ratingSourceReady() || !Bridge.settings().enabled) return;
  if (Bridge.pendingInitialBackfill && !Bridge.backfillWork) {
    const papers = Bridge.pendingInitialBackfill; Bridge.pendingInitialBackfill = null;
    Bridge.work = Bridge.scanExistingFiveStars(papers).then(() => Bridge.queue.pump()).catch(() => Bridge.storageFailure());
    return;
  }
  if (Bridge.backfillWork || Bridge.queue.busy) return;
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
  return Bridge.settings().enabled ? "自动化已启用：新进入五星和未处理的现有五星都会入队" : "自动化已暂停";
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
  await Bridge.backfillWork;
  await Bridge.work;
  await Bridge.store?.tail;
};
