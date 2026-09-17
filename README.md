# TypeSafe plays Minecraft

An experimental Minecraft Java bot controlled through TypeSafe choices, with a live world view and the actual API input and output beside it.

## What TypeSafe controls

The current dashboard uses **direct actions**: one API decision chooses one 250 ms movement pulse, a 30-degree turn, aim at an observed target, equip an item, mine one eligible block, place one eligible block, inspect, or wait. Mineflayer executes the selected primitive. The running loop does not call automatic pathfinding or batch mining/building.

Code still supplies observations, nearest candidate coordinates, relative distances, the fixed flag blueprint, prepared wool beds, collision vetoes, and completion checks. Aim actions point at a selected target without moving. Mine/place validate the crosshair and target; there is no automatic route, walk to collect drops, equipment selection, or multi-block work inside those actions. This is structured world-state control, not vision from screenshots, and the bot is separate from the owner's signed-in character.

**The earlier video and 131-decision result used high-level control.** TypeSafe chose task batches while Mineflayer handled navigation, aiming, equipment and execution. That video is not evidence of direct movement control. The current direct controller is a separate experiment; uninterrupted mining-to-reveal runs have completed, as detailed below. Each displayed decision is an actual API response, not a frame, key event or protocol packet.

## Scenarios and cameras

- **Canadian Flag:** mine and collect 234 red and 104 white wool from prepared physical supply beds, then place and inspect the 338 cells of a supplied 26 x 13 blueprint. Construction is unavailable until inventory covers all remaining cells. The model does not design the flag, farm sheep or craft dyes.
- **Lumber Run:** collect ten additional inventory logs, then return within two blocks of the recorded start. The direct controller chooses the movement and single-block interactions. Existing logs do not count.
- **Starter Cabin:** listed but not implemented.

Select a scenario while stopped. Third person follows a visible Steve model; Overhead frames the flag site and supply beds, and is available before starting a connected flag task. There is no first-person option. Cameras never teleport the player. The viewer shows equipped shears/wool, walking limbs and mining swings from live equipment, movement and digging telemetry. Animations are visual representations of game activity, not extra actions.

Pause releases controls and cancels digging; an already-sent packet can still finish. Resume keeps the current in-memory task; restarting the dashboard loses it. Start after completion/expiry or Restart task performs fresh setup. For the opt-in flag replay it clears only flag wool, refills missing supply blocks, clears wool/shears inventory, supplies two shears, removes scoped wool drops and repositions the bot before inference. It never grants building wool. Obstructions or missing supports prevent reset. Other inventory is preserved. The world is not reset on Pause.

Flag runs have a 25-minute budget and lumber runs five minutes, with a 6,000-decision ceiling and a 90-second inventory/build-progress watchdog. Direct control requires thousands of calls and can stall. An uninterrupted fresh run is verified below; the controller can still temporarily oscillate and broader repeatability is not established.

If the player moves 0.8 blocks or more during inference, or a response takes over five seconds, that answer is logged and counted but never executed. The controller waits 250 ms and asks again with a fresh observation, up to three attempts. Three consecutive stale answers stop the run. Logs include response elapsed time and player displacement so a movement-related rejection can be distinguished from a slow response. HTTP 429, 500, 502, 503, 504 and 529, and the ten-second request timeout, also retry within that same three-attempt limit, waiting one then two seconds and observing again. Timeouts and HTTP failures share the attempt budget: at most two extra requests, never an unlimited retry loop. Timeout failures are logged as errorType=timeout with no HTTP status; ordinary cancellation is not retried. Service failures appear in status and separate log records; they are not counted as model decisions or displayed as invented model outputs. Other errors stop immediately. Pause cancels retry waits. Save an active recording before restarting the dashboard to load code changes.

## Preparing the isolated flag site

**Start build test** skips gathering for testing. It cancels/drains a current run, clears the flag pad, empties the wool beds, supplies exactly 234 red and 104 white wool, and starts the direct controller at the building stage. The objective visibly says **BUILD TEST - materials supplied; mining skipped**, and each request/log includes the setup mode. Normal Start/Restart still resets to a mining run; Resume retains the current mode. This button requires the same isolated reset adapter described below. Supplied-material tests are not evidence of successful gathering.

