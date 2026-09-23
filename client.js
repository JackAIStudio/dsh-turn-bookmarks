// dsh-turn-bookmarks — client half.
//
// Dual-Rail Turn Enhancer & In-Session Search:
// 1. Dual-Rail Architecture (双轨架构):
//    - Right Native Rail: Macro overview of all turns, starred turns highlight in amber-gold.
//    - Left Bookmark Rail: Dedicated compact column displaying ONLY starred turns (★ T1, ★ T2). Zero misclicks!
// 2. Independent Controlled Popover (方案B) with 280ms hover-grace-period & interactive lock.
// 3. Robust In-Session Full-Text Search (dual-drive precision centering, uncollapsing & active pulse).
// 4. Streamlined Header: Redundant filter switches removed; pure search toggle only.

window.__ModuleLoader__.load({
  id: 'dsh-turn-bookmarks',
  factory: (require) => {
    const module = { exports: {} }

    const CSS_ID = 'dsh-turn-bookmarks/style.css'
    const STORAGE_KEY = 'dsh_turn_bookmarks_v1'

    const STYLES = `
/* ==================== 1. Suppress Native Fragile Tooltips ==================== */
/* 彻底隐藏官方易闪退且无交互能力的原生 tooltip，由插件独立浮层接管 */
[class*="previewPrompt"],
nav[aria-label*="轮次"] [role="tooltip"],
nav[aria-label*="turn" i] [role="tooltip"],
[class*="_preview"]:has([class*="previewPrompt"]) {
  display: none !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

/* ==================== 2. Independent Controlled Popover (方案B) ==================== */
.dsh-tb-popover {
  position: fixed !important;
  z-index: 9999 !important;
  width: 320px !important;
  max-width: calc(100vw - 80px) !important;
  background: var(--dsw-alias-surface-overlay, #ffffff) !important;
  border: 1px solid var(--dsw-alias-border-l4, rgba(128, 128, 128, 0.22)) !important;
  border-radius: 12px !important;
  box-shadow: 0 10px 30px -4px rgba(0, 0, 0, 0.16), 0 4px 12px -2px rgba(0, 0, 0, 0.08) !important;
  padding: 10px 12px !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  pointer-events: auto !important;
  user-select: text !important;
  opacity: 0;
  transform: translateX(6px) scale(0.98);
  transition: opacity 0.15s cubic-bezier(0.16, 1, 0.3, 1), transform 0.15s cubic-bezier(0.16, 1, 0.3, 1) !important;
  visibility: hidden;
  box-sizing: border-box !important;
}

.dsh-tb-popover.visible {
  opacity: 1 !important;
  transform: translateX(0) scale(1) !important;
  visibility: visible !important;
}

/* 隐形交互安全桥接层：根据弹出方向动态支持左右两侧，填平 rail 与浮层间隙 */
.dsh-tb-popover[data-side="left"]::after {
  content: "" !important;
  position: absolute !important;
  top: -10px !important;
  bottom: -10px !important;
  right: -24px !important;
  width: 32px !important;
  pointer-events: auto !important;
  background: transparent !important;
}

.dsh-tb-popover[data-side="right"]::after {
  content: "" !important;
  position: absolute !important;
  top: -10px !important;
  bottom: -10px !important;
  left: -24px !important;
  width: 32px !important;
  pointer-events: auto !important;
  background: transparent !important;
}

[data-ds-dark-theme] .dsh-tb-popover,
[data-theme="dark"] .dsh-tb-popover,
html.dark .dsh-tb-popover {
  background: #1e2430 !important;
  border-color: rgba(255, 255, 255, 0.14) !important;
  box-shadow: 0 14px 36px -4px rgba(0, 0, 0, 0.45), 0 4px 16px -2px rgba(0, 0, 0, 0.3) !important;
}

.dsh-tb-popover-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  margin-bottom: 8px !important;
  padding-bottom: 6px !important;
  border-bottom: 1px solid var(--dsw-alias-border-l4, rgba(128, 128, 128, 0.15)) !important;
}

.dsh-tb-turn-pill {
  font-size: 11px !important;
  font-weight: 600 !important;
  letter-spacing: 0.3px !important;
  padding: 2px 7px !important;
  border-radius: 12px !important;
  background: var(--dsw-alias-interactive-bg-hover, rgba(37, 99, 235, 0.1)) !important;
  color: var(--dsw-alias-state-business-primary, #2563eb) !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
}

.dsh-tb-card-actions {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
}

.dsh-tb-card-btn {
  border: none !important;
  background: transparent !important;
  cursor: pointer !important;
  padding: 3px 8px !important;
  border-radius: 6px !important;
  font-size: 11.5px !important;
  color: var(--dsw-alias-label-secondary, #6e7781) !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  line-height: 1 !important;
  transition: all 0.15s ease !important;
}

.dsh-tb-card-btn:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.15)) !important;
  color: var(--dsw-alias-label-primary, currentColor) !important;
}

.dsh-tb-card-btn.dsh-tb-starred {
  color: #d97706 !important;
  background: rgba(245, 158, 11, 0.14) !important;
  font-weight: 600 !important;
}

.dsh-tb-card-btn.dsh-tb-starred svg {
  fill: #f59e0b !important;
  stroke: #d97706 !important;
}

.dsh-tb-popover-body {
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important;
  font-size: 12px !important;
  line-height: 1.45 !important;
}

.dsh-tb-popover-row {
  display: flex !important;
  align-items: flex-start !important;
  gap: 6px !important;
}

.dsh-tb-popover-tag {
  font-size: 10px !important;
  font-weight: 600 !important;
  padding: 1px 5px !important;
  border-radius: 4px !important;
  background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.12)) !important;
  color: var(--dsw-alias-label-secondary, #6e7781) !important;
  flex: none !important;
  line-height: 1.4 !important;
  margin-top: 1px !important;
}

.dsh-tb-popover-text {
  color: var(--dsw-alias-label-primary, #1f2328) !important;
  display: -webkit-box !important;
  -webkit-box-orient: vertical !important;
  overflow: hidden !important;
  word-break: break-word !important;
  margin: 0 !important;
}

.dsh-tb-popover-prompt .dsh-tb-popover-text {
  -webkit-line-clamp: 2 !important;
  font-weight: 500 !important;
}

.dsh-tb-popover-response .dsh-tb-popover-text {
  -webkit-line-clamp: 3 !important;
  color: var(--dsw-alias-label-secondary, #656d76) !important;
}

[data-ds-dark-theme] .dsh-tb-popover-text,
[data-theme="dark"] .dsh-tb-popover-text,
html.dark .dsh-tb-popover-text {
  color: #e6edf3 !important;
}

[data-ds-dark-theme] .dsh-tb-popover-response .dsh-tb-popover-text,
[data-theme="dark"] .dsh-tb-popover-response .dsh-tb-popover-text,
html.dark .dsh-tb-popover-response .dsh-tb-popover-text {
  color: #9ca3af !important;
}

/* ==================== 3. Dual-Rail: Left Bookmark Rail (专属左侧收藏镜像轨 - 位置 A & 形态 1) ==================== */
.dsh-tb-left-rail {
  position: fixed !important;
  z-index: 99 !important;
  width: 44px !important;
  pointer-events: none !important;
  user-select: none !important;
  display: none;
  box-sizing: border-box !important;
  transition: opacity 0.2s ease !important;
}

/* 垂直渐变琥珀金导轨线 (两端优雅淡隐，绝对居中穿过胶囊) */
.dsh-tb-left-rail-guide {
  position: absolute !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  top: 0 !important;
  bottom: 0 !important;
  width: 1.5px !important;
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, rgba(245, 158, 11, 0.55) 12%, rgba(245, 158, 11, 0.55) 88%, rgba(245, 158, 11, 0.05) 100%) !important;
  border-radius: 1px !important;
  pointer-events: none !important;
}

/* 纯数字微型胶囊 (形态 1：无五角星，纯数字加粗，暖金质感) */
.dsh-tb-left-capsule {
  position: absolute !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 20px !important;
  min-width: 32px !important;
  padding: 0 6px !important;
  border-radius: 10px !important;
  background: var(--dsw-alias-surface-overlay, #ffffff) !important;
  border: 1.5px solid #f59e0b !important;
  box-shadow: 0 2px 6px rgba(245, 158, 11, 0.25), 0 1px 2px rgba(0, 0, 0, 0.06) !important;
  color: #d97706 !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  font-variant-numeric: tabular-nums !important;
  cursor: pointer !important;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1) !important;
  line-height: 1 !important;
  z-index: 100 !important;
  pointer-events: auto !important;
  user-select: none !important;
  white-space: nowrap !important;
}

.dsh-tb-left-capsule:hover {
  background: #f59e0b !important;
  color: #ffffff !important;
  transform: translate(-50%, -50%) scale(1.12) !important;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.5) !important;
}

[data-ds-dark-theme] .dsh-tb-left-capsule,
[data-theme="dark"] .dsh-tb-left-capsule,
html.dark .dsh-tb-left-capsule {
  background: #1c212a !important;
  border-color: #fbbf24 !important;
  color: #fbbf24 !important;
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.25) !important;
}

[data-ds-dark-theme] .dsh-tb-left-capsule:hover,
[data-theme="dark"] .dsh-tb-left-capsule:hover,
html.dark .dsh-tb-left-capsule:hover {
  background: #fbbf24 !important;
  color: #0d1117 !important;
  box-shadow: 0 0 14px rgba(251, 191, 36, 0.6) !important;
}

/* In-message turn bookmark star button */
.dsh-tb-msg-star {
  width: calc(28px + var(--dsh-content-font-delta, 0px)) !important;
  height: calc(28px + var(--dsh-content-font-delta, 0px)) !important;
  color: var(--dsw-alias-label-tertiary, #9ca3af) !important;
  cursor: pointer !important;
  background: transparent !important;
  border: none !important;
  border-radius: 28px !important;
  justify-content: center !important;
  align-items: center !important;
  padding: 6px !important;
  display: inline-flex !important;
  transition: all 0.15s ease !important;
}

.dsh-tb-msg-star:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.12)) !important;
  color: #f59e0b !important;
}

.dsh-tb-msg-star.dsh-tb-starred {
  color: #f59e0b !important;
}

.dsh-tb-msg-star.dsh-tb-starred svg {
  fill: #f59e0b !important;
  stroke: #d97706 !important;
}

/* ==================== 4. Dual-Rail: Right Native Rail Highlights ==================== */
/* Starred marks on right rail: clean amber-gold bar, NO messy floating text */
.dsh-tb-mark-starred:before,
[class*="mark"].dsh-tb-mark-starred:before,
[class*="markPosition"].dsh-tb-pos-starred [class*="mark"]:before {
  background: linear-gradient(90deg, #f59e0b, #d97706) !important;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.6) !important;
  width: 18px !important;
  height: 2px !important;
  border-radius: 2px !important;
  opacity: 1 !important;
}

/* 坚决移除一切在右侧 mark 上绝对定位的文字字符伪元素 */
.dsh-tb-mark-starred:after,
[class*="mark"].dsh-tb-mark-starred:after {
  display: none !important;
  content: none !important;
}

/* Search-matched marks: Cyan / Blue glowing bar */
.dsh-tb-mark-matched:not(.dsh-tb-mark-starred):before,
[class*="mark"].dsh-tb-mark-matched:not(.dsh-tb-mark-starred):before {
  background: #0ea5e9 !important;
  box-shadow: 0 0 8px rgba(14, 165, 233, 0.9) !important;
  width: 20px !important;
  height: 2.5px !important;
  opacity: 1 !important;
}

/* Current active match: pulsing white/cyan halo */
.dsh-tb-mark-current-match:before,
[class*="mark"].dsh-tb-mark-current-match:before {
  background: #38bdf8 !important;
  box-shadow: 0 0 14px #38bdf8, 0 0 4px #0284c7 !important;
  width: 24px !important;
  height: 3px !important;
  animation: dshTbPulse 0.9s infinite alternate !important;
}

@keyframes dshTbPulse {
  from { opacity: 0.7; transform: translateY(-50%) scaleX(0.95); }
  to { opacity: 1; transform: translateY(-50%) scaleX(1.08); }
}

/* ==================== 5. Header Action Control Bar (默认单图标 + 丝滑展开搜索) ==================== */
.dsh-tb-search-container {
  display: inline-flex !important;
  align-items: center !important;
  position: relative !important;
  margin-left: 8px !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  align-self: center !important;
  height: 28px !important;
  z-index: 10 !important;
  user-select: none !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  box-sizing: border-box !important;
  vertical-align: middle !important;
}

/* 折叠状态下的微型单图标按钮 (28px 纯图标，不占空间) */
.dsh-tb-search-trigger {
  width: 28px !important;
  height: 28px !important;
  padding: 0 !important;
  border-radius: 7px !important;
  border: 1px solid var(--dsw-alias-border-l4, rgba(128, 128, 128, 0.22)) !important;
  background: var(--dsw-alias-surface-overlay, #ffffff) !important;
  color: var(--dsw-alias-label-secondary, #6e7781) !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1) !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
  box-sizing: border-box !important;
}

.dsh-tb-search-trigger:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.12)) !important;
  color: var(--dsw-alias-label-primary, #1f2328) !important;
  border-color: var(--dsw-alias-border-l3, rgba(128, 128, 128, 0.35)) !important;
  transform: scale(1.04) !important;
}

[data-ds-dark-theme] .dsh-tb-search-trigger,
[data-theme="dark"] .dsh-tb-search-trigger,
html.dark .dsh-tb-search-trigger {
  background: rgba(30, 36, 48, 0.92) !important;
  border-color: rgba(255, 255, 255, 0.16) !important;
  color: #9ca3af !important;
}

/* 展开状态的搜索输入面板 (拉伸动画) */
.dsh-tb-search-expanded {
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
  height: 28px !important;
  width: 28px !important;
  overflow: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  border-radius: 7px !important;
  border: 1px solid var(--dsw-alias-border-l4, rgba(128, 128, 128, 0.22)) !important;
  background: var(--dsw-alias-surface-overlay, #ffffff) !important;
  padding: 0 !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08) !important;
  transition: width 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease, padding 0.22s ease !important;
  position: absolute !important;
  left: 0 !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  box-sizing: border-box !important;
}

.dsh-tb-search-container.is-expanded .dsh-tb-search-trigger {
  opacity: 0 !important;
  pointer-events: none !important;
  transform: scale(0.8) !important;
}

.dsh-tb-search-container.is-expanded .dsh-tb-search-expanded {
  width: 260px !important;
  opacity: 1 !important;
  pointer-events: auto !important;
  padding: 0 6px 0 8px !important;
  border-color: #f59e0b !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(245, 158, 11, 0.3) !important;
}

[data-ds-dark-theme] .dsh-tb-search-expanded,
[data-theme="dark"] .dsh-tb-search-expanded,
html.dark .dsh-tb-search-expanded {
  background: #1e2430 !important;
  border-color: rgba(255, 255, 255, 0.18) !important;
}

[data-ds-dark-theme] .dsh-tb-search-container.is-expanded .dsh-tb-search-expanded,
[data-theme="dark"] .dsh-tb-search-container.is-expanded .dsh-tb-search-expanded,
html.dark .dsh-tb-search-container.is-expanded .dsh-tb-search-expanded {
  border-color: #fbbf24 !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(251, 191, 36, 0.4) !important;
}

.dsh-tb-input {
  border: none !important;
  background: transparent !important;
  color: var(--dsw-alias-label-primary, inherit) !important;
  font-size: 12px !important;
  outline: none !important;
  width: 125px !important;
  padding: 2px 2px !important;
  flex: 1 !important;
  min-width: 0 !important;
}

.dsh-tb-input::placeholder {
  color: var(--dsw-alias-label-tertiary, #9ca3af) !important;
}

.dsh-tb-counter {
  font-size: 11px !important;
  color: var(--dsw-alias-label-tertiary, #6b7280) !important;
  padding: 0 4px !important;
  white-space: nowrap !important;
  flex: none !important;
}

.dsh-tb-nav-btn {
  border: none !important;
  background: transparent !important;
  cursor: pointer !important;
  width: 18px !important;
  height: 18px !important;
  border-radius: 4px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: var(--dsw-alias-label-secondary, #6e7781) !important;
  padding: 0 !important;
  flex: none !important;
  transition: all 0.12s ease !important;
}

.dsh-tb-nav-btn:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.15)) !important;
  color: var(--dsw-alias-label-primary, #111827) !important;
}

/* Flash highlight on jump target message bubble */
@keyframes dshTbTargetFlash {
  0% { outline: 3px solid rgba(59, 130, 246, 0.85); background: rgba(59, 130, 246, 0.08); }
  50% { outline: 3px solid rgba(59, 130, 246, 0.4); }
  100% { outline: 3px solid transparent; background: transparent; }
}

.dsh-tb-highlight-target {
  animation: dshTbTargetFlash 1.6s ease-out !important;
  border-radius: 8px !important;
}

/* ==================== 6. In-Session Keyword Highlights ==================== */
mark.dsh-tb-kw {
  background: rgba(254, 240, 138, 0.7) !important;
  color: #1e293b !important;
  border-radius: 3px !important;
  padding: 1px 2px !important;
  margin: 0 !important;
  box-shadow: 0 0 0 1px rgba(234, 179, 8, 0.45) !important;
  text-decoration: none !important;
  transition: all 0.15s ease !important;
  display: inline !important;
}

[data-ds-dark-theme] mark.dsh-tb-kw,
[data-theme="dark"] mark.dsh-tb-kw,
html.dark mark.dsh-tb-kw {
  background: rgba(234, 179, 8, 0.38) !important;
  color: #fef08a !important;
  box-shadow: 0 0 0 1px rgba(250, 204, 21, 0.4) !important;
}

/* Current focused search match */
mark.dsh-tb-kw.dsh-tb-kw-active {
  background: #f59e0b !important;
  color: #000000 !important;
  font-weight: 700 !important;
  box-shadow: 0 0 0 2px #d97706, 0 0 14px rgba(245, 158, 11, 0.95) !important;
  animation: dshTbKwActivePulse 0.9s infinite alternate !important;
  z-index: 99 !important;
  position: relative !important;
}

[data-ds-dark-theme] mark.dsh-tb-kw.dsh-tb-kw-active,
[data-theme="dark"] mark.dsh-tb-kw.dsh-tb-kw-active,
html.dark mark.dsh-tb-kw.dsh-tb-kw-active {
  background: #fbbf24 !important;
  color: #09090b !important;
  box-shadow: 0 0 0 2px #f59e0b, 0 0 12px rgba(251, 191, 36, 0.9) !important;
}

@keyframes dshTbKwActivePulse {
  0% { transform: scale(1); filter: brightness(1); }
  100% { transform: scale(1.08); filter: brightness(1.2); }
}
    `

    function ensureStyles() {
      if (document.getElementById(CSS_ID)) return
      const style = document.createElement('style')
      style.id = CSS_ID
      style.textContent = STYLES
      document.head.appendChild(style)
    }

    // ── Persistent Storage Helpers ──────────────────────────────────────────
    function getStoredBookmarks() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) return JSON.parse(raw)
      } catch {}
      return {}
    }

    function saveStoredBookmarks(map) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
      } catch {}
    }

    function getSessionIdFromEnvironment(sessionsRef) {
      try {
        const snap = sessionsRef?.list?.getSnapshot?.()
        if (snap?.current) return snap.current
      } catch {}
      try {
        const params = new URLSearchParams(window.location.search)
        const sid = params.get('session')
        if (sid) return sid
      } catch {}
      try {
        const row = document.querySelector('[data-dsh-session]')
        if (row) return row.getAttribute('data-dsh-session')
      } catch {}
      try {
        const raw = localStorage.getItem('dsh.sessions.current')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed?.sessionId) return parsed.sessionId
        }
      } catch {}
      return 'default'
    }

    // ── Parse Turn Number from Rail Mark element ────────────────────────────
    function parseTurnNumber(btn) {
      if (!btn) return null
      const label = btn.getAttribute('aria-label') || ''
      const matchZh = label.match(/第\s*(\d+)\s*轮/)
      if (matchZh) return parseInt(matchZh[1], 10)
      const matchEn = label.match(/turn\s*(\d+)/i)
      if (matchEn) return parseInt(matchEn[1], 10)
      const matchNum = label.match(/(\d+)/)
      if (matchNum) return parseInt(matchNum[1], 10)
      return null
    }

    // ── Main Plugin Factory ─────────────────────────────────────────────────
    function apply(ctx) {
      ensureStyles()

      const sessionsRef = ctx.get('sessions')
      let activeSessionId = getSessionIdFromEnvironment(sessionsRef)
      let starredTurns = new Set()
      // 本地点星计数器：后端同步返回时用它判断"这次请求飞行期间用户是否又点过星"
      let bookmarkToggleSeq = 0
      let searchKeyword = ''
      let searchMarkEls = []
      let searchMatches = []
      let currentMatchIdx = 0
      let searchExpanded = false

      let barEl = null
      let searchToggleEl = null
      let searchWrapEl = null
      let searchInputEl = null
      let counterEl = null

      // ── Popover Singleton & State Machine (方案B: 独立受控浮层) ───────────
      let popoverEl = null
      let popoverCloseTimer = null
      let activePopoverTurn = null
      let isPopoverHovered = false
      let isMarkHovered = false



      function ensurePopover() {
        if (popoverEl && document.body.contains(popoverEl)) return popoverEl
        popoverEl = document.createElement('div')
        popoverEl.className = 'dsh-tb-popover'

        popoverEl.addEventListener('mouseenter', () => {
          isPopoverHovered = true
          if (popoverCloseTimer) {
            clearTimeout(popoverCloseTimer)
            popoverCloseTimer = null
          }
        })

        popoverEl.addEventListener('mouseleave', () => {
          isPopoverHovered = false
          scheduleHidePopover()
        })

        document.body.appendChild(popoverEl)
        return popoverEl
      }

      function getTurnSummary(turn) {
        let promptText = ''
        let respText = ''

        const rows = Array.from(document.querySelectorAll(`[data-chat-turn="${turn}"]`))
        for (const row of rows) {
          const flowKind = row.getAttribute('data-chat-flow-kind') || ''
          const text = (row.textContent || '').trim().replace(/\s+/g, ' ')

          if (flowKind === 'user' || row.querySelector('[class*="user"], [class*="bubble"]')) {
            if (!promptText && text) promptText = text.slice(0, 140)
          } else if (flowKind === 'assistant-step' || row.querySelector('[class*="hWmORq"], [class*="markdown"], [class*="message"]')) {
            if (!respText && text) respText = text.slice(0, 220)
          }
        }

        // 兜底：如果 DOM 中没细分，直接从该轮第一个 row 取提问
        if (!promptText && rows.length > 0) {
          promptText = (rows[0].textContent || '').trim().slice(0, 140)
        }

        if (!promptText) promptText = `第 ${turn} 轮对话`
        if (!respText) {
          respText = rows.length > 0 ? '（展开查看完整对话细节）' : '（历史对话轮次，点击右侧标线可加载并跳转）'
        }

        return { promptText, respText }
      }

      function showPopover(turn, targetEl) {
        if (!Number.isSafeInteger(turn) || !targetEl) return
        ensurePopover()

        if (popoverCloseTimer) {
          clearTimeout(popoverCloseTimer)
          popoverCloseTimer = null
        }

        activePopoverTurn = turn
        const isStarred = starredTurns.has(turn)
        const { promptText, respText } = getTurnSummary(turn)

        popoverEl.innerHTML = `
          <div class="dsh-tb-popover-header">
            <span class="dsh-tb-turn-pill">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              第 ${turn} 轮对话
            </span>
            <div class="dsh-tb-card-actions">
              <button class="dsh-tb-card-btn dsh-tb-star-toggle ${isStarred ? 'dsh-tb-starred' : ''}" type="button" title="${isStarred ? '取消收藏' : '收藏此轮'}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="${isStarred ? '#f59e0b' : 'none'}" stroke="${isStarred ? '#d97706' : 'currentColor'}" stroke-width="2" stroke-linejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                <span>${isStarred ? '已收藏' : '收藏'}</span>
              </button>
              <button class="dsh-tb-card-btn dsh-tb-copy-toggle" type="button" title="复制此轮问答正文">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>复制</span>
              </button>
            </div>
          </div>
          <div class="dsh-tb-popover-body">
            <div class="dsh-tb-popover-row dsh-tb-popover-prompt">
              <span class="dsh-tb-popover-tag">问</span>
              <p class="dsh-tb-popover-text">${escapeHtml(promptText)}</p>
            </div>
            <div class="dsh-tb-popover-row dsh-tb-popover-response">
              <span class="dsh-tb-popover-tag">答</span>
              <p class="dsh-tb-popover-text">${escapeHtml(respText)}</p>
            </div>
          </div>
        `

        // Bind Star Toggle Button
        const starBtn = popoverEl.querySelector('.dsh-tb-star-toggle')
        if (starBtn) {
          starBtn.onclick = (e) => {
            e.stopPropagation()
            e.preventDefault()
            toggleBookmark(turn)
            const nextStarred = starredTurns.has(turn)
            starBtn.classList.toggle('dsh-tb-starred', nextStarred)
            starBtn.title = nextStarred ? '取消收藏' : '收藏此轮'
            const span = starBtn.querySelector('span')
            if (span) span.textContent = nextStarred ? '已收藏' : '收藏'
            const svg = starBtn.querySelector('svg')
            if (svg) {
              svg.setAttribute('fill', nextStarred ? '#f59e0b' : 'none')
              svg.setAttribute('stroke', nextStarred ? '#d97706' : 'currentColor')
            }
          }
        }

        // Bind Copy Button
        const copyBtn = popoverEl.querySelector('.dsh-tb-copy-toggle')
        if (copyBtn) {
          copyBtn.onclick = (e) => {
            e.stopPropagation()
            e.preventDefault()
            const full = `### 第 ${turn} 轮\n**提问**: ${promptText}\n\n**回复**: ${respText}`.trim()
            navigator?.clipboard?.writeText?.(full)?.then(() => {
              const span = copyBtn.querySelector('span')
              if (span) span.textContent = '已复制'
              setTimeout(() => {
                if (span) span.textContent = '复制'
              }, 1400)
            })
          }
        }

        // Calculate Position on Viewport (智能判断左右目标，双向精准定位)
        const targetRect = targetEl.getBoundingClientRect()
        const popoverWidth = 320
        const popoverHeight = popoverEl.offsetHeight || 130
        let top = targetRect.top + targetRect.height / 2 - popoverHeight / 2
        top = Math.max(16, Math.min(top, window.innerHeight - popoverHeight - 16))

        popoverEl.style.top = `${Math.round(top)}px`
        if (targetRect.left < window.innerWidth / 2) {
          // 目标在视口左半边（左侧镜像轨），浮层向右展开
          popoverEl.style.left = `${Math.round(targetRect.right + 12)}px`
          popoverEl.style.right = 'auto'
          popoverEl.setAttribute('data-side', 'right')
        } else {
          // 目标在视口右半边（右侧原生轨），浮层向左展开
          const right = window.innerWidth - targetRect.left + 10
          popoverEl.style.right = `${Math.round(right)}px`
          popoverEl.style.left = 'auto'
          popoverEl.setAttribute('data-side', 'left')
        }
        popoverEl.classList.add('visible')
      }

      function scheduleHidePopover() {
        if (popoverCloseTimer) clearTimeout(popoverCloseTimer)
        // 280ms 安全缓冲窗口（Hover Grace Period），消除死亡间隙
        popoverCloseTimer = setTimeout(() => {
          if (!isPopoverHovered && !isMarkHovered) {
            popoverEl?.classList.remove('visible')
            activePopoverTurn = null
          }
        }, 280)
      }

      function escapeHtml(str) {
        return (str || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;')
      }

      function reloadBookmarks() {
        // 关键：这次同步绑定"发起请求时"的会话 id。
        // 旧实现在响应回来时读的是全局 activeSessionId —— 只要用户在这段时间里切换了会话，
        // 上一个会话的收藏就会被并进并写死到新会话（这正是 25/27/38 串进 session-4927de52 的成因）。
        const sid = getSessionIdFromEnvironment(sessionsRef)
        activeSessionId = sid
        const all = getStoredBookmarks()
        const list = Array.isArray(all[sid]) ? all[sid] : []
        starredTurns = new Set(list)
        // Also sync from backend asynchronously
        if (!sid || sid === 'default') return
        const toggleSeqAtRequest = bookmarkToggleSeq
        fetch(`/dsh-turn-bookmarks/bookmarks?sessionId=${encodeURIComponent(sid)}`)
          .then((r) => r.json())
          .then((res) => {
            // 会话已经切走：丢弃迟到响应，绝不写进当前会话
            if (activeSessionId !== sid) return
            if (!res.ok || !Array.isArray(res.bookmarks)) return
            const server = res.bookmarks.filter(Number.isSafeInteger).sort((a, b) => a - b)
            // 请求期间用户点过星 → 只做并集，别冲掉刚点下的那颗；
            // 否则以服务端为准（顺带清掉此前串会话留下的脏数据）。
            const next = bookmarkToggleSeq === toggleSeqAtRequest
              ? server
              : [...new Set([...server, ...starredTurns])].sort((a, b) => a - b)
            const current = [...starredTurns].sort((a, b) => a - b)
            if (next.join(',') === current.join(',')) return
            starredTurns = new Set(next)
            const m = getStoredBookmarks()
            if (next.length === 0) delete m[sid]
            else m[sid] = next
            saveStoredBookmarks(m)
            updateRailMarks()
            updateLeftBookmarkRail()
            injectMessageStarButtons()
            renderControlBarState()
          })
          .catch(() => {})
      }

      function toggleBookmark(turn) {
        if (!Number.isSafeInteger(turn)) return
        bookmarkToggleSeq += 1
        console.info('[dsh-turn-bookmarks] toggleBookmark turn:', turn, 'activeSessionId:', activeSessionId)
        if (starredTurns.has(turn)) {
          starredTurns.delete(turn)
        } else {
          starredTurns.add(turn)
        }
        const m = getStoredBookmarks()
        m[activeSessionId] = [...starredTurns].sort((a, b) => a - b)
        saveStoredBookmarks(m)

        // Post to backend backup
        fetch('/dsh-turn-bookmarks/bookmarks', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            sessionId: activeSessionId,
            bookmarks: [...starredTurns],
          }),
        }).catch(() => {})

        updateRailMarks()
        renderControlBarState()
        injectMessageStarButtons()
      }

      // ── In-Message Star Action Buttons ────────────────────────────────────
      function injectMessageStarButtons() {
        const rows = document.querySelectorAll('[data-chat-turn]')
        for (const row of rows) {
          const turn = parseInt(row.dataset.chatTurn || '', 10)
          if (!Number.isSafeInteger(turn)) continue
          const actionsBar = row.querySelector('[class*="_actions"], [class*="actions"]')
          if (!actionsBar) continue

          let starBtn = actionsBar.querySelector('.dsh-tb-msg-star')
          const isStarred = starredTurns.has(turn)
          if (starBtn) {
            const currentStarState = starBtn.classList.contains('dsh-tb-starred')
            if (currentStarState === isStarred) continue
            starBtn.classList.toggle('dsh-tb-starred', isStarred)
            starBtn.title = isStarred ? `取消收藏第 ${turn} 轮` : `收藏第 ${turn} 轮`
            starBtn.innerHTML = `
              <svg width="15" height="15" viewBox="0 0 24 24" fill="${isStarred ? '#f59e0b' : 'none'}" stroke="${isStarred ? '#d97706' : 'currentColor'}" stroke-width="1.8" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            `
            continue
          }

          starBtn = document.createElement('button')
          starBtn.className = 'dsh-tb-msg-star'
          starBtn.type = 'button'
          starBtn.title = isStarred ? `取消收藏第 ${turn} 轮` : `收藏第 ${turn} 轮`
          starBtn.setAttribute('aria-label', starBtn.title)
          starBtn.classList.toggle('dsh-tb-starred', isStarred)
          starBtn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="${isStarred ? '#f59e0b' : 'none'}" stroke="${isStarred ? '#d97706' : 'currentColor'}" stroke-width="1.8" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          `
          const onToggle = (e) => {
            e.stopPropagation()
            e.preventDefault()
            toggleBookmark(turn)
          }
          starBtn.addEventListener('click', onToggle, { capture: true })
          starBtn.addEventListener('pointerdown', onToggle, { capture: true })
          actionsBar.appendChild(starBtn)
        }
      }

      // ── Rail Marks Synchronizer (双轨架构联动) ─────────────────────────────
      function updateRailMarks() {
        const frame = document.querySelector('[class*="frame"], nav[aria-label*="轮次"], nav[aria-label*="turn" i]')
        if (!frame) return

        const markButtons = Array.from(frame.querySelectorAll('button[class*="mark"]'))
        markButtons.forEach((btn) => {
          const turn = parseTurnNumber(btn)
          if (turn === null) return

          btn.dataset.dshTurn = String(turn)
          const pos = btn.closest('[class*="markPosition"]')
          if (pos) pos.dataset.dshTurn = String(turn)

          // Bind Popover & Click Actions
          if (!btn.dataset.dshTbBound) {
            btn.dataset.dshTbBound = '1'

            // Hover: 打开/锁定独立受控浮层
            const onEnter = () => {
              isMarkHovered = true
              showPopover(turn, btn)
            }
            const onLeave = () => {
              isMarkHovered = false
              scheduleHidePopover()
            }

            btn.addEventListener('mouseenter', onEnter)
            btn.addEventListener('mouseleave', onLeave)
            if (pos) {
              pos.addEventListener('mouseenter', onEnter)
              pos.addEventListener('mouseleave', onLeave)
            }

            // Quick Star: Shift/Alt 点击或双击直接切换收藏
            btn.addEventListener('click', (e) => {
              if (e.shiftKey || e.altKey) {
                e.stopPropagation()
                e.preventDefault()
                toggleBookmark(turn)
              }
            }, { capture: true })

            btn.addEventListener('dblclick', (e) => {
              e.stopPropagation()
              e.preventDefault()
              toggleBookmark(turn)
            }, { capture: true })
          }

          // 1. Starred status (右主轨：彻底瘦身，仅保留金色发光细线，坚决移除任何大胶囊与五角星)
          if (starredTurns.has(turn)) {
            btn.classList.add('dsh-tb-mark-starred')
            if (pos) pos.classList.add('dsh-tb-pos-starred')
          } else {
            btn.classList.remove('dsh-tb-mark-starred')
            if (pos) pos.classList.remove('dsh-tb-pos-starred')
          }
          // 彻底清理任何残留在右侧的旧标签
          pos?.querySelector('.dsh-tb-bookmark-chip')?.remove()

          // 2. Search match status
          const isMatch = searchMatches.includes(turn)
          const activeMarkEl = searchMarkEls[currentMatchIdx]
          const activeTurn = activeMarkEl ? parseInt(activeMarkEl.dataset.dshTurn || '', 10) : null
          const isCurrent = isMatch && Number.isSafeInteger(activeTurn) && activeTurn === turn

          if (isMatch) {
            btn.classList.add('dsh-tb-mark-matched')
          } else {
            btn.classList.remove('dsh-tb-mark-matched')
          }

          if (isCurrent) {
            btn.classList.add('dsh-tb-mark-current-match')
          } else {
            btn.classList.remove('dsh-tb-mark-current-match')
          }
        })
      }

      // ── In-Session Keyword Search (彻底修复漏搜，正文全量遍历) ─────────────
      function clearHighlights() {
        const marks = Array.from(document.querySelectorAll('mark.dsh-tb-kw'))
        for (const m of marks) {
          const parent = m.parentNode
          if (parent) {
            parent.replaceChild(document.createTextNode(m.textContent || ''), m)
            parent.normalize()
          }
        }
        searchMarkEls = []
      }

      function highlightAllMatches(query) {
        clearHighlights()
        if (!query) {
          searchMatches = []
          currentMatchIdx = 0
          return
        }

        const q = query.toLowerCase()
        const rows = Array.from(document.querySelectorAll('[data-chat-turn]'))
        const createdMarks = []
        const matchedTurnsSet = new Set()

        for (const row of rows) {
          const turn = parseInt(row.dataset.chatTurn || '', 10)
          if (!Number.isSafeInteger(turn)) continue

          // 正文全量扫描：遍历 row 内部的所有有效文本节点，排除非内容标签与控制栏
          const walker = document.createTreeWalker(
            row,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode(node) {
                if (!node.nodeValue || !node.nodeValue.toLowerCase().includes(q)) {
                  return NodeFilter.FILTER_REJECT
                }
                const parent = node.parentElement
                if (!parent) return NodeFilter.FILTER_REJECT
                const tag = parent.tagName.toLowerCase()
                if (tag === 'script' || tag === 'style' || tag === 'svg' || tag === 'mark' || tag === 'textarea' || tag === 'input') {
                  return NodeFilter.FILTER_REJECT
                }
                // 排除外层控制栏、弹窗、操作按钮、系统状态信息
                if (parent.closest('.dsh-tb-bar') ||
                    parent.closest('.dsh-tb-popover') ||
                    parent.closest('.dsh-tb-bookmark-rail') ||
                    parent.closest('[role="tooltip"]') ||
                    parent.closest('button') ||
                    parent.closest('[class*="_actions"], [class*="actions"]') ||
                    parent.closest('[class*="turnStatus"]') ||
                    parent.closest('[class*="compactionLeading"]')) {
                  return NodeFilter.FILTER_REJECT
                }
                return NodeFilter.FILTER_ACCEPT
              }
            }
          )

          const textNodes = []
          while (walker.nextNode()) {
            textNodes.push(walker.currentNode)
          }

          for (const node of textNodes) {
            const parent = node.parentNode
            if (!parent) continue
            const text = node.nodeValue || ''
            let lastIdx = 0
            const lower = text.toLowerCase()
            let matchIdx = lower.indexOf(q, lastIdx)
            if (matchIdx === -1) continue

            const frag = document.createDocumentFragment()
            while (matchIdx !== -1) {
              if (matchIdx > lastIdx) {
                frag.appendChild(document.createTextNode(text.slice(lastIdx, matchIdx)))
              }
              const mark = document.createElement('mark')
              mark.className = 'dsh-tb-kw'
              mark.textContent = text.slice(matchIdx, matchIdx + query.length)
              mark.dataset.dshTurn = String(turn)
              matchedTurnsSet.add(turn)
              frag.appendChild(mark)
              createdMarks.push(mark)

              lastIdx = matchIdx + query.length
              matchIdx = lower.indexOf(q, lastIdx)
            }
            if (lastIdx < text.length) {
              frag.appendChild(document.createTextNode(text.slice(lastIdx)))
            }
            parent.replaceChild(frag, node)
          }
        }

        searchMarkEls = createdMarks
        searchMatches = [...matchedTurnsSet].sort((a, b) => a - b)
        if (searchMarkEls.length > 0) {
          if (currentMatchIdx >= searchMarkEls.length || currentMatchIdx < 0) {
            currentMatchIdx = 0
          }
          // 确保当前活跃索引的高亮样式永不丢失
          searchMarkEls[currentMatchIdx]?.classList.add('dsh-tb-kw-active')
        } else {
          currentMatchIdx = 0
        }
      }

      function getLiveMarks() {
        const marks = Array.from(document.querySelectorAll('mark.dsh-tb-kw'))
        // 严格按照 DOM 在文档流中出现的几何先后顺序排序
        marks.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
        return marks
      }

      function getChatScrollContainer() {
        const sample = document.querySelector('mark.dsh-tb-kw') || document.querySelector('[data-chat-turn]')
        if (sample) {
          let cur = sample.parentElement
          while (cur && cur !== document.body) {
            const style = window.getComputedStyle(cur)
            const overflowY = style.overflowY
            if ((overflowY === 'auto' || overflowY === 'scroll') && cur.clientHeight > 200) {
              return cur
            }
            cur = cur.parentElement
          }
        }
        return document.querySelector('[data-conversation-scroll]') ||
               document.querySelector('[class*="EvIC1a_scroll"], [class*="_scroll"]') ||
               document.scrollingElement ||
               document.documentElement
      }

      function scrollTargetIntoCenter(targetMark) {
        if (!targetMark) return
        const container = getChatScrollContainer()

        // 1. 如果目标所在的父级存在未展开的 details 或折叠，自动展开
        let parent = targetMark.parentElement
        while (parent && parent !== container && parent !== document.body) {
          if (parent.tagName === 'DETAILS' && !parent.open) {
            parent.open = true
          }
          if (parent.hasAttribute('hidden')) {
            parent.removeAttribute('hidden')
            parent.dispatchEvent(new CustomEvent('beforematch', { bubbles: true }))
          }
          parent = parent.parentElement
        }

        // 2. 原生平滑滚动
        try {
          targetMark.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          })
        } catch {}

        // 3. 核心保障：直接根据容器的 scrollTop 矫正，避免被吸底逻辑对抗
        if (container && container !== document.documentElement) {
          const cRect = container.getBoundingClientRect()
          const tRect = targetMark.getBoundingClientRect()
          const currentRelativeTop = tRect.top - cRect.top
          const idealRelativeTop = cRect.height / 2
          const diff = currentRelativeTop - idealRelativeTop

          if (Math.abs(diff) > 60) {
            container.scrollTo({
              top: Math.max(0, container.scrollTop + diff),
              behavior: 'smooth'
            })
          }
        }
      }

      function jumpToCurrentMatch(smooth = true) {
        let liveMarks = getLiveMarks()
        // 若 liveMarks 与内存不符，立刻重构
        if (searchKeyword && liveMarks.length === 0) {
          highlightAllMatches(searchKeyword)
          liveMarks = getLiveMarks()
        }

        if (liveMarks.length === 0) {
          updateRailMarks()
          renderControlBarState()
          return
        }

        if (currentMatchIdx < 0) currentMatchIdx = 0
        if (currentMatchIdx >= liveMarks.length) currentMatchIdx = liveMarks.length - 1

        // 清空全部已有 active 状态
        for (const m of liveMarks) {
          m.classList.remove('dsh-tb-kw-active')
        }

        const targetMark = liveMarks[currentMatchIdx]
        if (targetMark) {
          targetMark.classList.add('dsh-tb-kw-active')
          scrollTargetIntoCenter(targetMark)

          const row = targetMark.closest('[data-chat-turn]')
          if (row) {
            row.classList.remove('dsh-tb-highlight-target')
            void row.offsetWidth // trigger reflow
            row.classList.add('dsh-tb-highlight-target')
            setTimeout(() => row.classList.remove('dsh-tb-highlight-target'), 1400)
          }
        }

        searchMarkEls = liveMarks
        updateRailMarks()
        renderControlBarState()
      }

      function nextMatch() {
        const liveMarks = getLiveMarks()
        if (liveMarks.length === 0) return
        currentMatchIdx = (currentMatchIdx + 1) % liveMarks.length
        jumpToCurrentMatch(true)
      }

      function prevMatch() {
        const liveMarks = getLiveMarks()
        if (liveMarks.length === 0) return
        currentMatchIdx = (currentMatchIdx - 1 + liveMarks.length) % liveMarks.length
        jumpToCurrentMatch(true)
      }

      let searchDebounceTimer = null
      function executeSearch(query) {
        searchKeyword = (query || '').trim()
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer)

        if (!searchKeyword) {
          clearHighlights()
          searchMatches = []
          currentMatchIdx = 0
          updateRailMarks()
          renderControlBarState()
          return
        }

        searchDebounceTimer = setTimeout(() => {
          highlightAllMatches(searchKeyword)
          if (searchMarkEls.length > 0) {
            jumpToCurrentMatch(true)
          } else {
            updateRailMarks()
            renderControlBarState()
          }
        }, 80)
      }

      // ── Left Bookmark Mirror Rail (左侧专属收藏镜像轨: 位置 A + 形态 1) ───
      let leftRailEl = null

      function ensureLeftBookmarkRail() {
        if (leftRailEl && document.body.contains(leftRailEl)) return leftRailEl
        leftRailEl = document.createElement('div')
        leftRailEl.className = 'dsh-tb-left-rail'
        document.body.appendChild(leftRailEl)
        return leftRailEl
      }

      function updateLeftBookmarkRail() {
        ensureLeftBookmarkRail()
        if (!leftRailEl) return

        if (starredTurns.size === 0) {
          leftRailEl.style.display = 'none'
          leftRailEl.innerHTML = ''
          return
        }

        const allMarks = Array.from(document.querySelectorAll('button[class*="mark"]'))

        // 黄金视口比例：导轨线保持在 320~460px 的优雅舒展高度，垂直居中偏上停靠
        const viewportH = window.innerHeight || 800
        const railHeight = Math.max(300, Math.min(Math.round(viewportH * 0.5), 440))
        const railTop = Math.max(70, Math.round(viewportH * 0.22))

        // 计算位置 A：主工作区最左外缘（紧贴侧边栏分割线）
        let leftPos = 16
        const sidebar = document.querySelector('aside, [class*="sidebar"], [data-sidebar]')
        if (sidebar && sidebar.offsetWidth > 60) {
          const sRect = sidebar.getBoundingClientRect()
          leftPos = sRect.right + 14
        } else {
          const mainEl = document.querySelector('main') || document.querySelector('[data-conversation-scroll]')
          if (mainEl) {
            leftPos = mainEl.getBoundingClientRect().left + 14
          }
        }

        leftRailEl.style.display = 'block'
        leftRailEl.style.top = `${Math.round(railTop)}px`
        leftRailEl.style.height = `${Math.round(railHeight)}px`
        leftRailEl.style.left = `${Math.round(leftPos)}px`

        // 垂直渐变导轨线
        if (!leftRailEl.querySelector('.dsh-tb-left-rail-guide')) {
          const guide = document.createElement('div')
          guide.className = 'dsh-tb-left-rail-guide'
          leftRailEl.appendChild(guide)
        }

        // 渲染已收藏轮次胶囊（形态 1：纯数字微型胶囊，无五角星，舒展防重叠排列）
        const sorted = [...starredTurns].sort((a, b) => a - b)
        const maxTurn = Math.max(11, ...sorted, allMarks.length)

        // 舒展分布算法与防碰撞弹簧间距（最小保证 30px 中心距，消除拥挤感）
        const positions = sorted.map((turn) => {
          const ratio = maxTurn > 1 ? (turn - 1) / (maxTurn - 1) : 0.5
          return Math.round(18 + ratio * (railHeight - 36))
        })

        // 正向防挤压
        for (let i = 1; i < positions.length; i++) {
          if (positions[i] - positions[i - 1] < 30) {
            positions[i] = positions[i - 1] + 30
          }
        }
        // 逆向防越界
        if (positions.length > 0 && positions[positions.length - 1] > railHeight - 18) {
          positions[positions.length - 1] = railHeight - 18
          for (let i = positions.length - 2; i >= 0; i--) {
            if (positions[i + 1] - positions[i] < 30) {
              positions[i] = positions[i + 1] - 30
            }
          }
        }

        const existingMap = new Map()
        leftRailEl.querySelectorAll('.dsh-tb-left-capsule').forEach((el) => {
          existingMap.set(parseInt(el.dataset.dshTurn, 10), el)
        })

        // 移除不再收藏的
        existingMap.forEach((el, t) => {
          if (!starredTurns.has(t)) el.remove()
        })

        sorted.forEach((turn, idx) => {
          const relativeY = positions[idx]

          let capsule = existingMap.get(turn)
          if (!capsule) {
            capsule = document.createElement('button')
            capsule.className = 'dsh-tb-left-capsule'
            capsule.type = 'button'
            capsule.dataset.dshTurn = String(turn)
            capsule.title = `第 ${turn} 轮对话 (已收藏，点击直达)`
            capsule.innerHTML = `<span>${turn}</span>`

            capsule.onclick = (e) => {
              e.stopPropagation()
              e.preventDefault()
              const row = document.querySelector(`[data-chat-turn="${turn}"]`)
              if (row) {
                scrollTargetIntoCenter(row)
                row.classList.remove('dsh-tb-highlight-target')
                void row.offsetWidth
                row.classList.add('dsh-tb-highlight-target')
                setTimeout(() => row.classList.remove('dsh-tb-highlight-target'), 1400)
              } else {
                const mark = document.querySelector(`button[class*="mark"][data-dsh-turn="${turn}"]`) ||
                  Array.from(document.querySelectorAll('button[class*="mark"]')).find((b) => parseTurnNumber(b) === turn)
                if (mark) mark.click()
              }
            }

            capsule.onmouseenter = () => {
              isMarkHovered = true
              showPopover(turn, capsule)
            }
            capsule.onmouseleave = () => {
              isMarkHovered = false
              scheduleHidePopover()
            }

            leftRailEl.appendChild(capsule)
          }

          capsule.style.top = `${Math.round(relativeY)}px`
        })
      }

      // ── Create Control Bar DOM Once (默认单图标 + 平滑展开搜索栏) ───────────────
      function ensureControlBar() {
        // Clean up any stale duplicate bars
        const existingBars = document.querySelectorAll('.dsh-tb-search-container, .dsh-tb-bar')
        if (existingBars.length > 1) {
          for (let i = 1; i < existingBars.length; i++) existingBars[i].remove()
        }

        if (barEl && document.body.contains(barEl)) return barEl

        barEl = document.createElement('div')
        barEl.className = 'dsh-tb-search-container'

        // 1. Search Trigger Button (折叠态单图标按钮，28px)
        searchToggleEl = document.createElement('button')
        searchToggleEl.className = 'dsh-tb-search-trigger'
        searchToggleEl.type = 'button'
        searchToggleEl.title = '搜索本会话内容 (快捷键 /)'
        searchToggleEl.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        `
        searchToggleEl.onclick = () => {
          searchExpanded = true
          renderControlBarState()
          setTimeout(() => searchInputEl?.focus(), 80)
        }
        barEl.appendChild(searchToggleEl)

        // 2. Search Expanded Box (展开面板)
        searchWrapEl = document.createElement('div')
        searchWrapEl.className = 'dsh-tb-search-expanded'

        // 内置放大镜小图标
        const innerIcon = document.createElement('span')
        innerIcon.style.cssText = 'color: #f59e0b; display: inline-flex; align-items: center; flex: none;'
        innerIcon.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        `
        searchWrapEl.appendChild(innerIcon)

        searchInputEl = document.createElement('input')
        searchInputEl.className = 'dsh-tb-input'
        searchInputEl.type = 'text'
        searchInputEl.placeholder = '搜索本会话...'
        searchInputEl.oninput = (e) => executeSearch(e.target.value)
        searchInputEl.onkeydown = (e) => {
          if (e.key === 'Enter') {
            if (e.shiftKey) prevMatch()
            else nextMatch()
          } else if (e.key === 'Escape') {
            searchExpanded = false
            searchKeyword = ''
            if (searchInputEl) searchInputEl.value = ''
            executeSearch('')
          }
        }
        searchWrapEl.appendChild(searchInputEl)

        counterEl = document.createElement('span')
        counterEl.className = 'dsh-tb-counter'
        searchWrapEl.appendChild(counterEl)

        const prevBtn = document.createElement('button')
        prevBtn.className = 'dsh-tb-nav-btn'
        prevBtn.title = '上一个匹配项 (Shift+Enter)'
        prevBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="18 15 12 9 6 15"></polyline></svg>'
        prevBtn.onclick = prevMatch
        searchWrapEl.appendChild(prevBtn)

        const nextBtn = document.createElement('button')
        nextBtn.className = 'dsh-tb-nav-btn'
        nextBtn.title = '下一个匹配项 (Enter)'
        nextBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>'
        nextBtn.onclick = nextMatch
        searchWrapEl.appendChild(nextBtn)

        const closeBtn = document.createElement('button')
        closeBtn.className = 'dsh-tb-nav-btn'
        closeBtn.title = '关闭搜索 (Esc)'
        closeBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
        closeBtn.onclick = () => {
          searchExpanded = false
          searchKeyword = ''
          if (searchInputEl) searchInputEl.value = ''
          executeSearch('')
        }
        searchWrapEl.appendChild(closeBtn)

        barEl.appendChild(searchWrapEl)

        mountControlBar()
        renderControlBarState()
        return barEl
      }

      function mountControlBar() {
        if (!barEl) return
        const tablist = document.querySelector('header [role="tablist"]')
        if (tablist) {
          const cutStudioBtn = tablist.querySelector('#dsh-cut-studio-tab-btn') || tablist.querySelector('.dsh-cut-studio-tab-btn')
          if (cutStudioBtn) {
            if (cutStudioBtn.nextElementSibling !== barEl) {
              tablist.insertBefore(barEl, cutStudioBtn.nextSibling)
            }
          } else {
            const tabs = tablist.querySelectorAll('button[role="tab"]')
            const lastTab = tabs[tabs.length - 1]
            if (lastTab) {
              if (lastTab.nextElementSibling !== barEl) {
                tablist.insertBefore(barEl, lastTab.nextSibling)
              }
            } else if (!tablist.contains(barEl)) {
              tablist.appendChild(barEl)
            }
          }
        } else {
          const corner = document.querySelector('[data-conversation-header-corner]')
          if (corner && corner.parentElement) {
            if (barEl.nextElementSibling !== corner) {
              corner.parentElement.insertBefore(barEl, corner)
            }
          } else {
            const header = document.querySelector('header')
            if (header && !header.contains(barEl)) {
              header.appendChild(barEl)
            } else if (!document.body.contains(barEl)) {
              document.body.appendChild(barEl)
            }
          }
        }
      }

      // ── Update State without destroying DOM ────────────────────────────────
      function renderControlBarState() {
        if (!barEl) ensureControlBar()

        barEl.classList.toggle('is-expanded', searchExpanded)

        // Counter text
        if (counterEl) {
          if (searchKeyword) {
            if (searchMarkEls.length > 0) {
              counterEl.textContent = `${currentMatchIdx + 1}/${searchMarkEls.length}`
              counterEl.title = `第 ${currentMatchIdx + 1}/${searchMarkEls.length} 处匹配 (分布在 ${searchMatches.length} 轮对话中)`
            } else {
              counterEl.textContent = '无匹配'
              counterEl.title = '当前会话中未找到匹配内容'
            }
            counterEl.style.display = 'inline'
          } else {
            counterEl.textContent = ''
            counterEl.style.display = 'none'
          }
        }
      }

      // ── Main Loop & Sync Interval ─────────────────────────────────────────
      reloadBookmarks()
      ensureControlBar()
      ensurePopover()
      ensureLeftBookmarkRail()

      // 刻意不注册任何全局快捷键。
      // 历史问题：曾经在 window 上劫持 "/" 展开搜索，并调用 preventDefault()，
      // 结果（1）抢占了宿主 DSH 保留的斜杠命令/技能触发键，
      // （2）焦点不在 INPUT/TEXTAREA 时（如 contenteditable 正文）直接打不出 "/"。
      // 搜索入口一律走鼠标：右上角搜索按钮展开，面板内 × 关闭。
      // 仅保留搜索框内部的局部按键（Enter / Shift+Enter 跳转、Esc 收起），
      // 那只在用户已点开搜索框并聚焦其中时生效，不劫持全局键盘。

      let loopTimer = null
      function tick() {
        const currentSid = getSessionIdFromEnvironment(sessionsRef)
        if (currentSid !== activeSessionId) {
          activeSessionId = currentSid
          clearHighlights()
          reloadBookmarks()
          searchKeyword = ''
          searchMarkEls = []
          searchMatches = []
          currentMatchIdx = 0
          if (searchInputEl) searchInputEl.value = ''
          renderControlBarState()
        }
        mountControlBar()
        updateRailMarks()
        updateLeftBookmarkRail()
        injectMessageStarButtons()
        renderControlBarState()
      }

      loopTimer = setInterval(tick, 500)
      tick()

      let enhanceTimer = null
      const runEnhance = () => {
        if (observer) observer.disconnect()
        try {
          mountControlBar()
          updateRailMarks()
          updateLeftBookmarkRail()
          injectMessageStarButtons()
          if (searchKeyword) {
            const live = getLiveMarks()
            const hasDetached = live.length === 0 || live.length !== searchMarkEls.length || searchMarkEls.some((el) => !document.body.contains(el))
            if (hasDetached) {
              highlightAllMatches(searchKeyword)
            } else if (live[currentMatchIdx] && !live[currentMatchIdx].classList.contains('dsh-tb-kw-active')) {
              live[currentMatchIdx].classList.add('dsh-tb-kw-active')
            }
          }
        } finally {
          if (observer) observer.observe(document.body, { childList: true, subtree: true })
        }
      }

      const observer = new MutationObserver(() => {
        if (enhanceTimer) return
        enhanceTimer = setTimeout(() => {
          enhanceTimer = null
          runEnhance()
        }, 150)
      })
      observer.observe(document.body, { childList: true, subtree: true })

      return () => {
        if (loopTimer) clearInterval(loopTimer)
        observer.disconnect()
        clearHighlights()
        if (popoverCloseTimer) clearTimeout(popoverCloseTimer)
        popoverEl?.remove()
        leftRailEl?.remove()
        document.getElementById(CSS_ID)?.remove()
        barEl?.remove()
      }
    }

    module.exports.apply = apply
    module.exports.inject = ['sessions', 'locale']
    return module.exports
  },
})
