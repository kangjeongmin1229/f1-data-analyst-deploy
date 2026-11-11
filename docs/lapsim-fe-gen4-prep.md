# Formula E Gen4 - modelling preparation (2026-11-11)

Status: preparation only. No car values are fitted, nothing in production changes. Product entry stays `coming-soon`
(`worker/lapsim/series.js`, key `fe`).

## 1. Inputs with a source

### 1.1 Regulation (FIA Formula E Technical Regulations 2026-2027 V4, WMSC 30.09.2026, pages 12-79; Sporting Regulations 2026-2027, published 30.09.2026; read on 2026-11-11)

Numbers in square brackets are printed that way in the regulation (still provisional there).
Rows without a prefix are Technical Regulations (TR). SR = Sporting Regulations; SR page = page of the PDF (same as the printed page for pages 15-40).
"Bulletin" = the value is not in the regulation; the FIA or the Stewards publish it for each event.

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
| Ballast | allowed; on the keel under the survival cell (other place only if on the homologation form) | 5.3 / p20 |
| Max power from battery | 600 kW (max 350 rear, max 250 front) | 7.5 / p22 |
| Max power to battery (regen) | 700 kW (max 350 rear, max 350 front) | 7.5 / p23 |
| Max net energy used in the race | 51.25 kWh, or the value in the event note | 7.5 / p23 |
| Added net energy by fast charging (Pit Boost) in the race | [4.05 max TBC] kWh | 7.5 / p23 |
| DC-DC power taken off the RESS power count | up to 3.0 kW (1.2 kW under red flag, Full Course Yellow or safety car); energy limit 1.2 kWh, more is added to the net energy used | 7.5 / p23 |
| Max voltage | 1000 V | 7 / p23 |
| Drive | 4 drive shafts; front system drives only front wheels, rear only rear | 9 / p31 |
| Reduction gear ratios | max 6 homologated, one set per car | 9 / p31 |
| Differential | torque vectoring not allowed; active differential and mechanical limited-slip allowed | 9 / p31 |
| Suspension | double wishbone, pushrod, no active suspension | 10 / p32 |
| Camber range | between 0° and -4.0° front, between 0° and -3.0° rear (by instruction of the tyre supplier) | 10.9 / p33 |
| Turning radius | minimum turning radius must not exceed 10 m | 10.7 / p33 |
| Brakes | 4 circuits; front and rear axle may not get opposite torque demands from the motors | 11 / p34 |
| Brake cooling | front only | 11 / p35 |
| Rims | 18 inch; width 11.5 inch front, 13 inch rear | 13.5 / p37 |
| Tyre sectional width | 295 mm front, 345 mm rear | 13.8 / p37 |
| Tyre overall diameter | 710 mm front, 710 mm rear | 13.8 / p37 |
| Tyres | used as supplied by the single supplier; air only | 13 / p37-38 |
| Aero adjustment | only with tools; no gurneys or trim tabs beyond the supplier specification | 4 / p19 |
| Aero configurations (definition) | only 2 configurations may be used: LDF (low downforce) = reference bodywork of the supplier catalogue; HDF (high downforce) = made by adding or replacing bodywork parts of the reference | TR 4.5, 4.5.1, 4.5.2 / p17 (full page read) |
| Aero: free practice | choice of the Competitor, HDF or LDF | SR 22.3 / p28 |
| Aero: qualifying | defined by the FIA at least 21 days before the event; in a Bulletin | SR 23.1 / p29 |
| Aero: race | defined by the FIA at least 21 days before the event; in a Bulletin; mandatory | SR 27.3 a) / p37 |
| Race Mode power | maximum 450kW in all cases; the value for each race (may include a speed / maximum power schedule) is announced at least 21 days before; schedule in a Bulletin | SR 27.3 b) / p37 |
| Attack Mode power | Race Mode power plus 150kW | SR 27.3 d) / p37 |
| Attack Mode time and number of uses | no number in the regulation: time is in a Bulletin for each event; the defined number of activations is mandatory, using all the time is not | SR 27.4 / p37 |
| Attack Mode limits | not in the Driver's first 2 laps; not under Full Course Yellow or Safety Car; not before the Line after a Safety Car; not when the Attack Zone is under yellow; timer may be frozen in a neutralisation | SR 27.4 b)-f) / p37 |
| Standing start power | 600 kW allowed; must end when front or rear powertrain power goes under 5kW and the car is over 110 kph | SR 26.20 / p36 |
| Regeneration in the race | 700 kW (350 kW front 350 kW rear) - same as TR 7.5 | SR 27.3 c) / p37 |
| Qualifying power | all laps at 600kW maximum power level, Groups and Duels | SR 23.5, 23.6 / p30 |
| Free practice | 2 sessions of 45 minutes; maximum 600kW; first 30 minutes maximum 450kW | SR 22.2, 22.3 / p28 |
| Shakedown | 10 minutes, maximum 3 laps, power limited to 350kW | SR 22.1 b) / p28 |
| Reconnaissance lap; pit lane | 450kW; pit lane speed limit 50 km/h | SR 26.1 / p33; 13.17 / p15; 20.14 / p26 |
| Qualifying format: Groups | Group A and Group B, maximum 12 cars each, 10 minutes each, no lap limit; fastest four of each Group go to the Duels | SR 23.1, 23.5 / p29-30 |
| Qualifying format: Duels | Quarter-finals, Semi-finals, Final; each Driver: out lap, timed lap, in lap; out and in lap maximum 120% of the fastest Group lap | SR 23.6, 23.7 / p30 |
| Qualifying: charging and tyres | 5 minutes charging between Group and Duels; tyre change allowed with a minimum time (Bulletin) until the car is eliminated | SR 23.2, 23.5 / p29-30 |
| Qualifying 110% rule | best lap over 110% of the fastest time of the Group = no race start (not if the track was declared wet) | SR 25.3 / p32 |
| Tyre allocation, 1-race event | no more than 2 sets of All-Weather tyres and 1 set of Wet tyres per race number | SR 15.6 / p18 |
| Tyre allocation, 2-race event | no more than 3 sets of All-Weather tyres and 1 set of Wet tyres; the Wet set may be replaced by a new set after race 1 if a session was declared "Wet Track" before the end of race 1 | SR 15.6 / p18 |
| Joker tyres | 2 front and 2 rear All-Weather per car number per season; 2 front and 2 rear "Typhoon tyres" per car per competition; only after a puncture or damage | SR 15.11 / p18 |
| Typhoon (Wet) tyre use | only from the moment the Race Director declares "Wet Track"; then Wet or All-Weather is the Competitor's choice until the end of that session; no mixing on one car | SR 15.7 / p18 |
| Tyre pressure and camber | no number in the regulation: working ranges come from the tyre supplier before the end of initial scrutineering; pressures and temperatures are monitored; pressure may be adjusted in Parc Ferme after a "Wet Track" message | SR 15.8, 15.9 / p18 |
| Tyre heating | no heating, cooling or covers | SR 15.3, 15.4, 15.16 / p17-19 |
| Race energy | Maximum Net Energy as in the Stewards' Bulletin of each event (with Pit Boost: plus the selected quantity rule); at the limit, power must go to zero (0) kW | SR 27.8 / p39 (TR 7.5: 51.25 kWh or the event value) |
| Minimum Energy Consumption (MEC) | may be published for specific races; a lap below the MEC counts as the MEC; not on lap 1, last lap, FCY / Safety Car laps, "Wet Track", pit lane laps | SR 27.9 / p39 |
| Pit-lane start energy offset | +X kWh, value in a Bulletin | SR 26.3 / p33 |
| Pit Boost | mandatory only in races named by the FIA at least 21 days before; one stop; the Bulletin gives a table of energy quantities (kWh), each with a minimum stop time, and the SoC window; no tyre change before it is finished | SR 27.5-27.7 / p38-39 |
| Race distance | number of laps published by the FIA twenty-one (21) days before each event; maximum 7 "Added Laps" for FCY / Safety Car time | SR 2.6 / p2 (full page read); 27.2 / p36 |
| Race time cap | Performance Race ("e-Prix Unleashed"): sixty (60) minutes, with a suspension up to ninety (90) minutes plus one lap; Efficiency Race ("e-Prix"): seventy-five (75) minutes, with a suspension up to three (3) hours plus one lap | SR 2.6 a), b) / p2-3 |
| Event format | 1 race: 2 days (Shakedown and Free Practice; then Free Practice, Qualifying, Race); 2 races: 3 days (Shakedown; then two days of Free Practice, Qualifying, Race) | SR 2.5 / p2 |
| Attack Mode activations and time split (Appendix 4) | "Maximum 2 activations during the race (Unfreeze activations not included)"; time split scenario 1 to 3 chosen by the driver on the steering wheel: 2 + 6min, 4 + 4min, 6 + 2min; choice frozen at the first successful activation; ignored in a race with a maximum of 1 activation; free practice: unlimited armings and activations | SR Appendix 4 / PDF p76 - REBUILT from the positions of the rotated diagram text, not seen by eye; check before use |

