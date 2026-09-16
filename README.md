# TypeSafe plays Minecraft

A small experiment in controlling a Minecraft Java player with [TypeSafe](https://typesafe.ai). TypeSafe selects gathering, navigation, and construction actions from structured world observations. Mineflayer executes them, and a browser dashboard shows the live world beside actual action probabilities and API responses.

This prototype controls a bot player, not the keyboard or the owner's signed-in character. Choose Lumber Run or Canadian Flag from the scenario selector. Starter Cabin is listed as coming next. There is no scripted route or fake inference fallback.

## Scenarios

| Scenario | Status | Objective |
| --- | --- | --- |
| Lumber Run | Available | Collect 10 new logs and return home. |
| Canadian Flag | Available | Build a 26 x 13 ground mosaic from supplied wool, then verify every block. |
| Starter Cabin | Coming next | Gather, craft, build, and inspect a small cabin. Not implemented. |

Select a scenario while stopped. Switching discards the current in-memory task and clears its displayed results; Pause/Resume within a scenario retains its state. **Restart task** is available mid-run: it cancels the current action, waits for it to stop, then starts a fresh task with a new timer and decision count. For the configured flag demo it clears the flag and replenishes wool; for Lumber Run it records a new home and inventory baseline without restoring trees. The backend rejects switching while an action is active. The objective, progress, and actual TypeSafe choices update with the selection. Camera controls switch between the player's view and an overhead flag camera; they never teleport the player. The overhead camera automatically appears after a successful flag inspection.

### Canadian Flag

**Replay:** on the configured isolated demo, **Start task** resets the old flag, returns the player to the start, replenishes exactly 234 red and 104 white wool, and starts building from zero. **Resume task** preserves unfinished work. Resetting is a visible setup phase before inference; it is not a TypeSafe action. Other inventory is preserved, and only red/white wool in the 26 x 13 flag footprint is removed. Unexpected blocks or missing support stop the reset.

This is **construction from supplied materials**, using a predefined pixel-art blueprint. TypeSafe chooses which section to build next: red side panels, white field, or maple leaf. Code selects up to four nearby missing blueprint cells in each section, navigates, equips wool, places the selected batch, and checks each server-confirmed block. TypeSafe then chooses the inspection action; code verifies all 338 cells. The model does not invent the blueprint, coordinates, or completion claim.

Supply **234 red wool and 104 white wool**, and provide a clear, level 26 x 13 footprint with solid support beneath every cell. The default origin is three blocks east and six blocks north of the starting feet position, at the same integer Y level. Set `FLAG_ORIGIN=x,y,z` to anchor a reusable demo site. Unknown cells, obstructions, or insufficient remaining inventory stop the task before building. The model-driven builder does not clear structures, fetch materials, issue admin commands, or place scaffolding. The opt-in replay adapter performs only the fixed demo reset before a fresh run.

A flag run has a 15-minute wall-clock budget, 200-decision cap, 30-second action deadline, and 90-second no-progress stop. Pause cancels movement and prevents subsequent placements; an already-sent Minecraft placement packet may still be confirmed. Resume observes the world again. Without the replay adapter, partial existing blocks can still be used with manual setup; a fully built flag reports that replay is not configured. With automatic replay enabled, a fresh task (including after a dashboard restart) resets the flag; only Resume within the same unfinished task preserves it.

For the isolated demo, `node scripts/flag-demo-commands.cjs` prints vanilla server-console commands for a prepared pad at origin `64,64,64`, a starting position, and the required wool. **The commands clear the named pad. Use them only in a disposable demo world.** The script only prints commands and does not connect to a server. Run them as an operator before the task; set `FLAG_ORIGIN=64,64,64` in the dashboard environment. Repeating those commands resets that demonstration site and supplies another set of wool. This preparation is separate from the autonomous build.

Automatic replay is explicitly opt-in: set `FLAG_DEMO_RESET=1` and `FLAG_ORIGIN=64,64,64` for the dashboard, and connect to the isolated loopback server on port 25576. The local server must consume `runtime/server-command.txt`. The existing demo wrapper supports this; the public `scripts/run-managed-server.cjs` provides the same mailbox for an already configured `runtime/survival` server, checks loopback/port and explicit EULA acceptance, and uses `JAVA_BIN` (or `java`) to run the downloaded jar. Do not start a second wrapper while a server already owns that world/port. The adapter rejects other hosts, ports, usernames, or origins, refuses to overwrite an occupied mailbox, and waits for the live world/inventory reset before starting the model loop.

### Lumber Run

Press **Start task** in a Survival world. The player remembers its starting position and inventory, then TypeSafe chooses between harvesting either of two nearby logs, collecting a dropped log, exploring a reachable location, returning home, or waiting. The dashboard shows inventory progress, distance home, remaining time, actual probabilities, and responses.

Success requires at least 10 additional logs still in inventory and a three-dimensional distance of at most two blocks from home. Existing logs and broken-but-uncollected blocks do not count. A run stops after five minutes, 120 decisions, 90 seconds without inventory/return progress, low health, death, disconnect, an API error, or an action timeout. Each action has a 20-second limit. Pause cancels inference, navigation, and digging. Resume preserves home and inventory baseline within the same Node process; the five-minute wall-clock budget includes pauses. Restarting Node resets task memory.

Use a stable ground-level starting point near trees. Navigation may clear leaves, but cannot place blocks, mine other terrain, parkour, swim through water, or plan drops greater than two blocks. It uses loaded blocks, including blocks outside the camera view. Paths and candidate availability are estimates and can fail as the world changes. These are bounded scenarios, not general natural-language Minecraft automation.

## Verification history

- Current validation: all 32 offline/HTTP tests pass, including scenario switching in both directions, unavailable-scenario rejection, exact blueprint checks, missing supplies, placement cancellation, and restart ordering. Generated payloads and whitespace checks pass.
- Mid-run Restart was verified live: the partial flag cleared, supplies reset, and building resumed with a fresh decision count. Both JSON Copy buttons were verified by pasting their contents into a local text area.

- **Canadian flag verified:** all 338 blocks built and checked in 86 real decisions over 217 seconds. That included 39 red-panel batches, 26 white-field batches, 20 maple-leaf batches, and one inspection. API round trips averaged 128 ms (78-294 ms). The server supplied a cleared pad and wool before the run; the player placed every flag block in Survival mode without task-time teleporting or admin commands.
- Confirmed the completed flag in the overhead view and verified that changing scenarios during construction returns HTTP 409. The maple leaf is deliberately coarse pixel art. The overhead camera currently shows the world without the controlled player's avatar. Tab recording is still unverified.

- **Gather-and-return verified:** a Survival run collected 10 new inventory logs and returned within one block of its recorded start. It used 17 real TypeSafe decisions in approximately 53 seconds: 10 harvests, six pickup actions, and one return. API round trips averaged 136 ms (88-243 ms). No items were granted and no teleport occurred during the task.
- Test preparation used a separate peaceful Survival world and placed the player on nearby solid ground before starting. The initial natural spawn was on a dense canopy with no reachable candidates. This is evidence for a prepared forest demo, not proof of reliable behavior at arbitrary spawn locations.
- Pause was verified during a live action: the position remained unchanged two seconds later, the interrupted action was logged as cancelled, and Resume retained home and inventory baseline.
- The repeat run completed after that pause/resume: 10 additional logs, 18 decisions including the cancelled attempt, 60 seconds including the pause, and a return within one block. All 19 offline tests and documentation checks pass.
- The older movement-only prototype results below are historical. Recording remains unverified; the viewer may render dropped items as placeholder-colored cubes.

- The controller, dashboard, and browser recording control are implemented.
- The dashboard waiting state and HTTP validation were checked locally.
- A live API smoke test with **synthetic terrain** returned `forward` from `jev-1.13.0` in 335 ms. This is one observed request, not a latency benchmark or gameplay result.
- **In-game movement and first-person rendering verified** on a local Java 1.21.4 world. The first run logged 60 completed live decisions, 10 actions with more than 0.1 blocks of horizontal movement, and approximately 10.04 blocks of accumulated horizontal travel. API round trips ranged from 79 to 308 ms, averaging 137 ms in that run. Accumulated travel includes retracing steps; it is not net exploration distance.
- That older controller spent many decisions turning in dense tree cover. The current task controller uses pathfinding instead.

## Requirements and setup

Use Node.js 22 or later with npm, a TypeSafe API key, Minecraft Java Edition, and a Chromium-based browser. Java **1.21.4** is the target version explicitly supported by the viewer. Other protocol versions may connect but have not been verified visually.

Install dependencies from this directory:

```sh
npm ci
```

Set `TYPESAFE_API_KEY` in your environment. On Windows, this helper also reads Windows user or machine environment settings without printing the key:

```powershell
powershell -NoProfile -File scripts/start-demo.ps1
```

On other systems, with the key already exported, run `npm start`. Alternatively, copy `.env.example` to `.env`, enter your key locally, and run `node --env-file=.env src/server.cjs`. Never commit that file. `npm start` does not load `.env` automatically.

Open [the dashboard](http://127.0.0.1:3010). Open a Java world to LAN, enter the port shown in Minecraft chat, and click **Connect**. The bot uses the local offline identity `TypeSafeExplorer`; servers requiring account authentication need additional integration. Launcher credentials are never extracted.

Choose a scenario and press **Start task**. The objective is shown read-only. Creative mode is rejected because broken logs do not produce normal Survival drops. **Pause** stops the current action; **Resume task** continues the existing objective until its time budget expires. A completed or expired task starts a new baseline when started again.

The optional `scripts/setup-server.ps1` downloads an official Java 1.21.4 server and verifies its SHA-1. It creates a separate Survival configuration under `runtime/server`, bound to `127.0.0.1:25575`, and leaves `eula=false`. It preserves existing configuration files, so older Creative configurations require an explicit operator change to Survival and a server restart. It does not start the server or accept the Minecraft EULA. Those actions require the operator's explicit decision.

## What goes to TypeSafe

Each decision uses `POST https://api.typesafe.ai/v1/systemone`. Authentication is an `Authorization: Bearer <API_KEY>` header, separate from the JSON body. The key stays in the Node process and is not sent to the browser or written to decision logs.

| Payload field | Contents |
| --- | --- |
| `model` | `jev-latest` by default, configurable with `TYPESAFE_MODEL`. |
| `state` | The goal, current player observations, and recent action outcomes. |
| `questions` | One `choice` question named `movement` (retained API ID): six lumber actions or five flag actions. |

The state is assembled in [`src/observe.cjs`](src/observe.cjs) and [`src/task.cjs`](src/task.cjs):

| State field | Meaning |
| --- | --- |
| `goal` | The selected scenario objective. |
| `position` | Player coordinates rounded to two decimals. |
| `health`, `food` | Current values supplied by Mineflayer. |
| `headingDegrees` | Player yaw converted to rounded degrees. |
| `terrain` | Samples 1, 2, 3, and 4 blocks away, forward, left, right, and behind. Left/right are 60 degrees from the current heading. |
| `nearbyEntities` | Up to eight other entities within 12 blocks, with names and distances; not sorted by distance. |
| `scenario` | `lumber` or `flag`; selects the question and allowed actions. |
| `task` | Scenario progress: inventory and home distance for lumber; correct live block count, remaining supplies, section totals, obstructions, and origin for the flag. Both include stage, completion, and time budget. |
| `candidates` | Up to two reachable log blocks, a reachable dropped-log entity, and a reachable exploration destination; absent options are empty/null. Failed lumber targets cool down for 45 seconds. Flag candidates contain up to four exact positions/materials per section and `canInspect`; failed placements cool down for 30 seconds. |
| `recentActions` | Up to eight previous actions, outcomes, measured horizontal movement, and ending positions. |

For each terrain sample, code examines the blocks below the feet, at foot and head height, and one higher. It reports `clear`, `one_block_rise`, `blocked`, `hazard`, `drop_or_no_floor`, or `unknown`. Known samples include ground, foot, and head block names. An unloaded sample contains only distance and `unknown` status. These are sparse local probes, not a full map or camera-visible scene.

### Example request

These are **synthetic examples**, not captured gameplay. Fixtures are in [`docs/example-state.cjs`](docs/example-state.cjs) and [`docs/example-flag-state.cjs`](docs/example-flag-state.cjs). The question, instructions, and action descriptions are generated from the real [`requestFor()` implementation](src/decisions.cjs), so they match the code.

<!-- typesafe-payload:start -->

**Lumber Run (synthetic)**

```json
{
  "model": "jev-latest",
  "state": {
    "scenario": "lumber",
    "goal": "Find trees, collect 10 new logs, then return to the starting position.",
    "task": {
      "home": {
        "x": 10.5,
        "y": 64,
        "z": 20.5
      },
      "target": 10,
      "collected": 3,
      "homeDistance": 8.1,
      "stage": "gathering",
      "complete": false,
      "finished": false,
      "elapsedSeconds": 40,
      "remainingSeconds": 260
    },
    "candidates": {
      "logs": [
        {
          "position": {
            "x": 15,
            "y": 65,
            "z": 28
          },
          "name": "oak_log",
          "distance": 2.7
        }
      ],
      "droppedLog": null,
      "exploreDestination": {
        "x": 20,
        "y": 64,
        "z": 30
      }
    },
    "position": {
      "x": 12.5,
      "y": 64,
      "z": 28.3
    },
    "health": 20,
    "food": 20,
    "headingDegrees": 90,
    "terrain": {
      "forward": [
        {
          "distance": 1,
          "status": "one_block_rise",
          "ground": "grass_block",
          "feet": "grass_block",
          "head": "air"
        },
        {
          "distance": 2,
          "status": "one_block_rise",
          "ground": "grass_block",
          "feet": "grass_block",
          "head": "air"
        },
        {
          "distance": 3,
          "status": "one_block_rise",
          "ground": "grass_block",
          "feet": "grass_block",
          "head": "air"
        },
        {
          "distance": 4,
          "status": "one_block_rise",
          "ground": "grass_block",
          "feet": "grass_block",
          "head": "air"
        }
      ],
      "left": [
        {
          "distance": 1,
          "status": "clear",
          "ground": "grass_block",
          "feet": "air",
          "head": "air"
        },
        {
          "distance": 2,
          "status": "clear",
          "ground": "grass_block",
          "feet": "air",
          "head": "air"
        },
        {
          "distance": 3,
          "status": "clear",
          "ground": "grass_block",
          "feet": "air",
          "head": "air"
        },
        {
          "distance": 4,
          "status": "clear",
          "ground": "grass_block",
          "feet": "air",
          "head": "air"
        }
      ],
      "right": [
        {
          "distance": 1,
          "status": "blocked",
          "ground": "grass_block",
          "feet": "oak_log",
          "head": "oak_log"
        },
        {
          "distance": 2,
          "status": "blocked",
          "ground": "grass_block",
          "feet": "oak_log",
          "head": "oak_log"
        },
        {
          "distance": 3,
          "status": "blocked",
          "ground": "grass_block",
          "feet": "oak_log",
          "head": "oak_log"
        },
        {
          "distance": 4,
          "status": "blocked",
          "ground": "grass_block",
          "feet": "oak_log",
          "head": "oak_log"
        }
      ],
      "behind": [
        {
          "distance": 1,
          "status": "clear",
          "ground": "grass_block",
          "feet": "air",
          "head": "air"
        },
        {
          "distance": 2,
          "status": "clear",
          "ground": "grass_block",
          "feet": "air",
          "head": "air"
        },
        {
          "distance": 3,
          "status": "clear",
          "ground": "grass_block",
          "feet": "air",
          "head": "air"
        },
        {
          "distance": 4,
          "status": "clear",
          "ground": "grass_block",
          "feet": "air",
          "head": "air"
        }
      ]
    },
    "nearbyEntities": [
      {
        "name": "sheep",
        "distance": 6.2
      }
    ],
    "recentActions": [
      {
        "action": "harvest_nearest",
        "outcome": "mined oak_log; inventory verifies collection",
        "distanceMoved": 2.8,
        "position": {
          "x": 12.5,
          "y": 64,
          "z": 28.3
        }
      }
    ]
  },
  "questions": {
    "movement": {
      "type": "choice",
      "instructions": "Choose the next Minecraft action to collect 10 new logs and return home. Use task progress, observed candidates, and recent outcomes. Return home once task.collected >= task.target. Otherwise collect reachable dropped logs, or choose a reachable log to harvest; explore if neither exists. A missing or null candidate makes that action unavailable. Avoid repeating failed actions. Candidates come from loaded world blocks, not camera images. Code navigates and executes one bounded action; your choice determines which action runs. Completion is verified from inventory and position, not your confidence.",
      "criteria": {
        "harvest_nearest": "Navigate to and mine candidates.logs[0], when more logs are needed.",
        "harvest_alternative": "Navigate to and mine candidates.logs[1], when the first target is unsuitable or recently failed.",
        "pickup": "Walk to candidates.droppedLog to collect it. Prefer collecting existing drops before mining more.",
        "explore": "Walk to candidates.exploreDestination to find more reachable trees when no log or drop is available.",
        "return_home": "Navigate back to task.home when task.collected reaches task.target.",
        "wait": "Wait when no useful available action is safe."
      }
    }
  }
}
```

**Canadian Flag (synthetic)**

```json
{
  "model": "jev-latest",
  "state": {
    "scenario": "flag",
    "goal": "Build a Canadian flag mosaic from supplied red and white wool, then inspect the finished flag.",
    "position": {
      "x": 61.5,
      "y": 64,
      "z": 70.5
    },
    "health": 20,
    "food": 20,
    "headingDegrees": 90,
    "terrain": {
      "forward": [
        {
          "distance": 1,
          "status": "clear",
          "ground": "grass_block",
          "feet": "air",
          "head": "air"
        }
      ]
    },
    "nearbyEntities": [],
    "recentActions": [],
    "task": {
      "scenario": "flag",
      "origin": {
        "x": 64,
        "y": 64,
        "z": 64
      },
      "home": {
        "x": 61.5,
        "y": 64,
        "z": 70.5
      },
      "target": 338,
      "collected": 0,
      "unit": "blocks",
      "stage": "building",
      "complete": false,
      "finished": false,
      "blocked": 0,
      "unloaded": 0,
      "inventory": {
        "red_wool": 234,
        "white_wool": 104
      },
      "required": {
        "red_wool": 234,
        "white_wool": 104
      },
      "sections": {
        "red_bars": {
          "placed": 0,
          "total": 156
        },
        "white_field": {
          "placed": 0,
          "total": 104
        },
        "maple_leaf": {
          "placed": 0,
          "total": 78
        }
      },
      "elapsedSeconds": 0,
      "remainingSeconds": 900
    },
    "candidates": {
      "red_bars": [
        {
          "position": {
            "x": 64,
            "y": 64,
            "z": 70
          },
          "name": "red_wool",
          "section": "red_bars"
        }
      ],
      "white_field": [
        {
          "position": {
            "x": 70,
            "y": 64,
            "z": 70
          },
          "name": "white_wool",
          "section": "white_field"
        }
      ],
      "maple_leaf": [
        {
          "position": {
            "x": 76,
            "y": 64,
            "z": 70
          },
          "name": "red_wool",
          "section": "maple_leaf"
        }
      ],
      "canInspect": false
    }
  },
  "questions": {
    "movement": {
      "type": "choice",
      "instructions": "Choose the next construction step for the Canadian flag. The blueprint is supplied by code; you choose which section to build next. Prefer available nearby work and avoid recent failures. candidates contains up to four exact placements per section. An empty section is unavailable. When candidates.canInspect is true, select inspect_flag. Supplied inventory and observed block matches are facts. Never claim success without world verification.",
      "criteria": {
        "build_red_bars": "Place up to four candidates.red_bars blocks for the red side panels.",
        "build_white_field": "Place up to four candidates.white_field blocks for the white background.",
        "build_maple_leaf": "Place up to four candidates.maple_leaf blocks for the red maple leaf.",
        "inspect_flag": "Verify the finished flag. Choose only when candidates.canInspect is true.",
        "wait": "Wait if no construction action is available."
      }
    }
  }
}
```

<!-- typesafe-payload:end -->

### Input and response inspectors

Expand **Actual TypeSafe input** to inspect the exact JSON body sent for the displayed decision: model, state, and questions. Expand **Actual TypeSafe response** separately for the actual returned JSON. Input is captured directly from the transport payload and stored with the decision log; authentication headers and the API key are excluded.

Each inspector has a small **Copy** button that copies its displayed JSON without opening or closing the panel. It shows **Copied!** on success; the buttons become available after the first decision. If browser clipboard access fails, expand the panel and select/copy the JSON manually.

### Response and control loop

The response contains `model`, `answers.movement`, and token `usage`. The movement answer contains `choice` (the selected action key), `probabilities` (one value per candidate), and `confidence`. Confidence is the model's reported value, not a measured probability of completing the objective.

The controller validates the response, checks observation freshness, executes the action, and measures the resulting movement. The next request includes that outcome. TypeSafe returns typed decisions; the dashboard does not invent an inner monologue.

For lumber, TypeSafe selects `harvest_nearest`, `harvest_alternative`, `pickup`, `explore`, `return_home`, or `wait`. Code enumerates candidates and checks paths, then executes the selected action. For the flag, choices are `build_red_bars`, `build_white_field`, `build_maple_leaf`, `inspect_flag`, and `wait`. No fallback silently substitutes another action. Inventory and position determine lumber completion; exact live blueprint matches plus inspection determine flag completion.

Code handles navigation, physics, mining, validation, and stopping. Responses older than five seconds or based on a position displaced by at least 0.8 blocks are rejected. The model receives task progress and nearby candidates rather than screenshots or the full world map. It has a short action history; the application retains home, baseline inventory, failed targets, and explored destinations during a task.

## Recording and local data

**Record tab** opens the browser's screen-sharing picker. Select the dashboard tab, then stop recording to download a WebM video. Nothing is posted automatically. Prismarine Viewer renders the real server world from the bot's perspective.

Decision logs are stored in `runtime/decisions-*.jsonl` with timestamps, observations, actual responses, outcomes, and movement measurements. Logs, videos, world files, keys, and session notes are excluded from the intended public tree. See [SECURITY.md](SECURITY.md).

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `TYPESAFE_API_KEY` | Required | Backend-only API key. |
| `TYPESAFE_MODEL` | `jev-latest` | Requested model alias. |
| `MC_HOST` | `127.0.0.1` | Minecraft host; this demo is intended for local use. |
| `MC_PORT` | `25575` | Connection helper default; the dashboard uses the entered port. |
| `MC_VERSION` | Auto-detect when unset | Optional protocol version; `.env.example` selects 1.21.4. |
| `FLAG_DEMO_RESET` | Disabled | Set `1` only for the managed isolated demo reset adapter. |
| `FLAG_ORIGIN` | Relative to starting position | Optional integer `x,y,z` origin of the ground mosaic. |
| `PORT` | `3010` | Loopback-only dashboard port. |

## Development and documentation hook

```sh
npm test
npm run docs:sync
npm run docs:check
```

Tests do not require Minecraft or an API key. `scripts/check-typesafe.cjs` makes a real, billable API request using synthetic state; run it only for live API validation.

[`AGENTS.md`](AGENTS.md) requires implementation tasks to finish with tests, README review, related documentation updates, and a changelog entry for meaningful changes. Scoped instructions cover controller code and browser UI.

The [project-local Codex hooks](.codex/hooks.json) run at two points:

1. `UserPromptSubmit` saves hashes of project code/config files in ignored local storage. It reads no chat transcript or secrets.
2. `Stop` refreshes the generated README payload. If work changed but the changelog did not, it requests one continuation to review the README and related docs and update the changelog. A repeated stop reports the unresolved reminder without creating an endless loop.

The hook makes no API calls and does not stage, commit, publish, or modify game state. It updates only the generated README section and ignored bookkeeping. The agent writes explanatory prose and verification results.

**Activation:** open this project in Codex, run `/hooks` in the CLI, and review/trust the exact hook definitions. The project configuration layer must also be trusted. New or changed hooks are skipped until trusted. Restart or resume to load the new files as needed. Direct script tests do not prove that a live session has trusted or fired the hooks. See [official hook documentation](https://learn.chatgpt.com/docs/hooks).

`docs:sync` is the manual fallback; `docs:check` fails if the payload drifts from source. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Repository and privacy

This project uses a separate Git repository with fresh, project-only history. Never import a containing private checkout or its commits. Ignore rules do not remove already-tracked files or erase historical content.

Only reviewed source, tests, documentation, dependency metadata, and project workflow configuration belong in this repository. Secrets, session notes, logs, recordings, Minecraft binaries, and worlds are excluded. Review the staged tree before each push, including commit author metadata. No license has been selected; public visibility does not grant an open-source license. See [CONTRIBUTING.md](CONTRIBUTING.md).

## References

- [TypeSafe HTTP API](https://docs.typesafe.ai/api)
- [TypeSafe Choice](https://docs.typesafe.ai/primitives/choice)
- [Mineflayer](https://github.com/PrismarineJS/mineflayer)
- [Mineflayer Pathfinder](https://github.com/PrismarineJS/mineflayer-pathfinder)
- [Prismarine Viewer](https://github.com/PrismarineJS/prismarine-viewer)

Independent prototype; not an official Minecraft, Mojang, Microsoft, or TypeSafe product.
