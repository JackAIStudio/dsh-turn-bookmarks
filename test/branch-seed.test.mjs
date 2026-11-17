// 分支预填回归测试 —— 点 ✏️ 后，新会话的官方输入框里应该有原来的提示词和附件。
//
// 直接从 client.js 抽取真实函数体执行，不是复制一份逻辑。
// 运行： node test/branch-seed.test.mjs

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { apply } from '../index.js'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, '..', 'client.js'), 'utf8')

function extract(name) {
  const plain = src.indexOf('function ' + name + '(')
  const asyncAt = src.indexOf('async function ' + name + '(')
  const start = asyncAt >= 0 ? asyncAt : plain
  if (start < 0) throw new Error('client.js 里找不到 ' + name)
  const open = src.indexOf('{', start)
  let depth = 0
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') {
      depth--
      if (depth === 0) return src.slice(start, i + 1)
    }
  }
  throw new Error(name + ' 括号不闭合')
}

/** 用真实函数体搭一个最小运行台：假会话服务 + 假输入框。 */
function makeHarness() {
  const state = {
    draft: null,
    attachmentIds: [],
    createdFiles: null,
    released: null,
    failShell: false,
  }
  const shell = {
    actions: {
      setDraft: (value) => {
        state.draft = value
      },
      addAttachments: (ids) => {
        state.attachmentIds.push(...ids)
        return true
      },
    },
  }
  const conversation = {
    input: {
      shell: () => {
        if (state.failShell) throw new Error('no shell yet')
        return shell
      },
    },
    createDrafts: (_sessionId, files) => {
      state.createdFiles = files
      return files.map((file, index) => ({ id: 'draft-' + index, kind: 'image', file }))
    },
    releaseDraftAttachments: (drafts) => {
      state.released = drafts
    },
  }
  const sleep = () => Promise.resolve()
  const getConversationService = () => conversation
  const code = [
    extract('structuredDraftOfPrompt'),
    extract('waitForInputShell'),
    extract('seedChildDraft'),
  ].join('\n\n')
  const factory = new Function(
    'getConversationService',
    'sleep',
    code + '\nreturn { structuredDraftOfPrompt, waitForInputShell, seedChildDraft }',
  )
  return { state, api: factory(getConversationService, sleep) }
}

test('plain prompt text passes through untouched', () => {
  const { api } = makeHarness()
  assert.equal(api.structuredDraftOfPrompt('Commit 代码变动，使用简体中文编写 Commit 说明。'), 'Commit 代码变动，使用简体中文编写 Commit 说明。')
  assert.equal(api.structuredDraftOfPrompt(undefined), '')
})

test('session references come back as positioned chips, not raw wire text', () => {
  const { api } = makeHarness()
  const wire = '@[上一个会话](dsh-session:eyJhIjoxfQ) 继续做'
  const draft = api.structuredDraftOfPrompt(wire)
  assert.equal(draft.text, wire)
  assert.equal(draft.references.length, 1)
  const ref = draft.references[0]
  assert.equal(ref.offset, 0)
  assert.equal(ref.length, wire.indexOf(' ') + 0)
  assert.equal(ref.clipboardText, draft.text.slice(ref.offset, ref.offset + ref.length))
  assert.equal(ref.label, '上一个会话')
  assert.equal(ref.appearance, 'session')
  assert.equal(ref.source, 'reference')
})

test('a prompt with prose before the reference keeps offsets ordered', () => {
  const { api } = makeHarness()
  const wire = '参考 @[需求](dsh-session:abc123) 和 @[设计](dsh-session:def456) 再写'
  const draft = api.structuredDraftOfPrompt(wire)
  assert.equal(draft.references.length, 2)
  const [first, second] = draft.references
  assert.ok(first.offset < second.offset)
  assert.equal(first.offset + first.length <= second.offset, true)
  for (const ref of draft.references) {
    assert.equal(draft.text.slice(ref.offset, ref.offset + ref.length), ref.clipboardText)
  }
})

test('seeding sets the draft and hands attachments to the official composer', async () => {
  const { state, api } = makeHarness()
  const files = [new File([new Uint8Array([1, 2, 3])], 'a.png', { type: 'image/png' })]
  const result = await api.seedChildDraft('child-1', '继续', files)
  assert.equal(state.draft, '继续')
  assert.deepEqual(state.attachmentIds, ['draft-0'])
  assert.deepEqual(state.createdFiles, files)
  assert.equal(result.attached, 1)
})

test('a missing input shell fails loudly instead of silently dropping the prompt', async () => {
  const { state, api } = makeHarness()
  state.failShell = true
  await assert.rejects(
    () => api.seedChildDraft('child-1', '继续', [], 300),
    /输入框没有就绪/,
  )
})

