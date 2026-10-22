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

test('restoring the original turn brings back its own effort, not the composer effort', () => {
  const original = { provider: 'deepseek', model: 'deepseek-v4-flash', reasoningEffort: 'high' }
  const restored = api.restoreSelection(groups, original, { provider: 'xai', model: 'grok-4.7-fast', reasoningEffort: 'extra-high' })
  assert.deepEqual(restored, original)
  assert.notEqual(restored, original, 'must return a copy, not the projected object')
  const withUnknownEffort = api.restoreSelection(groups, { provider: 'deepseek', model: 'deepseek-v4-flash', reasoningEffort: 'ultra' }, null)
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

test('the client resolves remote.session as its own service, never off the remote proxy', () => {
  const client = readFileSync(join(here, '../client.js'), 'utf8')
  // Regression: "cannot get property \"remote.session\" without inject".
  // Cordis exposes remote.session as a separate service; property access on the
  // remote namespace throws.
  assert.equal(
    client.includes("ctx.get('remote.session')"),
    true,
    'selectModelOn must resolve remote.session through ctx.get',
  )
  const proxyAccess = /remote\s*&&\s*remote\.session|remote\.session\.selectModel/
  const match = client.match(proxyAccess)
  if (match) {
    // A guarded fallback is allowed, but it must sit inside a try block.
    const guarded = client.slice(Math.max(0, match.index - 200), match.index + 200)
    assert.equal(guarded.includes('try {'), true, 'unguarded remote.session access will throw at runtime')
  }
})
