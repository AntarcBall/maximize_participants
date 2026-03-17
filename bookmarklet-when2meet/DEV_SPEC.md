# When2Meet Multi-Session Bookmarklet Development Specification

## 1. Document Purpose

This document defines the technical implementation specification for a bookmarklet that runs on a When2Meet-style result page in a specific analyzed state similar to [`A.HTML`](/home/motor/codes/tsad_26_1/A.HTML).

The bookmarklet must:

- execute entirely in the browser on the current page
- read the page's in-memory availability data or parse equivalent inline script data from the DOM
- compute top-ranked weekly session plans
- render a floating analysis panel directly on the page

This specification is intended to be implementation-facing, not product-marketing-facing.

## 2. Target Runtime

### 2.1 Execution Surface

- Delivery mechanism: bookmarklet
- Host environment: Chromium-class browser
- Execution context: current page, same DOM, same JS global scope
- No server dependency
- No network request required for analysis
- No extension APIs

### 2.2 Supported Page Shape

The supported page shape is a When2Meet result page that exposes or contains the following logical data:

- `PeopleNames[index] = '...'`
- `PeopleIDs[index] = ...`
- `TimeOfSlot[index] = unixEpochSeconds`
- `AvailableAtSlot[index].push(personId)`

The page may also contain `GroupGrid` UI elements, but the ranking engine must use person-level availability arrays rather than color-only grid state.

### 2.3 Non-Goals

- Generic XML parsing for unrelated sites
- Cross-page persistence
- Account sync
- Data submission back to server
- Automatic modification of the original When2Meet availability state

## 3. Functional Requirements

### 3.1 User Configuration

The floating panel must expose exactly these primary controls:

- `Session Length`
  - allowed values: `60`, `90`
  - unit: minutes
- `Weekly Session Count`
  - allowed values: `1`, `2`, `3`

Optional internal constants may exist, but the visible config surface must prioritize the two controls above.

### 3.2 Optimization Goal

For the selected session length `L` and selected weekly session count `K`, the system must search candidate session combinations of size `K` and maximize:

`| union(people_available_for_session_1, ..., people_available_for_session_K) |`

That is:

- each candidate plan contains exactly `K` sessions
- each session is valid only if a person is available for the full duration of that session
- the score of the plan is the cardinality of the union of all people covered by its sessions

### 3.3 Session Validity Rules

Each candidate session must satisfy all of the following:

- length is exactly `60` or `90` minutes according to current config
- slots are based on contiguous 15-minute base slots
- session start time must be aligned to a 30-minute cadence
- all constituent 15-minute slots must exist
- the full session must remain within one local calendar day

### 3.4 Overlap Rule

Session overlap is explicitly allowed.

Therefore:

- two chosen sessions may overlap partially or fully
- chosen sessions may occur on the same day
- chosen sessions may occur at identical or near-identical times if they are distinct candidates generated from different start slots

No overlap exclusion constraint is applied during ranking.

### 3.5 Output Ranking

The result set must be sorted in descending order by union coverage size.

Required visible result count:

- show top `50` ranked plans

Recommended deterministic tiebreak sequence:

1. larger union count first
2. smaller redundancy first
   - redundancy = sum(individual session attendee counts) - union count
3. larger total summed session attendance first
4. earlier lexicographic session start tuple first

The tiebreak sequence is implementation guidance for deterministic rendering.

## 4. Data Acquisition Contract

### 4.1 Preferred Extraction Path

Primary extraction must read page globals directly from `window` when available:

- `window.PeopleNames`
- `window.PeopleIDs`
- `window.TimeOfSlot`
- `window.AvailableAtSlot`

This path is preferred because:

- it avoids fragile HTML parsing
- it reflects the current live page state
- it is cheaper than reparsing the entire document

### 4.2 Fallback Extraction Path

If the global arrays are unavailable, the bookmarklet must parse the current HTML source from:

- `document.documentElement.outerHTML`

Fallback parsing must recover:

- person index to display name
- person index to person ID
- slot index to epoch timestamp
- slot index to attendee set

### 4.3 Canonical Parsed Representation

After extraction, the internal normalized representation must be:

```ts
type Person = {
  id: number;
  name: string;
  sortKey: string;
};

type Dataset = {
  people: Person[];
  personIndexById: Map<number, number>;
  timeOfSlot: Map<number, number>;
  availableAtSlot: Map<number, Set<number>>;
};
```

### 4.4 Name Ordering

People columns must be ordered by Korean name sort order.

Required sorting strategy:

- use `localeCompare(..., "ko-KR")`
- numeric comparison enabled if available
- case-insensitive/base-sensitivity preferred

Example implementation intent:

```ts
const collator = new Intl.Collator("ko-KR", {
  numeric: true,
  sensitivity: "base",
});
```

## 5. Session Construction Algorithm

### 5.1 Base Slot Model

