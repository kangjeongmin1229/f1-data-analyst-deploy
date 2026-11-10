"""Join pinned per-car laps to official event classifications and verify BoP PDF rows."""
import csv, json, pathlib, hashlib, re, subprocess
root=pathlib.Path.cwd(); src=root/'.cache/night-session/wec-sources'; out=root/'scripts/sim/data'
sha=lambda b:hashlib.sha256(b).hexdigest()
sources=json.loads((src/'classification-sources.json').read_text()); sessions=json.loads((root/'.cache/wec-sector-run/baseline/.cache/lapsim/wec.json').read_text())
entries={}; compact=[]
for sid,s in enumerate(sources):
 b=(src/s['path']).read_bytes();assert sha(b)==s['sha256'],'HARD STOP: classification hash mismatch'
 table=list(csv.reader(b.decode('utf-8-sig').splitlines(),delimiter=';'));head=[h.strip()for h in table[0]]
 assert head[:14]==['POS','NUMBER','LAP','TIME','GAP_FIRST','GAP_PREVIOUS','KPH','LAPS','TEAM','CLASS','GROUP','DIVISION','VEHICLE','TIRES']
 track=next(w['track']for w in sessions if w['year']==s['year']and w['event']==s['event'])
 for row in table[1:]:
  if not row:continue
  assert len(row)>=14
  d=dict(zip(head[:14],row[:14]));key=(s['year'],track,d['NUMBER']);assert key not in entries
  entries[key]=dict(year=s['year'],track=track,entry=d['NUMBER'],model=d['VEHICLE'],category=d['CLASS'],qualifyingLaps=int(d['LAPS']) if d['LAPS'] else None,source=sid)
 compact.append({k:s[k]for k in ['url','sha256','published_at','retrievedAt']})
modelmap={'schemaVersion':1,'method':'Exact season/track/entry join. Entry strings preserve leading zeros. Only validated classification columns before DRIVER fields are read.','sources':compact,'rows':list(entries.values())}
(out/'wec-model-identities.json').write_text(json.dumps(modelmap,separators=(',',':'))+'\n')
inventory=[]
for w in sessions:
 bymodel={}
 for c in w['cars']:
  identity=entries[(w['year'],w['track'],c['car'])]
  if c['car'] in [r['entry']for r in bymodel.get(identity['model'],[])]:raise ValueError('Duplicate pinned entry')
  bymodel.setdefault(identity['model'],[]).append(dict(entry=c['car'],retainedLaps=1,qualifyingLaps=identity['qualifyingLaps'],session=c['session'],lapSec=c['lap'],source=identity['source']))
 for model,cars in bymodel.items():inventory.append(dict(cls=w['cls'],year=w['year'],track=w['track'],event=w['event'],model=model,entries=[c['entry']for c in cars],retainedLaps=len(cars),cars=cars,wet=bool(w['weather'].get('rain'))))
(src/'all-car-inventory.json').write_text(json.dumps(inventory,indent=2)+'\n')
pdfs=json.loads((src/'pdf-sources.json').read_text());norm=lambda s:re.sub('[^a-z0-9]','',s.lower());bop=[];pdfsources=[]
for track,name in [('lusail','lusail'),('imola','imola'),('spa-francorchamps','spa'),('interlagos','interlagos'),('sakhir','sakhir')]:
 name='bop-'+name+'-2025';source=next(s for s in reversed(pdfs)if s['name']==name and 'sha256'in s)
 assert sha((src/(name+'.pdf')).read_bytes())==source['sha256'],'HARD STOP: PDF hash mismatch'
 subprocess.run(['pdftotext','-layout',str(src/(name+'.pdf')),str(src/(name+'.txt'))],check=True)
 text=(src/(name+'.txt')).read_text();rows=[]
 for line in text.splitlines():
  if not re.match(r'^(ALPINE|ASTON MARTIN|BMW|CADILLAC|FERRARI|PEUGEOT|PORSCHE|TOYOTA)\s',line):continue
  parts=line.split();model=' '.join(parts[:-11]);v=parts[-11:]
  assert re.fullmatch(r'\d{4}',v[1]) and re.fullmatch(r'\d{3}',v[3]) and re.fullmatch(r'\d{3}',v[9]),parts
  rows.append(dict(year=2025,track=track,model=model,modelKey=norm(model),kg=int(v[1]),kW=int(v[3]),above250Pct=float(v[5].rstrip('%')),stintMJ=int(v[9]),source=len(pdfsources)))
 assert len(rows)==8,(name,len(rows))
 pdfsources.append(dict(url=source['url'],sha256=source['sha256'],issue=re.search(r'DECISION N°:\s*([^\n]+)',text).group(1).strip(),date=re.search(r'DATE:\s*(\d{2}/\d{2}/\d{4})',text).group(1),article='2025 FIA WEC Sporting Regulations 6.2.1',page=2))
 bop.extend(rows)
(out/'wec-bop-verified-2025.json').write_text(json.dumps({'schemaVersion':1,'sources':pdfsources,'rows':bop},separators=(',',':'))+'\n')
print(json.dumps({'classificationSources':len(sources),'identities':len(entries),'pinnedCars':sum(len(w['cars'])for w in sessions),'inventoryRows':len(inventory),'bopRows':len(bop),'models':len(set(r['model']for r in entries.values()))}))
