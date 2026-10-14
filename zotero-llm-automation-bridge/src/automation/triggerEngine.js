Bridge.TriggerEngine = class {
  constructor(state, settings, makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`) {
    this.state = state; this.settings = settings; this.makeId = makeId;
  }
  baseline(items) {
    this.state.ratings = {};
    for (const item of items) if (Bridge.isPaper(item)) this.state.ratings[Bridge.identity(item)] = Bridge.readRating(item);
  }
  createJob(item, previousRating, triggerSource) {
    const cfg = this.settings(), key = Bridge.identity(item), createdAt = new Date().toISOString();
    this.state.jobs.push({ id: this.makeId(), itemKey: key, libraryID: item.libraryID, key: item.key,
      title: item.getField("title"), workflow: "figure-table-deep-review", triggerRating: 5,
      previousRating, triggerSource,
      prompt: cfg.prompt, promptVersion: cfg.promptVersion, modelEntryId: cfg.modelEntryId,
      noteTitle: cfg.noteTitle, replace: cfg.replace, conversationKey: this.state.nextConversation++,
      status: "QUEUED", createdAt, updatedAt: createdAt, attempts: 0 });
    return true;
  }
  enqueueExisting(item) {
    if (!Bridge.isPaper(item) || Bridge.readRating(item) !== 5 || !this.settings().enabled) return false;
    const key = Bridge.identity(item);
    if (this.state.jobs.some(job => job.itemKey === key)) return false;
    return this.createJob(item, 5, "existing-five-star");
  }
  observe(item, event = "modify") {
    if (!Bridge.isPaper(item)) return false;
    const key = Bridge.identity(item), rating = Bridge.readRating(item), old = this.state.ratings[key];
    this.state.ratings[key] = rating;
    const cfg = this.settings();
    if (event !== "modify" || old === undefined || old === 5 || rating !== 5 || !cfg.enabled) return false;
    const prior = this.state.jobs.filter(job => job.itemKey === key);
    if (!cfg.rerun && prior.some(job => job.status === "COMPLETED")) return false;
    // Each actual crossing gets a job, including a crossing during a running job.
    // Repeated modify events at rating 5 do not create jobs.
    return this.createJob(item, old, "rating-crossing");
  }
};
