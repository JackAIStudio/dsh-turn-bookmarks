/**
 * dsh-turn-bookmarks — host half.
 *
 * Provides persistent server-side storage backup for turn bookmarks
 * and session search support.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createReadStream } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { spawn } from 'node:child_process'
import readline from 'node:readline'

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

/** 寻找某个 session 在本地的日志文件路径（支持 .v3.jsonl.zstd / .jsonl.zstd / .jsonl） */
export function findSessionFile(home, sessionId) {
  const root = join(home, 'sessions')
  if (!existsSync(root)) return null
  try {
    const workspaces = readdirSync(root, { withFileTypes: true })
    for (const ws of workspaces) {
      if (!ws.isDirectory()) continue
      const sDir = join(root, ws.name, sessionId)
      if (existsSync(sDir)) {
        const files = readdirSync(sDir)
        for (const name of files) {
          if (name.startsWith('session') && (name.endsWith('.jsonl.zstd') || name.endsWith('.jsonl'))) {
            return join(sDir, name)
          }
        }
      }
    }
  } catch {}
  return null
}

/** 精确获取某一轮的前驱截断点 seq */
export async function getTurnBoundarySeq({ home, sessionId, turn }) {
  const targetTurn = parseInt(turn, 10)
  if (!Number.isSafeInteger(targetTurn) || targetTurn <= 0) return null
  const file = findSessionFile(home, sessionId)
  if (!file) return null
  const isCompressed = file.endsWith('.zstd')
  let stream
  let proc = null
  if (isCompressed) {
    const zstdBin = process.platform === 'win32' ? 'zstd.exe' : (existsSync('/opt/homebrew/bin/zstd') ? '/opt/homebrew/bin/zstd' : 'zstd')
    proc = spawn(zstdBin, ['-dc', file], { stdio: ['ignore', 'pipe', 'ignore'] })
    stream = proc.stdout
  } else {
    stream = createReadStream(file)
  }
  const rl = readline.createInterface({ input: stream })
  let matchedSeq = null
  let lastInitSeq = null
  try {
    for await (const line of rl) {
      if (!line.trim()) continue
      try {
        const ev = JSON.parse(line)
        if (typeof ev.seq === 'number') {
          if (targetTurn === 1) {
            // 第 1 轮：在遇到任何用户消息、收件箱投递或 turn/start 之前，截取最后一条系统/配置事件
            if (ev.type === 'agent/inbox/spliced' || ev.type === 'user/message' || ev.type === 'turn/start') {
              matchedSeq = lastInitSeq !== null ? lastInitSeq : 0
              break
            }
            lastInitSeq = ev.seq
          } else if (ev.type === 'turn/end' && ev.data?.turn === targetTurn - 1) {
            // 第 N 轮 (N > 1)：严格截断在第 N - 1 轮的 turn/end，排除后续可能排队的 inbox
            matchedSeq = ev.seq
            break
          }
        }
      } catch {}
    }
  } finally {
    rl.close()
    if (proc) {
      try { proc.kill() } catch {}
    }
  }
  return matchedSeq
}

/** 打开会话日志流：压缩日志走 `zstd -dc`，普通 jsonl 直读。 */
function openSessionLogStream(file) {
  if (!file.endsWith('.zstd')) return { stream: createReadStream(file), dispose: () => {} };
  const zstdBin = process.platform === 'win32' ? 'zstd.exe' : (existsSync('/opt/homebrew/bin/zstd') ? '/opt/homebrew/bin/zstd' : 'zstd');
  const proc = spawn(zstdBin, ['-dc', file], { stdio: ['ignore', 'pipe', 'ignore'] });
  return { stream: proc.stdout, dispose: () => { try { proc.kill(); } catch {} } };
}

/** 会话内容块里的文本拼接（保留完整的 @[标题](dsh-session:...) 会话引用）。 */
function textOfContentBlocks(blocks) {
  return (blocks || [])
    .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join(String.fromCharCode(10));
}

/** 会话内容块里的附件引用（图片 / 文件），保持消息内顺序。 */
export function collectAttachmentRefs(blocks) {
  const refs = [];
  for (const block of blocks || []) {
    if (!block || typeof block !== 'object') continue;
    if ((block.type === 'image' || block.type === 'file') && block.attachment && typeof block.attachment === 'object') {
      refs.push({ kind: block.type, ...block.attachment });
    }
  }
  return refs;
}

/**
 * 解析某一轮用户消息的完整内容：原始提示词 + 该消息携带的附件引用。
 * 文本优先取 inbox 投递的原始形态（保留会话引用标记），附件取两侧非空的一侧。
 * @returns {Promise<{ text: string, attachments: Array<object> } | null>}
 */
