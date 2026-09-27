"""
Composes the launch film's score from scratch, timed to the film.

    python3 tools/launch-score.py [out.wav]

Needs numpy and scipy. Reads the scene lengths from src/lib/launch/film.ts,
so the music follows any retiming; the in-scene cue frames below (typing,
chips, cards, badges) mirror the scene files and should move with them.

Shape of it:
  night / nothing   low A-minor pad, a clock tick each second, typewriter keys
  chaos             a heartbeat that speeds up, a dissonant swell, a blip per chip
  what if           near-silence, typing, then a riser that cuts…
  intro             …into an impact and a bright chord on the white frame
  statement → f5    the groove: ~128.6 BPM (14 frames a beat), Am–F–C–G,
                    four-on-the-floor from "snap", a whoosh + clap on every wipe
  scale             a riser into the white flash, then a half-time drop
  trust             the groove, filtered down, a tick per badge
  end               the groove stops; C major rings out
"""
import re
import sys
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
FPS = 30
ROOT = Path(__file__).resolve().parent.parent
OUT = sys.argv[1] if len(sys.argv) > 1 else "launch-out/uniboard-launch-score.wav"

# ------------------------------------------------------------------ timeline
src = (ROOT / "src/lib/launch/film.ts").read_text()
scenes = re.findall(r'\{ id: "([a-z0-9]+)", frames: (\d+)', src)
fpb = int(re.search(r"FRAMES_PER_BEAT = (\d+)", src).group(1))
start = {}
at = 0
for sid, n in scenes:
    start[sid] = at
    at += int(n)
TOTAL = at
DUR = TOTAL / FPS + 2.5  # a tail for the last chord
N = int(DUR * SR)
BEAT = fpb / FPS  # seconds


def t_of(frame):
    return frame / FPS


def sec(scene, local=0):
    return t_of(start[scene] + local)


rng = np.random.default_rng(7)
mix = np.zeros((N, 2))


def place(sig, t, gain=1.0, pan=0.0):
    """Adds a mono or stereo signal at time t (seconds)."""
    i = int(t * SR)
    if i >= N:
        return
    if sig.ndim == 1:
        l = np.sqrt(0.5 * (1 - pan))
        r = np.sqrt(0.5 * (1 + pan))
        sig = np.stack([sig * l * 1.41, sig * r * 1.41], axis=1)
    j = min(N, i + len(sig))
    mix[i:j] += sig[: j - i] * gain


def env(n, a=0.005, d=0.1, s=0.0, r=0.05, hold=0.0):
    """ADSR over n samples (times in seconds)."""
    e = np.zeros(n)
    A, D, H, R = (int(x * SR) for x in (a, d, hold, r))
    k = 0
    for seg, frm, to in ((A, 0, 1), (D, 1, s)):
        m = min(seg, n - k)
        if m > 0:
            e[k : k + m] = np.linspace(frm, to, m, endpoint=False)
        k += max(0, m)
    m = min(H, n - k)
    if m > 0:
        e[k : k + m] = s
        k += m
    m = min(R, n - k)
    if m > 0:
        e[k : k + m] = np.linspace(s, 0, m)
    return e


def lp(x, hz, order=2):
    return sosfilt(butter(order, min(hz, SR / 2 - 100), "low", fs=SR, output="sos"), x)


def hp(x, hz, order=2):
    return sosfilt(butter(order, hz, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def saw(freq, n, detune=0.0):
    t = np.arange(n) / SR
    ph = (t * freq * (1 + detune)) % 1.0
    return 2 * ph - 1


def sine(freq, n, phase=0.0):
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * freq * t + phase)


def note(name):
    """'A3' → Hz."""
    names = {"C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4, "F#": -3, "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2}
    m = re.match(r"([A-G]#?)(-?\d)", name)
    semis = names[m.group(1)] + (int(m.group(2)) - 4) * 12
    return 440.0 * 2 ** (semis / 12)


# ------------------------------------------------------------------ voices
def kick(gain=1.0):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 45 + 95 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7)
    click = hp(rng.standard_normal(n), 3000) * np.exp(-t * 400) * 0.25
    return (body + click) * gain


def clap():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    noise = bp(rng.standard_normal(n), 900, 5000)
    e = np.zeros(n)
    for k, off in enumerate((0, 0.011, 0.022)):
        i = int(off * SR)
        e[i:] += np.exp(-(t[: n - i]) * (60 if k < 2 else 16)) * (0.7 if k < 2 else 1)
    return noise * e * 0.5


def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7000) * np.exp(-t * (18 if open_ else 90)) * 0.22


