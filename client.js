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
[class*="_preview"] {
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

[data-ds-dark-theme] [class*="_preview"],
[data-theme="dark"] [class*="_preview"],
html.dark [class*="_preview"] {
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
  position: absolute;
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
  max-width: 240px;
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
                  updateControlBar()
                }
              }
            })
            .catch(() => {})
        }
      }

      function toggleBookmark(turn) {
        if (!Number.isSafeInteger(turn)) return
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
        updateControlBar()
        enhancePreviewCard()
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
        const promptEl = preview.querySelector('[class*="previewPrompt"]')
        const hoveredMark = document.querySelector('button[class*="mark"]:hover, [class*="markPosition"]:hover button')
        if (hoveredMark) {
          currentTurn = parseTurnNumber(hoveredMark)
        } else if (promptEl) {
          const m = (promptEl.textContent || '').match(/第\s*(\d+)\s*轮/) || (promptEl.textContent || '').match(/turn\s*(\d+)/i)
          if (m) currentTurn = parseInt(m[1], 10)
        }

        if (currentTurn === null) return

        if (!cardHeader) {
          cardHeader = document.createElement('div')
          cardHeader.className = 'dsh-tb-card-header'
          preview.insertBefore(cardHeader, preview.firstChild)
        }

        const isStarred = starredTurns.has(currentTurn)

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
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
          toggleBookmark(currentTurn)
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
          updateControlBar()
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
                // If backend matched anything, we notify or keep results
                updateControlBar()
              }
            })
            .catch(() => {})
        }

        updateRailMarks()
        updateControlBar()
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
        updateControlBar()
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

      // ── Top Control Bar ───────────────────────────────────────────────────
      function updateControlBar() {
        let bar = document.querySelector('.dsh-tb-bar')
        if (!bar) {
          const parent = document.querySelector('[class*="scroll"], [data-chat-flow]')?.parentElement || document.body
          bar = document.createElement('div')
          bar.className = 'dsh-tb-bar'
          parent.appendChild(bar)
        }

        const starCount = starredTurns.size
        const starBtnHtml = `
          <button class="dsh-tb-btn dsh-tb-filter-btn ${filterOnlyStarred ? 'active' : ''}" title="${filterOnlyStarred ? '显示所有轮次' : '仅看已收藏轮次'}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="${filterOnlyStarred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span>收藏${starCount > 0 ? ` (${starCount})` : ''}</span>
          </button>
        `

        let matchCounterText = ''
        if (searchQuery) {
          matchCounterText = searchMatches.length > 0
            ? `${currentMatchIdx + 1}/${searchMatches.length} 轮`
            : '无匹配'
        }

        bar.innerHTML = `
          ${starBtnHtml}
          <div class="dsh-tb-divider"></div>
          <button class="dsh-tb-btn dsh-tb-search-toggle ${searchExpanded ? 'active' : ''}" title="搜索本会话内容 (快捷键 / 或 Cmd+F)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span>${searchExpanded ? '' : '搜索'}</span>
          </button>
          <div class="dsh-tb-search-wrap ${searchExpanded ? 'expanded' : ''}">
            <input class="dsh-tb-input" type="text" placeholder="搜索本会话..." value="${searchQuery}" />
            ${searchQuery ? `<span class="dsh-tb-counter">${matchCounterText}</span>` : ''}
            <button class="dsh-tb-nav-btn dsh-tb-prev-btn" title="上一个匹配项 (Shift+Enter)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
            </button>
            <button class="dsh-tb-nav-btn dsh-tb-next-btn" title="下一个匹配项 (Enter)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <button class="dsh-tb-nav-btn dsh-tb-close-btn" title="关闭搜索 (Esc)">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        `

        // Bind events
        const filterBtn = bar.querySelector('.dsh-tb-filter-btn')
        filterBtn.onclick = () => {
          filterOnlyStarred = !filterOnlyStarred
          updateRailMarks()
          updateControlBar()
        }

        const searchToggle = bar.querySelector('.dsh-tb-search-toggle')
        const searchInput = bar.querySelector('.dsh-tb-input')
        searchToggle.onclick = () => {
          searchExpanded = !searchExpanded
          updateControlBar()
          if (searchExpanded) {
            setTimeout(() => {
              const inp = bar.querySelector('.dsh-tb-input')
              inp?.focus()
            }, 60)
          } else {
            searchQuery = ''
            executeSearch('')
          }
        }

        if (searchInput) {
          searchInput.oninput = (e) => {
            executeSearch(e.target.value)
          }
          searchInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
              if (e.shiftKey) prevMatch()
              else nextMatch()
            } else if (e.key === 'Escape') {
              searchExpanded = false
              searchQuery = ''
              executeSearch('')
            }
          }
        }

        const prevBtn = bar.querySelector('.dsh-tb-prev-btn')
        if (prevBtn) prevBtn.onclick = prevMatch

        const nextBtn = bar.querySelector('.dsh-tb-next-btn')
        if (nextBtn) nextBtn.onclick = nextMatch

        const closeBtn = bar.querySelector('.dsh-tb-close-btn')
        if (closeBtn) closeBtn.onclick = () => {
          searchExpanded = false
          searchQuery = ''
          executeSearch('')
        }
      }

      // ── Main Loop & Sync Interval ─────────────────────────────────────────
      reloadBookmarks()

      let loopTimer = null
      function tick() {
        const currentSid = getSessionIdFromEnvironment(sessionsRef)
        if (currentSid !== activeSessionId) {
          activeSessionId = currentSid
          reloadBookmarks()
          searchQuery = ''
          searchMatches = []
          currentMatchIdx = 0
        }
        updateRailMarks()
        enhancePreviewCard()
        updateControlBar()
      }

      loopTimer = setInterval(tick, 350)
      tick()

      // Watch DOM mutations to snap preview enhancements instantly
      const observer = new MutationObserver(() => {
        updateRailMarks()
        enhancePreviewCard()
      })
      observer.observe(document.body, { childList: true, subtree: true })

      return () => {
        if (loopTimer) clearInterval(loopTimer)
        observer.disconnect()
        document.getElementById(CSS_ID)?.remove()
        document.querySelector('.dsh-tb-bar')?.remove()
      }
    }

    module.exports.apply = apply
    module.exports.inject = ['sessions', 'locale']
    return module.exports
  },
})
