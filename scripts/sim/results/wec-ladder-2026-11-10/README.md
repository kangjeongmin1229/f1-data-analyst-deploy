# WEC baseline ladder and geometry evidence

No rung converged under the declared all-group <0.02 pp / no-choice-flip rule. No values are adopted. b2 is not re-judged.

Read docs/lapsim-handoff-physics.md section 17 for the complete tables, the geometry-guard requirement conflict, the conditional re-baseline plan, and open questions.

The 70/25 and 140/50 outputs are reused from ../wec-sectors-2026-11-10/. New rungs and the identity check are saved here. Objective histories preserve every logged iteration and final vector, with constant metadata stored once per start. All starts have restart: 0; no optimizer restarts were added.

Raw third-party weather responses and position data are not committed. Derived weather counts and SHA-256 hashes are included with source URLs.

Commands: node scripts/sim/run-wec-ladder.mjs; node scripts/sim/report-wec-ladder.mjs; node scripts/sim/archive-wec-ladder.mjs. Run in an isolated snapshot with the prior pinned experiment inputs. The runner refuses an existing run directory.
