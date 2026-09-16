# Project instructions

Read README.md and CHANGELOG.md before changes. This demo has a scenario catalogue: Lumber Run and Canadian Flag are implemented; Starter Cabin is a visible, unavailable future scenario. Keep scope focused on the request; do not add survival challenges, family activities, or publishing unless requested.

Use the TypeSafe AI skill for integration work when available. Read current official docs before changing the API contract or prompts. Code owns observation, execution, and validation; TypeSafe supplies decisions. Never fabricate live outputs or present synthetic tests as gameplay.

## Finish every implementation task

1. Run appropriate tests. `npm test` must pass; ordinary tests must not need live API access.
2. Run `npm run docs:sync` and `npm run docs:check`.
3. Review/update README.md for behavior, setup, configuration, limitations, and verification changes. Update affected supporting docs. If README prose remains accurate, say it was reviewed in the changelog rather than adding filler.
4. Add a concise CHANGELOG.md entry for meaningful changes, with actual validation and outstanding limitations. Never claim an unrun check passed.
5. Report the result and blockers. Questions and read-only investigation do not require artificial documentation edits.

Personal agent hooks and settings stay local and must not be committed. The public workflow uses the test and documentation commands above. Do not change global or parent agent settings.

## Public source boundaries

Treat source/docs as intended for a public repo. Keep personal names, absolute machine paths, browser/process IDs, account details, and session context out of public docs. memory/, runtime/, local env files, credentials, and recordings are private. Do not copy parent memory files into this project.

This folder may be inside a larger private Git repository. Scope Git operations to this project. Do not initialize/push a repository, rewrite history, choose a license, or stage files unless requested. Ignore rules cannot sanitize history: publish only a reviewed project-only tree with fresh history.

## Runtime boundaries

Do not start a Minecraft server or accept its EULA implicitly. Obtain the operator's explicit authorization for the specific server. Do not infer authorization for other servers or worlds. Do not modify existing worlds, launcher settings, or account authentication to make tests pass.

Keep keys backend-only, do not log Authorization headers, and bind the dashboard to loopback. Preserve cancellation, bounded runs, stale-state checks, and error stops. Terrain vetoes must be visible and must not silently substitute scripted decisions.

Use plain language, no em dashes, and distinguish implemented from verified behavior. If the same error occurs twice, research 3-5 possible fixes using authoritative sources, choose the most efficient supported fix, and test it.

## Scenario changes

Keep each scenario's actions, limits, observations, and completion checks explicit. TypeSafe selects actions; code owns blueprint geometry and verifies world state. Generated README examples must cover every implemented scenario. Flag materials and site preparation are operator setup, not model achievements; keep admin commands out of model actions. When the operator enables automatic replay for the isolated flag demo, its opt-in adapter may run only the fixed wool-footprint reset, bot repositioning, and wool replenishment before inference. Preserve the host/port/origin/player restrictions, obstruction checks, busy guard, reset verification, and Pause/Resume distinction. Document setup boundaries.
