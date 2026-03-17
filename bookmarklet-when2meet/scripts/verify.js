const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..', '..');
const featureRoot = path.resolve(__dirname, '..');
const fixturePath = path.join(projectRoot, 'A.HTML');
const html = fs.readFileSync(fixturePath, 'utf8');
const core = require(path.join(featureRoot, 'src', 'core.js'));
const legacyRanking = require(path.join(projectRoot, 'dashboard_logic.js'));

execFileSync(process.execPath, [path.join(featureRoot, 'scripts', 'build-bookmarklet.js')], {
  cwd: projectRoot,
  stdio: 'inherit',
});

const extracted = core.parseDatasetFromHtml(html);
assert.strictEqual(extracted.source, 'html');
assert(extracted.dataset.people.length > 0, 'Expected people to be extracted from A.HTML');
assert(extracted.dataset.timeOfSlot.size > 0, 'Expected time slots to be extracted from A.HTML');

const globalsFixture = {
  PeopleNames: [],
  PeopleIDs: [],
  TimeOfSlot: [],
  AvailableAtSlot: [],
};
for (const [slotIndex, epoch] of extracted.dataset.timeOfSlot.entries()) {
  globalsFixture.TimeOfSlot[slotIndex] = epoch;
}
for (const [personIndex, person] of extracted.dataset.people.entries()) {
  globalsFixture.PeopleNames[personIndex] = person.name;
  globalsFixture.PeopleIDs[personIndex] = person.id;
}
for (const [slotIndex, attendeeIds] of extracted.dataset.availableAtSlot.entries()) {
  globalsFixture.AvailableAtSlot[slotIndex] = [...attendeeIds];
}
const globalsExtraction = core.datasetFromGlobals(globalsFixture);
assert(globalsExtraction, 'Expected globals extraction path to succeed');
assert.strictEqual(globalsExtraction.source, 'window');
assert.deepStrictEqual(
  globalsExtraction.dataset.people.map((person) => person.name),
  extracted.dataset.people.map((person) => person.name),
  'Expected globals and fallback extraction to agree on Korean-sorted person order'
);

const peopleNames = extracted.dataset.people.map((person) => person.name);
const koreanSortedNames = [...peopleNames].sort((left, right) => left.localeCompare(right, 'ko-KR', { numeric: true, sensitivity: 'base' }));
assert.deepStrictEqual(peopleNames, koreanSortedNames, 'People must be sorted with Korean locale ordering');

const expectedColors = {
  0: '#6b7280',
  1: 'rgb(255, 0, 0)',
  2: 'rgb(0, 255, 0)',
  3: 'rgb(255, 255, 0)',
  4: 'rgb(0, 0, 255)',
  5: 'rgb(255, 0, 255)',
  6: 'rgb(0, 255, 255)',
  7: 'rgb(255, 255, 255)',
};
for (const [mask, color] of Object.entries(expectedColors)) {
  assert.strictEqual(core.colorForMembershipMask(Number(mask)), color, `Unexpected color for membership mask ${mask}`);
}

const sessionCountsByMinutes = {};
const bestByConfig = [];

