# Formula E Gen4 - modelling preparation (2026-11-11)

Status: preparation only. No car values are fitted, nothing in production changes. Product entry stays `coming-soon`
(`worker/lapsim/series.js`, key `fe`).

## 1. Inputs with a source

Regulation values already parsed in the repo (`worker/lapsim/rules-data.js`, key `fe-gen4`, FIA Formula E Technical
Regulations 2026-2027 V4, published 2026-09-30, checked 2026-11-07):

| Input | Value | Article |
|---|---|---|
| Max power from battery | 600 kW | 7.5 |
| of which rear axle, max | 350 kW | 7.5 |
| of which front axle, max | 250 kW | 7.5 |
| Max power to battery (regen) | 700 kW | 7.5 |
| Min mass with driver | 1046 kg | 5.1 |

Press and series values (not regulation text; use only as cross-checks):

| Input | Value | Source |
|---|---|---|
| Race power / qualifying and attack power | 450 kW / 600 kW | fiaformulae.com "GEN4 Unleashed"; Porsche newsroom (975 RSE) |
| Drive | permanent all-wheel drive, active differential | fiaformulae.com; Nissan |
| Aero | two packages: high downforce (qualifying), low drag (race) | fiaformulae.com; Porsche |
| Size | 5540 x 1790 x 1113 mm, wheelbase 3080 mm | fiaformulae.com |
| Race energy | 55 kWh | fiaformulae.com |
| Tyres | Bridgestone | Wikipedia (secondary) |

Conflicts found, not resolved here (rule: never pick a number by guess):

| Item | Values seen | Use |
|---|---|---|
| Mass | 1046 kg with driver (regulation); 954 kg without driver (Porsche); 1012 and 1016 kg (Wikipedia versions) | regulation value |
| Energy | 55 kWh race energy (series); 51.25 kWh usable (Porsche, provisional) | open: read the regulation article |
| Width / height | 1790 x 1113 mm (series); 1800 x 1025 mm (Wikipedia) | open: read the regulation article |

## 2. What is not known (no source yet)

- Drag and downforce of both aero packages (no public number).
- Tyre grip of the new Bridgestone tyre, dry and wet.
- Where 450 kW applies in the regulation text (the parser only reads the 600 kW cap), and the race energy allowance per event.
- Front/rear power split the teams actually use (active differential; teams are free).
- Weight distribution, centre-of-gravity height.

These must come from timing data once the cars race, or from a regulation article. They are not to be guessed.

## 3. Simulator readiness

| Need | In kernel today | Gap |
|---|---|---|
| All-wheel drive traction | `awdAboveKph` switch exists (F1/Gen3-style part-time) | permanent AWD with a power cap per axle (250 front / 350 rear) |
| Regeneration | `regenMax`, regen share exist | 700 kW limit on both axles; brake blending front/rear |
| Two aero packages | one car value set per session type | select package by session (qualifying = high downforce, race = low drag) |
| Two power levels | power is one value | 450 kW race, 600 kW qualifying / attack mode |
| Energy-limited race pace | F1 energy logic exists (`energy-limits.js`, `stint-energy.js`) | Formula E race allowance, lift-and-coast, attack mode time |

Each gap is a model change: draft PR, production baseline in the same run, no merge without the gate.

## 4. Tracks (season 2026-27, 13 venues, 21 races, first race Jeddah 18 December 2026)

| Venue | Track in simulator | Note |
|---|---|---|
| Jeddah, Mexico City, Austin, Miami, Monaco, Zandvoort, Shanghai | F1 layout exists | Formula E layout not confirmed; separate id until confirmed |
| Brands Hatch | map/TUM candidate (warning mark) | layout not confirmed |
| Jarama, Sao Paulo (street), Sanya, Berlin, Tokyo | none accepted | see programme document section 9 |

Section 13 of the programme document applies: map-built tracks are about 5 % off, so they cannot be used to fit Gen4 values.

## 5. Data plan

1. Before the first race: no Gen4 race laps exist. Only test reports. Nothing to fit.
2. Gen3 Evo laps (Timing71 Formula E sessions already in the all-laps dataset) give the class a starting point for
   tyre-independent items only (track factors on shared venues). Gen4 has new tyres, aero and drive, so car values do not carry over.
3. From Jeddah on: collect every session with the all-laps builder (same marks). Qualifying duels (600 kW, high downforce)
   and race laps (450 kW, low drag, energy-limited) are different cars for the fit and stay in separate groups.
4. First hide-and-predict test needs at least 3 venues with production-quality tracks: earliest after Austin (6 February 2027)
   if the Formula E layouts equal the existing ones.

## 6. Declared before any Gen4 fit

- Fixed inputs: the regulation values in section 1 (mass, power caps, regen). Not fitted.
- Fitted: drag, downforce (per aero package), tyre grip, track factor. One value set per package, all teams together first;
  team differences only after 5 venues, with the shrink widths of `docs/lapsim-all-laps.md`.
- Hold-out: leave one venue out; class-best and per-car errors reported separately with n.
- Comparison point: a "regulation-only" car (section 1 inputs, Gen3 Evo aero and grip) run in the same job, so any gain is measured.

## Sources

- FIA Formula E Technical Regulations 2026-2027 V4 (fia.com), via `worker/lapsim/rules-data.js`
- https://www.fiaformulae.com/en/formula-e-gen4-unleashed
- https://newsroom.porsche.com/en_US/2026/motorsport/porsche-975-rse-formula-e-gen4-presentation-42191.html
- https://theevreport.com/nissan-formula-e-gen4-car-power
- https://en.wikipedia.org/wiki/Formula_E_Gen4
- https://e-formula.news/news/formula-e-news/formula-e-news-detail/austin-brands-hatch-zandvoort-confirmed-formula-e-unveils-its-2026-27-gen4-race-calendar-featuring-21-races-94843
- https://fiaformulae.com/en/news/1074658 (calendar, from `scripts/sim/data/track-requests.json`)