export async function getTurnContentParts({ home, sessionId, turn }) {
  const targetTurn = parseInt(turn, 10);
  if (!Number.isSafeInteger(targetTurn) || targetTurn <= 0) return null;
  const file = findSessionFile(home, sessionId);
  if (!file) return null;
  const { stream, dispose } = openSessionLogStream(file);
  const rl = readline.createInterface({ input: stream });
  let lastInboxInserted = null;
  let inboxBlocks = null;
  let userBlocks = null;
  let foundTargetTurn = false;
  try {
    for await (const line of rl) {
      if (!line.trim()) continue;
      let ev;
      try { ev = JSON.parse(line); } catch { continue; }
      if (ev.type === 'agent/inbox/spliced' && ev.data?.target === 'next-turn' && Array.isArray(ev.data?.inserted) && ev.data.inserted.length > 0) {
        lastInboxInserted = ev.data.inserted;
      } else if (ev.type === 'agent/inbox/spliced' && ev.data?.target === 'next-turn' && Number.isSafeInteger(ev.data?.removedCount) && ev.data.removedCount > 0) {
        // 投递已被下一轮消费：清掉快照，避免把上一轮的提示词/附件算到后面的轮次上
        lastInboxInserted = null;
      }
      if (ev.type === 'turn/start' && ev.data?.turn === targetTurn) {
        foundTargetTurn = true;
        if (lastInboxInserted) inboxBlocks = lastInboxInserted.flatMap((item) => (item && item.content) || []);
      }
      if (foundTargetTurn && ev.type === 'user/message') {
        if (Array.isArray(ev.data?.content)) userBlocks = ev.data.content;
        break;
      }
      if (foundTargetTurn && ev.type === 'turn/end' && ev.data?.turn === targetTurn) break;
    }
  } finally {
    rl.close();
    dispose();
  }
  if (!foundTargetTurn) return null;
  const text = textOfContentBlocks(inboxBlocks) || textOfContentBlocks(userBlocks);
  const attachments = collectAttachmentRefs(inboxBlocks);
  if (attachments.length === 0) attachments.push(...collectAttachmentRefs(userBlocks));
  if (text === '' && attachments.length === 0) return null;
  return { text, attachments };
}

/** 精确获取某一轮的原始提示词（保留完整的 @[标题](dsh-session:...) 会话引用） */
export async function getTurnOriginalPrompt({ home, sessionId, turn }) {
  const content = await getTurnContentParts({ home, sessionId, turn });
  if (content === null || content.text === '') return null;
  return content.text;
}

/** 单次可携带的附件字节上限（超过时明确报错，避免把巨型文件读进内存）。 */
export const MAX_CARRIED_ATTACHMENT_BYTES = 48 * 1024 * 1024;

/** 附件 id 归一化成 sha256（不合法返回 null）。 */
export function attachmentSha256(attachmentId) {
  const raw = typeof attachmentId === 'string' ? attachmentId.trim() : '';
  const sha = raw.startsWith('sha256:') ? raw.slice('sha256:'.length) : raw;
  return /^[0-9a-f]{64}$/.test(sha) ? sha : null;
}

/** 只接受单段文件名（拒绝路径分隔符与空名），用于原样文件库的目录定位。 */
function safeAttachmentFileName(name) {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (trimmed === '' || trimmed === '.' || trimmed === '..') return null;
  if (/[\/\\\u0000]/.test(trimmed)) return null;
  return trimmed;
}

/**
 * 读取一个附件在内容寻址库里的原始字节（图片：objects/，原样文件：files/ 或 file-objects/）。
 * 只读、只命中本 home 的附件库；找不到返回 null。
 */
export function readAttachmentBytes(home, attachmentId, nameHint) {
  const sha = attachmentSha256(attachmentId);
  if (sha === null) return null;
  const root = join(home, 'attachments', 'v1');
  const objectPath = join(root, 'objects', sha.slice(0, 2), sha);
  if (existsSync(objectPath)) return readFileSync(objectPath);
  const fileDir = join(root, 'files', sha.slice(0, 2), sha);
  if (existsSync(fileDir)) {
    const hint = safeAttachmentFileName(nameHint);
    if (hint !== null && existsSync(join(fileDir, hint))) return readFileSync(join(fileDir, hint));
    try {
      const entries = readdirSync(fileDir);
      if (entries.length === 1) return readFileSync(join(fileDir, entries[0]));
    } catch {}
  }
  const fileObjectPath = join(root, 'file-objects', sha.slice(0, 2), sha);
  if (existsSync(fileObjectPath)) return readFileSync(fileObjectPath);
  return null;
}

