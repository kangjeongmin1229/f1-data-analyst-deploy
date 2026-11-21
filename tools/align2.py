import os
import sys,json,shutil,numpy as np
from scipy.signal import medfilt
from ti_window import window
name,ev,drv,lap,rs=sys.argv[1],sys.argv[2],sys.argv[3],int(sys.argv[4]),float(sys.argv[5]); y=name[:4]
src=sys.argv[6] if len(sys.argv)>6 else f'/mnt/user-data/uploads/Downloads/kb_onboard_{name}.json'; shutil.copy(src,f'raw/{name}.json')
J=json.load(open(src)); vt0=J['t0']
v=np.array(J['q5'],float)/2; v[np.abs(v)>=60]=0; v=medfilt(v,3)
g,r,ok,s,e=window(y,ev,drv,lap,before=0,after=0)
res=[]
DLO,DHI=(float(x) for x in os.environ.get("DRANGE","150,1000").split(","))
for D in np.arange(DLO,DHI,0.2):
    st=rs+np.arange(len(v))*0.2+D; m=(st>=s)&(st<=e)
    if m.sum()<0.95*(e-s)*5: continue
    vv=v[m]; k=vv!=0; rr=np.interp(st[m],g,r)
    res.append((np.corrcoef(vv[k],rr[k])[0,1],D))
res.sort(reverse=True); c,D=res[0]; c2=max([x for x,d in res if abs(d-D)>15] or [0])
off=rs+D-vt0; sb=(s-off-vt0)*5; eb=(e-off-vt0)*5
R=json.load(open('results.json')); R[name]=dict(file=f'raw/{name}.json',event=ev,drv=drv,lap=lap,vt0=vt0,off=round(off,2),D=round(D,1),corr=round(c,3),corr2=round(c2,3),sb=round(sb),eb=round(eb),n=len(v),complete=True,method='lap-only')
json.dump(R,open('results.json','w'),indent=0)
print(name,'lap-only corr %.2f (2nd %.2f) D=%.1f bins %d..%d'%(c,c2,D,sb,eb))
