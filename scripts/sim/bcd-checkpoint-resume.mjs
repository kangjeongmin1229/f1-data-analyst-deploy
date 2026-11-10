// Experiment runner only. The production fitter never imports this module.
import {readFile, writeFile, rename, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const hash = value => createHash('sha256').update(value).digest('hex');
export function checkpointFitter(fit, converged, directory, trustedLegacy = {}) {
  let sequence = 0;
  return async (groups, options) => {
    assert.equal(options.convergence, true, 'Checkpoint runner requires the declared convergence rule');
    const number = ++sequence, file = join(directory, `fit-${number}.json`);
    const {log, convergenceDir, workers, ...settings} = options;
    const inputHash = hash(JSON.stringify({groups, settings}));
    const inventory = groups.map(g => ({key: g.key, laps: g.laps.length}));
    let state = null;
    try {
      const bytes = await readFile(file);
      state = JSON.parse(bytes);
      if (state.inputHash) assert.equal(state.inputHash, inputHash, 'HARD STOP: fit input hash mismatch');
      else assert.equal(hash(bytes), trustedLegacy[`fit-${number}.json`], 'HARD STOP: unverified legacy checkpoint');
      assert.deepEqual(state.groups, inventory, 'HARD STOP: checkpoint training inventory mismatch');
      assert.equal(state.converged, converged(state.scores));
      assert.ok(state.scores.length <= 10 && state.scores.every(Number.isFinite));
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const scores = state?.scores.slice() || [];
    let result;
    if (state?.converged) {
      log?.(`reuse fit ${number}: ${scores.length} completed rounds`);
      result = await fit(groups, {...options, convergence: false, rounds: 0, log: undefined,
        startX: state.xs, startFactors: state.factors, startAdj: state.adj});
      result.score = scores.at(-1);
      return result;
    }
    if (scores.length === 10) throw Error(`BCD convergence cap already reached: fit ${number}`);
    await mkdir(directory, {recursive: true});
    for (let round = scores.length + 1; round <= 10; round++) {
      result = await fit(groups, {...options, convergence: false, rounds: 1, log: undefined,
        ...(state ? {startX: state.xs, startFactors: state.factors, startAdj: state.adj} : {})});
      scores.push(result.score);
      state = {groups: inventory, inputHash, scores, converged: converged(scores),
        capHit: round === 10 && !converged(scores), xs: result.xs, factors: result.factors, adj: result.adj};
      await writeFile(file + '.tmp', JSON.stringify(state, null, 2) + '\n');
      await rename(file + '.tmp', file);
      log?.(`fit ${number} round ${round}: score ${result.score.toFixed(6)}; converged=${state.converged}`);
      if (state.converged) return result;
    }
    throw Error(`BCD convergence cap reached: fit ${number}`);
  };
}