Technical Regulations pages 42-79 hold no model input: safety equipment and structures (Articles 14-16), materials (17),
safety tests, cameras and transponders (18-19), drawings 1-13 (pages 57-73) and the rear suspension appendix (74-79).

Second check on 2026-11-11 (full page reads of TR p17, p20-24, p33-37 and SR p2-3): the first read of TR pages 12-41 had
missed four values that are printed there - tyre width and diameter (13.8), camber range (10.9), the fast-charging
energy (7.5) and the DC-DC rule (7.5). They are now in the table. Pages 25-32 and 38-41 were not read again.

Still not in either regulation (see section 2): tyre pressure numbers; Attack Mode total time; the energy value, Pit Boost
table and aero configuration of each event. Sporting Regulations Appendix 4 (Attack Mode, PDF page 76) is a rotated diagram.
The text reader returns it scrambled; the row above was rebuilt by sorting the words by their position. fia.com could not
be opened in the browser or the shell, so the diagram itself was not seen.

Derived checks (arithmetic only on the rows above; not new inputs):

| Check | Result |
|---|---|
| Rim diameter 18 inch | 457.2 mm |
| Tyre sidewall height, (710 - 457.2) / 2 | 126.4 mm, front and rear |
| Unloaded tyre radius, 710 / 2 | 355 mm, front and rear (loaded radius is not known) |
| Rim width 11.5 / 13 inch | 292.1 mm / 330.2 mm |
| 51.25 kWh over the 75 minute cap / over 45 minutes | 41 kW / 68 kW average net power (Race Mode limit is 450kW) |
| 51.25 kWh at a constant 450kW | 410 s of full power |
| [4.05 max TBC] kWh as a share of 51.25 kWh | 7.9 % |

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
| Race formats (plan of the series) | E-PrixUnleashed: high downforce, 6-minute Attack Mode, no Pit Boost. E-Prix: low downforce, 8-minute Attack Mode, mandatory Pit Boost. E-Prix runs at every event; double-headers run both | fiaformulae.com (format explainer; "What is Formula E?") |
| Qualifying aero (plan) | high downforce planned for qualifying; teams asked for low downforce qualifying on E-Prix days, still under discussion in 06.2026 | Motorsport Week 23.06.2026 (P. Martino, Formula E) |
| Aero per event | "confirmed 21 days before the race" | fia.com WMSC news 06.2026 |
| Downforce | "up to 150 percent more downforce compared to the GEN3 Evo" (high-downforce package); no absolute number | Porsche newsroom |
| Drag targets of the 2023 FIA tender | SCx 0.65 low downforce, 0.75 high downforce - tender target reported on a forum, not a measured value; do not use as input | forums.autosport.com |
| Lap time claim | about 10 seconds per lap faster than Gen3 in qualifying mode; 0-200 km/h in 4.4 s; top speed 335 km/h | fiaformulae.com |
| Jeddah, first event | 18 and 19 December 2026, double-header, night races; 3.001 km, 19 turns | Saudi Press Agency 20.09.2026; fiaformulae.com |

