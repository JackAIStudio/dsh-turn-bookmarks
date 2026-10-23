// 单实例回归测试 —— 防止顶部搜索按钮被热重载叠成一片。
//
// 背景（2026-10-23）：DSH 每次热重建插件 bundle 都会重新执行 apply，旧实例的
// tick 定时器还在跑、DOM 还挂在 header 上，新实例又插一套搜索框，页面上就出现
// 十几排一模一样的放大镜。
//
// 修复：apply 开头把上一个实例注册表里的所有实例 dispose 掉，并把残留的搜索栏
// 标记为 stale（CSS 隐藏）。用隐藏而不是删除，是因为旧实例的 150ms 防抖回调发现
// 自己的栏不在页面上会立刻重建一个，删掉反而会被唤醒。
// 每个实例的 tick / runEnhance 发现自己是孤儿时也会自我清理。
//
// 运行： node --test test/singleton-guard.test.mjs

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, '..', 'client.js'), 'utf8')

const INSTANCE_KEY = '__dshTurnBookmarksInstance'

/** 最小 DOM：插件只会用到这几个查询、setAttribute、remove。 */
function makeDom(initialNodes = []) {
  return {
    nodes: [...initialNodes],
    querySelectorAll(selector) {
      const classes = selector.split(',').map((part) => part.trim().replace(/^\./, ''))
      return this.nodes.filter((node) => classes.includes(node.className))
    },
  }
}

function makeBar(className = 'dsh-tb-search-container') {
  const attrs = {}
  return {
    className,
    removed: false,
    setAttribute(name, value) { attrs[name] = value },
    getAttribute(name) { return attrs[name] ?? null },
    remove() { this.removed = true },
  }
}

/** 抽取 apply 开头到首次使用 sessionsRef 之前的清理段，独立执行。 */
function runGuard(source, window, document) {
  const start = source.indexOf('const instanceKey')
  const end = source.indexOf("const sessionsRef")
  assert.ok(start > 0 && end > start, 'client.js 里找不到单实例守卫段')
  const body = source.slice(start, end)
  new Function('window', 'document', `${body}\nreturn { instance, instanceList }`)(window, document)
}

test('同一页面重复执行 apply 会停掉旧实例并封掉残留搜索框', () => {
  const staleBar = makeBar()
  const stalePopover = makeBar('dsh-tb-popover')
  let oldDisposed = 0
  const oldInstance = { dispose: () => { oldDisposed += 1 } }

  const window = { [INSTANCE_KEY]: [oldInstance] }
  const document = makeDom([staleBar, stalePopover])

  runGuard(src, window, document)

  assert.equal(oldDisposed, 1, '旧实例必须被 dispose')
  assert.equal(staleBar.getAttribute('data-dsh-tb-stale'), '1', '旧搜索框必须被标记为隐藏')
  assert.equal(stalePopover.removed, true, '旧悬浮层必须被移除')
  assert.equal(window[INSTANCE_KEY].length, 1, '注册表里只应留下新实例')
})

test('连续热重建十次，注册表和 DOM 都只保留最后一份', () => {
  const window = {}
  const document = makeDom()

  for (let i = 0; i < 10; i++) {
    // 1. 新实例执行 apply：先清掉上一轮遗留的搜索框
    runGuard(src, window, document)
    // 2. 新实例随后挂载自己的搜索框
    document.nodes.push(makeBar())
  }

  const visible = document.nodes.filter((node) => node.getAttribute('data-dsh-tb-stale') !== '1')
  assert.equal(visible.length, 1, '只有最后一份搜索框可见')
  assert.equal(window[INSTANCE_KEY].length, 1, '注册表里只应剩一个实例')
})

test('新实例接管时，旧实例的 tick 会自我退场', () => {
  assert.match(src, /!alive/, 'tick 必须检查实例是否仍被登记')
  assert.match(src, /instance\.dispose\?\.\(\)/, '孤儿实例必须自行清理')
  assert.match(src, /if \(enhanceTimer\) clearTimeout\(enhanceTimer\)/, '孤儿实例必须先取消防抖回调')
})
