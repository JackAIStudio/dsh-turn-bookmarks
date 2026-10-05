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
  width: 28px !important;
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

/* 纯数字微型胶囊 (形态 1：带五角星收藏标，纯数字加粗，暖金质感) */
.dsh-tb-left-capsule {
  position: absolute !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 20px !important;
  min-width: 22px !important;
  padding: 0 4px !important;
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

.dsh-tb-capsule-star {
  display: none !important;
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

/* ==================== 5. Header Action Control Bar (与 DSH 官方极简调性对齐) ==================== */
.dsh-tb-search-container {
  display: inline-flex !important;
  align-items: center !important;
  position: relative !important;
  margin-left: 10px !important;
  margin-top: 0 !important;
  margin-bottom: 7px !important; /* 与 tab 文字基线水平居中自然呼应，绝不下坠越过底部蓝线 */
  align-self: flex-end !important;
  height: 24px !important;
  z-index: 10 !important;
  user-select: none !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  box-sizing: border-box !important;
}

/* 折叠状态下的微型 Ghost 图标按钮 (无实体突兀背景、无边框、无阴影) */
.dsh-tb-search-trigger {
  width: 24px !important;
  height: 24px !important;
  padding: 0 !important;
  border-radius: 6px !important;
  border: none !important;
  background: transparent !important;
  color: var(--dsw-alias-label-tertiary, #8c8c8c) !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: background-color 0.15s ease, color 0.15s ease !important;
  box-shadow: none !important;
  box-sizing: border-box !important;
}

.dsh-tb-search-trigger:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.05)) !important;
  color: var(--dsw-alias-label-primary, #1e2328) !important;
  border: none !important;
  box-shadow: none !important;
  transform: none !important;
}

[data-ds-dark-theme] .dsh-tb-search-trigger,
[data-theme="dark"] .dsh-tb-search-trigger,
html.dark .dsh-tb-search-trigger {
  background: transparent !important;
  border: none !important;
  color: #94a3b8 !important;
  box-shadow: none !important;
}

[data-ds-dark-theme] .dsh-tb-search-trigger:hover,
[data-theme="dark"] .dsh-tb-search-trigger:hover,
html.dark .dsh-tb-search-trigger:hover {
  background: rgba(255, 255, 255, 0.08) !important;
  color: #f1f5f9 !important;
}

/* 展开状态的搜索输入胶囊 (原生现代极简，高度 26px，柔和边框，无刺眼黄框) */
.dsh-tb-search-expanded {
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  height: 26px !important;
  width: 24px !important;
  overflow: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  border-radius: 6px !important;
  border: 1px solid var(--dsw-alias-border-l4, rgba(0, 0, 0, 0.12)) !important;
  background: var(--dsw-alias-surface-overlay, #ffffff) !important;
  padding: 0 !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
  transition: width 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.15s ease, padding 0.2s ease !important;
  position: absolute !important;
  left: 0 !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  box-sizing: border-box !important;
}

.dsh-tb-search-container.is-expanded .dsh-tb-search-trigger {
  opacity: 0 !important;
  pointer-events: none !important;
  visibility: hidden !important;
}

.dsh-tb-search-container.is-expanded .dsh-tb-search-expanded {
  width: 236px !important;
  opacity: 1 !important;
  pointer-events: auto !important;
  padding: 0 5px 0 7px !important;
  border-color: var(--dsw-alias-state-business-primary, #3b82f6) !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06) !important;
}

[data-ds-dark-theme] .dsh-tb-search-expanded,
[data-theme="dark"] .dsh-tb-search-expanded,
html.dark .dsh-tb-search-expanded {
  background: #1e2430 !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

[data-ds-dark-theme] .dsh-tb-search-container.is-expanded .dsh-tb-search-expanded,
[data-theme="dark"] .dsh-tb-search-container.is-expanded .dsh-tb-search-expanded,
html.dark .dsh-tb-search-container.is-expanded .dsh-tb-search-expanded {
  border-color: #60a5fa !important;
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2), 0 4px 14px rgba(0, 0, 0, 0.4) !important;
}

.dsh-tb-input {
  border: none !important;
  background: transparent !important;
  color: var(--dsw-alias-label-primary, inherit) !important;
  font-size: 12px !important;
  outline: none !important;
  width: 105px !important;
  padding: 0 !important;
  flex: 1 !important;
  min-width: 0 !important;
  font-family: inherit !important;
}

.dsh-tb-input::placeholder {
  color: var(--dsw-alias-label-tertiary, #9ca3af) !important;
  font-size: 12px !important;
}

.dsh-tb-counter {
  font-size: 11px !important;
  color: var(--dsw-alias-label-tertiary, #64748b) !important;
  padding: 0 3px !important;
  white-space: nowrap !important;
  flex: none !important;
  font-variant-numeric: tabular-nums !important;
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
  color: var(--dsw-alias-label-secondary, #64748b) !important;
  padding: 0 !important;
  flex: none !important;
  transition: background-color 0.12s ease, color 0.12s ease !important;
}

.dsh-tb-nav-btn:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.06)) !important;
  color: var(--dsw-alias-label-primary, #0f172a) !important;
}

[data-ds-dark-theme] .dsh-tb-nav-btn:hover,
[data-theme="dark"] .dsh-tb-nav-btn:hover,
html.dark .dsh-tb-nav-btn:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #f8fafc !important;
}

/* Flash highlight on jump target message bubble */
@keyframes dshTbTargetFlash {
  0% { outline: 2px solid rgba(59, 130, 246, 0.65); background: rgba(59, 130, 246, 0.05); }
  60% { outline: 2px solid rgba(59, 130, 246, 0.3); }
  100% { outline: 2px solid transparent; background: transparent; }
}

.dsh-tb-highlight-target {
  animation: dshTbTargetFlash 1.4s ease-out !important;
  border-radius: 8px !important;
}

/* ==================== 6. In-Session Keyword Highlights ==================== */
mark.dsh-tb-kw {
  background: rgba(254, 240, 138, 0.65) !important;
  color: inherit !important;
  border-radius: 3px !important;
  padding: 1px 2px !important;
  margin: 0 !important;
  text-decoration: none !important;
  transition: all 0.12s ease !important;
  display: inline !important;
}

[data-ds-dark-theme] mark.dsh-tb-kw,
[data-theme="dark"] mark.dsh-tb-kw,
html.dark mark.dsh-tb-kw {
  background: rgba(234, 179, 8, 0.32) !important;
  color: #fef08a !important;
}

/* Current focused search match: 清晰、稳重、不晃动 */
mark.dsh-tb-kw.dsh-tb-kw-active {
  background: #fde047 !important;
  color: #0f172a !important;
  font-weight: 600 !important;
  box-shadow: 0 0 0 1.5px #f59e0b, 0 1px 4px rgba(245, 158, 11, 0.35) !important;
  z-index: 10 !important;
  position: relative !important;
}

[data-ds-dark-theme] mark.dsh-tb-kw.dsh-tb-kw-active,
[data-theme="dark"] mark.dsh-tb-kw.dsh-tb-kw-active,
html.dark mark.dsh-tb-kw.dsh-tb-kw-active {
  background: #fbbf24 !important;
  color: #09090b !important;
  box-shadow: 0 0 0 1.5px #f59e0b, 0 1px 6px rgba(251, 191, 36, 0.45) !important;
}

@keyframes dshTbKwActivePulse {
  0% { transform: scale(1); filter: brightness(1); }
  100% { transform: scale(1.08); filter: brightness(1.2); }
}

/* ==================== 8. Message Prompt Inline Editor & Edit Button ==================== */

.dsh-tb-ref-bar {
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 4px 6px !important;
  background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, 0.04)) !important;
  border: 1px dashed var(--dsw-alias-border-l3, rgba(128, 128, 128, 0.2)) !important;
  border-radius: 6px !important;
}

.dsh-tb-ref-label {
  font-size: 11px !important;
  color: var(--dsw-alias-label-tertiary, #64748b) !important;
  user-select: none !important;
  display: flex !important;
  align-items: center !important;
  gap: 3px !important;
}

.dsh-tb-ref-chip {
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  padding: 2px 7px !important;
  border-radius: 4px !important;
  background: var(--dsw-alias-state-business-tertiary, rgba(37, 99, 235, 0.12)) !important;
  color: var(--dsw-alias-state-business-primary, #3b82f6) !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  line-height: 1.4 !important;
  user-select: none !important;
}

.dsh-tb-ref-icon {
  width: 13px !important;
  height: 13px !important;
  flex: none !important;
  display: inline-block !important;
  vertical-align: middle !important;
}

.dsh-tb-ref-close {
  cursor: pointer !important;
  margin-left: 2px !important;
  font-size: 13px !important;
  opacity: 0.65 !important;
  line-height: 1 !important;
}

.dsh-tb-ref-close:hover {
  opacity: 1 !important;
  color: #ef4444 !important;
}

.dsh-tb-msg-edit {
  border: none !important;
  background: transparent !important;
  cursor: pointer !important;
  padding: 3px 4px !important;
  border-radius: 4px !important;
  font-size: 11.5px !important;
  color: var(--dsw-alias-label-tertiary, #6e7781) !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  line-height: 1 !important;
  transition: all 0.15s ease !important;
}

.dsh-tb-msg-edit:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.15)) !important;
  color: var(--dsw-alias-brand-primary, #3b82f6) !important;
}

.dsh-tb-inline-editor {
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
  width: 100% !important;
  margin-top: 4px !important;
  animation: dshTbFadeIn 0.15s ease-out !important;
}

@keyframes dshTbFadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.dsh-tb-editor-textarea {
  width: 100% !important;
  min-height: 72px !important;
  padding: 10px 14px !important;
  box-sizing: border-box !important;
  background: var(--dsw-alias-bg-layer-2, rgba(30, 41, 59, 0.95)) !important;
  color: var(--dsw-alias-label-primary, #f8fafc) !important;
  border: 1.5px solid var(--dsw-alias-brand-primary, #3b82f6) !important;
  border-radius: 8px !important;
  font-family: inherit !important;
  font-size: var(--dsh-content-font-size, 14px) !important;
  line-height: 1.5 !important;
  resize: vertical !important;
  outline: none !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18) !important;
}

.dsh-tb-editor-actions {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 0 2px !important;
}

.dsh-tb-editor-hint {
  font-size: 11.5px !important;
  color: var(--dsw-alias-label-tertiary, #64748b) !important;
  user-select: none !important;
}

.dsh-tb-editor-btns {
  display: flex !important;
  gap: 8px !important;
}

.dsh-tb-btn {
  padding: 5px 14px !important;
  border-radius: 6px !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  cursor: pointer !important;
  border: 1px solid var(--dsw-alias-border-l3, rgba(128, 128, 128, 0.25)) !important;
  background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, 0.06)) !important;
  color: var(--dsw-alias-label-secondary, #94a3b8) !important;
  transition: all 0.15s ease !important;
}

.dsh-tb-btn:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.18)) !important;
  color: var(--dsw-alias-label-primary, #ffffff) !important;
}

.dsh-tb-btn-primary {
  background: var(--dsw-alias-brand-primary, #2563eb) !important;
  color: #ffffff !important;
  border: 1px solid transparent !important;
}

.dsh-tb-btn-primary:hover {
  background: #1d4ed8 !important;
  color: #ffffff !important;
}

.dsh-tb-btn-primary:disabled {
  opacity: 0.6 !important;
  cursor: not-allowed !important;
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

    function getSessionIdFromEnvironment(sessionsRef, fallbackId) {
      try {
        const snap = sessionsRef?.list?.getSnapshot?.()
        if (snap?.byId) {
          const main = Object.values(snap.byId).find((s) => (s?.retainedBy?.mainView ?? 0) > 0)
          if (main?.id) return main.id
        }
        if (snap?.current) return snap.current
      } catch {}
      try {
        const params = new URLSearchParams(window.location.search)
        const sid = params.get('session')
        if (sid) return sid
      } catch {}
      try {
        const raw = localStorage.getItem('dsh.sessions.current')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed?.sessionId) return parsed.sessionId
        }
      } catch {}
      try {
        const selected = document.querySelector('[role="treeitem"][aria-selected="true"]')
        const rowKey = selected?.getAttribute('data-row-key')
        if (rowKey && rowKey.startsWith('session:')) return rowKey.slice(8)
        const row = document.querySelector('[data-dsh-session].YDXeBa_selected, [data-dsh-session][aria-selected="true"], [role="treeitem"][aria-selected="true"] [data-dsh-session]')
        if (row) return row.getAttribute('data-dsh-session')
      } catch {}
      return (fallbackId && fallbackId !== 'default') ? fallbackId : 'default'
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

      const sessionsRef = ctx.get('@deepseek-ai/dsh-api-session-controller') || ctx.get('sessions')
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

      function getTurnOutlineMap() {
        const map = new Map()
        const frame = document.querySelector('nav[aria-label*="轮次"], nav[aria-label*="turn" i], [class*="eGxaPq_frame"]')
        if (!frame) return map
        const fiberKey = Object.keys(frame).find((k) => k.startsWith('__reactFiber$'))
        if (!fiberKey) return map
        let curr = frame[fiberKey]
        while (curr) {
          if (curr.memoizedProps && Array.isArray(curr.memoizedProps.items)) {
            for (const item of curr.memoizedProps.items) {
              if (item && Number.isSafeInteger(item.turn)) {
                map.set(item.turn, {
                  prompt: item.prompt || '',
                  response: item.response || '',
                  kind: item.anchor?.kind || 'unknown'
                })
              }
            }
            break
          }
          curr = curr.return
        }
        return map
      }

      function getTurnSummary(turn) {
        let promptText = ''
        let respText = ''
        let isFromOutline = false

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

        // 核心增强：当未加载进 DOM 时，直接从官方 TurnNavigator 的 turnOutline 大纲提取真实的问答摘要
        if (!promptText || !respText) {
          const outlineMap = getTurnOutlineMap()
          const outlineItem = outlineMap.get(turn)
          if (outlineItem) {
            if (!promptText && outlineItem.prompt) {
              promptText = outlineItem.prompt.trim()
            }
            if (!respText && outlineItem.response) {
              respText = outlineItem.response.trim()
              isFromOutline = true
            }
          }
        }

        if (!promptText) promptText = `第 ${turn} 轮对话`
        if (!respText) {
          respText = rows.length > 0 ? '（展开查看完整对话细节）' : '（历史对话轮次，点击右侧标线可加载并跳转）'
        }

        return { promptText, respText, isFromOutline }
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
        const { promptText, respText, isFromOutline } = getTurnSummary(turn)

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
            ${isFromOutline ? `
            <div class="dsh-tb-popover-footnote" style="margin-top: 6px; padding-top: 5px; border-top: 1px dashed var(--dsw-alias-border-l4, rgba(128,128,128,0.18)); font-size: 11px; color: var(--dsw-alias-label-tertiary, #8c8c8c); display: flex; align-items: center; justify-content: space-between;">
              <span>大纲预览 (未载入正文)</span>
              <button type="button" class="dsh-tb-load-turn-btn" style="border: none; background: rgba(59,130,246,0.12); color: var(--dsw-alias-state-business-primary, #2563eb); border-radius: 4px; padding: 2px 7px; font-size: 11px; cursor: pointer; font-weight: 500;">点击加载完整内容</button>
            </div>` : ''}
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

        // Bind Load Button for Outline Turns
        const loadBtn = popoverEl.querySelector('.dsh-tb-load-turn-btn')
        if (loadBtn) {
          loadBtn.onclick = (e) => {
            e.stopPropagation()
            e.preventDefault()
            loadBtn.textContent = '加载中...'
            const mark = document.querySelector(`button[class*="mark"][data-dsh-turn="${turn}"]`) ||
              Array.from(document.querySelectorAll('button[class*="mark"]')).find((b) => parseTurnNumber(b) === turn)
            if (mark) {
              mark.click()
              let attempts = 0
              const interval = setInterval(() => {
                attempts++
                const landedRow = document.querySelector(`[data-chat-turn="${turn}"]`)
                if (landedRow) {
                  clearInterval(interval)
                  scrollTargetIntoCenter(landedRow)
                  landedRow.classList.remove('dsh-tb-highlight-target')
                  void landedRow.offsetWidth
                  landedRow.classList.add('dsh-tb-highlight-target')
                  setTimeout(() => landedRow.classList.remove('dsh-tb-highlight-target'), 1400)
                  showPopover(turn, targetEl)
                } else if (attempts > 30) {
                  clearInterval(interval)
                  loadBtn.textContent = '已触发加载'
                }
              }, 100)
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
        const sid = getSessionIdFromEnvironment(sessionsRef, activeSessionId)
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
            if (currentStarState !== isStarred) {
              starBtn.classList.toggle('dsh-tb-starred', isStarred)
              starBtn.title = isStarred ? `取消收藏第 ${turn} 轮` : `收藏第 ${turn} 轮`
              starBtn.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="${isStarred ? '#f59e0b' : 'none'}" stroke="${isStarred ? '#d97706' : 'currentColor'}" stroke-width="1.8" stroke-linejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              `
            }
          } else {
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

          // 2. Edit & Fork-Rerun Button (针对用户提示词行)
          const userBubble = row.querySelector('[class*="_bubble"], [class*="bubble"]')
          if (userBubble && !actionsBar.querySelector('.dsh-tb-msg-edit')) {
            const editBtn = document.createElement('button')
            editBtn.className = 'dsh-tb-msg-edit'
            editBtn.type = 'button'
            editBtn.title = `编辑第 ${turn} 轮提示词并从此处重新运行`
            editBtn.setAttribute('aria-label', editBtn.title)
            editBtn.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            `
            const onEdit = (e) => {
              e.stopPropagation()
              e.preventDefault()
              openInlineEditor(row, turn, userBubble)
            }
            editBtn.addEventListener('click', onEdit, { capture: true })
            editBtn.addEventListener('pointerdown', onEdit, { capture: true })
            actionsBar.appendChild(editBtn)
          }
        }
      }

      // ── Inline Prompt Editor & Fork-Rerun Engine ──────────────────────────
      function openInlineEditor(row, turn, userBubble) {
        if (row.querySelector('.dsh-tb-inline-editor')) return
        const fallbackText = userBubble.innerText.trim()
        userBubble.style.display = 'none'

        const editor = document.createElement('div')
        editor.className = 'dsh-tb-inline-editor'

        // 引用会话气泡展示栏
        const refBar = document.createElement('div')
        refBar.className = 'dsh-tb-ref-bar'
        refBar.style.display = 'none'

        const refLabel = document.createElement('span')
        refLabel.className = 'dsh-tb-ref-label'
        refLabel.textContent = '引用会话：'
        refBar.appendChild(refLabel)

        const refChipsWrap = document.createElement('div')
        refChipsWrap.style.display = 'contents'
        refBar.appendChild(refChipsWrap)

        const textarea = document.createElement('textarea')
        textarea.className = 'dsh-tb-editor-textarea'
        textarea.value = fallbackText
        textarea.placeholder = '编辑你的提示词...'

        const autoResize = () => {
          textarea.style.height = 'auto'
          textarea.style.height = Math.max(72, Math.min(380, textarea.scrollHeight + 4)) + 'px'
        }
        textarea.addEventListener('input', autoResize)

        const footer = document.createElement('div')
        footer.className = 'dsh-tb-editor-actions'

        const hint = document.createElement('span')
        hint.className = 'dsh-tb-editor-hint'
        hint.textContent = '⌘ Enter 重新运行 · Esc 取消'

        const btns = document.createElement('div')
        btns.className = 'dsh-tb-editor-btns'

        const cancelBtn = document.createElement('button')
        cancelBtn.className = 'dsh-tb-btn'
        cancelBtn.type = 'button'
        cancelBtn.textContent = '取消'

        const runBtn = document.createElement('button')
        runBtn.className = 'dsh-tb-btn dsh-tb-btn-primary'
        runBtn.type = 'button'
        runBtn.textContent = '重新运行'

        btns.appendChild(cancelBtn)
        btns.appendChild(runBtn)
        footer.appendChild(hint)
        footer.appendChild(btns)

        editor.appendChild(refBar)
        editor.appendChild(textarea)
        editor.appendChild(footer)

        userBubble.parentNode.insertBefore(editor, userBubble.nextSibling)
        autoResize()
        textarea.focus()
        textarea.setSelectionRange(textarea.value.length, textarea.value.length)

        // 会话引用的状态存储：[{ label, uri, mention }]
        let activeReferences = []
        let rawOriginalPrompt = fallbackText

        const renderRefChips = () => {
          refChipsWrap.innerHTML = ''
          if (activeReferences.length === 0) {
            refBar.style.display = 'none'
            return
          }
          refBar.style.display = 'flex'
          for (const ref of activeReferences) {
            const chip = document.createElement('span')
            chip.className = 'dsh-tb-ref-chip'
            chip.title = ref.mention || ref.label
            chip.innerHTML = `
              <svg class="dsh-tb-ref-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2">
                <path d="M5 6.75H11" stroke="currentColor"/>
                <path d="M5 9H8" stroke="currentColor"/>
                <path d="M2.37 11.25C1.59 9.89 1.32 8.3 1.62 6.76C1.92 5.22 2.76 3.84 4 2.88C5.23 1.91 6.77 1.43 8.34 1.51C9.9 1.59 11.39 2.24 12.51 3.32C13.64 4.41 14.34 5.87 14.48 7.43C14.61 8.99 14.18 10.55 13.26 11.82C12.34 13.09 10.99 13.98 9.46 14.33C8.19 14.63 6.86 14.53 5.65 14.06C5.17 13.87 4.77 13.49 4.27 13.4C3.67 13.28 2.95 13.56 2.04 14.33" stroke="currentColor"/>
              </svg>
              <span>${ref.label}</span>
            `
            const delBtn = document.createElement('span')
            delBtn.className = 'dsh-tb-ref-close'
            delBtn.textContent = '×'
            delBtn.title = '移除此会话引用'
            delBtn.addEventListener('click', (e) => {
              e.stopPropagation()
              activeReferences = activeReferences.filter((r) => r.mention !== ref.mention)
              renderRefChips()
            })
            chip.appendChild(delBtn)
            refChipsWrap.appendChild(chip)
          }
        }

        // 异步解析底层真实的原始提示词与气泡引用
        ;(async () => {
          try {
            const prompt = await resolveTurnPrompt(turn, userBubble)
            if (prompt) {
              rawOriginalPrompt = prompt
              const SESSION_MENTION_RE = /@\[((?:\.|[^\]])*)\]\((dsh-session:[A-Za-z0-9_-]+)\)|(dsh-session:[A-Za-z0-9_-]+)/gu
              const refs = []
              let match
              const seen = new Set()
              while ((match = SESSION_MENTION_RE.exec(prompt)) !== null) {
                const label = match[1] || '引用会话'
                const uri = match[2] || match[3]
                const mention = match[0]
                if (!seen.has(mention)) {
                  seen.add(mention)
                  refs.push({ label, uri, mention })
                }
              }
              if (refs.length > 0) {
                activeReferences = refs
                renderRefChips()

                // 清洗出用户可读的正文（把 @[...] 转换成直观的 @label 显示在编辑框中）
                let cleanPrompt = prompt
                for (const r of refs) {
                  cleanPrompt = cleanPrompt.replaceAll(r.mention, '@' + r.label)
                }
                textarea.value = cleanPrompt.trim()
                autoResize()
              } else {
                textarea.value = prompt.trim()
                autoResize()
              }
            }
          } catch (err) {
            console.warn('[dsh-turn-bookmarks] Failed to resolve accurate turn prompt:', err)
          }
        })()

        const closeEditor = () => {
          editor.remove()
          userBubble.style.display = ''
        }

        cancelBtn.addEventListener('click', closeEditor)

        const doSubmit = async () => {
          const editedText = textarea.value.trim()
          if (!editedText) {
            textarea.focus()
            return
          }
          runBtn.disabled = true
          cancelBtn.disabled = true
          textarea.disabled = true
          runBtn.textContent = '正在分叉...'

          try {
            // 合成符合 DSH 会话要求的完整带有气泡引用的提示词
            let fullText = editedText
            for (const ref of activeReferences) {
              const displayTag = '@' + ref.label
              if (fullText.includes(displayTag)) {
                fullText = fullText.replaceAll(displayTag, ref.mention)
              } else if (!fullText.includes(ref.mention)) {
                // 如果用户没有在文字中保留 @label，自动前置补齐
                fullText = ref.mention + ' ' + fullText
              }
            }

            await forkAndRerunTurn(turn, fullText)
            closeEditor()
          } catch (err) {
            console.error('[dsh-turn-bookmarks] Fork & rerun failed:', err)
            runBtn.disabled = false
            cancelBtn.disabled = false
            textarea.disabled = false
            runBtn.textContent = '重新运行'
            alert('从此处重新运行失败：' + (err.message || String(err)))
          }
        }

        runBtn.addEventListener('click', doSubmit)

        textarea.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            closeEditor()
          } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            doSubmit()
          }
        })
      }

      async function resolveTurnPrompt(turn, userBubble) {
        const currentSessionId = activeSessionId || getSessionIdFromEnvironment(sessionsRef)

        // 1. 本地内存优先：直接从客户端 session 的 eventSource 提取完整的带有 @[标题](dsh-session:...) 的原始 prompt
        try {
          const sessionObj = sessionsRef?.binding?.(currentSessionId)?.session
          const entries = sessionObj?.eventSource?.getSnapshot?.()?.entries
          if (Array.isArray(entries) && entries.length > 0) {
            let lastInboxInserted = null
            for (const entry of entries) {
              const ev = entry?.event || entry
              if (!ev || typeof ev.type !== 'string') continue
              if (ev.type === 'agent/inbox/spliced' && ev.data?.target === 'next-turn' && Array.isArray(ev.data?.inserted) && ev.data.inserted.length > 0) {
                lastInboxInserted = ev.data.inserted
              }
              if (ev.type === 'turn/start' && ev.data?.turn === turn) {
                if (lastInboxInserted) {
                  const textBlocks = lastInboxInserted.flatMap((item) =>
                    (item.content || []).filter((c) => c.type === 'text').map((c) => c.text)
                  )
                  if (textBlocks.length > 0) {
                    return textBlocks.join(String.fromCharCode(10))
                  }
                }
              }
            }
          }
        } catch (err) {
          console.warn('[dsh-turn-bookmarks] Failed to resolve prompt from client memory:', err)
        }

        // 2. 服务端精准提取
        if (currentSessionId && currentSessionId !== 'default') {
          try {
            const res = await fetch('/dsh-turn-bookmarks/turn-prompt?sessionId=' + encodeURIComponent(currentSessionId) + '&turn=' + turn)
            if (res.ok) {
              const data = await res.json()
              if (data.ok && typeof data.prompt === 'string' && data.prompt) {
                return data.prompt
              }
            }
          } catch (err) {
            console.warn('[dsh-turn-bookmarks] Failed to fetch turn prompt from backend:', err)
          }
        }

        // 3. DOM 智能属性提取兜底
        try {
          let domText = ''
          for (const node of userBubble.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
              domText += node.textContent
            } else if (node instanceof HTMLElement) {
              if (node.dataset.refChip === 'session') {
                const title = node.getAttribute('title') || ''
                domText += title.startsWith('@') ? title : ('@' + (node.textContent || '').trim())
              } else {
                domText += node.textContent || ''
              }
            }
          }
          if (domText.trim()) return domText.trim()
        } catch {}

        return userBubble.innerText.trim()
      }

      async function forkAndRerunTurn(turn, newText) {
        const currentSessionId = activeSessionId || getSessionIdFromEnvironment(sessionsRef)
        if (!currentSessionId || currentSessionId === 'default') {
          throw new Error('未找到当前活跃会话 ID')
        }

        // 1. 本地优先：直接从内存中的 session 事件流精准提取截断点
        let atSeq = undefined
        try {
          const sessionObj = sessionsRef?.binding?.(currentSessionId)?.session
          const entries = sessionObj?.eventSource?.getSnapshot?.()?.entries
          if (Array.isArray(entries) && entries.length > 0) {
            let lastInitSeq = null
            for (const entry of entries) {
              const ev = entry?.event || entry
              if (typeof ev?.seq !== 'number') continue
              if (turn === 1) {
                if (ev.type === 'agent/inbox/spliced' || ev.type === 'user/message' || ev.type === 'turn/start') {
                  atSeq = lastInitSeq !== null ? lastInitSeq : 0
                  break
                }
                lastInitSeq = ev.seq
              } else if (ev.type === 'turn/end' && ev.data?.turn === turn - 1) {
                atSeq = ev.seq
                break
              }
            }
          }
        } catch (err) {
          console.warn('[dsh-turn-bookmarks] Failed to resolve boundary from client memory:', err)
        }

        // 2. 服务端兜底：若客户端内存未完整命中，向服务端请求精确边界
        if (typeof atSeq !== 'number') {
          try {
            const res = await fetch('/dsh-turn-bookmarks/turn-boundary?sessionId=' + encodeURIComponent(currentSessionId) + '&turn=' + turn)
            if (res.ok) {
              const data = await res.json()
              if (data.ok && typeof data.atSeq === 'number' && Number.isSafeInteger(data.atSeq) && data.atSeq >= 0) {
                atSeq = data.atSeq
              }
            }
          } catch (err) {
            console.warn('[dsh-turn-bookmarks] Failed to fetch turn boundary from backend:', err)
          }
        }

        // 严格安全闸门：必须是明确的非负整数，任何 null / undefined 严禁放行
        if (typeof atSeq !== 'number' || atSeq < 0 || !Number.isSafeInteger(atSeq)) {
          throw new Error(`无法精确定位第 ${turn} 轮历史分界点 (atSeq 为空或无效)，已阻止分叉以防产生重复消息`)
        }

        if (!sessionsRef || typeof sessionsRef.fork !== 'function') {
          throw new Error('会话控制器不可用，无法执行 fork')
        }

        const childId = await sessionsRef.fork({
          sessionId: currentSessionId,
          atSeq,
          increaseTitle: true,
        })

        if (!childId) {
          throw new Error('分叉会话未返回有效 ID')
        }

        const uiWorkspace = ctx.get('uiWorkspace')
        if (uiWorkspace && typeof uiWorkspace.openSession === 'function') {
          uiWorkspace.openSession(childId)
        } else if (typeof sessionsRef.select === 'function') {
          sessionsRef.select(childId)
        }

        submitPromptWhenReady(newText)
      }

      async function submitPromptWhenReady(text) {
        for (let i = 0; i < 40; i++) {
          await new Promise((r) => setTimeout(r, 120))
          const composer = document.querySelector('div[data-composer-input], [data-composer-input], div[contenteditable="true"], div[contenteditable]')
          if (composer && composer.isConnected) {
            try {
              composer.focus()
              composer.innerHTML = ''
              document.execCommand('insertText', false, text)
              composer.dispatchEvent(new Event('input', { bubbles: true }))

              await new Promise((r) => setTimeout(r, 100))

              const card = document.querySelector('[data-composer-card]') || composer.closest('[class*="card"]') || document
              const sendBtn = card.querySelector('button[aria-label*="发送"], button[aria-label*="Send"], button[class*="primary"]:not(:disabled)')
              if (sendBtn && !sendBtn.disabled) {
                sendBtn.click()
                return true
              }

              composer.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
              }))
              return true
            } catch (err) {
              console.warn('[dsh-turn-bookmarks] Auto-submit prompt error:', err)
            }
          }
        }
        return false
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
        // 1. 优先使用官方标准的会话滚动视口 [data-conversation-scroll] 或带有 scrollBody 的主滚动容器
        const official = document.querySelector('[data-conversation-scroll]') ||
                         document.querySelector('.wSkVaW_scrollBody') ||
                         document.querySelector('[class*="scrollBody"]')
        if (official && official.scrollHeight > official.clientHeight) return official

        // 2. 如果官方容器未找到，沿着样本节点逐级向上找有真实溢出滚动的父级
        const sample = document.querySelector('mark.dsh-tb-kw') || document.querySelector('[data-chat-turn]')
        if (sample) {
          let cur = sample.parentElement
          while (cur && cur !== document.body) {
            const style = window.getComputedStyle(cur)
            const overflowY = style.overflowY
            if ((overflowY === 'auto' || overflowY === 'scroll') && cur.scrollHeight > cur.clientHeight + 10) {
              return cur
            }
            cur = cur.parentElement
          }
        }
        return document.scrollingElement || document.documentElement
      }

      function scrollTargetIntoCenter(targetMark) {
        if (!targetMark) return

        // 1. 如果目标所在的父级存在未展开的 details 或隐藏节点，自动展开并触发 beforematch
        let parent = targetMark.parentElement
        while (parent && parent !== document.body) {
          if (parent.tagName === 'DETAILS' && !parent.open) {
            parent.open = true
          }
          if (parent.hasAttribute('hidden')) {
            parent.removeAttribute('hidden')
            parent.dispatchEvent(new CustomEvent('beforematch', { bubbles: true }))
          }
          parent = parent.parentElement
        }

        const container = getChatScrollContainer()
        if (!container) return

        // 2. 派发微小 wheel 事件解除宿主 useChatReading 的 followingTail 吸底状态
        try {
          container.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -10 }))
        } catch {}

        // 3. 几何绝对坐标换算（物理坐标不变性）
        const cRect = container.getBoundingClientRect()
        const tRect = targetMark.getBoundingClientRect()
        const markAbsoluteTop = container.scrollTop + (tRect.top - cRect.top)

        // 偏上居中（约 38% 处），避开顶部搜索框与底部输入区，视野极佳
        const idealOffset = Math.round(cRect.height * 0.38)
        const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
        const targetScrollTop = Math.max(0, Math.min(maxScrollTop, markAbsoluteTop - idealOffset))

        // 4. 纯净平滑滚动（单一控制器，彻底杜绝 scrollIntoView 冲突与动画打断）
        container.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        })

        // 5. 动画后矫正兜底（防止极端重排或跟读冲突）
        setTimeout(() => {
          if (Math.abs(container.scrollTop - targetScrollTop) > 60) {
            container.scrollTo({
              top: targetScrollTop,
              behavior: 'auto'
            })
          }
        }, 180)
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

        // 1. 会话视图可见性判定：必须处于真实对话页面，且滚动容器可见
        const convScroll = document.querySelector('[data-conversation-scroll]')
        if (!convScroll || convScroll.offsetWidth <= 0 || convScroll.offsetHeight <= 0) {
          leftRailEl.style.display = 'none'
          return
        }

        // 2. 检查会话内部是否有真实消息行渲染（避免切换至全屏文件编辑器等视图时残留）
        const firstTurn = convScroll.querySelector('[data-chat-turn]')
        if (!firstTurn || firstTurn.offsetWidth <= 0) {
          leftRailEl.style.display = 'none'
          return
        }

        // 3. 计算消息列与会话视口左边缘之间的留白宽度 (Gutter)
        const convRect = convScroll.getBoundingClientRect()
        const turnRect = firstTurn.getBoundingClientRect()
        const leftGutter = turnRect.left - convRect.left

        // 防遮挡熔断：当右侧栏展开（better-sidebar 挤窄会话）、窗口缩窄或正文贴边时，
        // 留白小于 36px 或整个会话宽度低于 520px，自动隐藏左轨，绝不覆盖消息正文
        if (leftGutter < 36 || convRect.width < 520) {
          leftRailEl.style.display = 'none'
          return
        }

        const railWidth = 28
        const leftPos = Math.round(convRect.left + (leftGutter / 2) - (railWidth / 2))

        const allMarks = Array.from(document.querySelectorAll('button[class*="mark"]'))

        // 黄金视口比例：导轨线保持在 260~440px 高度，垂直居中偏上停靠
        const viewportH = window.innerHeight || 800
        const railHeight = Math.max(260, Math.min(Math.round(viewportH * 0.5), 440))
        const railTop = Math.max(70, Math.round(viewportH * 0.22))

        leftRailEl.style.display = 'block'
        leftRailEl.style.top = `${Math.round(railTop)}px`
        leftRailEl.style.height = `${Math.round(railHeight)}px`
        leftRailEl.style.left = `${Math.max(8, leftPos)}px`

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
                if (mark) {
                  mark.click()
                  let attempts = 0
                  const interval = setInterval(() => {
                    attempts++
                    const landedRow = document.querySelector(`[data-chat-turn="${turn}"]`)
                    if (landedRow) {
                      clearInterval(interval)
                      scrollTargetIntoCenter(landedRow)
                      landedRow.classList.remove('dsh-tb-highlight-target')
                      void landedRow.offsetWidth
                      landedRow.classList.add('dsh-tb-highlight-target')
                      setTimeout(() => landedRow.classList.remove('dsh-tb-highlight-target'), 1400)
                    } else if (attempts > 30) {
                      clearInterval(interval)
                    }
                  }, 100)
                }
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

        // 1. Search Trigger Button (折叠态轻量 Ghost 图标按钮，融入顶栏)
        searchToggleEl = document.createElement('button')
        searchToggleEl.className = 'dsh-tb-search-trigger'
        searchToggleEl.type = 'button'
        searchToggleEl.title = '搜索会话内容'
        searchToggleEl.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7.5"></circle>
            <line x1="21" y1="21" x2="16.5" y2="16.5"></line>
          </svg>
        `
        searchToggleEl.onclick = () => {
          searchExpanded = true
          renderControlBarState()
          setTimeout(() => searchInputEl?.focus(), 60)
        }
        barEl.appendChild(searchToggleEl)

        // 2. Search Expanded Box (展开搜索胶囊，极简现代调性)
        searchWrapEl = document.createElement('div')
        searchWrapEl.className = 'dsh-tb-search-expanded'

        // 内置放大镜小图标 (中性优雅灰)
        const innerIcon = document.createElement('span')
        innerIcon.style.cssText = 'color: var(--dsw-alias-label-tertiary, #94a3b8); display: inline-flex; align-items: center; flex: none;'
        innerIcon.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7.5"></circle>
            <line x1="21" y1="21" x2="16.5" y2="16.5"></line>
          </svg>
        `
        searchWrapEl.appendChild(innerIcon)

        searchInputEl = document.createElement('input')
        searchInputEl.className = 'dsh-tb-input'
        searchInputEl.type = 'text'
        searchInputEl.placeholder = '搜索会话...'
        searchInputEl.oninput = (e) => executeSearch(e.target.value)
        searchInputEl.onkeydown = (e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            nextMatch()
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            prevMatch()
          } else if (e.key === 'Enter') {
            e.preventDefault()
            if (e.shiftKey) prevMatch()
            else nextMatch()
          } else if (e.key === 'Escape') {
            e.preventDefault()
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
        prevBtn.title = '上一个匹配项 (↑ 或 Shift+Enter)'
        prevBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="18 15 12 9 6 15"></polyline></svg>'
        prevBtn.onclick = prevMatch
        searchWrapEl.appendChild(prevBtn)

        const nextBtn = document.createElement('button')
        nextBtn.className = 'dsh-tb-nav-btn'
        nextBtn.title = '下一个匹配项 (↓ 或 Enter)'
        nextBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>'
        nextBtn.onclick = nextMatch
        searchWrapEl.appendChild(nextBtn)

        const closeBtn = document.createElement('button')
        closeBtn.className = 'dsh-tb-nav-btn'
        closeBtn.title = '关闭搜索 (Esc)'
        closeBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
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
        const currentSid = getSessionIdFromEnvironment(sessionsRef, activeSessionId)
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

      const onWindowResize = () => { updateLeftBookmarkRail() }
      window.addEventListener('resize', onWindowResize)

      return () => {
        if (loopTimer) clearInterval(loopTimer)
        observer.disconnect()
        clearHighlights()
        if (popoverCloseTimer) clearTimeout(popoverCloseTimer)
        window.removeEventListener('resize', onWindowResize)
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
