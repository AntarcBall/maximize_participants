const assert = require("assert");
const path = require("path");

const core = require(path.join(__dirname, "..", "src", "core.js"));
const fixtures = require(path.join(__dirname, "synthetic-fixtures.js"));

function summarizeDataset(dataset) {
  return {
    people: dataset.people.map((person) => ({ id: person.id, name: person.name })),
    timeOfSlot: [...dataset.timeOfSlot.entries()],
    availableAtSlot: [...dataset.availableAtSlot.entries()].map(([slotIndex, attendeeIds]) => [slotIndex, [...attendeeIds].sort((a, b) => a - b)]),
  };
}

function verifyExtractionParity(scenario) {
  const fromGlobals = core.datasetFromGlobals(scenario.globals);
  assert(fromGlobals, `${scenario.id}: globals extraction should succeed`);
  assert.strictEqual(fromGlobals.source, "window", `${scenario.id}: globals extraction should report window source`);

  const fromHtml = core.parseDatasetFromHtml(scenario.html);
  assert.strictEqual(fromHtml.source, "html", `${scenario.id}: HTML extraction should report html source`);

  assert.deepStrictEqual(
    summarizeDataset(fromGlobals.dataset),
    summarizeDataset(fromHtml.dataset),
    `${scenario.id}: globals and HTML extraction should produce the same normalized dataset`
  );

  return fromGlobals.dataset;
}

function verifyPeopleOrder(scenario, dataset) {
  if (!scenario.expectations.peopleOrder) {
    return;
  }
  assert.deepStrictEqual(
    dataset.people.map((person) => person.name),
    scenario.expectations.peopleOrder,
    `${scenario.id}: unexpected normalized people order`
  );
}

function verifySessions(scenario, dataset) {
  const expectedByMinutes = scenario.expectations.sessionLabelsByMinutes || {};
  Object.entries(expectedByMinutes).forEach(([minutesKey, expectedLabels]) => {
    const sessionMinutes = Number(minutesKey);
    const sessions = core.buildSessions(dataset, sessionMinutes, { timeZone: core.DISPLAY_TIME_ZONE });
    assert.deepStrictEqual(
      sessions.map((session) => session.labelShort),
      expectedLabels,
      `${scenario.id}: unexpected ${sessionMinutes}-minute candidate sessions`
    );
  });
}

function analyzeConfig(dataset, sessionMinutes, weeklySessionCount) {
  return core.analyzeDataset(dataset, {
    sessionMinutes,
    weeklySessionCount,
    timeZone: core.DISPLAY_TIME_ZONE,
    topLimit: 10,
  });
}

function parseConfigKey(configKey) {
  const [sessionMinutesText, weeklySessionCountText] = configKey.split("x");
  return {
    sessionMinutes: Number(sessionMinutesText),
    weeklySessionCount: Number(weeklySessionCountText),
  };
}

function verifyPlans(scenario, dataset) {
  const expectedPlans = scenario.expectations.bestPlanByConfig || {};
  Object.entries(expectedPlans).forEach(([configKey, expected]) => {
    const { sessionMinutes, weeklySessionCount } = parseConfigKey(configKey);
    const analysis = analyzeConfig(dataset, sessionMinutes, weeklySessionCount);

    assert.strictEqual(
      analysis.bestPlan.unionCount,
      expected.bestUnion,
      `${scenario.id}: unexpected best union for ${configKey}`
    );
    assert.deepStrictEqual(
      core.planSessionLabels(analysis.bestPlan).filter(Boolean),
      expected.topLabels,
      `${scenario.id}: unexpected best-plan labels for ${configKey}`
    );
  });
}

