"""Read saved normalized Monza inputs; distance-weighted gear errors, no kernel changes.
Run from an isolated copy of the original gear measurement workspace.
"""
import pathlib,json,runpy,sys,math,collections,statistics
source=pathlib.Path(sys.argv[1]);out=pathlib.Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
ns=runpy.run_path(str(source)); root=pathlib.Path.cwd(); cache=root/'.cache/night-session/gears/input'
index=ns['index']; ms=ns['ms']; allrows=[]; shifts=[]
for ent in index:
 session=json.loads((cache/'sessions'/ent['file']).read_text())
 for lap in session['laps']:
  start=ms(lap['lap']['date_start']);end=start+lap['lap']['lap_duration'];team=lap['team'];year=session['year']
  raw=sorted([r for r in lap['carData'] if start<=ms(r[0])<=end],key=lambda r:ms(r[0]));bad=[r[2]>100 for r in raw];i=0
  while i<len(raw):
   j=i+1
   while j<len(raw) and all(raw[j][k]==raw[i][k] for k in [1,4,5]):j+=1
   if j-i>=4:
    for k in range(i+1,j):bad[k]=True
   i=j
  shift_times=[]
  for i,(a,b) in enumerate(zip(raw,raw[1:])):
   if 0<ms(b[0])-ms(a[0])<=1 and not bad[i] and not bad[i+1] and b[4]==a[4]+1:
    z={'year':year,'team':team,'gear':a[4],'rpm':a[5],'time':ms(a[0]),'speed':a[1]};shifts.append(z);shift_times.append(z)
  dist=0
  for i,r in enumerate(raw[:-1]):
   nxt=raw[i+1];dt=ms(nxt[0])-ms(r[0]);speed,gear,rpm=r[1],r[4],r[5]
   distance=(speed+nxt[1])/2/3.6*dt if 0<dt<=1 else 0;position=dist;dist+=distance
   if not 0<dt<=1 or bad[i] or bad[i+1]:continue
   if not(isinstance(gear,int) and 1<=gear<=8 and math.isfinite(speed) and speed>=0 and math.isfinite(nxt[1]) and nxt[1]>=0):continue
   accel=(nxt[1]-speed)/3.6/dt
   phase='braking / corner entry' if r[3] else 'high-speed straight' if speed>=250 else 'acceleration / corner exit' if accel>0.5 and r[2]>=50 else 'corner / coast / other'
   allrows.append(dict(year=year,team=team,gear=gear,speed=speed,distance=distance,phase=phase,segment100m=int(position//100),time=ms(r[0]),shiftTimes=shift_times))
assert len(allrows)==len(ns['samples'])
for a,b in zip(allrows,ns['samples']):assert all(a[k]==b[k] for k in b)
centres={(f['year'],f['hiddenTeam']):f['trainingGearMedianKph'] for f in ns['folds']}
shiftmed={}
for s in shifts:
 key=(s['year'],s['team'],s['gear']);values=[z['rpm'] for z in shifts if (z['year'],z['team'],z['gear'])==key and z['rpm']>0]
 if len(values)>=3:shiftmed[key]=statistics.median(values)
def accum(groups,key,r,pred):
 g=groups.setdefault(key,dict(distanceM=0,errorDistanceM=0,predictedTooHighM=0,predictedTooLowM=0,samples=0));g['distanceM']+=r['distance'];g['errorDistanceM']+=r['distance']*(pred!=r['gear']);g['predictedTooHighM']+=r['distance']*(pred>r['gear']);g['predictedTooLowM']+=r['distance']*(pred<r['gear']);g['samples']+=1
phase={};segments={};transitions={}
for r in allrows:
 c=centres[r['year'],r['team']];pred=min(c,key=lambda g:(abs(r['speed']-c[g]),g))
 accum(phase,(r['year'],r['phase']),r,pred);accum(segments,(r['year'],r['segment100m']),r,pred)
 near=[s for s in r['shiftTimes'] if abs(s['time']-r['time'])<=0.75]
 short=[s for s in near if s['speed']>=250 and s['rpm']<0.9*shiftmed.get((s['year'],s['team'],s['gear']),0)]
 label='near low-RPM straight upshift proxy' if short else 'near another upshift' if near else 'outside upshift windows'
 accum(transitions,(r['year'],label),r,pred)
def rows(g,label):
 result=[]
 for (year,k),v in sorted(g.items()):
  total=sum(w['errorDistanceM'] for (y,_),w in g.items() if y==year)
  result.append({'year':year,label:k,**v,'accuracyPct':100*(1-v['errorDistanceM']/v['distanceM']) if v['distanceM'] else None,'shareOfErrorsPct':100*v['errorDistanceM']/total if total else 0})
 return result
ratios=[]
for r in ns['ratio_rows']:
 ratios.append({**r,'kphPer1000rpm':1000/r['rpmPerKph'] if r['rpmPerKph'] else None})
original=json.loads((root/'scripts/sim/data/f1-gear-measurements.json').read_text())
result={'sources':original['sources'],'years':original['years'],'definition':'Road speed in km/h per 1000 engine rpm = 1000 / median(RPM per km/h). Includes final drive, tyre radius and slip. Not a pure gearbox ratio. Stable-gear sampling filters unchanged.','ratios':ratios,'phase':rows(phase,'phase'),'segments100m':rows(segments,'bin'),'upshiftWindows':rows(transitions,'window'),'limitations':['Phases are signal-based proxies, not mapped corner landmarks.','100 m bins use integrated sampled speed from first retained lap timestamp; gaps are not interpolated. These are approximate positions.','Low-RPM upshift proxy: within 0.75 s of an observed upshift above 250 km/h, RPM below 90% of same team-season/from-gear median, at least 3 shifts. Not proof of driver intent.','Single circuit, Monza qualifying. Median spacing about 0.24 s. Segment analysis is descriptive and does not tune or retest the predictor.']}
(out/'gear-followup.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'phase':result['phase'],'upshift':result['upshiftWindows']},indent=2))
