"""Read the on-screen throttle / brake bar of an onboard video (derived numbers only; no frames kept).
Step 1 (calibrate, once per graphics style): python overlay_bars.py calib VIDEO T_SEC
   -> writes calib_<t>.png (full frame, local only, never committed) to pick the bar box by eye.
Step 2 (read): python overlay_bars.py read VIDEO OUT.json "x,y,w,h" AXIS HUE_LO HUE_HI [FPS=10]
   AXIS = 'x' (bar fills left->right) or 'y' (bottom->top). HUE in OpenCV units 0-179 (green about 40-85, red 0-10 or 170-179).
   Output: {'t': [...], 'fill': [...] (0-1), 'update_interval_s': median time between changes, 'box': ..., 'style': ...}"""
import json, subprocess, sys, numpy as np
def frames(video, box, fps):
    x, y, w, h = box
    cmd = ['ffmpeg', '-v', 'error', '-i', video, '-vf', f'fps={fps},crop={w}:{h}:{x}:{y}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE); n = w * h * 3; i = 0
    while True:
        b = p.stdout.read(n)
        if len(b) < n: break
        yield i / fps, np.frombuffer(b, np.uint8).reshape(h, w, 3); i += 1
def hue_sat(rgb):
    f = rgb.astype(float) / 255; mx = f.max(2); mn = f.min(2); d = mx - mn + 1e-9
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    h = np.where(mx == r, (g - b) / d % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 30  # 0-180 like OpenCV
    return h, d / (mx + 1e-9), mx
def fill(rgb, axis, lo, hi):
    h, s, v = hue_sat(rgb)
    on = (s > 0.35) & (v > 0.35) & (((h >= lo) & (h <= hi)) if lo <= hi else ((h >= lo) | (h <= hi)))
    prof = on.mean(0 if axis == 'x' else 1) > 0.5
    if axis == 'y': prof = prof[::-1]
    return float(prof.mean())
if __name__ == '__main__':
    if sys.argv[1] == 'calib':
        v, t = sys.argv[2], sys.argv[3]
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', t, '-i', v, '-frames:v', '1', f'calib_{t}.png']); sys.exit()
    v, out, box, axis, lo, hi = sys.argv[2:8]; fps = float(sys.argv[8]) if len(sys.argv) > 8 else 10
    box = [int(x) for x in box.split(',')]; T, F = [], []
    for t, im in frames(v, box, fps): T.append(round(t, 3)); F.append(round(fill(im, axis, int(lo), int(hi)), 3))
    F = np.array(F); ch = np.where(np.abs(np.diff(F)) > 0.02)[0]
    ui = float(np.median(np.diff(ch)) / fps) if len(ch) > 2 else None
    json.dump({'t': T, 'fill': F.tolist(), 'update_interval_s': ui, 'box': box, 'axis': axis, 'hue': [int(lo), int(hi)], 'fps': fps}, open(out, 'w'))
    print(out, len(T), 'frames, update interval', ui)
