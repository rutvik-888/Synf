/**
 * Team SYNƒ — FREQUENCY ARCHITECTURE Renderer
 *
 * Concept: Everything is built from sound. The entire visual universe is
 * constructed from waveform bars, spectral columns, circular frequency
 * analyzers, and light trails. No random floating particles. The world
 * IS the music. As the frequency evolves, the city builds, the stage
 * assembles, and the letters materialize — all from bars and waves.
 */

type BarState = {
  x: number;
  y: number;
  w: number;
  h: number;
  targetH: number;
  alpha: number;
  targetAlpha: number;
  hue: number;
  delay: number;
  lit: boolean;
};

type WaveState = {
  phase: number;
  amplitude: number;
  frequency: number;
  speed: number;
  color: string;
  y: number;
};

type RingBar = {
  angle: number;
  targetLen: number;
  len: number;
  w: number;
  color: string;
  delay: number;
};

const PALETTE = {
  magenta: '255,45,111',
  violet: '168,85,247',
  white: '255,255,255',
  blue: '34,184,255',
  acid: '212,255,63',
  silver: '200,200,220',
};

export class CinematicRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private w = 0; private h = 0; private dpr = 1;
  private raf = 0;
  private frame = 0;
  private scene = 0;
  private mouseX = 0; private mouseY = 0;
  private targetMouseX = 0; private targetMouseY = 0;
  private isMobile = false;
  private flashAlpha = 0;
  private shakeAmount = 0;

  // Waveform bars — the core visual element
  private spectralBars: BarState[] = [];
  private cityBars: BarState[] = [];
  private stageBars: RingBar[] = [];
  private letterBars: BarState[] = [];

  // Waves
  private waves: WaveState[] = [];

  // Scan line
  private scanY = 0;
  private scanActive = false;

  // Frequency data simulation
  private freqData: number[] = [];
  private freqBins = 64;

  // Time accumulator
  private time = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');
    this.ctx = ctx;
    this.resize();
    this.initFreqData();
    this.initSpectralBars();
    this.initCityBars();
    this.initStageBars();
    this.initWaves();
  }

  private resize = () => {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = this.w * this.dpr;
    this.canvas.height = this.h * this.dpr;
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.isMobile = this.w < 768;
  };

  private initFreqData() {
    this.freqData = Array(this.freqBins).fill(0);
  }

  private initSpectralBars() {
    const count = this.isMobile ? 48 : 96;
    const barW = this.w / count;
    this.spectralBars = Array.from({ length: count }, (_, i) => ({
      x: i * barW,
      y: this.h * 0.5,
      w: barW * 0.6,
      h: 0,
      targetH: 0,
      alpha: 0,
      targetAlpha: 0,
      hue: 0,
      delay: i * 0.5,
      lit: false,
    }));
  }

  private initCityBars() {
    const count = this.isMobile ? 30 : 60;
    const barW = this.w / count;
    this.cityBars = Array.from({ length: count }, (_, i) => ({
      x: i * barW,
      y: 0,
      w: barW * 0.7,
      h: 0,
      targetH: 0,
      alpha: 0,
      targetAlpha: 0,
      hue: 0,
      delay: i * 1.5,
      lit: false,
    }));
  }

  private initStageBars() {
    const count = this.isMobile ? 60 : 120;
    this.stageBars = Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * Math.PI * 2,
      targetLen: 0,
      len: 0,
      w: 2,
      color: i % 3 === 0 ? PALETTE.magenta : i % 3 === 1 ? PALETTE.violet : PALETTE.blue,
      delay: i * 0.3,
    }));
  }

  private initWaves() {
    this.waves = [
      { phase: 0, amplitude: 30, frequency: 0.008, speed: 0.02, color: PALETTE.blue, y: this.h * 0.5 },
      { phase: 0, amplitude: 20, frequency: 0.012, speed: 0.03, color: PALETTE.violet, y: this.h * 0.5 },
      { phase: 0, amplitude: 15, frequency: 0.016, speed: 0.04, color: PALETTE.magenta, y: this.h * 0.5 },
    ];
  }

  setScene(s: number) { this.scene = s; }
  setMouse(x: number, y: number) { this.targetMouseX = x; this.targetMouseY = y; }
  triggerFlash() { this.flashAlpha = 1; }
  triggerShake(amount: number) { this.shakeAmount = amount; }

  start() {
    window.addEventListener('resize', this.resize);
    this.loop();
  }

  stop() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
  }

  // Simulate frequency data that evolves with scenes
  private updateFreqData() {
    const s = this.scene;
    for (let i = 0; i < this.freqBins; i++) {
      let target: number;
      if (s <= 0) {
        // Void: minimal, only lowest bins barely active
        target = i < 8 ? Math.sin(this.time * 0.5 + i * 0.3) * 0.05 + 0.02 : 0;
      } else if (s === 1) {
        // Signal: rising from left to right, building
        const progress = Math.min(1, this.frame / 200);
        target = i < this.freqBins * progress
          ? Math.sin(this.time * 2 + i * 0.2) * 0.15 + Math.sin(this.time * 4 + i * 0.5) * 0.1 + 0.1
          : 0;
      } else if (s === 2) {
        // City: strong bass, building mids
        target = i < 16
          ? Math.sin(this.time * 1.5 + i * 0.2) * 0.3 + 0.2
          : Math.sin(this.time * 3 + i * 0.15) * 0.15 + 0.1;
      } else if (s === 3) {
        // Culture: full spectrum, rhythmic
        target = Math.sin(this.time * 4 + i * 0.15) * 0.2 + Math.sin(this.time * 8 + i * 0.3) * 0.15 + 0.15;
      } else if (s === 4) {
        // Event build: intense, rising
        const intensity = Math.min(1, this.frame / 300);
        target = (Math.sin(this.time * 6 + i * 0.2) * 0.25 + Math.sin(this.time * 12 + i * 0.4) * 0.2 + 0.2) * intensity;
      } else if (s === 5) {
        // Tagline: near silence, single low pulse
        target = i < 4 ? Math.sin(this.time * 0.3) * 0.08 + 0.04 : 0;
      } else if (s === 6) {
        // SYNF reveal: converging energy, building
        target = Math.sin(this.time * 3 + i * 0.1) * 0.2 + 0.15;
      } else if (s === 7) {
        // Drop: explosive, full power
        target = Math.sin(this.time * 8 + i * 0.2) * 0.35 + Math.sin(this.time * 16 + i * 0.5) * 0.25 + 0.3;
      } else if (s === 8) {
        // Universe: refined, flowing
        target = Math.sin(this.time * 3 + i * 0.1) * 0.15 + Math.sin(this.time * 5 + i * 0.25) * 0.1 + 0.12;
      } else {
        // Transition: fading
        target = Math.sin(this.time * 2 + i * 0.1) * 0.08 + 0.05;
      }
      // Smooth interpolation
      this.freqData[i] += (target - this.freqData[i]) * 0.15;
    }
  }

  private loop = () => {
    this.frame++;
    this.time += 0.016;
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

    this.updateFreqData();

    const ctx = this.ctx;
    const cx = this.w / 2, cy = this.h / 2;
    const px = (this.mouseX - cx) * 0.015;
    const py = (this.mouseY - cy) * 0.015;

    let shakeX = 0, shakeY = 0;
    if (this.shakeAmount > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeAmount;
      shakeY = (Math.random() - 0.5) * this.shakeAmount;
      this.shakeAmount *= 0.88;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);
    ctx.clearRect(-10, -10, this.w + 20, this.h + 20);

    const s = this.scene;

    if (s === 0) this.renderVoid(ctx, cx, cy, px, py);
    if (s === 1) this.renderSignal(ctx, cx, cy, px, py);
    if (s === 2) this.renderCity(ctx, cx, cy, px, py);
    if (s === 3) this.renderCulture(ctx, cx, cy, px, py);
    if (s === 4) this.renderStage(ctx, cx, cy, px, py);
    if (s === 5) this.renderTagline(ctx, cx, cy, px, py);
    if (s === 6) this.renderSynf(ctx, cx, cy, px, py);
    if (s === 7) this.renderDrop(ctx, cx, cy, px, py);
    if (s === 8) this.renderUniverse(ctx, cx, cy, px, py);
    if (s === 9) this.renderTransition(ctx, cx, cy);

    if (this.flashAlpha > 0.01) {
      ctx.fillStyle = `rgba(255,255,255,${this.flashAlpha})`;
      ctx.fillRect(0, 0, this.w, this.h);
      this.flashAlpha *= 0.82;
    }

    ctx.restore();
    this.raf = requestAnimationFrame(this.loop);
  };

  // Helper: draw a glowing bar
  private drawBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, alpha: number, glow: number = 1) {
    if (h < 0.5 || alpha < 0.01) return;
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, `rgba(${color},${alpha})`);
    grad.addColorStop(0.7, `rgba(${color},${alpha * 0.6})`);
    grad.addColorStop(1, `rgba(${color},${alpha * 0.1})`);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // Top cap glow
    if (glow > 0) {
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.4 * glow})`;
      ctx.fillRect(x, y, w, 2);
    }
  }

  // Helper: draw a wave line
  private drawWave(ctx: CanvasRenderingContext2D, wave: WaveState, width: number, alpha: number) {
    ctx.strokeStyle = `rgba(${wave.color},${alpha})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let x = 0; x <= this.w; x += 2) {
      const y = wave.y + Math.sin(x * wave.frequency + wave.phase) * wave.amplitude;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // === SCENE 0: THE VOID ===
  private renderVoid(ctx: CanvasRenderingContext2D, cx: number, cy: number, px: number, py: number) {
    // Near-black with the faintest blue tint
    ctx.fillStyle = 'rgba(6,5,9,1)';
    ctx.fillRect(0, 0, this.w, this.h);

    // Faint distant wave — barely visible
    const wave = this.waves[0];
    wave.y = this.h * 0.55;
    wave.phase += wave.speed * 0.3;
    this.drawWave(ctx, wave, 1, 0.06);

    // Single horizontal light line — the horizon
    const lineY = this.h * 0.55 + py;
    const lineGrad = ctx.createLinearGradient(0, lineY, this.w, lineY);
    lineGrad.addColorStop(0, 'rgba(34,184,255,0)');
    lineGrad.addColorStop(0.5, 'rgba(34,184,255,0.08)');
    lineGrad.addColorStop(1, 'rgba(34,184,255,0)');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(0, lineY - 0.5, this.w, 1);

    // Occasional pulse — a bar briefly appears at the horizon
    if (this.frame % 90 === 0) {
      this.scanActive = true;
      this.scanY = lineY;
    }
    if (this.scanActive) {
      const pulseAlpha = Math.max(0, 0.15 - (this.frame % 90) / 90 * 0.15);
      const barCount = 3;
      for (let i = 0; i < barCount; i++) {
        const bx = cx - 30 + i * 20 + px;
        const bh = 20 + Math.sin(this.time * 3 + i) * 10;
        this.drawBar(ctx, bx, this.scanY - bh, 4, bh, PALETTE.blue, pulseAlpha, 0.5);
      }
      if ((this.frame % 90) > 40) this.scanActive = false;
    }

    // Minimal ambient haze
    const haze = ctx.createRadialGradient(cx + px, lineY, 0, cx, lineY, this.w * 0.4);
    haze.addColorStop(0, 'rgba(34,184,255,0.02)');
    haze.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  // === SCENE 1: THE SIGNAL ===
  private renderSignal(ctx: CanvasRenderingContext2D, cx: number, cy: number, px: number, py: number) {
    ctx.fillStyle = 'rgba(6,5,9,1)';
    ctx.fillRect(0, 0, this.w, this.h);

    // Spectral bars rising from the horizon — the signal is a frequency spectrum
    const horizonY = this.h * 0.55 + py;
    const barCount = this.spectralBars.length;
    for (let i = 0; i < barCount; i++) {
      const bar = this.spectralBars[i];
      const freqIdx = Math.floor((i / barCount) * this.freqBins);
      const freqVal = this.freqData[freqIdx];
      bar.targetH = freqVal * this.h * 0.3;
      bar.h += (bar.targetH - bar.h) * 0.2;
      bar.alpha += (0.4 - bar.alpha) * 0.05;

      const color = i < barCount * 0.3 ? PALETTE.blue : i < barCount * 0.6 ? PALETTE.violet : PALETTE.magenta;
      // Bars grow UP from horizon
      this.drawBar(ctx, bar.x + px * 0.5, horizonY - bar.h, bar.w, bar.h, color, bar.alpha, 0.8);
      // Mirror reflection below horizon (fainter)
      this.drawBar(ctx, bar.x + px * 0.5, horizonY, bar.w, bar.h * 0.3, color, bar.alpha * 0.15, 0);
    }

    // Wave layers building
    this.waves[0].y = horizonY;
    this.waves[0].phase += this.waves[0].speed;
    this.drawWave(ctx, this.waves[0], 1.5, 0.15);

    this.waves[1].y = horizonY;
    this.waves[1].phase += this.waves[1].speed;
    this.drawWave(ctx, this.waves[1], 1, 0.1);

    // Light sweep — vertical scan line moving across
    const sweepX = ((this.frame * 1.5) % (this.w + 200)) - 100;
    const sweepGrad = ctx.createLinearGradient(sweepX - 80, 0, sweepX + 80, 0);
    sweepGrad.addColorStop(0, 'rgba(34,184,255,0)');
    sweepGrad.addColorStop(0.5, 'rgba(34,184,255,0.04)');
    sweepGrad.addColorStop(1, 'rgba(34,184,255,0)');
    ctx.fillStyle = sweepGrad;
    ctx.fillRect(sweepX - 80, 0, 160, this.h);

    // Central energy point — a vertical bar that grows
    const coreH = Math.min(this.h * 0.4, this.frame * 0.5);
    const coreGrad = ctx.createLinearGradient(cx, horizonY - coreH, cx, horizonY);
    coreGrad.addColorStop(0, 'rgba(168,85,247,0)');
    coreGrad.addColorStop(0.5, 'rgba(168,85,247,0.06)');
    coreGrad.addColorStop(1, 'rgba(168,85,247,0.12)');
    ctx.fillStyle = coreGrad;
    ctx.fillRect(cx - 3, horizonY - coreH, 6, coreH);
  }

  // === SCENE 2: THE CITY AWAKENS ===
  private renderCity(ctx: CanvasRenderingContext2D, cx: number, cy: number, px: number, py: number) {
    // Deep gradient
    const bg = ctx.createLinearGradient(0, 0, 0, this.h);
    bg.addColorStop(0, 'rgba(8,7,12,1)');
    bg.addColorStop(0.6, 'rgba(12,8,20,1)');
    bg.addColorStop(1, 'rgba(18,5,28,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.w, this.h);

    // City = frequency bars as buildings, rising from the bottom
    const barCount = this.cityBars.length;
    const baseY = this.h + py;
    for (let i = 0; i < barCount; i++) {
      const bar = this.cityBars[i];
      const freqIdx = Math.floor((i / barCount) * this.freqBins);
      const freqVal = this.freqData[freqIdx];
      // Building height is driven by frequency, but with a base structure
      const baseH = this.h * (0.15 + Math.sin(i * 0.3) * 0.05 + Math.cos(i * 0.7) * 0.05);
      bar.targetH = baseH + freqVal * this.h * 0.25;
      bar.h += (bar.targetH - bar.h) * 0.08;
      bar.alpha += (0.5 - bar.alpha) * 0.04;

      const depthFactor = 0.5 + (i % 3) * 0.25;
      const color = i % 4 === 0 ? PALETTE.magenta : i % 4 === 1 ? PALETTE.violet : i % 4 === 2 ? PALETTE.blue : PALETTE.silver;

      // Building bar
      this.drawBar(ctx, bar.x + px * depthFactor, baseY - bar.h, bar.w, bar.h, color, bar.alpha * depthFactor, 0.6);

      // Window segments — horizontal lines across the building
      if (bar.h > 50) {
        const segCount = Math.floor(bar.h / 20);
        for (let s = 1; s < segCount; s++) {
          const segY = baseY - bar.h + s * 20;
          ctx.fillStyle = `rgba(${color},${bar.alpha * 0.08 * depthFactor})`;
          ctx.fillRect(bar.x + px * depthFactor, segY, bar.w, 1);
        }
      }
    }

    // Wave at the base of the city
    this.waves[0].y = this.h * 0.92;
    this.waves[0].phase += this.waves[0].speed * 2;
    this.drawWave(ctx, this.waves[0], 2, 0.12);

    // Light beams from tallest buildings — vertical streaks
    if (this.frame % 40 === 0) {
      const beamIdx = Math.floor(Math.random() * barCount);
      const bar = this.cityBars[beamIdx];
      const beamX = bar.x + bar.w / 2 + px;
      const beamGrad = ctx.createLinearGradient(beamX, this.h - bar.h, beamX, 0);
      const color = beamIdx % 2 === 0 ? PALETTE.magenta : PALETTE.violet;
      beamGrad.addColorStop(0, `rgba(${color},0.08)`);
      beamGrad.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = beamGrad;
      ctx.fillRect(beamX - 1.5, 0, 3, this.h - bar.h);
    }

    // Distant monumental structure — concentric arcs
    const monY = this.h * 0.72;
    for (let i = 0; i < 3; i++) {
      const r = 60 + i * 40;
      ctx.strokeStyle = `rgba(168,85,247,${0.06 - i * 0.015})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, monY, r, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
  }

  // === SCENE 3: CULTURE IGNITES ===
  private renderCulture(ctx: CanvasRenderingContext2D, cx: number, cy: number, px: number, py: number) {
    // Keep city silhouette in background but faded
    const bg = ctx.createLinearGradient(0, 0, 0, this.h);
    bg.addColorStop(0, 'rgba(8,7,12,0.8)');
    bg.addColorStop(1, 'rgba(18,5,28,0.8)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.w, this.h);

    // Faded city bars
    const barCount = this.cityBars.length;
    const baseY = this.h + py;
    for (let i = 0; i < barCount; i++) {
      const bar = this.cityBars[i];
      const color = i % 3 === 0 ? PALETTE.magenta : i % 3 === 1 ? PALETTE.violet : PALETTE.blue;
      this.drawBar(ctx, bar.x + px * 0.3, baseY - bar.h, bar.w, bar.h, color, bar.alpha * 0.3, 0);
    }

    // Diagonal light streaks — fashion editorial energy
    const streakCount = 6;
    for (let i = 0; i < streakCount; i++) {
      const offset = (this.frame * 3 + i * 180) % (this.h + 300) - 150;
      const angle = -0.3;
      const len = this.w * 1.5;
      const startX = -100;
      const startY = offset;
      const endX = startX + Math.cos(angle) * len;
      const endY = startY + Math.sin(angle) * len;
      const color = i % 2 === 0 ? PALETTE.magenta : PALETTE.acid;
      const grad = ctx.createLinearGradient(startX, startY, endX, endY);
      grad.addColorStop(0, `rgba(${color},0)`);
      grad.addColorStop(0.5, `rgba(${color},0.05)`);
      grad.addColorStop(1, `rgba(${color},0)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    // Horizontal frequency bars — now vibrant, full width, multi-color
    const fbarCount = this.isMobile ? 40 : 80;
    const fbarW = this.w / fbarCount;
    for (let i = 0; i < fbarCount; i++) {
      const freqIdx = Math.floor((i / fbarCount) * this.freqBins);
      const freqVal = this.freqData[freqIdx];
      const bh = freqVal * this.h * 0.15;
      const by = this.h * 0.7;
      const color = i % 3 === 0 ? PALETTE.magenta : i % 3 === 1 ? PALETTE.violet : PALETTE.acid;
      this.drawBar(ctx, i * fbarW + px * 0.2, by - bh, fbarW * 0.5, bh, color, 0.3, 0.5);
      // Mirror
      this.drawBar(ctx, i * fbarW + px * 0.2, by, fbarW * 0.5, bh * 0.4, color, 0.08, 0);
    }

    // Bold wave overlay
    this.waves[1].y = this.h * 0.5;
    this.waves[1].phase += this.waves[1].speed * 3;
    this.waves[1].amplitude = 40 + this.freqData[8] * 50;
    this.drawWave(ctx, this.waves[1], 2, 0.12);
  }

  // === SCENE 4: EVENT WORLD BUILD ===
  private renderStage(ctx: CanvasRenderingContext2D, cx: number, cy: number, px: number, py: number) {
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.w * 0.7);
    bg.addColorStop(0, 'rgba(18,8,28,1)');
    bg.addColorStop(1, 'rgba(6,5,9,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.w, this.h);

    // Circular frequency analyzer — the stage is a ring of bars
    const barCount = this.stageBars.length;
    const baseRadius = Math.min(this.w, this.h) * 0.15;
    for (let i = 0; i < barCount; i++) {
      const bar = this.stageBars[i];
      const freqIdx = Math.floor((i / barCount) * this.freqBins);
      const freqVal = this.freqData[freqIdx];
      bar.targetLen = freqVal * this.h * 0.2 + 10;
      bar.len += (bar.targetLen - bar.len) * 0.15;

      const a = bar.angle + this.frame * 0.002;
      const innerR = baseRadius;
      const outerR = baseRadius + bar.len;
      const x1 = cx + Math.cos(a) * innerR + px * 0.3;
      const y1 = cy + Math.sin(a) * innerR + py * 0.3;
      const x2 = cx + Math.cos(a) * outerR + px * 0.3;
      const y2 = cy + Math.sin(a) * outerR + py * 0.3;

      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, `rgba(${bar.color},0.5)`);
      grad.addColorStop(1, `rgba(${bar.color},0)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = bar.w;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Tip glow
      ctx.fillStyle = `rgba(255,255,255,0.3)`;
      ctx.beginPath();
      ctx.arc(x2, y2, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Inner ring
    ctx.strokeStyle = `rgba(255,45,111,0.15)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx + px * 0.3, cy + py * 0.3, baseRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Volumetric beams from center — 4 rotating
    for (let i = 0; i < 4; i++) {
      const angle = (this.frame * 0.004 + i * Math.PI / 2) % (Math.PI * 2);
      const beamLen = baseRadius * 4;
      const bx = cx + Math.cos(angle) * beamLen + px * 0.3;
      const by = cy + Math.sin(angle) * beamLen + py * 0.3;
      const beamGrad = ctx.createLinearGradient(cx, cy, bx, by);
      const color = i % 2 === 0 ? PALETTE.magenta : PALETTE.violet;
      beamGrad.addColorStop(0, `rgba(${color},0.06)`);
      beamGrad.addColorStop(1, `rgba(${color},0)`);
      ctx.strokeStyle = beamGrad;
      ctx.lineWidth = 50;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    // Crowd silhouettes — built from bars at the bottom
    const crowdBarCount = this.isMobile ? 20 : 40;
    const crowdBarW = this.w / crowdBarCount;
    for (let i = 0; i < crowdBarCount; i++) {
      const freqIdx = Math.floor((i / crowdBarCount) * 16);
      const freqVal = this.freqData[freqIdx];
      const ch = 20 + freqVal * 40 + Math.sin(i * 0.5) * 10;
      ctx.fillStyle = 'rgba(8,4,14,0.7)';
      ctx.fillRect(i * crowdBarW, this.h - ch, crowdBarW * 0.8, ch);
    }

    // Central core — growing vertical bar
    const coreH = baseRadius + this.freqData[0] * this.h * 0.1;
    const coreGrad = ctx.createLinearGradient(cx, cy - coreH, cx, cy + coreH);
    coreGrad.addColorStop(0, 'rgba(255,255,255,0)');
    coreGrad.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    coreGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = coreGrad;
    ctx.fillRect(cx - 2 + px * 0.3, cy - coreH, 4, coreH * 2);
  }

  // === SCENE 5: TAGLINE ===
  private renderTagline(ctx: CanvasRenderingContext2D, cx: number, cy: number, px: number, py: number) {
    // Near darkness — the stage fades
    ctx.fillStyle = 'rgba(6,5,9,0.9)';
    ctx.fillRect(0, 0, this.w, this.h);

    // Single beam of light — vertical sweep
    const beamX = cx + Math.sin(this.frame * 0.01) * 100 + px;
    const beamGrad = ctx.createLinearGradient(beamX, 0, beamX, this.h);
    beamGrad.addColorStop(0, 'rgba(255,255,255,0)');
    beamGrad.addColorStop(0.5, 'rgba(255,255,255,0.04)');
    beamGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(beamX - 60, 0, 120, this.h);

    // Minimal low frequency bars
    const barCount = 8;
    const barW = 6;
    const spacing = 16;
    const totalW = barCount * spacing;
    for (let i = 0; i < barCount; i++) {
      const freqVal = this.freqData[i];
      const bh = freqVal * this.h * 0.15;
      const bx = cx - totalW / 2 + i * spacing + px;
      this.drawBar(ctx, bx, this.h * 0.85 - bh, barW, bh, PALETTE.magenta, 0.15, 0.3);
    }

    // Faint ring remnant
    const baseRadius = Math.min(this.w, this.h) * 0.15;
    ctx.strokeStyle = `rgba(255,45,111,0.04)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx + px * 0.2, cy + py * 0.2, baseRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // === SCENE 6: SYNF REVEAL ===
  private renderSynf(ctx: CanvasRenderingContext2D, cx: number, cy: number, px: number, py: number) {
    ctx.fillStyle = 'rgba(6,5,9,1)';
    ctx.fillRect(0, 0, this.w, this.h);

    // Converging bars — all bars from the edges point inward toward center
    const barCount = this.isMobile ? 40 : 80;
    for (let i = 0; i < barCount; i++) {
      const freqIdx = Math.floor((i / barCount) * this.freqBins);
      const freqVal = this.freqData[freqIdx];
      const a = (i / barCount) * Math.PI * 2;
      const dist = Math.max(this.w, this.h) * 0.5 * (1 - Math.min(1, this.frame / 80));
      const x1 = cx + Math.cos(a) * dist + px * 0.2;
      const y1 = cy + Math.sin(a) * dist + py * 0.2;
      const x2 = cx + Math.cos(a) * (dist - 40 - freqVal * 60) + px * 0.2;
      const y2 = cy + Math.sin(a) * (dist - 40 - freqVal * 60) + py * 0.2;

      const color = i % 3 === 0 ? PALETTE.magenta : i % 3 === 1 ? PALETTE.violet : PALETTE.blue;
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, `rgba(${color},0)`);
      grad.addColorStop(1, `rgba(${color},0.4)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Central explosion glow
    const glowR = 200 + Math.sin(this.time * 2) * 20;
    const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    glowGrad.addColorStop(0, 'rgba(255,255,255,0.1)');
    glowGrad.addColorStop(0.3, 'rgba(255,45,111,0.08)');
    glowGrad.addColorStop(0.6, 'rgba(168,85,247,0.04)');
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);

    // Horizontal light sweep revealing the text position
    const sweepProg = Math.min(1, (this.frame % 80) / 80);
    const sweepX = cx - 250 + sweepProg * 500;
    const revGrad = ctx.createLinearGradient(sweepX - 40, 0, sweepX + 40, 0);
    revGrad.addColorStop(0, 'rgba(255,255,255,0)');
    revGrad.addColorStop(0.5, 'rgba(255,255,255,0.05)');
    revGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = revGrad;
    ctx.fillRect(sweepX - 40, cy - 120, 80, 240);
  }

  // === SCENE 7: THE DROP ===
  private renderDrop(ctx: CanvasRenderingContext2D, cx: number, cy: number, px: number, py: number) {
    // Explosive background
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.w);
    bg.addColorStop(0, 'rgba(25,8,35,1)');
    bg.addColorStop(0.4, 'rgba(15,5,22,1)');
    bg.addColorStop(1, 'rgba(6,5,9,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.w, this.h);

    // Massive circular frequency analyzer — explosive
    const barCount = this.stageBars.length;
    const baseRadius = Math.min(this.w, this.h) * 0.18;
    for (let i = 0; i < barCount; i++) {
      const bar = this.stageBars[i];
      const freqIdx = Math.floor((i / barCount) * this.freqBins);
      const freqVal = this.freqData[freqIdx];
      bar.targetLen = freqVal * this.h * 0.3 + 15;
      bar.len += (bar.targetLen - bar.len) * 0.25;

      const a = bar.angle + this.frame * 0.005;
      const innerR = baseRadius;
      const outerR = baseRadius + bar.len;
      const x1 = cx + Math.cos(a) * innerR + px * 0.2;
      const y1 = cy + Math.sin(a) * innerR + py * 0.2;
      const x2 = cx + Math.cos(a) * outerR + px * 0.2;
      const y2 = cy + Math.sin(a) * outerR + py * 0.2;

      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, `rgba(${bar.color},0.6)`);
      grad.addColorStop(0.7, `rgba(${bar.color},0.2)`);
      grad.addColorStop(1, `rgba(${bar.color},0)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = bar.w;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Bright tip
      ctx.fillStyle = `rgba(255,255,255,0.5)`;
      ctx.beginPath();
      ctx.arc(x2, y2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Expanding shockwave rings — built from thin bars
    for (let i = 0; i < 4; i++) {
      const phase = (this.frame * 0.015 + i * 0.25) % 1;
      const r = phase * Math.max(this.w, this.h) * 0.7;
      const alpha = (1 - phase) * 0.12;
      ctx.strokeStyle = `rgba(255,45,111,${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Full-width spectral bars at the bottom and top — the drop's energy
    const fbarCount = this.isMobile ? 48 : 96;
    const fbarW = this.w / fbarCount;
    for (let i = 0; i < fbarCount; i++) {
      const freqIdx = Math.floor((i / fbarCount) * this.freqBins);
      const freqVal = this.freqData[freqIdx];
      const bh = freqVal * this.h * 0.2;
      const color = i % 3 === 0 ? PALETTE.magenta : i % 3 === 1 ? PALETTE.violet : PALETTE.blue;

      // Bottom bars
      this.drawBar(ctx, i * fbarW + px * 0.1, this.h - bh, fbarW * 0.6, bh, color, 0.35, 0.7);
      // Top bars (mirrored)
      this.drawBar(ctx, i * fbarW + px * 0.1, 0, fbarW * 0.6, bh, color, 0.15, 0.3);
    }

    // Bold waves cutting across
    this.waves[0].y = this.h * 0.5;
    this.waves[0].phase += this.waves[0].speed * 4;
    this.waves[0].amplitude = 50 + this.freqData[4] * 80;
    this.drawWave(ctx, this.waves[0], 2.5, 0.15);

    this.waves[2].y = this.h * 0.5;
    this.waves[2].phase -= this.waves[2].speed * 3;
    this.waves[2].amplitude = 40 + this.freqData[12] * 60;
    this.drawWave(ctx, this.waves[2], 2, 0.1);
  }

  // === SCENE 8: UNIVERSE EXPANDS ===
  private renderUniverse(ctx: CanvasRenderingContext2D, cx: number, cy: number, px: number, py: number) {
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.w * 0.6);
    bg.addColorStop(0, 'rgba(20,8,30,1)');
    bg.addColorStop(1, 'rgba(6,5,9,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.w, this.h);

    // Tunnel of concentric frequency rings — moving toward viewer
    const ringCount = 12;
    for (let i = 0; i < ringCount; i++) {
      const z = ((this.frame * 0.004 + i / ringCount) % 1);
      const r = z * Math.max(this.w, this.h) * 0.5;
      const alpha = (1 - z) * 0.12;
      const freqIdx = i % this.freqBins;
      const freqVal = this.freqData[freqIdx];

      // Ring made of small bars
      const segments = this.isMobile ? 40 : 80;
      for (let j = 0; j < segments; j++) {
        const a = (j / segments) * Math.PI * 2;
        const segLen = 3 + freqVal * 15;
        const x1 = cx + Math.cos(a) * r + px * 0.1;
        const y1 = cy + Math.sin(a) * r + py * 0.1;
        const x2 = cx + Math.cos(a) * (r + segLen) + px * 0.1;
        const y2 = cy + Math.sin(a) * (r + segLen) + py * 0.1;
        const color = j % 3 === 0 ? PALETTE.magenta : j % 3 === 1 ? PALETTE.violet : PALETTE.blue;
        ctx.strokeStyle = `rgba(${color},${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    // Flowing waves
    this.waves[1].y = this.h * 0.35;
    this.waves[1].phase += this.waves[1].speed;
    this.waves[1].amplitude = 25;
    this.drawWave(ctx, this.waves[1], 1.5, 0.1);

    this.waves[2].y = this.h * 0.65;
    this.waves[2].phase -= this.waves[2].speed;
    this.waves[2].amplitude = 20;
    this.drawWave(ctx, this.waves[2], 1.5, 0.08);
  }

  // === SCENE 9: WEBSITE TRANSITION ===
  private renderTransition(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    // Fade to site background
    ctx.fillStyle = 'rgba(8,7,12,0.15)';
    ctx.fillRect(0, 0, this.w, this.h);

    // Expanding light — bars radiating outward and fading
    const prog = Math.min(1, this.frame / 80);
    const barCount = 60;
    for (let i = 0; i < barCount; i++) {
      const a = (i / barCount) * Math.PI * 2;
      const r1 = prog * Math.max(this.w, this.h) * 0.3;
      const r2 = prog * Math.max(this.w, this.h) * 0.6;
      const x1 = cx + Math.cos(a) * r1;
      const y1 = cy + Math.sin(a) * r1;
      const x2 = cx + Math.cos(a) * r2;
      const y2 = cy + Math.sin(a) * r2;
      const alpha = (1 - prog) * 0.1;
      const color = i % 2 === 0 ? PALETTE.magenta : PALETTE.violet;
      ctx.strokeStyle = `rgba(${color},${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Fading waves
    this.waves[0].y = this.h * 0.5;
    this.waves[0].phase += this.waves[0].speed;
    this.drawWave(ctx, this.waves[0], 1, Math.max(0, 0.05 - prog * 0.05));
  }
}
