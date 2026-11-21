import json,os,sys,wave,numpy as np
from scipy.signal import stft
from scipy.ndimage import median_filter
R=json.load(open('results.json'))
def audio_rpm(path):
    w=wave.open(path); sr=w.getframerate(); x=np.frombuffer(w.readframes(w.getnframes()),'<i2').astype(float)/32768
    f,t,Z=stft(x,sr,nperseg=4096,noverlap=4096-640); S=np.abs(Z); S=S/(median_filter(S,size=(31,1))+1e-9)
    rpms=np.arange(5000,13200,20); sc=np.zeros((len(rpms),len(t)))
    for i,r in enumerate(rpms):
        F=r/120.0; idx=[np.argmin(abs(f-k*F)) for k in range(3,31) if k*F<sr/2-50]; sc[i]=np.log(S[idx]+1e-6).mean(0)
    est=rpms[sc.argmax(0)]; q=sc.max(0)-np.median(sc,0)
    return t.round(2).tolist(), est.tolist(), q.round(2).tolist()
out={}
for k,v in sorted(R.items()):
    e={'meta':v}
    p=f'raw/{k}.json'
    if os.path.exists(p):
        d=json.load(open(p)); e['q5']=d.get('q5'); e['v5']=d.get('v5'); e['t0']=d.get('t0')
    base=k[:-2] if k.endswith('-s') else None
    if base:
        for cand in [base, base.replace('mexico-city','mexico'), base+'3']:
            w=f'/mnt/user-data/uploads/kongboda-onboard/{cand}.wav'
            if os.path.exists(w):
                t,r,q=audio_rpm(w); e['audio']={'file':os.path.basename(w),'t':t,'rpm':r,'q':q,'hz':25}; break
    out[k]=e; print(k, 'video' if 'q5' in e else '-', 'audio' if 'audio' in e else '-', flush=True)
json.dump(out,open('bundle/f1-onboard-2025-2026.json','w'),separators=(',',':'))
