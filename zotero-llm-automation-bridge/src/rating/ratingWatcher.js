Bridge.installWatcher = () => {
  Bridge.observerID = Zotero.Notifier.registerObserver({ notify(event, type, ids) {
    if (type !== "item" || !["modify", "add", "delete"].includes(event) || Bridge.stopping) return;
    if (event !== "delete") {
      // Read and compare synchronously at notification delivery. A delayed
      // async read could merge 4→5→4→5 into one event.
      for (const id of ids) {
        const item = Zotero.Items.get(id);
        const available = Zotero.ZoteroStyle
          && Zotero.Prefs.get("extensions.zotero.zoterostyle.ratingColumn.storage", true) !== "tag";
        if (item) Bridge.engine.observe(item, available ? event : "add");
      }
    }
    Bridge.save().then(() => Bridge.kick()).catch(() => Bridge.storageFailure());
  } }, ["item"], "llm-automation-bridge", 50);
};