- Base slot duration: `15 minutes`
- Slot timestamps are UTC epoch seconds supplied by page data
- Display timezone: `Asia/Seoul`

### 5.2 Session Builder

For a requested session length:

- `60` minutes => `4` contiguous slots
- `90` minutes => `6` contiguous slots

Pseudo-definition:

```ts
slotCount = sessionMinutes / 15
for each startSlotIndex in sortedSlotIndexes:
  needed = [startSlotIndex, ..., startSlotIndex + slotCount - 1]
  reject if any slot missing
  reject if timestamps are not exactly 15 minutes apart
  reject if start minute is not divisible by 30
  reject if slots cross local date boundary
  people = intersection(attendees for each needed slot)
  emit session
```

### 5.3 Session Model

```ts
type Session = {
  startSlot: number;
  startEpoch: number;
  endEpoch: number;
  attendeeMask: bigint;
  attendeeCount: number;
  labelShort: string;   // e.g. "3/12 (목) 20:00-21:00"
  labelLong: string;    // optional verbose form
};
```

## 6. Optimization Search

### 6.1 Combination Size

The optimizer must select exactly `K` sessions where `K ∈ {1,2,3}`.

### 6.2 Search Strategy

Brute-force combination search is acceptable because:

- `K` is bounded by `3`
- expected candidate session count on the target page is moderate

Recommended algorithm:

- build all valid sessions first
- enumerate `nCk` combinations using DFS or nested index recursion
- maintain only top 50 plans during iteration to avoid unnecessary memory growth

### 6.3 Bitmask Representation

Use a bitmask for attendee sets.

Reason:

- fast union via bitwise OR
- fast per-person membership checks
- deterministic memory footprint for moderate participant counts

Recommended internal encoding:

- each sorted person receives a 0-based bit position
- `bigint` stores coverage masks

Example:

```ts
attendeeMask |= 1n << BigInt(personIndex)
planUnionMask = sessionA.attendeeMask | sessionB.attendeeMask | sessionC.attendeeMask
```

### 6.4 Derived Plan Metrics

Each candidate plan must compute:

```ts
type Plan = {
  sessions: Session[];       // length 1..3, but normalized to fixed 3 display slots
  unionMask: bigint;
  unionCount: number;
  redundancy: number;
  totalAttendance: number;
};
```

Where:

- `unionCount = popcount(unionMask)`
- `totalAttendance = sum(session.attendeeCount)`
- `redundancy = totalAttendance - unionCount`

## 7. Rendering Specification

### 7.1 Container

Render a floating panel injected into the current page.

Required characteristics:

- fixed-position overlay
- movable or at minimum visually isolated from host page
- high z-index
- self-contained styling to avoid host CSS collisions
- close action available

Preferred implementation:

- a shadow root attached to an injected host node

### 7.2 Panel Sections

The panel should contain:

1. title bar
2. config controls
3. analysis summary
4. results table
5. optional legend

### 7.3 Results Table Schema

The table must have:

- exactly 3 leading session columns
- remaining columns are one per person in the global participant set

Column semantics:

1. `Session 1`
2. `Session 2`
3. `Session 3`
4. `Person A`
5. `Person B`
6. ...

Behavior for plans with fewer than 3 sessions:

- unused session columns remain empty
- column count itself does not change

### 7.4 Session Cell Content

Each non-empty session cell must show:

- local date
- weekday
- time range

Recommended compact format:

- `3/12 (목) 20:00-21:00`

### 7.5 Person Cell Semantics

For each plan row and each person column:

- if person is not covered by any session in the plan:
  - show default background
- if person is covered:
  - fill with a color derived from the session membership mask

### 7.6 Session-to-Color Mapping

Required primary mapping:

- Session 1 => red
- Session 2 => green
- Session 3 => blue

Required combination behavior:

- if a person belongs to multiple sessions, colors must be additively mixed

Required membership color table:

| Membership Mask | Meaning | Color |
|---|---|---|
| `001` | session 1 only | `rgb(255, 0, 0)` |
| `010` | session 2 only | `rgb(0, 255, 0)` |
| `100` | session 3 only | `rgb(0, 0, 255)` |
| `011` | sessions 1+2 | `rgb(255, 255, 0)` |
| `101` | sessions 1+3 | `rgb(255, 0, 255)` |
| `110` | sessions 2+3 | `rgb(0, 255, 255)` |
| `111` | sessions 1+2+3 | `rgb(255, 255, 255)` |

Implementation note:

- default empty background should not be white
- use a neutral gray or muted background so white mixed coverage remains distinguishable

### 7.7 Membership Encoding

The per-person cell state may be represented as a 3-bit integer:

```ts
mask = 0
if coveredBySession1: mask |= 1
if coveredBySession2: mask |= 2
if coveredBySession3: mask |= 4
```

This value drives:

- background color
- tooltip text
- possible future export behavior

## 8. UX Behavior

