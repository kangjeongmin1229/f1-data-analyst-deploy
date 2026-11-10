"""Measurement-only gear table and distance-weighted, whole-team channel holdout."""
import json,pathlib,hashlib,datetime,statistics,collections,math
root=pathlib.Path.cwd();folder=root/'.cache/night-session/gears';cache=folder/'input'
index=json.loads((cache/'index.json').read_text());assert sorted(r['session_key']for r in index)==[9153,9586,9908,11357]
sha=lambda b:hashlib.sha256(b).hexdigest();inputs={r['file']:sha((cache/'sessions'/r['file']).read_bytes())for r in index}
manifest={'declaredIn':'docs/lapsim-night-session-2026-11-10.md Block 5','createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'inputs':inputs,'sessions':[r['session_key']for r in index]}
# Pin fresh source bytes before any measurement; a repeat must match this snapshot.
pin=folder/'measurement-inputs.json'
if pin.exists():assert json.loads(pin.read_text())['inputs']==inputs,'HARD STOP: gear source hash mismatch'
else:pin.write_text(json.dumps(manifest,indent=2)+'\n')
def ms(s):return datetime.datetime.fromisoformat(s.replace('Z','+00:00')).timestamp()
def median(a):return statistics.median(a) if a else None
def weighted_median(rows):
 a=sorted(rows);half=sum(w for _,w in a)/2;cum=0
 for x,w in a:
  cum+=w
  if cum>=half:return x
 return None
samples=[];ratios=collections.defaultdict(list);rates=[];counts=collections.Counter();by_lap=[]
for ent in index:
 session=json.loads((cache/'sessions'/ent['file']).read_text());assert session['weather'] and all(w[5]==0 for w in session['weather']),'Monza source is not zero-rain'
 for lap in session['laps']:
  start=ms(lap['lap']['date_start']);end=start+lap['lap']['lap_duration'];team=lap['team'];assert team
  raw=[r for r in lap['carData']if start<=ms(r[0])<=end];raw.sort(key=lambda r:ms(r[0]));counts['rawSamples']+=len(raw)
  deltas=[ms(b[0])-ms(a[0])for a,b in zip(raw,raw[1:])if 0<ms(b[0])-ms(a[0])<=1]
  rates.append(dict(year=session['year'],team=team,driver=lap['driver_number'],sessionKey=session['session_key'],samples=len(raw),medianIntervalSec=median(deltas),medianIntervalHz=1/median(deltas)if deltas else None,observedSamplesPerSecond=(len(raw)-1)/(ms(raw[-1][0])-ms(raw[0][0]))if len(raw)>1 else None))
  bad=[r[2]>100 for r in raw];i=0
  while i<len(raw):
   j=i+1
   while j<len(raw) and all(raw[j][k]==raw[i][k]for k in [1,4,5]):j+=1
   if j-i>=4:
    for k in range(i+1,j):bad[k]=True
   i=j
  counts['frozenOrInvalidThrottle']+=sum(bad)
  for i,r in enumerate(raw[:-1]):
   nxt=raw[i+1];dt=ms(nxt[0])-ms(r[0]);speed,gear,rpm=r[1],r[4],r[5]
   if not 0<dt<=1:counts['gapIntervals']+=1;continue
   if bad[i]or bad[i+1]:continue
   if not (isinstance(gear,int)and 1<=gear<=8 and math.isfinite(speed)and speed>=0 and math.isfinite(nxt[1])and nxt[1]>=0):counts['invalidGearOrSpeed']+=1;continue
   distance=(speed+nxt[1])/2/3.6*dt
   samples.append(dict(year=session['year'],team=team,gear=gear,speed=speed,distance=distance))
   stable=i>0 and raw[i-1][4]==gear==nxt[4] and 0<ms(r[0])-ms(raw[i-1][0])<=1 and not bad[i-1]
   if stable and speed>=50 and rpm>=5000 and r[2]>=98 and not r[3]:ratios[(session['year'],team,gear)].append(rpm/speed)
ratio_rows=[]
for year,team in sorted({(r['year'],r['team'])for r in samples}):
 valid={g:median(v)for (y,t,g),v in ratios.items()if y==year and t==team and len(v)>=5};top=max(valid,default=None)
 for gear in range(1,9):
  vals=ratios[(year,team,gear)];value=median(vals)if len(vals)>=5 else None
  ratio_rows.append(dict(year=year,team=team,gear=gear,n=len(vals),rpmPerKph=value,relativeToHighestObservedGear=value/valid[top]if value is not None and top else None,referenceGear=top,absoluteGearboxRatio=None))
folds=[]
for year,team in sorted({(r['year'],r['team'])for r in samples}):
 train=[r for r in samples if r['year']==year and r['team']!=team];test=[r for r in samples if r['year']==year and r['team']==team]
 centres={g:weighted_median([(r['speed'],r['distance'])for r in train if r['gear']==g])for g in sorted({r['gear']for r in train})}
 correct=0;distance=sum(r['distance']for r in test)
 for r in test:
  pred=min(centres,key=lambda g:(abs(r['speed']-centres[g]),g));correct+=r['distance']*(pred==r['gear'])
 folds.append(dict(year=year,hiddenTeam=team,trainingTeams=sorted({r['team']for r in train}),testSamples=len(test),distanceM=distance,correctDistanceM=correct,accuracyPct=100*correct/distance,trainingGearMedianKph=centres))
years=[]
for year in sorted({r['year']for r in folds}):
 f=[r for r in folds if r['year']==year];rr=[r for r in rates if r['year']==year];years.append(dict(year=year,teams=len(f),laps=len(rr),samples=sum(r['samples']for r in rr),medianIntervalSec=median([r['medianIntervalSec']for r in rr]),medianIntervalHz=median([r['medianIntervalHz']for r in rr]),observedSamplesPerSecond=median([r['observedSamplesPerSecond']for r in rr]),distanceM=sum(r['distanceM']for r in f),accuracyPct=100*sum(r['correctDistanceM']for r in f)/sum(r['distanceM']for r in f)))
result={'scope':'Monza qualifying, every ranked driver with a selected timed lap; 2023–2026. Same circuit; no cross-track accuracy claim.','inputHashes':inputs,'method':'Stable-gear median RPM/road-speed; ratios relative to highest sufficiently sampled gear. Whole-team/year gear-channel holdout; nearest training gear distance-weighted median speed. No RPM used by predictor.','sampleDefinition':'Ratio samples require same gear before/current/after, valid adjacent intervals, speed >=50 km/h, RPM >=5000, throttle >=98%, no brake, and existing frozen-telemetry exclusions.','excluded':dict(counts),'years':years,'ratios':ratio_rows,'folds':folds,'sampling':rates,'absoluteRatioLimitation':'Loaded tyre radius and final-drive ratio were not verified. RPM/speed is an effective overall ratio including wheel radius, final drive and slip, not an absolute gearbox ratio.','productionChanges':False}
(folder/'results.json').write_text(json.dumps(result,indent=2)+'\n')
# Compact derived table is suitable for review. Raw samples remain outside git.
pathlib.Path('scripts/sim/data/f1-gear-measurements.json').write_text(json.dumps({'schemaVersion':1,'scope':result['scope'],'sources':[{'sessionKey':r['session_key'],'year':r['year'],'url':f"https://api.openf1.org/v1/car_data?session_key={r['session_key']}",'sessionSha256':inputs[r['file']]}for r in index],'method':result['method'],'absoluteRatioLimitation':result['absoluteRatioLimitation'],'years':years,'ratios':ratio_rows,'folds':folds},separators=(',',':'))+'\n')
lines=['# F1 gear measurements — 2026-11-10','','These measurements use Monza qualifying only. Each team-season keeps its own table. The hidden-team predictor uses speed alone; RPM is used only to measure effective ratios. No kernel or production model changed.','','| Season | Teams | Laps | Raw samples | Median sample spacing, s | Equivalent median Hz | Observed samples/s | Hidden-team distance, km | Correct gear distance, % |','|---|---:|---:|---:|---:|---:|---:|---:|---:|']
for r in years:lines.append(f"| {r['year']} | {r['teams']} | {r['laps']} | {r['samples']} | {r['medianIntervalSec']:.3f} | {r['medianIntervalHz']:.3f} | {r['observedSamplesPerSecond']:.3f} | {r['distanceM']/1000:.3f} | {r['accuracyPct']:.3f} |")
lines+=['','The source calls these car-data samples, not raw ECU telemetry. The timestamp rate is measured above; gaps and frozen samples are counted in the experiment report. This accuracy is a whole-team channel test at one circuit. It is not a test on an unseen circuit.','','Absolute gearbox ratios remain empty: loaded tyre radius and final drive were not verified. The reported RPM per km/h includes both, as well as tyre slip. Relative ratios divide by the highest gear with enough valid samples. A blank ratio means too few samples.','','| Season | Team | Gear | Valid ratio samples | RPM per km/h | Relative ratio | Reference gear |','|---|---|---:|---:|---:|---:|---:|']
for r in ratio_rows:lines.append(f"| {r['year']} | {r['team']} | {r['gear']} | {r['n']} | {'' if r['rpmPerKph']is None else format(r['rpmPerKph'],'.4f')} | {'' if r['relativeToHighestObservedGear']is None else format(r['relativeToHighestObservedGear'],'.4f')} | {r['referenceGear']or ''} |")
lines+=['','Derived values, source URLs, source hashes and every hidden-team fold are in `scripts/sim/data/f1-gear-measurements.json`. Raw OpenF1 responses are not committed.']
pathlib.Path('docs/lapsim-f1-gears-2026-11-10.md').write_text('\n'.join(lines)+'\n');print(json.dumps(years,indent=2))
