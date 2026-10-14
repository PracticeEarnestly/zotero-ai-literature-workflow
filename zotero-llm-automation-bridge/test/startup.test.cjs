const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { load, paper, state, job } = require('./helpers.cjs');
function startupFixture(initial = state()) {
  const files = new Map(), callbacks = new Map(), timers = new Map(); let timerID = 0;
  const io = { exists: async p => files.has(p), makeDirectory: async () => {},
    readJSON: async p => JSON.parse(files.get(p)), writeUTF8: async (p, value) => files.set(p, value) };
  const { b, z, prefs } = load({ IOUtils: io, PathUtils: { join: (...pieces) => pieces.join('/') },
    setTimeout: fn => { timers.set(++timerID, fn); return timerID; }, clearTimeout: id => timers.delete(id) });
  z.initializationPromise = Promise.resolve(); z.DataDirectory = { dir: '/zotero-test' };
  z.Libraries = { getAll: () => [{ libraryID: 1, editable: true }, { libraryID: 2, editable: false }] };
  const p = paper(5); z.Items = { getAll: async () => [p], get: () => p, getAsync: async () => [],
    getByLibraryAndKeyAsync: async () => p };
  z.Notifier = { registerObserver: observer => { callbacks.set('notifier', observer); return 'observer-1'; },
    unregisterObserver: () => callbacks.delete('notifier') };
  z.PreferencePanes = { register: options => { callbacks.set('prefs', options); return options.id; } };
  z.ZoteroStyle = {}; z.getMainWindow = () => ({ AbortController });
  files.set('/zotero-test/llm-automation-bridge/state.json', JSON.stringify(initial));
  return { b, z, prefs, files, timers, callbacks, p };
}
test('full startup with absent LLM baselines existing five stars, registers pane; crossing queues and survives shutdown', async () => {
  const env = startupFixture(), { b, p, callbacks, files, timers } = env;
  p.rating = 4;
  await b.startup('test:/'); await b.work; assert.equal(b.state.jobs.length, 0);
  assert.match(callbacks.get('prefs').src, /^chrome:\/\/llm-automation-bridge/);
  assert.equal(callbacks.get('prefs').scripts, undefined);
  assert.equal(typeof b.initPreferences, 'function');
  p.rating = 4; callbacks.get('notifier').notify('modify', 'item', [12]);
  p.rating = 5; callbacks.get('notifier').notify('modify', 'item', [12]);
  await b.store.tail; await Promise.resolve(); await b.work;
  assert.equal(b.state.jobs.length, 1); assert.equal(b.state.jobs[0].status, 'WAITING_LLM');
  await b.shutdown(); assert.equal(timers.size, 0); assert.equal(callbacks.has('notifier'), false);
  const saved = JSON.parse(files.get('/zotero-test/llm-automation-bridge/state.json'));
  assert.equal(saved.jobs[0].status, 'WAITING_LLM');
});
test('startup queues current five-star papers once, but skips task and synced-note history', async () => {
  const env = startupFixture(), { b, z, p } = env;
  await b.startup('test:/'); await b.work;
  assert.equal(b.state.jobs.length, 1); assert.equal(b.state.jobs[0].status, 'WAITING_LLM');
  assert.equal(b.state.jobs[0].triggerSource, 'existing-five-star');
  let result = await b.scanExistingFiveStars([p]);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { fiveStar: 1, existingJob: 1, existingNote: 0, added: 0 });
  b.state.jobs = []; p.getNotes = () => [90];
  z.Items.getAsync = async () => [{ id: 90, deleted: false, libraryID: 1, parentID: 12,
    getNote: () => '<div data-llm-automation-bridge="figure-table-deep-review">done</div>' }];
  result = await b.scanExistingFiveStars([p]);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { fiveStar: 1, existingJob: 0, existingNote: 1, added: 0 });
  await b.shutdown();
});
test('restart baselines offline score changes; retained queued tasks wait for backend', async () => {
  const s = state(); s.ratings['1:ABCD1234'] = 4; s.jobs.push(job());
  const { b } = startupFixture(s); await b.startup('test:/'); await b.work;
  assert.equal(b.state.jobs.length, 1); assert.equal(b.state.ratings['1:ABCD1234'], 5);
  assert.equal(b.state.jobs[0].status, 'WAITING_LLM'); await b.shutdown();
});
test('saving a changed prompt increases version without editing upstream preferences', async () => {
  const { b, prefs, files } = startupFixture(); await b.startup('test:/'); await b.work;
  const values = { ...b.settings(), prompt: 'New custom prompt' }; await b.updateSettings(values); await b.work;
  assert.equal(b.config.promptVersion, 2); await b.updateSettings(values); await b.work;
  assert.equal(b.config.promptVersion, 2);
  assert.equal([...prefs.keys()].some(key => key.startsWith('extensions.zotero.llmforzotero.')), false);
  assert.equal(JSON.parse(files.get(b.configPath)).prompt, values.prompt); await b.shutdown();
});
test('preferences pane initializes models and prompt, then imports an upstream custom prompt', async () => {
  const { b, z, prefs, p } = startupFixture(); p.rating = 4; await b.startup('test:/'); await b.work;
  z.LLMAutomationBridge = b;
  prefs.set('extensions.zotero.llmforzotero.modelProviderGroups', JSON.stringify([{ id: 'p', apiBase: 'https://example.invalid',
    authMode: 'api_key', models: [{ id: 'm', model: 'vision-model' }] }]));
  prefs.set('extensions.zotero.llmforzotero.customShortcuts', JSON.stringify([
    { id: 'custom-1', label: '顺序解读', prompt: 'Current upstream prompt' },
  ]));
  const makeElement = () => ({ value: '', textContent: '', checked: false, disabled: false, children: [], style: '',
    replaceChildren() { this.children = []; }, appendChild(child) { this.children.push(child); },
    addEventListener(type, fn) { this['on' + type] = fn; } });
  const ids = ['status', 'enabled', 'rerun', 'replace', 'prompt', 'noteTitle', 'model', 'modelStatus',
    'promptSource', 'promptSourceStatus', 'version', 'jobsSummary', 'jobsBody', 'refreshModels', 'importPrompt', 'feedback', 'refresh', 'scanExisting', 'save'];
  const elements = Object.fromEntries(ids.map(id => [id, makeElement()]));
  const document = { getElementById: id => elements[id.replace('llm-bridge-', '')], createElementNS: () => makeElement() };
  b.initPreferences({ document });
  assert.equal(elements.prompt.value, b.config.prompt); assert.ok(elements.prompt.value.length > 0);
  assert.equal(elements.model.children.length, 2); assert.equal(elements.model.disabled, false);
  assert.match(elements.modelStatus.textContent, /1 个/);
  assert.equal(elements.promptSource.value, 'custom-1'); assert.equal(elements.promptSource.children.length, 2);
  assert.equal(elements.jobsBody.children.length, 1);
  assert.equal(elements.jobsBody.children[0].children[0].textContent, '暂无任务');
  elements.importPrompt.onclick();
  assert.ok(elements.prompt.value.startsWith(b.promptPreamble));
  assert.ok(elements.prompt.value.endsWith('Current upstream prompt'));
  assert.match(elements.feedback.textContent, /保存设置/); await b.shutdown();
});
test('bootstrap works in a Gecko-style scope without Cc/Ci aliases or global AbortController', async () => {
  const calls = [], z = {};
  const ctx = vm.createContext({ Zotero: z, IOUtils: {}, PathUtils: {}, ChromeUtils: {}, setTimeout, clearTimeout,
    Components: { classes: { '@mozilla.org/addons/addon-manager-startup;1': { getService: () => ({
      registerChrome: () => ({ destruct: () => calls.push('destruct') }),
    }) } }, interfaces: { amIAddonManagerStartup: {} } },
    Services: { io: { newURI: value => value }, scriptloader: { loadSubScript(url, scope) {
      assert.match(url, /^chrome:/); scope.Bridge = { startup: async () => calls.push('start'), shutdown: async () => calls.push('stop') };
    } } } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../addon/bootstrap.js'), 'utf8'), ctx);
  await ctx.startup({ rootURI: 'jar:file:/test.xpi!/' }); assert.ok(z.LLMAutomationBridge);
  await ctx.shutdown(); assert.equal(z.LLMAutomationBridge, undefined); assert.deepEqual(calls, ['start', 'stop', 'destruct']);
});
