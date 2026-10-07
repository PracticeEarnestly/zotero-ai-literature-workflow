const test = require('node:test');
const assert = require('node:assert/strict');
const { load, paper, job } = require('./helpers.cjs');
function setup() {
  const { b, z } = load(), notes = [], p = paper(), saved = []; let nextID = 100;
  p.getNotes = () => notes.map(note => note.id);
  z.Libraries = { get: () => ({ editable: true }) };
  z.Items = { getAsync: async ids => notes.filter(note => ids.includes(note.id)) };
  z.DB = { executeTransaction: async callback => callback() };
  z.Item = class {
    constructor() { this.id = nextID++; this.deleted = false; }
    getNote() { return this.html || ''; }
    setNote(html) { this.html = html; }
    async save() { if (!notes.includes(this)) notes.push(this); saved.push(this.id); return this.id; }
  };
  return { b, z, p, notes, saved, writer: new b.NoteWriter(z) };
}
test('creates a child note with escaped full answer and provenance; no tags or rating write', async () => {
  const { writer, p, notes } = setup();
  const j = job({ answer: '<script>bad()</script>\n|A|B|', model: 'vision', runId: 'r1' });
  await writer.write(p, j);
  assert.equal(notes[0].parentID, 12); assert.equal(notes[0].libraryID, 1);
  assert.match(notes[0].html, /Prompt version: 1/); assert.match(notes[0].html, /&lt;script&gt;/);
  assert.equal(notes[0].html.includes('<script>'), false); assert.equal(p.rating, 4);
});
test('only Bridge-owned notes are replaced; a same-title user note is preserved', async () => {
  const { writer, p, notes, z } = setup();
  const manual = new z.Item('note'); manual.parentID = 12; manual.libraryID = 1;
  manual.html = '<h1>Review</h1><p>My manual notes</p>'; notes.push(manual);
  const id = await writer.write(p, job({ answer: 'first result' }));
  await writer.write(p, job({ id: 'job-2', answer: 'second result' }));
  assert.equal(notes.length, 2); assert.equal(notes[1].id, id); assert.match(notes[1].html, /second result/);
  assert.equal(manual.html, '<h1>Review</h1><p>My manual notes</p>');
});
test('append mode keeps historical reviews; job marker repairs note-save/state-save crash without duplicates', async () => {
  const { writer, p, notes, saved } = setup(), j = job({ replace: false, answer: 'answer' });
  const first = await writer.write(p, j), same = await writer.write(p, j);
  assert.equal(first, same); assert.equal(notes.length, 1); assert.equal(saved.length, 1);
  await writer.write(p, job({ id: 'job-2', replace: false, answer: 'new answer' }));
  assert.equal(notes.length, 2);
});
test('deleted items and read-only libraries never create a note', async () => {
  const { writer, p, notes, z } = setup(); p.deleted = true;
  await assert.rejects(writer.write(p, job({ answer: 'answer' })), /不可写/);
  p.deleted = false; z.Libraries.get = () => ({ editable: false });
  await assert.rejects(writer.write(p, job({ answer: 'answer' })), /不可写/); assert.equal(notes.length, 0);
});
