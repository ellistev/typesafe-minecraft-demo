# Changelog

## Unreleased

### Publish the direct-control demo

- The recorded final controller run completed mining, collection, all 338 placements and inspection in 1,848 decisions and 13m21s. No maintenance pause or manual gameplay intervention was needed; one service error recovered automatically. Updated README verification to match the reviewed recording. Earlier entries below retain their validation limits at the time.
- Publish direct action control, phase-specific choices, third-person/overhead cameras with a visible equipped avatar, the explicit supplied-material build test, fresh-state retries, timeout recovery and movement geometry fixes. Keep recordings, runtime logs, credentials and personal hooks local.

### Clarify movement choices near the final gaps

- A paused run at 331/338 cells alternated forward/backward and aimed at a farther target while the nearest gap remained to the left. Added structured geometric distance estimates to movement choices only during occluded construction. TypeSafe chooses every action; all otherwise-safe alternatives remain available. No hidden navigation, selected replacement action or additional model was introduced.
- All 72 offline/HTTP tests pass, including the exact paused geometry, safety filtering and unchanged gathering/visible-placement criteria. Documentation checks pass. No live TypeSafe calls were made; behavioral improvement remains unverified.

### Retry request timeouts within the existing limit

- The ten-second TypeSafe request deadline previously stopped the run immediately because only HTTP errors were retried. TimeoutError now uses the same three-attempt budget and one/two-second backoff, taking fresh observations for retries. Pause and ordinary aborts are never retried. Status and logs distinguish timeouts from HTTP failures.
- All 71 offline/HTTP tests pass, including a native AbortSignal timeout, fresh retry state, mixed timeout/HTTP exhaustion and cancellation during inference/backoff. Documentation checks pass. No live TypeSafe calls were used to validate this fix.

### Uninterrupted direct-control replay verified

- A fresh normal run completed all mining, collection, 338 placements and final inspection in 2,266 decisions and 16m31s, with no maintenance pause, reload, reset or budget extension. A late movement loop at 329 cells resolved without intervention. The proposed distance-description experiment was never loaded and was discarded; running controller behavior is unchanged. README verification updated.

### Correct placement visibility and crosshair geometry

- A fresh replay stalled at 37 placements by alternating aim between targets. Fixed a normalized vector mutation that shortened visibility rays, a full-height cursor check inconsistent with eye-height aiming, and a reach margin that offered targets beyond the interaction limit. Candidate visibility and crosshair checks now share eye height and a 4.5-block reach. Nearby occluded aim options are omitted. Also match Mineflayer mouse-sensitivity rounding before judging edge visibility and correct a reversed sign in relative right distances. All 67 tests pass, including range, eye-height, actual edge geometry, cardinal headings and alternating-target regressions. Recovered the original run through all 338 placements and the model-selected inspection, with empty final inventory and a visually verified overhead reveal. It used 3,801 decisions and required maintenance pauses, watchdog recoveries and one logged two-minute debug extension; normal run limits remain unchanged. Clarified approaching enclosed gaps. No world reset or building-wool grant was used. An uninterrupted replay of the final version remains unverified.

### Direct-control flag reveal verified

- Completed normal gathering and construction: 234 red plus 104 white mined and collected before placement; all 338 cells verified, inventory empty, and overhead reveal visually checked. The run used 2,513 decisions and 1,049 task seconds excluding logged maintenance pauses. Fixes were loaded while paused; a clean repeat with the final version remains unverified. No building materials were granted.
- All 62 offline/HTTP tests pass. Corrected movement, collection approach points, placement body collision, line of sight, equipment observations and phase-specific choices. The latest probability panel was checked in the browser.
- Earlier entries below describe intermediate findings and their validation limits at that time.

- Enforced separate gathering/building interaction choices in the API, and made the probability panel match the latest actual offered criteria. Added placement visibility, body-collision and equipment-state observations to prevent repeated impossible actions. Replaced accumulated prompt rules with explicit phase guidance. End-to-end validation remains in progress.

### Validate direct movement through the full task

- Fixed an incorrect backward control name and safety checks that rejected ordinary one-block descents. Continue rejecting deeper drops, hazards and unloaded terrain. Omit observed unavailable actions instead of repeatedly offering choices that execution must veto.
- Added a labelled block-center approach point for dropped items: live testing showed exact item coordinates near a hole edge could leave the player supported by neighboring wool. Aiming remains separate from movement. All 58 tests pass; full gameplay validation is in progress.

### Prevent repeated aiming at an aligned drop

- Diagnosed 337 drop-aim decisions in a 356-decision run that collected two wool blocks and hit the 90-second watchdog. The drop was already straight ahead, ordinary forward movement was blocked, and jumping was available.
- Omit absent/already-aligned drop-aim options from the actual API choices and validate against that same set. Clarify jumping or mining a wool obstruction to reach a drop. No movement is automatically substituted. Added regression coverage using the observed geometry; gameplay verification remains pending.

### Prioritize collecting mined drops

