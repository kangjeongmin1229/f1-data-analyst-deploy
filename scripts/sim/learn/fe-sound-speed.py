# Step 35 A3 (docs/prereg/step35-fe-A3-sound-speed-2026-11-25.md): Formula E motor-tone tracker. One gear, so the tone is proportional to the
# rear-motor (= road) speed. Input: an audio file (any format ffmpeg reads). Output: JSON with t, f0 (Hz), q per 40 ms hop and the family check.
#   python3 -I scripts/sim/learn/fe-sound-speed.py <audio> <out.json> [--selftest]
import json, subprocess, sys
import numpy as np

SR, NFFT, HOP = 16000, 4096, 640               # 16 kHz, 4096-sample STFT, 40 ms hop
BAND, F0 = (150.0, 6000.0), (50.0, 1500.0)     # search band, fundamental range (pre-reg)
H, JUMP, QMIN = 6, 0.08, 3.0                    # harmonics, free |Δln f0| per hop, tracked if q ≥ 3

def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)

def track(x):
    win = np.hanning(NFFT); n = 1 + max(0, (len(x) - NFFT) // HOP)
    S = np.stack([np.abs(np.fft.rfft(win * x[i * HOP:i * HOP + NFFT])) for i in range(n)]) + 1e-9
    freqs = np.fft.rfftfreq(NFFT, 1 / SR); L = np.log(S)
    band = (freqs >= BAND[0]) & (freqs <= BAND[1]); L = L - np.median(L[:, band], axis=1, keepdims=True)
    cand = np.exp(np.linspace(np.log(F0[0]), np.log(F0[1]), 400)); df = freqs[1]
    score = np.zeros((n, len(cand)))
    for h in range(1, H + 1):
        fh = cand * h; ok = (fh >= BAND[0]) & (fh <= BAND[1]); b = np.clip(np.round(fh / df).astype(int), 1, len(freqs) - 2)
        best = np.maximum(np.maximum(L[:, b - 1], L[:, b]), L[:, b + 1]); score += np.where(ok, best, 0.0)
    q = (score - np.median(score, axis=1, keepdims=True)) / (1.4826 * np.median(np.abs(score - np.median(score, axis=1, keepdims=True)), axis=1, keepdims=True) + 1e-9)
    lc = np.log(cand); D = np.abs(lc[:, None] - lc[None, :]); pen = 4.0 * np.maximum(0, D - JUMP) / JUMP  # Viterbi jump cost
    acc = q[0].copy(); back = np.zeros((n, len(cand)), int)
    for i in range(1, n):
        tot = acc[:, None] - pen; back[i] = np.argmax(tot, axis=0); acc = tot[back[i], np.arange(len(cand))] + q[i]
    path = np.zeros(n, int); path[-1] = int(np.argmax(acc))
    for i in range(n - 1, 0, -1): path[i - 1] = back[i][path[i]]
    f0 = cand[path]; qq = q[np.arange(n), path]
    lost = np.r_[False, np.abs(np.diff(np.log(f0))) > 0.15]       # family switch (pre-reg)
    # second family: the best candidate outside ±10 % of the kept track, for the ratio report only
    other = np.array([cand[np.argmax(np.where(np.abs(lc - np.log(f)) > 0.1, q[i], -np.inf))] for i, f in enumerate(f0)])
    t = (np.arange(n) * HOP + NFFT / 2) / SR
    return {'t': np.round(t, 3).tolist(), 'f0': np.round(f0, 2).tolist(), 'q': np.round(qq, 2).tolist(), 'lost': lost.astype(int).tolist(),
            'trackedShare': float(np.mean((qq >= QMIN) & ~lost)), 'otherRatioMedian': float(np.median(other / f0))}

def selftest():  # a whine whose fundamental ramps 200 -> 900 Hz with 4 harmonics in noise must be followed within 2 %
    t = np.arange(0, 8, 1 / SR); f = 200 + 700 * t / 8; ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sin(h * ph) / h for h in range(1, 5)) + 0.5 * np.random.default_rng(35).standard_normal(len(t))
    r = track(x.astype(np.float32)); tt = np.array(r['t']); err = np.abs(np.array(r['f0']) / (200 + 700 * tt / 8) - 1)
    assert np.median(err) < 0.02 and r['trackedShare'] > 0.9, (np.median(err), r['trackedShare']); print('selftest ok', round(float(np.median(err)), 4), round(r['trackedShare'], 3))

if __name__ == '__main__':
    if '--selftest' in sys.argv: selftest(); sys.exit()
    r = track(load(sys.argv[1])); json.dump({'method': 'FE harmonic-sum Viterbi tracker (step 35 A3)', 'sr': SR, 'hop_s': HOP / SR, **r}, open(sys.argv[2], 'w'))
    print(sys.argv[1], 'tracked', round(r['trackedShare'], 3), 'other/kept', round(r['otherRatioMedian'], 3))
