"""Derived report only; signed held-out residuals, no fit or settings selection."""
import json, math, pathlib, statistics
p=pathlib.Path('scripts/sim/results/owner-diagnostics-2026-11-11')
d=json.loads((p/'baseline-residuals.json').read_text()); rows=d['rows']
assert len(rows)==67 and len({(r['group'],r['track'])for r in rows})==67
def mean(a): return statistics.mean(a) if a else None
def rms(a): return math.sqrt(mean([x*x for x in a])) if a else None
def f(x,n=6): return 'unknown' if x is None else f'{x:.{n}f}'
def corr(pairs):
 if len(pairs)<3:return None
 x,y=zip(*pairs);mx,my=mean(x),mean(y);den=math.sqrt(sum((v-mx)**2 for v in x)*sum((v-my)**2 for v in y))
 return sum((a-mx)*(b-my)for a,b in pairs)/den if den else None
def correlation(rs,k):
 good=[r for r in rs if isinstance(r['features'].get(k),(int,float))];pairs=[(r['features'][k],r['residualPct'])for r in good]
 centered=[]
 for g in set(r['group']for r in good):
  a=[r for r in good if r['group']==g];mx=mean([r['features'][k]for r in a]);my=mean([r['residualPct']for r in a]);centered.extend((r['features'][k]-mx,r['residualPct']-my)for r in a)
 leave=[corr([(r['features'][k],r['residualPct'])for r in good if r['track']!=t])for t in set(r['track']for r in good)];leave=[x for x in leave if x is not None]
 return {'feature':k,'n':len(good),'tracks':len(set(r['track']for r in good)),'pearsonR':corr(pairs),'withinGroupR':corr(centered),'leaveTrackOutMin':min(leave)if leave else None,'leaveTrackOutMax':max(leave)if leave else None}
doc=['# Saved-baseline residual analysis — 2026-11-11','','No fit. Every lap prediction was reconstructed from its original held-out state, with zero optimizer rounds; all 67 match the saved residual within 1e-8 s. Positive residual means the prediction is too slow. These are current experiment baselines: final Block 2 F1 control and WEC R control, not a recomputed frozen-production baseline.','','F1 is a hidden-season test on known tracks, not unseen-track validation. WEC hides a class-season lap while carrying F1/B track factors. Each feature association below is exploratory; these same rows cannot later be advertised as untouched validation after choosing a model from this analysis.','','| Baseline | n | RMS % | Mean signed error s |','|---|---:|---:|---:|']
for s in d['summary']:doc.append(f"| {s['group']} | {s['n']} | {f(s['rmsPct'])} | {f(s['biasSec'])} |")
all_corr={}
for series in ['f1','wec']:
 rs=[r for r in rows if r['series']==series]
 doc += ['',f'## {series.upper()}: signed held-out rows, sorted by error','','Squared-error share uses percentage residual squared so it reconciles with held-out RMS. Seconds-squared share is also saved in JSON; long laps otherwise receive more weight.','','| Group | Track | Real s | Predicted s | Signed s | Signed % | Share of squared % error |','|---|---|---:|---:|---:|---:|---:|']
 ss=sum(r['residualSec']**2 for r in rs)
 for r in sorted(rs,key=lambda r:r['residualSec']):
  r['squaredSecondsErrorShare']=100*r['residualSec']**2/ss
  doc.append(f"| {r['group']} | {r['track']} | {f(r['realSec'])} | {f(r['predictedSec'])} | {f(r['residualSec'])} | {f(r['residualPct'])} | {f(r['squaredPctErrorShare'],3)} |")
 tracks=[]
 for t in set(r['track']for r in rs):
  a=[r for r in rs if r['track']==t];tracks.append({'track':t,'n':len(a),'biasPct':mean([r['residualPct']for r in a]),'sharePct':sum(r['squaredPctErrorShare']for r in a),'shareSeconds':sum(r['squaredSecondsErrorShare']for r in a)})
 doc+=['','| Track | n | Mean signed % | Squared % error share | Squared seconds error share |','|---|---:|---:|---:|---:|']
 for t in sorted(tracks,key=lambda x:-x['sharePct']):doc.append(f"| {t['track']} | {t['n']} | {f(t['biasPct'])} | {f(t['sharePct'],3)} | {f(t['shareSeconds'],3)} |")
 doc+=['',f'## {series.upper()}: lap parts','','Sector residuals use held-out cars and factors; F1 time-only team/development multiplier is included. WEC sector positions come from the verified WEC mapping, not the F1 timing lines. All valid mapped observations are reported, including measurements excluded from the fitting objective by its frozen sector-share eligibility check.','','| Group | Part | n | Mean signed error | RMS error | Unit |','|---|---|---:|---:|---:|---|']
 for group in sorted(set(r['group']for r in rs)):
  a=[r for r in rs if r['group']==group]
  for sec in [1,2,3]:
   vals=[s['biasSec']for r in a for s in r['parts']['sectors']if s['sector']==sec];doc.append(f'| {group} | sector {sec} | {len(vals)} | {f(mean(vals))} | {f(rms(vals))} | seconds |')
  if series=='f1':
   for band in ['slow','medium','fast']:
    vals=[c['biasKph']for r in a for c in r['parts']['corners']if c['band']==band];doc.append(f'| {group} | {band} corner minimum | {len(vals)} | {f(mean(vals))} | {f(rms(vals))} | km/h |')
   for part,key,unit in [('straights','biasKph','km/h'),('brakes','biasM','m')]:
    vals=[c[key]for r in a for c in r['parts'][part]];doc.append(f'| {group} | {part} | {len(vals)} | {f(mean(vals))} | {f(rms(vals))} | {unit} |')
  else:
   vals=[r['parts']['lapMaxVsTrapBiasKph']for r in a if r['parts']['lapMaxVsTrapBiasKph']is not None];doc.append(f'| {group} | lap maximum vs measured trap (positions differ) | {len(vals)} | {f(mean(vals))} | {f(rms(vals))} | km/h |')
 doc+=['','Lap-part n counts observations, not independent laps. F1 corner bands use measured minimum speed: slow <150, medium 150–250, fast ≥250 km/h. Minima and straight-end maxima are matched within ±50 m. Braking onset comes from the speed trace; positive distance bias means simulated braking starts later. This is not a verified pedal landmark. WEC has no measured corner-speed or braking-point channel in these saved inputs. Full per-row sectors, corners, straight maxima and braking matches are in baseline-residuals.json.','',f'## {series.upper()}: feature correlations','','Pearson r against signed percent residual. “Within group” removes each class-season mean from feature and residual. Leave-one-track range shows sensitivity to removing all rows from one track; it is not a confidence interval. Weather and shared-factor associations are confounded by track identity.','','| Feature | n | Unique tracks | Pearson r | Within-group r | Leave-one-track r min | max |','|---|---:|---:|---:|---:|---:|---:|']
 keys=sorted(set(k for r in rs for k in r['features']));all_corr[series]=[correlation(rs,k)for k in keys]
 for c in all_corr[series]:doc.append(f"| {c['feature']} | {c['n']} | {c['tracks']} | {f(c['pearsonR'],3)} | {f(c['withinGroupR'],3)} | {f(c['leaveTrackOutMin'],3)} | {f(c['leaveTrackOutMax'],3)} |")
