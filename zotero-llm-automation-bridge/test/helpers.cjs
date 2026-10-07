const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const modules = ['prompts/figureTableDeepReview.js', 'rating/styleRatingReader.js', 'storage/workflowState.js',
  'automation/triggerEngine.js', 'adapters/llmForZoteroAdapter.js', 'vendor/marked.umd.js', 'notes/markdownRenderer.js', 'notes/reviewNoteWriter.js', 'notes/migrateNotes.js',
  'automation/taskQueue.js', 'preferences/settings.js', 'rating/ratingWatcher.js', 'hooks.js'];
function load(extra = {}) {
  const prefs = new Map();
  const z = { Prefs: { get: key => prefs.get(key), set: (key, value) => prefs.set(key, value) } };
  const ctx = vm.createContext({ Zotero: z, AbortController, setTimeout, clearTimeout, ...extra });
  for (const name of modules) vm.runInContext(fs.readFileSync(path.join(__dirname, '../src', name), 'utf8'), ctx, { filename: name });
  ctx.Bridge.config = { schema: 1, prompt: 'Analyze Figure 1 and Table 1', promptVersion: 1 };
  return { b: ctx.Bridge, z: ctx.Zotero, prefs, ctx };
}
function paper(rating = 4, options = {}) {
  return { id: 12, libraryID: 1, key: 'ABCD1234', rating, deleted: false,
    isRegularItem: () => true, getField(name) { return name === 'extra' ? `rate: ${this.rating}` : 'A paper'; },
    getBestAttachment: async () => ({ id: 13, isPDFAttachment: () => true }), ...options };
}
function state() { return { schema: 1, ratings: {}, jobs: [], nextConversation: 8000000000000 }; }
function job(options = {}) {
  return { id: 'job-1', itemKey: '1:ABCD1234', libraryID: 1, key: 'ABCD1234', conversationKey: 8000000000000,
    status: 'QUEUED', prompt: 'Analyze Figure 1 and Table 1', promptVersion: 1, attempts: 0,
    modelEntryId: 'visual-model', replace: true, noteTitle: 'Review', ...options };
}
module.exports = { load, paper, state, job };
