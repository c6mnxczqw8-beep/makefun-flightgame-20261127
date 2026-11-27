[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/c6mnxczqw8-beep/makefun-flightgame-20261127/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/c6mnxczqw8-beep/makefun-flightgame-20261127/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

# Make the best flight game — entry: Valley Mail Run

An original pseudo-3D flight game in plain static files
(`game/`, no build step, no libraries, no network). You fly
a little mail plane in chase view down a winding river
valley: thread the golden mail rings, dodge the storm
clouds, and land on the home runway before the 75-second
clock runs out. Altitude, speed and heading sit on lit
cockpit gauges beside an artificial horizon.

- Steer: arrow keys or A/D (or drag the pointer)
- Climb / descend: W / S or the up / down arrows
- Boost: SHIFT · Brake: X · Start: SPACE · Again: R

`main.ts` hands the game in: it copies `game/` and
`screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library. The
screenshots are real renders of this code in a browser,
staged with the game's own ?shot=start|play|end scenes
(rendered from a single-file inline snapshot of the same
sources, because the local sandbox browser cannot load ES
modules from file://). Play it locally with
`node serve.ts`.
