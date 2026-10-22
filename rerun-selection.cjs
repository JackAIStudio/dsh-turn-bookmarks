'use strict'

// Pure rerun-selection rules. The marker block is copied verbatim into client.js.

// BEGIN RERUN SELECTION
const PERMISSION_LABELS = {
  'read-only': '仅可查看',
  'workspace-write': '工作区内修改',
  'danger-full-access': '完全权限',
  auto: 'Auto review',
  custom: '自定义',
}

const PERMISSION_OPTIONS = ['read-only', 'workspace-write', 'danger-full-access']

function sameSelection(left, right) {
  if (left === right) return true
  if (left == null || right == null) return false
  return left.provider === right.provider
    && left.model === right.model
    && (left.reasoningEffort || '') === (right.reasoningEffort || '')
}

/** Rate limits are per provider route; changing only the effort does not escape them. */
function sameRoute(left, right) {
  if (left === right) return true
  if (left == null || right == null) return false
  return left.provider === right.provider && left.model === right.model
}

function cloneSelection(selection) {
  if (!selection) return null
  const copy = { provider: selection.provider, model: selection.model }
  if (selection.reasoningEffort) copy.reasoningEffort = selection.reasoningEffort
  return copy
}

function selectionOf(data) {
  if (!data || typeof data !== 'object') return null
  if (typeof data.provider !== 'string' || data.provider === '') return null
  if (typeof data.model !== 'string' || data.model === '') return null
  return cloneSelection(data)
}

function selectionFromRequestHeader(event) {
  const header = event && event.data && event.data.header
  const selection = selectionOf(header && header.config)
  if (!selection) return null
  const defaults = header.adapterDefaults
  if (defaults && defaults.reasoningEffort === true) delete selection.reasoningEffort
  return selection
}

function eventOf(entry) {
  if (!entry || typeof entry !== 'object') return null
  return entry.event && typeof entry.event === 'object' ? entry.event : entry
}

function projectRerunContext(entries, turn) {
  let pending = null
  let lastUsed = null
  let atStart = null
  let used = null
  let inTurn = false
  let permission = null
  let permissionAtStart = null
  let permissionUsed = null
  for (const entry of entries || []) {
    const ev = eventOf(entry)
    if (!ev || typeof ev.type !== 'string') continue
    if (ev.type === 'model/selection') {
      const selection = selectionOf(ev.data)
      if (selection && !sameSelection(pending, selection)) pending = selection
    } else if (ev.type === 'request/header') {
      const selection = selectionFromRequestHeader(ev)
      if (selection) {
        lastUsed = selection
        if (sameSelection(pending, selection)) pending = null
        if (inTurn) used = selection
      }
    } else if (ev.type === 'permission/preset') {
      const name = ev.data && ev.data.preset
      if (typeof name === 'string' && name !== '') {
        permission = name
        if (inTurn) permissionUsed = name
      }
    } else if (ev.type === 'turn/start' && ev.data && ev.data.turn === turn) {
      inTurn = true
      atStart = pending || lastUsed
      permissionAtStart = permission
      permissionUsed = null
    } else if (inTurn && ev.type === 'turn/end' && ev.data && ev.data.turn === turn) {
      inTurn = false
    }
  }
  return {
    atTurn: used || atStart || null,
    latest: pending || lastUsed || null,
    permissionAtTurn: permissionUsed || permissionAtStart || null,
    permissionLatest: permission,
  }
}

function decideChoice(original, current) {
  if (current && (!original || !sameSelection(original, current))) {
    return {
      chosen: cloneSelection(current),
      followedCurrent: !!(original && !sameSelection(original, current)),
    }
  }
  return {
    chosen: original ? cloneSelection(original) : (current ? cloneSelection(current) : null),
    followedCurrent: false,
  }
}

function decidePermission(original, current) {
  if (current && original && current !== original) {
    return { chosen: current, followedCurrent: true }
  }
  return { chosen: original || current || null, followedCurrent: false }
}

function findModel(groups, selection) {
  if (!selection) return null
  for (const group of groups || []) {
    if (!group || group.id !== selection.provider) continue
    const model = (group.models || []).find((item) => item && item.id === selection.model)
    if (model) return { group, model }
  }
  return null
}

function normalizeEffort(groups, selection) {
  const copy = cloneSelection(selection)
  if (!copy || copy.reasoningEffort) return copy
  const found = findModel(groups, copy)
  const fallback = found && found.model && found.model.reasoning && found.model.reasoning.defaultEffort
  if (typeof fallback === 'string' && fallback !== '') copy.reasoningEffort = fallback
  return copy
}

function withModel(groups, selection, provider, modelId) {
  const next = { provider, model: modelId }
  const found = findModel(groups, next)
  const efforts = (found && found.model && found.model.reasoning && found.model.reasoning.efforts) || []
  if (efforts.length === 0) return next
  const previous = selection && selection.reasoningEffort
  const sameModel = !!(selection && selection.provider === provider && selection.model === modelId)
  const kept = sameModel && previous && efforts.some((level) => level && level.id === previous)
  const fallback = found.model.reasoning.defaultEffort || (efforts[0] && efforts[0].id)
  if (kept || fallback) next.reasoningEffort = kept ? previous : fallback
  return next
}

/**
 * Restore the selection this turn originally ran with.
 * Keeping the effort only makes sense when it belongs to the restored model.
 */
