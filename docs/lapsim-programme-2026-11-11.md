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

## 8. Track geometry status, second pass (2026-11-11, run for commit 60dfd08)

Fixed: self-crossing loops are rejected (total turn must be ±360°); the mapped lap length is restored after smoothing; height is smoothed over 150 m twice.
Official lengths outside the FIA list are stored with their source in `track-requests.json` (`lengths`): circuit and series pages for Kyalami, Yongin, Daytona, Watkins Glen, Mosport, VIR, Lime Rock, Mid-Ohio, Inje, Sebring.

Candidates: 40 layouts at 20 venues (`extra-tracks.json`, report in `extra-tracks-report.txt`). New since the first pass: Kyalami, Daytona, Watkins Glen, VIR, Mid-Ohio, Lime Rock, Hockenheim Short.

Still open:

| Item | State |
|---|---|
| Paul Ricard | Ambiguous: too many loops on the map. Not usable until each layout is checked against the official drawing |
| Yongin | The 4,353 m loop (official 4,346 m) crosses itself; allowed as a crossover lap, to confirm from video |
| Watkins Glen | Official length is rounded to 0.1 mile, so the length check is weak |
| Height | Maximum grades now 3–17 %. Not compared with a published profile yet |
| Not accepted | Sebring (−2.5 %), Inje (+1.0 %), Brands Hatch GP (0.54 %), São Paulo (0.98 %), Mosport (map incomplete), Yeongam F1 lap, Le Mans 24 Hours lap |
| No lap on the map | Jarama, Bathurst, Berlin, Tokyo, Sanya, Long Beach, Detroit, Nürburgring 24 Hours and NLS laps |
| Private data repository | Could not be created from this session; the owner has to create it |

## 9. Track geometry status, third pass (2026-11-11, run for commit 61fa4d9)

Candidates: 44 layouts from the map (`extra-tracks.json`) and 2 from the TUM racetrack database (`extra-tracks-tum.json`: Brands Hatch Grand Prix, Oschersleben; no height), at 22 venues.
New: Le Mans 24 Hours lap from its map relation (13,612 m against 13,626 m official, 0.10 %); Nürburgring 24 Hours lap and Nordschleife with sourced lengths; small map gaps between ways are closed (12 m, then 30 and 60 m only when nothing was accepted).

Height warning: the elevation tiles are a surface model, so trees and buildings are in the height. Forest and city sections (Le Mans, Nordschleife) are not trustworthy until a bare-ground source is used.
Direction is "as mapped" and differs between two Le Mans layouts, which shows it is not reliable: take direction from documents.

Still failing, with the reason:

| Venue | Reason |
|---|---|
| Sebring, Mosport, Jarama, Inje, São Paulo | The map ways are incomplete or imprecise; gap closing did not help. Needs another geometry source |
| Yeongam F1 lap (5,615 m) | Only the 3,027 m permanent lap closes on the map |
| Long Beach, Detroit, Tokyo, Berlin, Sanya, Bathurst | Public roads: many road loops have the right length, so the lap must be chosen with the official track map. Not automatic |
| Nürburgring NLS lap | No sourced length stored |
| Paul Ricard | Ambiguous (see section 8) |
| Rwanda | The ribbon was extracted from the owner's diagram, but the drawing overlaps itself in the middle and is an oblique view. An automatic trace is not reliable; the lap order has to be set by hand. Not built |

## 10. First track-unseen check of the candidate tracks (2026-11-11)

Command: `node scripts/sim/tracks/check-candidates.mjs` → `scripts/sim/data/tracks/candidate-check.json`. No fit. Production WEC cars (frozen values) are run on tracks the fit never saw
and compared with the fastest dry qualifying push lap of the same class and season in the Timing71 rows (`t71-bests-counts.json`), in that lap's weather.

| Group | n | Tracks | Centre line, factor 1 | Centre line, class mean factor | Racing line inside the track width, class mean factor |
|---|---:|---:|---:|---:|---:|
| WEC cars on their own class (Le Mans, Fuji) | 6 | 2 | 11.37 % RMS, +11.26 % bias | 10.82 %, +10.70 % | **2.31 %, +1.38 %** |
| IMSA with borrowed WEC cars (GTP = LMDh, GTD = LMGT3) | 30 | 7 | 14.58 %, +13.87 % | 13.90 %, +13.17 % | 3.91 %, +0.39 % |

Reading:
- A map centre line is 11–14 % too slow. It must never be used as the driven line.
- A least-curvature line inside the track (FIA reference width minus 1.2 m per side; 12 m assumed when the list has no width) removes most of that.
  This variant was added after the first result was seen, with one fixed margin and no tuning; it needs its own declared test before any claim.
