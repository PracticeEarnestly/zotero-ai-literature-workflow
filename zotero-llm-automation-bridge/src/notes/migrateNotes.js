Bridge.migrateNotes = async () => {
  const jobs = Bridge.state.jobs.filter(j => j.status === "COMPLETED" && j.noteID).reverse();
  const results = [], seen = new Set();
  for (const job of jobs) {
    if (seen.has(job.noteID)) continue;
    seen.add(job.noteID);
    const note = await Zotero.Items.getAsync(job.noteID);
    if (!note || note.deleted || !note.isNote()
        || note.libraryID !== job.libraryID || !Zotero.Libraries.get(note.libraryID)?.editable) continue;
    const parent = await Zotero.Items.getByLibraryAndKeyAsync(job.libraryID, job.key);
    if (!Bridge.isPaper(parent) || note.parentID !== parent.id
        || !note.getNote().includes(`data-bridge-job="${Bridge.escapeHTML(job.id)}"`)) continue;
    const original = note.getNote(), converted = Bridge.reformatLegacyHTML(original);
    if (!converted) continue;
    // Durable originals are written before any note mutation, including when
    // startup or save is interrupted. Keep the existing note ID and provenance.
    const dir = PathUtils.join(Zotero.DataDirectory.dir, "llm-automation-bridge", "markdown-backups");
    await IOUtils.makeDirectory(dir, { ignoreExisting: true });
    const path = PathUtils.join(dir, `${note.id}-${job.id}.json`);
    if (!await IOUtils.exists(path)) await IOUtils.writeUTF8(path, JSON.stringify({ noteID: note.id,
      key: note.key, libraryID: note.libraryID, parentID: note.parentID, jobID: job.id,
      backedUpAt: new Date().toISOString(), html: original, markdown: converted.markdown }), { tmpPath: path + ".tmp" });
    // Protect changes made by a user/editor while the backup was being written.
    if (note.getNote() !== original) continue;
    note.setNote(converted.html);
    await note.saveTx();
    results.push({ noteID: note.id, key: note.key, converted: true });
  }
  Bridge.migrationResults = results;
  return results;
};
