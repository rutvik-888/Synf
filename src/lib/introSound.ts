/**
 * Team SYNƒ — Cinematic Universe Sound Engine
 * Procedural Web Audio soundscape for the 10-scene intro.
 * No external files. Entirely synthesized.
 *
 * Timeline (~18s):
 *  0.0s  SCENE 0 — THE VOID: deep ambient drone, distant pulses
 *  2.5s  SCENE 1 — THE SIGNAL: electronic pulses, filter sweeps, blips
 *  5.0s  SCENE 2 — CITY AWAKENS: low rhythmic pulse, metallic textures
 *  7.0s  SCENE 3 — CULTURE IGNITES: percussion builds, rhythmic energy
 *  9.0s  SCENE 4 — EVENT WORLD BUILD: rising tension, sub-bass, snare roll
 * 10.5s SCENE 5 — TAGLINE REVEAL: near silence → single impact
 * 11.5s SCENE 6 — SYNF REVEAL: anticipation → warm pad chord
 * 12.5s SCENE 7 — THE DROP: massive electronic drop, full spectrum
 * 14.5s SCENE 8 — UNIVERSE EXPANDS: polished electronic atmosphere
 * 16.5s SCENE 9 — WEBSITE TRANSITION: elegant whoosh, resolve
 * 18.0s End
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return ctx;
}

function noiseBuffer(audio: AudioContext, duration: number): AudioBuffer {
  const len = Math.floor(audio.sampleRate * duration);
  const buf = audio.createBuffer(1, len, audio.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function makeReverb(audio: AudioContext, duration: number, decay: number): ConvolverNode {
  const len = Math.floor(audio.sampleRate * duration);
  const impulse = audio.createBuffer(2, len, audio.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  const conv = audio.createConvolver();
  conv.buffer = impulse;
  return conv;
}

export function playIntroSound(volume = 0.38): void {
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === 'suspended') audio.resume();

  const now = audio.currentTime;
  const master = audio.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(volume, now + 0.3);
  master.gain.setValueAtTime(volume, now + 17.0);
  master.gain.linearRampToValueAtTime(0, now + 18.0);
  master.connect(audio.destination);

  const reverb = makeReverb(audio, 4.0, 2.0);
  const reverbGain = audio.createGain();
  reverbGain.gain.value = 0.3;
  reverb.connect(reverbGain);
  reverbGain.connect(master);

  // === SCENE 0: THE VOID (0s → 2.5s) ===
  const voidDrone = audio.createOscillator();
  const voidDroneGain = audio.createGain();
  const voidDroneFilter = audio.createBiquadFilter();
  voidDrone.type = 'sine';
  voidDrone.frequency.setValueAtTime(48, now);
  voidDroneFilter.type = 'lowpass';
  voidDroneFilter.frequency.value = 120;
  voidDroneGain.gain.setValueAtTime(0, now);
  voidDroneGain.gain.linearRampToValueAtTime(0.3, now + 2.0);
  voidDroneGain.gain.setValueAtTime(0.3, now + 16.5);
  voidDroneGain.gain.linearRampToValueAtTime(0, now + 18.0);
  voidDrone.connect(voidDroneFilter);
  voidDroneFilter.connect(voidDroneGain);
  voidDroneGain.connect(master);
  voidDrone.start(now);
  voidDrone.stop(now + 18.2);

  const voidNoise = audio.createBufferSource();
  voidNoise.buffer = noiseBuffer(audio, 3);
  const voidNoiseFilter = audio.createBiquadFilter();
  voidNoiseFilter.type = 'bandpass';
  voidNoiseFilter.frequency.value = 800;
  voidNoiseFilter.Q.value = 0.3;
  const voidNoiseGain = audio.createGain();
  voidNoiseGain.gain.setValueAtTime(0, now);
  voidNoiseGain.gain.linearRampToValueAtTime(0.02, now + 1.0);
  voidNoiseGain.gain.linearRampToValueAtTime(0, now + 2.5);
  voidNoise.connect(voidNoiseFilter);
  voidNoiseFilter.connect(voidNoiseGain);
  voidNoiseGain.connect(master);
  voidNoise.start(now);
  voidNoise.stop(now + 3);

  for (let i = 0; i < 3; i++) {
    const t = now + 0.8 + i * 0.6;
    const pulse = audio.createOscillator();
    const pulseGain = audio.createGain();
    const pulseFilter = audio.createBiquadFilter();
    pulse.type = 'sine';
    pulse.frequency.setValueAtTime(80, t);
    pulseFilter.type = 'lowpass';
    pulseFilter.frequency.value = 200;
    pulseGain.gain.setValueAtTime(0, t);
    pulseGain.gain.linearRampToValueAtTime(0.15, t + 0.02);
    pulseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    pulse.connect(pulseFilter);
    pulseFilter.connect(pulseGain);
    pulseGain.connect(master);
    pulseGain.connect(reverb);
    pulse.start(t);
    pulse.stop(t + 0.5);
  }

  // === SCENE 1: THE SIGNAL (2.5s → 5s) ===
  for (let i = 0; i < 5; i++) {
    const t = now + 2.5 + i * 0.45;
    const sig = audio.createOscillator();
    const sigGain = audio.createGain();
    const sigFilter = audio.createBiquadFilter();
    sig.type = 'sine';
    sig.frequency.setValueAtTime(400 + i * 120, t);
    sig.frequency.exponentialRampToValueAtTime(200 + i * 60, t + 0.2);
    sigFilter.type = 'bandpass';
    sigFilter.frequency.value = 800 + i * 400;
    sigFilter.Q.value = 10;
    sigGain.gain.setValueAtTime(0, t);
    sigGain.gain.linearRampToValueAtTime(0.1, t + 0.01);
    sigGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    sig.connect(sigFilter);
    sigFilter.connect(sigGain);
    sigGain.connect(master);
    sigGain.connect(reverb);
    sig.start(t);
    sig.stop(t + 0.35);
  }

  const sweep = audio.createBufferSource();
  sweep.buffer = noiseBuffer(audio, 2.5);
  const sweepFilter = audio.createBiquadFilter();
  sweepFilter.type = 'bandpass';
  sweepFilter.frequency.setValueAtTime(300, now + 2.5);
  sweepFilter.frequency.exponentialRampToValueAtTime(6000, now + 4.5);
  sweepFilter.Q.value = 3;
  const sweepGain = audio.createGain();
  sweepGain.gain.setValueAtTime(0, now + 2.5);
  sweepGain.gain.linearRampToValueAtTime(0.04, now + 3.5);
  sweepGain.gain.linearRampToValueAtTime(0, now + 4.8);
  sweep.connect(sweepFilter);
  sweepFilter.connect(sweepGain);
  sweepGain.connect(master);
  sweep.start(now + 2.5);
  sweep.stop(now + 5);

  // === SCENE 2: CITY AWAKENS (5s → 7s) ===
  const cityDrone = audio.createOscillator();
  const cityDroneGain = audio.createGain();
  cityDrone.type = 'sawtooth';
  cityDrone.frequency.value = 65;
  const cityDroneFilter = audio.createBiquadFilter();
  cityDroneFilter.type = 'lowpass';
  cityDroneFilter.frequency.value = 300;
  cityDroneFilter.Q.value = 5;
  cityDroneGain.gain.setValueAtTime(0, now + 5.0);
  cityDroneGain.gain.linearRampToValueAtTime(0.12, now + 6.0);
  cityDroneGain.gain.setValueAtTime(0.12, now + 6.5);
  cityDroneGain.gain.linearRampToValueAtTime(0, now + 7.0);
  cityDrone.connect(cityDroneFilter);
  cityDroneFilter.connect(cityDroneGain);
  cityDroneGain.connect(master);
  cityDrone.start(now + 5.0);
  cityDrone.stop(now + 7.2);

  for (let i = 0; i < 5; i++) {
    const t = now + 5.0 + i * 0.4;
    const kick = audio.createOscillator();
    const kickGain = audio.createGain();
    kick.type = 'sine';
    kick.frequency.setValueAtTime(100, t);
    kick.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    kickGain.gain.setValueAtTime(0, t);
    kickGain.gain.linearRampToValueAtTime(0.2, t + 0.005);
    kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    kick.connect(kickGain);
    kickGain.connect(master);
    kick.start(t);
    kick.stop(t + 0.2);
  }

  for (let i = 0; i < 3; i++) {
    const t = now + 5.5 + i * 0.5;
    const met = audio.createOscillator();
    const metGain = audio.createGain();
    const metMod = audio.createOscillator();
    const metModGain = audio.createGain();
    met.type = 'sine';
    met.frequency.setValueAtTime(600 + i * 200, t);
    metMod.type = 'sine';
    metMod.frequency.setValueAtTime(1200 + i * 300, t);
    metModGain.gain.setValueAtTime(400, t);
    metModGain.gain.exponentialRampToValueAtTime(0, t + 0.5);
    metMod.connect(metModGain);
    metModGain.connect(met.frequency);
    metGain.gain.setValueAtTime(0, t);
    metGain.gain.linearRampToValueAtTime(0.08, t + 0.01);
    metGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    met.connect(metGain);
    metGain.connect(master);
    metGain.connect(reverb);
    met.start(t);
    met.stop(t + 0.7);
    metMod.start(t);
    metMod.stop(t + 0.7);
  }

  // === SCENE 3: CULTURE IGNITES (7s → 9s) ===
  for (let i = 0; i < 8; i++) {
    const t = now + 7.0 + i * 0.25;
    const hat = audio.createBufferSource();
    hat.buffer = noiseBuffer(audio, 0.05);
    const hatFilter = audio.createBiquadFilter();
    hatFilter.type = 'highpass';
    hatFilter.frequency.value = 6000;
    const hatGain = audio.createGain();
    hatGain.gain.setValueAtTime(0.06, t);
    hatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    hat.connect(hatFilter);
    hatFilter.connect(hatGain);
    hatGain.connect(master);
    hat.start(t);
    hat.stop(t + 0.05);
  }

  for (let i = 0; i < 2; i++) {
    const t = now + 7.5 + i * 1.0;
    const clap = audio.createBufferSource();
    clap.buffer = noiseBuffer(audio, 0.15);
    const clapFilter = audio.createBiquadFilter();
    clapFilter.type = 'bandpass';
    clapFilter.frequency.value = 2000;
    clapFilter.Q.value = 2;
    const clapGain = audio.createGain();
    clapGain.gain.setValueAtTime(0.12, t);
    clapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    clap.connect(clapFilter);
    clapFilter.connect(clapGain);
    clapGain.connect(master);
    clapGain.connect(reverb);
    clap.start(t);
    clap.stop(t + 0.15);
  }

  const riseSynth = audio.createOscillator();
  const riseSynthGain = audio.createGain();
  const riseSynthFilter = audio.createBiquadFilter();
  riseSynth.type = 'sawtooth';
  riseSynth.frequency.setValueAtTime(220, now + 7.0);
  riseSynth.frequency.linearRampToValueAtTime(440, now + 9.0);
  riseSynthFilter.type = 'lowpass';
  riseSynthFilter.frequency.setValueAtTime(500, now + 7.0);
  riseSynthFilter.frequency.exponentialRampToValueAtTime(2000, now + 9.0);
  riseSynthFilter.Q.value = 3;
  riseSynthGain.gain.setValueAtTime(0, now + 7.0);
  riseSynthGain.gain.linearRampToValueAtTime(0.06, now + 8.0);
  riseSynthGain.gain.linearRampToValueAtTime(0, now + 9.0);
  riseSynth.connect(riseSynthFilter);
  riseSynthFilter.connect(riseSynthGain);
  riseSynthGain.connect(master);
  riseSynth.start(now + 7.0);
  riseSynth.stop(now + 9.2);

  // === SCENE 4: EVENT WORLD BUILD (9s → 10.5s) ===
  const subBass = audio.createOscillator();
  const subBassGain = audio.createGain();
  subBass.type = 'sine';
  subBass.frequency.setValueAtTime(50, now + 9.0);
  subBass.frequency.linearRampToValueAtTime(40, now + 10.5);
  subBassGain.gain.setValueAtTime(0, now + 9.0);
  subBassGain.gain.linearRampToValueAtTime(0.25, now + 10.0);
  subBassGain.gain.linearRampToValueAtTime(0, now + 10.5);
  subBass.connect(subBassGain);
  subBassGain.connect(master);
  subBass.start(now + 9.0);
  subBass.stop(now + 10.7);

  for (let i = 0; i < 10; i++) {
    const t = now + 9.0 + i * 0.15;
    const snare = audio.createBufferSource();
    snare.buffer = noiseBuffer(audio, 0.08);
    const snareFilter = audio.createBiquadFilter();
    snareFilter.type = 'bandpass';
    snareFilter.frequency.value = 3000;
    snareFilter.Q.value = 3;
    const snareGain = audio.createGain();
    snareGain.gain.setValueAtTime(0.04 + i * 0.008, t);
    snareGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    snare.connect(snareFilter);
    snareFilter.connect(snareGain);
    snareGain.connect(master);
    snare.start(t);
    snare.stop(t + 0.08);
  }

  const eventRiser = audio.createBufferSource();
  eventRiser.buffer = noiseBuffer(audio, 1.5);
  const eventRiserFilter = audio.createBiquadFilter();
  eventRiserFilter.type = 'highpass';
  eventRiserFilter.frequency.setValueAtTime(200, now + 9.0);
  eventRiserFilter.frequency.exponentialRampToValueAtTime(8000, now + 10.4);
  const eventRiserGain = audio.createGain();
  eventRiserGain.gain.setValueAtTime(0, now + 9.0);
  eventRiserGain.gain.linearRampToValueAtTime(0.1, now + 10.3);
  eventRiserGain.gain.exponentialRampToValueAtTime(0.001, now + 10.5);
  eventRiser.connect(eventRiserFilter);
  eventRiserFilter.connect(eventRiserGain);
  eventRiserGain.connect(master);
  eventRiser.start(now + 9.0);
  eventRiser.stop(now + 10.7);

  // === SCENE 5: TAGLINE REVEAL (10.5s → 11.5s) ===
  const tagImpact = audio.createOscillator();
  const tagImpactGain = audio.createGain();
  tagImpact.type = 'sine';
  tagImpact.frequency.setValueAtTime(140, now + 10.5);
  tagImpact.frequency.exponentialRampToValueAtTime(40, now + 11.2);
  tagImpactGain.gain.setValueAtTime(0, now + 10.5);
  tagImpactGain.gain.linearRampToValueAtTime(0.3, now + 10.52);
  tagImpactGain.gain.exponentialRampToValueAtTime(0.001, now + 11.3);
  tagImpact.connect(tagImpactGain);
  tagImpactGain.connect(master);
  tagImpactGain.connect(reverb);
  tagImpact.start(now + 10.5);
  tagImpact.stop(now + 11.5);

  // === SCENE 6: SYNF REVEAL (11.5s → 12.5s) ===
  const antic = audio.createOscillator();
  const anticGain = audio.createGain();
  antic.type = 'sine';
  antic.frequency.setValueAtTime(2000, now + 11.5);
  antic.frequency.exponentialRampToValueAtTime(800, now + 11.6);
  anticGain.gain.setValueAtTime(0.08, now + 11.5);
  anticGain.gain.exponentialRampToValueAtTime(0.001, now + 11.7);
  antic.connect(anticGain);
  anticGain.connect(master);
  antic.start(now + 11.5);
  antic.stop(now + 11.8);

  const padFreqs = [146.83, 174.61, 220.00, 261.63];
  padFreqs.forEach((freq, idx) => {
    const osc = audio.createOscillator();
    const oscGain = audio.createGain();
    const oscFilter = audio.createBiquadFilter();
    osc.type = idx === 0 ? 'sine' : 'triangle';
    osc.frequency.value = freq;
    oscFilter.type = 'lowpass';
    oscFilter.frequency.value = 1500;
    oscFilter.Q.value = 0.7;
    oscGain.gain.setValueAtTime(0, now + 11.8);
    oscGain.gain.linearRampToValueAtTime(0.06, now + 12.5);
    oscGain.gain.setValueAtTime(0.06, now + 14.0);
    oscGain.gain.linearRampToValueAtTime(0, now + 16.5);
    osc.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(master);
    oscGain.connect(reverb);
    osc.start(now + 11.8);
    osc.stop(now + 16.8);

    const osc2 = audio.createOscillator();
    const osc2Gain = audio.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 1.005;
    osc2Gain.gain.setValueAtTime(0, now + 11.8);
    osc2Gain.gain.linearRampToValueAtTime(0.03, now + 12.5);
    osc2Gain.gain.linearRampToValueAtTime(0, now + 16.5);
    osc2.connect(osc2Gain);
    osc2Gain.connect(master);
    osc2.start(now + 11.8);
    osc2.stop(now + 16.8);
  });

  // === SCENE 7: THE DROP (12.5s → 14.5s) ===
  const dropSub = audio.createOscillator();
  const dropSubGain = audio.createGain();
  dropSub.type = 'sine';
  dropSub.frequency.setValueAtTime(120, now + 12.5);
  dropSub.frequency.exponentialRampToValueAtTime(30, now + 13.5);
  dropSubGain.gain.setValueAtTime(0, now + 12.5);
  dropSubGain.gain.linearRampToValueAtTime(0.5, now + 12.52);
  dropSubGain.gain.exponentialRampToValueAtTime(0.001, now + 14.5);
  dropSub.connect(dropSubGain);
  dropSubGain.connect(master);
  dropSub.start(now + 12.5);
  dropSub.stop(now + 14.7);

  for (let i = 0; i < 4; i++) {
    const t = now + 12.5 + i * 0.5;
    const dkick = audio.createOscillator();
    const dkickGain = audio.createGain();
    dkick.type = 'sine';
    dkick.frequency.setValueAtTime(120, t);
    dkick.frequency.exponentialRampToValueAtTime(35, t + 0.08);
    dkickGain.gain.setValueAtTime(0, t);
    dkickGain.gain.linearRampToValueAtTime(0.35, t + 0.003);
    dkickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    dkick.connect(dkickGain);
    dkickGain.connect(master);
    dkick.start(t);
    dkick.stop(t + 0.15);
  }

  const crashNoise = audio.createBufferSource();
  crashNoise.buffer = noiseBuffer(audio, 2);
  const crashFilter = audio.createBiquadFilter();
  crashFilter.type = 'lowpass';
  crashFilter.frequency.setValueAtTime(10000, now + 12.5);
  crashFilter.frequency.exponentialRampToValueAtTime(200, now + 14.0);
  const crashGain = audio.createGain();
  crashGain.gain.setValueAtTime(0.2, now + 12.5);
  crashGain.gain.exponentialRampToValueAtTime(0.001, now + 14.0);
  crashNoise.connect(crashFilter);
  crashFilter.connect(crashGain);
  crashGain.connect(master);
  crashGain.connect(reverb);
  crashNoise.start(now + 12.5);
  crashNoise.stop(now + 14.2);

  const dmet = audio.createOscillator();
  const dmetGain = audio.createGain();
  const dmetMod = audio.createOscillator();
  const dmetModGain = audio.createGain();
  dmet.type = 'sine';
  dmet.frequency.setValueAtTime(320, now + 12.5);
  dmetMod.type = 'sine';
  dmetMod.frequency.setValueAtTime(2200, now + 12.5);
  dmetModGain.gain.setValueAtTime(1200, now + 12.5);
  dmetModGain.gain.exponentialRampToValueAtTime(0, now + 13.5);
  dmetMod.connect(dmetModGain);
  dmetModGain.connect(dmet.frequency);
  dmetGain.gain.setValueAtTime(0, now + 12.5);
  dmetGain.gain.linearRampToValueAtTime(0.15, now + 12.52);
  dmetGain.gain.exponentialRampToValueAtTime(0.001, now + 13.5);
  dmet.connect(dmetGain);
  dmetGain.connect(master);
  dmetGain.connect(reverb);
  dmet.start(now + 12.5);
  dmet.stop(now + 13.7);
  dmetMod.start(now + 12.5);
  dmetMod.stop(now + 13.5);

  for (let i = 0; i < 16; i++) {
    const t = now + 12.5 + i * 0.125;
    const hat = audio.createBufferSource();
    hat.buffer = noiseBuffer(audio, 0.04);
    const hatFilter = audio.createBiquadFilter();
    hatFilter.type = 'highpass';
    hatFilter.frequency.value = 7000;
    const hatGain = audio.createGain();
    hatGain.gain.setValueAtTime(0.05, t);
    hatGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    hat.connect(hatFilter);
    hatFilter.connect(hatGain);
    hatGain.connect(master);
    hat.start(t);
    hat.stop(t + 0.04);
  }

  for (let i = 0; i < 8; i++) {
    const t = now + 12.8 + i * 0.1;
    const spark = audio.createOscillator();
    const sparkGain = audio.createGain();
    spark.type = 'sine';
    const freq = 2000 + Math.random() * 3000;
    spark.frequency.setValueAtTime(freq, t);
    spark.frequency.exponentialRampToValueAtTime(freq * 2, t + 0.1);
    sparkGain.gain.setValueAtTime(0, t);
    sparkGain.gain.linearRampToValueAtTime(0.04, t + 0.01);
    sparkGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    spark.connect(sparkGain);
    sparkGain.connect(master);
    sparkGain.connect(reverb);
    spark.start(t);
    spark.stop(t + 0.35);
  }

  // === SCENE 8: UNIVERSE EXPANDS (14.5s → 16.5s) ===
  const lushFreqs = [220.00, 277.18, 329.63];
  lushFreqs.forEach((freq) => {
    const osc = audio.createOscillator();
    const oscGain = audio.createGain();
    const oscFilter = audio.createBiquadFilter();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    oscFilter.type = 'lowpass';
    oscFilter.frequency.value = 2000;
    oscFilter.Q.value = 1;
    oscGain.gain.setValueAtTime(0, now + 14.5);
    oscGain.gain.linearRampToValueAtTime(0.04, now + 15.5);
    oscGain.gain.linearRampToValueAtTime(0, now + 16.5);
    osc.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(master);
    oscGain.connect(reverb);
    osc.start(now + 14.5);
    osc.stop(now + 16.7);
  });

  // === SCENE 9: WEBSITE TRANSITION (16.5s → 18s) ===
  const transWhoosh = audio.createBufferSource();
  transWhoosh.buffer = noiseBuffer(audio, 1.5);
  const transFilter = audio.createBiquadFilter();
  transFilter.type = 'bandpass';
  transFilter.frequency.setValueAtTime(3000, now + 16.5);
  transFilter.frequency.exponentialRampToValueAtTime(150, now + 17.8);
  transFilter.Q.value = 1.5;
  const transGain = audio.createGain();
  transGain.gain.setValueAtTime(0.06, now + 16.5);
  transGain.gain.exponentialRampToValueAtTime(0.001, now + 18.0);
  transWhoosh.connect(transFilter);
  transFilter.connect(transGain);
  transGain.connect(master);
  transWhoosh.start(now + 16.5);
  transWhoosh.stop(now + 18.2);

  const resolve = audio.createOscillator();
  const resolveGain = audio.createGain();
  resolve.type = 'sine';
  resolve.frequency.value = 146.83;
  resolveGain.gain.setValueAtTime(0, now + 17.0);
  resolveGain.gain.linearRampToValueAtTime(0.12, now + 17.3);
  resolveGain.gain.exponentialRampToValueAtTime(0.001, now + 18.0);
  resolve.connect(resolveGain);
  resolveGain.connect(master);
  resolveGain.connect(reverb);
  resolve.start(now + 17.0);
  resolve.stop(now + 18.2);
}

export function stopIntroSound(): void {
  if (ctx && ctx.state === 'running') {
    ctx.close().catch(() => {});
    ctx = null;
  }
}

export function resumeAudioContext(): void {
  const audio = getCtx();
  if (audio && audio.state === 'suspended') {
    audio.resume().catch(() => {});
  }
}