- Level C (track-unseen) error for WEC is about 2.3 % on 6 rows and 2 tracks, against 1.17 % on fitted tracks. n is small: one track decides the result.
- Daytona is 6–9 % too fast with the racing line (banking and the chicane are not in the geometry; the cars are also borrowed). Le Mans is 2–3 % too slow.
- Next: hide-and-predict on these tracks with a fitted track factor (level B), better height, real widths, and the per-model fit.

## 11. Sim-racing tracks as a geometry source (owner request, 2026-11-11)

Owner decision: a sim other than iRacing is allowed as a track-geometry source when it is widely regarded as realistic and the track is verified (laser-scanned, official). This widens rule 2.10 for track geometry only.
Search result (web search, 2026-11-11). No sim data has been obtained: only which tracks exist.

| Needed venue | Laser-scanned sim version found | Note |
|---|---|---|
| Sebring | iRacing; rFactor 2; Project Motor Racing | |
| Long Beach | iRacing | |
| Daytona (banking) | iRacing (2021 rescan) | |
| Bathurst | iRacing; Project Motor Racing; Assetto Corsa Competizione | |
| Mosport | Project Motor Racing | |
| Le Mans, Nordschleife (height) | iRacing (Le Mans); rFactor 2 (both); Project Motor Racing | |
| Detroit | iRacing has Belle Isle only | Not the street circuit IMSA races now |
| Berlin (Formula E) | rFactor 2 Berlin E-Prix | An older, shorter layout (1.9 km) than the current FIA length |
| Yeongam | Community conversion only (rFactor → Assetto Corsa) | Not laser-scanned: does not meet the owner's standard |
| Inje, Jarama, Tokyo, São Paulo (Formula E), Sanya | None found | |

How the data could be used: a lap driven in the sim and exported as telemetry (position, height, speed) by an account holder. Track files are licensed game content and are not extracted here.

## 12. Sim data attempt and first track-state documents (2026-11-11)

Sim data: nothing could be fetched. The one open source found, the B4mad Racing community telemetry database (car positions per lap for iRacing and other sims), did not answer
(connection time-out from GitHub Actions, `scripts/sim/data/tracks/b4mad-probe.json`). Track files of the sims are licensed game content and no sim or account exists in this session.
A lap exported by an account holder remains the only route.

Track state: `scripts/sim/data/tracks/track-state.json` holds the first documented surface and layout changes with sources (Laguna Seca 2023 resurfacing, Mid-Ohio 2024 surface,
Detroit circuit change in 2023, Le Mans Mulsanne resurfacing from July 2025, Le Mans length and start line, Suzuka 2026 resurfacing). Rule for use: lap data from before a
resurfacing is a different track state and is not pooled with later laps.

## 13. Geometry-method test on known tracks (2026-11-11)

Script: `scripts/sim/tracks/check-method.mjs`, result: `scripts/sim/data/tracks/method-check.json`.
Question: if a track is built from a map centre line, how far is the simulated lap from the lap on the production track
(built from real car positions)? Same car, weather and track factor on both sides, height off, so only the plan shape differs.
Source of centre lines, widths and race lines: TUM racetrack-database (LGPL). 15 tracks, 2 cars.

Declared before the run: variants A/B/C, cars, metric. One correction after the first run: the length filter was 0.5 % and
skipped 16 of 17 tracks, because a centre line is 0.5-1.8 % longer than a driven line. It is now 2 %, which still drops the
two real layout changes (Yas Marina, Zandvoort). The correction was made before the lap times of the skipped tracks were read.

| Variant | Car | n | RMS % | Bias % | Min % | Max % |
|---|---|---|---|---|---|---|
| A centre line | F1 2025 | 15 | 15.31 | +14.26 | +3.14 | +25.04 |
| A centre line | WEC LMH | 15 | 14.39 | +13.44 | +3.69 | +23.24 |
| B least-curvature line (width - 1.2 m) | F1 2025 | 15 | 5.85 | +4.42 | -3.36 | +12.42 |
| B least-curvature line (width - 1.2 m) | WEC LMH | 15 | 5.05 | +3.24 | -4.56 | +12.06 |
| C TUM race line | F1 2025 | 15 | 3.00 | -0.50 | -7.45 | +4.37 |
| C TUM race line | WEC LMH | 15 | 3.21 | -0.51 | -7.53 | +5.10 |

Reading:
- No map-based variant reaches the current held-out error (about 1 %). Variant B, the one used for the new candidate
  tracks in section 10, is about 5 % RMS and 3-4 % too slow on average.
- So map-built tracks may be shown as rough previews with a warning, but must not be used to fit car values, and their
  lap times must not be reported as predictions.
- Even a published race line (C) is 3 % RMS, so the gap is not only our line solver. Shanghai (-7.5 %) and Suzuka (-4 to -5 %)
  are outliers in every variant; the production tracks there should be checked before any conclusion about them.
