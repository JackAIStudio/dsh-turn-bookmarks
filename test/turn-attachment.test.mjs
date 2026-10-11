import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  apply,
  attachmentSha256,
  getTurnContentParts,
  readAttachmentBytes,
  sniffImageMediaType,
} from '../index.js'

const IMAGE_SHA = 'a'.repeat(64)
const FILE_SHA = 'b'.repeat(64)
const IMAGE_BYTES = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')
const FILE_BYTES = Buffer.from('%PDF-1.4 fake report bytes', 'utf8')

function buildHome() {
  const home = mkdtempSync(join(tmpdir(), 'dsh-tb-attachment-'))
  const store = join(home, 'attachments', 'v1')
  mkdirSync(join(store, 'objects', IMAGE_SHA.slice(0, 2)), { recursive: true })
  writeFileSync(join(store, 'objects', IMAGE_SHA.slice(0, 2), IMAGE_SHA), IMAGE_BYTES)
  mkdirSync(join(store, 'files', FILE_SHA.slice(0, 2), FILE_SHA), { recursive: true })
  writeFileSync(join(store, 'files', FILE_SHA.slice(0, 2), FILE_SHA, 'report.pdf'), FILE_BYTES)
  return home
}

function buildSessionLog(home, sessionId) {
  const dir = join(home, 'sessions', 'ws-default', sessionId)
  mkdirSync(dir, { recursive: true })
  const events = [
    { type: 'session/start', seq: 0 },
    {
      type: 'agent/inbox/spliced',
      seq: 1,
      data: {
        target: 'next-turn',
        inserted: [
          {
            content: [
              { type: 'image', attachment: { attachmentId: `sha256:${IMAGE_SHA}`, mediaType: 'image/png', bytes: IMAGE_BYTES.length, width: 3024, height: 1740, name: 'image.png' } },
              { type: 'file', attachment: { attachmentId: `sha256:${FILE_SHA}`, name: 'report.pdf', bytes: FILE_BYTES.length } },
              { type: 'text', text: '帮我看看这两张图 @[原则探讨](dsh-session:InNlc3Npb24tMTIzIg)' },
            ],
          },
        ],
      },
    },
    { type: 'turn/start', seq: 2, data: { turn: 1 } },
    { type: 'agent/inbox/spliced', seq: 2.5, data: { target: 'next-turn', removedCount: 1, inserted: [] } },
    {
      type: 'user/message',
      seq: 3,
      data: {
        content: [
          { type: 'image', attachment: { attachmentId: `sha256:${IMAGE_SHA}`, mediaType: 'image/png', bytes: IMAGE_BYTES.length, width: 3024, height: 1740 } },
          { type: 'file', attachment: { attachmentId: `sha256:${FILE_SHA}`, name: 'report.pdf', bytes: FILE_BYTES.length } },
          { type: 'text', text: '帮我看看这两张图' },
        ],
      },
    },
    { type: 'turn/end', seq: 4, data: { turn: 1, reason: { kind: 'completed' } } },
    { type: 'turn/start', seq: 5, data: { turn: 2 } },
    { type: 'user/message', seq: 6, data: { content: [{ type: 'text', text: '第二轮纯文本' }] } },
    { type: 'turn/end', seq: 7, data: { turn: 2, reason: { kind: 'completed' } } },
  ]
  writeFileSync(join(dir, 'session.jsonl'), events.map((event) => JSON.stringify(event)).join('\n') + '\n', 'utf8')
}

function makeResponse() {
  return {
    statusCode: null,
    headers: {},
    body: '',
    writeHead(code, headers) {
      this.statusCode = code
      Object.assign(this.headers, headers || {})
    },
    end(body) {
      this.body = body || ''
    },
  }
}

function collectRoutes() {
  const routes = new Map()
  const webServer = {
    register(entry) {
      routes.set(entry.path, entry.handler)
      return () => {}
    },
  }
  const ctx = {
    get: (name) => (name === 'webServer' ? webServer : undefined),
    effect: (fn) => {
      const dispose = fn()
      return typeof dispose === 'function' ? dispose : () => {}
    },
  }
  apply(ctx)
  return routes
}

test('getTurnContentParts returns prompt text plus ordered attachment refs', async () => {
  const home = buildHome()
  const sessionId = 'session-attachment-1'
  buildSessionLog(home, sessionId)

  const turn1 = await getTurnContentParts({ home, sessionId, turn: 1 })
  assert.ok(turn1)
  assert.equal(turn1.text, '帮我看看这两张图 @[原则探讨](dsh-session:InNlc3Npb24tMTIzIg)')
  assert.equal(turn1.attachments.length, 2)
  assert.deepEqual(turn1.attachments.map((item) => item.kind), ['image', 'file'])
  assert.equal(turn1.attachments[0].attachmentId, `sha256:${IMAGE_SHA}`)
  assert.equal(turn1.attachments[1].name, 'report.pdf')

  const turn2 = await getTurnContentParts({ home, sessionId, turn: 2 })
  assert.ok(turn2)
  assert.equal(turn2.text, '第二轮纯文本')
  assert.deepEqual(turn2.attachments, [])

  const turn3 = await getTurnContentParts({ home, sessionId, turn: 3 })
  assert.equal(turn3, null)

  rmSync(home, { recursive: true, force: true })
})

