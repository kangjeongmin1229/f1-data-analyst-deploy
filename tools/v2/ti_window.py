import json,sys,os,subprocess,numpy as np
from scipy.ndimage import gaussian_filter1d as gf
def load(repo,path):
    f=os.path.join(repo,path)
    if not os.path.exists(f): subprocess.run(['git','-C',repo,'checkout','-q','HEAD','--',path],capture_output=True)
    return json.load(open(f)) if os.path.exists(f) else None
def window(year,event,drv,lap,before=420,after=200,dt=0.2):
    repo=f'/home/claude/ti{year}'; base=f'{event}/Qualifying/{drv}'
    L=load(repo,base+'/laptimes.json')
    laps=L['lap']; sesT=L['sesT']; tm=L['time']
    i=laps.index(lap); end=sesT[i]; start=end-tm[i]
    g=np.arange(start-before,end+after,dt); r=np.zeros_like(g); ok=np.zeros(len(g),bool)
    for j,lp in enumerate(laps):
        if sesT[j] is None or sesT[j]=='None': continue
        e=float(sesT[j]); 
        if e<g[0] or e-200>g[-1]: continue
        T=load(repo,f'{base}/{lp}_tel.json')
        if not T: continue
        T=T['tel']; t=np.array(T['time'],float); x=np.array(T['x'],float); y=np.array(T['y'],float)
        s0=e-t[-1]; tt=np.arange(0,t[-1],1/15)
        X=gf(np.interp(tt,t,x),3);Y=gf(np.interp(tt,t,y),3)
        h=np.unwrap(np.arctan2(np.gradient(Y),np.gradient(X))); rr=np.gradient(h)*15
        m=(g>=s0)&(g<=e); r[m]=np.interp(g[m]-s0,tt,rr); ok[m]=True
    return g,r,ok,start,end
if __name__=='__main__':
    y,ev,d,lp=sys.argv[1],sys.argv[2],sys.argv[3],int(sys.argv[4])
    g,r,ok,s,e=window(y,ev,d,lp); print(len(g),ok.mean(),s,e)
