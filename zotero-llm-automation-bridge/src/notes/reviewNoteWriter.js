Bridge.escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);
Bridge.NoteWriter = class {
  constructor(zotero) { this.zotero = zotero; }
  async write(item, job) {
    const z = this.zotero;
    const library = z.Libraries.get(item.libraryID);
    if (!library?.editable || item.deleted) throw new Bridge.WorkflowError("论文已删除或文库不可写");
    const ownMarker = 'data-llm-automation-bridge="figure-table-deep-review"';
    const jobMarker = `data-bridge-job="${Bridge.escapeHTML(job.id)}"`;
    let result;
    await z.DB.executeTransaction(async () => {
      const notes = await z.Items.getAsync(item.getNotes());
      const own = notes.filter(note => !note.deleted && note.libraryID === item.libraryID && note.parentID === item.id
        && note.getNote().includes(ownMarker));
      const same = own.find(note => note.getNote().includes(jobMarker));
      if (same) { result = same.id; return; }
      // Never touch notes owned by other plugins or matched merely by title.
      const note = job.replace && own.length ? own[own.length - 1] : new z.Item("note");
      note.libraryID = item.libraryID;
      note.parentID = item.id;
      const esc = Bridge.escapeHTML;
      note.setNote(`<div ${ownMarker} ${jobMarker}><h1>${esc(job.noteTitle)}</h1>`
        + `<p>Prompt version: ${esc(job.promptVersion)}<br/>Generated: ${esc(new Date().toISOString())}`
        + `<br/>Model: ${esc(job.model || "")}<br/>Run: ${esc(job.runId || "")}</p>`
        + `<p>成功返回图像的工具结果：${esc(job.visualImageCount || 0)} 张。逐图逐表的覆盖情况以正文清单为准。</p>`
        + `<div data-bridge-format="markdown-v1">${Bridge.renderMarkdown(job.answer)}</div></div>`);
      result = await note.save();
    });
    return result;
  }
};
