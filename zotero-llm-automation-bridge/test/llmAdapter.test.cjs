const test = require('node:test');
const assert = require('node:assert/strict');
const { load, paper, job } = require('./helpers.cjs');
function setup(options = {}) {
  const env = load(), { b, z, prefs } = env;
  prefs.set('extensions.zotero.llmforzotero.modelProviderGroups', JSON.stringify([{ id: 'provider',
    apiBase: 'https://example.invalid/v1', apiKey: 'SECRET', authMode: 'api_key',
    providerProtocol: 'openai_chat_compat', models: [{ id: 'visual-model', model: 'vision' }] }]));
  const confirmations = [], calls = [];
  const api = { getZoteroGateway: () => ({ resolvePaperContextTarget: selector => ({ ...selector, title: 'A paper' }) }),
    getCapabilities: () => ({ toolCalls: true, contentInputs: { images: true } }),
    resolveConfirmation: (...args) => confirmations.push(args),
    getRunTrace: async () => ({ run: { status: 'completed' } }),
    async runTurn(request, onEvent, opts) {
      if (request.pdfPaperContexts?.length && !request.localDocuments?.length)
        throw Error('Raw PDF identity batch does not match its resources.');
      calls.push({ request, opts });
      await onEvent({ type: 'tool_result', name: 'paper_read', ok: true, artifacts: [{ kind: 'image' }] });
      return { kind: 'completed', runId: 'run-1', text: '# Figure 1\nObserved result' };
    }, ...options };
  z.LLMForZotero = { api: { agent: api } };
  return { ...env, adapter: new b.LLMAdapter(z), api, calls, confirmations };
}
test('uses public API, exact PDF/parent/library, separate conversation, no UI selection', async () => {
  const { adapter, calls } = setup(), j = job(), controller = new AbortController();
  const answer = await adapter.run(paper(), j, controller.signal), req = calls[0].request;
  assert.equal(answer.runId, 'run-1'); assert.equal(req.activeItemId, 12);
  assert.equal(req.activePaperContext.contextItemId, 13); assert.equal(req.libraryID, 1);
  assert.equal(req.pdfPaperContexts, undefined);
  assert.equal(req.fullTextPaperContexts[0].contextItemId, 13);
  assert.equal(req.conversationKey, j.conversationKey); assert.equal(req.apiKey, 'SECRET');
  assert.equal(calls[0].opts.signal, controller.signal); assert.equal(JSON.stringify(j).includes('SECRET'), false);
});
test('missing/not initialized API yields WAITING_LLM rather than a lost task', () => {
  const { adapter, b, z } = setup(); delete z.LLMForZotero;
  assert.throws(() => adapter.api(), b.WaitingLLM);
  z.LLMForZotero = { api: { agent: { runTurn() {}, getZoteroGateway() { throw Error('not initialized'); } } } };
  assert.throws(() => adapter.api(), b.WaitingLLM);
});
test('tool-less or text-only model is rejected before a model run', async () => {
  for (const cap of [{ toolCalls: false, multimodal: true }, { toolCalls: true, contentInputs: { images: false } }]) {
    const { adapter, calls } = setup({ getCapabilities: () => cap });
    await assert.rejects(adapter.run(paper(), job()), /不支持/); assert.equal(calls.length, 0);
  }
});
test('Agent confirmation is declined, never auto-approved or saved', async () => {
  const { adapter, confirmations } = setup({ async runTurn(req, emit) {
    await emit({ type: 'confirmation_required', requestId: 'confirm-1', action: { title: 'Write a note' } });
    return { kind: 'completed', runId: 'run-1', text: 'output' };
  } });
  await assert.rejects(adapter.run(paper(), job()), /额外确认/);
  assert.deepEqual(confirmations, [['confirm-1', false]]);
});
test('completed-shaped response with failed trace must not save an unfinished answer', async () => {
  const { adapter } = setup({ getRunTrace: async () => ({ run: { status: 'failed' } }) });
  await assert.rejects(adapter.run(paper(), job()), /未正常完成/);
});
test('caption-only answer without a successful image read must not be saved as visual review', async () => {
  const { adapter } = setup({ runTurn: async () => ({ kind: 'completed', runId: 'run-1', text: 'caption summary' }) });
  await assert.rejects(adapter.run(paper(), job()), /未观测到成功的图像读取/);
});
test('fallback, empty answer, missing PDF and wrong scope all fail clearly', async () => {
  for (const result of [{ kind: 'fallback', reason: 'unsupported' }, { kind: 'completed', text: '  ' }]) {
    const { adapter } = setup({ runTurn: async () => result }); await assert.rejects(adapter.run(paper(), job()), /完整分析/);
  }
  const { adapter, api } = setup();
  await assert.rejects(adapter.run(paper(4, { getBestAttachment: async () => null }), job()), /PDF/);
  api.getZoteroGateway = () => ({ resolvePaperContextTarget: () => ({ itemId: 99, contextItemId: 13 }) });
  await assert.rejects(adapter.run(paper(), job()), /上下文/);
});
test('external runtimes or a removed model wait without silently changing backend', async () => {
  const { adapter, prefs, calls } = setup();
  prefs.set('extensions.zotero.llmforzotero.conversationSystem', 'claude_code');
  await assert.rejects(adapter.run(paper(), job()), /外部运行时/); assert.equal(calls.length, 0);
  prefs.delete('extensions.zotero.llmforzotero.conversationSystem');
  await assert.rejects(adapter.run(paper(), job({ modelEntryId: 'removed-model' })), /选择/);
});

test('a third-party conversation with no ledger run uses its live terminal event; failed stops never save', async () => {
  for (const status of ['completed', 'failed', 'cancelled']) {
    const { adapter } = setup({
      getRunTrace: async () => ({ run: null, events: [] }),
      async runTurn(req, emit) {
        emit({ type: 'tool_result', name: 'paper_read', ok: true, artifacts: [{ kind: 'image' }] });
        emit({ type: 'provider_event', providerType: 'agent_run_stop', payload: { status } });
        return { kind: 'completed', runId: 'external-run', text: 'Figure 1' };
      },
    });
    if (status === 'completed') assert.equal((await adapter.run(paper(), job())).visualImageCount, 1);
    else await assert.rejects(adapter.run(paper(), job()), /未正常完成/);
  }
});
