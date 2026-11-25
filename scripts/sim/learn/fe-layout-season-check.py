# Step 35 report: official FE map per venue x season (fe-maps.json) vs the layout geometry and sector lines used (report only).
#   python3 -I scripts/sim/learn/fe-layout-season-check.py   (reads /tmp/fe-sector-lines.json from step35-fe)
import json,re,collections
m=json.load(open('scripts/sim/data/learn/fe-maps.json'))['events']
fit=json.load(open('scripts/sim/data/learn/fe-fit.json')); SL=json.load(open('/tmp/fe-sector-lines.json'))['tracks']
num=lambda s: float(s.replace(',','.')) 
def parse(e):
  t=' '.join(w['t'] for w in e['words'])
  L=re.search(r'Track Length:?\s*([\d.,]+)\s*(km|m)\b',t,re.I); i=re.search(r'i1\s*@\s*([\d.,]+)\s*m\s*/\s*i2\s*@\s*([\d.,]+)\s*m',t,re.I)
  off=re.search(r'offset:?\s*([\d.,]+)\s*m',t,re.I)
  lm=None
  if L: v=L.group(1); lm=num(v)*1000 if L.group(2).lower()=='km' else float(v.replace(',','').replace('.',''))
  return dict(len=lm, i1=float(i.group(1).replace(',','')) if i else None, i2=float(i.group(2).replace(',','')) if i else None, off=float(off.group(1).replace(',','')) if off else None)
yr=lambda s: 2000+int(re.search(r'(\d{4})-(\d\d)',s).group(2))
NAME={'são paolo':'São Paulo','sao paulo':'São Paulo','mexico city':'Mexico','madrid':'Jarama','new york city':'New York','monaco':'Monaco'}
venue=lambda ev: (lambda v: NAME.get(v.lower(), v))(re.sub(r'^R\d+\s+','',ev).strip())
maps=collections.defaultdict(list)
for e in m:
  p=parse(e); maps[(venue(e['event']),yr(e['season']))].append({**p,'file':e['file'],'season':e['season'],'event':e['event']})
lay={l['id']:l for l in fit['layouts']}; geo={g['id']:g for g in fit['geometry']}
out=[]
for r in fit['rows']:
  l=lay[r['layout']]; v=l['venue']; ms=maps.get((v,r['season']),[])
  g=geo.get(r['layout'],{}); sl=SL.get(r['layout'],{})
  if not ms: out.append((r['layout'],r['season'],v,'NO MAP for season',l['lengthM'],None,g.get('from'),sl.get('map'))); continue
  lens=sorted(set(x['len'] for x in ms if x['len'])); i12=sorted(set((x['i1'],x['i2']) for x in ms if x['i1']))
  flag=[]
  if lens and min(abs(x/l['lengthM']-1) for x in lens)>0.004: flag.append(f'length map {lens} vs used {l["lengthM"]}')
  if sl.get('i1M') and i12 and min(abs(a-sl['i1M'])+abs(b-sl['i2M']) for a,b in i12)>20: flag.append(f'i1/i2 map {i12} vs used {sl["i1M"]}/{sl["i2M"]}')
  out.append((r['layout'],r['season'],v,'; '.join(flag) or 'ok',l['lengthM'],lens,g.get('from'),sl.get('map')))
for o in out: print(o)
print()
def turns(e):
  ws=[w for w in e['words'] if re.fullmatch(r'\d{1,2}',w['t'])]
  return max((int(w['t']) for w in ws if int(w['t'])<40), default=None)
seen=set()
for e in sorted(m,key=lambda e:(venue(e['event']),e['season'])):
  v=venue(e['event']); 
  if v not in {lay[r['layout']]['venue'] for r in fit['rows']}: continue
  p=parse(e); k=(v,e['season'],p['len'],p['i1'],p['i2'],p['off'])
  if k in seen: continue
  seen.add(k); print(v, e['season'][:9], e['event'], p, e['file'][:50])
