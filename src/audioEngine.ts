// ─── MusicGPT Audio Engine v2 ──────────────────────────────────────────────
// Generates real audio from pure math — no OfflineAudioContext needed.
// Every sample is computed directly → encoded as a valid WAV blob.

export interface MusicConfig {
  genre: string;
  mood: string;
  tempo: number;
  duration: number;
  prompt: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const SAMPLE_RATE = 44100;
const TWO_PI = 2 * Math.PI;

// ─── Musical Scales (semitone offsets from root) ────────────────────────────
const SCALES: Record<string, number[]> = {
  major:      [0, 2, 4, 5, 7, 9, 11],
  minor:      [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues:      [0, 3, 5, 6, 7, 10],
  dorian:     [0, 2, 3, 5, 7, 9, 10],
  phrygian:   [0, 1, 3, 5, 7, 8, 10],
  lydian:     [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

// ─── Chord Progressions (scale degree offsets) ─────────────────────────────
const PROGRESSIONS: Record<string, number[][]> = {
  pop:        [[0, 4, 7], [5, 9, 12], [7, 11, 14], [3, 7, 10]],
  sad:        [[0, 3, 7], [5, 8, 12], [3, 7, 10], [7, 10, 14]],
  epic:       [[0, 4, 7, 12], [5, 9, 12, 17], [7, 11, 14, 19], [3, 7, 10, 15]],
  jazz:       [[0, 4, 7, 11], [5, 9, 12, 16], [2, 5, 9, 12], [7, 11, 14, 17]],
  blues:      [[0, 4, 7, 10], [5, 9, 12, 15], [7, 11, 14, 17], [5, 9, 12, 15]],
  ambient:    [[0, 7, 12, 16], [5, 12, 17, 21], [3, 10, 15, 19], [7, 14, 19, 24]],
  electronic: [[0, 4, 7], [7, 11, 14], [5, 9, 12], [3, 7, 10]],
};

// ─── Genre Configuration ───────────────────────────────────────────────────
interface GenreConfig {
  scale: string;
  progression: string;
  rootMidi: number;
  wave: 'sine' | 'saw' | 'square' | 'triangle';
  melodyWave: 'sine' | 'saw' | 'square' | 'triangle';
  bassWave: 'sine' | 'saw' | 'square' | 'triangle';
  hasDrums: boolean;
  hasBass: boolean;
  hasArp: boolean;
  chordGain: number;
  melodyGain: number;
  bassGain: number;
  drumGain: number;
  arpGain: number;
  filterCutoff: number;
  reverbMix: number;
  attackMs: number;
  releaseMs: number;
}

const GENRES: Record<string, GenreConfig> = {
  electronic: {
    scale: 'minor', progression: 'electronic', rootMidi: 48,
    wave: 'saw', melodyWave: 'square', bassWave: 'saw',
    hasDrums: true, hasBass: true, hasArp: true,
    chordGain: 0.12, melodyGain: 0.15, bassGain: 0.2, drumGain: 0.35, arpGain: 0.08,
    filterCutoff: 0.4, reverbMix: 0.15, attackMs: 10, releaseMs: 80,
  },
  pop: {
    scale: 'major', progression: 'pop', rootMidi: 48,
    wave: 'triangle', melodyWave: 'sine', bassWave: 'sine',
    hasDrums: true, hasBass: true, hasArp: false,
    chordGain: 0.14, melodyGain: 0.18, bassGain: 0.15, drumGain: 0.3, arpGain: 0,
    filterCutoff: 0.6, reverbMix: 0.2, attackMs: 30, releaseMs: 200,
  },
  rock: {
    scale: 'pentatonic', progression: 'blues', rootMidi: 45,
    wave: 'saw', melodyWave: 'saw', bassWave: 'square',
    hasDrums: true, hasBass: true, hasArp: false,
    chordGain: 0.15, melodyGain: 0.16, bassGain: 0.22, drumGain: 0.35, arpGain: 0,
    filterCutoff: 0.35, reverbMix: 0.1, attackMs: 5, releaseMs: 60,
  },
  classical: {
    scale: 'major', progression: 'pop', rootMidi: 48,
    wave: 'sine', melodyWave: 'sine', bassWave: 'sine',
    hasDrums: false, hasBass: false, hasArp: true,
    chordGain: 0.15, melodyGain: 0.2, bassGain: 0, drumGain: 0, arpGain: 0.12,
    filterCutoff: 0.8, reverbMix: 0.4, attackMs: 80, releaseMs: 500,
  },
  jazz: {
    scale: 'dorian', progression: 'jazz', rootMidi: 46,
    wave: 'sine', melodyWave: 'triangle', bassWave: 'sine',
    hasDrums: true, hasBass: true, hasArp: false,
    chordGain: 0.12, melodyGain: 0.18, bassGain: 0.15, drumGain: 0.2, arpGain: 0,
    filterCutoff: 0.7, reverbMix: 0.3, attackMs: 50, releaseMs: 300,
  },
  'hip-hop': {
    scale: 'minor', progression: 'blues', rootMidi: 40,
    wave: 'square', melodyWave: 'triangle', bassWave: 'sine',
    hasDrums: true, hasBass: true, hasArp: false,
    chordGain: 0.08, melodyGain: 0.14, bassGain: 0.25, drumGain: 0.4, arpGain: 0,
    filterCutoff: 0.3, reverbMix: 0.15, attackMs: 10, releaseMs: 100,
  },
  ambient: {
    scale: 'lydian', progression: 'ambient', rootMidi: 48,
    wave: 'sine', melodyWave: 'sine', bassWave: 'sine',
    hasDrums: false, hasBass: false, hasArp: true,
    chordGain: 0.12, melodyGain: 0.1, bassGain: 0, drumGain: 0, arpGain: 0.15,
    filterCutoff: 0.5, reverbMix: 0.5, attackMs: 300, releaseMs: 800,
  },
  lofi: {
    scale: 'minor', progression: 'jazz', rootMidi: 45,
    wave: 'triangle', melodyWave: 'sine', bassWave: 'sine',
    hasDrums: true, hasBass: true, hasArp: true,
    chordGain: 0.1, melodyGain: 0.14, bassGain: 0.12, drumGain: 0.2, arpGain: 0.08,
    filterCutoff: 0.25, reverbMix: 0.35, attackMs: 40, releaseMs: 300,
  },
  synthwave: {
    scale: 'minor', progression: 'electronic', rootMidi: 45,
    wave: 'saw', melodyWave: 'square', bassWave: 'saw',
    hasDrums: true, hasBass: true, hasArp: true,
    chordGain: 0.12, melodyGain: 0.15, bassGain: 0.2, drumGain: 0.3, arpGain: 0.1,
    filterCutoff: 0.45, reverbMix: 0.25, attackMs: 15, releaseMs: 120,
  },
  orchestral: {
    scale: 'major', progression: 'epic', rootMidi: 48,
    wave: 'sine', melodyWave: 'triangle', bassWave: 'sine',
    hasDrums: true, hasBass: true, hasArp: true,
    chordGain: 0.14, melodyGain: 0.16, bassGain: 0.12, drumGain: 0.15, arpGain: 0.1,
    filterCutoff: 0.7, reverbMix: 0.4, attackMs: 100, releaseMs: 600,
  },
  folk: {
    scale: 'major', progression: 'pop', rootMidi: 50,
    wave: 'triangle', melodyWave: 'triangle', bassWave: 'sine',
    hasDrums: false, hasBass: false, hasArp: true,
    chordGain: 0.16, melodyGain: 0.2, bassGain: 0, drumGain: 0, arpGain: 0.12,
    filterCutoff: 0.6, reverbMix: 0.2, attackMs: 20, releaseMs: 200,
  },
  blues: {
    scale: 'blues', progression: 'blues', rootMidi: 42,
    wave: 'saw', melodyWave: 'triangle', bassWave: 'sine',
    hasDrums: true, hasBass: true, hasArp: false,
    chordGain: 0.13, melodyGain: 0.17, bassGain: 0.16, drumGain: 0.25, arpGain: 0,
    filterCutoff: 0.45, reverbMix: 0.25, attackMs: 30, releaseMs: 250,
  },
};

// ─── Mood Modifiers ────────────────────────────────────────────────────────
interface MoodMod {
  tempoMul: number;
  pitchShift: number;
  gainMul: number;
  filterMul: number;
  scaleOverride?: string;
}

const MOODS: Record<string, MoodMod> = {
  uplifting:   { tempoMul: 1.1, pitchShift: 2,  gainMul: 1.1, filterMul: 1.3 },
  melancholic: { tempoMul: 0.8, pitchShift: -2, gainMul: 0.85, filterMul: 0.7, scaleOverride: 'minor' },
  energetic:   { tempoMul: 1.3, pitchShift: 3,  gainMul: 1.15, filterMul: 1.4 },
  calm:        { tempoMul: 0.7, pitchShift: 0,  gainMul: 0.75, filterMul: 0.6 },
  dark:        { tempoMul: 0.85, pitchShift: -3, gainMul: 0.9, filterMul: 0.5, scaleOverride: 'phrygian' },
  romantic:    { tempoMul: 0.85, pitchShift: 0,  gainMul: 0.9, filterMul: 0.85, scaleOverride: 'lydian' },
  epic:        { tempoMul: 1.0, pitchShift: 0,   gainMul: 1.2, filterMul: 1.2 },
  mysterious:  { tempoMul: 0.9, pitchShift: -1,  gainMul: 0.8, filterMul: 0.65, scaleOverride: 'phrygian' },
  happy:       { tempoMul: 1.15, pitchShift: 2,  gainMul: 1.0, filterMul: 1.3, scaleOverride: 'major' },
  sad:         { tempoMul: 0.75, pitchShift: -2, gainMul: 0.8, filterMul: 0.6, scaleOverride: 'minor' },
  focused:     { tempoMul: 1.0, pitchShift: 0,   gainMul: 0.85, filterMul: 0.9 },
};

// ─── Helpers ───────────────────────────────────────────────────────────────
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Oscillator functions ──────────────────────────────────────────────────
function oscSine(phase: number): number {
  return Math.sin(phase);
}

function oscSaw(phase: number): number {
  const t = (phase / TWO_PI) % 1;
  return 2 * t - 1;
}

function oscSquare(phase: number): number {
  return Math.sin(phase) >= 0 ? 0.6 : -0.6;
}

function oscTriangle(phase: number): number {
  const t = (phase / TWO_PI) % 1;
  return 4 * Math.abs(t - 0.5) - 1;
}

function oscillator(type: string, phase: number): number {
  switch (type) {
    case 'saw': return oscSaw(phase);
    case 'square': return oscSquare(phase);
    case 'triangle': return oscTriangle(phase);
    default: return oscSine(phase);
  }
}

// ─── Simple low-pass filter (one-pole) ─────────────────────────────────────
function applyLowPass(samples: Float32Array, cutoff: number): void {
  // cutoff: 0..1 (0 = fully closed, 1 = fully open)
  const rc = 1.0 / (cutoff * SAMPLE_RATE * 0.5 * TWO_PI + 0.0001);
  const dt = 1.0 / SAMPLE_RATE;
  const alpha = dt / (rc + dt);
  let prev = 0;
  for (let i = 0; i < samples.length; i++) {
    prev += alpha * (samples[i] - prev);
    samples[i] = prev;
  }
}

// ─── Simple reverb (feedback delay) ───────────────────────────────────────
function applyReverb(samples: Float32Array, mix: number): void {
  if (mix <= 0) return;
  const delays = [
    Math.floor(0.0297 * SAMPLE_RATE),
    Math.floor(0.0371 * SAMPLE_RATE),
    Math.floor(0.0411 * SAMPLE_RATE),
    Math.floor(0.0437 * SAMPLE_RATE),
  ];
  const feedback = 0.5;
  const buffers = delays.map(d => new Float32Array(d));
  const indices = delays.map(() => 0);

  for (let i = 0; i < samples.length; i++) {
    let wet = 0;
    for (let d = 0; d < delays.length; d++) {
      const buf = buffers[d];
      const idx = indices[d];
      const delayed = buf[idx];
      wet += delayed;
      buf[idx] = samples[i] + delayed * feedback;
      indices[d] = (idx + 1) % delays.length === 0 ? 0 : idx + 1;
      indices[d] = (idx + 1) % buf.length;
    }
    wet /= delays.length;
    samples[i] = samples[i] * (1 - mix) + wet * mix;
  }
}

// ─── Envelope ──────────────────────────────────────────────────────────────
function envelope(
  sampleIndex: number,
  noteStartSample: number,
  noteLengthSamples: number,
  attackSamples: number,
  releaseSamples: number,
): number {
  const pos = sampleIndex - noteStartSample;
  if (pos < 0 || pos >= noteLengthSamples) return 0;
  // Attack
  if (pos < attackSamples) return pos / attackSamples;
  // Sustain
  const releaseStart = noteLengthSamples - releaseSamples;
  if (pos < releaseStart) return 1;
  // Release
  return Math.max(0, 1 - (pos - releaseStart) / releaseSamples);
}

// ─── Drum synthesizers ─────────────────────────────────────────────────────
function renderKick(buffer: Float32Array, startSample: number, gain: number): void {
  const len = Math.floor(SAMPLE_RATE * 0.15);
  for (let i = 0; i < len && startSample + i < buffer.length; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 150 * Math.exp(-t * 30);
    const env = Math.exp(-t * 15);
    buffer[startSample + i] += Math.sin(TWO_PI * freq * t) * env * gain;
  }
}

function renderSnare(buffer: Float32Array, startSample: number, gain: number, rand: () => number): void {
  const len = Math.floor(SAMPLE_RATE * 0.12);
  for (let i = 0; i < len && startSample + i < buffer.length; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 20);
    const tone = Math.sin(TWO_PI * 200 * t) * 0.4;
    const noise = (rand() * 2 - 1) * 0.6;
    buffer[startSample + i] += (tone + noise) * env * gain;
  }
}

function renderHihat(buffer: Float32Array, startSample: number, gain: number, rand: () => number, open: boolean): void {
  const len = Math.floor(SAMPLE_RATE * (open ? 0.15 : 0.03));
  for (let i = 0; i < len && startSample + i < buffer.length; i++) {
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * (open ? 15 : 80));
    buffer[startSample + i] += (rand() * 2 - 1) * env * gain * 0.3;
  }
}

// ─── Build scale note frequencies ──────────────────────────────────────────
function buildScaleFreqs(rootMidi: number, scaleName: string, octaves: number): number[] {
  const intervals = SCALES[scaleName] || SCALES.major;
  const freqs: number[] = [];
  for (let oct = 0; oct < octaves; oct++) {
    for (const interval of intervals) {
      freqs.push(midiToFreq(rootMidi + oct * 12 + interval));
    }
  }
  return freqs;
}

// ─── Main generation ──────────────────────────────────────────────────────
export async function generateMusic(config: MusicConfig): Promise<Blob> {
  const { genre, mood, tempo, duration } = config;

  const gc = GENRES[genre] || GENRES.electronic;
  const mc = MOODS[mood] || MOODS.uplifting;

  const effectiveTempo = tempo * mc.tempoMul;
  const rootMidi = gc.rootMidi + mc.pitchShift;
  const scaleName = mc.scaleOverride || gc.scale;
  const progKey = gc.progression in PROGRESSIONS ? gc.progression : 'electronic';
  const progression = PROGRESSIONS[progKey];

  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const beatSamples = Math.floor((60 / effectiveTempo) * SAMPLE_RATE);
  const barSamples = beatSamples * 4;

  const attackSamples = Math.floor(gc.attackMs * SAMPLE_RATE / 1000);
  const releaseSamples = Math.floor(gc.releaseMs * SAMPLE_RATE / 1000);

  const scaleFreqs = buildScaleFreqs(rootMidi, scaleName, 3);
  const bassFreqs = buildScaleFreqs(rootMidi - 12, scaleName, 2);

  // Use a seed from the prompt for reproducibility
  let seed = 42;
  for (let i = 0; i < config.prompt.length; i++) {
    seed = (seed * 31 + config.prompt.charCodeAt(i)) & 0x7fffffff;
  }
  const rand = seededRandom(seed);

  // Separate buffers for mixing
  const chordBuf = new Float32Array(totalSamples);
  const melodyBuf = new Float32Array(totalSamples);
  const bassBuf = new Float32Array(totalSamples);
  const drumBuf = new Float32Array(totalSamples);
  const arpBuf = new Float32Array(totalSamples);

  // ─── Generate chords ───────────────────────────────────────────────────
  let barStart = 0;
  let barIndex = 0;
  while (barStart < totalSamples) {
    const chord = progression[barIndex % progression.length];
    const chordFreqs = chord.map(interval => {
      const idx = Math.min(interval, scaleFreqs.length - 1);
      return scaleFreqs[Math.max(0, idx)];
    });

    for (const freq of chordFreqs) {
      const noteLen = Math.min(barSamples, totalSamples - barStart);
      for (let i = 0; i < noteLen; i++) {
        const sampleIdx = barStart + i;
        if (sampleIdx >= totalSamples) break;
        const env = envelope(sampleIdx, barStart, noteLen, attackSamples, releaseSamples);
        const phase = TWO_PI * freq * sampleIdx / SAMPLE_RATE;
        chordBuf[sampleIdx] += oscillator(gc.wave, phase) * env * gc.chordGain * mc.gainMul;
      }
    }

    barStart += barSamples;
    barIndex++;
  }

  // ─── Generate melody ──────────────────────────────────────────────────
  {
    let noteIdx = Math.floor(scaleFreqs.length * 0.4);
    let pos = 0;
    const stepSamples = Math.floor(beatSamples * 0.5); // eighth notes
    while (pos < totalSamples) {
      const freq = scaleFreqs[noteIdx];
      const noteLen = Math.min(stepSamples, totalSamples - pos);
      // Randomize note duration feel
      const playLen = Math.floor(noteLen * (0.6 + rand() * 0.35));

      // Sometimes rest
      if (rand() > 0.15) {
        for (let i = 0; i < playLen; i++) {
          const sampleIdx = pos + i;
          if (sampleIdx >= totalSamples) break;
          const env = envelope(sampleIdx, pos, playLen, Math.min(attackSamples, playLen / 3), Math.min(releaseSamples, playLen / 2));
          const phase = TWO_PI * freq * sampleIdx / SAMPLE_RATE;
          // Add slight vibrato
          const vibrato = Math.sin(TWO_PI * 5 * sampleIdx / SAMPLE_RATE) * 0.003;
          melodyBuf[sampleIdx] += oscillator(gc.melodyWave, phase * (1 + vibrato)) * env * gc.melodyGain * mc.gainMul;
        }
      }

      // Random walk
      const step = Math.floor(rand() * 3) - 1; // -1, 0, or 1
      noteIdx = Math.max(0, Math.min(scaleFreqs.length - 1, noteIdx + step));

      // Occasionally jump
      if (rand() > 0.85) {
        noteIdx = Math.max(0, Math.min(scaleFreqs.length - 1, noteIdx + (rand() > 0.5 ? 3 : -3)));
      }

      pos += stepSamples;
    }
  }

  // ─── Generate bass ────────────────────────────────────────────────────
  if (gc.hasBass) {
    barStart = 0;
    barIndex = 0;
    while (barStart < totalSamples) {
      const chord = progression[barIndex % progression.length];
      const bassNote = bassFreqs[Math.min(Math.max(0, chord[0]), bassFreqs.length - 1)];

      for (let beat = 0; beat < 4; beat++) {
        const beatStart = barStart + beat * beatSamples;
        if (beatStart >= totalSamples) break;

        // Not every beat has bass
        if (rand() > 0.25) {
          const noteLen = Math.min(Math.floor(beatSamples * 0.8), totalSamples - beatStart);
          for (let i = 0; i < noteLen; i++) {
            const sampleIdx = beatStart + i;
            if (sampleIdx >= totalSamples) break;
            const env = envelope(sampleIdx, beatStart, noteLen, Math.floor(SAMPLE_RATE * 0.01), Math.floor(SAMPLE_RATE * 0.05));
            const phase = TWO_PI * bassNote * sampleIdx / SAMPLE_RATE;
            bassBuf[sampleIdx] += oscillator(gc.bassWave, phase) * env * gc.bassGain * mc.gainMul;
          }
        }
      }

      barStart += barSamples;
      barIndex++;
    }
  }

  // ─── Generate drums ───────────────────────────────────────────────────
  if (gc.hasDrums) {
    let pos = 0;
    let beat = 0;
    while (pos < totalSamples) {
      const beatInBar = beat % 4;

      // Kick on 1 and 3
      if (beatInBar === 0 || beatInBar === 2) {
        renderKick(drumBuf, pos, gc.drumGain * mc.gainMul);
      }
      // Snare on 2 and 4
      if (beatInBar === 1 || beatInBar === 3) {
        renderSnare(drumBuf, pos, gc.drumGain * mc.gainMul * 0.7, rand);
      }
      // Hi-hat on every beat
      renderHihat(drumBuf, pos, gc.drumGain * mc.gainMul * 0.5, rand, false);

      // Off-beat hi-hat
      const halfBeat = pos + Math.floor(beatSamples / 2);
      if (halfBeat < totalSamples) {
        renderHihat(drumBuf, halfBeat, gc.drumGain * mc.gainMul * 0.25, rand, rand() > 0.9);
      }

      // Extra 16th notes for electronic/synthwave/rock
      if (['electronic', 'synthwave', 'rock'].includes(genre)) {
        const q1 = pos + Math.floor(beatSamples * 0.25);
        const q3 = pos + Math.floor(beatSamples * 0.75);
        if (q1 < totalSamples) renderHihat(drumBuf, q1, gc.drumGain * mc.gainMul * 0.12, rand, false);
        if (q3 < totalSamples) renderHihat(drumBuf, q3, gc.drumGain * mc.gainMul * 0.12, rand, false);
      }

      pos += beatSamples;
      beat++;
    }
  }

  // ─── Generate arpeggio ────────────────────────────────────────────────
  if (gc.hasArp) {
    barStart = 0;
    barIndex = 0;
    const arpStepSamples = Math.floor(beatSamples * 0.25); // 16th note arps
    while (barStart < totalSamples) {
      const chord = progression[barIndex % progression.length];
      const arpFreqs = chord.map(interval => {
        const idx = Math.min(interval, scaleFreqs.length - 1);
        return scaleFreqs[Math.max(0, idx)];
      });

      for (let step = 0; step < 16 && barStart + step * arpStepSamples < totalSamples; step++) {
        const freq = arpFreqs[step % arpFreqs.length];
        const noteStart = barStart + step * arpStepSamples;
        const noteLen = Math.min(arpStepSamples, totalSamples - noteStart);
        const playLen = Math.floor(noteLen * 0.7);

        for (let i = 0; i < playLen; i++) {
          const sampleIdx = noteStart + i;
          if (sampleIdx >= totalSamples) break;
          const env = envelope(sampleIdx, noteStart, playLen, Math.floor(playLen * 0.1), Math.floor(playLen * 0.3));
          const phase = TWO_PI * freq * 2 * sampleIdx / SAMPLE_RATE; // one octave up
          arpBuf[sampleIdx] += oscSine(phase) * env * gc.arpGain * mc.gainMul;
        }
      }

      barStart += barSamples;
      barIndex++;
    }
  }

  // ─── Apply filters ────────────────────────────────────────────────────
  const filterCutoff = gc.filterCutoff * mc.filterMul;
  applyLowPass(chordBuf, Math.min(1, filterCutoff));
  applyLowPass(bassBuf, Math.min(1, filterCutoff * 0.6));

  // ─── Mix all layers ───────────────────────────────────────────────────
  const mixL = new Float32Array(totalSamples);
  const mixR = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const chord = chordBuf[i];
    const melody = melodyBuf[i];
    const bass = bassBuf[i];
    const drum = drumBuf[i];
    const arp = arpBuf[i];

    // Simple stereo spread
    mixL[i] = chord * 0.7 + melody * 0.4 + bass + drum * 0.8 + arp * 0.6;
    mixR[i] = chord * 0.7 + melody * 0.6 + bass + drum * 0.8 + arp * 0.4;
  }

  // ─── Apply reverb ────────────────────────────────────────────────────
  applyReverb(mixL, gc.reverbMix);
  applyReverb(mixR, gc.reverbMix);

  // ─── Fade in/out ──────────────────────────────────────────────────────
  const fadeSamples = Math.floor(SAMPLE_RATE * 0.3);
  for (let i = 0; i < fadeSamples && i < totalSamples; i++) {
    const fade = i / fadeSamples;
    mixL[i] *= fade;
    mixR[i] *= fade;
  }
  for (let i = 0; i < fadeSamples && i < totalSamples; i++) {
    const idx = totalSamples - 1 - i;
    const fade = i / fadeSamples;
    mixL[idx] *= fade;
    mixR[idx] *= fade;
  }

  // ─── Normalize ────────────────────────────────────────────────────────
  let peak = 0;
  for (let i = 0; i < totalSamples; i++) {
    peak = Math.max(peak, Math.abs(mixL[i]), Math.abs(mixR[i]));
  }
  if (peak > 0) {
    const normGain = 0.85 / peak;
    for (let i = 0; i < totalSamples; i++) {
      mixL[i] *= normGain;
      mixR[i] *= normGain;
    }
  }

  // ─── Encode to WAV ────────────────────────────────────────────────────
  return encodeWav(mixL, mixR, SAMPLE_RATE);
}

// ─── WAV Encoder ───────────────────────────────────────────────────────────
function encodeWav(left: Float32Array, right: Float32Array, sampleRate: number): Blob {
  const numChannels = 2;
  const bitsPerSample = 16;
  const numSamples = left.length;
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, headerSize - 8 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);         // chunk size
  view.setUint16(20, 1, true);          // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave samples
  let offset = headerSize;
  for (let i = 0; i < numSamples; i++) {
    // Clamp and convert to 16-bit
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(offset, l * 0x7FFF, true);
    offset += 2;
    view.setInt16(offset, r * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