The origin is FLAG_ORIGIN=x,y,z, otherwise relative to the starting position. The footprint is 26 x 13 at the origin Y. Red supply blocks occupy offsets x=0..17,z=-19..-7; white occupies x=20..27,z=-19..-7. All cells need solid support. The operator command generator prepares the disposable site with polished-andesite borders and a quartz foundation.

Run node scripts/flag-demo-commands.cjs to print preparation commands. These clear the named disposable site, including both supply areas. This is operator setup, not model activity.

Automatic replay requires FLAG_DEMO_RESET=1, FLAG_ORIGIN=64,64,64, the TypeSafeExplorer bot and a loopback server on port 25576 consuming runtime/server-command.txt. The public scripts/run-managed-server.cjs provides that mailbox for an already configured runtime/survival server, checks explicit EULA acceptance, and uses JAVA_BIN or java. Do not run a second wrapper against an active world. Other hosts, ports, origins and player names are rejected.

## Current verification

The latest controller completed a recorded run in 801 seconds (13m21s), with 1,848 model decisions, all 338 supply blocks mined and collected before building, and all 338 flag cells placed and inspected. The run had no maintenance pauses or manual gameplay intervention and recovered automatically from one service error. The full recording was reviewed for a 1m42s short edit and a 2m57s extended edit, both with labeled speedups and the real decision panel visible. This verifies successful gameplay, not guaranteed repeatability. When building and no candidate is visible, movement criteria include the current and estimated horizontal distance after an approximately one-block pulse to the nearest supplied placement candidate. These are geometry estimates, not predicted collision-free paths. All otherwise-safe movement choices remain available, and TypeSafe still selects every action. The instruction highlights sideways approaches and avoiding switches between nearby and distant gaps. No automatic navigation or replacement decision was added.

An uninterrupted fresh run completed with 2,266 model decisions in 991 seconds (16m31s). It mined and collected all 234 red and 104 white wool before its first placement, placed and verified all 338 cells, and selected inspect_flag. Inventory and supply beds ended empty. It briefly oscillated at 329 cells, then recovered and finished without a pause, controller reload, reset, supplied wool or budget extension. The log contains no maintenance entries for this run. A proposed movement-description change was tested offline but was never loaded and was discarded. This verifies one clean completion, not guaranteed repeatability.

### Earlier debugging runs

A subsequent fresh run collected all materials but stopped at 37 placements after alternating aim between targets. Investigation found two geometry errors: mutating a normalized vector shortened the visibility ray to 1.05 blocks, and the installed cursor helper cast from full body height while aiming used eye height. Visibility now retains the full target distance, and crosshair validation uses the same eye height as aiming. Both checks use the same 4.5-block reach with no extra visibility margin. Nearby genuinely occluded aims are omitted; distant targets remain available for orientation. Visibility also accounts for Mineflayer mouse-sensitivity rounding at block edges. Corrected a reversed left/right sign in relative target observations. Regression tests cover ray length, eye height, rounded edge geometry, cardinal directions and alternating targets. The failed run was recovered to a verified 338-cell reveal with its existing inventory and placements preserved: 3,801 decisions, all 338 materials mined and collected before construction, and no supplied building wool. It required further maintenance pauses, explicit watchdog recoveries and a logged two-minute debug budget extension. Wall time was 37m31s including pauses. This is a completed debug continuation, not an uninterrupted replay or proof of repeatability. The normal 25-minute limit remains unchanged. Approach instructions now require moving beside enclosed gaps instead of stopping several blocks away.

All 72 offline/HTTP tests pass. A normal direct-control run mined and collected all 234 red and 104 white wool before its first placement, placed all 338 cells, and selected inspect_flag. The world check passed all cells; both supply beds and wool inventory ended empty. The overhead reveal and completed dashboard were visually verified. The run logged 2,513 model decisions and 1,049 task seconds (17m29s), excluding logged maintenance pauses. It included code corrections while paused, preserving inventory and placements; this is evidence of completed gameplay, not an uninterrupted run or a repeatability claim for the final version. No building wool was supplied.

The actual choice list is phase-specific: gathering excludes placement, wool-equipping and flag-inspection actions; building excludes mining, shears and drop-aim actions. Additional checks omit observed unsafe movement and unavailable or redundant interactions. Returned choices are validated against that exact offered set, and the dashboard displays only those criteria. Code does not substitute another movement or route.