// 贯通铅笔分支、宿主设置和草稿就绪三个时点。宿主只在全局配置提供默认值。
function branchHarness(events, ownEvents = []) {
  const sourceId = 'source'
  const childId = 'child'
  const initialDefault = { provider: 'other', model: 'other-model', reasoningEffort: 'low' }
  const state = { selection: null, writes: 0, opened: false, draft: null, rejectModel: false }
  const child = {
    session: { header: { isSeeded: true }, inheritedEventCount: 1,
      snapshotEvents(offset) { assert.equal(offset, 1); return ownEvents } },
    model: { select(selection) {
      state.writes++
      state.selection = selection
      ownEvents.push({ type: 'model/selection', data: selection })
    } },
  }
  let route
  apply({
    get: key => key === 'webServer' ? { register() {} } : undefined,
    effect: fn => fn(),
    inject: (_, mount) => mount({
      connection: { fetch: { register: value => { route = value } } },
      sessionQuery: { observeSession: id => {
        assert.equal(id, sourceId)
        return { events, [Symbol.dispose]() {} }
      } },
      agents: { get: id => id === childId ? child : undefined },
      llm: { resolveCallConfig: () => { if (state.rejectModel) throw new Error('model unavailable') } },
      agentDefaultModel: { currentSelection: () => initialDefault },
    }),
  })
  const sendRestore = (turn) => route.fetch(new Request('http://localhost' + route.path, {
    method: 'POST', body: JSON.stringify({ sourceId, childId, turn }),
  }))
  const sessions = {
    binding: () => ({ session: { eventSource: { getSnapshot: () => ({ entries: events }) } } }),
    fork: async opts => { assert.equal(opts.sessionId, sourceId); return childId },
  }
  const workspace = { openSession(id) {
    assert.equal(id, childId)
    state.opened = true
    state.atOpen = state.selection
  } }
  const fork = new Function('sessionsRef', 'ctx', 'fetch', 'seedChildDraft',
    extract('forkAndSeedTurn') + '\nreturn forkAndSeedTurn')(
    sessions, { get: () => workspace }, (path, init) => {
      assert.equal(path, route.path)
      return route.fetch(new Request('http://localhost' + path, init))
    }, async (id, prompt) => {
      assert.equal(id, childId)
      assert.equal(state.opened, true)
      state.draft = prompt
      return { attached: 0 }
    })
  return { state, sendRestore, fork: turn => fork(sourceId, turn, 'edited', []) }
}

const route = { provider: 'magpie-responses', model: 'codex/gpt-6.2-astra' }
const max = { ...route, reasoningEffort: 'max' }
function history(config = max, adapterDefaults) {
  return [
    { type: 'permission/preset', seq: 0 },
    { type: 'turn/start', seq: 1, data: { turn: 1 } },
    { type: 'request/header', seq: 2, data: { header: { config, adapterDefaults } } },
    { type: 'turn/end', seq: 3, data: { turn: 1 } },
    { type: 'turn/start', seq: 4, data: { turn: 2 } }, // 相同请求头可以省略
    { type: 'turn/end', seq: 5, data: { turn: 2 } },
    { type: 'model/selection', seq: 6, data: { provider: 'other', model: 'new-model' } },
  ]
}

test('the pencil restores the historical model and effort before exposing the child draft', async () => {
  for (const turn of [1, 2]) {
    for (const selection of [max, { ...route, reasoningEffort: 'high' }, route]) {
      const { fork, state, sendRestore } = branchHarness(history(selection))
      assert.equal((await fork(turn)).modelError, '')
      assert.deepEqual(state.atOpen, selection)
      assert.equal(state.draft, 'edited')
      assert.equal((await sendRestore(turn)).status, 200)
      assert.equal(state.writes, 1)
    }
  }
})

test('an adapter default stays implicit and a concurrent manual edit wins', async () => {
  const implicit = branchHarness(history(max, { reasoningEffort: true }))
  await implicit.fork(1)
  assert.deepEqual(implicit.state.atOpen, route)
  const manual = branchHarness(history(), [{ type: 'model/selection', data: { ...route, reasoningEffort: 'high' } }])
  await manual.fork(1)
  assert.equal(manual.state.writes, 0)
})

test('an unavailable historical selection returns the draft and an actionable error', async () => {
  const { fork, state } = branchHarness(history())
  state.rejectModel = true
  assert.match((await fork(1)).modelError, /model unavailable/)
  assert.equal(state.writes, 0)
  assert.equal(state.draft, 'edited')
})
