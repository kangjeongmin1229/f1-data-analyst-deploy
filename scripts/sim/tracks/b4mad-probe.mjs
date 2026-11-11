// Probe of the B4mad Racing community telemetry database (github.com/b4mad/racing, GPL-3.0 project; laps recorded by sim racers
// through CrewChief and published for analysis). The project's README gives a read-only token for this purpose; it is read from
// that README at run time and not stored here. This step only asks what exists: games, tracks, and whether car positions are stored.
// Owner rule (2026-11-11): a sim other than iRacing is allowed as a TRACK GEOMETRY source when it is a verified, laser-scanned track.
import {mkdirSync, writeFileSync} from 'node:fs';
const OUT = '.cache/lapsim/osm'; mkdirSync(OUT, {recursive: true});
const out = {source: 'B4mad Racing community telemetry (telemetry.b4mad.racing), read-only', probed: new Date().toISOString()};
try {
  const readme = await (await fetch('https://raw.githubusercontent.com/b4mad/racing/main/README.md')).text();
  const m = readme.match(/-u (https:\/\/\S+) -t "([^"]+)" -o (\S+)/); if (!m) throw new Error('no reader config in the project README');
  const [, url, token, org] = m; out.readmeOk = true; out.host = new URL(url).host;
  const q = async flux => { const r = await fetch(`${url}/api/v2/query?org=${org}`, {method: 'POST', signal: AbortSignal.timeout(120000), headers: {authorization: `Token ${token}`, 'content-type': 'application/vnd.flux', accept: 'application/csv'}, body: flux}); if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`); return (await r.text()).split('\n').filter(l => l && !l.startsWith('#')); };
  const vals = async (tag, pred = 'true') => (await q(`import "influxdata/influxdb/schema"\nschema.tagValues(bucket: "racing", tag: "${tag}", predicate: (r) => ${pred}, start: -10y)`)).slice(1).map(l => l.split(',').pop().trim()).filter(Boolean);
  out.buckets = (await q('buckets()')).slice(1).map(l => l.split(',').slice(-5).join(',')).slice(0, 10);
  out.games = await vals('GameName');
  out.tracksByGame = {}; for (const g of out.games.slice(0, 12)) { try { out.tracksByGame[g] = await vals('TrackCode', `r.GameName == "${g}"`); } catch (e) { out.tracksByGame[g] = 'error: ' + String(e).slice(0, 120); } }
  out.fields = (await q('import "influxdata/influxdb/schema"\nschema.fieldKeys(bucket: "racing", start: -10y)')).slice(1).map(l => l.split(',').pop().trim());
  out.measurements = (await q('import "influxdata/influxdb/schema"\nschema.measurements(bucket: "racing", start: -10y)')).slice(1).map(l => l.split(',').pop().trim());
} catch (e) { out.error = (String(e) + ' | ' + String(e.cause?.code || e.cause || '')).slice(0, 300); }
writeFileSync(`${OUT}/b4mad-probe.json`, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out).slice(0, 1500));
