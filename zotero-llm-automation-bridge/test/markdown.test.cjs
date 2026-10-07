const test = require('node:test');
const assert = require('node:assert/strict');
const { load, paper, job } = require('./helpers.cjs');
test('Markdown becomes real headings, emphasis, nested lists, GFM tables, links and code', () => {
  const { b } = load();
  const html = b.renderMarkdown('# Title\n\n**Bold** and *italic*\n\n- one\n  - child\n\n1. first\n2. second\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n[Source](https://example.org/paper)\n\n```js\nconst a = "<script>";\n```');
  for (const tag of ['h1', 'strong', 'em', 'ul', 'ol', 'table', 'th', 'td', 'a', 'code']) assert.match(html, new RegExp('<' + tag + '\\b'));
  assert.match(html, /&lt;script&gt;/); assert.equal(html.includes('**Bold**'), false);
});
test('raw HTML and malicious URLs are inert; external images cannot load', () => {
  const { b } = load();
  const html = b.renderMarkdown('<script>alert(1)</script>\n\n<iframe src="https://bad.test"></iframe>\n\n<img src=x onerror=alert(1)>\n\n[x](javascript:alert%281%29) [x](data:text/html,bad) ![figure](https://bad.test/track.png)');
  assert.doesNotMatch(html, /<(script|iframe|img)\b/i); assert.doesNotMatch(html, /href="(?:javascript|data):/i);
  assert.match(html, /&lt;script&gt;/); assert.match(html, /figure/);
});
test('LaTeX uses native Zotero math nodes while code stays code', () => {
  const { b } = load(); const html = b.renderMarkdown('Direction $\\rightarrow$ and `**literal**`\n\n$$\nx^2 + y^2\n$$\n');
  assert.match(html, /<span class="math">\$\\rightarrow\$<\/span>/);
  assert.match(html, /<pre class="math">\$\$x\^2 \+ y\^2\$\$<\/pre>/);
  assert.match(html, /<code>\*\*literal\*\*<\/code>/);
});
test('legacy conversion preserves metadata, entities and full body; skips rich/manual notes', () => {
  const { b } = load(); const body = '# 标题\n\n**重要** & <unsafe>\n\n|A|B|\n|-|-|\n|x|y|';
  const old = '<div data-llm-automation-bridge="figure-table-deep-review" data-bridge-job="job-1"><p>Original metadata</p><pre style="white-space: pre-wrap; font-family: inherit;">' + b.escapeHTML(body) + '</pre></div>';
  const converted = b.reformatLegacyHTML(old);
  assert.equal(converted.markdown, body); assert.match(converted.html, /Original metadata/); assert.match(converted.html, /<h1>标题<\/h1>/); assert.match(converted.html, /<table>/);
  assert.equal(b.reformatLegacyHTML(converted.html), null); assert.equal(b.reformatLegacyHTML('<h1>Manual</h1>'), null);
});
test('migration backs up before saving, repairs the latest job once and never invokes LLM', async () => {
  const files = new Map(), actions = [], { b, z } = load({ IOUtils: { makeDirectory: async () => {}, exists: async p => files.has(p), writeUTF8: async (p, value) => { files.set(p, value); actions.push('backup'); } }, PathUtils: { join: (...p) => p.join('/') } });
  const parent = paper(), original = '<div data-llm-automation-bridge="figure-table-deep-review" data-bridge-job="latest"><pre style="white-space: pre-wrap; font-family: inherit;"># Heading\n\n**Body**</pre></div>';
  const note = { id: 100, key: 'NOTE0001', libraryID: 1, parentID: 12, deleted: false, isNote: () => true, html: original, getNote() { return this.html; }, setNote(v) { this.html = v; }, async saveTx() { actions.push('save'); } };
  b.state = { jobs: [job({ id: 'old', status: 'COMPLETED', noteID: 100 }), job({ id: 'latest', status: 'COMPLETED', noteID: 100 })] };
  z.DataDirectory = { dir: '/data' }; z.Libraries = { get: () => ({ editable: true }) }; z.Items = { getAsync: async () => note, getByLibraryAndKeyAsync: async () => parent };
  z.LLMForZotero = { api: { agent: { runTurn() { throw Error('Must not call model'); } } } };
  assert.equal((await b.migrateNotes()).length, 1); assert.deepEqual(actions, ['backup', 'save']); assert.equal(note.id, 100);
  assert.equal(JSON.parse([...files.values()][0]).html, original); assert.match(note.html, /<strong>Body<\/strong>/);
  assert.equal((await b.migrateNotes()).length, 0); assert.deepEqual(actions, ['backup', 'save']);
});
