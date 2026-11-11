# Lap simulator programme — owner instructions of 2026-11-11

Owner: Claude runs this directly (ChatGPT/Codex stopped on errors). Branch `lapsim-laps/all-laps-2026-11-11`, fork only.
Rules: `docs/lapsim-physics-rules.md`. Data declaration: `docs/lapsim-all-laps.md`. Nothing here is in production.

## 1. Requirements

| # | Requirement | State |
|---|---|---|
| R1 | Add the missing circuits that the data needs, plus Yeongam, Yongin, Inje, Rwanda (not built), Mugello, Nürburgring, Brands Hatch, Bahrain Outer, Kyalami, Fuji and others | List in `scripts/sim/data/track-requests.json`. Map fetch written (`scripts/sim/tracks/fetch-osm.mjs`). No geometry built yet |
| R2 | Each track carries elevation, surface state, air, air temperature and track temperature | Elevation: to add from an open elevation model. Conditions: measured per event (R3). Surface: FIA/organiser documents only |
| R3 | Choosing a car sets the season and weather of the event that car races in (Bahrain GP is not the 8 Hours of Bahrain) | Table built from measured feed weather: `t71-conditions-counts.json`, key series, track, month, session type (1,749 keys) |
| R4 | Homepage track list in the owner's format (flag, three-letter code, name; ⚠️ for unbuilt) | Labels stored in `track-requests.json`. Website change = separate PR |
| R5 | Sessions with no safety-car or weather information: fill from Al Kamel files and news reports (Sportscar365, Dailysportscar, Autosport), compare with other years | Coverage measured (`t71-info-counts.json`). Filling not started |
| R6 | Evo kits are separate cars (911 GT3 R against 911 GT3 R Evo). Website: pick the base car, tick "Evo" | Identity rule `scripts/sim/laps/models.mjs`; laps per kit in `t71-evo-counts.json` |
| R7 | Keep lowering the error. Ask the owner in plain words when a decision is needed | Standing |
| R8 | All series split by car model, F1 included | Declared (all-laps doc 2.2). Chassis-name table not built |
| R9 | No wet levels: keep all measured weather per lap | Done in the dataset |

## 2. What the data says about tracks (Timing71 rows, real series)

| | Tracks | Laps | Dry qualifying push laps |
|---|---:|---:|---:|
| Simulator has geometry | 26 | 2,164,543 | 50,836 |
| Track id known, no geometry | 70 | 4,485,439 | 116,599 |

Largest gaps by laps: Nordschleife 852,356 · Indianapolis 431,879 · Le Mans 328,882 · Daytona 309,119 · Sebring 201,931 · Portimão 188,301 ·
Road Atlanta 175,786 · Watkins Glen 165,678 · Paul Ricard 156,427 · Laguna Seca 119,232 · Hockenheim 114,657 · Road America 114,479 · Mugello 103,738.
Full list: `scripts/sim/data/laps/t71-tracks-counts.json`.

## 3. Method for a new track (declared)

1. Centre line from OpenStreetMap raceway ways (© OpenStreetMap contributors, ODbL). The assembled lap must match the official lap length within 0.5 %, or the track is not used.
2. Height from an open elevation model along the line; grade smoothed like the existing tracks. Banking only from published figures.
3. Label: "map centre line, not a driven line". The 26 existing tracks come from car positions, so a new track is a lower evidence layer.
4. Accuracy: a new track with real laps (for example Le Mans, Fuji, Sebring) is checked by hide-and-predict before it is shown. A track with no laps (Rwanda, a new layout) is shown with ⚠️ and the track-unseen error, which is not measured yet (rules 3.2, level C).
5. Onboard and race video: used to check corner count, direction and kerb or surface notes. Video is not a source of geometry numbers.
6. Rwanda: the final layout is not published (announced figures only: about 6 km, 17 corners, anti-clockwise, 197 m of elevation change). No geometry can be built without a layout.

## 4. Order of work

1. Track geometry for the owner's list (R1, R2), each checked against its official length.
2. Car-model tables with sources (R6, R8); GT3 series table from regulations (rules 4.2).
3. Flag and weather filling for the fitted series first: IMSA, Formula E, DTM, Asian LMS have no rain field (R5).
4. The hierarchical per-model fit and its validation at R (all-laps doc 3–5).
5. Website PRs (R3, R4, R6 tick box), separate from physics.

## 5. Map data fetched (2026-11-11)

`scripts/sim/data/tracks/osm-summary.json`: raceway ways found for 18 of 20 venues. Yongin timed out (retry). Bathurst has no raceway ways (public road).
Le Mans has only the Bugatti part as raceway; the public-road sections need a separate query. Next: assemble each layout as a closed loop and
accept it only if it matches the official lap length (with a source) within 0.5 %.

## 6. Rwanda

Owner decision (2026-11-11): use what is published as far as possible, include the climate of the site, and update automatically until the circuit is finished.
Published facts and their conflict are stored in `track-requests.json` (official October 2026 figures against a diagram of unknown origin).
Automatic update, proposed: a weekly job that (a) repeats the map fetch at the site, so the track is picked up as soon as mappers draw it,
(b) checks the FIA licensed-circuit list and the Formula 1 news pages for a released layout, and (c) opens an issue when something changes. Not built yet.

## 7. Track geometry status (2026-11-11, run for commit 38094d6)

Official lengths: FIA List of Licensed Circuits, lists of 2026-03-31 and 2025-12-01, parsed into `scripts/sim/data/tracks/fia-circuits.json` (438 rows).
Accepted (map lap within 0.5 % of the FIA lap distance): 24 layouts at 13 venues. Candidates with height: `scripts/sim/data/tracks/extra-tracks.json`. Nothing reads this file yet.

Open defects, to fix before any use:

| Defect | Evidence | Fix |
|---|---|---|
| Position smoothing shortens the lap | Paul Ricard 5,733 m built against 5,822 m official (−1.5 %); most others −0.1 to −0.6 % | Smooth less, or smooth curvature instead of positions; re-check the 0.5 % rule after smoothing |
| One accepted loop is not a simple lap | Indianapolis Grand Prix: total turn 0° instead of ±360° | Reject loops whose total turn is not ±360° |
| Height is too rough | Maximum grade 25.5 % at Mugello and 23.9 % on the Nordschleife from a 30 m height grid | Longer smoothing and a finer height source per country; compare with published height profiles |
| Direction and start line not verified | "as mapped" only | Take from the series documents and video |

Not accepted yet: Sebring (map lap 2.5 % short), Inje (1.0 % long), Brands Hatch Grand Prix (0.54 %), Lime Rock (1.5 %), São Paulo (0.98 %).
No FIA row matched: Kyalami, Daytona, Watkins Glen, Yongin, Mosport, VIR — another official length source is needed.
No lap on the map: Jarama, Bathurst, Berlin, Tokyo, Sanya, Long Beach, Detroit, the Le Mans 24 Hours lap, the Yeongam F1 lap, the Nürburgring 24 Hours and NLS laps. Mid-Ohio: map server error.
