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
        overflow: auto;
        max-height: min(54vh, 680px);
      }
      table {
        width: max-content;
        min-width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        font-size: 12px;
      }
      thead th {
        position: sticky;
        top: 0;
        z-index: 3;
        background: #e2e8f0;
        color: #0f172a;
      }
      th, td {
        border-right: 1px solid #e2e8f0;
        border-bottom: 1px solid #e2e8f0;
        padding: 8px 10px;
        text-align: center;
        white-space: nowrap;
      }
      tbody tr:nth-child(even) {
        background: rgba(248, 250, 252, 0.9);
      }
      .sticky-col {
        position: sticky;
        left: 0;
        z-index: 2;
      }
      .sticky-col.session-col-2 {
        left: 168px;
      }
      .sticky-col.session-col-3 {
        left: 336px;
      }
      thead .sticky-col {
        z-index: 4;
        background: #e2e8f0;
      }
      .session-col {
        width: 168px;
        min-width: 168px;
        max-width: 168px;
        text-align: left;
        font-weight: 600;
        background: #dbe4ee;
        color: #0f172a;
        background-clip: padding-box;
      }
      tbody .session-col {
        z-index: 3;
        background: #dbe4ee;
        box-shadow: inset -1px 0 0 #cbd5e1;
      }
      tbody tr:nth-child(even) .session-col {
        background: #cfd9e6;
      }
      .session-label {
        display: flex;
        align-items: center;
        min-height: 36px;
        padding: 6px 8px;
        border-radius: 8px;
        white-space: normal;
        word-break: break-word;
        line-height: 1.35;
        font-size: 12px;
        font-weight: 700;
        color: #111827;
        background: #ffffff;
        box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
      }
      .session-col-1 .session-label {
        background: #fecaca;
      }
      .session-col-2 .session-label {
        background: #bbf7d0;
      }
      .session-col-3 .session-label {
        background: #bfdbfe;
      }
      .session-empty {
        color: #94a3b8;
      }
      .session-empty .session-label {
        background: rgba(255, 255, 255, 0.55);
        color: #94a3b8;
      }
      .person-head {
        writing-mode: vertical-rl;
        text-orientation: mixed;
        min-width: 34px;
        width: 34px;
        font-size: 11px;
        line-height: 1.1;
      }
      .person-cell {
        min-width: 34px;
        width: 34px;
        padding: 0;
        height: 30px;
      }
      .person-fill {
        display: block;
        width: 100%;
        height: 100%;
        min-height: 30px;
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
        .sticky-col,
        .sticky-col.session-col-2,
        .sticky-col.session-col-3 {
          position: static;
        }
        table {
          width: 100%;
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
          <div class="titlebar-actions">
            <button class="icon-button" data-action="refresh" type="button">Refresh</button>
            <button class="icon-button" data-action="close" type="button">Close</button>
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
          <section class="status" data-kind="info" id="status">Ready.</section>
          <section class="summary-grid" id="summary"></section>
          <section class="legend" id="legend"></section>
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

  function renderSessionCell(session, index, timeZone) {
    const englishLabel = formatEnglishSessionLabel(session, timeZone);
    const longLabel = session ? session.labelLong : "";
    return `
      <td class="sticky-col session-col session-col-${index + 1}${session ? "" : " session-empty"}" title="${session ? escapeHtml(longLabel) : ""}">
        <span class="session-label">${session ? escapeHtml(englishLabel) : ""}</span>
      </td>
    `;
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
    const peopleHead = analysis.dataset.people
      .map((person) => `<th class="person-head" title="${escapeHtml(person.name)}">${escapeHtml(person.name)}</th>`)
      .join("");

    const rows = analysis.plans
      .map((plan) => {
        const row = core.planToTableRow(plan, analysis.dataset);
        const sessionCells = Array.from({ length: 3 }, (_, index) => renderSessionCell(plan.sessions[index], index, analysis.config.timeZone)).join("");
        const personCells = row.personCells
          .map(
            (cell) => `
              <td class="person-cell" title="${escapeHtml(cell.personName)}: ${escapeHtml(cell.label)}">
                <span class="person-fill" style="background:${escapeHtml(cell.color)}"></span>
              </td>
            `
          )
          .join("");
        return `<tr>${sessionCells}${personCells}</tr>`;
      })
      .join("");

    state.elements.resultsWrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th class="sticky-col session-col session-col-1">Session 1</th>
            <th class="sticky-col session-col session-col-2">Session 2</th>
            <th class="sticky-col session-col session-col-3">Session 3</th>
            ${peopleHead}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
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