function restoreSelection(groups, original, current) {
  if (!original) return current ? cloneSelection(current) : null
  const restored = cloneSelection(original)
  const found = findModel(groups, restored)
  const efforts = (found && found.model && found.model.reasoning && found.model.reasoning.efforts) || []
  if (efforts.length === 0) {
    delete restored.reasoningEffort
    return restored
  }
  const known = restored.reasoningEffort
    && efforts.some((level) => level && level.id === restored.reasoningEffort)
  if (!known) {
    const fallback = found.model.reasoning.defaultEffort || (efforts[0] && efforts[0].id)
    if (fallback) restored.reasoningEffort = fallback
  }
  return restored
}

function effortName(model, effortId) {
  if (!effortId) return ''
  const efforts = (model && model.reasoning && model.reasoning.efforts) || []
  const found = efforts.find((level) => level && level.id === effortId)
  return (found && found.name) || effortId
}

function selectionLabel(groups, selection) {
  if (!selection) return '未选择模型'
  const found = findModel(groups, selection)
  const modelName = (found && found.model && found.model.name) || selection.model
  if (!selection.reasoningEffort) return modelName
  const effort = effortName(found && found.model, selection.reasoningEffort)
  return effort ? modelName + ' · 思考 ' + effort : modelName
}

function modelOptions(groups) {
  const raw = []
  const nameCount = new Map()
  for (const group of groups || []) {
    if (!group) continue
    for (const model of group.models || []) {
      if (!model) continue
      const name = model.name || model.id
      nameCount.set(name, (nameCount.get(name) || 0) + 1)
      raw.push({
        provider: group.id,
        model: model.id,
        name,
        group: group.name || group.id,
      })
    }
  }
  return raw.map((option) => ({
    ...option,
    label: nameCount.get(option.name) > 1 ? option.name + ' · ' + option.group : option.name,
  }))
}

function permissionLabel(preset) {
  if (!preset) return '未设置'
  return PERMISSION_LABELS[preset] || preset
}

function permissionChoices(original, current) {
  const values = PERMISSION_OPTIONS.slice()
  for (const extra of [original, current]) {
    if (extra && extra !== 'custom' && values.indexOf(extra) === -1) values.push(extra)
  }
  return values
}

function shorten(text, max) {
  const value = String(text || '')
  if (value.length <= max) return value
  return value.slice(0, Math.max(1, max - 1)) + '…'
}

function rerunButtonLabel(groups, chosen, original, rateLimitedOnChosen) {
  if (!chosen) return '重新运行'
  if (rateLimitedOnChosen) return '换模型重跑'
  const found = findModel(groups, chosen)
  const modelName = (found && found.model && found.model.name) || chosen.model
  if (!original) {
    const effort = effortName(found && found.model, chosen.reasoningEffort)
    return effort
      ? '用 ' + shorten(modelName, 18) + ' · ' + effort + ' 重新运行'
      : '用 ' + shorten(modelName, 18) + ' 重新运行'
  }
  if (sameSelection(chosen, original)) return '重新运行'
  const sameModel = chosen.provider === original.provider && chosen.model === original.model
  if (sameModel) {
    const effort = effortName(found && found.model, chosen.reasoningEffort)
    return effort ? '用 ' + effort + ' 重新运行' : '重新运行'
  }
  const short = shorten(modelName, 18)
  const effortChanged = (chosen.reasoningEffort || '') !== (original.reasoningEffort || '')
  if (effortChanged && chosen.reasoningEffort) {
    const effort = effortName(found && found.model, chosen.reasoningEffort)
    return effort ? '用 ' + short + ' · ' + effort + ' 重新运行' : '用 ' + short + ' 重新运行'
  }
  return '用 ' + short + ' 重新运行'
}

function stillRunLabel(groups, selection) {
  if (!selection) return '仍用当前模型重跑'
  const found = findModel(groups, selection)
  const effort = effortName(found && found.model, selection.reasoningEffort)
  if (effort) return '仍用 ' + effort + ' 重跑'
  const modelName = (found && found.model && found.model.name) || selection.model
  return '仍用 ' + shorten(modelName, 12) + ' 重跑'
}

function parseRateLimit(text, now = Date.now()) {
  if (typeof text !== 'string' || text === '') return null
  // Provider errors often arrive with escaped JSON quotes; match the readable text.
  const plain = text.replace(/\\/g, '')
  if (!/频率限制|rate[_ ]limit|RATE_LIMIT|"code"\s*:\s*"rate"/.test(plain)) return null
  const match = plain.match(/将在\s+(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/)
  if (!match) return { resetAt: null, expired: false }
  const resetAt = match[1].slice(5) + ' ' + match[2]
  const stamp = new Date(match[1] + 'T' + match[2] + ':00+08:00').getTime()
  return {
    resetAt,
    expired: Number.isFinite(stamp) && stamp <= now,
  }
}

const rerunSelectionApi = {
  sameSelection,
  sameRoute,
  cloneSelection,
  selectionOf,
  selectionFromRequestHeader,
  projectRerunContext,
  decideChoice,
  decidePermission,
  findModel,
  normalizeEffort,
  withModel,
  restoreSelection,
  effortName,
  selectionLabel,
  modelOptions,
  permissionLabel,
  PERMISSION_LABELS,
  permissionChoices,
  rerunButtonLabel,
  stillRunLabel,
  parseRateLimit,
}
// END RERUN SELECTION

module.exports = rerunSelectionApi
