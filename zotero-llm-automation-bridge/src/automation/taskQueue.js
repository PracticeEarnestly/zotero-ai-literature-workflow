Bridge.TaskQueue = class {
  constructor({ state, save, getItem, adapter, writer, enabled, changed = () => {}, controller = () => new AbortController() }) {
    Object.assign(this, { state, save, getItem, adapter, writer, enabled, changed, controller });
    this.busy = false; this.stopped = false;
  }
  async pump() {
    if (this.busy || this.stopped || !this.enabled()) return;
    this.busy = true;
    try {
      for (const job of this.state.jobs) {
        if (this.stopped || !this.enabled()) break;
        if (!["QUEUED", "WAITING_LLM"].includes(job.status)) continue;
        try {
          this.abort = this.controller();
          const item = await this.getItem(job.libraryID, job.key);
          if (!Bridge.isPaper(item)) throw new Bridge.WorkflowError("任务论文不存在或已删除");
          if (!job.answer) {
            this.adapter.resetDiagnostics?.();
            this.adapter.api();
            job.status = "RUNNING"; job.attempts++; job.updatedAt = new Date().toISOString(); delete job.error;
            await this.save(); this.changed();
            const answer = await this.adapter.run(item, job, this.abort.signal);
            if (this.stopped) throw new Bridge.WorkflowError("Bridge 已停止");
            job.answer = answer.text; job.runId = answer.runId; job.model = answer.model;
            job.visualImageCount = answer.visualImageCount;
            job.diagnostics = answer.diagnostics || this.adapter.diagnostics?.();
            job.updatedAt = new Date().toISOString();
            // Persist the answer before note writing, so write failures and
            // restarts never need to purchase the same model run again.
            await this.save();
          }
          if (this.stopped) throw new Bridge.WorkflowError("Bridge 已停止");
          job.noteID = await this.writer.write(item, job);
          job.status = "COMPLETED"; job.completedAt = new Date().toISOString(); job.updatedAt = job.completedAt; delete job.error;
          delete job.answer;
        } catch (error) {
          job.status = error instanceof Bridge.WaitingLLM ? "WAITING_LLM" : "FAILED";
          // Upstream errors can contain request URLs or credentials. Keep a
          // generic message unless it is one of the bridge's own messages.
          job.error = this.abort?.signal.aborted ? "运行已停止" : Bridge.safeError(error);
          const diagnostics = this.adapter.diagnostics?.();
          if (diagnostics) job.diagnostics = diagnostics;
          job.updatedAt = new Date().toISOString();
        }
        await this.save(); this.changed(); this.abort = null;
        if (job.status === "WAITING_LLM") break;
      }
    } finally { this.busy = false; }
  }
  async stop() { this.stopped = true; this.abort?.abort(); }
  retry(id) {
    const job = this.state.jobs.find(row => row.id === id && ["FAILED", "WAITING_LLM"].includes(row.status));
    if (!job) return false;
    job.status = "QUEUED";
    job.updatedAt = new Date().toISOString();
    // Analysis retries use a new conversation; saving a durable answer needs
    // no new turn. No automatic retry of a possibly billable model request.
    if (!job.answer) job.conversationKey = this.state.nextConversation++;
    delete job.error;
    delete job.diagnostics;
    return true;
  }
};
