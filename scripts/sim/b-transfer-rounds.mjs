// Experiment-only B continuation. The production fitter and its defaults are unchanged.
import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fitJointBCD} from './joint-bcd.mjs';

export const scoreDecreasePct = (previous, current) => 100 * (previous - current) / previous;
export const bConverged = scores => scores.length >= 5 && scoreDecreasePct(scores.at(-2), scores.at(-1)) >= 0 && scoreDecreasePct(scores.at(-2), scores.at(-1)) < 1;
export const badTracks = fit => [...new Set(fit.perLap.filter(p => Math.abs(p.dt / p.realLap) > 0.04).map(p => `${p.group} ${p.name}`))].sort();
export function transferCalibration(fit) {
  const seasons = {};
  for (const p of fit.perLap) {
    const s = seasons[p.group] ||= {tracks: {}};
    s.tracks[p.name] = {grip: +p.grip.toFixed(4)};
  }
  return {seasons};
}
export async function fitBTransferRounds(groups, options, directory) {
  await mkdir(directory, {recursive: true});
  const scores = [], rounds = [];
  let fit, round5;
  for (let round = 1; round <= 10; round++) {
    // Existing warm-start API preserves all three fitted blocks between rounds.
    fit = await fitJointBCD(groups, {...options, rounds: 1, log: undefined,
      ...(fit ? {startX: fit.xs, startFactors: fit.factors, startAdj: fit.adj} : {})});
    scores.push(fit.score);
    rounds.push({round, score: fit.score, decreasePct: round > 1 ? scoreDecreasePct(scores.at(-2), fit.score) : null,
      interlagosGrip: fit.grips.interlagos});
    await writeFile(join(directory, `round-${round}.json`), JSON.stringify(fit));
    await writeFile(join(directory, 'rounds.json'), JSON.stringify(rounds, null, 2) + '\n');
    console.log(JSON.stringify({phase: directory, ...rounds.at(-1)}));
    if (round === 5) round5 = fit;
    if (bConverged(scores)) return {fit, round5, rounds};
  }
  throw new Error(`STOP: B main fit did not converge by round 10 (${directory})`);
}
