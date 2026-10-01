import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { getTurnBoundarySeq } from '../index.js'

test('getTurnBoundarySeq correctly resolves boundaries from uncompressed jsonl', async () => {
  const tempHome = mkdtempSync(join(tmpdir(), 'dsh-tb-test-'))
  const sid = 'session-test-123'
  const sDir = join(tempHome, 'sessions', 'ws-default', sid)
  mkdirSync(sDir, { recursive: true })

  const events = [
    { type: 'session/start', seq: 0 },
    { type: 'config/preset', seq: 1 },
    { type: 'turn/start', seq: 2, data: { turn: 1 } },
    { type: 'user/message', seq: 3, data: { turn: 1 } },
    { type: 'assistant/message', seq: 4, data: { turn: 1 } },
    { type: 'turn/end', seq: 5, data: { turn: 1, reason: { kind: 'completed' } } },
    { type: 'turn/start', seq: 6, data: { turn: 2 } },
    { type: 'user/message', seq: 7, data: { turn: 2 } },
    { type: 'assistant/message', seq: 8, data: { turn: 2 } },
    { type: 'turn/end', seq: 9, data: { turn: 2, reason: { kind: 'completed' } } },
  ]

  const jsonl = events.map((e) => JSON.stringify(e)).join('\n') + '\n'
  writeFileSync(join(sDir, 'session.jsonl'), jsonl, 'utf8')

  // Turn 1 boundary should be before turn 1 started (seq 1)
  const b1 = await getTurnBoundarySeq({ home: tempHome, sessionId: sid, turn: 1 })
  assert.equal(b1, 1)

  // Turn 2 boundary should be end of turn 1 (seq 5)
  const b2 = await getTurnBoundarySeq({ home: tempHome, sessionId: sid, turn: 2 })
  assert.equal(b2, 5)

  // Turn 3 boundary should be end of turn 2 (seq 9)
  const b3 = await getTurnBoundarySeq({ home: tempHome, sessionId: sid, turn: 3 })
  assert.equal(b3, 9)

  // Non-existent turn 4 should return null
  const b4 = await getTurnBoundarySeq({ home: tempHome, sessionId: sid, turn: 4 })
  assert.equal(b4, null)

  rmSync(tempHome, { recursive: true, force: true })
})
