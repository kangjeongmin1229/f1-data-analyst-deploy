import json,numpy as np,sys
from scipy.ndimage import median_filter
from ti_window import window, load
def audio_align(yj,year,event,drv,lap):
    d=json.load(open(yj)); a=d['audio']; at=np.array(a['t']); r=median_filter(np.array(a['rpm'],float),9)
    T=load(f'/home/claude/ti{year}',f'{event}/Qualifying/{drv}/{lap}_tel.json')['tel']; tt=np.array(T['time'],float); rpm=np.array(T['rpm'],float)
    dt=at[1]-at[0]; g=np.arange(0,tt[-1],dt); ref=np.interp(g,tt,rpm); n=len(g); best=(-2,0)
    for k in range(0,len(at)-n):
        c=np.corrcoef(r[k:k+n],ref)[0,1]
        if c>best[0]: best=(c,k)
    c,k=best; v=r[k:k+n]
    return {'audio_lap_start':round(float(at[k]),2),'rpm_corr':round(float(c),3),'rpm_err_med':float(np.median(v-ref)),'within300':round(float(np.mean(abs(v-ref)<300)),2),'lap_s':round(tt[-1],2)}
def yaw_at(yj,year,event,drv,lap,t0,F=217.0):
    d=json.load(open(yj)); R=np.array(d['video']['rows'],float); t=R[:,0]; yaw=R[:,1]/F
    g,ti,ok,s,e=window(year,event,drv,lap,before=0,after=0,dt=0.1)
    v=np.interp(t0+(g-g[0]),t,yaw); best=None
    for sh in np.arange(-1.5,1.51,0.1):
        vv=np.interp(t0+sh+(g-g[0]),t,yaw); c=np.corrcoef(vv,ti)[0,1]
        if best is None or c>best[0]: best=(c,sh,vv)
    c,sh,vv=best
    return {'yaw_corr':round(float(c),3),'yaw_shift':round(float(sh),1),'gain':round(float(np.dot(vv,ti)/np.dot(ti,ti)),3),'yaw_rms':round(float(np.sqrt(np.mean((vv-ti)**2))),3)}
if __name__=='__main__':
    y=sys.argv; A=audio_align(y[1],int(y[2]),y[3],y[4],int(y[5])); A.update(yaw_at(y[1],int(y[2]),y[3],y[4],int(y[5]),A['audio_lap_start'])); print(A)
