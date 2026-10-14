const test = require('node:test');
const assert = require('node:assert/strict');
const { load, paper, state } = require('./helpers.cjs');
test('baseline is side-effect free; explicit existing-five-star scan queues once', () => {
  const { b } = load(), s = state(), engine = new b.TriggerEngine(s, b.settings);
  engine.baseline([paper(5)]); engine.observe(paper(5)); assert.equal(s.jobs.length, 0);
  assert.equal(engine.enqueueExisting(paper(5)), true);
  assert.equal(engine.enqueueExisting(paper(5)), false);
  assert.equal(s.jobs[0].triggerSource, 'existing-five-star');
});
test('4→5 queues once despite metadata and note notifications; 5→4→5 reruns', () => {
  const { b } = load(), s = state(), p = paper(), engine = new b.TriggerEngine(s, b.settings);
  engine.baseline([p]); p.rating = 5; engine.observe(p);
  for (let i = 0; i < 8; i++) engine.observe(p);
  engine.observe(paper(5, { isRegularItem: () => false })); assert.equal(s.jobs.length, 1);
  s.jobs[0].status = 'COMPLETED'; p.rating = 4; engine.observe(p); p.rating = 5; engine.observe(p);
  assert.equal(s.jobs.length, 2); assert.notEqual(s.jobs[0].conversationKey, s.jobs[1].conversationKey);
});
test('unseen/imported five-star items do not run; new 4→5 later does', () => {
  const { b } = load(), s = state(), p = paper(5), engine = new b.TriggerEngine(s, b.settings);
  engine.observe(p, 'add'); engine.observe(p); assert.equal(s.jobs.length, 0);
  p.rating = 4; engine.observe(p); p.rating = 5; engine.observe(p); assert.equal(s.jobs.length, 1);
});
test('disabled automation tracks ratings without replay on enable', () => {
  const { b, prefs } = load(), s = state(), p = paper(), engine = new b.TriggerEngine(s, b.settings);
  engine.baseline([p]); prefs.set(b.prefPrefix + 'enabled', false); p.rating = 5; engine.observe(p);
  prefs.set(b.prefPrefix + 'enabled', true); engine.observe(p); assert.equal(s.jobs.length, 0);
});
test('rerun switch prevents a new run after a successful review', () => {
  const { b, prefs } = load(), s = state(), p = paper(), engine = new b.TriggerEngine(s, b.settings);
  prefs.set(b.prefPrefix + 'rerun', false); engine.baseline([p]); p.rating = 5; engine.observe(p);
  s.jobs[0].status = 'COMPLETED'; p.rating = 0; engine.observe(p); p.rating = 5; engine.observe(p);
  assert.equal(s.jobs.length, 1);
});
test('identity includes library; prompt/version are frozen when enqueued', () => {
  const { b } = load(), s = state(), p = paper(), p2 = paper(4, { id: 22, libraryID: 2 });
  const engine = new b.TriggerEngine(s, b.settings); engine.baseline([p, p2]);
  p.rating = 5; engine.observe(p); b.config.prompt = 'new prompt'; b.config.promptVersion++;
  p2.rating = 5; engine.observe(p2);
  assert.equal(s.jobs.length, 2); assert.equal(s.jobs[0].promptVersion, 1); assert.equal(s.jobs[1].promptVersion, 2);
});
test('Extra reader rejects ambiguous/malformed ratings and ignores unrelated fields', () => {
  const { b } = load();
  for (const [extra, expected] of [['DOI: x\r\nrate: 5', 5], [' rate : 4 ', 4], ['rate: 15', 0],
    ['rate: 5\nrate: 4', 0], ['pirate: 5', 0], ['rate: 5 stars', 0]])
    assert.equal(b.readRating(paper(0, { getField: () => extra })), expected);
});
test('watcher snapshots every crossing before asynchronous persistence settles', async () => {
  const { b, z } = load(), s = state(), p = paper(); let observer;
  z.ZoteroStyle = {};
  z.Notifier = { registerObserver(value) { observer = value; return 'observer'; } };
  z.Items = { get: () => p }; b.engine = new b.TriggerEngine(s, b.settings); b.engine.baseline([p]);
  let kicks = 0; b.save = async () => {}; b.kick = () => kicks++; b.installWatcher();
  for (const rating of [5, 4, 5, 5]) { p.rating = rating; observer.notify('modify', 'item', [12]); }
  await Promise.resolve(); assert.equal(s.jobs.length, 2); assert.equal(kicks, 4);
});
test('Style tag storage or missing Style cannot silently enqueue an Extra rating trigger', async () => {
  const { b, z, prefs } = load(), s = state(), p = paper(); let observer;
  z.Notifier = { registerObserver(value) { observer = value; return 'observer'; } };
  z.Items = { get: () => p }; b.engine = new b.TriggerEngine(s, b.settings); b.engine.baseline([p]);
  b.save = async () => {}; b.kick = () => {}; b.installWatcher();
  p.rating = 5; observer.notify('modify', 'item', [12]); assert.equal(s.jobs.length, 0);
  z.ZoteroStyle = {}; prefs.set('extensions.zotero.zoterostyle.ratingColumn.storage', 'tag');
  p.rating = 4; observer.notify('modify', 'item', [12]); p.rating = 5; observer.notify('modify', 'item', [12]);
  assert.equal(s.jobs.length, 0);
  prefs.set('extensions.zotero.zoterostyle.ratingColumn.storage', 'extra'); observer.notify('modify', 'item', [12]);
  assert.equal(s.jobs.length, 0); await Promise.resolve();
});
