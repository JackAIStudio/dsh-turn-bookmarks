import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const api = require('../rerun-selection.cjs')

const {
  sameSelection,
  projectRerunContext,
  decideChoice,
  decidePermission,
  normalizeEffort,
  withModel,
  selectionLabel,
  rerunButtonLabel,
  stillRunLabel,
  parseRateLimit,
  permissionLabel,
} = api

const deepseek = {
  id: 'deepseek',
  name: 'DeepSeek',
  models: [{
    id: 'deepseek-v4-flash',
    name: 'DeepSeek-V4.1-Flash',
    reasoning: {
      defaultEffort: 'high',
      efforts: [
        { id: 'high', name: 'High' },
        { id: 'max', name: 'Max' },
      ],
    },
  }],
}

const grok = {
  id: 'xai',
  name: 'xAI',
  models: [{
    id: 'grok-4.7-fast',
    name: 'Grok 4.7 Fast',
    reasoning: {
      defaultEffort: 'extra-high',
      efforts: [{ id: 'extra-high', name: 'Extra High' }],
    },
  }],
}

const groups = [deepseek, grok]

function header(provider, model, effort, adapterDefault) {
  return {
    type: 'request/header',
    data: {
      header: {
        config: {
          provider,
          model,
          ...(effort ? { reasoningEffort: effort } : {}),
        },
        ...(adapterDefault ? { adapterDefaults: { reasoningEffort: true } } : {}),
      },
    },
  }
}

test('a later picker change does not replace the model that turn actually used', () => {
  const entries = [
    { type: 'model/selection', data: { provider: 'deepseek', model: 'deepseek-v4-flash', reasoningEffort: 'high' } },
    { type: 'turn/start', data: { turn: 1 } },
    header('deepseek', 'deepseek-v4-flash', 'high'),
    { type: 'turn/end', data: { turn: 1 } },
    { type: 'model/selection', data: { provider: 'deepseek', model: 'deepseek-v4-flash', reasoningEffort: 'max' } },
  ]
  const projected = projectRerunContext(entries, 1)
  assert.deepEqual(projected.atTurn, { provider: 'deepseek', model: 'deepseek-v4-flash', reasoningEffort: 'high' })
  assert.deepEqual(projected.latest, { provider: 'deepseek', model: 'deepseek-v4-flash', reasoningEffort: 'max' })
  const decision = decideChoice(
    normalizeEffort(groups, projected.atTurn),
    normalizeEffort(groups, projected.latest),
  )
  assert.equal(decision.followedCurrent, true)
  assert.equal(decision.chosen.reasoningEffort, 'max')
  assert.equal(rerunButtonLabel(groups, decision.chosen, projected.atTurn, false), '用 Max 重新运行')
})

test('an unchanged picker keeps the original selection and a plain rerun button', () => {
  const original = { provider: 'deepseek', model: 'deepseek-v4-flash', reasoningEffort: 'high' }
  const decision = decideChoice(original, { ...original })
  assert.equal(decision.followedCurrent, false)
  assert.equal(sameSelection(decision.chosen, original), true)
  assert.equal(rerunButtonLabel(groups, decision.chosen, original, false), '重新运行')
})

test('switching provider names the model on the button', () => {
  const original = { provider: 'deepseek', model: 'deepseek-v4-flash', reasoningEffort: 'high' }
  const chosen = { provider: 'xai', model: 'grok-4.7-fast', reasoningEffort: 'extra-high' }
  assert.equal(rerunButtonLabel(groups, chosen, original, false), '用 Grok 4.7 Fast · Extra High 重新运行')
  assert.equal(selectionLabel(groups, chosen), 'Grok 4.7 Fast · 思考 Extra High')
})

test('rate limit on the chosen model turns the primary action into a model switch', () => {
  const original = { provider: 'deepseek', model: 'deepseek-v4-flash', reasoningEffort: 'high' }
  assert.equal(rerunButtonLabel(groups, original, original, true), '换模型重跑')
  assert.equal(stillRunLabel(groups, original), '仍用 High 重跑')
  const notice = parseRateLimit(
    '您的使用量已超出频率限制，将在 2026-10-21 09:23:47 UTC+8 重置，"code":"rate"',
    new Date('2026-10-21T08:00:00+08:00').getTime(),
  )
  assert.deepEqual(notice, { resetAt: '10-21 09:23', expired: false })
  assert.equal(
    parseRateLimit(
      '您的使用量已超出频率限制，将在 2026-10-21 09:23:47 UTC+8 重置，"code":"rate"',
      new Date('2026-10-21T10:00:00+08:00').getTime(),
    ).expired,
    true,
  )
  assert.equal(parseRateLimit('处理失败：网络断开'), null)
})

