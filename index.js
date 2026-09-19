/**
 * dsh-turn-bookmarks — host half.
 *
 * Provides persistent server-side storage backup for turn bookmarks
 * and session search support.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

export const name = 'dsh-turn-bookmarks'
export const inject = ['webServer']

const BOOKMARKS_PATH = join(homedir(), '.dsh', 'turn-bookmarks.json')
const FTS_DB_PATH = join(homedir(), '.dsh', 'storages', 'sessions-fts.db')

function loadBookmarks() {
  try {
    if (existsSync(BOOKMARKS_PATH)) {
      const raw = readFileSync(BOOKMARKS_PATH, 'utf8')
      return JSON.parse(raw)
    }
  } catch (err) {
    console.warn('[dsh-turn-bookmarks] Failed to read bookmarks storage:', err.message)
  }
  return {}
}

function saveBookmarks(data) {
  try {
    writeFileSync(BOOKMARKS_PATH, JSON.stringify(data, null, 2), 'utf8')
    return true
  } catch (err) {
    console.warn('[dsh-turn-bookmarks] Failed to write bookmarks storage:', err.message)
    return false
  }
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
        if (existsSync(FTS_DB_PATH)) {
          const { DatabaseSync } = await import('node:sqlite')
          const db = new DatabaseSync(FTS_DB_PATH, { readOnly: true })
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