def tick(freq=3200, gain=0.12):
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    return (sine(freq, n) * 0.6 + hp(rng.standard_normal(n), 4000) * 0.4) * np.exp(-t * 220) * gain


def key_click():
    n = int(0.045 * SR)
    t = np.arange(n) / SR
    thock = sine(rng.uniform(170, 230), n) * np.exp(-t * 90) * 0.5
    clack = bp(rng.standard_normal(n), 2000, 6500) * np.exp(-t * 260) * 0.7
    return (thock + clack) * rng.uniform(0.09, 0.14)


def pop(f0=700, gain=0.18):
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    f = f0 * (1 + 0.8 * np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 45) * gain


def whoosh(length=0.55, peak=0.72, gain=0.35):
    n = int(length * SR)
    t = np.arange(n) / SR
    base = rng.standard_normal(n)
    out = np.zeros(n)
    # crossfade across bands for a sweep that doesn't click
    bands = [(200, 600), (500, 1500), (1200, 3500), (3000, 8000)]
    pos = t / length
    for k, (lo, hi) in enumerate(bands):
        centre = (k + 0.5) / len(bands) * peak * 1.3
        w = np.exp(-(((pos - centre) / 0.22) ** 2))
        out += bp(base, lo, hi) * w
    shape = np.minimum(1, pos / peak) ** 2 * np.exp(-np.maximum(0, pos - peak) * 9)
    return out * shape * gain


def riser(length, gain=0.3):
    n = int(length * SR)
    t = np.arange(n) / SR
    pos = t / length
    noise = hp(rng.standard_normal(n), 400) * pos**2.5 * 0.6
    f = 180 * (6 ** pos)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * pos**2 * 0.3
    tone += np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR) * pos**3 * 0.15
    return (noise + tone) * gain


def impact(gain=1.0):
    n = int(2.6 * SR)
    t = np.arange(n) / SR
    f = 32 + 60 * np.exp(-t * 4)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6) * 0.9
    burst = lp(rng.standard_normal(n), 2500) * np.exp(-t * 14) * 0.5
    return (sub + burst) * gain


