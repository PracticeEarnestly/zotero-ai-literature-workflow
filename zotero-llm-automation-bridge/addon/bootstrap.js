var bridgeScope;
var chromeHandle;
function install() {}
function uninstall() {}
async function startup({ rootURI }) {
  const aom = Components.classes["@mozilla.org/addons/addon-manager-startup;1"]
    .getService(Components.interfaces.amIAddonManagerStartup);
  chromeHandle = aom.registerChrome(Services.io.newURI(rootURI + "manifest.json"), [
    ["content", "llm-automation-bridge", rootURI + "content/"],
  ]);
  bridgeScope = { Zotero, Services, ChromeUtils, IOUtils, PathUtils,
    setTimeout, clearTimeout, rootURI };
  try {
    Services.scriptloader.loadSubScript("chrome://llm-automation-bridge/content/bridge.js", bridgeScope);
    Zotero.LLMAutomationBridge = bridgeScope.Bridge;
    await bridgeScope.Bridge.startup(rootURI);
  }
  catch (error) {
    await bridgeScope.Bridge?.shutdown();
    delete Zotero.LLMAutomationBridge;
    chromeHandle.destruct();
    chromeHandle = null;
    throw error;
  }
}
async function shutdown() {
  await bridgeScope?.Bridge?.shutdown();
  delete Zotero.LLMAutomationBridge;
  chromeHandle?.destruct();
  chromeHandle = null;
  bridgeScope = null;
}
