import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { getTurnOriginalPrompt } from '../index.js'

test('getTurnOriginalPrompt correctly extracts prompt with session references', async () => {
  const tempHome = mkdtempSync(join(tmpdir(), 'dsh-tb-prompt-test-'))
  const sid = 'session-test-prompt-123'
  const sDir = join(tempHome, 'sessions', 'ws-default', sid)
  mkdirSync(sDir, { recursive: true })

  const rawPromptTurn1 = '@[字幕对齐与工具宣传 (2)](dsh-session:InNlc3Npb24tMTIzIg) 测试提示词 @[原则探讨](dsh-session:InNlc3Npb24tNDU2Ig)'
  const rawPromptTurn2 = '第二轮普通提示词无引用'

  const events = [
    { type: 'session/start', seq: 0 },
    { type: 'agent/inbox/spliced', seq: 1, data: { target: 'next-turn', inserted: [{ content: [{ type: 'text', text: rawPromptTurn1 }] }] } },
    { type: 'turn/start', seq: 2, data: { turn: 1 } },
    { type: 'agent/inbox/spliced', seq: 3, data: { target: 'next-turn', removedCount: 1, inserted: [] } },
    { type: 'user/message', seq: 4, data: { content: [{ type: 'text', text: '@字幕对齐与工具宣传 (2) 测试提示词 @原则探讨' }] } },
    { type: 'assistant/message', seq: 5, data: { turn: 1 } },
    { type: 'turn/end', seq: 6, data: { turn: 1, reason: { kind: 'completed' } } },
    { type: 'agent/inbox/spliced', seq: 7, data: { target: 'next-turn', inserted: [{ content: [{ type: 'text', text: rawPromptTurn2 }] }] } },
    { type: 'turn/start', seq: 8, data: { turn: 2 } },
    { type: 'agent/inbox/spliced', seq: 9, data: { target: 'next-turn', removedCount: 1, inserted: [] } },
    { type: 'user/message', seq: 10, data: { content: [{ type: 'text', text: rawPromptTurn2 }] } },
    { type: 'turn/end', seq: 11, data: { turn: 2, reason: { kind: 'completed' } } },
  ]

  const jsonl = events.map((e) => JSON.stringify(e)).join('\n') + '\n'
  writeFileSync(join(sDir, 'session.jsonl'), jsonl, 'utf8')

  const p1 = await getTurnOriginalPrompt({ home: tempHome, sessionId: sid, turn: 1 })
  assert.equal(p1, rawPromptTurn1)

  const p2 = await getTurnOriginalPrompt({ home: tempHome, sessionId: sid, turn: 2 })
  assert.equal(p2, rawPromptTurn2)

  const p3 = await getTurnOriginalPrompt({ home: tempHome, sessionId: sid, turn: 3 })
  assert.equal(p3, null)

  rmSync(tempHome, { recursive: true, force: true })
})