- Not tested: tuning the margin or smoothing to shrink the bias. That would be a fit and needs its own declared hold-out.
- Practical consequence: new tracks need real car positions (timing with GPS, onboard telemetry or a verified laser-scan
  sim track) to reach production quality.

### 13.1 Outlier check: Shanghai and Suzuka (2026-11-11)

Shape numbers of the production track against the TUM race line (no fit, read only):

| Track | Source | Length m | Sum of turning deg | Tightest 1 % radius m |
|---|---|---|---|---|
| Shanghai | production | 5440 | 1871 | 19 |
| Shanghai | TUM race line | 5341 | 1806 | 25 |
| Suzuka | production | 5771 | 1694 | 32 |
| Suzuka | TUM race line | 5747 | 1639 | 33 |
| Monza (normal case) | production | 5759 | 876 | 44 |
| Monza (normal case) | TUM race line | 5758 | 889 | 37 |

- Shanghai: the production line is almost as long as the centre line (0.1 % shorter; other tracks are 0.5-1.8 % shorter),
  turns 65 degrees more in total and has a tighter slowest corner. This looks like a production track that follows the
  middle of the road or carries position noise, not a racing line. Its track factor then hides the difference.
- Suzuka: 55 degrees more turning with the same length; smaller version of the same pattern.
- Not changed: the production tracks. Proposed check for the model owner: rebuild both from another session and compare.

## 14. Review and debug pass on the builders (2026-11-11)

Code review of `scripts/sim/laps` and `scripts/sim/tracks` (no tests existed for them). Found and fixed, each with a test in
`tests/lapsim-laps-tracks.test.mjs`:

| # | Fault | Effect | Fix |
|---|---|---|---|
| 1 | Push-lap mark was set before the cross-year wet check | a qualifying lap of a session later marked wet could stay a push lap | wet_session clears the push mark |
| 2 | "Qualifying Race" was typed as qualifying | race laps of GT sprint events could count as push laps | typed as race (applies at the next full collection) |
| 3 | Wet check grouped by track, season and session name only | two events at one track in one season (e.g. two Bahrain rounds) shared one wet mark | event added to the group |
| 4 | "Evolution" written in full was not seen as an Evo kit; "Lancer Evo" was | wrong car split | kit only when a racing category word is present; both spellings |

Counts in section 3 were produced before these fixes; the next merge run replaces them.

Debug of the venues with no accepted lap. Root causes, from the committed map summaries:

| Venue | What the map has | Root cause | Action |
|---|---|---|---|
| Yeongam F1 lap | one way "YEONGAM F1 Track", 5603 m (official 5615 m, 0.21 % off) | three ways drawn over the same nodes doubled the loop count at every shared node; search stopped at its cap (199,832 loops) before the full lap | duplicate edges dropped; search limited to the longest official length + 3 % |
| Paul Ricard | 31,776 loops | same cause | same fix; layout identity still needs the official drawing |
| Mosport | longest loop 3032 m, official 3957 m | a connection is missing (gap over 60 m or a missing way) | open ends are now listed with their distance, to see where |
| Jarama | two ways, 3053 + 852 = 3905 m, no loop | ends do not meet within 60 m | same listing |
| Sebring | 5887 m, official 6019 m (2.19 % off, official rounded to 0.01 mile) | about 130 m missing | same listing |
| Inje | one closed way, 3947 m, official 3908 m (1.00 % off) | map line and official length disagree; not a code fault | stays rejected; needs a second length source |
| Sao Paulo FE | 2931 m, official 2960 m (0.98 % off) | same kind | stays rejected |
| Brands Hatch Indy | 1927 m, official 1944 m (0.87 % off) | same kind | TUM line used instead |
| Long Beach, Detroit, Berlin, Tokyo, Sanya, Bathurst | no racing ways (public roads) | builder only read ways tagged as racing track | roads are now fetched (also for Bathurst) and their names listed; a lap needs the road names from an official circuit map before any loop is accepted, because many road loops match one length |

### 14.1 Result of the rerun after the fixes (2026-11-11)

| Venue | Before | After |
|---|---|---|
| Yeongam F1 lap | search stopped at its cap, best loop 3027 m | accepted: 5596 m against the official 5615 m (0.34 % off); 276 duplicate edges dropped, 12 loops |
| Yeongam permanent layouts | accepted | still accepted (3027 m, 2961 m) |
| Paul Ricard | 31,776 loops | 31,729 loops, search still capped: its layouts are separate ways that cross, not copies, so the duplicate fix does not apply |
| Mosport, Jarama, Sebring | no lap | no lap, and no open end either: the missing length is not a gap. Needs the raw map ways to see which way is missing or filtered |
| Long Beach | no lap | 2 racing ways only; one end is 214 m from the rest (the lap is on public roads) |

Raw map ways and raw lap rows now go to the owner's private repository `kongboda-lapsim-data` (import workflow there copies
the Actions artifacts), so these cases can be debugged with the real geometry.