test('readAttachmentBytes resolves images and verbatim files from the content-addressed store', () => {
  const home = buildHome()

  const image = readAttachmentBytes(home, `sha256:${IMAGE_SHA}`, 'image.png')
  assert.ok(image)
  assert.equal(image.equals(IMAGE_BYTES), true)

  const file = readAttachmentBytes(home, `sha256:${FILE_SHA}`, 'report.pdf')
  assert.ok(file)
  assert.equal(file.equals(FILE_BYTES), true)

  // 名字缺失时目录里唯一的别名仍可命中
  const fileWithoutName = readAttachmentBytes(home, `sha256:${FILE_SHA}`, '')
  assert.ok(fileWithoutName)
  assert.equal(fileWithoutName.equals(FILE_BYTES), true)

  assert.equal(readAttachmentBytes(home, 'sha256:not-a-hash', 'x'), null)
  assert.equal(readAttachmentBytes(home, `sha256:${'c'.repeat(64)}`, 'x'), null)

  rmSync(home, { recursive: true, force: true })
})

test('attachmentSha256 normalizes ids and rejects junk', () => {
  assert.equal(attachmentSha256(`sha256:${IMAGE_SHA}`), IMAGE_SHA)
  assert.equal(attachmentSha256(IMAGE_SHA), IMAGE_SHA)
  assert.equal(attachmentSha256('sha256:zzz'), null)
  assert.equal(attachmentSha256(undefined), null)
})

test('sniffImageMediaType identifies the accepted rasters', () => {
  assert.equal(sniffImageMediaType(IMAGE_BYTES), 'image/png')
  assert.equal(sniffImageMediaType(Buffer.from('524946460000000057454250', 'hex')), 'image/webp')
  assert.equal(sniffImageMediaType(FILE_BYTES), undefined)
  assert.equal(sniffImageMediaType(Buffer.alloc(0)), undefined)
})

test('host routes expose turn content and attachment bytes', async () => {
  const home = buildHome()
  const sessionId = 'session-attachment-2'
  buildSessionLog(home, sessionId)
  const previousHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    const routes = collectRoutes()
    assert.ok(routes.has('/dsh-turn-bookmarks/turn-content'))
    assert.ok(routes.has('/dsh-turn-bookmarks/attachment'))

    const contentRes = makeResponse()
    await routes.get('/dsh-turn-bookmarks/turn-content')(
      { method: 'GET', url: `/dsh-turn-bookmarks/turn-content?sessionId=${sessionId}&turn=1` },
      contentRes,
    )
    assert.equal(contentRes.statusCode, 200)
    const content = JSON.parse(contentRes.body)
    assert.equal(content.ok, true)
    assert.equal(content.attachments.length, 2)
    assert.equal(content.prompt.includes('帮我看看这两张图'), true)

    const bytesRes = makeResponse()
    await routes.get('/dsh-turn-bookmarks/attachment')(
      { method: 'GET', url: `/dsh-turn-bookmarks/attachment?attachmentId=${encodeURIComponent(`sha256:${IMAGE_SHA}`)}&name=image.png` },
      bytesRes,
    )
    assert.equal(bytesRes.statusCode, 200)
    const payload = JSON.parse(bytesRes.body)
    assert.equal(payload.ok, true)
    assert.equal(payload.mediaType, 'image/png')
    assert.equal(Buffer.from(payload.data, 'base64').equals(IMAGE_BYTES), true)

    const fileRes = makeResponse()
    await routes.get('/dsh-turn-bookmarks/attachment')(
      { method: 'GET', url: `/dsh-turn-bookmarks/attachment?attachmentId=${encodeURIComponent(`sha256:${FILE_SHA}`)}&name=report.pdf` },
      fileRes,
    )
    assert.equal(fileRes.statusCode, 200)
    const filePayload = JSON.parse(fileRes.body)
    assert.equal(Buffer.from(filePayload.data, 'base64').equals(FILE_BYTES), true)

    const badRes = makeResponse()
    await routes.get('/dsh-turn-bookmarks/attachment')(
      { method: 'GET', url: '/dsh-turn-bookmarks/attachment?attachmentId=sha256:nope' },
      badRes,
    )
    assert.equal(badRes.statusCode, 400)

    const missingRes = makeResponse()
    await routes.get('/dsh-turn-bookmarks/attachment')(
      { method: 'GET', url: `/dsh-turn-bookmarks/attachment?attachmentId=sha256:${'c'.repeat(64)}` },
      missingRes,
    )
    assert.equal(missingRes.statusCode, 404)
  } finally {
    if (previousHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousHome
    rmSync(home, { recursive: true, force: true })
  }
})
