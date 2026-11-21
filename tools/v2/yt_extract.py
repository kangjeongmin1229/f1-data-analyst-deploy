"""Derived numbers from a short onboard video (video file + audio file).
Output JSON: 10 Hz yaw/pitch image shift (px/s at 320 px width), scene-cut flags,
and a 25 Hz engine-pitch track (harmonic-product-spectrum f0, Hz) with quality.
Usage: python3 yt_extract.py <video> <audio> <out.json> [meta-json-string]"""
import sys, os, json, subprocess, numpy as np, cv2
ROW0, ROW1 = float(os.environ.get('ROW0', .05)), float(os.environ.get('ROW1', .32))
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

def sad_shift(a, b, R, axis, w=None):
    """Shift k (px) minimizing weighted mean |a(x) - b(x+k)|; w masks static pixels (car body, logos)."""
    if w is None: w = np.ones_like(a)
    n = a.shape[axis]; errs = []
    for k in range(-R, R + 1):
        sl_a = [slice(None)] * 2; sl_b = [slice(None)] * 2
        sl_a[axis] = slice(max(0, k), n + min(0, k)); sl_b[axis] = slice(max(0, -k), n - max(0, k))
        x, y, ww = a[tuple(sl_a)], b[tuple(sl_b)], w[tuple(sl_a)] * w[tuple(sl_b)]
        errs.append((np.abs(x - y) * ww).sum() / (ww.sum() + 1e-6))
    errs = np.array(errs); j = int(errs.argmin())
    return j - R, float(1 - errs[j] / (errs[R] + 1e-6))

BANDS = ((0.0, 0.22), (0.20, 0.45), (0.40, 0.65))  # top band validated on F1 (corr ~0.9, gain ~0.83)

def frames_ffmpeg(path, hz, W, H):
    """Fallback decoder (cv2 here cannot decode AV1): ffmpeg gives gray W x H frames at hz."""
    p = subprocess.Popen(['ffmpeg', '-v', 'quiet', '-i', path, '-vf', f'fps={hz},scale={W}:{H}:flags=area,format=gray', '-f', 'rawvideo', '-'],
                         stdout=subprocess.PIPE)
    while True:
        b = p.stdout.read(W * H)
        if len(b) < W * H: break
        yield np.frombuffer(b, np.uint8).reshape(H, W).astype(np.float32)

def rows_from(frames, hz, H):
    prev = None; out = []
    for k, g in enumerate(frames):
        if prev is not None:
            row = [round(k / hz, 3)]
            for r0, r1 in BANDS:
                dx, q = sad_shift(g[int(H * r0):int(H * r1)], prev[int(H * r0):int(H * r1)], 40, 1)
                row += [round(dx * hz, 1), round(q, 2)]
            dy, _ = sad_shift(g[:int(H * .3)][:, 45:-45], prev[:int(H * .3)][:, 45:-45], 8, 0)
            row += [round(dy * hz, 1), int(float(np.abs(g - prev).mean()) > 40)]
            out.append(row)
        prev = g
    return out

def video_track(path, W=320, H=180):
    cap = cv2.VideoCapture(path); fps = cap.get(cv2.CAP_PROP_FPS) or 25
    if not cap.read()[0]:
        dur = float(subprocess.run(['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout or 0)
        hz = 25 if dur < 1200 else 10
        return {'fps': fps, 'hz': hz, 'px_per_rad': 217.0, 'decoder': 'ffmpeg', 'yaw_sign': 'yaw_rad_s = px_s / 217 (left turn > 0 as TI heading rate)',
                'bands': BANDS, 'cols': ['t', 'yawA_px_s', 'qA', 'yawB_px_s', 'qB', 'yawC_px_s', 'qC', 'pitch_px_s', 'cut'], 'rows': rows_from(frames_ffmpeg(path, hz, W, H), hz, H)}
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
    n = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
    hz = 25 if n / fps < 1200 else 10
    step = max(1, round(fps / hz)); prev = None; out = []; i = 0
    while True:
        if i % step:  # skipped frame: grab only (no colour conversion), same result
            if not cap.grab(): break
            i += 1; continue
        ok, fr = cap.read()
        if not ok: break
        if True:
            g = cv2.cvtColor(cv2.resize(fr, (W, H), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY).astype(np.float32)
            if prev is not None:
                row = [round(i / fps, 3)]
                for r0, r1 in BANDS:
                    a, b = g[int(H * r0):int(H * r1)], prev[int(H * r0):int(H * r1)]
                    dx, q = sad_shift(a, b, 40, 1)
                    row += [round(dx * fps / step, 1), round(q, 2)]
                dy, _ = sad_shift(g[int(H * .0):int(H * .3)][:, 45:-45], prev[int(H * .0):int(H * .3)][:, 45:-45], 8, 0)
                row += [round(dy * fps / step, 1), int(float(np.abs(g - prev).mean()) > 40)]
                out.append(row)
            prev = g
        i += 1
    return {'fps': fps, 'hz': fps / step, 'px_per_rad': 217.0, 'yaw_sign': 'yaw_rad_s = px_s / 217 (left turn > 0 as TI heading rate)',
            'bands': BANDS, 'cols': ['t', 'yawA_px_s', 'qA', 'yawB_px_s', 'qB', 'yawC_px_s', 'qC', 'pitch_px_s', 'cut'], 'rows': out}

def audio_track(path, sr=16000):
    from scipy.ndimage import median_filter
    x = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 's16le', '-'], capture_output=True).stdout
    x = np.frombuffer(x, '<i2').astype(np.float32) / 32768
    rpms = np.arange(4000, 13600, 25); T, E, Q = [], [], []
    # Frames are independent (the median filter runs along frequency only), so long audio is done in 10-min chunks to bound memory.
    hop, n = 640, 4096; step = hop * 15000
    for s0 in range(0, max(1, len(x) - n + 1), step):
        seg = x[s0:s0 + step + n - hop]
        if len(seg) < n: break
        f, t, Z = stft(seg, sr, nperseg=n, noverlap=n - hop, boundary=None, padded=False)
        S = np.abs(Z).astype(np.float32); del Z
        S = S / (median_filter(S, size=(31, 1)) + 1e-9)
        sc = np.zeros((len(rpms), len(t)), np.float32)
        for i, r in enumerate(rpms):
            F = r / 120.0; idx = [int(round(k * F / (f[1] - f[0]))) for k in range(3, 31) if k * F < sr / 2 - 50]
            sc[i] = np.log(S[idx] + 1e-6).mean(0)
        T.append(t + s0 / sr); E.append(rpms[sc.argmax(0)]); Q.append(sc.max(0) - np.median(sc, 0))
    t, est, q = np.concatenate(T), np.concatenate(E), np.concatenate(Q).astype(float)
    return {'hz': sr / 640, 't': t.round(2).tolist(), 'rpm': est.tolist(), 'q': q.round(2).tolist(), 'method': 'half-order comb rpm/120 k=3..30'}

if __name__ == '__main__':
    v, a, out = sys.argv[1:4]; meta = json.loads(sys.argv[4]) if len(sys.argv) > 4 else {}
    res = {'meta': meta, 'video': video_track(v), 'audio': audio_track(a)}
    json.dump(res, open(out, 'w'), separators=(',', ':'))
    r = res['video']['rows']; print(out, 'video rows', len(r), 'cuts', sum(x[-1] for x in r), 'audio frames', len(res['audio']['t']), flush=True)