/** 嗅探栅格图片类型；不是可识别的图片返回 undefined。 */
export function sniffImageMediaType(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 12) return undefined;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (bytes.subarray(0, 3).toString('ascii') === 'GIF') return 'image/gif';
  return undefined;
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

  // 4. Turn boundary resolution for Prompt Edit & Fork Rerun
  ctx.effect(() => webServer.register({
    kind: 'exact',
    path: '/dsh-turn-bookmarks/turn-boundary',
    handler: async (req, res) => {
      if (req.method !== 'GET') {
        res.setHeader('allow', 'GET')
        return sendJson(res, 405, { ok: false, error: 'method not allowed' })
      }
      const url = new URL(req.url, 'http://127.0.0.1')
      const sid = (url.searchParams.get('sessionId') || '').trim()
      const turn = parseInt(url.searchParams.get('turn') || '', 10)
      if (!sid || !Number.isSafeInteger(turn) || turn <= 0) {
        return sendJson(res, 400, { ok: false, error: 'invalid sessionId or turn' })
      }
      try {
        const atSeq = await getTurnBoundarySeq({ home: resolveDshHome(), sessionId: sid, turn })
        return sendJson(res, 200, { ok: true, sessionId: sid, turn, atSeq })
      } catch (err) {
        return sendJson(res, 500, { ok: false, error: err.message })
      }
    },
  }), 'dsh-turn-bookmarks: turn-boundary')

  // 5. Original prompt resolution for Prompt Edit & Fork Rerun (preserving session references)
  ctx.effect(() => webServer.register({
    kind: 'exact',
    path: '/dsh-turn-bookmarks/turn-prompt',
    handler: async (req, res) => {
      if (req.method !== 'GET') {
        res.setHeader('allow', 'GET');
        return sendJson(res, 405, { ok: false, error: 'method not allowed' });
      }
      const url = new URL(req.url, 'http://127.0.0.1');
      const sid = (url.searchParams.get('sessionId') || '').trim();
      const turn = parseInt(url.searchParams.get('turn') || '', 10);
      if (!sid || !Number.isSafeInteger(turn) || turn <= 0) {
        return sendJson(res, 400, { ok: false, error: 'invalid sessionId or turn' });
      }
      try {
        const prompt = await getTurnOriginalPrompt({ home: resolveDshHome(), sessionId: sid, turn });
        return sendJson(res, 200, { ok: true, sessionId: sid, turn, prompt });
      } catch (err) {
        return sendJson(res, 500, { ok: false, error: err.message });
      }
    },
  }), 'dsh-turn-bookmarks: turn-prompt');

  // 6. 某一轮用户消息的完整内容（文本 + 附件引用）——Prompt Edit & Fork Rerun 的宿主侧兜底
  ctx.effect(() => webServer.register({
    kind: 'exact',
    path: '/dsh-turn-bookmarks/turn-content',
    handler: async (req, res) => {
      if (req.method !== 'GET') {
        res.setHeader('allow', 'GET')
        return sendJson(res, 405, { ok: false, error: 'method not allowed' })
      }
      const url = new URL(req.url, 'http://127.0.0.1')
      const sid = (url.searchParams.get('sessionId') || '').trim()
      const turn = parseInt(url.searchParams.get('turn') || '', 10)
      if (!sid || !Number.isSafeInteger(turn) || turn <= 0) {
        return sendJson(res, 400, { ok: false, error: 'invalid sessionId or turn' })
      }
      try {
        const content = await getTurnContentParts({ home: resolveDshHome(), sessionId: sid, turn })
        if (content === null) {
          return sendJson(res, 404, { ok: false, error: 'turn content not found' })
        }
        return sendJson(res, 200, { ok: true, sessionId: sid, turn, prompt: content.text, attachments: content.attachments })
      } catch (err) {
        return sendJson(res, 500, { ok: false, error: err.message })
      }
    },
  }), 'dsh-turn-bookmarks: turn-content')

  // 7. 附件字节读取——Prompt Edit & Fork Rerun 时把原消息的图片/附件一并带进新分支
  ctx.effect(() => webServer.register({
    kind: 'exact',
    path: '/dsh-turn-bookmarks/attachment',
    handler: async (req, res) => {
      if (req.method !== 'GET') {
        res.setHeader('allow', 'GET')
        return sendJson(res, 405, { ok: false, error: 'method not allowed' })
      }
      const url = new URL(req.url, 'http://127.0.0.1')
      const attachmentId = (url.searchParams.get('attachmentId') || '').trim()
      const nameHint = url.searchParams.get('name') || ''
      if (attachmentSha256(attachmentId) === null) {
        return sendJson(res, 400, { ok: false, error: 'invalid attachmentId' })
      }
      try {
        const bytes = readAttachmentBytes(resolveDshHome(), attachmentId, nameHint)
        if (bytes === null) {
          return sendJson(res, 404, { ok: false, error: 'attachment is not present in the local store' })
        }
        if (bytes.length > MAX_CARRIED_ATTACHMENT_BYTES) {
          return sendJson(res, 413, {
            ok: false,
            error: `attachment too large to carry automatically (${bytes.length} bytes)`,
          })
        }
        const mediaType = sniffImageMediaType(bytes)
        return sendJson(res, 200, {
          ok: true,
          attachmentId,
          name: nameHint,
          bytes: bytes.length,
          ...(mediaType === undefined ? {} : { mediaType }),
          data: bytes.toString('base64'),
        })
      } catch (err) {
        return sendJson(res, 500, { ok: false, error: err.message })
      }
    },
  }), 'dsh-turn-bookmarks: attachment')
}
