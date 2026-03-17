(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.When2MeetMultiSessionCore = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DISPLAY_LOCALE = "ko-KR";
  const DISPLAY_TIME_ZONE = "Asia/Seoul";
  const SESSION_LENGTH_OPTIONS = Object.freeze([60, 90]);
  const WEEKLY_SESSION_COUNT_OPTIONS = Object.freeze([1, 2, 3]);
  const DEFAULT_TOP_LIMIT = 50;
  const EMPTY_CELL_COLOR = "#6b7280";
  const SLOT_SECONDS = 15 * 60;
  const NAME_COLLATOR = new Intl.Collator(DISPLAY_LOCALE, {
    numeric: true,
    sensitivity: "base",
  });
  const COLOR_BY_MEMBERSHIP_MASK = Object.freeze({
    0: EMPTY_CELL_COLOR,
    1: "rgb(255, 0, 0)",
    2: "rgb(0, 255, 0)",
    3: "rgb(255, 255, 0)",
    4: "rgb(0, 0, 255)",
    5: "rgb(255, 0, 255)",
    6: "rgb(0, 255, 255)",
    7: "rgb(255, 255, 255)",
  });

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  function createRawMaps() {
    return {
      peopleNamesByIndex: new Map(),
      peopleIdsByIndex: new Map(),
      timeOfSlotByIndex: new Map(),
      availableAtSlotByIndex: new Map(),
    };
  }

  function pushAvailability(raw, slotIndex, personId) {
    if (!raw.availableAtSlotByIndex.has(slotIndex)) {
      raw.availableAtSlotByIndex.set(slotIndex, new Set());
    }
    raw.availableAtSlotByIndex.get(slotIndex).add(personId);
  }

  function parseNumericMapFromArray(rawArray) {
    const map = new Map();
    for (let index = 0; index < rawArray.length; index += 1) {
      if (typeof rawArray[index] === "number" && Number.isFinite(rawArray[index])) {
        map.set(index, rawArray[index]);
      }
    }
    return map;
  }

  function parseStringMapFromArray(rawArray) {
    const map = new Map();
    for (let index = 0; index < rawArray.length; index += 1) {
      if (typeof rawArray[index] === "string") {
        map.set(index, rawArray[index]);
      }
    }
    return map;
  }

  function parseAvailabilityMapFromArray(rawArray) {
    const map = new Map();
    for (let index = 0; index < rawArray.length; index += 1) {
      const value = rawArray[index];
      if (!Array.isArray(value)) continue;
      map.set(index, new Set(value.filter((item) => typeof item === "number" && Number.isFinite(item))));
    }
    return map;
  }

  function datasetFromGlobals(scope) {
    if (!scope) return null;
    if (!Array.isArray(scope.PeopleNames) || !Array.isArray(scope.PeopleIDs) || !Array.isArray(scope.TimeOfSlot) || !Array.isArray(scope.AvailableAtSlot)) {
      return null;
    }

    const raw = createRawMaps();
    raw.peopleNamesByIndex = parseStringMapFromArray(scope.PeopleNames);
    raw.peopleIdsByIndex = parseNumericMapFromArray(scope.PeopleIDs);
    raw.timeOfSlotByIndex = parseNumericMapFromArray(scope.TimeOfSlot);
    raw.availableAtSlotByIndex = parseAvailabilityMapFromArray(scope.AvailableAtSlot);

    if (!raw.peopleIdsByIndex.size || !raw.timeOfSlotByIndex.size) {
      return null;
    }

    return {
      source: "window",
      dataset: normalizeDataset(raw),
    };
  }

  function decodeJsStringLiteral(literal) {
    return Function(`"use strict"; return (${literal});`)();
  }

  function parseDatasetFromHtml(html) {
    assert(typeof html === "string" && html.trim(), "Fallback extraction requires non-empty HTML source");

    const raw = createRawMaps();
    const nameRegex = /PeopleNames\[(\d+)\]\s*=\s*('(?:\\.|[^'])*'|"(?:\\.|[^"])*")\s*;/g;
    const idRegex = /PeopleIDs\[(\d+)\]\s*=\s*(-?\d+)\s*;/g;
    const timeRegex = /TimeOfSlot\[(\d+)\]\s*=\s*(\d+)\s*;/g;
    const availableRegex = /AvailableAtSlot\[(\d+)\]\.push\((-?\d+)\)\s*;/g;

    for (const [, indexText, literal] of html.matchAll(nameRegex)) {
      raw.peopleNamesByIndex.set(Number(indexText), decodeJsStringLiteral(literal));
    }
    for (const [, indexText, idText] of html.matchAll(idRegex)) {
      raw.peopleIdsByIndex.set(Number(indexText), Number(idText));
    }
    for (const [, indexText, epochText] of html.matchAll(timeRegex)) {
      raw.timeOfSlotByIndex.set(Number(indexText), Number(epochText));
    }
    for (const [, slotText, idText] of html.matchAll(availableRegex)) {
      pushAvailability(raw, Number(slotText), Number(idText));
    }

    return {
      source: "html",
      dataset: normalizeDataset(raw),
    };
  }

  function normalizeDataset(raw) {
    assert(raw && raw.peopleIdsByIndex && raw.timeOfSlotByIndex, "Cannot normalize empty dataset");
    assert(raw.peopleIdsByIndex.size, "No PeopleIDs entries were found");
    assert(raw.timeOfSlotByIndex.size, "No TimeOfSlot entries were found");

    const people = [...raw.peopleIdsByIndex.entries()]
      .map(([index, id]) => ({
        id,
        name: raw.peopleNamesByIndex.get(index) || String(id),
        sortKey: raw.peopleNamesByIndex.get(index) || String(id),
      }))
      .sort((left, right) => NAME_COLLATOR.compare(left.sortKey, right.sortKey) || left.id - right.id);

    assert(people.length > 0, "No people were found in the dataset");

    const personIndexById = new Map();
    people.forEach((person, index) => {
      personIndexById.set(person.id, index);
    });

    const timeOfSlot = new Map([...raw.timeOfSlotByIndex.entries()].sort((left, right) => left[0] - right[0]));
    const availableAtSlot = new Map();
    for (const [slotIndex] of timeOfSlot.entries()) {
      availableAtSlot.set(slotIndex, new Set());
    }
    for (const [slotIndex, attendeeIds] of raw.availableAtSlotByIndex.entries()) {
      if (!availableAtSlot.has(slotIndex)) {
        availableAtSlot.set(slotIndex, new Set());
      }
      const filtered = availableAtSlot.get(slotIndex);
      for (const personId of attendeeIds) {
        if (personIndexById.has(personId)) {
          filtered.add(personId);
        }
      }
    }

    return {
      people,
      personIndexById,
      timeOfSlot,
      availableAtSlot,
    };
  }

  function extractDatasetFromPage(scope, doc) {
    const fromGlobals = datasetFromGlobals(scope);
    if (fromGlobals) {
      return fromGlobals;
    }
    const html = doc && doc.documentElement ? doc.documentElement.outerHTML : "";
    return parseDatasetFromHtml(html);
  }

  function normalizeSlotLabel(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function formatSlotLabelForZone(epochSeconds, timeZone) {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    return normalizeSlotLabel(formatter.format(new Date(epochSeconds * 1000)).replace(",", ""));
  }

  function inferDisplayTimeZoneFromHtml(html) {
    if (typeof html !== "string" || !html) {
      return DISPLAY_TIME_ZONE;
    }

    const slotMatches = [...html.matchAll(/ShowSlot\((\d+),&quot;([^&]+)&quot;\)/g)].slice(0, 24);
    if (!slotMatches.length) {
      return DISPLAY_TIME_ZONE;
    }

    const candidates = [...new Set(["UTC", DISPLAY_TIME_ZONE])];
    let bestZone = DISPLAY_TIME_ZONE;
    let bestScore = -1;

    for (const timeZone of candidates) {
      let score = 0;
      for (const [, epochText, label] of slotMatches) {
        const epochSeconds = Number(epochText);
        if (!Number.isFinite(epochSeconds)) continue;
        if (formatSlotLabelForZone(epochSeconds, timeZone) === normalizeSlotLabel(label)) {
          score += 1;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestZone = timeZone;
      }
    }

    return bestScore > 0 ? bestZone : DISPLAY_TIME_ZONE;
  }

  function filterDatasetByPersonIds(dataset, excludedPersonIds) {
    if (!excludedPersonIds || (excludedPersonIds instanceof Set ? excludedPersonIds.size === 0 : excludedPersonIds.length === 0)) {
      return dataset;
    }

    const excluded = excludedPersonIds instanceof Set ? excludedPersonIds : new Set(excludedPersonIds);
    const people = dataset.people.filter((person) => !excluded.has(person.id));
    assert(people.length > 0, "No people remain after applying excluded-person filters");

    const personIndexById = new Map();
    people.forEach((person, index) => {
      personIndexById.set(person.id, index);
    });

    const timeOfSlot = new Map(dataset.timeOfSlot);
    const availableAtSlot = new Map();
    for (const [slotIndex, attendeeIds] of dataset.availableAtSlot.entries()) {
      const filteredAttendees = new Set();
      for (const personId of attendeeIds) {
        if (personIndexById.has(personId)) {
          filteredAttendees.add(personId);
        }
      }
      availableAtSlot.set(slotIndex, filteredAttendees);
    }

    return {
      people,
      personIndexById,
      timeOfSlot,
      availableAtSlot,
    };
  }

  function partitionDatasetByAvailability(dataset) {
    const activePersonIds = new Set();
    for (const attendeeIds of dataset.availableAtSlot.values()) {
      for (const personId of attendeeIds) {
        activePersonIds.add(personId);
      }
    }

    const ignoredPeople = dataset.people.filter((person) => !activePersonIds.has(person.id));
    if (!ignoredPeople.length) {
      return {
        dataset,
        ignoredPeople,
      };
    }

    const keptPeople = dataset.people.filter((person) => activePersonIds.has(person.id));
    const personIndexById = new Map();
    keptPeople.forEach((person, index) => {
      personIndexById.set(person.id, index);
    });

    const availableAtSlot = new Map();
    for (const [slotIndex, attendeeIds] of dataset.availableAtSlot.entries()) {
      const filteredAttendees = new Set();
      for (const personId of attendeeIds) {
        if (personIndexById.has(personId)) {
          filteredAttendees.add(personId);
        }
      }
      availableAtSlot.set(slotIndex, filteredAttendees);
    }

    return {
      dataset: {
        people: keptPeople,
        personIndexById,
        timeOfSlot: new Map(dataset.timeOfSlot),
        availableAtSlot,
      },
      ignoredPeople,
    };
  }

  function getZonedParts(epochSeconds, timeZone) {
    const formatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
      timeZone,
      weekday: "short",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });

    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(epochSeconds * 1000))
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value])
    );

    return {
      weekday: parts.weekday,
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      hour: Number(parts.hour),
      minute: Number(parts.minute),
    };
  }

  function isSameLocalDate(left, right) {
    return left.year === right.year && left.month === right.month && left.day === right.day;
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function formatSessionLabelShort(startEpoch, endEpoch, timeZone) {
    const start = getZonedParts(startEpoch, timeZone);
    const end = getZonedParts(endEpoch, timeZone);
    return `${start.month}/${start.day} (${start.weekday}) ${pad2(start.hour)}:${pad2(start.minute)}-${pad2(end.hour)}:${pad2(end.minute)}`;
  }

  function formatSessionLabelLong(startEpoch, endEpoch, timeZone) {
    const start = getZonedParts(startEpoch, timeZone);
    const end = getZonedParts(endEpoch, timeZone);
    return `${start.year}-${pad2(start.month)}-${pad2(start.day)} (${start.weekday}) ${pad2(start.hour)}:${pad2(start.minute)}-${pad2(end.hour)}:${pad2(end.minute)} ${timeZone}`;
  }

  function intersectSets(sets) {
    if (!sets.length) return new Set();
    const [first, ...rest] = sets;
    const result = new Set(first);
    for (const value of first) {
      if (rest.some((set) => !set.has(value))) {
        result.delete(value);
      }
    }
    return result;
  }

  function attendeesToMask(attendeeIds, personIndexById) {
    let mask = 0n;
    for (const personId of attendeeIds) {
      const index = personIndexById.get(personId);
      if (typeof index === "number") {
        mask |= 1n << BigInt(index);
      }
    }
    return mask;
  }

  function popcountBigInt(mask) {
    let value = mask;
    let count = 0;
    while (value > 0n) {
      value &= value - 1n;
      count += 1;
    }
    return count;
  }

  function validateSessionMinutes(sessionMinutes) {
    assert(SESSION_LENGTH_OPTIONS.includes(sessionMinutes), `Session length must be one of: ${SESSION_LENGTH_OPTIONS.join(", ")}`);
  }

  function validateWeeklySessionCount(weeklySessionCount) {
    assert(
      WEEKLY_SESSION_COUNT_OPTIONS.includes(weeklySessionCount),
      `Weekly session count must be one of: ${WEEKLY_SESSION_COUNT_OPTIONS.join(", ")}`
    );
  }

  function buildSessions(dataset, sessionMinutes, options = {}) {
    validateSessionMinutes(sessionMinutes);

    const timeZone = options.timeZone || DISPLAY_TIME_ZONE;
    const cadenceMinutes = Number(options.cadenceMinutes || 30);
    const slotCount = sessionMinutes / 15;
    const slotIndexes = [...dataset.timeOfSlot.keys()].sort((left, right) => left - right);
    const slotSet = new Set(slotIndexes);
    const sessions = [];

    for (const startSlot of slotIndexes) {
      const neededSlots = [];
      let isContiguousByIndex = true;
      for (let offset = 0; offset < slotCount; offset += 1) {
        const slotIndex = startSlot + offset;
        if (!slotSet.has(slotIndex)) {
          isContiguousByIndex = false;
          break;
        }
        neededSlots.push(slotIndex);
      }
      if (!isContiguousByIndex) continue;

      const timestamps = neededSlots.map((slotIndex) => dataset.timeOfSlot.get(slotIndex));
      if (timestamps.some((timestamp, index) => index > 0 && timestamp - timestamps[index - 1] !== SLOT_SECONDS)) {
        continue;
      }

      const startEpoch = timestamps[0];
      const endEpoch = startEpoch + sessionMinutes * 60;
      const startParts = getZonedParts(startEpoch, timeZone);
      if (startParts.minute % cadenceMinutes !== 0) {
        continue;
      }

      const coveredEndEpoch = Math.max(startEpoch, endEpoch - 1);
      const crossesDateBoundary = timestamps.some((timestamp) => !isSameLocalDate(startParts, getZonedParts(timestamp, timeZone))) ||
        !isSameLocalDate(startParts, getZonedParts(coveredEndEpoch, timeZone));
      if (crossesDateBoundary) {
        continue;
      }

      const attendees = intersectSets(neededSlots.map((slotIndex) => dataset.availableAtSlot.get(slotIndex) || new Set()));
      const attendeeMask = attendeesToMask(attendees, dataset.personIndexById);
      const attendeeCount = popcountBigInt(attendeeMask);
      if (!attendeeCount) {
        continue;
      }

      sessions.push({
        startSlot,
        startEpoch,
        endEpoch,
        attendeeMask,
        attendeeCount,
        labelShort: formatSessionLabelShort(startEpoch, endEpoch, timeZone),
        labelLong: formatSessionLabelLong(startEpoch, endEpoch, timeZone),
      });
    }

    sessions.sort((left, right) => left.startEpoch - right.startEpoch || left.startSlot - right.startSlot);
    return sessions;
  }

  function compareSessionTuple(leftSessions, rightSessions) {
    const max = Math.max(leftSessions.length, rightSessions.length);
    for (let index = 0; index < max; index += 1) {
      const left = leftSessions[index];
      const right = rightSessions[index];
      if (!left && !right) return 0;
      if (!left) return -1;
      if (!right) return 1;
      if (left.startEpoch !== right.startEpoch) return left.startEpoch - right.startEpoch;
      if (left.startSlot !== right.startSlot) return left.startSlot - right.startSlot;
    }
    return 0;
  }

  function comparePlans(left, right) {
    return (
      right.unionCount - left.unionCount ||
      left.redundancy - right.redundancy ||
      right.totalAttendance - left.totalAttendance ||
      compareSessionTuple(left.sessions, right.sessions)
    );
  }

  function insertTopPlan(topPlans, plan, topLimit) {
    topPlans.push(plan);
    topPlans.sort(comparePlans);
    if (topPlans.length > topLimit) {
      topPlans.length = topLimit;
    }
  }

  function rankPlans(sessions, weeklySessionCount, options = {}) {
    validateWeeklySessionCount(weeklySessionCount);
    const topLimit = Number(options.topLimit || DEFAULT_TOP_LIMIT);
    assert(Number.isFinite(topLimit) && topLimit > 0, "topLimit must be a positive number");
    if (sessions.length < weeklySessionCount) {
      throw new Error(`Weekly session count ${weeklySessionCount} exceeds available candidate sessions (${sessions.length})`);
    }

    const topPlans = [];
    const picked = new Array(weeklySessionCount);
    let combinationsEvaluated = 0;

    function dfs(startIndex, depth, unionMask, totalAttendance) {
      if (depth === weeklySessionCount) {
        const planSessions = picked.slice();
        const unionCount = popcountBigInt(unionMask);
        const plan = {
          sessions: planSessions,
          unionMask,
          unionCount,
          redundancy: totalAttendance - unionCount,
          totalAttendance,
        };
        combinationsEvaluated += 1;
        insertTopPlan(topPlans, plan, topLimit);
        return;
      }

      const remainingNeeded = weeklySessionCount - depth;
      for (let index = startIndex; index <= sessions.length - remainingNeeded; index += 1) {
        const session = sessions[index];
        picked[depth] = session;
        dfs(index + 1, depth + 1, unionMask | session.attendeeMask, totalAttendance + session.attendeeCount);
      }
    }

    dfs(0, 0, 0n, 0);
    if (!topPlans.length) {
      throw new Error("No valid ranked plans were found");
    }

    return {
      plans: topPlans,
      combinationsEvaluated,
    };
  }

  function analyzeDataset(dataset, options = {}) {
    const sessionMinutes = Number(options.sessionMinutes || 60);
    const weeklySessionCount = Number(options.weeklySessionCount || 2);
    const timeZone = options.timeZone || DISPLAY_TIME_ZONE;
    const topLimit = Number(options.topLimit || DEFAULT_TOP_LIMIT);

    const sessions = buildSessions(dataset, sessionMinutes, { timeZone });
    if (!sessions.length) {
      throw new Error(`No valid ${sessionMinutes}-minute candidate sessions were generated`);
    }

    const ranking = rankPlans(sessions, weeklySessionCount, { topLimit });
    return {
      dataset,
      config: {
        sessionMinutes,
        weeklySessionCount,
        timeZone,
        topLimit,
      },
      sessions,
      plans: ranking.plans,
      combinationsEvaluated: ranking.combinationsEvaluated,
      displayedRowCount: ranking.plans.length,
      bestPlan: ranking.plans[0],
    };
  }

  function analyzeHtml(html, options = {}) {
    const extracted = parseDatasetFromHtml(html);
    const timeZone = options.timeZone || inferDisplayTimeZoneFromHtml(html);
    return {
      source: extracted.source,
      ...analyzeDataset(extracted.dataset, { ...options, timeZone }),
    };
  }

  function personCoveredBySession(session, personIndex) {
    const bit = 1n << BigInt(personIndex);
    return (session.attendeeMask & bit) !== 0n;
  }

  function membershipMaskForPlanPerson(plan, personIndex) {
    let mask = 0;
    for (let sessionIndex = 0; sessionIndex < 3; sessionIndex += 1) {
      const session = plan.sessions[sessionIndex];
      if (session && personCoveredBySession(session, personIndex)) {
        mask |= 1 << sessionIndex;
      }
    }
    return mask;
  }

  function colorForMembershipMask(mask) {
    return COLOR_BY_MEMBERSHIP_MASK[mask] || EMPTY_CELL_COLOR;
  }

  function filterPlansByRequiredPersonIds(plans, dataset, requiredPersonIds) {
    if (!requiredPersonIds || (requiredPersonIds instanceof Set ? requiredPersonIds.size === 0 : requiredPersonIds.length === 0)) {
      return plans;
    }

    const required = requiredPersonIds instanceof Set ? requiredPersonIds : new Set(requiredPersonIds);
    const requiredIndices = [...required]
      .map((personId) => dataset.personIndexById.get(personId))
      .filter((index) => typeof index === "number");

    if (!requiredIndices.length) {
      return plans;
    }

    return plans.filter((plan) => requiredIndices.every((personIndex) => membershipMaskForPlanPerson(plan, personIndex) !== 0));
  }

  function membershipText(mask) {
    if (!mask) return "Not covered";
    const labels = [];
    if (mask & 1) labels.push("Session 1");
    if (mask & 2) labels.push("Session 2");
    if (mask & 4) labels.push("Session 3");
    return labels.join(" + ");
  }

  function planSessionLabels(plan) {
    return Array.from({ length: 3 }, (_, index) => (plan.sessions[index] ? plan.sessions[index].labelShort : ""));
  }

  function planToTableRow(plan, dataset) {
    return {
      sessionLabels: planSessionLabels(plan),
      personCells: dataset.people.map((person, personIndex) => {
        const mask = membershipMaskForPlanPerson(plan, personIndex);
        return {
          personId: person.id,
          personName: person.name,
          mask,
          color: colorForMembershipMask(mask),
          label: membershipText(mask),
        };
      }),
    };
  }

  function doSessionsOverlap(left, right) {
    return !(left.endEpoch <= right.startEpoch || right.endEpoch <= left.startEpoch);
  }

  function planHasOverlap(plan) {
    for (let leftIndex = 0; leftIndex < plan.sessions.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < plan.sessions.length; rightIndex += 1) {
        if (doSessionsOverlap(plan.sessions[leftIndex], plan.sessions[rightIndex])) {
          return true;
        }
      }
    }
    return false;
  }

  return {
    DISPLAY_LOCALE,
    DISPLAY_TIME_ZONE,
    SESSION_LENGTH_OPTIONS,
    WEEKLY_SESSION_COUNT_OPTIONS,
    DEFAULT_TOP_LIMIT,
    EMPTY_CELL_COLOR,
    COLOR_BY_MEMBERSHIP_MASK,
    datasetFromGlobals,
    parseDatasetFromHtml,
    extractDatasetFromPage,
    inferDisplayTimeZoneFromHtml,
    filterDatasetByPersonIds,
    partitionDatasetByAvailability,
    normalizeDataset,
    getZonedParts,
    formatSessionLabelShort,
    formatSessionLabelLong,
    buildSessions,
    rankPlans,
    analyzeDataset,
    analyzeHtml,
    popcountBigInt,
    comparePlans,
    membershipMaskForPlanPerson,
    colorForMembershipMask,
    filterPlansByRequiredPersonIds,
    membershipText,
    planSessionLabels,
    planToTableRow,
    doSessionsOverlap,
    planHasOverlap,
  };
});
