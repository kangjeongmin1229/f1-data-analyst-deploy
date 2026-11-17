import json, math, numpy as np, networkx as nx
from scipy.spatial import cKDTree
d=json.load(open('scripts/sim/data/tracks/osm-raceways-all.json'))['tracks']['lausitz']; la,lo=d['seed']; R=6371008.8; cl=math.cos(math.radians(la))
xy=lambda p:((p[1]-lo)*math.pi/180*R*cl,(p[0]-la)*math.pi/180*R)
G=nx.Graph(); pts=[]
for w in d['ways']:
    g=np.array([xy(p) for p in w['g']]); prev=None
    for a,b in zip(g[:-1],g[1:]):
        n=max(1,int(np.hypot(*(b-a))/2.0))
        for t in np.linspace(0,1,n,endpoint=False):
            pts.append(a+(b-a)*t); i=len(pts)-1
            if prev is not None: G.add_edge(prev,i,w=float(np.hypot(*(pts[i]-pts[prev]))))
            prev=i
    pts.append(g[-1]); i=len(pts)-1; G.add_edge(prev,i,w=float(np.hypot(*(pts[i]-pts[prev]))))
P=np.array(pts); tree=cKDTree(P)
for i,j in tree.query_pairs(3.0):
    if not G.has_edge(i,j): G.add_edge(i,j,w=float(np.hypot(*(P[i]-P[j]))))
X=np.load('/tmp/dtm-fit.npy')[np.load('/tmp/dtm-order.npy')]
s=np.r_[0,np.cumsum(np.hypot(*np.diff(np.vstack([X,X[:1]]),axis=0).T))]; t=np.arange(0,s[-1],20.0)
W=np.c_[np.interp(t,s,np.r_[X[:,0],X[0,0]]),np.interp(t,s,np.r_[X[:,1],X[0,1]])]
_,wn=tree.query(W)
# edge cost: length + penalty for distance from the trace (keeps the path on the traced road, not a parallel one)
tt=cKDTree(X)
for u,v,dd in G.edges(data=True):
    m=(P[u]+P[v])/2; dist,_=tt.query(m); dd['c']=dd['w']*(1+ (dist/6.0)**2)
path=[]
for a,b in zip(wn,np.r_[wn[1:],wn[:1]]):
    p=nx.shortest_path(G,a,b,weight='c'); path+=p[:-1]
# remove there-and-back spurs
changed=True
while changed:
    changed=False; seen={}
    for k,n in enumerate(path):
        if n in seen and k-seen[n]<400:
            path=path[:seen[n]]+path[k:]; changed=True; break
        seen[n]=k
Q=P[path]; L=np.hypot(*np.diff(np.vstack([Q,Q[:1]]),axis=0).T).sum()
from collections import Counter
print('loop length',round(L),'repeated',sum(1 for v in Counter(path).values() if v>1))
dq,_=tt.query(Q); print('dist to trace median',round(np.median(dq),1),'p95',round(np.percentile(dq,95),1),'max',round(dq.max(),1))
A=0.5*np.sum(Q[:,0]*np.roll(Q[:,1],-1)-np.roll(Q[:,0],-1)*Q[:,1]); print('dir', 'ccw' if A>0 else 'cw')
np.save('/tmp/lz-Q.npy',Q)
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
fig,ax=plt.subplots(figsize=(9,8)); ax.plot(P[:,0],P[:,1],',',color='#999'); ax.plot(Q[:,0],Q[:,1],'r-',lw=1.5); ax.plot(Q[0,0],Q[0,1],'go'); ax.set_aspect('equal'); ax.set_xlim(-450,750); ax.set_ylim(-650,350)
fig.savefig('/tmp/lz-Q.png',dpi=60,bbox_inches='tight')
