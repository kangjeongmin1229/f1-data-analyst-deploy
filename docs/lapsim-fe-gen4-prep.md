# Formula E Gen4 - modelling preparation (2026-11-11)

Status: preparation only. No car values are fitted, nothing in production changes. Product entry stays `coming-soon`
(`worker/lapsim/series.js`, key `fe`).

## 1. Inputs with a source

### 1.1 Regulation (FIA Formula E Technical Regulations 2026-2027 V4, WMSC 30.09.2026, pages 12-41 read on 2026-11-11)

Numbers in square brackets are printed that way in the regulation (still provisional there).

| Input | Value | Article / page |
|---|---|---|
| Overall width, max | [1800] mm | 4.4.1 / p17 |
| Bodywork height, max | [1025] mm above reference plane | 4.4.2 / p17 |
| Overall length, max | 5540 mm | 4.4 / p17 |
| Wheelbase | 3070 to 3090 mm | 4.4 / p17 |
| Overhang, max | 1466 mm front, 994 mm rear of wheel centre lines | 4.4 / p17 |
| Min mass with driver | 1046 kg | 5.1 / p20 |
| Driver with seat and equipment, min | 82 kg | 5.1 / p20 |
| Mass on front axle (with driver) | 44 to 46 % | 5.2 / p20 |
| Max power from battery | 600 kW (max 350 rear, max 250 front) | 7.5 / p22 |
| Max power to battery (regen) | 700 kW (max 350 rear, max 350 front) | 7.5 / p23 |
| Max net energy used in the race | 51.25 kWh, or the value in the event note | 7.5 / p23 |
| Max voltage | 1000 V | 7 / p23 |
| Drive | 4 drive shafts; front system drives only front wheels, rear only rear | 9 / p31 |
| Reduction gear ratios | max 6 homologated, one set per car | 9 / p31 |
| Differential | torque vectoring not allowed; active differential and mechanical limited-slip allowed | 9 / p31 |
| Suspension | double wishbone, pushrod, no active suspension | 10 / p32 |
| Brakes | 4 circuits; front and rear axle may not get opposite torque demands from the motors | 11 / p34 |
| Brake cooling | front only | 11 / p35 |
| Rims | 18 inch; width 11.5 inch front, 13 inch rear | 13.5 / p37 |
| Tyres | used as supplied by the single supplier; air only | 13 / p37-38 |
| Aero adjustment | only with tools; no gurneys or trim tabs beyond the supplier specification | 4 / p19 |

Not found in the pages read (12-41 of 79): the 450 kW race level, attack mode, which aero package is allowed in which
session, tyre sizes and pressures. These are probably in the Sporting Regulations, the event notes or the tyre supplier
document. To read next: Technical Regulations pages 42-79 and the Sporting Regulations 2026-27.

### 1.2 Tyres (supplier and press; no regulation number yet)

| Item | Value | Source |
|---|---|---|
| Supplier | Bridgestone, sole supplier from 2026-27 | racingnews365 (tyre launch); theevreport |
| Standard tyre | "Potenza Gen4": grooved all-weather tyre for dry and light rain | theevreport; The Race (tender) |
| Heavy-rain tyre | "Potenza Gen4 for Typhoon Tyre": new, for heavy rain and standing water | theevreport; racingnews365 |
| Slick tyre | not planned for races now; talk of 2028 | fenotebook; e-formula.news |
| Grip numbers | none published | - |

Consequence for the wet/dry rule of the dataset: Gen4 has two tyre types, so a wet lap must also record which tyre was
fitted. The timing feed has to be checked for a tyre field at the first event.

### 1.3 Series and manufacturer values (cross-checks only)

| Input | Value | Source |
|---|---|---|
| Race power / qualifying and attack power | 450 kW / 600 kW | fiaformulae.com "GEN4 Unleashed"; Porsche newsroom |
| Aero | two packages: high downforce (qualifying), low drag (race) | fiaformulae.com; Porsche |
| Top speed claim | over 200 mph (series); 208 mph (Bridgestone) | fiaformulae.com; theevreport |
| 0-100 km/h | about 1.8 s | Porsche |
| Mass without driver | 954 kg (Porsche, provisional) | Porsche newsroom |

Conflicts resolved by the regulation: mass = 1046 kg with driver (press: 1012, 1016); width 1800 and height 1025 mm
(series page: 1790 x 1113 mm); race energy 51.25 kWh net (series page: 55 kWh, likely the battery, not the allowance).

Product gap seen on the way: the rules index (`rules_lookup`) holds only the Formula E Financial Rulebook; the Technical
Regulations are parsed for 5 numbers but not indexed for search.

## 2. What is not known (no source yet)

- Drag and downforce of both aero packages (no public number).
- Tyre size, pressure and grip, dry and Typhoon.
- The 450 kW race level and attack mode rules in regulation text; the energy value per event (event notes).
- Front/rear power split the teams use inside the 250/350 kW caps.
- Centre-of-gravity height.

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

- Fixed inputs: the regulation values in section 1.1 (mass, front mass share 45 % mid-range with 44-46 % as bounds, wheelbase 3080 mm mid-range, power caps per axle, regen, race energy). Not fitted.
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
- https://racingnews365.com/bridgestone-unveil-formula-e-tyres-ahead-of-world-championship-return
- https://theevreport.com/bridgestone-formula-e-tires-potenza-gen4
- https://www.the-race.com/formula-e/bridgestone-formula-e-post-f1-snub/
- https://fenotebook.com/2026/07/14/formula-e-eyeing-slick-tyres-for-2028/
- https://e-formula.news/news/formula-e-news/formula-e-news-detail/austin-brands-hatch-zandvoort-confirmed-formula-e-unveils-its-2026-27-gen4-race-calendar-featuring-21-races-94843
- https://fiaformulae.com/en/news/1074658 (calendar, from `scripts/sim/data/track-requests.json`)
