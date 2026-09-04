"use strict";
(() => {
  // package.json
  var config = {
    addonName: "zotero-ai-butler",
    addonID: "zotero-ai-butler@github.com",
    addonRef: "aiButler",
    addonInstance: "AIButler",
    prefsPrefix: "extensions.zotero.aiButler"
  };

  // src/prefs-entry.ts
  (function() {
    try {
      const addonInstance = Zotero?.[config.addonInstance] || Zotero?.__addonInstance__;
      const hooks = addonInstance?.hooks;
      if (hooks && typeof hooks.onPrefsEvent === "function") {
        const doc = globalThis.document;
        const win = doc?.defaultView || globalThis.window || globalThis;
        hooks.onPrefsEvent("load", { window: win });
      } else {
        console.warn("[AI-Butler][Prefs] hooks.onPrefsEvent not available");
      }
    } catch (e) {
      console.error("[AI-Butler][Prefs] prefs-entry execution error:", e);
    }
  })();
})();
