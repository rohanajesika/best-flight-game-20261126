# Sky Courier: Island Run

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/rohanajesika/best-flight-game-20261126/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/rohanajesika/best-flight-game-20261126/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A 3D flight game that plays offline in a desktop browser from its own files. You fly the Kestrel-9 mail plane over the Merak archipelago — three islands, one sea, a sky full of cloud — in three sorties: thread eight glowing rings, land on all three island strips, or carry the mail to Bintang before the fuel runs dry.

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080. Arrows / WASD fly, Shift / Ctrl work the throttle, G drops the gear, the mouse steers too, P pauses, R restarts.

## What is in here

- `game/` — the game itself: `index.html` plus one module per job (`terrain.js` builds the islands, `aircraft.js` builds the plane, `rings.js` runs the ring course, `missions.js` scores the sorties, `hud.js` draws the lit instruments, `audio.js` synthesises the engine and wind, `main.js` flies it). Three.js is vendored as `game/vendor/three/three.module.min.js`.
- `screenshots/` — four real renders of the game's own code: the cover, a ring pass, the final approach, and a finished sortie.
- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json` with the vendored make.fun library.
- `serve.ts` — a tiny static server for playing locally.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=ronasika&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