function verifyAnalyzeHtml(scenario) {
  const expectedPlans = scenario.expectations.bestPlanByConfig || {};
  Object.entries(expectedPlans).forEach(([configKey, expected]) => {
    const { sessionMinutes, weeklySessionCount } = parseConfigKey(configKey);
    const analysis = core.analyzeHtml(scenario.html, {
      sessionMinutes,
      weeklySessionCount,
      timeZone: core.DISPLAY_TIME_ZONE,
      topLimit: 10,
    });

    assert.strictEqual(analysis.source, "html", `${scenario.id}: analyzeHtml should report html source`);
    assert.strictEqual(analysis.bestPlan.unionCount, expected.bestUnion, `${scenario.id}: analyzeHtml unexpected best union for ${configKey}`);
    assert.deepStrictEqual(
      core.planSessionLabels(analysis.bestPlan).filter(Boolean),
      expected.topLabels,
      `${scenario.id}: analyzeHtml unexpected best-plan labels for ${configKey}`
    );
  });
}

function verifyOverlapExpectations(scenario, dataset) {
  const expected = scenario.expectations.overlapByConfig || {};
  Object.entries(expected).forEach(([configKey, shouldOverlap]) => {
    const { sessionMinutes, weeklySessionCount } = parseConfigKey(configKey);
    const analysis = analyzeConfig(dataset, sessionMinutes, weeklySessionCount);
    assert.strictEqual(
      core.planHasOverlap(analysis.bestPlan),
      shouldOverlap,
      `${scenario.id}: unexpected overlap flag for ${configKey}`
    );
  });
}

function verifyTableRows(scenario, dataset) {
  const expected = scenario.expectations.tableRowByConfig || {};
  Object.entries(expected).forEach(([configKey, rowExpectation]) => {
    const { sessionMinutes, weeklySessionCount } = parseConfigKey(configKey);
    const analysis = analyzeConfig(dataset, sessionMinutes, weeklySessionCount);
    const row = core.planToTableRow(analysis.bestPlan, analysis.dataset);

    assert.deepStrictEqual(
      row.sessionLabels,
      rowExpectation.sessionLabels,
      `${scenario.id}: unexpected row session labels for ${configKey}`
    );

    const masksByPerson = Object.fromEntries(row.personCells.map((cell) => [cell.personName, cell.mask]));
    assert.deepStrictEqual(
      masksByPerson,
      rowExpectation.masksByPerson,
      `${scenario.id}: unexpected row membership masks for ${configKey}`
    );
  });
}

function verifyAnalyzeErrors(scenario, dataset) {
  const expected = scenario.expectations.analyzeErrorsByConfig || {};
  Object.entries(expected).forEach(([configKey, message]) => {
    const { sessionMinutes, weeklySessionCount } = parseConfigKey(configKey);
    assert.throws(
      () => analyzeConfig(dataset, sessionMinutes, weeklySessionCount),
      (error) => error instanceof Error && error.message === message,
      `${scenario.id}: expected analyzeDataset to throw for ${configKey}`
    );
  });
}

function verifyFilteredPeople(scenario, dataset) {
  const expectation = scenario.expectations.filteredPeople;
  if (!expectation) {
    return;
  }

  const filtered = core.filterDatasetByPersonIds(dataset, new Set(expectation.excludedPersonIds));
  assert.deepStrictEqual(
    filtered.people.map((person) => person.name),
    expectation.peopleOrder,
    `${scenario.id}: unexpected people order after filtering`
  );

  Object.entries(expectation.bestPlanByConfig || {}).forEach(([configKey, expected]) => {
    const { sessionMinutes, weeklySessionCount } = parseConfigKey(configKey);
    const analysis = analyzeConfig(filtered, sessionMinutes, weeklySessionCount);
    assert.strictEqual(
      analysis.bestPlan.unionCount,
      expected.bestUnion,
      `${scenario.id}: unexpected filtered best union for ${configKey}`
    );
    assert.deepStrictEqual(
      core.planSessionLabels(analysis.bestPlan).filter(Boolean),
      expected.topLabels,
      `${scenario.id}: unexpected filtered best-plan labels for ${configKey}`
    );
  });
}