- Added two aim-only drop actions and collection-first instructions. Each movement remains a separate model choice; no pickup pathfinding or automatic movement was added. Drop aiming rechecks live items, and flag observations exclude colors already sufficiently stocked.
- A live run mined all 338 supply blocks but wandered away with only 159 red and 91 white in inventory. Paused for diagnosis. Added tests for aim-only behavior, vanished drops and filtering stocked colors. Revised gameplay remains unverified.

### Retry temporary TypeSafe failures

- A live run reached 458 decisions, mining 180 red and 80 white wool, before HTTP 529 stopped it. TypeSafe documents that status as temporary overload. Added bounded exponential backoff for 429 and selected server errors, with a fresh observation per attempt, visible retry status and separate failure logs. Authentication and validation errors still stop immediately. Failed requests are not counted as model decisions.
- Added tests for recovery, exhaustion, non-retryable failures and cancellation. Full live recovery and flag completion remain unverified.

### Recover from a transient stale observation

- Replaced the immediate stale-observation stop with up to three fresh inference attempts. Rejected responses remain unexecuted, appear in the actual input/output panel, and count toward the decision limit. Pause cancels retries. Logs now include elapsed time and displacement.
- Diagnosed a recorded gathering run that stopped after decision 203, a jump. The old log omitted the rejected response, so the exact rejection cause cannot be established. Added offline tests for jump displacement, slow responses, retry exhaustion, cancellation, and run replacement. Live verification of this recovery is pending; the active dashboard was left untouched to preserve the user's recording. README updated.
- Validation: all 49 offline/HTTP tests pass.

### Direct controls, overhead and tools

- Added Start build test using the restricted reset adapter: empty the resource beds, supply exactly 234 red and 104 white wool, and label the objective and logged requests as supplied-material testing. Normal starts still require mining. Live test placed 15 blocks in 90 direct decisions with zero mined blocks, then paused.

- Replaced the dashboard's batch/pathfinder execution with 18 model-selected primitives. Each move lasts at most 250 ms; aiming, equipment and single-block interactions require separate choices. Both scenarios use direct control, with terrain vetoes and live target verification.
- Removed first person. Overhead works before starting a connected flag task and includes the wool beds. Added equipment and movement/digging telemetry plus a checked extension to the pinned viewer bundle for held shears/wool and limb animation.
- Explicitly corrected the scope of the earlier video and completion claims: they demonstrated high-level choices, not direct movement control.
- All 44 tests pass. Short live direct run: 93 decisions, 46 red blocks mined, 20 red inventory at the last log, no construction. Overhead and held shears were visually checked. Full flag completion remains unverified.


### Mine wool before building the Canadian flag

- Added model-selected red/white wool mining and dropped-wool pickup. Inventory must cover the remaining blueprint before construction becomes available. Mining is restricted to separate prepared supply areas.
- Replay now refills world blocks and starts with empty wool inventory and two shears. No red or white wool is granted to the character. Added a bordered flag pad and separate resource beds to the operator setup commands.
- Added gathering progress and observations, eight flag choices, a 25-minute budget, and tests for collection, target scope, stage gating, and cancellation. All 34 offline/HTTP tests and documentation checks pass. Live validation completed in 131 decisions and 590 seconds: 234 red + 104 white mined and collected before construction, then 338/338 flag blocks verified. One missed drop was recovered by a model-selected pickup. Recording of that validation run was blocked by the browser surface picker. A later complete recording was reviewed and edited into a 79-second 1080p MP4; README recording status is updated. Video files remain local and excluded from Git.

### Keep agent hooks local

- Removed tracked Codex settings and hook helpers from the public tree while preserving local copies. The entire .codex directory and both helper scripts are now ignored.
- Removed hook installation instructions from public documentation. Kept manual documentation generation, its tests, and GitHub Actions. Hook-specific tests remain local.
- Validation: all 27 public tests and seven local documentation/hook tests pass, along with generated documentation and staged whitespace checks.
- The original commit still contains the former hook files; this change does not rewrite published history. The hooks contain no credentials.

### Public repository preparation

- Prepared fresh project-only Git history, excluding local credentials, session notes, runtime data, recordings, binaries, and game worlds. Expanded ignore rules for credential files, backups, editor settings, and local agent configuration.
- Removed session-specific authorization history from contributor instructions and documented publication boundaries. No license is selected.
- Validation: all 32 offline tests, generated documentation checks, and staged whitespace checks passed. Reviewed the 41-file publication tree; local-secret comparison and credential/private-data scans found no matches. Dependency lockfile downloads resolve only to the public npm registry.

### Mid-run restart and clipboard controls

- Added Restart task during active or paused runs. It cancels and drains the prior action before fresh setup, resets the decision count and timer, and prevents overlapping runs. Pause during the wait cancels the restart.
- Added separate Copy buttons for actual TypeSafe input and response, with success/failure feedback and no disclosure-panel toggling.
- Validation: all 32 tests passed, including restart ordering and cancellation. Live mid-run restart cleared a partial flag and resumed building from zero. Both clipboard buttons were verified through actual browser paste. README updated; generated payload and whitespace checks passed.

### Flag replay and input inspector

