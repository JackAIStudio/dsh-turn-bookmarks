// 会话隔离回归测试 —— 防止「收藏串会话」再犯。
//
// 背景（2026-09-23）：reloadBookmarks() 的后端同步没有绑定发起请求时的会话 id。
// 用户在请求飞行期间切换会话，上一个会话的收藏就会被并进、并写死到新会话：
//   session-925a8e5a 的 [25,27,38] 串进了 session-4927de52。
// 修复：绑定 sid + 迟到响应丢弃 + 服务端为准（可自愈脏数据）。
//
// 运行： node test/session-scope.test.mjs
// 说明：直接从 client.js 抽取真实函数体执行，不是复制一份逻辑，改错会真的挂。

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
// 可用 TB_CLIENT=<路径> 指向别的版本（回归验证：git show HEAD:client.js > /tmp/old.js）
const clientPath = process.env.TB_CLIENT || join(here, '..', 'client.js')
const src = readFileSync(clientPath, 'utf8')

function extract(name) {
  const start = src.indexOf(`function ${name}(`)
  if (start < 0) throw new Error(`client.js 里找不到 ${name}`)
  const open = src.indexOf('{', start)
  let depth = 0
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}') {
      depth--
      if (depth === 0) return src.slice(start, i + 1)
    }
  }
  throw new Error(`${name} 括号不闭合`)
}

const reloadSrc = extract('reloadBookmarks')
const toggleSrc = extract('toggleBookmark')

/** 用真实函数体 + 假 DOM/fetch 搭一个最小运行台。 */
function makeHarness({ store, session }) {
  const state = { currentSession: session }
  const pending = [] // 悬空的 GET：手动决定何时返回
  const posts = []
  const api = {
    getSessionIdFromEnvironment: () => state.currentSession,
    getStoredBookmarks: () => JSON.parse(JSON.stringify(store)),
    saveStoredBookmarks: (m) => {
      for (const k of Object.keys(store)) delete store[k]
      Object.assign(store, m)
    },
    updateRailMarks() {},
    updateLeftBookmarkRail() {},
    injectMessageStarButtons() {},
    renderControlBarState() {},
    fetch: (url, opts) => {
      if (opts?.method === 'POST') {
        posts.push(JSON.parse(opts.body))
        return Promise.resolve({ ok: true })
      }
      const sid = new URL(url, 'http://local').searchParams.get('sessionId')
      return new Promise((resolve) => pending.push({ sid, resolve }))
    },
    console: { info() {}, warn() {} },
  }
  const factory = new Function(
    'api',
    `
    let activeSessionId = api.getSessionIdFromEnvironment()
    let starredTurns = new Set()
    let bookmarkToggleSeq = 0
    const sessionsRef = undefined
    const { getSessionIdFromEnvironment, getStoredBookmarks, saveStoredBookmarks,
            updateRailMarks, updateLeftBookmarkRail, injectMessageStarButtons,
            renderControlBarState, fetch, console } = api
    ${reloadSrc}
    ${toggleSrc}
    return {
      reloadBookmarks,
      toggleBookmark,
      snap: () => ({ active: activeSessionId, starred: [...starredTurns].sort((a, b) => a - b) }),
    }
  `,
  )
  return { h: factory(api), state, pending, posts }
}

const A = 'session-A'
const B = 'session-B'
let failed = 0
const check = (label, cond, extra = '') => {
  if (!cond) failed++
  console.log(`${cond ? '✅' : '❌'} ${label}${extra ? '  ' + extra : ''}`)
}
const settle = () => new Promise((r) => setTimeout(r, 10))

// 1. 迟到的响应不得写进新会话（这就是线上那个 bug）
{
  const store = {}
  const { h, state, pending } = makeHarness({ store, session: A })
  h.reloadBookmarks() // A 的请求悬空
  state.currentSession = B
  h.reloadBookmarks() // 切到 B
  pending[0].resolve({ json: async () => ({ ok: true, bookmarks: [25, 27, 38] }) }) // A 迟到
  await settle()
  check('迟到响应不污染新会话', !(B in store) && h.snap().starred.length === 0, `store=${JSON.stringify(store)}`)
}

// 2. 已经串脏的会话，以服务端为准自动清掉
{
  const store = { [B]: [25, 27, 38] }
  const { h, pending } = makeHarness({ store, session: B })
  h.reloadBookmarks()
  pending[0].resolve({ json: async () => ({ ok: true, bookmarks: [] }) })
  await settle()
  check('脏数据被服务端清掉', !(B in store) && h.snap().starred.length === 0, `store=${JSON.stringify(store)}`)
}

// 3. 请求飞行期间点下的星不能被同步冲掉
{
  const store = {}
  const { h, pending } = makeHarness({ store, session: A })
  h.reloadBookmarks()
  h.toggleBookmark(7)
  pending[0].resolve({ json: async () => ({ ok: true, bookmarks: [25] }) })
  await settle()
  check('刚点的星保留（并集）', JSON.stringify(h.snap().starred) === '[7,25]', JSON.stringify(h.snap().starred))
}

// 4. 常规同步：服务端有的收藏要下发并落本地
{
  const store = {}
  const { h, pending } = makeHarness({ store, session: A })
  h.reloadBookmarks()
  pending[0].resolve({ json: async () => ({ ok: true, bookmarks: [3, 5] }) })
  await settle()
  check('服务端收藏正常下发', JSON.stringify(h.snap().starred) === '[3,5]' && JSON.stringify(store[A]) === '[3,5]')
}

// 5. 后端不可用时，本地收藏不能被清空
{
  const store = { [A]: [1, 2] }
  const { h, pending } = makeHarness({ store, session: A })
  h.reloadBookmarks()
  pending[0].resolve({ json: async () => ({ ok: false }) })
  await settle()
  check('后端异常时保留本地', JSON.stringify(h.snap().starred) === '[1,2]')
}

console.log(failed === 0 ? '\n全部通过' : `\n${failed} 项失败`)
process.exit(failed === 0 ? 0 : 1)