test('escaping a rate limit needs a different model, not just a different effort', () => {
  const original = { provider: 'deepseek', model: 'deepseek-v4-flash', reasoningEffort: 'high' }
  const maxEffort = { ...original, reasoningEffort: 'max' }
  const otherModel = { provider: 'xai', model: 'grok-4.7-fast', reasoningEffort: 'extra-high' }
  assert.equal(api.sameRoute(maxEffort, original), true)
  assert.equal(api.sameRoute(otherModel, original), false)
  assert.equal(rerunButtonLabel(groups, maxEffort, original, api.sameRoute(maxEffort, original)), '换模型重跑')
  assert.equal(rerunButtonLabel(groups, otherModel, original, api.sameRoute(otherModel, original)), '用 Grok 4.7 Fast · Extra High 重新运行')
})

test('adapter-default effort is not treated as an explicit choice', () => {
  const entries = [
    { type: 'turn/start', data: { turn: 2 } },
    header('deepseek', 'deepseek-v4-flash', 'high', true),
    { type: 'turn/end', data: { turn: 2 } },
  ]
  const projected = projectRerunContext(entries, 2)
  assert.deepEqual(projected.atTurn, { provider: 'deepseek', model: 'deepseek-v4-flash' })
  // Reading a past turn keeps what that turn ran with, so the provider default
  // is the right answer here. Only a fresh model pick escalates to the top tier.
  assert.deepEqual(normalizeEffort(groups, projected.atTurn), {
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    reasoningEffort: 'high',
  })
})

test('permission follows the composer only when it differs, and labels the built-in presets', () => {
  const entries = [
    { type: 'permission/preset', data: { preset: 'workspace-write' } },
    { type: 'turn/start', data: { turn: 3 } },
    { type: 'turn/end', data: { turn: 3 } },
    { type: 'permission/preset', data: { preset: 'danger-full-access' } },
  ]
  const projected = projectRerunContext(entries, 3)
  assert.equal(projected.permissionAtTurn, 'workspace-write')
  assert.equal(projected.permissionLatest, 'danger-full-access')
  const decision = decidePermission(projected.permissionAtTurn, projected.permissionLatest)
  assert.equal(decision.followedCurrent, true)
  assert.equal(decision.chosen, 'danger-full-access')
  assert.equal(permissionLabel(decision.chosen), '完全权限')
  assert.equal(decidePermission('danger-full-access', 'danger-full-access').followedCurrent, false)
})

test('changing model keeps a shared effort id and otherwise falls back to that model default', () => {
  const kept = withModel(groups, { provider: 'deepseek', model: 'deepseek-v4-flash', reasoningEffort: 'high' }, 'deepseek', 'deepseek-v4-flash')
  assert.equal(kept.reasoningEffort, 'high')
  const switched = withModel(groups, kept, 'xai', 'grok-4.7-fast')
  assert.equal(switched.reasoningEffort, 'extra-high')
})

test('a model without an advertised default starts on its strongest level, not the first entry', () => {
  // Some providers publish levels but no default. The list starts at `off` and
  // `low`, so taking the first entry silently answered with the least effort.
  const noDefault = [{
    id: 'workbuddy-cn',
    name: 'WorkBuddy CN',
    models: [{
      id: 'deepseek-v4.1-flash',
      name: 'Deepseek-V4.1-Flash',
      reasoning: {
        efforts: [
          { id: 'off', name: 'Off' },
          { id: 'low', name: 'Low' },
          { id: 'medium', name: 'Medium' },
          { id: 'high', name: 'High' },
          { id: 'max', name: 'Max' },
        ],
      },
    }],
  }]
  const selection = { provider: 'workbuddy-cn', model: 'deepseek-v4.1-flash' }
  assert.equal(normalizeEffort(noDefault, selection).reasoningEffort, 'max')
  assert.equal(api.withModel(noDefault, null, 'workbuddy-cn', 'deepseek-v4.1-flash').reasoningEffort, 'max')
  assert.equal(api.restoreSelection(noDefault, { ...selection, reasoningEffort: 'ultra' }, null).reasoningEffort, 'max')
  // withModel is the only place a switch escalates; a null default is the
  // provider's own answer and must stay at the provider value.
  assert.equal(
    api.withModel(noDefault, { ...selection, reasoningEffort: 'low' }, 'workbuddy-cn', 'deepseek-v4.1-flash').reasoningEffort,
    'low',
  )
  assert.equal(api.topEffort(noDefault[0].models[0]), 'max')
  assert.equal(api.providerDefaultOf(noDefault[0].models[0]), 'max')
  assert.equal(api.preferredEffortOf(noDefault[0].models[0]), 'max')
})

