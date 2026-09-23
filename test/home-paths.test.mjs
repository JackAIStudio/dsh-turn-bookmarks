// harness home 解析回归测试 —— 防止「桌面端收藏写进 3080 实例目录」再犯。
//
// 背景（2026-09-23）：index.js 曾把路径写死成 ~/.dsh/turn-bookmarks.json 与
// ~/.dsh/storages/sessions-fts.db。但同一台机器上可以并存多个 DSH 实例：
//   · `dsh web --port 3080`            → DSH_HOME 未设 → ~/.dsh
//   · JackDSH 桌面端（3180）            → DSH_HOME=~/Library/Application Support/jackdsh/dsh-data
// 结果桌面端点星写进了 3080 的数据目录，会话内搜索也去查了另一个实例的索引。
//
// 运行： node test/home-paths.test.mjs

import { strict as assert } from 'node:assert'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { resolveDshHome, bookmarksPath, ftsDbPath } from '../index.js'

let failed = 0
const check = (label, fn) => {
  try {
    fn()
    console.log(`✅ ${label}`)
  } catch (err) {
    failed++
    console.log(`❌ ${label}\n   ${err.message}`)
  }
}

const APP_HOME = join(homedir(), 'Library', 'Application Support', 'jackdsh', 'dsh-data')
const saved = process.env.DSH_HOME

check('DSH_HOME 优先（桌面端场景）', () => {
  process.env.DSH_HOME = APP_HOME
  assert.equal(resolveDshHome(), APP_HOME)
  assert.equal(bookmarksPath(), join(APP_HOME, 'turn-bookmarks.json'))
  assert.equal(ftsDbPath(), join(APP_HOME, 'storages', 'sessions-fts.db'))
})

check('DSH_HOME 缺失 → 回落 ~/.dsh（3080 场景）', () => {
  delete process.env.DSH_HOME
  assert.equal(resolveDshHome(), join(homedir(), '.dsh'))
  assert.equal(bookmarksPath(), join(homedir(), '.dsh', 'turn-bookmarks.json'))
})

check('DSH_HOME 为空串 → 仍回落 ~/.dsh', () => {
  process.env.DSH_HOME = '   '
  assert.equal(resolveDshHome(), join(homedir(), '.dsh'))
})

check('DSH_HOME 支持 ~ 展开并去空格', () => {
  process.env.DSH_HOME = '  ~/custom-dsh-home  '
  assert.equal(resolveDshHome(), join(homedir(), 'custom-dsh-home'))
})

check('显式传入 env 也能解析（便于宿主测试）', () => {
  assert.equal(resolveDshHome({ DSH_HOME: APP_HOME }), APP_HOME)
  assert.equal(resolveDshHome({}), join(homedir(), '.dsh'))
})

if (saved === undefined) delete process.env.DSH_HOME
else process.env.DSH_HOME = saved

console.log(failed === 0 ? '\n全部通过' : `\n${failed} 项失败`)
process.exit(failed === 0 ? 0 : 1)
