// Synthetic documentation fixture, not captured gameplay.
module.exports={
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
};