- Validation: all 30 tests, generated payload checks, and whitespace validation pass. Tests cover fixed reset scope, fresh-vs-resume behavior, obstruction rejection, and exact input capture without authentication.

- Start task now resets and replenishes the isolated demo flag before a fresh build; Resume preserves progress. Reset is restricted to the fixed local demo, removes only red/white wool in its footprint, preserves other inventory, and waits for world confirmation. Added a portable managed-server mailbox wrapper.
- Added a separate expandable Actual TypeSafe input panel containing the exact sent JSON body. Authentication is excluded; actual input and response remain paired in logs and the dashboard.
- Live verification: replay cleared the existing 338-block flag and started with full supplies. Pause/Resume preserved 131 blocks, decision count 33, and home. The input expander displayed live state and questions.

### Scenario selector and Canadian flag

- Final checks: all 26 offline/HTTP tests passed, along with docs:sync, docs:check, and whitespace validation.

- Added Lumber Run and Canadian Flag selection, with Starter Cabin explicitly marked coming next. Scenario changes reset displayed task state and are rejected during active execution.
- Implemented a 26 x 13 ground flag with a supplied blueprint and 234 red / 104 white wool. TypeSafe chooses up to four placements in one section per decision, then chooses inspection. Code handles movement, placement, and exact world verification; no hidden scripted action fallback.
- Added an overhead camera and automatic completion reveal, section progress, scenario-specific probabilities, and generated examples for both API payloads. Added an operator command generator for reproducible isolated-world preparation; the controller has no admin-command capability.
- Live test completed all 338 blocks in 86 real TypeSafe decisions and 217 seconds. Actions: 39 red-panel batches, 26 white-field batches, 20 maple-leaf batches, one inspection. API round trips averaged 128 ms (78-294 ms). No task-time teleporting or server commands were used; setup supplied the pad and materials beforehand.
- Verified the completed flag visually, camera switching, and active-run scenario rejection (HTTP 409). Recording remains unverified. The leaf is a coarse pixel-art interpretation, and the overhead camera does not currently render the controlled player's avatar.

### Collect logs and return home

- Replaced short movement choices with six task actions, inventory-based progress, a remembered home position, and bounded Mineflayer pathfinding/mining. Navigation may clear leaves but cannot place blocks or mine other terrain.
- Added a five-minute task budget, 120-decision cap, 90-second progress timeout, 20-second action deadlines, cancellation, and visible failure outcomes. Pause/resume retains the task within the running process. Completed and failed tasks can start again with a new baseline.
- Added dashboard progress and return distance; updated the generated API payload, synthetic fixture, smoke test, README, and new-server Survival defaults.
- Live validation: 10 new logs collected and return within one block of home in 17 decisions, approximately 53 seconds. Mean API latency 136 ms (88-243 ms). A separate peaceful Survival world used a prepared ground-level start; no task-time teleporting or item grants. Live pause/resume retained task state and stopped movement.
- Recording remains unverified. Dropped items can appear as placeholder-colored cubes in the viewer. Arbitrary canopy spawns remain a limitation.
- Final verification: all 19 offline tests, docs synchronization/check, and whitespace checks passed. A second live run, including cancellation and resume, collected another 10 logs and returned within one block in 18 decisions and 60 seconds. The completed result remains open in the dashboard.

### First live Minecraft run

- Started the isolated Java 1.21.4 world after explicit operator EULA acceptance and connected the TypeSafe player.
- Verified first-person world rendering and 60 completed live decisions. Ten actions moved more than 0.1 blocks, with 10.04 blocks of accumulated horizontal travel. API round trips averaged 137 ms (79-308 ms) in this run.
- Observed frequent turning in dense tree cover; exploration quality needs improvement. Paused the controller for inspection while leaving the world running. Recording remains unverified.
- Updated README verification status and corrected stale dashboard text that described the separate server as stopped. All 13 offline tests and documentation checks pass.

### Documentation and contributor workflow

- Documented the complete TypeSafe payload, observations, movement question, actions, response fields, and control boundaries.
- Added generated README synchronization, project-local Codex hooks, and offline hook tests.
- Added agent instructions, contributor/security guidance, and CI checks for tests and payload drift.
- Removed machine-specific session details from the public README. Local notes/runtime artifacts are excluded from the intended public tree; existing parent history must not be published.
- Validation at that stage: all 13 offline tests passed; generated README payload matched source. Hook tests cover idempotent generation, preservation of prose, read-only turns, a single continuation, changelog completion, private-file exclusion, and execution from a project subdirectory. Ignore rules were checked for env files, session notes, runtime files, and recordings; .env.example remains includable. Codex lifecycle activation still requires hook trust. Subsequent gameplay verification is recorded above; recording remains unverified.

### Initial prototype

- Added Mineflayer movement control, terrain observations, bounded TypeSafe decisions, first-person viewer, and output dashboard.
- Added browser recording controls and timestamped local decision logs.
- Six offline tests passed. Waiting-state UI and HTTP validation were checked. A live synthetic API test returned forward; no gameplay result is claimed.
