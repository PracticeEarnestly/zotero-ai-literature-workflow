Bridge.StateStore = class {
  constructor(io, path) { this.io = io; this.path = path; this.tail = Promise.resolve(); }
  async load() {
    if (!await this.io.exists(this.path)) return { schema: 1, ratings: {}, jobs: [], nextConversation: 8000000000000 };
    const state = await this.io.readJSON(this.path);
    if (state.schema !== 1 || !state.ratings || !Array.isArray(state.jobs)
        || !Number.isSafeInteger(state.nextConversation)) throw new Error("Bridge 状态格式无效；已停止自动化，原文件保留。");
    for (const job of state.jobs) {
      if (job.status === "RUNNING") {
        job.status = job.answer ? "QUEUED" : "FAILED";
        job.error = job.answer ? "恢复已完成分析的笔记保存" : "上次运行被中断；请手动重试";
      }
    }
    return state;
  }
  save(state) {
    const snapshot = JSON.stringify(state);
    const write = this.tail.then(() => this.io.writeUTF8(this.path, snapshot, { tmpPath: this.path + ".tmp" }));
    this.tail = write.catch(() => {});
    return write;
  }
};