for (const sessionMinutes of core.SESSION_LENGTH_OPTIONS) {
  const sessions = core.buildSessions(extracted.dataset, sessionMinutes, { timeZone: core.DISPLAY_TIME_ZONE });
  assert(sessions.length > 0, `Expected ${sessionMinutes}-minute session generation to succeed`);
  sessionCountsByMinutes[sessionMinutes] = sessions.length;

  if (sessionMinutes === 90) {
    for (const session of sessions) {
      const start = core.getZonedParts(session.startEpoch, core.DISPLAY_TIME_ZONE);
      const end = core.getZonedParts(session.endEpoch, core.DISPLAY_TIME_ZONE);
      assert.strictEqual(
        `${start.year}-${start.month}-${start.day}`,
        `${end.year}-${end.month}-${end.day}`,
        '90-minute sessions must not cross local date boundaries'
      );
    }
  }

  for (const weeklySessionCount of core.WEEKLY_SESSION_COUNT_OPTIONS) {
    const analysis = core.analyzeDataset(extracted.dataset, {
      sessionMinutes,
      weeklySessionCount,
      topLimit: core.DEFAULT_TOP_LIMIT,
      timeZone: core.DISPLAY_TIME_ZONE,
    });

    assert(analysis.plans.length > 0, `Expected ranking for ${sessionMinutes}/${weeklySessionCount} to return plans`);
    for (let index = 1; index < analysis.plans.length; index += 1) {
      assert(
        core.comparePlans(analysis.plans[index - 1], analysis.plans[index]) <= 0,
        `Plans for ${sessionMinutes}/${weeklySessionCount} must be sorted in descending rank order`
      );
    }

    const topRow = core.planToTableRow(analysis.plans[0], analysis.dataset);
    assert.strictEqual(topRow.sessionLabels.length, 3, 'Rendered rows must expose exactly three session columns');
    if (weeklySessionCount === 1) {
      assert.strictEqual(topRow.sessionLabels[1], '', '1-session plans must leave Session 2 blank');
      assert.strictEqual(topRow.sessionLabels[2], '', '1-session plans must leave Session 3 blank');
    }
    if (weeklySessionCount === 2) {
      assert.strictEqual(topRow.sessionLabels[2], '', '2-session plans must leave Session 3 blank');
    }

    bestByConfig.push({
      sessionMinutes,
      weeklySessionCount,
      sessionCount: analysis.sessions.length,
      combinationsEvaluated: analysis.combinationsEvaluated,
      bestUnion: analysis.bestPlan.unionCount,
      topLabels: core.planSessionLabels(analysis.bestPlan).filter(Boolean),
    });
  }
}

const allThreeSessionPlans = core.analyzeDataset(extracted.dataset, {
  sessionMinutes: 60,
  weeklySessionCount: 3,
  topLimit: 10000,
  timeZone: core.DISPLAY_TIME_ZONE,
}).plans;
assert(allThreeSessionPlans.some((plan) => core.planHasOverlap(plan)), '3-session mode must allow overlapping sessions');

const legacyBestPair = legacyRanking.rankAvailability(html, {
  sectionMinutes: 60,
  timeZone: 'Asia/Seoul',
  allowOverlap: true,
  top: 5,
}).bestPair;
const currentBestPair = bestByConfig.find((entry) => entry.sessionMinutes === 60 && entry.weeklySessionCount === 2);
assert(currentBestPair, 'Expected 60/2 config result to exist');
assert.strictEqual(
  currentBestPair.bestUnion,
  legacyBestPair.unionCount,
  '60-minute, 2-session best union should match legacy pair-ranking logic'
);

const bookmarkletText = fs.readFileSync(path.join(featureRoot, 'dist', 'bookmarklet.txt'), 'utf8').trim();
assert(bookmarkletText.startsWith('javascript:'), 'Bookmarklet artifact must start with javascript:');
assert(!bookmarkletText.includes('\n'), 'Bookmarklet artifact must be single-line');
assert.doesNotThrow(() => new Function(bookmarkletText.replace(/^javascript:/, '')), 'Bookmarklet artifact must be valid JavaScript syntax');

console.log('\nVerification summary');
console.log('--------------------');
console.log(`Detected participants: ${extracted.dataset.people.length}`);
console.log(`Candidate session counts: 60m=${sessionCountsByMinutes[60]}, 90m=${sessionCountsByMinutes[90]}`);
for (const entry of bestByConfig) {
  console.log(
    `${entry.sessionMinutes}m / ${entry.weeklySessionCount} sessions -> best union ${entry.bestUnion}, candidates ${entry.sessionCount}, combinations ${entry.combinationsEvaluated}, top row ${entry.topLabels.join(' | ')}`
  );
}
console.log(`Bookmarklet length: ${bookmarkletText.length}`);
console.log('\nAll verification checks passed.');
