"""Generate original, local PCM tones; no downloads or licensed samples."""
import math
import pathlib
import struct
import wave

root = pathlib.Path(__file__).resolve().parents[1] / 'assets/audio'
root.mkdir(parents=True, exist_ok=True)
rate = 22050
for name, seconds in [('hum', 4), ('chime', 2)]:
    samples = []
    for i in range(rate * seconds):
        t = i / rate
        if name == 'hum':
            value = .15 * math.sin(2 * math.pi * 110 * t) + .05 * math.sin(2 * math.pi * 165 * t)
        else:
            envelope = min(t / .01, 1) * math.exp(-4 * t) * min((seconds-t)/.05, 1)
            value = envelope * sum(a * math.sin(2 * math.pi * f * t) for f, a in [(880, .3), (2376, .12), (4400, .04)])
        samples.append(struct.pack('<h', round(value * 32767)))
    with wave.open(str(root / f'{name}.wav'), 'wb') as audio:
        audio.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
        audio.writeframes(b''.join(samples))
