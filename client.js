// dsh-turn-bookmarks — client half.
//
// Native Turn Rail Enhancer:
// 1. Rock-solid Turn Identification & Numbering (SSOT via native aria-labels).
// 2. Turn Bookmarking (⭐) with luminous golden rail highlights and session persistence.
// 3. Fast In-Session Search with real-time match counter, rail navigation, and full turn jumping.
// 4. Starred-only filter mode to quickly browse flagged milestones.

window.__ModuleLoader__.load({
  id: 'dsh-turn-bookmarks',
  factory: (require) => {
    const module = { exports: {} }

    const CSS_ID = 'dsh-turn-bookmarks/style.css'
    const STORAGE_KEY = 'dsh_turn_bookmarks_v1'

    const STYLES = `
/* ==================== 1. Native Preview Card Enhancement ==================== */
[role="tooltip"]:has([class*="previewPrompt"]),
nav[aria-label*="轮次"] [role="tooltip"],
nav[aria-label*="turn" i] [role="tooltip"] {
  pointer-events: auto !important; /* Allow mouse interaction with card buttons */
  overflow: visible !important;
  max-height: none !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16) !important;
  border: 1px solid var(--dsw-alias-border-l4, rgba(128, 128, 128, 0.22)) !important;
  border-radius: 10px !important;
  background: var(--dsw-alias-surface-overlay, #ffffff) !important;
  transition: opacity 0.12s ease-out, transform 0.12s ease-out !important;
  z-index: 1000 !important;
}

[data-ds-dark-theme] [role="tooltip"]:has([class*="previewPrompt"]),
[data-theme="dark"] [role="tooltip"]:has([class*="previewPrompt"]),
html.dark [role="tooltip"]:has([class*="previewPrompt"]) {
  background: #1e2430 !important;
  border-color: rgba(255, 255, 255, 0.14) !important;
}

.dsh-tb-card-header {
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
  padding: 3px 7px !important;
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

/* ==================== 2. Turn Rail Mark Golden / Matched Highlights ==================== */
/* Starred marks: Glowing warm gold bar */
.dsh-tb-mark-starred:before,
[class*="mark"].dsh-tb-mark-starred:before,
[class*="markPosition"].dsh-tb-pos-starred [class*="mark"]:before {
  background: #f59e0b !important;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.95), 0 0 2px #d97706 !important;
  width: 22px !important;
  height: 3px !important;
  border-radius: 3px !important;
  opacity: 1 !important;
}

/* Starred mark tiny indicator diamond */
.dsh-tb-mark-starred:after,
[class*="mark"].dsh-tb-mark-starred:after {
  content: "★" !important;
  position: absolute !important;
  right: 25px !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  font-size: 10px !important;
  color: #f59e0b !important;
  line-height: 1 !important;
  pointer-events: none !important;
  text-shadow: 0 0 4px rgba(245, 158, 11, 0.6) !important;
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

/* Filter mode: dimmed unstarred marks */
.dsh-tb-filter-starred [class*="markPosition"]:not(.dsh-tb-pos-starred) [class*="mark"]:before {
  opacity: 0.1 !important;
}

/* ==================== 3. Top Floating Control Bar ==================== */
.dsh-tb-bar {
  position: fixed;
  top: 10px;
  right: 18px;
  z-index: 100;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--dsw-alias-surface-overlay, #ffffff);
  border: 1px solid var(--dsw-alias-border-l4, rgba(128, 128, 128, 0.22));
  border-radius: 8px;
  padding: 3px 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  user-select: none;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: box-shadow 0.15s ease;
}

[data-ds-dark-theme] .dsh-tb-bar,
[data-theme="dark"] .dsh-tb-bar,
html.dark .dsh-tb-bar {
  background: rgba(30, 36, 48, 0.92);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
}

.dsh-tb-btn {
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #6e7781);
  cursor: pointer;
  height: 24px;
  padding: 0 6px;
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  line-height: 1;
  transition: all 0.12s ease;
  white-space: nowrap;
}

.dsh-tb-btn:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.12));
  color: var(--dsw-alias-label-primary, #24292f);
}

[data-ds-dark-theme] .dsh-tb-btn:hover,
[data-theme="dark"] .dsh-tb-btn:hover,
html.dark .dsh-tb-btn:hover {
  color: #f3f4f6;
}

.dsh-tb-btn.active {
  background: rgba(245, 158, 11, 0.18) !important;
  color: #d97706 !important;
  font-weight: 600;
}

[data-ds-dark-theme] .dsh-tb-btn.active,
[data-theme="dark"] .dsh-tb-btn.active,
html.dark .dsh-tb-btn.active {
  color: #fbbf24 !important;
}

.dsh-tb-btn.active svg {
  fill: #f59e0b;
}

.dsh-tb-divider {
  width: 1px;
  height: 14px;
  background: var(--dsw-alias-border-l4, rgba(128, 128, 128, 0.2));
  margin: 0 1px;
}

/* Search box expansion */
.dsh-tb-search-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  transition: max-width 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
  max-width: 0;
}

.dsh-tb-search-wrap.expanded {
  max-width: 260px;
}

.dsh-tb-input {
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-primary, inherit);
  font-size: 12px;
  outline: none;
  width: 120px;
  padding: 2px 4px;
}

.dsh-tb-input::placeholder {
  color: var(--dsw-alias-label-tertiary, #9ca3af);
}

.dsh-tb-counter {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #6b7280);
  padding: 0 4px;
  white-space: nowrap;
}

.dsh-tb-nav-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  width: 18px;
  height: 18px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dsw-alias-label-secondary, #6e7781);
  padding: 0;
}

.dsh-tb-nav-btn:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.15));
  color: var(--dsw-alias-label-primary, #111827);
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
      let filterOnlyStarred = false
      let searchQuery = ''
      let searchMatches = []
      let currentMatchIdx = 0
      let searchExpanded = false

      let barEl = null
      let filterBtnEl = null
      let filterSpanEl = null
      let searchToggleEl = null
      let searchWrapEl = null
      let searchInputEl = null
      let counterEl = null

      function reloadBookmarks() {
        activeSessionId = getSessionIdFromEnvironment(sessionsRef)
        const all = getStoredBookmarks()
        const list = Array.isArray(all[activeSessionId]) ? all[activeSessionId] : []
        starredTurns = new Set(list)
        // Also sync from backend asynchronously
        if (activeSessionId && activeSessionId !== 'default') {
          fetch(`/dsh-turn-bookmarks/bookmarks?sessionId=${encodeURIComponent(activeSessionId)}`)
            .then((r) => r.json())
            .then((res) => {
              if (res.ok && Array.isArray(res.bookmarks)) {
                let changed = false
                for (const t of res.bookmarks) {
                  if (!starredTurns.has(t)) {
                    starredTurns.add(t)
                    changed = true
                  }
                }
                if (changed) {
                  const m = getStoredBookmarks()
                  m[activeSessionId] = [...starredTurns].sort((a, b) => a - b)
                  saveStoredBookmarks(m)
                  updateRailMarks()
                  renderControlBarState()
                }
              }
            })
            .catch(() => {})
        }
      }

      function toggleBookmark(turn) {
        if (!Number.isSafeInteger(turn)) return
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
        enhancePreviewCard()
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

      // ── Rail Marks Synchronizer ───────────────────────────────────────────
      function updateRailMarks() {
        const frame = document.querySelector('[class*="frame"], nav[aria-label*="轮次"], nav[aria-label*="turn" i]')
        if (!frame) return

        if (filterOnlyStarred) {
          frame.classList.add('dsh-tb-filter-starred')
        } else {
          frame.classList.remove('dsh-tb-filter-starred')
        }

        const markButtons = Array.from(frame.querySelectorAll('button[class*="mark"]'))
        markButtons.forEach((btn) => {
          const turn = parseTurnNumber(btn)
          if (turn === null) return

          btn.dataset.dshTurn = String(turn)
          const pos = btn.closest('[class*="markPosition"]')
          if (pos) pos.dataset.dshTurn = String(turn)

          // Bind click with shift/alt on mark to quick star/unstar!
          if (!btn.dataset.dshTbBound) {
            btn.dataset.dshTbBound = '1'
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

          // 1. Starred status
          if (starredTurns.has(turn)) {
            btn.classList.add('dsh-tb-mark-starred')
            if (pos) pos.classList.add('dsh-tb-pos-starred')
          } else {
            btn.classList.remove('dsh-tb-mark-starred')
            if (pos) pos.classList.remove('dsh-tb-pos-starred')
          }

          // 2. Search match status
          const isMatch = searchMatches.includes(turn)
          const isCurrent = isMatch && searchMatches[currentMatchIdx] === turn

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

      // ── Preview Card Enhancer ─────────────────────────────────────────────
      function enhancePreviewCard() {
        const preview = document.querySelector('[role="tooltip"][class*="preview"], [class*="_preview"]:has([class*="previewPrompt"])')
        if (!preview) return

        let cardHeader = preview.querySelector('.dsh-tb-card-header')
        // Find which turn is currently previewed
        let currentTurn = null
        const activeMark = document.querySelector('button[class*="mark"][aria-describedby]') ||
                           document.querySelector('button[class*="mark"]:hover, [class*="markPosition"]:hover button')
        if (activeMark) {
          currentTurn = parseTurnNumber(activeMark)
        } else if (cardHeader && cardHeader.dataset.dshCardTurn) {
          currentTurn = parseInt(cardHeader.dataset.dshCardTurn, 10)
        } else {
          const promptEl = preview.querySelector('[class*="previewPrompt"]')
          if (promptEl) {
            const m = (promptEl.textContent || '').match(/第\s*(\d+)\s*轮/) || (promptEl.textContent || '').match(/turn\s*(\d+)/i)
            if (m) currentTurn = parseInt(m[1], 10)
          }
        }

        if (currentTurn === null) return

        if (!cardHeader) {
          cardHeader = document.createElement('div')
          cardHeader.className = 'dsh-tb-card-header'
          preview.insertBefore(cardHeader, preview.firstChild)
        }

        preview.onmouseenter = () => {
          activeMark?.focus()
        }
        preview.onmouseleave = () => {
          activeMark?.blur()
        }

        const isStarred = starredTurns.has(currentTurn)

        // Only update if turn changed or star state changed to prevent DOM thrashing
        if (cardHeader.dataset.dshCardTurn === String(currentTurn) && cardHeader.dataset.dshStarred === String(isStarred)) {
          return
        }
        cardHeader.dataset.dshCardTurn = String(currentTurn)
        cardHeader.dataset.dshStarred = String(isStarred)

        cardHeader.innerHTML = `
          <span class="dsh-tb-turn-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            第 ${currentTurn} 轮对话
          </span>
          <div class="dsh-tb-card-actions">
            <button class="dsh-tb-card-btn dsh-tb-star-toggle ${isStarred ? 'dsh-tb-starred' : ''}" title="${isStarred ? '取消收藏' : '收藏此轮'}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="${isStarred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              <span>${isStarred ? '已收藏' : '收藏'}</span>
            </button>
            <button class="dsh-tb-card-btn dsh-tb-copy-toggle" title="复制问答正文">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>复制</span>
            </button>
          </div>
        `

        const starBtn = cardHeader.querySelector('.dsh-tb-star-toggle')
        starBtn.onclick = (e) => {
          e.stopPropagation()
          const turn = parseInt(cardHeader.dataset.dshCardTurn, 10)
          if (Number.isSafeInteger(turn)) toggleBookmark(turn)
        }

        const copyBtn = cardHeader.querySelector('.dsh-tb-copy-toggle')
        copyBtn.onclick = (e) => {
          e.stopPropagation()
          const promptText = preview.querySelector('[class*="previewPrompt"]')?.textContent || ''
          const respText = preview.querySelector('[class*="previewResponse"]')?.textContent || ''
          const full = `### 第 ${currentTurn} 轮\n**提问**: ${promptText}\n\n**回复**: ${respText}`.trim()
          navigator?.clipboard?.writeText?.(full)?.then(() => {
            const span = copyBtn.querySelector('span')
            if (span) span.textContent = '已复制'
            setTimeout(() => {
              if (span) span.textContent = '复制'
            }, 1400)
          })
        }
      }

      // ── In-Session Search Logic ───────────────────────────────────────────
      function executeSearch(query) {
        searchQuery = query.trim().toLowerCase()
        if (!searchQuery) {
          searchMatches = []
          currentMatchIdx = 0
          updateRailMarks()
          renderControlBarState()
          return
        }

        // 1. Scan currently loaded DOM turns
        const matchedTurnsSet = new Set()
        const rows = Array.from(document.querySelectorAll('[data-chat-turn]'))
        for (const row of rows) {
          const turn = parseInt(row.dataset.chatTurn || '', 10)
          if (!Number.isSafeInteger(turn)) continue
          const text = (row.textContent || '').toLowerCase()
          if (text.includes(searchQuery)) {
            matchedTurnsSet.add(turn)
          }
        }

        // 2. Also check preview prompt texts on the rail items if available
        const allMarks = Array.from(document.querySelectorAll('button[class*="mark"]'))
        for (const btn of allMarks) {
          const turn = parseTurnNumber(btn)
          if (turn !== null && (btn.getAttribute('aria-label') || '').toLowerCase().includes(searchQuery)) {
            matchedTurnsSet.add(turn)
          }
        }

        searchMatches = [...matchedTurnsSet].sort((a, b) => a - b)
        if (searchMatches.length > 0 && currentMatchIdx >= searchMatches.length) {
          currentMatchIdx = 0
        }

        // 3. Fallback: Query backend SQLite FTS in background if session matches
        if (activeSessionId && activeSessionId !== 'default') {
          fetch(`/dsh-turn-bookmarks/search?sessionId=${encodeURIComponent(activeSessionId)}&q=${encodeURIComponent(searchQuery)}`)
            .then((r) => r.json())
            .then((res) => {
              if (res.ok && Array.isArray(res.matches)) {
                renderControlBarState()
              }
            })
            .catch(() => {})
        }

        updateRailMarks()
        renderControlBarState()
      }

      function jumpToCurrentMatch() {
        if (searchMatches.length === 0) return
        const targetTurn = searchMatches[currentMatchIdx]
        if (!Number.isSafeInteger(targetTurn)) return

        // Click the native rail mark button to trigger official scroll & load-earlier!
        const mark = document.querySelector(`button[class*="mark"][data-dsh-turn="${targetTurn}"]`) ||
          Array.from(document.querySelectorAll('button[class*="mark"]')).find((b) => parseTurnNumber(b) === targetTurn)

        if (mark) {
          mark.click()
        }

        // Highlight matched message row in DOM if present
        setTimeout(() => {
          const row = document.querySelector(`[data-chat-turn="${targetTurn}"]`)
          if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' })
            row.classList.add('dsh-tb-highlight-target')
            setTimeout(() => row.classList.remove('dsh-tb-highlight-target'), 2000)
          }
        }, 120)

        updateRailMarks()
        renderControlBarState()
      }

      function nextMatch() {
        if (searchMatches.length === 0) return
        currentMatchIdx = (currentMatchIdx + 1) % searchMatches.length
        jumpToCurrentMatch()
      }

      function prevMatch() {
        if (searchMatches.length === 0) return
        currentMatchIdx = (currentMatchIdx - 1 + searchMatches.length) % searchMatches.length
        jumpToCurrentMatch()
      }

      // ── Create Control Bar DOM Once ───────────────────────────────────────
      function ensureControlBar() {
        // Clean up any stale duplicate bars
        const existingBars = document.querySelectorAll('.dsh-tb-bar')
        if (existingBars.length > 1) {
          for (let i = 1; i < existingBars.length; i++) existingBars[i].remove()
        }

        if (barEl && document.body.contains(barEl)) return barEl

        barEl = document.createElement('div')
        barEl.className = 'dsh-tb-bar'

        // 1. Filter Button
        filterBtnEl = document.createElement('button')
        filterBtnEl.className = 'dsh-tb-btn dsh-tb-filter-btn'
        filterBtnEl.title = '仅看已收藏轮次'
        filterBtnEl.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <span>收藏</span>
        `
        filterSpanEl = filterBtnEl.querySelector('span')
        filterBtnEl.onclick = () => {
          filterOnlyStarred = !filterOnlyStarred
          updateRailMarks()
          renderControlBarState()
        }
        barEl.appendChild(filterBtnEl)

        // 1.5 Quick star current turn button
        const starCurrentBtn = document.createElement('button')
        starCurrentBtn.className = 'dsh-tb-btn dsh-tb-star-current'
        starCurrentBtn.title = '收藏/取消收藏当前阅读轮次'
        starCurrentBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>收藏本轮</span>
        `
        starCurrentBtn.onclick = () => {
          const activeMark = document.querySelector('button[class*="mark"][aria-current="true"]')
          let turn = activeMark ? parseTurnNumber(activeMark) : null
          if (turn === null) {
            const rows = Array.from(document.querySelectorAll('[data-chat-turn]'))
            const lastRow = rows[rows.length - 1]
            if (lastRow) turn = parseInt(lastRow.dataset.chatTurn || '', 10)
          }
          if (Number.isSafeInteger(turn)) toggleBookmark(turn)
        }
        barEl.appendChild(starCurrentBtn)

        // Divider
        const div = document.createElement('div')
        div.className = 'dsh-tb-divider'
        barEl.appendChild(div)

        // 2. Search Toggle Button
        searchToggleEl = document.createElement('button')
        searchToggleEl.className = 'dsh-tb-btn dsh-tb-search-toggle'
        searchToggleEl.title = '搜索本会话内容 (快捷键 / 或 Cmd+F)'
        searchToggleEl.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>搜索</span>
        `
        searchToggleEl.onclick = () => {
          searchExpanded = !searchExpanded
          renderControlBarState()
          if (searchExpanded) {
            setTimeout(() => searchInputEl?.focus(), 60)
          } else {
            searchQuery = ''
            executeSearch('')
          }
        }
        barEl.appendChild(searchToggleEl)

        // 3. Search Wrap
        searchWrapEl = document.createElement('div')
        searchWrapEl.className = 'dsh-tb-search-wrap'

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
            searchQuery = ''
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
        prevBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="18 15 12 9 6 15"></polyline></svg>'
        prevBtn.onclick = prevMatch
        searchWrapEl.appendChild(prevBtn)

        const nextBtn = document.createElement('button')
        nextBtn.className = 'dsh-tb-nav-btn'
        nextBtn.title = '下一个匹配项 (Enter)'
        nextBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>'
        nextBtn.onclick = nextMatch
        searchWrapEl.appendChild(nextBtn)

        const closeBtn = document.createElement('button')
        closeBtn.className = 'dsh-tb-nav-btn'
        closeBtn.title = '关闭搜索 (Esc)'
        closeBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
        closeBtn.onclick = () => {
          searchExpanded = false
          searchQuery = ''
          executeSearch('')
        }
        searchWrapEl.appendChild(closeBtn)

        barEl.appendChild(searchWrapEl)
        document.body.appendChild(barEl)

        renderControlBarState()
        return barEl
      }

      // ── Update State without destroying DOM ────────────────────────────────
      function renderControlBarState() {
        if (!barEl) ensureControlBar()
        if (!filterBtnEl) return

        // 1. Star button
        const count = starredTurns.size
        filterBtnEl.classList.toggle('active', filterOnlyStarred)
        if (filterSpanEl) {
          filterSpanEl.textContent = `收藏${count > 0 ? ` (${count})` : ''}`
        }
        filterBtnEl.title = filterOnlyStarred ? '显示所有轮次' : '仅看已收藏轮次'

        // 2. Search expanded
        searchToggleEl?.classList.toggle('active', searchExpanded)
        searchWrapEl?.classList.toggle('expanded', searchExpanded)
        if (searchToggleEl) {
          const span = searchToggleEl.querySelector('span')
          if (span) span.textContent = searchExpanded ? '' : '搜索'
        }

        // 3. Counter text
        if (counterEl) {
          if (searchQuery) {
            counterEl.textContent = searchMatches.length > 0
              ? `${currentMatchIdx + 1}/${searchMatches.length} 轮`
              : '无匹配'
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

      let loopTimer = null
      function tick() {
        const currentSid = getSessionIdFromEnvironment(sessionsRef)
        if (currentSid !== activeSessionId) {
          activeSessionId = currentSid
          reloadBookmarks()
          searchQuery = ''
          searchMatches = []
          currentMatchIdx = 0
          renderControlBarState()
        }
        updateRailMarks()
        enhancePreviewCard()
        injectMessageStarButtons()
        renderControlBarState()
      }

      loopTimer = setInterval(tick, 500)
      tick()

      let enhanceTimer = null
      const runEnhance = () => {
        if (observer) observer.disconnect()
        try {
          updateRailMarks()
          enhancePreviewCard()
          injectMessageStarButtons()
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
        document.getElementById(CSS_ID)?.remove()
        barEl?.remove()
      }
    }

    module.exports.apply = apply
    module.exports.inject = ['sessions', 'locale']
    return module.exports
  },
})