function verifyRequiredPeople(scenario, dataset) {
  const expectation = scenario.expectations.requiredPeople;
  if (!expectation) {
    return;
  }

  Object.entries(expectation.visiblePlanLabelsByConfig || {}).forEach(([configKey, expectedPlanLabels]) => {
    const { sessionMinutes, weeklySessionCount } = parseConfigKey(configKey);
    const analysis = analyzeConfig(dataset, sessionMinutes, weeklySessionCount);
    const visiblePlans = core.filterPlansByRequiredPersonIds(analysis.plans, analysis.dataset, new Set(expectation.requiredPersonIds));
    assert.deepStrictEqual(
      visiblePlans.map((plan) => core.planSessionLabels(plan).filter(Boolean)),
      expectedPlanLabels,
      `${scenario.id}: unexpected required-person visible plans for ${configKey}`
    );
  });
}

function verifyIgnoredPeople(scenario, dataset) {
  const expectation = scenario.expectations.ignoredPeople;
  if (!expectation) {
    return;
  }

  const partition = core.partitionDatasetByAvailability(dataset);
  assert.deepStrictEqual(
    partition.ignoredPeople.map((person) => person.name),
    expectation.ignoredNames,
    `${scenario.id}: unexpected ignored-person names`
  );
  assert.deepStrictEqual(
    partition.dataset.people.map((person) => person.name),
    expectation.remainingPeople,
    `${scenario.id}: unexpected remaining people after ignoring zero-availability entries`
  );
}

function maybeWriteArtifacts() {
  if (!process.argv.includes("--write-fixtures")) {
    return null;
  }
  const outputDir = path.join(__dirname, "..", "dist", "synthetic-fixtures");
  fixtures.writeScenarioArtifacts(outputDir);
  return outputDir;
}

function verifyTimeZoneInference() {
  const html = `
    <div id="GroupTime279835200" onmouseover="ShowSlot(279835200,&quot;Monday 08:00:00 PM&quot;);"></div>
    <script>
      var PeopleNames = []; var PeopleIDs = []; var TimeOfSlot = []; var AvailableAtSlot = [];
      PeopleNames[0] = "테스터"; PeopleIDs[0] = 1;
      TimeOfSlot[0] = 279835200; AvailableAtSlot[0] = []; AvailableAtSlot[0].push(1);
      TimeOfSlot[1] = 279836100; AvailableAtSlot[1] = []; AvailableAtSlot[1].push(1);
      TimeOfSlot[2] = 279837000; AvailableAtSlot[2] = []; AvailableAtSlot[2].push(1);
      TimeOfSlot[3] = 279837900; AvailableAtSlot[3] = []; AvailableAtSlot[3].push(1);
    </script>
  `;

  assert.strictEqual(core.inferDisplayTimeZoneFromHtml(html), "UTC", "Expected timezone inference to prefer UTC for GroupTime labels");
  const analysis = core.analyzeHtml(html, { sessionMinutes: 60, weeklySessionCount: 1, topLimit: 5 });
  assert.strictEqual(analysis.bestPlan.sessions[0].labelShort, "11/13 (월) 20:00-21:00", "Expected inferred UTC label for regression sample");
}

function main() {
  const outputDir = maybeWriteArtifacts();
  const scenarios = fixtures.materializeAllScenarios();

  console.log("Synthetic verification");
  console.log("----------------------");

  scenarios.forEach((scenario) => {
    const dataset = verifyExtractionParity(scenario);
    verifyPeopleOrder(scenario, dataset);
    verifySessions(scenario, dataset);
    verifyPlans(scenario, dataset);
    verifyAnalyzeHtml(scenario);
    verifyOverlapExpectations(scenario, dataset);
    verifyTableRows(scenario, dataset);
    verifyAnalyzeErrors(scenario, dataset);
    verifyFilteredPeople(scenario, dataset);
    verifyRequiredPeople(scenario, dataset);
    verifyIgnoredPeople(scenario, dataset);

    console.log(`${scenario.id}: PASS`);
    console.log(`  ${scenario.description}`);
  });

  verifyTimeZoneInference();
  console.log("timezone-inference: PASS");
  console.log("  GroupTime labels can force UTC when page epochs are displayed as wall-clock UTC.");

  if (outputDir) {
    console.log(`Fixtures written to ${outputDir}`);
  }

  console.log("All synthetic checks passed.");
}

main();
