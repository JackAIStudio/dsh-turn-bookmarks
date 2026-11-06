// 分支预填回归测试 —— 点 ✏️ 后，新会话的官方输入框里应该有原来的提示词和附件。
//
// 直接从 client.js 抽取真实函数体执行，不是复制一份逻辑。
// 运行： node test/branch-seed.test.mjs

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import assert from 'node:assert/strict'
import { test } from 'node:test'

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
