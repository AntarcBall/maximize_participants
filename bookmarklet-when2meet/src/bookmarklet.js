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
        color: #111827;
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #ffffff;
        border: 1px solid rgba(15, 23, 42, 0.12);
        border-radius: 16px;
        box-shadow: 0 28px 60px rgba(15, 23, 42, 0.28);
        overflow: hidden;
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
      .status {
        border-radius: 12px;
        padding: 10px 12px;
        background: #e2e8f0;
        color: #0f172a;
        font-size: 12px;
        line-height: 1.45;
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
        padding: 12px;
      }
      .summary-card .label {
        font-size: 11px;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .summary-card .value {
        margin-top: 4px;
        font-size: 20px;
        font-weight: 800;
        color: #0f172a;
      }
      .legend {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .preview-wrap {
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
      .swatch {
        width: 14px;
        height: 14px;
        border-radius: 999px;
        border: 1px solid rgba(15, 23, 42, 0.18);
        flex: 0 0 auto;
      }
      .table-wrap {
        background: #ffffff;
        border-radius: 14px;
        border: 1px solid rgba(148, 163, 184, 0.35);
        overflow: hidden;
        max-height: min(54vh, 680px);
      }
      .split-results {
        display: flex;
        align-items: stretch;
        min-width: 100%;
        height: min(54vh, 680px);
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
        grid-template-columns: 168px 168px 168px;
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
        min-height: 42px;
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
        min-height: 42px;
        padding: 6px;
        border-right: 1px solid #e2e8f0;
        border-bottom: 1px solid #e2e8f0;
        box-sizing: border-box;
        background: #fff;
      }
      .session-cell:last-child {
        border-right: 0;
      }
      .session-text-box {
        display: block !important;
        width: 100% !important;
        min-height: 30px;
        padding: 6px 8px;
        border: 1px solid #111827;
        border-radius: 6px;
        background: #ffffff;
        color: #000000 !important;
        -webkit-text-fill-color: #000000 !important;
        font: 800 15px/1.4 Arial, Helvetica, sans-serif !important;
        white-space: normal !important;
        word-break: break-word !important;
        overflow-wrap: anywhere;
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
      .person-cell {
        min-width: 34px;
        width: 34px;
        min-height: 42px;
        border-right: 1px solid #e2e8f0;
        border-bottom: 1px solid #e2e8f0;
        box-sizing: border-box;
        background: #fff;
      }
      .person-fill {
        display: block;
        width: 100%;
        min-height: 41px;
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
      @media (max-width: 960px) {
        .panel {
          width: 96vw;
          max-height: 92vh;
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
          </section>
          <section class="status" data-kind="info" id="status">Ready. ${escapeHtml(BOOKMARKLET_VERSION)}</section>
          <section class="summary-grid" id="summary"></section>
          <section class="legend" id="legend"></section>
          <section class="preview-wrap" id="previewWrap"></section>
          <section class="table-wrap" id="resultsWrap">
            <div class="table-empty">Run the analyzer to see ranked plans.</div>
          </section>
          <div class="footer-note">Colors encode person coverage across Session 1/2/3 using additive RGB mixing. Uncovered people stay dark gray.</div>
        </div>
      </section>
    `;
  }

  function getElements(shadowRoot) {
    return {
      sessionLength: shadowRoot.getElementById("sessionLength"),
      weeklyCount: shadowRoot.getElementById("weeklyCount"),
      status: shadowRoot.getElementById("status"),
      summary: shadowRoot.getElementById("summary"),
      legend: shadowRoot.getElementById("legend"),
      previewWrap: shadowRoot.getElementById("previewWrap"),
      resultsWrap: shadowRoot.getElementById("resultsWrap"),
      closeButton: shadowRoot.querySelector('[data-action="close"]'),
      refreshButton: shadowRoot.querySelector('[data-action="refresh"]'),
      titlebar: shadowRoot.querySelector(".titlebar"),
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
    elements.sessionLength.addEventListener("change", rerun);
    elements.weeklyCount.addEventListener("change", rerun);
    elements.refreshButton.addEventListener("click", rerun);
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
  }

  function setStatus(state, message, kind) {
    state.elements.status.textContent = message;
    state.elements.status.dataset.kind = kind || "info";
  }

  function getConfig(state) {
    return {
      sessionMinutes: Number(state.elements.sessionLength.value),
      weeklySessionCount: Number(state.elements.weeklyCount.value),
      topLimit: core.DEFAULT_TOP_LIMIT,
      timeZone: core.DISPLAY_TIME_ZONE,
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
    textBox.style.minHeight = "30px";
    textBox.style.padding = "6px 8px";
    textBox.style.border = `1px solid ${session ? "#111827" : "#cbd5e1"}`;
    textBox.style.borderRadius = "6px";
    textBox.style.background = session ? "#ffffff" : "#f8fafc";
    textBox.style.color = session ? "#000000" : "#94a3b8";
    textBox.style.webkitTextFillColor = session ? "#000000" : "#94a3b8";
    textBox.style.fontFamily = "Arial, Helvetica, sans-serif";
    textBox.style.fontSize = "15px";
    textBox.style.fontWeight = "800";
    textBox.style.lineHeight = "1.4";
    textBox.style.whiteSpace = "normal";
    textBox.style.wordBreak = "break-word";
    textBox.style.overflowWrap = "anywhere";
    textBox.style.opacity = "1";
    textBox.style.visibility = "visible";
    textBox.style.textShadow = "none";
    textBox.style.boxSizing = "border-box";
    textBox.style.position = "relative";
    textBox.style.zIndex = "2";

    cell.appendChild(textBox);
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
    grid.style.gridTemplateColumns = `88px repeat(${days.length}, minmax(120px, 1fr))`;

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
        cell.style.background = colorForPreviewMask(membership);
        if (membership) {
          cell.title = core.membershipText(membership);
          cell.appendChild(createDiv('preview-slot-label', core.membershipText(membership)));
        }
        grid.appendChild(cell);
      });
    });

    gridWrap.appendChild(grid);
    previewWrap.appendChild(head);
    previewWrap.appendChild(gridWrap);
  }

  function renderSummary(state, extraction, analysis) {
    const cards = [
      ["Extraction", extraction.source === "window" ? "window globals" : "DOM fallback"],
      ["People", analysis.dataset.people.length],
      ["Sessions", analysis.sessions.length],
      ["Combinations", analysis.combinationsEvaluated],
      ["Rows", analysis.displayedRowCount],
      ["Best union", analysis.bestPlan.unionCount],
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
    const items = [
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
  }

  function renderResults(state, analysis) {
    const peopleGridTemplate = `repeat(${analysis.dataset.people.length}, 34px)`;

    const splitResults = createDiv("split-results");
    const sessionPane = document.createElement("section");
    sessionPane.className = "session-pane";
    const peoplePane = document.createElement("section");
    peoplePane.className = "people-pane";

    const sessionHeader = createDiv("pane-header");
    const sessionHeaderGrid = createDiv("session-header-grid");
    ["Session 1", "Session 2", "Session 3"].forEach((label) => {
      sessionHeaderGrid.appendChild(createDiv("session-header-cell", label));
    });
    sessionHeader.appendChild(sessionHeaderGrid);

    const sessionBody = createDiv("pane-body session-body");
    analysis.plans.forEach((plan, rowIndex) => {
      const rowNode = createDiv(`session-row-grid ${rowIndex % 2 === 1 ? "data-row-even" : "data-row-odd"}${rowIndex === 0 ? " is-selected" : ""}`);
      rowNode.dataset.planIndex = String(rowIndex);
      rowNode.style.cursor = 'pointer';
      for (let index = 0; index < 3; index += 1) {
        rowNode.appendChild(renderSessionCell(plan.sessions[index], index, analysis.config.timeZone));
      }
      rowNode.addEventListener('click', () => selectPlan(state, analysis, rowIndex));
      sessionBody.appendChild(rowNode);
    });

    sessionPane.appendChild(sessionHeader);
    sessionPane.appendChild(sessionBody);

    const peopleHeaderViewport = createDiv("pane-header people-header-viewport");
    const peopleHeaderGrid = createDiv("people-header-grid");
    peopleHeaderGrid.style.gridTemplateColumns = peopleGridTemplate;
    analysis.dataset.people.forEach((person) => {
      const headCell = createDiv("person-header-cell");
      headCell.title = person.name;
      const headText = createDiv("person-head", person.name);
      headCell.appendChild(headText);
      peopleHeaderGrid.appendChild(headCell);
    });
    peopleHeaderViewport.appendChild(peopleHeaderGrid);

    const peopleBody = createDiv("pane-body people-body");
    analysis.plans.forEach((plan, rowIndex) => {
      const row = core.planToTableRow(plan, analysis.dataset);
      const rowNode = createDiv(`people-row-grid ${rowIndex % 2 === 1 ? "data-row-even" : "data-row-odd"}${rowIndex === 0 ? " is-selected" : ""}`);
      rowNode.dataset.planIndex = String(rowIndex);
      rowNode.style.gridTemplateColumns = peopleGridTemplate;
      rowNode.style.cursor = 'pointer';
      row.personCells.forEach((cell) => {
        const personCell = createDiv("person-cell");
        personCell.title = `${cell.personName}: ${cell.label}`;
        const fill = createDiv("person-fill");
        fill.style.background = cell.color;
        personCell.appendChild(fill);
        rowNode.appendChild(personCell);
      });
      rowNode.addEventListener('click', () => selectPlan(state, analysis, rowIndex));
      peopleBody.appendChild(rowNode);
    });

    peoplePane.appendChild(peopleHeaderViewport);
    peoplePane.appendChild(peopleBody);

    splitResults.appendChild(sessionPane);
    splitResults.appendChild(peoplePane);

    state.elements.resultsWrap.replaceChildren(splitResults);
    setupResultsScrollSync(state);
    selectPlan(state, analysis, 0);
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
    setStatus(state, "Analyzing current page availability…", "info");

    try {
      const extraction = core.extractDatasetFromPage(window, document);
      const analysis = core.analyzeDataset(extraction.dataset, getConfig(state));
      state.lastAnalysis = analysis;
      renderSummary(state, extraction, analysis);
      renderResults(state, analysis);
      setStatus(
        state,
        `Success: ${analysis.dataset.people.length} people, ${analysis.sessions.length} candidate sessions, ${analysis.combinationsEvaluated} evaluated combinations, ${analysis.displayedRowCount} displayed rows.`,
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
