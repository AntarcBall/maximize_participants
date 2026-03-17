const fs = require("fs");
const path = require("path");

function seoulEpoch(localDateTime) {
  const withOffset = /(?:[+-]\d{2}:\d{2}|Z)$/.test(localDateTime) ? localDateTime : `${localDateTime}+09:00`;
  const epochMs = Date.parse(withOffset);
  if (!Number.isFinite(epochMs)) {
    throw new Error(`Invalid localDateTime: ${localDateTime}`);
  }
  return Math.floor(epochMs / 1000);
}

function buildGlobals({ people, slots }) {
  const globals = {
    PeopleNames: [],
    PeopleIDs: [],
    TimeOfSlot: [],
    AvailableAtSlot: [],
  };

  people.forEach((person, index) => {
    globals.PeopleNames[index] = person.name;
    globals.PeopleIDs[index] = person.id;
  });

  slots.forEach((slot) => {
    globals.TimeOfSlot[slot.index] = seoulEpoch(slot.localDateTime);
    globals.AvailableAtSlot[slot.index] = slot.attendeeIds.slice();
  });

  return globals;
}

function toScriptAssignments(globals) {
  const lines = [
    "var PeopleNames = [];",
    "var PeopleIDs = [];",
    "var TimeOfSlot = [];",
    "var AvailableAtSlot = [];",
  ];

  for (let index = 0; index < globals.PeopleNames.length; index += 1) {
    if (typeof globals.PeopleNames[index] === "string") {
      lines.push(`PeopleNames[${index}] = ${JSON.stringify(globals.PeopleNames[index])};`);
    }
  }

  for (let index = 0; index < globals.PeopleIDs.length; index += 1) {
    if (typeof globals.PeopleIDs[index] === "number") {
      lines.push(`PeopleIDs[${index}] = ${globals.PeopleIDs[index]};`);
    }
  }

  for (let index = 0; index < globals.TimeOfSlot.length; index += 1) {
    if (typeof globals.TimeOfSlot[index] === "number") {
      lines.push(`TimeOfSlot[${index}] = ${globals.TimeOfSlot[index]};`);
    }
  }

  for (let index = 0; index < globals.AvailableAtSlot.length; index += 1) {
    const attendees = globals.AvailableAtSlot[index];
    lines.push(`AvailableAtSlot[${index}] = [];`);
    if (!Array.isArray(attendees)) continue;
    attendees.forEach((personId) => {
      lines.push(`AvailableAtSlot[${index}].push(${personId});`);
    });
  }

  return lines.join("\n");
}

function globalsToHtml(globals, title) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
  </head>
  <body>
    <script>
${toScriptAssignments(globals)}
    </script>
  </body>