Conflicts resolved by the regulation: mass = 1046 kg with driver (press: 1012, 1016); width 1800 and height 1025 mm
(series page: 1790 x 1113 mm); race energy 51.25 kWh net (series page: 55 kWh, likely the battery, not the allowance).

Conflicts found on 2026-11-11 (the regulation is used):

| Item | Series / manufacturer pages | Regulation |
|---|---|---|
| Rear tyre width | 330 mm (fiaformulae.com "GEN4 Unleashed"; Wikipedia) | 345 mm sectional width (TR 13.8). Note: the rear rim is 13 inch = 330.2 mm, which may be where 330 comes from. e-formula.news (06.2025) also reports 345 mm |
| Race length | 30-minute E-PrixUnleashed, 45-minute E-Prix (fiaformulae.com) | a number of laps, published 21 days before; time caps 60 and 75 minutes (SR 2.6) |
| Pit Boost | 10 % (3.85kWh) in 30 seconds at 600kW; SoC window 40 % to 60 % (fiaformulae.com pages, written for Season 12; TotalEnergies repeats 3.85 kWh for Gen4) | [4.05 max TBC] kWh maximum (TR 7.5); a table of selectable energy quantities with stop times, and the SoC window, in the event Bulletin (SR 27.6, 27.7) |
| Aero by session | high downforce in qualifying, low drag in the race | not fixed: the FIA defines the configuration for qualifying and for the race of each event, at least 21 days before (SR 23.1, 27.3 a)); free practice is free choice (SR 22.3) |
| Race power | 450 kW | maximum 450kW; the Race Mode value of each race is set by the FIA and may be lower or follow a speed schedule (SR 27.3 b)) |
| Attack power | 600 kW | Race Mode power plus 150kW (SR 27.3 d)); equal to 600 kW only when Race Mode is 450kW |

