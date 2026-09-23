/**
 * dsh-turn-bookmarks — host half.
 *
 * Provides persistent server-side storage backup for turn bookmarks
 * and session search support.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

export const name = 'dsh-turn-bookmarks'
export const inject = ['webServer']

/**
 * harness home 的解析必须跟着 DSH 核心走，不能写死 ~/.dsh：
 * 同一台机器上可以并存多个实例（例如 `dsh web --port 3080` 用 ~/.dsh，
 * 而 JackDSH 桌面端带 DSH_HOME=<userData>/dsh-data 启动）。写死会把桌面端的
 * 收藏写进 3080 实例的数据目录，并让会话内搜索去查另一个实例的索引库。
 * 规则与 dsh 核心的 resolveDshHome 一致：DSH_HOME 优先，否则 ~/.dsh。
 */
const DSH_HOME_ENV = 'DSH_HOME'

/** 与核心一致：支持 DSH_HOME 写成 ~ 或 ~/xxx */
function expandHomePath(value) {
  if (value === '~') return homedir()
  if (value.startsWith('~/')) return join(homedir(), value.slice(2))
  return value
}

export function resolveDshHome(env = process.env) {
  const fromEnv = typeof env?.[DSH_HOME_ENV] === 'string' ? env[DSH_HOME_ENV].trim() : ''
  return fromEnv !== '' ? expandHomePath(fromEnv) : join(homedir(), '.dsh')
}

// 每次调用时解析，不在模块加载时定版（启动器可能在 import 之后才设好 DSH_HOME）
export function bookmarksPath() {
  return join(resolveDshHome(), 'turn-bookmarks.json')
}

export function ftsDbPath() {
  return join(resolveDshHome(), 'storages', 'sessions-fts.db')
}

function loadBookmarks(path = bookmarksPath()) {
  try {
    if (existsSync(path)) {
      const raw = readFileSync(path, 'utf8')
      return JSON.parse(raw)
    }
  } catch (err) {
    console.warn('[dsh-turn-bookmarks] Failed to read bookmarks storage:', err.message)
  }
  return {}
}

function saveBookmarks(data, path = bookmarksPath()) {
  try {
    writeFileSync(path, JSON.stringify(data, null, 2), 'utf8')
    return true
  } catch (err) {
    console.warn('[dsh-turn-bookmarks] Failed to write bookmarks storage:', err.message)
    return false
  }
}

/** 某个 harness home 里真实存在的 session id 集合（sessions/<workspace>/session-<id>/）。 */
export function sessionsInHome(home) {
  const ids = new Set()
  const root = join(home, 'sessions')
  if (!existsSync(root)) return ids
  let workspaces = []
  try {
    workspaces = readdirSync(root, { withFileTypes: true })
  } catch {
    return ids
  }
  for (const workspace of workspaces) {
    if (!workspace.isDirectory()) continue
    let entries = []
    try {
      entries = readdirSync(join(root, workspace.name), { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('session-')) ids.add(entry.name)
    }
  }
  return ids
}

/**
 * 一次性搬家（幂等）：本插件曾把路径写死成 ~/.dsh，桌面端的收藏因此落进了默认实例的
 * 数据目录。第一次在别的 home 启动时，把"会话确实属于本 home"的条目并回本 home，
 * 其余实例的条目原样留在旧文件里，绝不混用。
 */
export function migrateLegacyBookmarks(options = {}) {
  const home = options.home ?? resolveDshHome()
  const legacyHome = options.legacyHome ?? join(homedir(), '.dsh')
  const noop = (reason) => ({ migrated: 0, removed: 0, skipped: reason })

  if (home === legacyHome) return noop('same-home')
  const legacyPath = join(legacyHome, 'turn-bookmarks.json')
  if (!existsSync(legacyPath)) return noop('no-legacy-file')

  let legacyStore
  try {
    legacyStore = JSON.parse(readFileSync(legacyPath, 'utf8'))
  } catch {
    return noop('legacy-unreadable')
  }
  if (legacyStore === null || typeof legacyStore !== 'object') return noop('legacy-malformed')

  const own = sessionsInHome(home)
  const movable = Object.entries(legacyStore).filter(([sid, list]) => own.has(sid) && Array.isArray(list))
  if (movable.length === 0) return noop('nothing-mine')

  const targetPath = join(home, 'turn-bookmarks.json')
  const store = loadBookmarks(targetPath)
  let changed = false
  for (const [sid, list] of movable) {
    const merged = [...new Set([...(Array.isArray(store[sid]) ? store[sid] : []), ...list])]
      .filter(Number.isSafeInteger)
      .sort((a, b) => a - b)
    const before = Array.isArray(store[sid]) ? store[sid] : []
    if (merged.join(',') !== before.join(',')) {
      store[sid] = merged
      changed = true
    }
  }
  if (changed) saveBookmarks(store, targetPath)

  // 从旧文件里摘掉本 home 的条目，另一个实例的收藏原样保留
  const rest = { ...legacyStore }
  for (const [sid] of movable) delete rest[sid]
  try {
    writeFileSync(legacyPath, JSON.stringify(rest, null, 2), 'utf8')
  } catch (err) {
    console.warn('[dsh-turn-bookmarks] Failed to prune legacy storage:', err.message)
  }

  return { migrated: movable.length, removed: movable.length, skipped: null, home, legacyHome }
}

async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (!raw) return {}
  return JSON.parse(raw)
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  })
  res.end(body)
}

