// Pit-to-pit lap counts are timing observations, not proof of full refuelling.
export function extractStints(laps) {
  const ordered = [...laps].sort((a, b) => a.lap - b.lap);
  const completed = []; let current = [];
  for (const lap of ordered) {
    current.push(lap);
    if (lap.pit) { completed.push(current); current = []; }
  }
  const allStints = completed.map(s => s.length), stints = [], heldStints = [];
  // The first segment begins at the start; the unclosed tail ends at the finish.
  for (const [index, segment] of completed.entries()) {
    if (index === 0) continue;
    const previous = completed[index - 1].at(-1).lap;
    const continuous = segment.every((l, i) => Number.isInteger(l.lap) && l.lap === previous + i + 1);
    const green = segment.every(l => ['GF', 'FF'].includes(l.flag));
    if (continuous && green) stints.push(segment.length);
    else heldStints.push({startLap: segment[0].lap, endLap: segment.at(-1).lap,
      reason: !continuous ? 'missing-or-duplicate-lap' : 'non-green-or-unknown-flag'});
  }
  return {stints, allStints, heldStints};
}