Product gap seen on the way (first read): the rules index (`rules_lookup`) held only the Formula E Financial Rulebook.
On the second read (2026-11-11) the index returns Technical, Sporting and General Provisions articles with page numbers.
Open gap: Sporting Regulations Appendix 4 (Attack Mode diagram) is indexed as scrambled text.

## 2. What is not known (no source yet)

Solved on 2026-11-11 and moved to section 1.1: the 450kW Race Mode limit, the Attack Mode power rule, power by session,
the qualifying format, tyre allocation, when the Typhoon tyre may be used, the race energy and Pit Boost rules,
tyre width and diameter, the camber range, the maximum fast-charging energy, the race time caps.

Still open, no number in any regulation read:

- Drag and downforce of both aero packages. Web search found only a relative claim and an old tender target (section 1.3).
- Tyre grip, All-Weather and Typhoon; loaded tyre radius. Web search (Bridgestone press release, series pages, press) gives no number.
- Tyre pressure numbers: supplier working ranges, given to the teams at each event (SR 15.8). Not public.
- Front/rear power split the teams use inside the 250/350 kW caps.
- Centre-of-gravity height (the regulation only says where ballast goes: on the keel).
- Sporting Regulations Appendix 4 by eye: the diagram on PDF page 76 must be opened by a person to confirm the rebuilt row.

Searched on 2026-11-11 with no result: tyre pressure, grip, centre of gravity, power split, drag or downforce numbers,
Gen4 test lap times (the Valencia results found are the Gen3 Evo test of October 2025), any Jeddah Bulletin.
The Jeddah values are due 21 days before the race, about 27 November 2026.

Still open, published per event in a Bulletin (collect before each race, first one Jeddah):

- Aero configuration for qualifying and for the race (SR 23.1, 27.3 a)).
- Race Mode power and any speed / power schedule (SR 27.3 b)).
- Attack Mode total time and number of mandatory activations (SR 27.4, Appendix 4). Series plan: 6 minutes / 8 minutes (section 1.3).
- Maximum Net Energy, MEC, pit-lane start energy offset (SR 27.8, 27.9, 26.3).
- Whether Pit Boost is mandatory; its energy quantities, minimum stop times and SoC window (SR 27.5-27.7).
- Race distance and the reference lap time for Added Laps (SR 2.6, 27.2).
- Minimum tyre change time in qualifying (SR 23.2).

These must come from the event Bulletins, from timing data once the cars race, or from a regulation article. They are not to be guessed.

## 3. Simulator readiness

| Need | In kernel today | Gap |
|---|---|---|
| All-wheel drive traction | `awdAboveKph` switch exists (F1/Gen3-style part-time) | permanent AWD with a power cap per axle (250 front / 350 rear) |
| Regeneration | `regenMax`, regen share exist | 700 kW limit on both axles; brake blending front/rear |
| Two aero packages | one car value set per session type | select package by session from the event Bulletin (HDF or LDF; not fixed by the regulation) |
| Power levels | power is one value | Race Mode per event (maximum 450kW), Attack Mode = Race Mode plus 150kW, 600kW qualifying |
| Energy-limited race pace | F1 energy logic exists (`energy-limits.js`, `stint-energy.js`) | Formula E race allowance, lift-and-coast, attack mode time |

