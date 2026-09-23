// 旧路径搬家回归测试 —— 桌面端收藏曾写进 ~/.dsh（默认实例的数据目录），
// 修复路径后必须把这些条目搬回本 home，同时不碰另一个实例的收藏。
//
// 运行： node test/legacy-migration.test.mjs

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { migrateLegacyBookmarks, sessionsInHome } from '../index.js'

let failed = 0
const check = (label, cond, extra = '') => {
  if (!cond) failed++
  console.log(`${cond ? '✅' : '❌'} ${label}${extra ? '  ' + extra : ''}`)
}
const read = (p) => JSON.parse(readFileSync(p, 'utf8'))

const root = mkdtempSync(join(tmpdir(), 'tb-migrate-'))
const newHome = join(root, 'jackdsh-dsh-data')
const oldHome = join(root, 'dot-dsh')
const APP_SID = 'session-925a8e5a-1eae-46b0-9bd7-a8adeceac262'
const OTHER_SID = 'session-613035e6-1ec5-4396-b548-530c1e07beed'

// 新 home 里只存在 APP_SID 这个会话；旧文件里两个会话的收藏都有
mkdirSync(join(newHome, 'sessions', '--Users-jkw-Documents-demo--', APP_SID), { recursive: true })
mkdirSync(oldHome, { recursive: true })
writeFileSync(
  join(oldHome, 'turn-bookmarks.json'),
  JSON.stringify({ [APP_SID]: [25, 27, 38], [OTHER_SID]: [2] }, null, 2),
)

check('sessionsInHome 只认本 home 的会话', () => {
  const ids = sessionsInHome(newHome)
  return ids.has(APP_SID) && !ids.has(OTHER_SID)
})

// 1. 搬家
const r1 = migrateLegacyBookmarks({ home: newHome, legacyHome: oldHome })
check('搬家成功', r1.migrated === 1, JSON.stringify(r1))
check('本 home 拿到收藏', JSON.stringify(read(join(newHome, 'turn-bookmarks.json'))[APP_SID]) === '[25,27,38]')
check('旧文件里只留另一个实例的', JSON.stringify(Object.keys(read(join(oldHome, 'turn-bookmarks.json')))) === JSON.stringify([OTHER_SID]))

// 2. 幂等
const r2 = migrateLegacyBookmarks({ home: newHome, legacyHome: oldHome })
check('重复执行无副作用', r2.migrated === 0 && r2.skipped === 'nothing-mine' && r2.migrated === 0, JSON.stringify(r2))
check('旧文件仍是另一个实例的收藏', JSON.stringify(read(join(oldHome, 'turn-bookmarks.json'))[OTHER_SID]) === '[2]')

// 3. 并集（新 home 已有本地收藏时不覆盖）
writeFileSync(join(newHome, 'turn-bookmarks.json'), JSON.stringify({ [APP_SID]: [7] }, null, 2))
writeFileSync(join(oldHome, 'turn-bookmarks.json'), JSON.stringify({ [APP_SID]: [25], [OTHER_SID]: [2] }, null, 2))
migrateLegacyBookmarks({ home: newHome, legacyHome: oldHome })
check('并集而非覆盖', JSON.stringify(read(join(newHome, 'turn-bookmarks.json'))[APP_SID]) === '[7,25]')

// 4. 同一个 home（3080 实例）→ 什么都不做
const r4 = migrateLegacyBookmarks({ home: oldHome, legacyHome: oldHome })
check('同 home 直接跳过', r4.skipped === 'same-home' && read(join(oldHome, 'turn-bookmarks.json'))[OTHER_SID][0] === 2)

// 5. 没有旧文件
const emptyHome = join(root, 'fresh-home')
mkdirSync(join(emptyHome, 'sessions'), { recursive: true })
const r5 = migrateLegacyBookmarks({ home: emptyHome, legacyHome: join(root, 'nowhere') })
check('无旧文件时跳过', r5.skipped === 'no-legacy-file')

rmSync(root, { recursive: true, force: true })
console.log(failed === 0 ? '\n全部通过' : `\n${failed} 项失败`)
process.exit(failed === 0 ? 0 : 1)
