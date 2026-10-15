const test = require('node:test');
const assert = require('node:assert/strict');
const { load, paper, state, job } = require('./helpers.cjs');
function setup(options = {}) {
  const { b } = load(), s = state(), snapshots = [], runs = [], writes = [];
  s.jobs.push(job());
  const q = new b.TaskQueue({ state: s, save: async () => snapshots.push(JSON.parse(JSON.stringify(s))),
    getItem: async () => paper(), enabled: () => true,
    adapter: { api() {}, async run(item, j) { runs.push(j.id); return { text: 'analysis', runId: 'run-1', model: 'vision' }; } },
    writer: { async write(item, j) { writes.push(j.id); return 50; } }, ...options });
  return { b, s, q, snapshots, runs, writes };
}
test('persists RUNNING and final answer before saving; COMPLETED only after note save', async () => {
  const { q, s, snapshots, runs, writes } = setup(); await q.pump();
  assert.equal(snapshots[0].jobs[0].status, 'RUNNING'); assert.equal(snapshots[1].jobs[0].answer, 'analysis');
  assert.equal(s.jobs[0].status, 'COMPLETED'); assert.equal(s.jobs[0].noteID, 50);
  await q.pump(); assert.equal(runs.length, 1); assert.equal(writes.length, 1);
});
test('unavailable dependency keeps queued work; resumes automatically once ready', async () => {
  let ready = false;
  const env = setup(); env.q.adapter.api = () => { if (!ready) throw new env.b.WaitingLLM('waiting'); };
  await env.q.pump(); assert.equal(env.s.jobs[0].status, 'WAITING_LLM'); assert.equal(env.runs.length, 0);
  ready = true; await env.q.pump(); assert.equal(env.s.jobs[0].status, 'COMPLETED');
});
test('writer failure keeps the answer; manual retry saves without another LLM call', async () => {
  let attempts = 0;
  const { q, s, runs } = setup({ writer: { async write() { if (++attempts === 1) throw Error('disk full'); return 50; } } });
  await q.pump(); assert.equal(s.jobs[0].status, 'FAILED'); assert.equal(s.jobs[0].answer, 'analysis');
  await q.pump(); assert.equal(attempts, 1);
  assert.equal(q.retry('job-1'), true); await q.pump(); assert.equal(runs.length, 1); assert.equal(s.jobs[0].status, 'COMPLETED');
});
test('concurrent pump calls still run jobs strictly in order', async () => {
  let release, active = 0, max = 0;
  const wait = new Promise(resolve => release = resolve);
  const env = setup({ adapter: { api() {}, async run() { max = Math.max(max, ++active); await wait; active--; return { text: 'result' }; } } });
  env.s.jobs.push(job({ id: 'job-2' })); const first = env.q.pump(); await env.q.pump(); release(); await first;
  assert.equal(max, 1); assert.equal(env.s.jobs.filter(row => row.status === 'COMPLETED').length, 2);
});
test('interrupted model work fails after restart; durable answers resume only note saving', async () => {
  const { b } = load(), s = state(); s.jobs = [job({ status: 'RUNNING' }), job({ id: 'job-2', status: 'RUNNING', answer: 'saved answer' })];
  const store = new b.StateStore({ exists: async () => true, readJSON: async () => s }, 'state.json');
  const restored = await store.load(); assert.equal(restored.jobs[0].status, 'FAILED'); assert.equal(restored.jobs[1].status, 'QUEUED');
});
test('state writes keep snapshot order and are atomic; corrupt state is never overwritten', async () => {
  const { b } = load(), s = state(), writes = [];
  const io = { writeUTF8: async (p, data, opts) => writes.push({ data: JSON.parse(data), opts }),
    exists: async () => true, readJSON: async () => ({ schema: 99 }) };
  const store = new b.StateStore(io, '/state.json'); const first = store.save(s); s.jobs.push(job());
  const second = store.save(s); await Promise.all([first, second]);
  assert.equal(writes[0].data.jobs.length, 0); assert.equal(writes[1].data.jobs.length, 1);
  assert.equal(writes[0].opts.tmpPath, '/state.json.tmp'); await assert.rejects(store.load(), /状态格式无效/);
});
test('abort on plugin shutdown never saves a model answer', async () => {
  let started;
  const began = new Promise(resolve => started = resolve);
  const env = setup({ adapter: { api() {}, run(item, j, signal) {
    started(); return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(Error('abort'))));
  } } });
  const running = env.q.pump(); await began; await env.q.stop(); await running;
  assert.equal(env.writes.length, 0); assert.equal(env.s.jobs[0].status, 'FAILED');
});
test('save failure before dispatch prevents a paid LLM request', async () => {
  const { q, runs } = setup({ save: async () => { throw Error('disk full'); } });
  await assert.rejects(q.pump(), /disk full/); assert.equal(runs.length, 0);
});
test('unknown backend errors cannot leak a key into persisted status', async () => {
  const { q, s } = setup({ adapter: { api() {}, async run() { throw Error('https://server.invalid/?key=SECRET'); } } });
  await q.pump(); assert.equal(s.jobs[0].status, 'FAILED'); assert.equal(JSON.stringify(s).includes('SECRET'), false);
});
test('failed model work persists adapter diagnostics and retry clears stale details', async () => {
  const diagnostics = { toolCalls: 1, paperReadCalls: 1, figureCalls: 1, images: 0,
    toolErrors: 1, lastTool: 'paper_read', failures: [{ tool: 'paper_read', mode: 'figures' }] };
  const { q, s } = setup({ adapter: { resetDiagnostics() {}, api() {}, diagnostics: () => diagnostics,
    async run() { throw new Error('provider failure'); } } });
  await q.pump(); assert.deepEqual(s.jobs[0].diagnostics, diagnostics);
  assert.equal(q.retry('job-1'), true); assert.equal(s.jobs[0].diagnostics, undefined);
});