doc+=['','## Factor provenance and missing measurements','','F1 factors are jointly fitted from the other seasons in each fold. The JSON lists all source seasons; latest source year is only a summary, not a claim that one year alone supplied the factor. WEC own-F1 factors use the latest stored season; B-transfer factors come from a joint 2023–2026 fit with per-track lineage not retained, so their source-year correlation is unknown. BoP joins are exact event/model/entry matches for verified Hypercar 2025 only; 2026 and LMGT3 cells stay unknown. No BoP zero is invented. Geographic altitude is absent from the pinned evidence, and pressure-derived altitude is not substituted. Measured WEC throttle share and corner speed are also absent.','','## Three patterns and their possible meaning','','The largest F1 error is Monaco 2026: it contributes about 31% of F1 squared percentage error, so the aggregate is sensitive to one low-speed circuit; this points first to a session/geometry/energy audit, not a broad tyre-temperature fit. Across F1 laps, medium-speed corner minima are too slow while straight-end speeds and braking locations are too high/late, especially in 2026: errors cancel across the lap, pointing to aero-mode, energy-delivery or braking-shape mismatch rather than one scalar grip correction. WEC has shared track signs across classes—Lusail and Spa too slow, Imola and Interlagos too fast—and a strong raw track-length correlation; this points to common geometry/track-factor transfer or sector allocation, with weather and BoP correlations confounded by track. These are explainable diagnostic patterns, not proof of one cause; the independent track count is small.','','## Recommended next experiment','','After completing the current round diagnostic, declare one F1 experiment replacing guessed low-drag straight zones with verified per-event zones, keeping weights, bounds, kernel battery behaviour and fold rule fixed. Judge held-out lap error together with matched straight-end speed, corner minimum and braking bias. Verify zone sources before launch. Do not tune weather, BoP or track factors to these residuals. A WEC alternative first needs measured trap positions; its current lap-maximum comparison cannot isolate drag. No experiment beyond the already-authorized round sweep was launched.','','## Reproduction and limitations','','Run `node scripts/sim/analyse-owner-residuals.mjs`, then `python scripts/sim/report-owner-residuals.py` from the diagnostics checkout after restoring the pinned aligned control traces. The first script asserts all saved lap residuals. No optimizer is called. The raw input traces remain outside git; only derived residuals are saved. Hashes are in baseline-residuals.json.','',*['- '+x for x in d['limitations']]]
d['correlations']=all_corr;(p/'baseline-residuals.json').write_text(json.dumps(d,indent=2)+'\n')
pathlib.Path('docs/lapsim-owner-residual-analysis-2026-11-11.md').write_text('\n'.join(doc)+'\n')
print(json.dumps(all_corr,indent=2))