test('switching models ignores weak provider defaults and takes the strongest tier', () => {
  // Providers commonly advertise `high` (or `medium`) as the default. Picking a
  // model is a deliberate act, so the panel starts where the model is strongest.
  const model = { provider: 'deepseek', model: 'deepseek-v4-flash', reasoningEffort: 'high' }
  assert.equal(api.withModel(groups, model, 'xai', 'grok-4.7-fast').reasoningEffort, 'extra-high')
  assert.equal(api.preferredEffortOf(groups[0].models[0]), 'max')
  const offOnly = [{ id: 'p', name: 'P', models: [{ id: 'm', name: 'M', reasoning: { efforts: [{ id: 'off', name: 'Off' }] } }] }]
  assert.equal(api.topEffort(offOnly[0].models[0]), null)
})

test('the composer trigger label survives model names that carry a credits suffix', () => {
  // `title` is `<name> · <effort>`; WorkBuddy names read
  // `Deepseek-V4.1-Flash · x0.11`. Splitting on the first separator lost Max.
  const workbuddy = [{
    id: 'workbuddy-cn',
    name: 'WorkBuddy CN',
    models: [{
      id: 'deepseek-v4.1-flash',
      name: 'Deepseek-V4.1-Flash · x0.11',
      reasoning: {
        efforts: [
          { id: 'low', name: 'Low' },
          { id: 'high', name: 'High' },
          { id: 'max', name: 'Max' },
        ],
      },
    }],
  }]
  assert.deepEqual(api.parseComposerLabel(workbuddy, 'Deepseek-V4.1-Flash · x0.11 · Max'), {
    provider: 'workbuddy-cn',
    model: 'deepseek-v4.1-flash',
    reasoningEffort: 'max',
  })
  assert.deepEqual(api.parseComposerLabel(groups, 'Grok 4.7 Fast · Extra High'), {
    provider: 'xai',
    model: 'grok-4.7-fast',
    reasoningEffort: 'extra-high',
  })
  assert.equal(api.parseComposerLabel(groups, '未知名模型 · High'), null)
})

test('restoring the original turn brings back its own effort, not the composer effort', () => {
  const original = { provider: 'deepseek', model: 'deepseek-v4-flash', reasoningEffort: 'high' }
  const restored = api.restoreSelection(groups, original, { provider: 'xai', model: 'grok-4.7-fast', reasoningEffort: 'extra-high' })
  assert.deepEqual(restored, original)
  assert.notEqual(restored, original, 'must return a copy, not the projected object')
  const withUnknownEffort = api.restoreSelection(groups, { provider: 'deepseek', model: 'deepseek-v4-flash', reasoningEffort: 'ultra' }, null)
  // An effort this model does not advertise falls back to its provider default,
  // never to the first list entry.
  assert.equal(withUnknownEffort.reasoningEffort, 'high')
})

test('client.js carries the same selection rules as the tested module', () => {
  const source = readFileSync(join(here, '../rerun-selection.cjs'), 'utf8')
  const client = readFileSync(join(here, '../client.js'), 'utf8')
  const startMark = '// BEGIN RERUN SELECTION\n'
  const endMark = '\n// END RERUN SELECTION'
  const start = source.indexOf(startMark)
  const end = source.indexOf(endMark)
  assert.ok(start >= 0 && end > start)
  const block = source.slice(start + startMark.length, end)
  assert.equal(client.includes(block), true)
})

test('the branch flow leaves model, effort and permission to the official composer', () => {
  const client = readFileSync(join(here, '../client.js'), 'utf8')
  // 分支只负责把提示词和附件放回输入框。模型、思考程度、权限由官方输入框
  // 自己的选择器决定，插件不再替用户切换或发送。
  assert.equal(client.includes('selectModel'), false, 'branch flow must not switch models itself')
  assert.equal(client.includes("'/permission '"), false, 'branch flow must not switch permissions itself')
  assert.equal(client.includes('sendSession'), false, 'branch flow must not send the prompt for the user')
  assert.equal(
    client.includes('conversation.input?.shell?.(sessionId)'),
    true,
    'seeding must go through the official conversation input shell',
  )
})
