(function (root, factory) {
  const api = factory(root.When2MeetMultiSessionCore);
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.When2MeetMultiSessionBookmarklet = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (core) {
  if (!core) {
    throw new Error("When2MeetMultiSessionCore is required before bookmarklet bootstrap");
  }

  const HOST_ID = "when2meet-multi-session-bookmarklet";
  const PANEL_TITLE = "When2Meet Multi-Session Analyzer";
  const BOOKMARKLET_VERSION = "v2026.03.17-9";
  const Z_INDEX = "2147483647";
  const BINARY_COVERED_COLOR = "#2563eb";
  let panelState = null;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function styles() {
    return `
      :host {
        all: initial;
      }
      *, *::before, *::after {
        box-sizing: border-box;
      }
      .panel {
        width: min(92vw, 1480px);
        max-height: min(88vh, 980px);
        display: flex;
        flex-direction: column;
        position: relative;
        color: #111827;
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #ffffff;
        border: 1px solid rgba(15, 23, 42, 0.12);
        border-radius: 16px;
        box-shadow: 0 28px 60px rgba(15, 23, 42, 0.28);
        overflow: hidden;
      }
      .panel.is-resizing {
        user-select: none;
        cursor: ns-resize;
      }
      .panel.is-resizing-width {
        user-select: none;
        cursor: ew-resize;
      }
      .titlebar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 16px;
        background: linear-gradient(135deg, #0f172a, #1d4ed8);
        color: #ffffff;
        cursor: move;
        user-select: none;
      }
      .titlebar h1 {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
      }
      .titlebar .subtitle {
        font-size: 12px;
        opacity: 0.78;
        margin-top: 3px;
      }
      .titlebar-meta {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .version-badge {
        display: inline-flex;
        align-items: center;
        padding: 5px 9px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.18);
        color: #fff;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.03em;
      }
      .titlebar-actions {
        display: flex;
        gap: 8px;
      }
      .icon-button {
        appearance: none;
        border: 0;
        border-radius: 10px;
        padding: 7px 10px;
        font-size: 12px;
        font-weight: 700;
        background: rgba(255, 255, 255, 0.15);
        color: inherit;
        cursor: pointer;
      }
      .icon-button:hover {
        background: rgba(255, 255, 255, 0.24);
      }
      .body {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 14px;
        background: #f8fafc;
        overflow: hidden;
      }
      .top-layout {
        flex: 1 1 auto;
        min-height: 180px;
        display: flex;
        gap: 14px;
        align-items: stretch;
        overflow: hidden;
      }
      .top-stack {
        flex: 1 1 0;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: end;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 170px;
      }
      .field label {
        font-size: 12px;
        font-weight: 700;
        color: #334155;
      }
      .field select {
        appearance: none;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        padding: 10px 12px;
        background: #fff;
        color: #0f172a;
        font-size: 13px;
        font-weight: 600;
      }
      .field-checkbox {
        min-width: 220px;
      }
      .checkbox-row {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-height: 42px;
        padding: 0 2px;
        color: #0f172a;
        font-size: 13px;
        font-weight: 600;
      }
      .checkbox-row input {
        width: 16px;
        height: 16px;
        accent-color: #2563eb;
        cursor: pointer;
      }
      .status {
        border-radius: 12px;
        padding: 10px 12px;
        background: #e2e8f0;
        color: #0f172a;
        font-size: 12px;
        line-height: 1.45;
      }
      .ignored-wrap {
        display: none;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        padding: 8px 10px;
        border: 1px solid rgba(251, 191, 36, 0.45);
        border-radius: 12px;
        background: #fffbeb;
      }
      .ignored-wrap[data-visible="true"] {
        display: flex;
      }
      .ignored-title {
        color: #92400e;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.03em;
      }
      .ignored-chip {
        display: inline-flex;
        align-items: center;
        padding: 4px 8px;
        border-radius: 999px;
        background: rgba(245, 158, 11, 0.12);
        color: #92400e;
        font-size: 11px;
        font-weight: 700;
      }
      .status[data-kind="error"] {
        background: #fee2e2;
        color: #991b1b;
      }
      .status[data-kind="success"] {
        background: #dcfce7;
        color: #166534;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 10px;
      }
      .summary-card {
        background: #ffffff;
        border: 1px solid rgba(148, 163, 184, 0.35);
        border-radius: 12px;
        padding: 6px 10px;
      }
      .summary-card .label {
        font-size: 10px;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        line-height: 1.1;
      }
      .summary-card .value {
        margin-top: 2px;
        font-size: 13px;
        font-weight: 800;
        color: #0f172a;
        line-height: 1.1;
      }
      .legend {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .preview-wrap {
        flex: 1.4 1 0;
        min-width: 0;
        background: #ffffff;
        border: 1px solid rgba(148, 163, 184, 0.35);
        border-radius: 14px;
        padding: 12px;
        overflow: hidden;
      }
      .preview-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      }
      .preview-title {
        font-size: 13px;
        font-weight: 800;
        color: #0f172a;
      }
      .preview-subtitle {
        font-size: 11px;
        color: #64748b;
      }
      .preview-grid-wrap {
        overflow: auto;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
      }
      .preview-grid {
        display: grid;
        width: max-content;
        min-width: 100%;
        background: #fff;
      }
      .preview-cell {
        min-height: 28px;
        border-right: 1px solid #e2e8f0;
        border-bottom: 1px solid #e2e8f0;
        box-sizing: border-box;
        font-size: 11px;
      }
      .preview-corner,
      .preview-day,
      .preview-time {
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f1f5f9;
        color: #334155;
        font-weight: 700;
        padding: 4px 6px;
      }
      .preview-time {
        justify-content: flex-end;
        padding-right: 8px;
      }
      .preview-slot {
        position: relative;
        background: #f8fafc;
      }
      .preview-slot.active {
        outline: 2px solid rgba(15, 23, 42, 0.15);
        outline-offset: -2px;
      }
      .preview-slot-label {
        position: absolute;
        inset: 3px 4px;
        font-size: 10px;
        font-weight: 800;
        color: #0f172a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        pointer-events: none;
      }
      .legend-item {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 9px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(148, 163, 184, 0.35);
        font-size: 11px;
        color: #334155;
      }
      .context-menu {
        position: fixed;
        min-width: 180px;
        padding: 6px;
        border: 1px solid rgba(148, 163, 184, 0.45);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.22);
        z-index: 2147483647;
      }
      .context-menu[hidden] {
        display: none;
      }
      .context-menu button {
        width: 100%;
        appearance: none;
        border: 0;
        background: transparent;
        color: #0f172a;
        text-align: left;
        padding: 10px 12px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
      }
      .context-menu button:hover {
        background: #eff6ff;
      }
      .context-menu-title {
        padding: 4px 8px 8px;
        color: #64748b;
        font-size: 11px;
        font-weight: 700;
      }
      .swatch {
        width: 14px;
        height: 14px;
        border-radius: 999px;
        border: 1px solid rgba(15, 23, 42, 0.18);
        flex: 0 0 auto;
      }
      .table-wrap {
        flex: 0 0 320px;
        min-height: 240px;
        background: #ffffff;
        border-radius: 14px;
        border: 1px solid rgba(148, 163, 184, 0.35);
        overflow: hidden;
      }
      .results-resize-handle {
        flex: 0 0 auto;
        position: relative;
        height: 12px;
        cursor: ns-resize;
      }
      .results-resize-handle::before {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 72px;
        height: 4px;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.95);
      }
      .split-results {
        display: flex;
        align-items: stretch;
        min-width: 100%;
        height: 100%;
        font-size: 12px;
      }
      .session-pane {
        flex: 0 0 504px;
        width: 504px;
        min-width: 504px;
        border-right: 1px solid #cbd5e1;
        background: #fff;
        display: flex;
        flex-direction: column;
      }
      .people-pane {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        flex-direction: column;
        background: #fff;
      }
      .pane-header {
        flex: 0 0 auto;
        height: 78px;
        min-height: 78px;
        background: #e2e8f0;
        border-bottom: 1px solid #cbd5e1;
        overflow: hidden;
      }
      .session-header-grid,
      .session-row-grid {
        display: grid;
        grid-template-columns: 196px 196px 112px;
      }
      .people-header-grid,
      .people-row-grid {
        display: grid;
      }
      .session-header-cell,
      .person-header-cell {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 78px;
        min-height: 78px;
        padding: 8px 6px;
        color: #0f172a;
        font-weight: 700;
        border-right: 1px solid #cbd5e1;
        box-sizing: border-box;
        background: #e2e8f0;
      }
      .session-header-cell:last-child,
      .person-header-cell:last-child {
        border-right: 0;
      }
      .person-header-cell {
        min-width: 34px;
        width: 34px;
        align-items: flex-end;
        padding: 6px 2px;
      }
      .person-header-cell.is-important {
        background: #dbeafe;
        box-shadow: inset 0 0 0 3px #2563eb;
      }
      .person-head {
        writing-mode: vertical-rl;
        text-orientation: mixed;
        font-size: 11px;
        line-height: 1.1;
      }
      .pane-body {
        flex: 1 1 auto;
      }
      .session-body {
        overflow-y: auto;
        overflow-x: hidden;
      }
      .people-body {
        overflow: auto;
      }
      .session-row-grid,
      .people-row-grid {
        min-height: 36px;
      }
      .session-row-grid.is-selected .session-cell,
      .people-row-grid.is-selected .person-cell {
        box-shadow: inset 0 0 0 2px #2563eb;
      }
      .session-row-grid.data-row-even .session-cell,
      .people-row-grid.data-row-even .person-cell {
        background: rgba(248, 250, 252, 0.9);
      }
      .session-cell {
        min-height: 36px;
        padding: 4px;
        border-right: 1px solid #e2e8f0;
        border-bottom: 1px solid #e2e8f0;
        box-sizing: border-box;
        background: #fff;
      }
      .session-cell:last-child {
        border-right: 0;
      }
      .session-count-cell {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .session-text-box {
        display: block !important;
        width: 100% !important;
        min-height: 26px;
        padding: 4px 8px;
        border: 1px solid #111827;
        border-radius: 6px;
        background: #ffffff;
        color: #000000 !important;
        -webkit-text-fill-color: #000000 !important;
        font: 800 12px/1.1 Arial, Helvetica, sans-serif !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        opacity: 1 !important;
        visibility: visible !important;
        text-shadow: none !important;
        box-sizing: border-box;
      }
      .session-empty .session-text-box {
        border-color: #cbd5e1;
        color: #94a3b8 !important;
        -webkit-text-fill-color: #94a3b8 !important;
        background: #f8fafc;
      }
      .count-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 56px;
        min-height: 26px;
        padding: 0 10px;
        border-radius: 999px;
        background: #dbeafe;
        color: #1d4ed8;
        font: 800 13px/1 Arial, Helvetica, sans-serif;
      }
      .person-cell {
        min-width: 34px;
        width: 34px;
        min-height: 36px;
        border-right: 1px solid #e2e8f0;
        border-bottom: 1px solid #e2e8f0;
        box-sizing: border-box;
        background: #fff;
      }
      .person-fill {
        display: block;
        width: 100%;
        min-height: 35px;
      }
      .table-empty {
        padding: 28px;
        color: #475569;
        font-size: 13px;
      }
      .footer-note {
        font-size: 11px;
        color: #64748b;
      }
      .resize-handle {
        flex: 0 0 auto;
        position: relative;
        height: 18px;
        cursor: ns-resize;
        background: linear-gradient(180deg, rgba(226, 232, 240, 0), rgba(226, 232, 240, 0.85));
      }
      .resize-handle::before {
        content: "";
        position: absolute;
        left: 50%;
        bottom: 5px;
        transform: translateX(-50%);
        width: 72px;
        height: 4px;
        border-radius: 999px;
        background: rgba(100, 116, 139, 0.75);
      }
      .resize-handle-right {
        position: absolute;
        top: 14px;
        right: 0;
        bottom: 18px;
        width: 16px;
        cursor: ew-resize;
      }
      .resize-handle-right::before {
        content: "";
        position: absolute;
        top: 50%;
        right: 4px;
        transform: translateY(-50%);
        width: 4px;
        height: 72px;
        border-radius: 999px;
        background: rgba(100, 116, 139, 0.6);
      }
      @media (max-width: 960px) {
        .panel {
          width: 96vw;
          max-height: 92vh;
        }
        .top-layout {
          flex-direction: column;
        }
      }
    `;
  }

  function shellMarkup() {
    return `
      <style>${styles()}</style>
      <section class="panel">
        <header class="titlebar" data-drag-handle="true">
          <div>
            <h1>${escapeHtml(PANEL_TITLE)}</h1>
            <div class="subtitle">Top 50 union-coverage plans from current page availability</div>
          </div>
          <div class="titlebar-meta">
            <span class="version-badge">${escapeHtml(BOOKMARKLET_VERSION)}</span>
            <div class="titlebar-actions">
              <button class="icon-button" data-action="refresh" type="button">Refresh</button>
              <button class="icon-button" data-action="close" type="button">Close</button>
            </div>
          </div>
        </header>
        <div class="body">
          <section class="top-layout">
            <div class="top-stack">
              <section class="controls">
                <div class="field">
                  <label for="sessionLength">Session Length</label>
                  <select id="sessionLength">
                    ${core.SESSION_LENGTH_OPTIONS.map((minutes) => `<option value="${minutes}" ${minutes === 60 ? "selected" : ""}>${minutes} minutes</option>`).join("")}
                  </select>
                </div>
                <div class="field">
                  <label for="weeklyCount">Weekly Session Count</label>
                  <select id="weeklyCount">
                    ${core.WEEKLY_SESSION_COUNT_OPTIONS.map((count) => `<option value="${count}" ${count === 2 ? "selected" : ""}>${count}</option>`).join("")}
                  </select>
                </div>
                <div class="field field-checkbox">
                  <label for="binaryDisplay">Display Mode</label>
                  <label class="checkbox-row" for="binaryDisplay">
                    <input id="binaryDisplay" type="checkbox">
                    <span>Binary covered / uncovered</span>
                  </label>
                </div>
                <div class="field field-checkbox">
                  <label for="requiredOnly">필수인원</label>
                  <label class="checkbox-row" for="requiredOnly">
                    <input id="requiredOnly" type="checkbox">
                    <span>필수인원만 보기</span>
                  </label>
                </div>
              </section>
              <section class="ignored-wrap" data-visible="false" id="ignoredWrap"></section>
              <section class="status" data-kind="info" id="status">Ready. ${escapeHtml(BOOKMARKLET_VERSION)}</section>
              <section class="summary-grid" id="summary"></section>
              <section class="legend" id="legend"></section>
            </div>
            <section class="preview-wrap" id="previewWrap"></section>
          </section>
          <div class="results-resize-handle" data-results-resize-handle="true" title="Drag to resize results area"></div>
          <section class="table-wrap" id="resultsWrap">
            <div class="table-empty">Run the analyzer to see ranked plans.</div>
          </section>
          <div class="footer-note" id="footerNote">Colors encode person coverage across Session 1/2/3 using additive RGB mixing. Uncovered people stay dark gray.</div>
        </div>
        <div class="resize-handle" data-resize-handle="true" title="Drag to resize"></div>
        <div class="resize-handle-right" data-resize-handle-right="true" title="Drag to resize width"></div>
      </section>
      <div class="context-menu" id="contextMenu" hidden>
        <div class="context-menu-title" id="contextMenuTitle"></div>
        <button type="button" data-action="toggle-important" id="toggleImportantButton">중요 인원으로 표시</button>
        <button type="button" data-action="exclude-person">Delete This Column And Recalculate</button>
      </div>
    `;
  }

  function getElements(shadowRoot) {
    return {
      panel: shadowRoot.querySelector(".panel"),
      body: shadowRoot.querySelector(".body"),
      sessionLength: shadowRoot.getElementById("sessionLength"),
      weeklyCount: shadowRoot.getElementById("weeklyCount"),
      binaryDisplay: shadowRoot.getElementById("binaryDisplay"),
      requiredOnly: shadowRoot.getElementById("requiredOnly"),
      status: shadowRoot.getElementById("status"),
      summary: shadowRoot.getElementById("summary"),
      ignoredWrap: shadowRoot.getElementById("ignoredWrap"),
      legend: shadowRoot.getElementById("legend"),
      topLayout: shadowRoot.querySelector(".top-layout"),
      previewWrap: shadowRoot.getElementById("previewWrap"),
      resultsWrap: shadowRoot.getElementById("resultsWrap"),
      resultsResizeHandle: shadowRoot.querySelector('[data-results-resize-handle="true"]'),
      footerNote: shadowRoot.getElementById("footerNote"),
      contextMenu: shadowRoot.getElementById("contextMenu"),
      contextMenuTitle: shadowRoot.getElementById("contextMenuTitle"),
      toggleImportantButton: shadowRoot.getElementById("toggleImportantButton"),
      closeButton: shadowRoot.querySelector('[data-action="close"]'),
      refreshButton: shadowRoot.querySelector('[data-action="refresh"]'),
      titlebar: shadowRoot.querySelector(".titlebar"),
      resizeHandle: shadowRoot.querySelector('[data-resize-handle="true"]'),
      resizeHandleRight: shadowRoot.querySelector('[data-resize-handle-right="true"]'),
    };
  }

  function ensureHost() {
    let host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = HOST_ID;
      host.style.position = "fixed";
      host.style.top = "16px";
      host.style.right = "16px";
      host.style.left = "auto";
      host.style.zIndex = Z_INDEX;
      document.body.appendChild(host);
    }
    host.style.zIndex = Z_INDEX;
    return host;
  }

  function createPanel() {
    const host = ensureHost();
    const shadowRoot = host.shadowRoot || host.attachShadow({ mode: "open" });
    shadowRoot.innerHTML = shellMarkup();
    const elements = getElements(shadowRoot);
    panelState = {
      host,
      shadowRoot,
      elements,
      dragState: null,
      resizeState: null,
      resultsResizeState: null,
      defaultPanelHeight: null,
      defaultPanelWidth: null,
      excludedPersonIds: new Set(),
      importantPersonIds: new Set(),
      contextMenuPersonId: null,
      lastExtraction: null,
      lastIgnoredPeople: [],
      lastAnalysis: null,
    };
    bindEvents(panelState);
    renderLegend(panelState);
    return panelState;
  }

  function ensurePanel() {
    if (panelState && panelState.host && document.body.contains(panelState.host)) {
      return panelState;
    }
    const existing = document.getElementById(HOST_ID);
    if (existing && existing.shadowRoot) {
      panelState = {
        host: existing,
        shadowRoot: existing.shadowRoot,
        elements: getElements(existing.shadowRoot),
        dragState: null,
        resizeState: null,
        resultsResizeState: null,
        defaultPanelHeight: null,
        defaultPanelWidth: null,
        excludedPersonIds: new Set(),
        importantPersonIds: new Set(),
        contextMenuPersonId: null,
        lastExtraction: null,
        lastIgnoredPeople: [],
        lastAnalysis: null,
      };
      bindEvents(panelState);
      renderLegend(panelState);
      return panelState;
    }
    return createPanel();
  }

  function bindEvents(state) {
    const { elements } = state;
    if (elements.status.dataset.bound === "true") return;
    elements.status.dataset.bound = "true";

    const rerun = () => analyzeAndRender(state);
    const rerenderDisplay = () => {
      hideContextMenu(state);
      renderIgnoredPeople(state, state.lastIgnoredPeople || []);
      renderLegend(state);
      if (state.lastAnalysis) {
        if (state.lastExtraction) {
          renderSummary(state, state.lastExtraction, getVisibleAnalysis(state, state.lastAnalysis));
        }
        renderResults(state, state.lastAnalysis);
      }
    };
    elements.sessionLength.addEventListener("change", rerun);
    elements.weeklyCount.addEventListener("change", rerun);
    elements.binaryDisplay.addEventListener("change", rerenderDisplay);
    elements.requiredOnly.addEventListener("change", rerenderDisplay);
    elements.refreshButton.addEventListener("click", rerun);
    elements.contextMenu.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const personId = state.contextMenuPersonId;
      hideContextMenu(state);
      if (typeof personId !== "number") return;
      if (button.dataset.action === "toggle-important") {
        if (state.importantPersonIds.has(personId)) {
          state.importantPersonIds.delete(personId);
        } else {
          state.importantPersonIds.add(personId);
        }
        if (state.lastAnalysis) {
          renderResults(state, state.lastAnalysis);
        }
        return;
      }
      if (button.dataset.action === "exclude-person") {
        state.excludedPersonIds.add(personId);
        state.importantPersonIds.delete(personId);
        analyzeAndRender(state);
      }
    });
    state.shadowRoot.addEventListener("click", (event) => {
      if (!event.target.closest("#contextMenu") && !event.target.closest(".person-header-cell")) {
        hideContextMenu(state);
      }
    });
    elements.closeButton.addEventListener("click", () => {
      state.host.remove();
      panelState = null;
    });
    bindDrag(state);
  }

  function bindDrag(state) {
    const { host, elements } = state;
    elements.titlebar.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return;
      if (event.target.closest("button")) return;
      const rect = host.getBoundingClientRect();
      state.dragState = {
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
      };
      host.style.right = "auto";
      host.style.bottom = "auto";
      const onMove = (moveEvent) => {
        if (!state.dragState) return;
        const left = Math.max(8, moveEvent.clientX - state.dragState.offsetX);
        const top = Math.max(8, moveEvent.clientY - state.dragState.offsetY);
        host.style.left = `${left}px`;
        host.style.top = `${top}px`;
      };
      const onUp = () => {
        state.dragState = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });

    elements.resizeHandle.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      focusPanel(state);

      const panelRect = elements.panel.getBoundingClientRect();
      if (!state.defaultPanelHeight) {
        state.defaultPanelHeight = panelRect.height;
      }
      state.resizeState = {
        startY: event.clientY,
        startHeight: panelRect.height,
      };

      elements.panel.classList.add("is-resizing");
      elements.panel.style.height = `${panelRect.height}px`;

      const onMove = (moveEvent) => {
        if (!state.resizeState) return;
        const viewportPadding = 8;
        const minHeight = 420;
        const maxHeightByDefault = Math.max(minHeight, state.defaultPanelHeight * 2);
        const maxHeightByViewport = Math.max(minHeight, window.innerHeight - panelRect.top - viewportPadding);
        const availableHeight = Math.min(maxHeightByDefault, maxHeightByViewport);
        const nextHeight = state.resizeState.startHeight + (moveEvent.clientY - state.resizeState.startY);
        const clampedHeight = Math.max(minHeight, Math.min(availableHeight, nextHeight));
        elements.panel.style.height = `${clampedHeight}px`;
      };

      const onUp = () => {
        state.resizeState = null;
        elements.panel.classList.remove("is-resizing");
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });

    elements.resizeHandleRight.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      focusPanel(state);

      const panelRect = elements.panel.getBoundingClientRect();
      if (!state.defaultPanelWidth) {
        state.defaultPanelWidth = panelRect.width;
      }
      state.resizeState = {
        startX: event.clientX,
        startWidth: panelRect.width,
      };

      elements.panel.classList.add("is-resizing-width");
      elements.panel.style.width = `${panelRect.width}px`;

      const onMove = (moveEvent) => {
        if (!state.resizeState) return;
        const viewportPadding = 8;
        const minWidth = 720;
        const maxWidthByDefault = Math.max(minWidth, state.defaultPanelWidth * 2);
        const maxWidthByViewport = Math.max(minWidth, window.innerWidth - panelRect.left - viewportPadding);
        const availableWidth = Math.min(maxWidthByDefault, maxWidthByViewport);
        const nextWidth = state.resizeState.startWidth + (moveEvent.clientX - state.resizeState.startX);
        const clampedWidth = Math.max(minWidth, Math.min(availableWidth, nextWidth));
        elements.panel.style.width = `${clampedWidth}px`;
      };

      const onUp = () => {
        state.resizeState = null;
        elements.panel.classList.remove("is-resizing-width");
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });

    elements.resultsResizeHandle.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      focusPanel(state);

      const bodyRect = elements.body.getBoundingClientRect();
      const topRect = elements.topLayout.getBoundingClientRect();
      const resultsRect = elements.resultsWrap.getBoundingClientRect();
      state.resultsResizeState = {
        startY: event.clientY,
        startHeight: resultsRect.height,
        startTopHeight: topRect.height,
        bodyHeight: bodyRect.height,
      };

      elements.panel.classList.add("is-resizing");
      elements.resultsWrap.style.flex = `0 0 ${resultsRect.height}px`;

      const onMove = (moveEvent) => {
        if (!state.resultsResizeState) return;
        const minResultsHeight = 180;
        const minTopHeight = 180;
        const maxResultsHeight = Math.max(minResultsHeight, state.resultsResizeState.bodyHeight - minTopHeight - 80);
        const nextHeight = state.resultsResizeState.startHeight + (moveEvent.clientY - state.resultsResizeState.startY);
        const clampedHeight = Math.max(minResultsHeight, Math.min(maxResultsHeight, nextHeight));
        elements.resultsWrap.style.flex = `0 0 ${clampedHeight}px`;
      };

      const onUp = () => {
        state.resultsResizeState = null;
        elements.panel.classList.remove("is-resizing");
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });
  }

  function isBinaryDisplayEnabled(state) {
    return Boolean(state && state.elements && state.elements.binaryDisplay && state.elements.binaryDisplay.checked);
  }

  function isRequiredOnlyEnabled(state) {
    return Boolean(state && state.elements && state.elements.requiredOnly && state.elements.requiredOnly.checked);
  }

  function hideContextMenu(state) {
    state.contextMenuPersonId = null;
    state.elements.contextMenu.hidden = true;
  }

  function showContextMenu(state, person, event) {
    const { contextMenu, contextMenuTitle, toggleImportantButton } = state.elements;
    state.contextMenuPersonId = person.id;
    contextMenuTitle.textContent = person.name;
    toggleImportantButton.textContent = state.importantPersonIds.has(person.id) ? "중요 인원 해제" : "중요 인원으로 표시";
    contextMenu.hidden = false;

    const viewportPadding = 8;
    const maxLeft = Math.max(viewportPadding, window.innerWidth - contextMenu.offsetWidth - viewportPadding);
    const maxTop = Math.max(viewportPadding, window.innerHeight - contextMenu.offsetHeight - viewportPadding);
    contextMenu.style.left = `${Math.min(event.clientX, maxLeft)}px`;
    contextMenu.style.top = `${Math.min(event.clientY, maxTop)}px`;
  }

  function renderIgnoredPeople(state, ignoredPeople) {
    const people = ignoredPeople || [];
    state.elements.ignoredWrap.dataset.visible = people.length ? "true" : "false";
    if (!people.length) {
      state.elements.ignoredWrap.replaceChildren();
      return;
    }

    state.elements.ignoredWrap.innerHTML = `
      <span class="ignored-title">무시된 목록</span>
      ${people.map((person) => `<span class="ignored-chip">${escapeHtml(person.name)}</span>`).join("")}
    `;
  }

  function colorForDisplayMask(mask, state) {
    if (isBinaryDisplayEnabled(state)) {
      return mask ? BINARY_COVERED_COLOR : core.EMPTY_CELL_COLOR;
    }
    return core.colorForMembershipMask(mask);
  }

  function getDisplayedPeople(state, dataset) {
    const regularPeople = [];
    const importantPeople = [];
    dataset.people.forEach((person) => {
      if (state.importantPersonIds.has(person.id)) {
        importantPeople.push(person);
      } else {
        regularPeople.push(person);
      }
    });
    return regularPeople.concat(importantPeople);
  }

  function getVisibleAnalysis(state, analysis) {
    const visiblePlans = isRequiredOnlyEnabled(state)
      ? core.filterPlansByRequiredPersonIds(analysis.plans, analysis.dataset, state.importantPersonIds)
      : analysis.plans;

    return {
      ...analysis,
      plans: visiblePlans,
      displayedRowCount: visiblePlans.length,
      bestPlan: visiblePlans[0] || null,
    };
  }

  function labelForDisplayMask(mask, state) {
    if (isBinaryDisplayEnabled(state)) {
      return mask ? "Covered" : "Not covered";
    }
    return core.membershipText(mask);
  }

  function setStatus(state, message, kind) {
    state.elements.status.textContent = message;
    state.elements.status.dataset.kind = kind || "info";
  }

  function getConfig(state, timeZone = core.DISPLAY_TIME_ZONE) {
    return {
      sessionMinutes: Number(state.elements.sessionLength.value),
      weeklySessionCount: Number(state.elements.weeklyCount.value),
      topLimit: core.DEFAULT_TOP_LIMIT,
      timeZone,
    };
  }

  function formatEnglishSessionLabel(session, timeZone) {
    if (!session) return "";
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      month: "short",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const startParts = Object.fromEntries(
      formatter
        .formatToParts(new Date(session.startEpoch * 1000))
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value])
    );
    const endParts = Object.fromEntries(
      formatter
        .formatToParts(new Date(session.endEpoch * 1000))
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value])
    );
    return `${startParts.month} ${startParts.day} (${startParts.weekday}) ${startParts.hour}:${startParts.minute}-${endParts.hour}:${endParts.minute}`;
  }

  function createDiv(className, textContent) {
    const element = document.createElement("div");
    if (className) {
      element.className = className;
    }
    if (typeof textContent === "string") {
      element.textContent = textContent;
    }
    return element;
  }

  function renderSessionCell(session, index, timeZone) {
    const englishLabel = formatEnglishSessionLabel(session, timeZone);
    const longLabel = session ? session.labelLong : "";
    const cell = createDiv(`session-cell session-col-${index + 1}${session ? "" : " session-empty"}`);
    if (longLabel) {
      cell.title = longLabel;
    }

    const textBox = createDiv("session-text-box", englishLabel || " ");
    textBox.style.display = "block";
    textBox.style.width = "100%";
    textBox.style.minHeight = "26px";
    textBox.style.padding = "4px 8px";
    textBox.style.border = `1px solid ${session ? "#111827" : "#cbd5e1"}`;
    textBox.style.borderRadius = "6px";
    textBox.style.background = session ? "#ffffff" : "#f8fafc";
    textBox.style.color = session ? "#000000" : "#94a3b8";
    textBox.style.webkitTextFillColor = session ? "#000000" : "#94a3b8";
    textBox.style.fontFamily = "Arial, Helvetica, sans-serif";
    textBox.style.fontSize = "12px";
    textBox.style.fontWeight = "800";
    textBox.style.lineHeight = "1.1";
    textBox.style.whiteSpace = "nowrap";
    textBox.style.overflow = "hidden";
    textBox.style.textOverflow = "ellipsis";
    textBox.style.opacity = "1";
    textBox.style.visibility = "visible";
    textBox.style.textShadow = "none";
    textBox.style.boxSizing = "border-box";
    textBox.style.position = "relative";
    textBox.style.zIndex = "2";

    cell.appendChild(textBox);
    return cell;
  }

  function renderCoverageCell(plan) {
    const cell = createDiv("session-cell session-count-cell");
    const countPill = createDiv("count-pill", String(plan.unionCount));
    const session3 = plan.sessions[2];
    cell.title = session3
      ? `Covered people: ${plan.unionCount}\nSession 3: ${session3.labelLong}`
      : `Covered people: ${plan.unionCount}`;
    cell.appendChild(countPill);
    return cell;
  }

  function setupResultsScrollSync(state) {
    const sessionBody = state.elements.resultsWrap.querySelector('.session-body');
    const peopleBody = state.elements.resultsWrap.querySelector('.people-body');
    const peopleHeaderGrid = state.elements.resultsWrap.querySelector('.people-header-grid');
    if (!sessionBody || !peopleBody || !peopleHeaderGrid) return;

    let syncing = false;
    peopleBody.addEventListener('scroll', () => {
      if (syncing) return;
      syncing = true;
      sessionBody.scrollTop = peopleBody.scrollTop;
      peopleHeaderGrid.style.transform = `translateX(${-peopleBody.scrollLeft}px)`;
      syncing = false;
    });
    sessionBody.addEventListener('scroll', () => {
      if (syncing) return;
      syncing = true;
      peopleBody.scrollTop = sessionBody.scrollTop;
      syncing = false;
    });
  }


  function getLocalDateKey(epochSeconds, timeZone) {
    const parts = core.getZonedParts(epochSeconds, timeZone);
    return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  }

  function getLocalTimeKey(epochSeconds, timeZone) {
    const parts = core.getZonedParts(epochSeconds, timeZone);
    return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
  }

  function getDayLabel(epochSeconds, timeZone) {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      month: "short",
      day: "numeric",
      weekday: "short",
    });
    return formatter.format(new Date(epochSeconds * 1000));
  }

  function collectPreviewAxes(dataset, timeZone) {
    const slotEpochs = [...dataset.timeOfSlot.values()].sort((a, b) => a - b);
    const dayEpochByKey = new Map();
    const timeKeys = new Set();
    for (const epoch of slotEpochs) {
      const parts = core.getZonedParts(epoch, timeZone);
      if (parts.minute % 30 !== 0) continue;
      const dayKey = getLocalDateKey(epoch, timeZone);
      if (!dayEpochByKey.has(dayKey)) {
        dayEpochByKey.set(dayKey, epoch);
      }
      timeKeys.add(getLocalTimeKey(epoch, timeZone));
    }
    const days = [...dayEpochByKey.entries()].map(([key, epoch]) => ({ key, label: getDayLabel(epoch, timeZone), epoch }));
    days.sort((a, b) => a.epoch - b.epoch);
    const times = [...timeKeys].sort();
    return { days, times };
  }

  function colorForPreviewMask(mask) {
    return core.colorForMembershipMask(mask);
  }

  function renderPreview(state, analysis, planIndex) {
    const plan = analysis.plans[planIndex] || analysis.plans[0];
    if (!plan) {
      state.elements.previewWrap.innerHTML = '<div class="table-empty">No preview available.</div>';
      return;
    }

    const timeZone = analysis.config.timeZone;
    const { days, times } = collectPreviewAxes(analysis.dataset, timeZone);
    const membershipByCell = new Map();

    plan.sessions.forEach((session, sessionIndex) => {
      if (!session) return;
      for (let epoch = session.startEpoch; epoch < session.endEpoch; epoch += 30 * 60) {
        const key = `${getLocalDateKey(epoch, timeZone)}|${getLocalTimeKey(epoch, timeZone)}`;
        membershipByCell.set(key, (membershipByCell.get(key) || 0) | (1 << sessionIndex));
      }
    });

    const previewWrap = state.elements.previewWrap;
    previewWrap.replaceChildren();

    const head = createDiv('preview-head');
    const titleWrap = createDiv();
    titleWrap.appendChild(createDiv('preview-title', 'Selected plan timetable'));
    titleWrap.appendChild(createDiv('preview-subtitle', `Click any candidate row below to update this preview. Showing plan #${planIndex + 1}.`));
    const meta = createDiv('preview-subtitle', plan.sessions.filter(Boolean).map((session, index) => `S${index + 1}: ${formatEnglishSessionLabel(session, timeZone)}`).join(' · '));
    head.appendChild(titleWrap);
    head.appendChild(meta);

    const gridWrap = createDiv('preview-grid-wrap');
    const grid = createDiv('preview-grid');
    grid.style.gridTemplateColumns = `44px repeat(${days.length}, minmax(60px, 1fr))`;

    grid.appendChild(createDiv('preview-cell preview-corner', 'Time'));
    days.forEach((day) => {
      grid.appendChild(createDiv('preview-cell preview-day', day.label));
    });

    times.forEach((time) => {
      grid.appendChild(createDiv('preview-cell preview-time', time));
      days.forEach((day) => {
        const cellKey = `${day.key}|${time}`;
        const membership = membershipByCell.get(cellKey) || 0;
        const cell = createDiv(`preview-cell preview-slot${membership ? ' active' : ''}`);
        cell.style.background = colorForDisplayMask(membership, state);
        if (membership) {
          const detailedMembership = core.membershipText(membership);
          const displayLabel = labelForDisplayMask(membership, state);
          cell.title = isBinaryDisplayEnabled(state) ? `${displayLabel} (${detailedMembership})` : detailedMembership;
          cell.appendChild(createDiv('preview-slot-label', displayLabel));
        }
        grid.appendChild(cell);
      });
    });

    gridWrap.appendChild(grid);
    previewWrap.appendChild(head);
    previewWrap.appendChild(gridWrap);
  }

  function renderSummary(state, extraction, analysis) {
    const extractionLabel = extraction.source === "window"
      ? "window globals"
      : extraction.source === "html"
        ? "DOM fallback"
        : extraction.source;
    const cards = [
      ["Extraction", extractionLabel],
      ["People", analysis.dataset.people.length],
      ["Sessions", analysis.sessions.length],
      ["Combinations", analysis.combinationsEvaluated],
      ["Rows", analysis.displayedRowCount],
      ["Best union", analysis.bestPlan ? analysis.bestPlan.unionCount : "-"],
    ];

    state.elements.summary.innerHTML = cards
      .map(
        ([label, value]) => `
          <article class="summary-card">
            <div class="label">${escapeHtml(label)}</div>
            <div class="value">${escapeHtml(value)}</div>
          </article>
        `
      )
      .join("");
  }

  function renderLegend(state) {
    const items = isBinaryDisplayEnabled(state)
      ? [
          [BINARY_COVERED_COLOR, "Covered by at least one session"],
          [core.EMPTY_CELL_COLOR, "Not covered"],
        ]
      : [
          [core.EMPTY_CELL_COLOR, "Not covered"],
          [core.colorForMembershipMask(1), "Session 1"],
          [core.colorForMembershipMask(2), "Session 2"],
          [core.colorForMembershipMask(4), "Session 3"],
          [core.colorForMembershipMask(3), "1 + 2"],
          [core.colorForMembershipMask(5), "1 + 3"],
          [core.colorForMembershipMask(6), "2 + 3"],
          [core.colorForMembershipMask(7), "1 + 2 + 3"],
        ];

    state.elements.legend.innerHTML = items
      .map(
        ([color, label]) => `
          <span class="legend-item">
            <span class="swatch" style="background:${escapeHtml(color)}"></span>
            ${escapeHtml(label)}
          </span>
        `
      )
      .join("");
    state.elements.footerNote.textContent = isBinaryDisplayEnabled(state)
      ? "Binary display highlights whether each person or slot is covered by at least one selected session."
      : "Colors encode person coverage across Session 1/2/3 using additive RGB mixing. Uncovered people stay dark gray.";
  }

  function renderResults(state, analysis) {
    const visibleAnalysis = getVisibleAnalysis(state, analysis);
    const displayedPeople = getDisplayedPeople(state, visibleAnalysis.dataset);
    const peopleGridTemplate = displayedPeople.length ? `repeat(${displayedPeople.length}, 34px)` : "1fr";
    const selectedPlanIndex = Math.min(state.selectedPlanIndex || 0, Math.max(visibleAnalysis.plans.length - 1, 0));

    const splitResults = createDiv("split-results");
    const sessionPane = document.createElement("section");
    sessionPane.className = "session-pane";
    const peoplePane = document.createElement("section");
    peoplePane.className = "people-pane";

    const sessionHeader = createDiv("pane-header");
    const sessionHeaderGrid = createDiv("session-header-grid");
    ["Session 1", "Session 2", "People"].forEach((label) => {
      sessionHeaderGrid.appendChild(createDiv("session-header-cell", label));
    });
    sessionHeader.appendChild(sessionHeaderGrid);

    const sessionBody = createDiv("pane-body session-body");
    if (!visibleAnalysis.plans.length) {
      sessionBody.appendChild(createDiv("table-empty", "No rows match the required-person filter."));
    }
    visibleAnalysis.plans.forEach((plan, rowIndex) => {
      const rowNode = createDiv(`session-row-grid ${rowIndex % 2 === 1 ? "data-row-even" : "data-row-odd"}${rowIndex === selectedPlanIndex ? " is-selected" : ""}`);
      rowNode.dataset.planIndex = String(rowIndex);
      rowNode.style.cursor = 'pointer';
      for (let index = 0; index < 2; index += 1) {
        rowNode.appendChild(renderSessionCell(plan.sessions[index], index, visibleAnalysis.config.timeZone));
      }
      rowNode.appendChild(renderCoverageCell(plan));
      rowNode.addEventListener('click', () => selectPlan(state, visibleAnalysis, rowIndex));
      sessionBody.appendChild(rowNode);
    });

    sessionPane.appendChild(sessionHeader);
    sessionPane.appendChild(sessionBody);

    const peopleHeaderViewport = createDiv("pane-header people-header-viewport");
    const peopleHeaderGrid = createDiv("people-header-grid");
    peopleHeaderGrid.style.gridTemplateColumns = peopleGridTemplate;
    displayedPeople.forEach((person) => {
      const headCell = createDiv("person-header-cell");
      headCell.title = `${person.name} (right-click to manage)`;
      headCell.dataset.personId = String(person.id);
      if (state.importantPersonIds.has(person.id)) {
        headCell.classList.add("is-important");
      }
      const headText = createDiv("person-head", person.name);
      headCell.appendChild(headText);
      headCell.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        showContextMenu(state, person, event);
      });
      peopleHeaderGrid.appendChild(headCell);
    });
    peopleHeaderViewport.appendChild(peopleHeaderGrid);

    const peopleBody = createDiv("pane-body people-body");
    if (!visibleAnalysis.plans.length) {
      peopleBody.appendChild(createDiv("table-empty", "No rows match the required-person filter."));
    }
    visibleAnalysis.plans.forEach((plan, rowIndex) => {
      const row = core.planToTableRow(plan, visibleAnalysis.dataset);
      const cellsByPersonId = new Map(row.personCells.map((cell) => [cell.personId, cell]));
      const rowNode = createDiv(`people-row-grid ${rowIndex % 2 === 1 ? "data-row-even" : "data-row-odd"}${rowIndex === selectedPlanIndex ? " is-selected" : ""}`);
      rowNode.dataset.planIndex = String(rowIndex);
      rowNode.style.gridTemplateColumns = peopleGridTemplate;
      rowNode.style.cursor = 'pointer';
      displayedPeople.forEach((person) => {
        const cell = cellsByPersonId.get(person.id);
        if (!cell) return;
        const personCell = createDiv("person-cell");
        const displayLabel = labelForDisplayMask(cell.mask, state);
        personCell.title = isBinaryDisplayEnabled(state)
          ? `${cell.personName}: ${displayLabel} (${cell.label})`
          : `${cell.personName}: ${cell.label}`;
        const fill = createDiv("person-fill");
        fill.style.background = colorForDisplayMask(cell.mask, state);
        personCell.appendChild(fill);
        rowNode.appendChild(personCell);
      });
      rowNode.addEventListener('click', () => selectPlan(state, visibleAnalysis, rowIndex));
      peopleBody.appendChild(rowNode);
    });

    peoplePane.appendChild(peopleHeaderViewport);
    peoplePane.appendChild(peopleBody);

    splitResults.appendChild(sessionPane);
    splitResults.appendChild(peoplePane);

    state.elements.resultsWrap.replaceChildren(splitResults);
    setupResultsScrollSync(state);
    selectPlan(state, visibleAnalysis, selectedPlanIndex);
  }

  function selectPlan(state, analysis, planIndex) {
    state.selectedPlanIndex = planIndex;
    const rows = state.elements.resultsWrap.querySelectorAll('[data-plan-index]');
    rows.forEach((row) => {
      row.classList.toggle('is-selected', Number(row.dataset.planIndex) === planIndex);
    });
    renderPreview(state, analysis, planIndex);
  }

  function renderError(state, error) {
    setStatus(state, error && error.message ? error.message : String(error), "error");
    state.elements.summary.innerHTML = "";
    state.elements.resultsWrap.innerHTML = `<div class="table-empty">${escapeHtml(error && error.stack ? error.stack : String(error))}</div>`;
  }

  function focusPanel(state) {
    state.host.style.zIndex = Z_INDEX;
  }

  function analyzeAndRender(state) {
    hideContextMenu(state);
    setStatus(state, "Analyzing current page availability…", "info");

    try {
      const pageHtml = document && document.documentElement ? document.documentElement.outerHTML : "";
      const inferredTimeZone = core.inferDisplayTimeZoneFromHtml(pageHtml);
      const extraction = core.extractDatasetFromPage(window, document);
      const availabilityPartition = core.partitionDatasetByAvailability(extraction.dataset);
      state.lastIgnoredPeople = availabilityPartition.ignoredPeople;
      renderIgnoredPeople(state, state.lastIgnoredPeople);
      const filteredDataset = core.filterDatasetByPersonIds(availabilityPartition.dataset, state.excludedPersonIds);
      const analysis = core.analyzeDataset(filteredDataset, getConfig(state, inferredTimeZone));
      state.lastExtraction = {
        ...extraction,
        source: `${extraction.source}${state.lastIgnoredPeople.length ? " + ignored" : ""}${state.excludedPersonIds.size ? " + filtered" : ""}`,
      };
      state.lastAnalysis = analysis;
      renderSummary(state, state.lastExtraction, getVisibleAnalysis(state, analysis));
      renderResults(state, analysis);
      setStatus(
        state,
        `Success: ${analysis.dataset.people.length} people, ${analysis.sessions.length} candidate sessions, ${analysis.combinationsEvaluated} evaluated combinations, ${analysis.displayedRowCount} displayed rows.${state.lastIgnoredPeople.length ? ` Ignored: ${state.lastIgnoredPeople.length}.` : ""}${state.excludedPersonIds.size ? ` Excluded: ${state.excludedPersonIds.size}.` : ""}`,
        "success"
      );
    } catch (error) {
      renderError(state, error);
    }
  }

  function run() {
    const state = ensurePanel();
    focusPanel(state);
    analyzeAndRender(state);
    return state;
  }

  return {
    run,
  };
});