### 8.1 Invocation

On bookmarklet execution:

- if the panel does not exist, create it and run analysis immediately
- if the panel already exists, refresh/re-focus it rather than duplicating panels

### 8.2 Recalculation

Changing config must trigger recomputation either:

- immediately on change, or
- on explicit `Analyze` button press

Either is acceptable, but the behavior must be deterministic and obvious.

### 8.3 User Feedback

The panel must show:

- extraction success or failure
- number of detected people
- number of valid candidate sessions
- number of evaluated combinations
- number of displayed rows

### 8.4 Failure Messaging

If parsing fails, show a visible, technical error message inside the panel.

Example failure conditions:

- required arrays not found
- no valid session candidates generated
- weekly session count exceeds possible combination space

## 9. Performance Requirements

### 9.1 Complexity Envelope

Expected brute-force complexity:

- `K=1`: `O(n)`
- `K=2`: `O(n^2)`
- `K=3`: `O(n^3)`

Given the target page shape, this is acceptable.

### 9.2 Top-K Retention

Implementation should retain only the top 50 plans during search.

This reduces:

- memory usage
- DOM rendering overhead
- serialization overhead if export is later added

### 9.3 Rendering Volume

Rendered cell count can be large:

- up to `50 × participantCount` person cells
- plus 3 fixed session cells per row

Therefore:

- use a scrollable table container
- keep cell markup minimal
- prefer batch HTML generation or `DocumentFragment`

## 10. Artifact Layout

Required new folder:

- `bookmarklet-when2meet/`

Recommended contents:

```text
bookmarklet-when2meet/
  DEV_SPEC.md
  README.md
  src/
    core.js
    bookmarklet.js
  scripts/
    build-bookmarklet.js
    verify.js
  dist/
    bookmarklet.min.js
    bookmarklet.txt
```

## 11. Build Requirements

### 11.1 Source of Truth

- human-readable source lives under `src/`
- installation artifact lives under `dist/bookmarklet.txt`

### 11.2 Bookmarklet Artifact

The final installable artifact must be a single-line bookmarklet string:

```text
javascript:...
```

### 11.3 Compression

Minification is recommended but not required for correctness.

If a minifier exists locally, use it for:

- payload size reduction
- bookmarklet usability

## 12. Verification Requirements

### 12.1 Verification Input

Use [`A.HTML`](/home/motor/codes/tsad_26_1/A.HTML) as the primary verification fixture.

### 12.2 Verification Levels

At minimum, verification must confirm:

1. extraction succeeds on `A.HTML`
2. session generation succeeds for both `60` and `90`
3. ranking succeeds for weekly counts `1`, `2`, `3`
4. results are returned in descending union-count order
5. person column ordering is Korean-locale-based and stable
6. per-cell membership colors reflect the correct 3-bit membership mask

### 12.3 Suggested Verification Script Outputs

The verification script should print or assert:

- detected participant count
- candidate session count per duration
- best union count for each `(duration, weeklyCount)` pair
- top row session labels

### 12.4 Regression Surface

The following are high-value regression checks:

- 60-minute, 2-session mode still identifies the same top union count as existing pair-ranking logic
- 90-minute mode does not generate cross-day sessions
- 3-session mode correctly allows overlap
- empty session columns remain blank for 1-session and 2-session modes

## 13. Risks and Edge Cases

### 13.1 White Coverage Cells

The `111` membership mask produces white. If the empty background is also white, covered and uncovered states become visually ambiguous.

Mitigation:

- empty state must use a visible neutral background such as `#eceff3`

### 13.2 Host CSS Collision

The host page may contain old jQuery-era or global CSS rules.

Mitigation:

- use shadow DOM or aggressively namespaced selectors

### 13.3 Incomplete Page Load

If the bookmarklet runs before page globals initialize, extraction may fail.

Mitigation:

- show a retryable error
- support rerun without full page refresh

### 13.4 Large Participant Count

With many people, the table becomes very wide.

Mitigation:

- horizontal scrolling
- sticky first three columns
- compact person header rendering

## 14. Acceptance Criteria

The work is complete when all of the following are true:

- a new folder exists for the bookmarklet implementation
- a bookmarklet can be executed on a page shaped like `A.HTML`
- the panel exposes `60/90` and `1/2/3` controls
- results show exactly 3 fixed session columns plus participant columns
- ranking is by maximum union coverage across selected sessions
- overlap is allowed
- covered person cells use RGB primary and additive mixed colors exactly as specified
- top 50 plans are rendered
- people columns are sorted by Korean name order
- the behavior is verified against `A.HTML`

## 15. Implementation Notes

- Favor pure functions for extraction, normalization, session construction, and ranking.
- Keep DOM rendering separate from ranking logic.
- Expose one top-level bootstrap function for bookmarklet execution.
- Preserve deterministic ordering everywhere possible.
- Treat the current page as the authoritative data source.