def bell_chord(notes, length=3.0, gain=0.14):
    n = int(length * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for nm in notes:
        f = note(nm)
        for k, (mult, amp, dec) in enumerate(((1, 1, 1.4), (2.01, 0.35, 2.4), (3.99, 0.12, 4))):
            out += np.sin(2 * np.pi * f * mult * t + k) * amp * np.exp(-t * dec)
    return out / len(notes) * gain


def pad(notes, length, cutoff=1100, gain=0.08, attack=0.6, release=0.8):
    n = int(length * SR)
    out = np.zeros(n)
    for nm in notes:
        f = note(nm)
        for d in (-0.004, 0.0, 0.005):
            out += saw(f, n, d)
    out = hp(lp(out / (3 * len(notes)), cutoff, 2), 110)
    return out * env(n, a=attack, d=0.01, s=1.0, hold=max(0, length - attack - release - 0.01), r=release) * gain


def pluck(freq, gain=0.08):
    n = int(0.28 * SR)
    t = np.arange(n) / SR
    x = saw(freq, n) + 0.5 * saw(freq * 2.005, n)
    # a filter that closes fast: blend a bright and a dark copy
    bright = lp(x, 4200)
    dark = lp(x, 700)
    k = np.exp(-t * 26)
    return (bright * k + dark * (1 - k)) * np.exp(-t * 11) * gain


def bass_note(freq, length, gain=0.22):
    n = int(length * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * t) * 0.8 + lp(saw(freq, n), 500) * 0.4
    return x * env(n, a=0.004, d=0.08, s=0.75, hold=max(0, length - 0.14), r=0.05) * gain


# ------------------------------------------------------------------ cues
# 1 · night: A-minor pad under everything dark, a clock tick a second.
dark_end = sec("intro")
place(pad(["A2", "E3", "A3", "C4"], dark_end + 0.3, cutoff=650, gain=0.1, attack=2.0, release=0.4), 0.0)
place(pad(["A1"], dark_end, cutoff=200, gain=0.12, attack=1.5, release=0.3), 0.0)
for s in np.arange(0.5, sec("chaos"), 1.0):
    place(tick(2600, 0.07), s, pan=0.25)

night_text = len("DBMS assignment · due 11:59 PM")
for k in range(night_text):
    place(key_click(), sec("night", 42 + k / 0.75), pan=rng.uniform(-0.2, 0.2))
place(pop(420, 0.1), sec("night", 96))  # the minute turns over

# 2 · nothing: a low thump on the line.
place(impact(0.45), sec("nothing", 2))

# 3 · chaos: heartbeat speeding up, a swell, a blip per chip, a glitch out.
hb = sec("chaos")
gap = 0.85
while hb < sec("whatif") - 0.2:
    place(kick(0.55), hb)
    place(kick(0.35), hb + 0.17)
    hb += gap
    gap = max(0.42, gap * 0.9)
swell_len = sec("whatif") - sec("chaos")
sw = pad(["A2", "A#2", "E3", "F3"], swell_len, cutoff=900, gain=0.07, attack=swell_len * 0.85, release=0.08)
place(sw, sec("chaos"))
for k, at_ in enumerate([14, 22, 30, 38, 45, 52, 58, 64, 70, 76, 82, 88]):
    place(pop(520 + 60 * (k % 5), 0.09), sec("chaos", at_), pan=rng.uniform(-0.6, 0.6))
for k in range(6):
    place(tick(rng.uniform(1500, 5000), 0.1), sec("chaos", 122 + k * 2), pan=rng.uniform(-0.8, 0.8))

# 4 · what if: typing, then a riser that stops dead at the cut.
for k in range(len("What if it was all on one board?")):
    place(key_click(), sec("whatif", 10 + k / 0.62), pan=rng.uniform(-0.2, 0.2))
rl = sec("intro") - sec("whatif", 48)
place(riser(rl, 0.28), sec("whatif", 48))

# 5 · intro: the impact, a bright chord on the white.
place(impact(1.0), sec("intro"))
place(bell_chord(["C5", "E5", "G5", "C6"], 4.0, 0.2), sec("intro"))
place(pad(["C3", "G3", "C4", "E4"], sec("statement") - sec("intro") + 0.4, cutoff=1400, gain=0.13, attack=0.05, release=0.5), sec("intro"))
place(whoosh(0.9, 0.5, 0.25), sec("intro", 42))  # the mark stepping aside
# a light arpeggio under the name, so the white frame isn't silent
for k in range(int((sec("statement") - sec("intro", 50)) / (BEAT / 2))):
    nm = ["C5", "E5", "G5", "E5"][k % 4]
    place(pluck(note(nm), 0.11), sec("intro", 50) + k * BEAT / 2, pan=0.3 * (1 if k % 2 else -1))

# 6–10 · the groove.
g0 = start["statement"]
g_end = start["end"]
drop_at = start["scale"] + 58  # the white flash in "scale"
half_from, half_to = drop_at, start["trust"]
chords = [
    (["A2"], ["A3", "C4", "E4"]),
    (["F2"], ["F3", "A3", "C4"]),
    (["C3"], ["G3", "C4", "E4"]),
    (["G2"], ["G3", "B3", "D4"]),
]
kick_from = start["snap"]
beats = int((g_end - g0) / fpb)
for b in range(beats):
    frame = g0 + b * fpb
    t = t_of(frame)
    bar = b // 4
    root, tones = chords[bar % 4]
    in_half = half_from <= frame < half_to
    filtered = frame >= start["trust"]

    # chord pad, once a bar
    if b % 4 == 0:
        place(pad(tones, BEAT * 4 + 0.2, cutoff=900 if filtered else 1700, gain=0.06, attack=0.08, release=0.3), t)

    # kick four to the floor (two to the bar in the half-time drop)
    if frame >= kick_from and (not in_half or b % 2 == 0):
        place(kick(0.9 if not filtered else 0.6), t)
    # clap on 2 and 4 once the features start
    if frame >= start["f1"] and b % 2 == 1 and not in_half:
        place(clap() * (0.6 if filtered else 1.0), t, pan=0.05)
    # offbeat hats
    if frame >= start["snap"] and not in_half:
        place(hat(open_=(b % 4 == 3)), t + BEAT / 2, pan=0.3)
        if frame >= start["f1"] and not filtered:
            place(hat() * 0.6, t + BEAT * 0.25, pan=-0.3)
            place(hat() * 0.6, t + BEAT * 0.75, pan=-0.3)

    # bass: eighths, ducked under the kick
    for e in range(2):
        f = note(root[0]) * (2 if e == 1 and b % 2 == 1 else 1)
        place(bass_note(f, BEAT / 2 - 0.02, 0.16 if not in_half else 0.22), t + e * BEAT / 2)

    # pluck arpeggio, sixteenths, from the snap on
    if frame >= start["snap"] and not in_half:
        seq = tones + [tones[1]]
        for s16 in range(4):
            nm = seq[(b * 4 + s16) % len(seq)]
            f = note(nm) * 2
            place(pluck(f, 0.05 if filtered else 0.07), t + s16 * BEAT / 4, pan=0.35 * (1 if s16 % 2 else -1))

# a whoosh into every wipe, and a crash-ish burst on it
for sid, n in scenes:
    if f'id: "{sid}", frames: {n}, wipe: true' in src:
        place(whoosh(0.5, 0.8, 0.4), sec(sid) - 0.4)
        n_ = int(0.9 * SR)
        tt = np.arange(n_) / SR
        place(hp(rng.standard_normal(n_), 5000) * np.exp(-tt * 5) * 0.08, sec(sid))

# snap: the scan
place(riser(t_of(104 - 60), 0.1), sec("snap", 60))
place(pop(880, 0.14), sec("snap", 110))
for k in range(3):
    place(pop(660 + 110 * k, 0.12), sec("snap", 124 + k * 7))

# the board beat: a soft thud as each card pins
for k in range(4):
    place(pop(300, 0.16), sec("f3", 18 + k * 9 + 4))
# the other beats: a blip as their rows land
for sid, cues in (("f1", [16, 24, 32]), ("f2", [48, 55, 62]), ("f4", [36, 43, 50]), ("f5", [20, 34, 48])):
    for c in cues:
        place(pop(760, 0.08), sec(sid, c))

# scale: riser into the flash, a hit on it
place(riser(t_of(58 - 20), 0.3), sec("scale", 20))
place(impact(0.8), t_of(drop_at))
place(bell_chord(["A4", "C5", "E5"], 3.0, 0.12), t_of(drop_at))

# trust: a tick per badge
for k in range(9):
    place(tick(1800 + 90 * k, 0.09), sec("trust", 34 + k * 9), pan=(k % 3 - 1) * 0.4)

# end: the groove stops; C major rings out.
place(impact(0.5), sec("end"))
place(bell_chord(["C4", "G4", "C5", "E5", "D5"], 5.0, 0.2), sec("end"))
place(pad(["C3", "G3", "C4", "E4", "D5"], DUR - sec("end"), cutoff=1600, gain=0.08, attack=0.1, release=2.2), sec("end"))

# ------------------------------------------------------------------ master
# a room: short stereo reverb on everything, mixed in lightly
ir_n = int(2.0 * SR)
irt = np.arange(ir_n) / SR
ir_l = rng.standard_normal(ir_n) * np.exp(-irt * 3.2)
ir_r = rng.standard_normal(ir_n) * np.exp(-irt * 3.2)
ir_l, ir_r = lp(ir_l, 5000), lp(ir_r, 5000)
wet = np.stack([fftconvolve(mix[:, 0], ir_l)[:N], fftconvolve(mix[:, 1], ir_r)[:N]], axis=1)
wet /= np.max(np.abs(wet)) + 1e-9
dry_peak = np.max(np.abs(mix)) + 1e-9
out = mix / dry_peak + wet * 0.16
out = np.tanh(out * 1.3) / np.tanh(1.3)
fade = int(1.2 * SR)
out[-fade:] *= np.linspace(1, 0, fade)[:, None]
out *= 0.89 / np.max(np.abs(out))

Path(OUT).parent.mkdir(parents=True, exist_ok=True)
wavfile.write(OUT, SR, (out * 32767).astype(np.int16))
print(f"{OUT} · {DUR:.1f}s · {60 / BEAT:.1f} BPM · film {TOTAL / FPS:.1f}s")