The direct controller allows verified one-block descents and maps backward to Mineflayer's back control. Drop observations retain the real item position plus a block-center approachPosition; relative distances and drop-aim actions use that approach point so the player can step off neighboring block edges. Placement observations include visibility, player-body overlap, whether the aim already matches, and the wool required at the aimed cell. Visible placement supports are preferred among candidate observations. These are explicit observation and execution rules, not automatic navigation. Camera packets affect rendering only.

Earlier partial validation: a supplied-material build test placed 15 blocks through 90 decisions, with zero mined blocks. Steve and held shears were visually checked during gathering. The later successful direct-control recording was reviewed as described above. Recordings from the earlier high-level controller remain historical.

## Historical high-level verification

- **Mine-and-build flag verified:** started with zero wool, mined 234 red and 104 white supply blocks, collected all materials before the first placement, then built and inspected all 338 flag cells. The run took 131 real TypeSafe decisions and 590 seconds. One missed white-wool pickup was recovered by a separate model-selected collection action. Both supply beds ended empty and no wool remained in inventory. The completed flag was visually checked from overhead. Recording of this validation run was not completed. A subsequent full mine-and-build recording was reviewed and edited into a 79-second, 1080p H.264 MP4 showing gathering, labelled 6x construction, and the completed flag. Recordings remain excluded from the repository.

- Historical validation: all 36 public offline/HTTP tests pass, including scenario switching in both directions, unavailable-scenario rejection, exact blueprint checks, missing supplies, placement cancellation, and restart ordering. Generated payloads and whitespace checks pass.
- Mid-run Restart was verified live: the partial flag cleared, supplies reset, and building resumed with a fresh decision count. Both JSON Copy buttons were verified by pasting their contents into a local text area.

- **Earlier construction-only flag verified:** all 338 blocks built and checked in 86 real decisions over 217 seconds. That included 39 red-panel batches, 26 white-field batches, 20 maple-leaf batches, and one inspection. API round trips averaged 128 ms (78-294 ms). The server supplied a cleared pad and wool before the run; the player placed every flag block in Survival mode without task-time teleporting or admin commands.
- Confirmed the completed flag in the overhead view and verified that changing scenarios during construction returns HTTP 409. The maple leaf is deliberately coarse pixel art. That earlier overhead view omitted the player avatar; third-person support now renders it in overhead view too. Tab recording was verified in the later mine-and-build recording described above.

- **Gather-and-return verified:** a Survival run collected 10 new inventory logs and returned within one block of its recorded start. It used 17 real TypeSafe decisions in approximately 53 seconds: 10 harvests, six pickup actions, and one return. API round trips averaged 136 ms (88-243 ms). No items were granted and no teleport occurred during the task.
- Test preparation used a separate peaceful Survival world and placed the player on nearby solid ground before starting. The initial natural spawn was on a dense canopy with no reachable candidates. This is evidence for a prepared forest demo, not proof of reliable behavior at arbitrary spawn locations.
- Pause was verified during a live action: the position remained unchanged two seconds later, the interrupted action was logged as cancelled, and Resume retained home and inventory baseline.
- The repeat run completed after that pause/resume: 10 additional logs, 18 decisions including the cancelled attempt, 60 seconds including the pause, and a return within one block. All 19 offline tests and documentation checks pass.
- The older movement-only prototype results below are historical. The viewer may render dropped items as placeholder-colored cubes.

- The controller, dashboard, and browser recording control are implemented.
- The dashboard waiting state and HTTP validation were checked locally.
- A live API smoke test with **synthetic terrain** returned `forward` from `jev-1.13.0` in 335 ms. This is one observed request, not a latency benchmark or gameplay result.
- **In-game movement and first-person rendering verified** on a local Java 1.21.4 world. The first run logged 60 completed live decisions, 10 actions with more than 0.1 blocks of horizontal movement, and approximately 10.04 blocks of accumulated horizontal travel. API round trips ranged from 79 to 308 ms, averaging 137 ms in that run. Accumulated travel includes retracing steps; it is not net exploration distance.
- That older controller spent many decisions turning in dense tree cover. The subsequent high-level controller used pathfinding; the current direct loop does not.

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
| `questions` | One `choice` question named `movement` (retained API ID): up to 20 direct action choices; absent or already-aligned drop aims are omitted. |

