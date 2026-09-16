# TypeSafe plays Minecraft

A small experiment in controlling a Minecraft Java player with [TypeSafe](https://typesafe.ai). TypeSafe selects gathering, navigation, and construction actions from structured world observations. Mineflayer executes them, and a browser dashboard shows the live world beside actual action probabilities and API responses.

This prototype controls a bot player, not the keyboard or the owner's signed-in character. Choose Lumber Run or Canadian Flag from the scenario selector. Starter Cabin is listed as coming next. There is no scripted route or fake inference fallback.

## Scenarios

| Scenario | Status | Objective |
| --- | --- | --- |
| Lumber Run | Available | Collect 10 new logs and return home. |
| Canadian Flag | Available | Mine 234 red and 104 white wool, build a 26 x 13 flag, then verify every block. |
| Starter Cabin | Coming next | Gather, craft, build, and inspect a small cabin. Not implemented. |

Select a scenario while stopped. Switching discards the current in-memory task and clears its displayed results; Pause/Resume within a scenario retains its state. **Restart task** is available mid-run: it cancels the current action, waits for it to stop, then starts a fresh task with a new timer and decision count. For the configured flag demo it clears the flag and refills the physical wool supply areas; for Lumber Run it records a new home and inventory baseline without restoring trees. The backend rejects switching while an action is active. The objective, progress, and actual TypeSafe choices update with the selection. Camera controls switch between the player's view and an overhead flag camera; they never teleport the player. The overhead camera automatically appears after a successful flag inspection.

### Canadian Flag

The character first **mines and collects 234 red wool and 104 white wool**, then builds the flag on a separate bordered pad. TypeSafe chooses red-wool mining, white-wool mining, or collection of an observed dropped wool item. Mining actions break up to eight blocks and walk to collect their drops; inventory confirms collection. Construction remains unavailable until both colors cover all remaining blueprint cells. It then chooses red side panels, white field, maple leaf, or final inspection. Placement batches contain up to four cells; completion requires all 338 live blocks to match.

The wool comes from **prepared physical supply areas**, not sheep farming or dye crafting. The isolated demo starts with no wool in inventory and two ordinary shears. Every building block must be mined and picked up. The supplied pixel-art blueprint still determines geometry; TypeSafe chooses the next action, not a new design. Navigation cannot dig or place incidental blocks. Only selected wool cells within the supply areas may be mined.

The build origin is set by `FLAG_ORIGIN=x,y,z` (otherwise three blocks east and six north of the starting position). Red supply cells are an 18 x 13 layer at origin offsets x=0..17, z=-19..-7; white supply cells are 8 x 13 at x=20..27, z=-19..-7. Both use the origin Y and need solid ground below. The 26 x 13 flag footprint must be clear with solid support. The command generator prepares polished-andesite borders and a smooth-quartz flag foundation in the disposable demo. It never grants red or white wool directly to inventory.

**Replay:** Start after a finished task, or **Restart task** at any time, clears red/white flag blocks, restores missing wool in the two supply areas, clears the character's red/white wool and shears, supplies two shears, removes leftover wool drops within the named areas, and returns the character to the start before inference. Other items are preserved. Unexpected blocks or missing support stop automatic reset. **Pause/Resume** preserves gathering and construction progress. Without automatic reset, prepare the site and supply areas manually; existing inventory or correctly placed blocks count toward what remains needed.

The task has a 25-minute wall-clock budget, 300-decision cap, 45-second action deadline, and a 90-second gathering/construction progress timeout. Pause cancels navigation and digging and prevents later placements; an already-sent game packet may still complete. A broken block alone never counts as inventory. An uncollected drop remains eligible for the collection action.

Run `node scripts/flag-demo-commands.cjs` to print the one-time preparation commands for the isolated demo. **These clear the named disposable site, including the expanded supply areas.** They prepare the flag origin at `64,64,64`, the resource area to its north, and the character's tools. This is operator setup, separate from model-controlled gathering and construction.

Automatic replay is explicitly opt-in: set `FLAG_DEMO_RESET=1` and `FLAG_ORIGIN=64,64,64` for the dashboard, and connect to the isolated loopback server on port 25576. The local server must consume `runtime/server-command.txt`. The existing demo wrapper supports this; the public `scripts/run-managed-server.cjs` provides the same mailbox for an already configured `runtime/survival` server, checks loopback/port and explicit EULA acceptance, and uses `JAVA_BIN` (or `java`) to run the downloaded jar. Do not start a second wrapper while a server already owns that world/port. The adapter rejects other hosts, ports, usernames, or origins, refuses to overwrite an occupied mailbox, and waits for the live world/inventory reset before starting the model loop.

### Lumber Run

Press **Start task** in a Survival world. The player remembers its starting position and inventory, then TypeSafe chooses between harvesting either of two nearby logs, collecting a dropped log, exploring a reachable location, returning home, or waiting. The dashboard shows inventory progress, distance home, remaining time, actual probabilities, and responses.

Success requires at least 10 additional logs still in inventory and a three-dimensional distance of at most two blocks from home. Existing logs and broken-but-uncollected blocks do not count. A run stops after five minutes, 120 decisions, 90 seconds without inventory/return progress, low health, death, disconnect, an API error, or an action timeout. Each action has a 20-second limit. Pause cancels inference, navigation, and digging. Resume preserves home and inventory baseline within the same Node process; the five-minute wall-clock budget includes pauses. Restarting Node resets task memory.

Use a stable ground-level starting point near trees. Navigation may clear leaves, but cannot place blocks, mine other terrain, parkour, swim through water, or plan drops greater than two blocks. It uses loaded blocks, including blocks outside the camera view. Paths and candidate availability are estimates and can fail as the world changes. These are bounded scenarios, not general natural-language Minecraft automation.

## Verification history

- **Mine-and-build flag verified:** started with zero wool, mined 234 red and 104 white supply blocks, collected all materials before the first placement, then built and inspected all 338 flag cells. The run took 131 real TypeSafe decisions and 590 seconds. One missed white-wool pickup was recovered by a separate model-selected collection action. Both supply beds ended empty and no wool remained in inventory. The completed flag was visually checked from overhead. Recording of this validation run was not completed. A subsequent full mine-and-build recording was reviewed and edited into a 79-second, 1080p H.264 MP4 showing gathering, labelled 6x construction, and the completed flag. Recordings remain excluded from the repository.

- Current validation: all 34 public offline/HTTP tests pass, including scenario switching in both directions, unavailable-scenario rejection, exact blueprint checks, missing supplies, placement cancellation, and restart ordering. Generated payloads and whitespace checks pass.
- Mid-run Restart was verified live: the partial flag cleared, supplies reset, and building resumed with a fresh decision count. Both JSON Copy buttons were verified by pasting their contents into a local text area.

- **Earlier construction-only flag verified:** all 338 blocks built and checked in 86 real decisions over 217 seconds. That included 39 red-panel batches, 26 white-field batches, 20 maple-leaf batches, and one inspection. API round trips averaged 128 ms (78-294 ms). The server supplied a cleared pad and wool before the run; the player placed every flag block in Survival mode without task-time teleporting or admin commands.
- Confirmed the completed flag in the overhead view and verified that changing scenarios during construction returns HTTP 409. The maple leaf is deliberately coarse pixel art. The overhead camera currently shows the world without the controlled player's avatar. Tab recording was verified in the later mine-and-build recording described above.

- **Gather-and-return verified:** a Survival run collected 10 new inventory logs and returned within one block of its recorded start. It used 17 real TypeSafe decisions in approximately 53 seconds: 10 harvests, six pickup actions, and one return. API round trips averaged 136 ms (88-243 ms). No items were granted and no teleport occurred during the task.
- Test preparation used a separate peaceful Survival world and placed the player on nearby solid ground before starting. The initial natural spawn was on a dense canopy with no reachable candidates. This is evidence for a prepared forest demo, not proof of reliable behavior at arbitrary spawn locations.
- Pause was verified during a live action: the position remained unchanged two seconds later, the interrupted action was logged as cancelled, and Resume retained home and inventory baseline.
- The repeat run completed after that pause/resume: 10 additional logs, 18 decisions including the cancelled attempt, 60 seconds including the pause, and a return within one block. All 19 offline tests and documentation checks pass.
- The older movement-only prototype results below are historical. The viewer may render dropped items as placeholder-colored cubes.

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
| `questions` | One `choice` question named `movement` (retained API ID): six lumber actions or eight flag actions. |

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
| `task` | Scenario progress: inventory and home distance for lumber; correct live block count, inventory, remaining material requirements, mined counts, supply-area block counts, section totals, obstructions, and origin for the flag. Both include stage, completion, and time budget. |
| `candidates` | Up to two reachable log blocks, a reachable dropped-log entity, and a reachable exploration destination; absent options are empty/null. Failed lumber targets cool down for 45 seconds. Flag candidates include up to eight mining targets per color, an observed `droppedWool`, up to four placements per section after gathering, and `canInspect`; failed targets cool down for 30 seconds. |
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
    "goal": "Mine and collect 234 red and 104 white wool from the supply areas, then build and inspect a Canadian flag.",
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
      "stage": "gathering",
      "complete": false,
      "finished": false,
      "blocked": 0,
      "unloaded": 0,
      "inventory": {
        "red_wool": 0,
        "white_wool": 0
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
      "remainingSeconds": 1500,
      "needsMaterials": true,
      "mined": {
        "red_wool": 0,
        "white_wool": 0
      },
      "supplyRemaining": {
        "red_wool": 234,
        "white_wool": 104
      }
    },
    "candidates": {
      "red_wool": [
        {
          "position": {
            "x": 64,
            "y": 64,
            "z": 57
          },
          "name": "red_wool"
        }
      ],
      "white_wool": [
        {
          "position": {
            "x": 84,
            "y": 64,
            "z": 57
          },
          "name": "white_wool"
        }
      ],
      "droppedWool": null,
      "red_bars": [],
      "white_field": [],
      "maple_leaf": [],
      "canInspect": false
    }
  },
  "questions": {
    "movement": {
      "type": "choice",
      "instructions": "Choose the next gathering or construction step for the Canadian flag. First mine and collect ALL remaining materials: task.inventory must cover task.required for both colors before any building. During gathering choose a nonempty candidates.red_wool or candidates.white_wool batch, preferably the closer supply, or collect_wool for an available drop. Empty candidates are unavailable. Code restricts mining to the prepared supply areas; never mine the flag. Once all wool is in inventory, choose construction. The blueprint is supplied by code; you choose which section to build next. Prefer available nearby work and avoid recent failures. candidates contains up to four exact placements per section. An empty section is unavailable. When candidates.canInspect is true, select inspect_flag. Observed inventory and block matches are facts. Never claim success without world verification.",
      "criteria": {
        "mine_red_wool": "Mine and collect up to eight candidates.red_wool blocks from the red supply area when red wool is still needed.",
        "mine_white_wool": "Mine and collect up to eight candidates.white_wool blocks from the white supply area when white wool is still needed.",
        "collect_wool": "Collect candidates.droppedWool before mining more. Available only when this observed drop exists.",
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

For lumber, TypeSafe selects `harvest_nearest`, `harvest_alternative`, `pickup`, `explore`, `return_home`, or `wait`. Code enumerates candidates and checks paths, then executes the selected action. For the flag, choices are `mine_red_wool`, `mine_white_wool`, `collect_wool`, `build_red_bars`, `build_white_field`, `build_maple_leaf`, `inspect_flag`, and `wait`. No fallback silently substitutes another action. Inventory and position determine lumber completion; exact live blueprint matches plus inspection determine flag completion.

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

## Development and documentation

```sh
npm test
npm run docs:sync
npm run docs:check
```

Tests do not require Minecraft or an API key. `scripts/check-typesafe.cjs` makes a real, billable API request using synthetic state; run it only for live API validation.

[`AGENTS.md`](AGENTS.md) requires implementation tasks to finish with tests, README review, related documentation updates, and a changelog entry for meaningful changes. Scoped instructions cover controller code and browser UI.

Run `docs:sync` after changing the request code or fixtures; `docs:check` fails if the README payload drifts from source. These commands and GitHub Actions work without an editor integration. Personal agent hooks and settings are excluded from the public repository. See [CONTRIBUTING.md](CONTRIBUTING.md).

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
