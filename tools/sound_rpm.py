import sys,json,numpy as np,wave
sys.path.insert(0,'/home/claude/ser')
from scipy.signal import stft
from scipy.ndimage import median_filter
wav,y,ev,drv,lap=sys.argv[1],sys.argv[2],sys.argv[3],sys.argv[4],int(sys.argv[5])
w=wave.open(wav); sr=w.getframerate(); x=np.frombuffer(w.readframes(w.getnframes()),'<i2').astype(float)/32768
f,t,Z=stft(x,sr,nperseg=4096,noverlap=4096-320); S=np.abs(Z); S=S/(median_filter(S,size=(31,1))+1e-9)
# harmonic comb for firing freq F=rpm/20 (V6: 3 per rev); search rpm 6000..13000
rpms=np.arange(5000,13200,20); score=np.zeros((len(rpms),len(t)))
for i,r in enumerate(rpms):
    F=r/120.0; hs=[k*F for k in range(3,31) if k*F<sr/2-50]
    idx=[np.argmin(abs(f-h)) for h in hs]; score[i]=np.log(S[idx]+1e-6).mean(0)
est=rpms[score.argmax(0)]; q=score.max(0)-np.median(score,0)
T=json.load(open(f'/home/claude/ti{y}/{ev}/Qualifying/{drv}/{lap}_tel.json'))['tel']; tt=np.array(T['time']); rr=np.array(T['rpm'],float)
best=(-1,0)
for off in np.arange(0,t[-1]-tt[-1],0.05):
    m=(t>=off)&(t<=off+tt[-1]); ri=np.interp(t[m]-off,tt,rr)
    c=np.corrcoef(est[m],ri)[0,1]
    if c>best[0]: best=(c,off)
c,off=best; m=(t>=off)&(t<=off+tt[-1]); ri=np.interp(t[m]-off,tt,rr); e=est[m]-ri
print('audio lap start %.2fs corr %.2f  rpm err median %.0f  RMS %.0f  within 300rpm %.0f%%'%(off,c,np.median(e),np.sqrt(np.mean(e**2)),100*np.mean(abs(e)<300)))