The state is assembled by the observation, scenario-progress and direct-control modules:

| State field | Meaning |
| --- | --- |
| `goal` | The selected scenario objective. |
| `position` | Player coordinates rounded to two decimals. |
| `health`, `food` | Current values supplied by Mineflayer. |
| `headingDegrees` | Player yaw converted to rounded degrees. |
| `terrain` | Samples 1, 2, 3, and 4 blocks away, forward, left, right, and behind. Left/right are 60 degrees from the current heading. |
| `nearbyEntities` | Up to eight other entities within 12 blocks, with names and distances; not sorted by distance. |
| `scenario` | `lumber` or `flag`; selects observations and objective validation. |
| `task` | Scenario progress: inventory and home distance for lumber; correct live block count, inventory, remaining material requirements, mined counts, supply-area block counts, section totals, obstructions, and origin for the flag. Both include stage, completion, and time budget. |
| `controlMode` | `direct`, identifying the current primitive-action loop. |
| `direct` | Two nearest mining/placement targets, observed drops, relative forward/right distances, held item, crosshair block, movement vetoes and interaction availability. No route is computed. |
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
    "recentActions": [],
    "controlMode": "direct",
    "direct": {
      "miningTargets": [
        {
          "name": "oak_log",
          "position": {
            "x": 15,
            "y": 64,
            "z": 28
          },
          "distance": 3,
          "forward": 3,
          "right": 0
        }
      ],
      "placementTargets": [],
      "drops": [],
      "heldItem": null,
      "crosshair": null,
      "canMine": false,
      "canPlace": false,
      "canInspect": false,
      "movementSafe": {
        "forward": true,
        "backward": true,
        "left": true,
        "right": true,
        "jump_forward": true
      }
    }
  },
  "questions": {
    "movement": {
      "type": "choice",
      "instructions": "Choose one useful Minecraft control action. Every movement, aim, equip, mine and placement needs your separate choice. Code supplies observations and a fixed blueprint, not navigation. Use only offered choices.\n\nBUILDING or INSPECT stage: Gathering is finished. Inventory already covers ALL remaining cells in task.required. Do not return home, search for supplies, or wait merely because miningTargets and drops are empty. Finish direct.placementTargets. When canPlace is true, place now. When aimedPlacement exists, equip its named wool then place. Otherwise aim at a visible placement target. If none is visible, move closer until one becomes visible. A gap surrounded by wool requires standing right beside its edge, not stopping several blocks away. Strafe right for positive right and left for negative right; move forward for positive forward and backward for negative forward. Aim_place can turn toward distant targets. A negative forward distance means the target is BEHIND you: aim toward it or move backward, never continue forward away from it. BlockedByPlayer means move away to uncover the cell. AlreadyAimed but not visible means change position, not aim again. Inspect when canInspect is true.\n\nGATHERING stage: Collect direct.drops before mining more. Their approachPosition is a block center to WALK OVER; pickup happens automatically by proximity. Aim_drop faces that point, then choose movement. If a wool block obstructs access, jump_forward or aim and mine it. Otherwise approach a miningTarget, aim, equip shears and mine one block. Do not keep aiming if canMine is true. For lumber, collect ten new logs then walk home.\n\nDirections are relative to the player: positive forward is ahead, negative is behind; positive right is right, negative is left. Forward/backward/strafe pulses move roughly one block. Jump crosses a one-block rise. When building and no target is visible, compare the distance estimates in the movement choices. Approach placementTargets[0], the nearest remaining gap, until a placement becomes visible. A sideways step can bring you closer while forward/backward takes you farther away. Do not alternate between approaching the nearest gap and aiming at a farther gap. Estimates are approximate; observe safety and actual outcomes. Do not repeat actions that make no progress. Wait only when no useful action is available.",
      "criteria": {
        "forward": "Hold forward for 250 milliseconds. No automatic steering.",
        "backward": "Hold backward for 250 milliseconds.",
        "left": "Strafe left for 250 milliseconds without turning.",
        "right": "Strafe right for 250 milliseconds without turning.",
        "jump_forward": "Jump and hold forward for 250 milliseconds to climb a one-block rise.",
        "turn_left": "Turn left by 30 degrees, without walking.",
        "turn_right": "Turn right by 30 degrees, without walking.",
        "aim_mine_0": "Look at miningTargets[0]. Only changes aim, never moves or mines.",
        "equip_shears": "Select shears from inventory; does not mine.",
        "wait": "Release controls and wait 250 milliseconds."
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
    "controlMode": "direct",
    "direct": {
      "miningTargets": [
        {
          "name": "red_wool",
          "position": {
            "x": 15,
            "y": 64,
            "z": 28
          },
          "distance": 3,
          "forward": 3,
          "right": 0
        }
      ],
      "placementTargets": [],
      "drops": [],
      "heldItem": null,
      "crosshair": null,
      "canMine": false,
      "canPlace": false,
      "canInspect": false,
      "movementSafe": {
        "forward": true,
        "backward": true,
        "left": true,
        "right": true,
        "jump_forward": true
      }
    }
  },
  "questions": {
    "movement": {
      "type": "choice",
      "instructions": "Choose one useful Minecraft control action. Every movement, aim, equip, mine and placement needs your separate choice. Code supplies observations and a fixed blueprint, not navigation. Use only offered choices.\n\nBUILDING or INSPECT stage: Gathering is finished. Inventory already covers ALL remaining cells in task.required. Do not return home, search for supplies, or wait merely because miningTargets and drops are empty. Finish direct.placementTargets. When canPlace is true, place now. When aimedPlacement exists, equip its named wool then place. Otherwise aim at a visible placement target. If none is visible, move closer until one becomes visible. A gap surrounded by wool requires standing right beside its edge, not stopping several blocks away. Strafe right for positive right and left for negative right; move forward for positive forward and backward for negative forward. Aim_place can turn toward distant targets. A negative forward distance means the target is BEHIND you: aim toward it or move backward, never continue forward away from it. BlockedByPlayer means move away to uncover the cell. AlreadyAimed but not visible means change position, not aim again. Inspect when canInspect is true.\n\nGATHERING stage: Collect direct.drops before mining more. Their approachPosition is a block center to WALK OVER; pickup happens automatically by proximity. Aim_drop faces that point, then choose movement. If a wool block obstructs access, jump_forward or aim and mine it. Otherwise approach a miningTarget, aim, equip shears and mine one block. Do not keep aiming if canMine is true. For lumber, collect ten new logs then walk home.\n\nDirections are relative to the player: positive forward is ahead, negative is behind; positive right is right, negative is left. Forward/backward/strafe pulses move roughly one block. Jump crosses a one-block rise. When building and no target is visible, compare the distance estimates in the movement choices. Approach placementTargets[0], the nearest remaining gap, until a placement becomes visible. A sideways step can bring you closer while forward/backward takes you farther away. Do not alternate between approaching the nearest gap and aiming at a farther gap. Estimates are approximate; observe safety and actual outcomes. Do not repeat actions that make no progress. Wait only when no useful action is available.",
      "criteria": {
        "forward": "Hold forward for 250 milliseconds. No automatic steering.",
        "backward": "Hold backward for 250 milliseconds.",
        "left": "Strafe left for 250 milliseconds without turning.",
        "right": "Strafe right for 250 milliseconds without turning.",
        "jump_forward": "Jump and hold forward for 250 milliseconds to climb a one-block rise.",
        "turn_left": "Turn left by 30 degrees, without walking.",
        "turn_right": "Turn right by 30 degrees, without walking.",
        "aim_mine_0": "Look at miningTargets[0]. Only changes aim, never moves or mines.",
        "equip_shears": "Select shears from inventory; does not mine.",
        "wait": "Release controls and wait 250 milliseconds."
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

Both scenarios use the direct choices in the generated examples above. No fallback silently substitutes another action. Inventory and position determine lumber completion; exact live blueprint matches plus inspection determine flag completion. The old batch actions remain in source for historical tests but are not used by the dashboard loop.

Code handles control-key execution, game protocol interactions, physics, validation, and stopping. Responses older than five seconds or based on a position displaced by at least 0.8 blocks are rejected. The model receives task progress and nearby candidates rather than screenshots or the full world map. It has a short action history; the application retains home and baseline inventory during a task.

## Recording and local data

**Record tab** opens the browser's screen-sharing picker. Select the dashboard tab, then stop recording to download a WebM video. Nothing is posted automatically. Prismarine Viewer renders the real server world in third-person or overhead view.

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
