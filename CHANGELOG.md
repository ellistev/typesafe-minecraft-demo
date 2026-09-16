# Changelog

## Unreleased

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