export function apply(ctx) {
  const webServer = ctx.get('webServer')

  // 启动时把旧版写死 ~/.dsh 落下的本 home 收藏搬回来（幂等，失败不影响启动）
  try {
    const result = migrateLegacyBookmarks()
    if (result.migrated > 0) {
      console.info(
        `[dsh-turn-bookmarks] 已从旧路径迁移 ${result.migrated} 个会话的收藏：${result.legacyHome} → ${result.home}`,
      )
    }
  } catch (err) {
    console.warn('[dsh-turn-bookmarks] legacy migration skipped:', err.message)
  }

  if (!webServer) return

  // 1. Info endpoint
  ctx.effect(() => webServer.register({
    kind: 'exact',
    path: '/dsh-turn-bookmarks/info',
    handler: (req, res) => {
      sendJson(res, 200, { ok: true, name: 'dsh-turn-bookmarks', version: '0.1.0' })
    },
  }), 'dsh-turn-bookmarks: info')

  // 2. Bookmarks persistence endpoint (GET / POST)
  ctx.effect(() => webServer.register({
    kind: 'exact',
    path: '/dsh-turn-bookmarks/bookmarks',
    handler: async (req, res) => {
      if (req.method === 'GET') {
        const url = new URL(req.url, 'http://127.0.0.1')
        const sid = url.searchParams.get('sessionId') || ''
        const store = loadBookmarks()
        if (sid) {
          return sendJson(res, 200, { ok: true, sessionId: sid, bookmarks: store[sid] || [] })
        }
        return sendJson(res, 200, { ok: true, all: store })
      }
      if (req.method === 'POST') {
        try {
          const body = await readJsonBody(req)
          const sid = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
          const list = Array.isArray(body.bookmarks) ? body.bookmarks.map(Number).filter(Number.isSafeInteger) : []
          if (!sid) {
            return sendJson(res, 400, { ok: false, error: 'missing sessionId' })
          }
          const store = loadBookmarks()
          if (list.length === 0) {
            delete store[sid]
          } else {
            store[sid] = [...new Set(list)].sort((a, b) => a - b)
          }
          saveBookmarks(store)
          return sendJson(res, 200, { ok: true, sessionId: sid, bookmarks: store[sid] || [] })
        } catch (err) {
          return sendJson(res, 500, { ok: false, error: err.message })
        }
      }
      res.setHeader('allow', 'GET, POST')
      sendJson(res, 405, { ok: false, error: 'method not allowed' })
    },
  }), 'dsh-turn-bookmarks: bookmarks')

  // 3. In-session full-text search backend fallback
  ctx.effect(() => webServer.register({
    kind: 'exact',
    path: '/dsh-turn-bookmarks/search',
    handler: async (req, res) => {
      if (req.method !== 'GET') {
        res.setHeader('allow', 'GET')
        return sendJson(res, 405, { ok: false, error: 'method not allowed' })
      }
      const url = new URL(req.url, 'http://127.0.0.1')
      const sid = (url.searchParams.get('sessionId') || '').trim()
      const query = (url.searchParams.get('q') || '').trim()

      if (!query) {
        return sendJson(res, 200, { ok: true, matches: [] })
      }

      const matches = []
      try {
        if (existsSync(ftsDbPath())) {
          const { DatabaseSync } = await import('node:sqlite')
          const db = new DatabaseSync(ftsDbPath(), { readOnly: true })
          const spacedQ = query.split('').join('%')
          const sql = sid
            ? `SELECT seq, type, text FROM persisted_docs WHERE session_id = ? AND text LIKE ? AND text NOT LIKE '<system-reminder%' AND text NOT LIKE 'Current runtime context%' LIMIT 50`
            : `SELECT session_id, seq, type, text FROM persisted_docs WHERE text LIKE ? AND text NOT LIKE '<system-reminder%' AND text NOT LIKE 'Current runtime context%' LIMIT 50`
          const params = sid ? [sid, `%${spacedQ}%`] : [`%${spacedQ}%`]
          const rows = db.prepare(sql).all(...params)
          for (const row of rows) {
            matches.push({
              seq: row.seq,
              type: row.type,
              text: (row.text || '').slice(0, 300),
            })
          }
        }
      } catch (err) {
        console.warn('[dsh-turn-bookmarks] SQLite search error:', err.message)
      }

      sendJson(res, 200, { ok: true, sessionId: sid, query, matches })
    },
  }), 'dsh-turn-bookmarks: search')
}