Each gap is a model change: draft PR, production baseline in the same run, no merge without the gate.

## 4. Tracks (season 2026-27, 13 venues, 21 races, first race Jeddah 18 December 2026)

| Venue | Track in simulator | Note |
|---|---|---|
| Jeddah, Mexico City, Austin, Miami, Monaco, Zandvoort, Shanghai | F1 layout exists | Formula E layout not confirmed; separate id until confirmed. Jeddah: reported as 3.001 km, 19 turns (Saudi Press Agency), so it is not the full F1 layout |
| Brands Hatch | map/TUM candidate (warning mark) | layout not confirmed |
| Jarama, Sao Paulo (street), Sanya, Berlin, Tokyo | none accepted | see programme document section 9 |

Section 13 of the programme document applies: map-built tracks are about 5 % off, so they cannot be used to fit Gen4 values.

## 5. Data plan

1. Before the first race: no Gen4 race laps exist. Only test reports. Nothing to fit.
2. Gen3 Evo laps (Timing71 Formula E sessions already in the all-laps dataset) give the class a starting point for
   tyre-independent items only (track factors on shared venues). Gen4 has new tyres, aero and drive, so car values do not carry over.
3. From Jeddah on: collect every session with the all-laps builder (same marks). Qualifying laps (600kW) and race laps
   (Race Mode, energy-limited) are different cars for the fit and stay in separate groups. Record the aero configuration
   of each session from the event Bulletin; free practice laps have no known configuration (Competitor's choice).
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
  https://www.fia.com/system/files/documents/2026-2027_season_13_formula_e_techregs_wmsc_30.09.2026_eng_fr_v21.pdf
- FIA Formula E Sporting Regulations 2026-2027, published 30.09.2026 (77 PDF pages)
  https://www.fia.com/system/files/documents/2026-2027_fia_formula_e_world_championship_-_sporting_regulations_30.09.2026_-_clean_2.pdf
- https://www.fiaformulae.com/en/formula-e-gen4-unleashed
- https://www.fiaformulae.com/en/news/explainers/explained-formula-es-new-sporting-format-for-the-202627-season
- https://www.fiaformulae.com/en/what-is-formula-e
- https://www.fiaformulae.com/en/news/872603/everything-you-need-to-know-about-pit-boost-in-formula-e
- https://www.fia.com/news/building-stronger-future-fia-championships-updated-regulations-approved-world-motor-sport
- https://www.motorsportweek.com/2026/06/23/f1-classics-on-formula-e-calendar/
- https://e-formula.news/news/formula-e-news/formula-e-news-detail/freedom-for-manufacturers-pit-boost-remains-technical-regulations-for-formula-e-gen4-car-published-71621
- https://competition.totalenergies.com/en/auto/formula-e/formula-e-rules
- https://forums.autosport.com/topic/224023-fia-launches-tenders-for-formula-e-gen4/
- https://www.spa.gov.sa/en/N2680740
- https://www.bridgestone.com/corporate/news/2026100101.html
- https://newsroom.porsche.com/en_US/2026/motorsport/porsche-975-rse-formula-e-gen4-presentation-42191.html
- https://theevreport.com/nissan-formula-e-gen4-car-power
- https://en.wikipedia.org/wiki/Formula_E_Gen4
- https://racingnews365.com/bridgestone-unveil-formula-e-tyres-ahead-of-world-championship-return
- https://theevreport.com/bridgestone-formula-e-tires-potenza-gen4
- https://www.the-race.com/formula-e/bridgestone-formula-e-post-f1-snub/
- https://fenotebook.com/2026/07/14/formula-e-eyeing-slick-tyres-for-2028/
- https://e-formula.news/news/formula-e-news/formula-e-news-detail/austin-brands-hatch-zandvoort-confirmed-formula-e-unveils-its-2026-27-gen4-race-calendar-featuring-21-races-94843
- https://fiaformulae.com/en/news/1074658 (calendar, from `scripts/sim/data/track-requests.json`)
