// 남태평양·그 밖 기본음 "합성 뿔피리 팡파르"를 오프라인으로 합성해 WAV로 쓴다.
// 사용: node scripts/synth-horn-fanfare.mjs <output.wav>
// 외부 소리 없이 수식으로만 만든다. 난수는 고정 seed라 같은 결과 byte가 다시 나온다.
// 구성: 두 음 호른(sawtooth + square) + 낮은 패드 + 잔향(감쇠 잡음 임펄스 응답).

import { writeFileSync } from 'node:fs';

const SAMPLE_RATE = 44100;
const LENGTH_SECONDS = 4.6;
const TARGET_RMS_DB = -20;
const PEAK_LIMIT_DB = -1;
const START = 0.05;

const output = process.argv[2];
if (!output) {
  console.error('사용: node synth-horn-fanfare.mjs <output.wav>');
  process.exit(2);
}

const note = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 한 주기 파형 표. Nyquist 아래 배음만 더한 뒤 최댓값 1로 맞춘다(Web Audio 기본 파형과 같은 정규화).
const TABLE_SIZE = 8192;
function waveTable(type, frequency) {
  const table = new Float64Array(TABLE_SIZE);
  const maxHarmonic = Math.max(1, Math.floor(SAMPLE_RATE / 2 / frequency));
  for (let k = 1; k <= maxHarmonic; k += 1) {
    let amp = 0;
    if (type === 'sine') amp = k === 1 ? 1 : 0;
    else if (type === 'sawtooth') amp = (2 / (Math.PI * k)) * (k % 2 === 1 ? 1 : -1);
    else if (type === 'square') amp = k % 2 === 1 ? 4 / (Math.PI * k) : 0;
    if (amp === 0) continue;
    for (let i = 0; i < TABLE_SIZE; i += 1) table[i] += amp * Math.sin((2 * Math.PI * k * i) / TABLE_SIZE);
  }
  let peak = 0;
  for (const v of table) peak = Math.max(peak, Math.abs(v));
  if (peak > 0) for (let i = 0; i < TABLE_SIZE; i += 1) table[i] /= peak;
  return table;
}

const totalSamples = Math.round(LENGTH_SECONDS * SAMPLE_RATE);
const dry = new Float64Array(totalSamples);

// gain: t에서 0, t+att까지 선형으로 vol, t+rel까지 지수로 0.0001. t+rel+0.05에서 멈춘다.
function tone(frequency, t, { type, vol, att, rel, detune = 0 }) {
  const f = frequency * Math.pow(2, detune / 1200);
  const table = waveTable(type, f);
  const start = Math.round(t * SAMPLE_RATE);
  const stop = Math.min(totalSamples, Math.round((t + rel + 0.05) * SAMPLE_RATE));
  let phase = 0;
  const step = (f * TABLE_SIZE) / SAMPLE_RATE;
  for (let n = start; n < stop; n += 1) {
    const time = n / SAMPLE_RATE;
    let gain;
    if (time < t + att) gain = (vol * (time - t)) / att;
    else if (time < t + rel) gain = vol * Math.pow(0.0001 / vol, (time - t - att) / (rel - att));
    else gain = 0.0001;
    const i = Math.floor(phase);
    const frac = phase - i;
    const a = table[i % TABLE_SIZE];
    const b = table[(i + 1) % TABLE_SIZE];
    dry[n] += gain * (a + (b - a) * frac);
    phase = (phase + step) % TABLE_SIZE;
  }
}

function pad(frequencies, t, dur, vol) {
  for (const f of frequencies) {
    tone(f, t, { type: 'sawtooth', vol: vol * 0.5, att: dur * 0.45, rel: dur, detune: -6 });
    tone(f, t, { type: 'sawtooth', vol: vol * 0.5, att: dur * 0.45, rel: dur, detune: 6 });
  }
}

for (const [midi, offset, length] of [[55, 0, 0.5], [62, 0.32, 1.4]]) {
  tone(note(midi), START + offset, { type: 'sawtooth', vol: 0.09, att: 0.08, rel: length });
  tone(note(midi) * 1.003, START + offset, { type: 'square', vol: 0.03, att: 0.1, rel: length });
}
pad([note(43), note(50)], START + 0.3, 1.8, 0.05);

