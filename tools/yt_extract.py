"""Derived numbers from a short onboard video (video file + audio file).
Output JSON: 10 Hz yaw/pitch image shift (px/s at 320 px width), scene-cut flags,
and a 25 Hz engine-pitch track (harmonic-product-spectrum f0, Hz) with quality.
Usage: python3 yt_extract.py <video> <audio> <out.json> [meta-json-string]"""
import sys, json, subprocess, numpy as np, cv2
from scipy.signal import stft

def prof_shift(a, b, R):
    a = a - np.convolve(a, np.ones(15)/15, 'same'); b = b - np.convolve(b, np.ones(15)/15, 'same')
    n = len(a); best = (0, -2)
    for k in range(-R, R + 1):
        x = a[max(0, k):n + min(0, k)]; y = b[max(0, -k):n - max(0, k)]
        if len(x) < n // 2 or x.std() == 0 or y.std() == 0: continue
        c = np.corrcoef(x, y)[0, 1]
        if c > best[1]: best = (k, c)
    return best

def sad_shift(a, b, R, axis):
    """Shift k (px) minimizing mean |a(x) - b(x+k)|; quality = 1 - best/zero-shift error."""
    n = a.shape[axis]; errs = []
    for k in range(-R, R + 1):
        if axis == 1: x = a[:, max(0, k):n + min(0, k)]; y = b[:, max(0, -k):n - max(0, k)]
        else: x = a[max(0, k):n + min(0, k)]; y = b[max(0, -k):n - max(0, k)]
        errs.append(np.abs(x - y).mean())
    errs = np.array(errs); j = int(errs.argmin())
    return j - R, float(1 - errs[j] / (errs[R] + 1e-6))

def video_track(path, W=320, H=180, hz=10):
    cap = cv2.VideoCapture(path); fps = cap.get(cv2.CAP_PROP_FPS) or 25
    step = max(1, round(fps / hz)); prev = None; ema = None; out = []; i = 0
    while True:
        ok, fr = cap.read()
        if not ok: break
        if i % step == 0:
            g = cv2.cvtColor(cv2.resize(fr, (W, H), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY).astype(np.float32)
            roi = g[int(H*.20):int(H*.52)]  # horizon band (trees, barriers)
            if prev is not None:
                d = np.abs(roi - prev)
                ema = d if ema is None else 0.9 * ema + 0.1 * d
                m = (ema > 6).astype(np.float32)
                cut = float(d.mean()) > 40
                dx, cx = sad_shift(roi, prev, 40, 1)
                dy, cy = sad_shift(np.roll(roi, -dx, 1)[:, 45:-45], prev[:, 45:-45], 8, 0)
                out.append([round(i / fps, 2), round(dx * fps / step, 1), round(dy * fps / step, 1), round(min(cx, cy), 3), int(cut)])
            prev = roi
        i += 1
    return {'fps': fps, 'hz': hz, 'cols': ['t', 'yaw_px_s', 'pitch_px_s', 'resp', 'cut'], 'rows': out}

def audio_track(path, sr=16000):
    x = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 's16le', '-'],
                       capture_output=True).stdout
    x = np.frombuffer(x, '<i2').astype(float) / 32768
    f, t, Z = stft(x, sr, nperseg=4096, noverlap=4096 - 640)
    S = np.log(np.abs(Z) + 1e-6); S -= np.median(S, 1, keepdims=True)
    band = (f >= 40) & (f <= 2000); fb = f[band]; Sb = S[band]
    # harmonic sum over k=1..6 for candidate f0 40..700 Hz
    cand = np.arange(40, 700, 2.0); sc = np.zeros((len(cand), len(t)))
    for j, c in enumerate(cand):
        idx = [np.argmin(abs(f - k * c)) for k in range(1, 7) if k * c < 2000]
        sc[j] = S[idx].mean(0)
    f0 = cand[sc.argmax(0)]; q = sc.max(0) - np.median(sc, 0)
    return {'hz': sr / 640, 't': t.round(2).tolist(), 'f0': f0.tolist(), 'q': q.round(2).tolist()}

if __name__ == '__main__':
    v, a, out = sys.argv[1:4]; meta = json.loads(sys.argv[4]) if len(sys.argv) > 4 else {}
    res = {'meta': meta, 'video': video_track(v), 'audio': audio_track(a)}
    json.dump(res, open(out, 'w'), separators=(',', ':'))
    r = res['video']['rows']; print(out, 'video rows', len(r), 'cuts', sum(x[4] for x in r), 'audio frames', len(res['audio']['t']))