</html>
`;
}

const scenarioDefinitions = [
  {
    id: "baseline-union-ranking",
    description: "Sparse slot indexes yield exactly three 60-minute candidates across three dates with a known best 2-session union.",
    people: [
      { id: 103, name: "다온" },
      { id: 101, name: "가람" },
      { id: 102, name: "나래" },
    ],
    slots: [
      { index: 0, localDateTime: "2026-03-17T19:00:00", attendeeIds: [101, 102] },
      { index: 1, localDateTime: "2026-03-17T19:15:00", attendeeIds: [101, 102] },
      { index: 2, localDateTime: "2026-03-17T19:30:00", attendeeIds: [101, 102] },
      { index: 3, localDateTime: "2026-03-17T19:45:00", attendeeIds: [101, 102] },
      { index: 10, localDateTime: "2026-03-18T19:00:00", attendeeIds: [102, 103] },
      { index: 11, localDateTime: "2026-03-18T19:15:00", attendeeIds: [102, 103] },
      { index: 12, localDateTime: "2026-03-18T19:30:00", attendeeIds: [102, 103] },
      { index: 13, localDateTime: "2026-03-18T19:45:00", attendeeIds: [102, 103] },
      { index: 20, localDateTime: "2026-03-19T19:00:00", attendeeIds: [101, 103] },
      { index: 21, localDateTime: "2026-03-19T19:15:00", attendeeIds: [101, 103] },
      { index: 22, localDateTime: "2026-03-19T19:30:00", attendeeIds: [101, 103] },
      { index: 23, localDateTime: "2026-03-19T19:45:00", attendeeIds: [101, 103] },
    ],
    expectations: {
      peopleOrder: ["가람", "나래", "다온"],
      sessionLabelsByMinutes: {
        60: [
          "3/17 (화) 19:00-20:00",
          "3/18 (수) 19:00-20:00",
          "3/19 (목) 19:00-20:00",
        ],
        90: [],
      },
      bestPlanByConfig: {
        "60x1": {
          bestUnion: 2,
          topLabels: ["3/17 (화) 19:00-20:00"],
        },
        "60x2": {
          bestUnion: 3,
          topLabels: ["3/17 (화) 19:00-20:00", "3/18 (수) 19:00-20:00"],
        },
        "60x3": {
          bestUnion: 3,
          topLabels: [
            "3/17 (화) 19:00-20:00",
            "3/18 (수) 19:00-20:00",
            "3/19 (목) 19:00-20:00",
          ],
        },
      },
      tableRowByConfig: {
        "60x1": {
          sessionLabels: ["3/17 (화) 19:00-20:00", "", ""],
          masksByPerson: {
            "가람": 1,
            "나래": 1,
            "다온": 0,
          },
        },
        "60x2": {
          sessionLabels: ["3/17 (화) 19:00-20:00", "3/18 (수) 19:00-20:00", ""],
          masksByPerson: {
            "가람": 1,
            "나래": 3,
            "다온": 2,
          },
        },
      },
      filteredPeople: {
        excludedPersonIds: [102],
        peopleOrder: ["가람", "다온"],
        bestPlanByConfig: {
          "60x1": {
            bestUnion: 2,
            topLabels: ["3/19 (목) 19:00-20:00"],
          },
          "60x2": {
            bestUnion: 2,
            topLabels: ["3/17 (화) 19:00-20:00", "3/18 (수) 19:00-20:00"],
          },
        },
      },
      requiredPeople: {
        requiredPersonIds: [102],
        visiblePlanLabelsByConfig: {
          "60x1": [
            ["3/17 (화) 19:00-20:00"],
            ["3/18 (수) 19:00-20:00"],
          ],
        },
      },
    },
  },
  {
    id: "midnight-boundary",
    description: "Sessions ending exactly at local midnight should remain valid while cross-day sessions beyond midnight should still be rejected.",
    people: [
      { id: 201, name: "자정테스터" },
    ],
    slots: [
      { index: 0, localDateTime: "2026-03-17T22:00:00", attendeeIds: [201] },
      { index: 1, localDateTime: "2026-03-17T22:15:00", attendeeIds: [201] },
      { index: 2, localDateTime: "2026-03-17T22:30:00", attendeeIds: [201] },
      { index: 3, localDateTime: "2026-03-17T22:45:00", attendeeIds: [201] },
      { index: 4, localDateTime: "2026-03-17T23:00:00", attendeeIds: [201] },
      { index: 5, localDateTime: "2026-03-17T23:15:00", attendeeIds: [201] },
      { index: 6, localDateTime: "2026-03-17T23:30:00", attendeeIds: [201] },
      { index: 7, localDateTime: "2026-03-17T23:45:00", attendeeIds: [201] },
    ],
    expectations: {
      sessionLabelsByMinutes: {
        60: [
          "3/17 (화) 22:00-23:00",
          "3/17 (화) 22:30-23:30",
          "3/17 (화) 23:00-00:00",
        ],
        90: [
          "3/17 (화) 22:00-23:30",
          "3/17 (화) 22:30-00:00",
        ],
      },
      bestPlanByConfig: {
        "60x1": {
          bestUnion: 1,
          topLabels: ["3/17 (화) 22:00-23:00"],
        },
        "90x1": {
          bestUnion: 1,
          topLabels: ["3/17 (화) 22:00-23:30"],
        },
      },
    },
  },
  {
    id: "overlap-three-session",
    description: "Three-session mode must allow overlapping sessions and preserve expected membership masks.",
    people: [
      { id: 301, name: "겹침참가자" },
      { id: 302, name: "보조참가자" },
    ],
    slots: [
      { index: 0, localDateTime: "2026-03-20T19:00:00", attendeeIds: [301, 302] },
      { index: 1, localDateTime: "2026-03-20T19:15:00", attendeeIds: [301, 302] },
      { index: 2, localDateTime: "2026-03-20T19:30:00", attendeeIds: [301, 302] },
      { index: 3, localDateTime: "2026-03-20T19:45:00", attendeeIds: [301, 302] },
      { index: 4, localDateTime: "2026-03-20T20:00:00", attendeeIds: [301] },
      { index: 5, localDateTime: "2026-03-20T20:15:00", attendeeIds: [301] },
      { index: 6, localDateTime: "2026-03-20T20:30:00", attendeeIds: [301] },
      { index: 7, localDateTime: "2026-03-20T20:45:00", attendeeIds: [301] },
    ],
    expectations: {
      sessionLabelsByMinutes: {
        60: [
          "3/20 (금) 19:00-20:00",
          "3/20 (금) 19:30-20:30",
          "3/20 (금) 20:00-21:00",
        ],
      },
      bestPlanByConfig: {
        "60x3": {
          bestUnion: 2,
          topLabels: [
            "3/20 (금) 19:00-20:00",
            "3/20 (금) 19:30-20:30",
            "3/20 (금) 20:00-21:00",
          ],
        },
      },
      overlapByConfig: {
        "60x3": true,
      },
      tableRowByConfig: {
        "60x3": {
          sessionLabels: [
            "3/20 (금) 19:00-20:00",
            "3/20 (금) 19:30-20:30",
            "3/20 (금) 20:00-21:00",
          ],
          masksByPerson: {
            "겹침참가자": 7,
            "보조참가자": 1,
          },
        },
      },
    },
  },
  {
    id: "cadence-rejection",
    description: "A contiguous 60-minute block starting at 19:15 should be rejected because candidate starts must align to 30-minute cadence.",
    people: [
      { id: 401, name: "쿼터시작" },
    ],
    slots: [
      { index: 0, localDateTime: "2026-03-21T19:15:00", attendeeIds: [401] },
      { index: 1, localDateTime: "2026-03-21T19:30:00", attendeeIds: [401] },
      { index: 2, localDateTime: "2026-03-21T19:45:00", attendeeIds: [401] },
      { index: 3, localDateTime: "2026-03-21T20:00:00", attendeeIds: [401] },
    ],
    expectations: {
      sessionLabelsByMinutes: {
        60: [],
      },
      analyzeErrorsByConfig: {
        "60x1": "No valid 60-minute candidate sessions were generated",
      },
    },
  },
  {
    id: "timestamp-gap-rejection",
    description: "Candidate generation must reject slot windows that contain a timestamp gap even when slot indexes are consecutive.",
    people: [
      { id: 501, name: "간격테스터" },
    ],
    slots: [
      { index: 0, localDateTime: "2026-03-22T19:00:00", attendeeIds: [501] },
      { index: 1, localDateTime: "2026-03-22T19:15:00", attendeeIds: [501] },
      { index: 2, localDateTime: "2026-03-22T19:45:00", attendeeIds: [501] },
      { index: 3, localDateTime: "2026-03-22T20:00:00", attendeeIds: [501] },
    ],
    expectations: {
      sessionLabelsByMinutes: {
        60: [],
      },
      analyzeErrorsByConfig: {
        "60x1": "No valid 60-minute candidate sessions were generated",
      },
    },
  },
  {
    id: "ignored-zero-availability",
    description: "People with zero availability should be surfaced as ignored and excluded from ranking inputs.",
    people: [
      { id: 601, name: "활성인원" },
      { id: 602, name: "무시대상" },
    ],
    slots: [
      { index: 0, localDateTime: "2026-03-23T19:00:00", attendeeIds: [601] },
      { index: 1, localDateTime: "2026-03-23T19:15:00", attendeeIds: [601] },
      { index: 2, localDateTime: "2026-03-23T19:30:00", attendeeIds: [601] },
      { index: 3, localDateTime: "2026-03-23T19:45:00", attendeeIds: [601] },
    ],
    expectations: {
      sessionLabelsByMinutes: {
        60: [
          "3/23 (월) 19:00-20:00",
        ],
      },
      bestPlanByConfig: {
        "60x1": {
          bestUnion: 1,
          topLabels: ["3/23 (월) 19:00-20:00"],
        },
      },
      ignoredPeople: {
        ignoredNames: ["무시대상"],
        remainingPeople: ["활성인원"],
      },
    },
  },
];

function materializeScenario(definition) {
  const globals = buildGlobals(definition);
  return {
    id: definition.id,
    description: definition.description,
    expectations: definition.expectations,
    globals,
    html: globalsToHtml(globals, definition.id),
  };
}

function materializeAllScenarios() {
  return scenarioDefinitions.map(materializeScenario);
}

function writeScenarioArtifacts(outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const scenarios = materializeAllScenarios();
  scenarios.forEach((scenario) => {
    fs.writeFileSync(path.join(outputDir, `${scenario.id}.html`), scenario.html, "utf8");
    fs.writeFileSync(path.join(outputDir, `${scenario.id}.json`), JSON.stringify({
      expectations: scenario.expectations,
      globals: scenario.globals,
      description: scenario.description,
    }, null, 2), "utf8");
  });
  return scenarios;
}

module.exports = {
  seoulEpoch,
  buildGlobals,
  toScriptAssignments,
  globalsToHtml,
  scenarioDefinitions,
  materializeScenario,
  materializeAllScenarios,
  writeScenarioArtifacts,
};