// 잔향: 2.4초 감쇠 잡음(채널 2개), Web Audio ConvolverNode의 normalize와 같은 크기 보정.
const IR_SECONDS = 2.4;
const irLength = Math.round(SAMPLE_RATE * IR_SECONDS);
const random = mulberry32(0x5ea0071c);
const ir = [new Float64Array(irLength), new Float64Array(irLength)];
let power = 0;
for (const channel of ir) {
  for (let i = 0; i < irLength; i += 1) {
    channel[i] = (random() * 2 - 1) * Math.pow(1 - i / irLength, 2.6);
    power += channel[i] * channel[i];
  }
}
power = Math.sqrt(power / (2 * irLength));
const irScale = (1 / power) * 0.00125 * (44100 / SAMPLE_RATE);

function fft(re, im, inverse) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(angle);
    const wi = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k += 1) {
        const tr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const ti = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k + len / 2] = re[i + k] - tr;
        im[i + k + len / 2] = im[i + k] - ti;
        re[i + k] += tr;
        im[i + k] += ti;
        const next = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = next;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i += 1) { re[i] /= n; im[i] /= n; }
}

let size = 1;
while (size < totalSamples + irLength) size <<= 1;
const dryRe = new Float64Array(size);
const dryIm = new Float64Array(size);
dryRe.set(dry);
fft(dryRe, dryIm, false);

const mono = new Float64Array(totalSamples);
const WET = 0.35;
const OUT_GAIN = 0.8;
for (const channel of ir) {
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  for (let i = 0; i < irLength; i += 1) re[i] = channel[i] * irScale;
  fft(re, im, false);
  for (let i = 0; i < size; i += 1) {
    const r = re[i] * dryRe[i] - im[i] * dryIm[i];
    const m = re[i] * dryIm[i] + im[i] * dryRe[i];
    re[i] = r;
    im[i] = m;
  }
  fft(re, im, true);
  // 두 채널을 평균해 mono로 만든다.
  for (let n = 0; n < totalSamples; n += 1) mono[n] += 0.5 * OUT_GAIN * (dry[n] + WET * re[n]);
}

// 앞 4초 평균 음량을 TARGET_RMS_DB로 맞추되 최댓값이 PEAK_LIMIT_DB를 넘지 않게 한다.
const window = Math.min(totalSamples, 4 * SAMPLE_RATE);
let sum = 0;
let peak = 0;
for (let n = 0; n < totalSamples; n += 1) {
  if (n < window) sum += mono[n] * mono[n];
  peak = Math.max(peak, Math.abs(mono[n]));
}
const rms = Math.sqrt(sum / window);
let scale = Math.pow(10, TARGET_RMS_DB / 20) / rms;
scale = Math.min(scale, Math.pow(10, PEAK_LIMIT_DB / 20) / peak);

// 끝 30 ms를 서서히 줄여 잘림 잡음을 없앤다.
const tail = Math.round(0.03 * SAMPLE_RATE);
const pcm = Buffer.alloc(totalSamples * 2);
for (let n = 0; n < totalSamples; n += 1) {
  const fade = n >= totalSamples - tail ? (totalSamples - n) / tail : 1;
  const value = Math.max(-1, Math.min(1, mono[n] * scale * fade));
  pcm.writeInt16LE(Math.round(value * 32767), n * 2);
}

const header = Buffer.alloc(44);
header.write('RIFF', 0, 'ascii');
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVE', 8, 'ascii');
header.write('fmt ', 12, 'ascii');
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(SAMPLE_RATE, 24);
header.writeUInt32LE(SAMPLE_RATE * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36, 'ascii');
header.writeUInt32LE(pcm.length, 40);
writeFileSync(output, Buffer.concat([header, pcm]));

const finalRmsDb = 20 * Math.log10(rms * scale);
console.log(JSON.stringify({ output, samples: totalSamples, rmsDb: Number(finalRmsDb.toFixed(2)), peakDb: Number((20 * Math.log10(peak * scale)).toFixed(2)) }));
